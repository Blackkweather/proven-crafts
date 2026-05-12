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

if (!GEMINI_KEY) console.error("[ai-challenge-eval] GEMINI_API_KEY is not set");

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

  if (!body || typeof body !== "object" || !("challenge" in body) || !("submission" in body)) {
    return errorResponse("Missing required fields: challenge, submission", 400, origin);
  }

  const { challenge, submission } = body as {
    challenge: Record<string, unknown>;
    submission: Record<string, unknown>;
  };

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
