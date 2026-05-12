import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { fetch } from "undici";

const PORT = parseInt(process.env.PORT ?? "3000");
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "super-secret-jwt-token-for-dev-only";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:8080";

const SERVICES: Record<string, string> = {
  "/auth": process.env.AUTH_SERVICE_URL ?? "http://localhost:3001",
  "/jobs": process.env.JOBS_SERVICE_URL ?? "http://localhost:3002",
  "/talent": process.env.TALENT_SERVICE_URL ?? "http://localhost:3003",
  "/challenges": process.env.CHALLENGE_SERVICE_URL ?? "http://localhost:3004",
  "/messages": process.env.MESSAGING_SERVICE_URL ?? "http://localhost:3005",
};

const app = Fastify({ logger: { level: "info" } });

await app.register(cors, {
  origin: [FRONTEND_URL],
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
});

await app.register(jwt, { secret: JWT_SECRET });

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

// Health
app.get("/health", async () => ({
  status: "ok",
  service: "api-gateway",
  ts: new Date().toISOString(),
}));

// Proxy all requests to the appropriate service
app.all("/*", async (request, reply) => {
  const url = request.url;

  // Find matching service by prefix
  const prefix = Object.keys(SERVICES).find((p) => url.startsWith(p));
  if (!prefix) {
    return reply.code(404).send({ error: "No service found for this route" });
  }

  // Verify JWT for protected routes (everything except /auth/signin, /auth/signup)
  const publicPaths = ["/auth/signin", "/auth/signup", "/auth/forgot-password"];
  const isPublic = publicPaths.some((p) => url.startsWith(p));

  let userId: string | undefined;
  let accountType: string | undefined;

  if (!isPublic) {
    try {
      const decoded = await request.jwtVerify<{
        sub: string;
        app_metadata?: { account_type?: string };
      }>();
      userId = decoded.sub;
      accountType = decoded.app_metadata?.account_type;
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  }

  // Forward to service
  const targetUrl = `${SERVICES[prefix]}${url}`;
  const headers: Record<string, string> = {
    "content-type": (request.headers["content-type"] as string) ?? "application/json",
    "x-forwarded-for": (request.headers["x-forwarded-for"] as string) ?? request.ip,
  };
  if (userId) headers["x-user-id"] = userId;
  if (accountType) headers["x-account-type"] = accountType;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : JSON.stringify(request.body),
    });

    const data = await response.json();
    return reply.code(response.status).send(data);
  } catch (err) {
    app.log.error(err);
    return reply.code(502).send({ error: "Service unavailable" });
  }
});

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`API Gateway running on port ${PORT}`);
});
