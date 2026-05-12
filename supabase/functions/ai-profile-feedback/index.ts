import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  AuthError,
  aiRateLimiter,
  corsPreflightResponse,
  errorResponse,
  requireAuth,
  successResponse,
} from "../_shared/auth.ts";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
  GEMINI_KEY;

if (!GEMINI_KEY) console.error("[ai-profile-feedback] GEMINI_API_KEY is not set");

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

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return corsPreflightResponse(req);
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, origin);

  let user;
  try {
    user = await requireAuth(req);
  } catch (e) {
    return errorResponse(e instanceof AuthError ? e.message : "Unauthorized", 401, origin);
  }

  if (!aiRateLimiter.check(user.id)) {
    return errorResponse("Rate limit exceeded. Please wait before retrying.", 429, origin);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400, origin);
  }

  if (!body || typeof body !== "object" || !("profile" in body)) {
    return errorResponse("Missing required field: profile", 400, origin);
  }

  const { profile, skills, portfolio } = body as {
    profile: Record<string, unknown>;
    skills?: Array<{ name: string; level: string; verified_by: string | null }>;
    portfolio?: Array<{ title: string; type: string; summary: string }>;
  };

  const skillsList = (skills ?? [])
    .slice(0, 50)
    .map((s) => `${String(s.name).slice(0, 60)} (${s.level}${s.verified_by ? ", verified via " + s.verified_by : ""})`)
    .join(", ");

  const portfolioList = (portfolio ?? [])
    .slice(0, 20)
    .map((p) => `${String(p.title).slice(0, 80)} [${p.type}]: ${String(p.summary).slice(0, 200)}`)
    .join("\n");

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
