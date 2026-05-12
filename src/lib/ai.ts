import { supabase } from "@/integrations/supabase/client";
import type { Job, Challenge, Skill, PortfolioItem, Profile } from "./db";

export interface MatchScoreResult {
  score: number;
  reasoning: string;
  skill_overlap: string[];
  gaps: string[];
}

export interface ProfileFeedbackResult {
  overall_strength: "weak" | "fair" | "good" | "strong";
  score: number;
  summary: string;
  suggestions: { priority: "high" | "medium" | "low"; action: string; why: string }[];
  strengths: string[];
}

export interface JobRecommendation {
  job_id: string;
  score: number;
  reason: string;
}

export interface ChallengeEvalResult {
  score: number;
  verdict: "shortlist" | "consider" | "pass";
  summary: string;
  strengths: string[];
  improvements: string[];
  criteria: { relevance: number; quality: number; clarity: number; completeness: number };
}

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

export async function getAIJobRecommendations(
  talent: { skills: Skill[]; headline: string | null; location: string },
  jobs: Job[],
): Promise<JobRecommendation[]> {
  const { data, error } = await supabase.functions.invoke("ai-job-recommendations", {
    body: { talent, jobs },
  });
  if (error) throw error;
  return (data as { ranked: JobRecommendation[] }).ranked ?? [];
}

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
