// =============================================================================
// index.ts — supabase/functions/ai-challenge-eval/index.ts
// =============================================================================
// Supabase Edge Function (Deno runtime) that evaluates a talent's challenge
// submission using Google Gemini AI, acting as a senior technical evaluator.
//
// Called by: src/lib/ai.ts → getAIChallengeEval()
// Runtime: Deno (NOT Node.js) — imports use jsr: and npm: specifiers
//
// Request shape (POST body JSON):
//   { challenge: { title, brief, required_skills, prize }, submission: { writeup, work_url } }
//
// Response shape (JSON):
//   {
//     score: number (0-100),
//     verdict: "shortlist" | "consider" | "pass",
//     summary: string,
//     strengths: string[],
//     improvements: string[],
//     criteria: { relevance, quality, clarity, completeness }
//   }
//
// Security:
//   - Requires a valid Supabase Bearer JWT
//   - Rate limited to 20 AI calls per user per minute
//   - Inputs are truncated to prevent prompt injection
//
// KEYWORDS: AUTH, API, VALIDATION
// =============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  AuthError,
  aiRateLimiter,
  corsPreflightResponse,
  errorResponse,
  requireAuth,
  successResponse,
} from "../_shared/auth.ts";

// API: Gemini API key and URL — key stored as a Supabase secret
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
  GEMINI_KEY;

if (!GEMINI_KEY) console.error("[ai-challenge-eval] GEMINI_API_KEY is not set");

/**
 * Send a prompt to Google Gemini and return the raw text response.
 * Temperature 0.3 gives slightly more varied feedback than the match scorer,
 * which is appropriate for a qualitative evaluation.
 *
 * API: calls the Google Generative Language API.
 */
async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

/**
 * Main edge function handler.
 * Evaluates a challenge submission and returns a structured verdict with per-criteria scores.
 *
 * Flow:
 * 1. Handle CORS preflight
 * 2. AUTH: verify Bearer JWT
 * 3. Rate limit check
 * 4. VALIDATION: parse body, check required fields
 * 5. Build evaluation prompt with challenge brief and submission content
 * 6. Call Gemini and return the parsed result
 */
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  // Handle CORS preflight
  if (req.method === "OPTIONS") return corsPreflightResponse(req);
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, origin);

  // AUTH: verify JWT
  let user;
  try {
    user = await requireAuth(req);
  } catch (e) {
    return errorResponse(e instanceof AuthError ? e.message : "Unauthorized", 401, origin);
  }

  // Rate limit: 20 AI calls per user per minute
  if (!aiRateLimiter.check(user.id)) {
    return errorResponse("Rate limit exceeded. Please wait before retrying.", 429, origin);
  }

  // VALIDATION: parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400, origin);
  }

  // VALIDATION: both `challenge` and `submission` fields are required
  if (!body || typeof body !== "object" || !("challenge" in body) || !("submission" in body)) {
    return errorResponse("Missing required fields: challenge, submission", 400, origin);
  }

  const { challenge, submission } = body as {
    challenge: Record<string, unknown>;
    submission: Record<string, unknown>;
  };

  // Build the evaluation prompt — inputs are truncated to stay within token limits
  // and to prevent prompt injection (e.g., a writeup that says "ignore all instructions")
  const prompt = `You are a senior technical evaluator assessing a challenge submission.

CHALLENGE:
- Title: ${String(challenge.title ?? "N/A").slice(0, 100)}
- Brief: ${String(challenge.brief ?? "N/A").slice(0, 500)}
- Required skills: ${((challenge.required_skills as string[]) ?? []).join(", ") || "N/A"}
- Prize: ${String(challenge.prize ?? "N/A").slice(0, 100)}

SUBMISSION:
- Writeup: ${String(submission.writeup ?? "Not provided").slice(0, 1000)}
- Work URL: ${String(submission.work_url ?? "Not provided").slice(0, 200)}

Evaluate this submission and return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "verdict": "shortlist" | "consider" | "pass",
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<what was done well>", ...],
  "improvements": ["<specific area to improve>", ...],
  "criteria": {
    "relevance": <0-100>,
    "quality": <0-100>,
    "clarity": <0-100>,
    "completeness": <0-100>
  }
}

Be specific and constructive. If writeup is missing, note that as a major gap.`;

  try {
    const raw = await callGemini(prompt);
    const result = JSON.parse(raw);
    return successResponse(result, origin);
  } catch (err) {
    console.error("[ai-challenge-eval] error:", err);
    return errorResponse("AI service error. Please try again.", 500, origin);
  }
});
