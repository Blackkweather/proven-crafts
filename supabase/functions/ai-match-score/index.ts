// =============================================================================
// index.ts — supabase/functions/ai-match-score/index.ts
// =============================================================================
// Supabase Edge Function (Deno runtime) that scores how well a talent candidate
// matches a specific job posting using Google Gemini AI.
//
// Called by: src/lib/ai.ts → getAIMatchScore()
// Runtime: Deno (NOT Node.js) — imports use jsr: and npm: specifiers
//
// Request shape (POST body JSON):
//   { talent: { skills, headline, bio, location }, job: { title, location, ... } }
//
// Response shape (JSON):
//   { score: number, reasoning: string, skill_overlap: string[], gaps: string[] }
//
// Security:
//   - Requires a valid Supabase Bearer JWT (via requireAuth from _shared/auth.ts)
//   - Rate limited to 20 AI calls per user per minute
//   - Input is sanitised and truncated before being sent to Gemini to prevent
//     prompt injection and to stay within Gemini's token limits
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

// API: the Gemini API key is stored as a Supabase edge function secret (never hard-coded)
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
  GEMINI_KEY;

// Warn loudly at startup if the key is missing — avoids silent failures on requests
if (!GEMINI_KEY) console.error("[ai-match-score] GEMINI_API_KEY is not set");

/**
 * Send a prompt to Google Gemini and return the raw text response.
 * Uses the gemini-2.0-flash model for fast, low-cost responses.
 * Temperature 0.2 keeps scores consistent — higher values add more randomness.
 *
 * API: calls the Google Generative Language API with a single user message.
 * Returns the text content of the first candidate's first part.
 */
async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // responseMimeType: "application/json" asks Gemini to return valid JSON
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

/**
 * Main edge function handler.
 * Handles OPTIONS (CORS preflight) and POST requests.
 *
 * Flow:
 * 1. Return CORS headers for OPTIONS preflight requests
 * 2. AUTH: verify the Bearer JWT from the Authorization header
 * 3. Check the per-user AI rate limit (20 calls/minute)
 * 4. VALIDATION: parse and validate the request body
 * 5. Sanitise and truncate inputs to prevent prompt injection
 * 6. Build a structured prompt and call Gemini
 * 7. Parse the JSON response and return it to the client
 */
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  // Handle CORS preflight — browsers send this before the actual POST
  if (req.method === "OPTIONS") return corsPreflightResponse(req);
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, origin);

  // AUTH: verify the user's JWT — reject with 401 if invalid
  let user;
  try {
    user = await requireAuth(req);
  } catch (e) {
    return errorResponse(e instanceof AuthError ? e.message : "Unauthorized", 401, origin);
  }

  // Rate limiting: prevent a single user from making too many AI calls
  if (!aiRateLimiter.check(user.id)) {
    return errorResponse("Rate limit exceeded. Please wait before retrying.", 429, origin);
  }

  // VALIDATION: parse the request body as JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400, origin);
  }

  // VALIDATION: ensure the required fields are present in the body
  if (!body || typeof body !== "object" || !("talent" in body) || !("job" in body)) {
    return errorResponse("Missing required fields: talent, job", 400, origin);
  }

  const { talent, job } = body as {
    talent: Record<string, unknown>;
    job: Record<string, unknown>;
  };

  // Sanitise and truncate talent skills to prevent overly long prompts.
  // Slice to 50 skills max; truncate each skill name to 60 characters.
  const talentSkills = ((talent.skills as Array<{ name: string; level: string }>) ?? [])
    .slice(0, 50)
    .map((s) => `${String(s.name).slice(0, 60)} (${s.level})`)
    .join(", ");

  // Sanitise and truncate job required skills
  const jobSkills = ((job.required_skills as string[]) ?? [])
    .slice(0, 30)
    .join(", ");

  // Build a structured prompt that tells Gemini its role and what to evaluate.
  // We explicitly request JSON output with a defined shape to make parsing reliable.
  const prompt = `You are a technical recruiter scoring how well a candidate fits a job.

CANDIDATE:
- Headline: ${String(talent.headline ?? "N/A").slice(0, 200)}
- Bio: ${String(talent.bio ?? "N/A").slice(0, 300)}
- Location: ${String(talent.location ?? "N/A").slice(0, 100)}
- Skills: ${talentSkills || "none listed"}

JOB:
- Title: ${String(job.title ?? "N/A").slice(0, 100)}
- Location: ${String(job.location ?? "N/A").slice(0, 100)} (${String(job.arrangement ?? "N/A")})
- Summary: ${String(job.summary ?? "N/A").slice(0, 400)}
- Required skills: ${jobSkills || "none listed"}

Return ONLY valid JSON with this shape:
{
  "score": <integer 0-100>,
  "reasoning": "<2-3 sentence explanation>",
  "skill_overlap": ["<matched skill>", ...],
  "gaps": ["<missing skill>", ...]
}`;

  try {
    const raw = await callGemini(prompt);
    const result = JSON.parse(raw);
    return successResponse(result, origin);
  } catch (err) {
    console.error("[ai-match-score] error:", err);
    return errorResponse("AI service error. Please try again.", 500, origin);
  }
});
