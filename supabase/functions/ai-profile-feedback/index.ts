// =============================================================================
// index.ts — supabase/functions/ai-profile-feedback/index.ts
// =============================================================================
// Supabase Edge Function (Deno runtime) that analyses a talent's profile and
// returns actionable career-coaching feedback using Google Gemini AI.
//
// Called by: src/lib/ai.ts → getAIProfileFeedback()
// Runtime: Deno (NOT Node.js) — imports use jsr: and npm: specifiers
//
// Request shape (POST body JSON):
//   { profile: Profile, skills?: Skill[], portfolio?: PortfolioItem[] }
//
// Response shape (JSON):
//   {
//     overall_strength: "weak" | "fair" | "good" | "strong",
//     score: number (0-100),
//     summary: string,
//     suggestions: [{ priority, action, why }, ...],
//     strengths: string[]
//   }
//
// Security:
//   - Requires a valid Supabase Bearer JWT
//   - Rate limited to 20 AI calls per user per minute
//   - All profile text inputs are truncated before being sent to Gemini
//     to stay within token limits and prevent prompt injection
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
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
  GEMINI_KEY;

if (!GEMINI_KEY) console.error("[ai-profile-feedback] GEMINI_API_KEY is not set");

/**
 * Send a prompt to Google Gemini and return the raw text response.
 * Temperature 0.3 allows the AI to be somewhat creative and varied in its
 * suggestions — appropriate for a coaching/advisory use case.
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
 * Analyses the profile completeness and quality then returns prioritised
 * coaching suggestions for the talent to improve their profile.
 *
 * Flow:
 * 1. Handle CORS preflight
 * 2. AUTH: verify Bearer JWT
 * 3. Rate limit check
 * 4. VALIDATION: parse body, check that `profile` is present
 * 5. Sanitise and format profile data, skills, and portfolio for the prompt
 * 6. Call Gemini with the career-coach persona
 * 7. Return the parsed feedback result
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

  // VALIDATION: `profile` is the only required field; skills and portfolio are optional
  if (!body || typeof body !== "object" || !("profile" in body)) {
    return errorResponse("Missing required field: profile", 400, origin);
  }

  const { profile, skills, portfolio } = body as {
    profile: Record<string, unknown>;
    skills?: Array<{ name: string; level: string; verified_by: string | null }>;
    portfolio?: Array<{ title: string; type: string; summary: string }>;
  };

  // Format skills list — truncated to 50 skills, each at most 60 chars per name.
  // Include verification method if present (adds context to the AI evaluation).
  const skillsList = (skills ?? [])
    .slice(0, 50)
    .map((s) => `${String(s.name).slice(0, 60)} (${s.level}${s.verified_by ? ", verified via " + s.verified_by : ""})`)
    .join(", ");

  // Format portfolio items — up to 20 items, each title + type + summary
  const portfolioList = (portfolio ?? [])
    .slice(0, 20)
    .map((p) => `${String(p.title).slice(0, 80)} [${p.type}]: ${String(p.summary).slice(0, 200)}`)
    .join("\n");

  // Build the career-coach prompt. We explicitly note missing sections ("MISSING")
  // so the AI can call them out as priority improvements.
  const prompt = `You are a career coach reviewing a tech professional's profile on a skills-based hiring platform.

PROFILE:
- Name: ${String(profile.display_name ?? "N/A").slice(0, 100)}
- Headline: ${String(profile.headline ?? "MISSING").slice(0, 200)}
- Bio: ${String(profile.bio ?? "MISSING").slice(0, 500)}
- Location: ${String(profile.location ?? "N/A").slice(0, 100)}
- Availability: ${String(profile.availability ?? "N/A")}
- Video intro: ${profile.video_intro_url ? "YES" : "MISSING"}
- Completeness: ${Number(profile.completeness_pct ?? 0)}%

SKILLS (${(skills ?? []).length}):
${skillsList || "None listed"}

PORTFOLIO (${(portfolio ?? []).length} items):
${portfolioList || "None"}

Analyze this profile and return ONLY valid JSON:
{
  "overall_strength": "weak" | "fair" | "good" | "strong",
  "score": <integer 0-100>,
  "summary": "<1-2 sentence overall assessment>",
  "suggestions": [
    { "priority": "high" | "medium" | "low", "action": "<specific actionable suggestion>", "why": "<brief reason>" }
  ],
  "strengths": ["<what is already good>", ...]
}

Provide 3-5 specific, actionable suggestions ordered by priority.`;

  try {
    const raw = await callGemini(prompt);
    const result = JSON.parse(raw);
    return successResponse(result, origin);
  } catch (err) {
    console.error("[ai-profile-feedback] error:", err);
    return errorResponse("AI service error. Please try again.", 500, origin);
  }
});
