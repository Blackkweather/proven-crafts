// =============================================================================
// ai.ts — src/lib/ai.ts
// =============================================================================
// Client-side functions that call Supabase Edge Functions to run AI-powered
// features. Each function packages the relevant data, sends it to the
// appropriate Edge Function (running on Deno), and returns a typed result.
//
// The actual AI calls (to Google Gemini) happen server-side in the Edge
// Functions — this file is only the browser-side bridge that calls them.
// Importing from this file instead of calling fetch() directly gives you
// type safety and a single place to update if the API contract changes.
//
// KEYWORDS: API, AI
// =============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Job, Challenge, Skill, PortfolioItem, Profile } from "./db";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/**
 * Returned by the `ai-match-score` edge function.
 * Describes how well a talent matches a job with a score, reasoning, and skill gaps.
 */
export interface MatchScoreResult {
  score: number;           // 0-100 overall match percentage
  reasoning: string;       // 2-3 sentence explanation from the AI
  skill_overlap: string[]; // skills the talent has that the job requires
  gaps: string[];          // skills the job requires that the talent is missing
}

/**
 * Returned by the `ai-profile-feedback` edge function.
 * Gives talent actionable advice for improving their profile's visibility to companies.
 */
export interface ProfileFeedbackResult {
  overall_strength: "weak" | "fair" | "good" | "strong";
  score: number; // 0-100
  summary: string;
  suggestions: { priority: "high" | "medium" | "low"; action: string; why: string }[];
  strengths: string[];
}

/**
 * A single job recommendation entry returned by `ai-job-recommendations`.
 * The AI scores each job and provides a one-sentence reason for the fit.
 */
export interface JobRecommendation {
  job_id: string;
  score: number;  // 0-100 fit score
  reason: string; // one sentence explanation
}

/**
 * Returned by the `ai-challenge-eval` edge function.
 * Gives a verdict on a challenge submission with per-criteria scores.
 */
export interface ChallengeEvalResult {
  score: number;
  verdict: "shortlist" | "consider" | "pass";
  summary: string;
  strengths: string[];
  improvements: string[];
  criteria: { relevance: number; quality: number; clarity: number; completeness: number };
}

// ---------------------------------------------------------------------------
// AI functions
// ---------------------------------------------------------------------------

/**
 * Get an AI-generated match score between a talent profile and a job posting.
 * The AI acts as a technical recruiter and evaluates skill overlap, location fit,
 * and overall relevance.
 *
 * API: calls the `ai-match-score` Supabase Edge Function (Deno runtime).
 * Returns a MatchScoreResult with score, reasoning, matched skills, and gaps.
 */
export async function getAIMatchScore(
  talent: { skills: Skill[]; headline: string | null; bio: string | null; location: string },
  job: Job,
): Promise<MatchScoreResult> {
  const { data, error } = await supabase.functions.invoke("ai-match-score", {
    body: { talent, job },
  });
  if (error) throw error;
  return data as MatchScoreResult;
}

/**
 * Get AI-generated feedback on a talent's profile.
 * The AI acts as a career coach reviewing the profile for a skills-based hiring platform
 * and returns prioritised suggestions for improvement.
 *
 * API: calls the `ai-profile-feedback` Supabase Edge Function.
 * Returns a ProfileFeedbackResult with an overall strength rating and action items.
 */
export async function getAIProfileFeedback(
  profile: Profile,
  skills: Skill[],
  portfolio: PortfolioItem[],
): Promise<ProfileFeedbackResult> {
  const { data, error } = await supabase.functions.invoke("ai-profile-feedback", {
    body: { profile, skills, portfolio },
  });
  if (error) throw error;
  return data as ProfileFeedbackResult;
}

/**
 * Get AI-ranked job recommendations for a talent from a list of open jobs.
 * The AI orders the jobs from best to worst fit and explains each match.
 * Up to 20 jobs can be sent at once (the edge function enforces this limit).
 *
 * API: calls the `ai-job-recommendations` Supabase Edge Function.
 * Returns an array of JobRecommendation objects sorted by score descending.
 */
export async function getAIJobRecommendations(
  talent: { skills: Skill[]; headline: string | null; location: string },
  jobs: Job[],
): Promise<JobRecommendation[]> {
  const { data, error } = await supabase.functions.invoke("ai-job-recommendations", {
    body: { talent, jobs },
  });
  if (error) throw error;
  // The edge function wraps the array in a `ranked` key
  return (data as { ranked: JobRecommendation[] }).ranked ?? [];
}

/**
 * Get an AI evaluation of a challenge submission.
 * The AI acts as a senior technical evaluator and scores the submission across
 * four criteria: relevance, quality, clarity, and completeness.
 *
 * API: calls the `ai-challenge-eval` Supabase Edge Function.
 * Returns a ChallengeEvalResult with a verdict of shortlist / consider / pass.
 */
export async function getAIChallengeEval(
  challenge: Challenge,
  submission: { writeup: string | null; work_url: string | null },
): Promise<ChallengeEvalResult> {
  const { data, error } = await supabase.functions.invoke("ai-challenge-eval", {
    body: { challenge, submission },
  });
  if (error) throw error;
  return data as ChallengeEvalResult;
}
