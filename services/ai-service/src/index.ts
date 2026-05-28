// =============================================================================
// index.ts — services/ai-service/src/index.ts
// =============================================================================
// AI Service — Gemini-powered matching, feedback, and evaluation.
// Uses gemini-2.5-pro via the Google Generative Language REST API,
// matching the same pattern used in the Supabase edge functions.
//
// Endpoints:
//   POST /ai/match-score          — score talent–job compatibility
//   POST /ai/profile-feedback     — generate profile improvement suggestions
//   POST /ai/job-recommendations  — recommend jobs for a talent profile
//   POST /ai/challenge-eval       — evaluate a challenge submission
//   GET  /health
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT ?? "3008");

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";
// Using gemini-2.5-pro for higher accuracy than the flash model used in edge functions
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" +
  GEMINI_KEY;

if (!GEMINI_KEY) console.error("[ai-service] GEMINI_API_KEY is not set");

/**
 * Send a prompt to Gemini and return parsed JSON.
 * responseMimeType: "application/json" ensures valid JSON output.
 */
async function callGemini<T>(prompt: string): Promise<T> {
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
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return JSON.parse(text) as T;
}

const app = Fastify({ logger: { level: "info" } });
await app.register(cors, { origin: true });

function userId(req: { headers: Record<string, unknown> }) {
  return req.headers["x-user-id"] as string | undefined;
}

app.get("/health", async () => ({ status: "ok", service: "ai-service" }));

// ── Match score ───────────────────────────────────────────────────────────────

const MatchScoreBody = z.object({
  talentId: z.string().uuid(),
  jobId: z.string().uuid(),
});

/**
 * Score how well a talent profile matches a job posting (0–100).
 * DATABASE: reads `profiles`, `jobs`
 */
app.post("/ai/match-score", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const body = MatchScoreBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const [talentRes, jobRes] = await Promise.all([
    supabase.from("profiles").select("display_name, headline, skills, bio").eq("id", body.data.talentId).single(),
    supabase.from("jobs").select("title, description, required_skills, experience_level").eq("id", body.data.jobId).single(),
  ]);

  if (talentRes.error || jobRes.error)
    return reply.code(404).send({ error: "Profile or job not found" });

  try {
    const result = await callGemini<{ score: number; reason: string; skill_overlap: string[]; gaps: string[] }>(
      `You are a talent matching AI. Score how well this talent matches the job.
Respond with JSON: { "score": number (0-100), "reason": string (1 sentence), "skill_overlap": string[], "gaps": string[] }

Talent: ${JSON.stringify(talentRes.data)}
Job: ${JSON.stringify(jobRes.data)}`
    );
    return reply.send(result);
  } catch (err: any) {
    return reply.code(500).send({ error: err.message });
  }
});

// ── Profile feedback ──────────────────────────────────────────────────────────

const ProfileFeedbackBody = z.object({
  talentId: z.string().uuid(),
});

/**
 * Generate actionable suggestions to improve a talent profile.
 * AUTH: talent can only request feedback for their own profile
 * DATABASE: reads `profiles`
 */
app.post("/ai/profile-feedback", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const body = ProfileFeedbackBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
  if (uid !== body.data.talentId) return reply.code(403).send({ error: "Forbidden" });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, headline, bio, skills, experience_years")
    .eq("id", body.data.talentId)
    .single();

  if (error) return reply.code(404).send({ error: "Profile not found" });

  try {
    const result = await callGemini<{ suggestions: { field: string; suggestion: string }[] }>(
      `You are a career coach. Give 3 actionable suggestions to improve this talent profile.
Respond with JSON: { "suggestions": [{ "field": string, "suggestion": string }] }

Profile: ${JSON.stringify(profile)}`
    );
    return reply.send(result);
  } catch (err: any) {
    return reply.code(500).send({ error: err.message });
  }
});

// ── Job recommendations ───────────────────────────────────────────────────────

const JobRecommendationsBody = z.object({
  talentId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).default(5),
});

/**
 * Recommend the best-matching open jobs for a talent profile.
 * DATABASE: reads `profiles`, `jobs`
 */
app.post("/ai/job-recommendations", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const body = JobRecommendationsBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const [profileRes, jobsRes] = await Promise.all([
    supabase.from("profiles").select("skills, headline, bio").eq("id", body.data.talentId).single(),
    supabase.from("jobs").select("id, title, required_skills, description").eq("status", "active").limit(50),
  ]);

  if (profileRes.error) return reply.code(404).send({ error: "Profile not found" });

  try {
    const { jobIds } = await callGemini<{ jobIds: string[] }>(
      `You are a job matching AI. Return the top ${body.data.limit} job IDs that best match this talent.
Respond with JSON: { "jobIds": string[] }

Talent: ${JSON.stringify(profileRes.data)}
Jobs: ${JSON.stringify(jobsRes.data)}`
    );
    const recommended = (jobsRes.data ?? []).filter((j) => jobIds.includes(j.id));
    return reply.send({ recommendations: recommended });
  } catch (err: any) {
    return reply.code(500).send({ error: err.message });
  }
});

// ── Challenge evaluation ──────────────────────────────────────────────────────

const ChallengeEvalBody = z.object({
  submissionId: z.string().uuid(),
});

/**
 * Evaluate a challenge submission against the challenge brief.
 * DATABASE: reads `submissions`, `challenges`
 */
app.post("/ai/challenge-eval", async (request, reply) => {
  const uid = userId(request as any);
  if (!uid) return reply.code(401).send({ error: "Unauthorized" });

  const body = ChallengeEvalBody.safeParse(request.body);
  if (!body.success) return reply.code(400).send({ error: body.error.flatten() });

  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("*, challenge:challenges(title, brief, required_skills)")
    .eq("id", body.data.submissionId)
    .single();

  if (subErr) return reply.code(404).send({ error: "Submission not found" });

  try {
    const evaluation = await callGemini<{
      score: number;
      strengths: string[];
      improvements: string[];
      verdict: "shortlist" | "reject" | "review";
    }>(
      `You are a technical evaluator. Assess this challenge submission.
Respond with JSON: { "score": number (0-100), "strengths": string[], "improvements": string[], "verdict": "shortlist"|"reject"|"review" }

Challenge: ${JSON.stringify(submission.challenge)}
Submission: ${JSON.stringify({ walkthrough: submission.walkthrough, repoUrl: submission.repoUrl, liveUrl: submission.liveUrl })}`
    );
    return reply.send({ evaluation });
  } catch (err: any) {
    return reply.code(500).send({ error: err.message });
  }
});

app.listen({ port: PORT, host: "127.0.0.1" }, (err) => {
  if (err) { app.log.error(err); process.exit(1); }
  app.log.info(`AI Service running on port ${PORT}`);
});
