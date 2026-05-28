// =============================================================================
// index.ts — services/api-gateway/src/index.ts
// =============================================================================
// The API Gateway microservice — a standalone Node.js/Fastify HTTP server that
// acts as the single entry point for all frontend-to-backend communication in
// the microservices architecture.
//
// Responsibilities:
//   1. CORS — only allows requests from the configured frontend URL
//   2. JWT verification — validates Supabase JWTs on all non-public routes
//   3. Request proxying — forwards requests to the correct downstream service
//      based on the URL prefix (e.g., /jobs → jobs-service:3002)
//   4. Header injection — adds x-user-id and x-account-type headers so
//      downstream services know who is making the request without each one
//      needing to re-validate the JWT
//   5. Rate limiting — 100 requests per minute per IP to prevent abuse
//
// NOTE: This service is part of the microservices architecture in the services/
// folder. The main frontend application (src/) talks to Supabase directly via
// the JS client — this gateway is used when routing through the service mesh.
//
// KEYWORDS: AUTH, MIDDLEWARE, API
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { fetch } from "undici";

// Configuration from environment variables — fall back to localhost defaults
const PORT = parseInt(process.env.PORT ?? "3000");
// JWT_SECRET must match the secret Supabase uses to sign JWTs (from your Supabase project settings)
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "super-secret-jwt-token-for-dev-only";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:8080";

/**
 * Routing table: maps URL prefix → downstream service base URL.
 * Each key is a URL prefix; the value is the full base URL of the service
 * that handles requests starting with that prefix.
 */
const SERVICES: Record<string, string> = {
  "/auth": process.env.AUTH_SERVICE_URL ?? "http://localhost:3001",
  "/jobs": process.env.JOBS_SERVICE_URL ?? "http://localhost:3002",
  "/talent": process.env.TALENT_SERVICE_URL ?? "http://localhost:3003",
  "/challenges": process.env.CHALLENGE_SERVICE_URL ?? "http://localhost:3004",
  "/messages": process.env.MESSAGING_SERVICE_URL ?? "http://localhost:3005",
  "/billing": process.env.BILLING_SERVICE_URL ?? "http://localhost:3006",
  "/analytics": process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3007",
  "/ai": process.env.AI_SERVICE_URL ?? "http://localhost:3008",
  "/admin": process.env.ADMIN_SERVICE_URL ?? "http://localhost:3009",
  "/storage": process.env.STORAGE_SERVICE_URL ?? "http://localhost:3010",
  "/referral": process.env.REFERRAL_SERVICE_URL ?? "http://localhost:3011",
  "/contact": process.env.CONTACT_SERVICE_URL ?? "http://localhost:3012",
};

// Create the Fastify server with structured JSON logging
const app = Fastify({ logger: { level: "info" } });

// MIDDLEWARE: CORS — only allow requests from the frontend URL
// `credentials: true` is required for requests that include cookies or Authorization headers
await app.register(cors, {
  origin: [FRONTEND_URL],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
});

// MIDDLEWARE: JWT verification plugin — uses the same secret as Supabase
// This enables request.jwtVerify() which decodes and validates a Bearer token
await app.register(jwt, { secret: JWT_SECRET });

// MIDDLEWARE: Rate limiting — 100 requests per minute per IP
// Prevents DDoS and brute-force attacks at the gateway level
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

// Health check endpoint — used by load balancers and monitoring tools
// No auth required — should always be publicly accessible
app.get("/health", async () => ({
  status: "ok",
  service: "api-gateway",
  ts: new Date().toISOString(),
}));

/**
 * Catch-all proxy handler — forwards all other requests to the appropriate service.
 * Every route other than /health goes through this handler.
 */
app.all("/*", async (request, reply) => {
  const url = request.url;

  // Find the service matching the URL prefix by checking each entry in SERVICES
  const prefix = Object.keys(SERVICES).find((p) => url.startsWith(p));
  if (!prefix) {
    return reply.code(404).send({ error: "No service found for this route" });
  }

  // AUTH: public routes skip JWT verification (they handle auth themselves)
  const publicPaths = ["/auth/signin", "/auth/signup", "/auth/forgot-password"];
  const isPublic = publicPaths.some((p) => url.startsWith(p));

  let userId: string | undefined;
  let accountType: string | undefined;

  if (!isPublic) {
    try {
      // AUTH: verify the JWT — throws if token is missing, expired, or has wrong signature
      const decoded = await request.jwtVerify<{
        sub: string;
        app_metadata?: { account_type?: string };
      }>();
      // `sub` is the Supabase user UUID
      userId = decoded.sub;
      // `account_type` from app_metadata tells downstream services if this is talent/company
      accountType = decoded.app_metadata?.account_type;
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  }

  // Build the full target URL by appending the original path to the service's base URL
  const targetUrl = `${SERVICES[prefix]}${url}`;

  // Forward key headers to the downstream service
  const headers: Record<string, string> = {
    "content-type": (request.headers["content-type"] as string) ?? "application/json",
    // Pass along the original client IP for downstream logging
    "x-forwarded-for": (request.headers["x-forwarded-for"] as string) ?? request.ip,
  };
  // Inject identity headers so downstream services don't need to re-verify the JWT
  if (userId) headers["x-user-id"] = userId;
  if (accountType) headers["x-account-type"] = accountType;

  try {
    // API: proxy the request to the downstream service
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      // GET and HEAD requests cannot have a body
      body: ["GET", "HEAD"].includes(request.method) ? undefined : JSON.stringify(request.body),
    });

    const data = await response.json();
    // Forward the downstream service's status code and response body directly
    return reply.code(response.status).send(data);
  } catch (err) {
    // 502 Bad Gateway: the downstream service is unavailable or returned a non-HTTP error
    app.log.error(err);
    return reply.code(502).send({ error: "Service unavailable" });
  }
});

// Start the server — listen on all interfaces (0.0.0.0) so it's accessible in containers
app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`API Gateway running on port ${PORT}`);
});
