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

if (!GEMINI_KEY) console.error("[ai-job-recommendations] GEMINI_API_KEY is not set");

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

  if (!body || typeof body !== "object" || !("talent" in body) || !("jobs" in body)) {
    return errorResponse("Missing required fields: talent, jobs", 400, origin);
  }

  const { talent, jobs } = body as {
    talent: Record<string, unknown>;
    jobs: Array<{ id: string; title: string; required_skills: string[]; location: string; arrangement: string; summary: string }>;
  };

  const talentSkills = ((talent.skills as Array<{ name: string }>) ?? [])
    .slice(0, 50)
    .map((s) => String(s.name).slice(0, 60))
    .join(", ");

  const jobsText = (jobs ?? [])
    .slice(0, 20)
    .map((j) =>
      `ID:${String(j.id).slice(0, 36)} | ${String(j.title).slice(0, 80)} | ${String(j.location ?? "").slice(0, 60)} (${j.arrangement ?? ""}) | Skills: ${(j.required_skills ?? []).join(", ")} | ${String(j.summary ?? "").slice(0, 120)}`
    )
    .join("\n");

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
