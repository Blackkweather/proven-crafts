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

if (!GEMINI_KEY) console.error("[ai-match-score] GEMINI_API_KEY is not set");

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
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

  if (!body || typeof body !== "object" || !("talent" in body) || !("job" in body)) {
    return errorResponse("Missing required fields: talent, job", 400, origin);
  }

  const { talent, job } = body as {
    talent: Record<string, unknown>;
    job: Record<string, unknown>;
  };

  const talentSkills = ((talent.skills as Array<{ name: string; level: string }>) ?? [])
    .slice(0, 50)
    .map((s) => `${String(s.name).slice(0, 60)} (${s.level})`)
    .join(", ");

  const jobSkills = ((job.required_skills as string[]) ?? [])
    .slice(0, 30)
    .join(", ");

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
