// =============================================================================
// index.ts — supabase/functions/ai-job-recommendations/index.ts
// =============================================================================
// Supabase Edge Function (Deno runtime) that ranks a list of job postings by
// fit for a specific talent profile using Google Gemini AI.
//
// Called by: src/lib/ai.ts → getAIJobRecommendations()
// Runtime: Deno (NOT Node.js) — imports use jsr: and npm: specifiers
//
// Request shape (POST body JSON):
//   { talent: { skills, headline, location }, jobs: Job[] }
//
// Response shape (JSON):
//   { ranked: [{ job_id, score, reason }, ...] }
//
// The ranked array includes ALL submitted jobs ordered from best to worst fit.
// The client (src/lib/ai.ts) extracts the `ranked` array from the response.
//
// Security:
//   - Requires a valid Supabase Bearer JWT
//   - Rate limited to 20 AI calls per user per minute
//   - Jobs list is capped at 20 to stay within Gemini's context window
//   - Temperature 0.1 (lowest) for the most deterministic, objective rankings
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

// API: Gemini API key and URL
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
  GEMINI_KEY;

if (!GEMINI_KEY) console.error("[ai-job-recommendations] GEMINI_API_KEY is not set");

/**
 * Send a prompt to Google Gemini and return the raw text response.
 * Temperature 0.1 is the lowest setting — we want rankings to be as objective
 * and deterministic as possible, not creative or varied.
 *
 * API: calls the Google Generative Language API.
 */
async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

/**
 * Main edge function handler.
 * Takes a talent profile and a list of jobs, returns them ranked by fit.
 *
 * Flow:
 * 1. Handle CORS preflight
 * 2. AUTH: verify Bearer JWT
 * 3. Rate limit check
 * 4. VALIDATION: parse body, check required fields
 * 5. Sanitise and truncate talent skills and job descriptions
 * 6. Format all jobs into the prompt as a flat list
 * 7. Call Gemini and return the ranked array
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

  // Rate limit
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

  // VALIDATION: both `talent` and `jobs` are required
  if (!body || typeof body !== "object" || !("talent" in body) || !("jobs" in body)) {
    return errorResponse("Missing required fields: talent, jobs", 400, origin);
  }

  const { talent, jobs } = body as {
    talent: Record<string, unknown>;
    jobs: Array<{ id: string; title: string; required_skills: string[]; location: string; arrangement: string; summary: string }>;
  };

  // Sanitise talent skills — up to 50 skills, each name truncated to 60 chars
  const talentSkills = ((talent.skills as Array<{ name: string }>) ?? [])
    .slice(0, 50)
    .map((s) => String(s.name).slice(0, 60))
    .join(", ");

  // Format each job as a single line for the prompt — up to 20 jobs.
  // We include the job ID so the AI can reference it in its ranked output
  // without us having to map back from title to ID.
  const jobsText = (jobs ?? [])
    .slice(0, 20)
    .map((j) =>
      `ID:${String(j.id).slice(0, 36)} | ${String(j.title).slice(0, 80)} | ${String(j.location ?? "").slice(0, 60)} (${j.arrangement ?? ""}) | Skills: ${(j.required_skills ?? []).join(", ")} | ${String(j.summary ?? "").slice(0, 120)}`
    )
    .join("\n");

  // Build the ranking prompt — we tell Gemini to include ALL jobs so the
  // client always gets a complete ranked list regardless of score
  const prompt = `You are a job matching engine. Rank these jobs by fit for this candidate.

CANDIDATE:
- Headline: ${String(talent.headline ?? "N/A").slice(0, 200)}
- Location: ${String(talent.location ?? "N/A").slice(0, 100)}
- Skills: ${talentSkills || "none"}

JOBS:
${jobsText || "No jobs provided"}

Return ONLY valid JSON:
{
  "ranked": [
    { "job_id": "<id>", "score": <integer 0-100>, "reason": "<one sentence why this fits>" }
  ]
}

Include ALL jobs in the ranked array, ordered from best to worst fit. Be objective.`;

  try {
    const raw = await callGemini(prompt);
    const result = JSON.parse(raw);
    return successResponse(result, origin);
  } catch (err) {
    console.error("[ai-job-recommendations] error:", err);
    return errorResponse("AI service error. Please try again.", 500, origin);
  }
});
