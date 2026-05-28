// =============================================================================
// db.ts — src/lib/db.ts
// =============================================================================
// This is the central data-access layer for the entire Skill Network frontend.
// Every database operation (profiles, jobs, challenges, applications, messages,
// notifications, leaderboard, etc.) is defined here as an async function that
// calls Supabase directly via the browser-side client.
//
// All functions throw on error — callers are expected to catch and display the
// error. The file also exports every TypeScript type that describes a database
// row, making it the single source of truth for data shapes throughout the app.
//
// KEYWORDS: DATABASE, API, AUTH, VALIDATION
// =============================================================================

/**
 * db.ts — Async data service layer for Skill Network V2.
 * All functions throw on error; handle errors at the call site.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Security helpers
// ---------------------------------------------------------------------------

// VALIDATION: This regex ensures any ID passed to the DB is a valid UUID.
// Malformed IDs would cause Postgres errors or, worse, unexpected query matches.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Throw a clear error if a value is not a valid UUID.
 * Used before any database query that relies on an ID to prevent injection-style bugs.
 */
function assertUUID(value: string, label = "id"): void {
  if (!UUID_RE.test(value)) throw new Error(`Invalid ${label}`);
}

/**
 * Strip characters that break PostgREST .or() filter syntax.
 * Characters like parentheses and commas are special in PostgREST query strings,
 * so we remove them from user-supplied search terms before using them in queries.
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[(),."]/g, "");
}

/** Escape HTML special characters to prevent XSS in email clients. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Return the URL only if it uses http(s). Rejects javascript:, data:, and
 * other schemes that could execute in email clients.
 */
function safeLinkHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return url;
  } catch {
    // malformed URL
  }
  return null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// These union types match the allowed values in the database enum columns.
// Using TypeScript types here means the compiler will warn you if you try to
// use an invalid value anywhere in the app.

export type AccountType = "talent" | "company";
export type Availability = "open" | "exploring" | "booked";
export type SkillLevel = "foundational" | "proficient" | "advanced" | "expert";
export type VerifiedBy = "challenge" | "portfolio" | "reference";
export type PortfolioType = "project" | "video" | "writing" | "submission";
export type JobArrangement = "Remote" | "Hybrid" | "Onsite";
export type JobStatus = "open" | "closed" | "draft";
export type ChallengeStatus = "open" | "closed" | "draft";
export type SubmissionStatus = "draft" | "submitted" | "reviewed" | "shortlisted";
export type ApplicationStatus = "new" | "reviewing" | "interview" | "offer" | "rejected";
export type MatchStatus = "pending" | "confirmed" | "declined";
export type NotificationKind = "match" | "application" | "message" | "challenge";
export type Vote = "yes" | "no" | "maybe";
export type MarketTrend = "up" | "flat" | "down";
export type Badge = "gold" | "silver" | "bronze";

export type ProfileVisibility = "anyone" | "companies" | "invited";
export type AllowMessages = "anyone" | "companies" | "none";

/**
 * Represents a row from the `profiles` table.
 * This is the core user record — both talent and company accounts share this
 * table; the `account_type` field distinguishes them.
 */
export interface Profile {
  id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  account_type: AccountType;
  location: string;
  availability: Availability;
  video_intro_url: string | null;
  video_intro_path: string | null;
  challenge_wins: number;
  completeness_pct: number;
  phone_number: string | null;
  social_handle: string | null;
  company_name: string | null;
  company_initials: string | null;
  company_industry: string | null;
  company_size: string | null;
  company_about: string | null;
  trust_score: number | null;
  response_time_days: number | null;
  ghosting_rate: number | null;
  offer_rate: number | null;
  total_hires: number;
  anti_ghosting_badge: boolean;
  // Privacy settings
  profile_visibility: ProfileVisibility;
  show_location: boolean;
  allow_messages: AllowMessages;
  blind_mode: boolean;
  // Notification preferences
  notif_new_match: boolean;
  notif_application_update: boolean;
  notif_challenge_result: boolean;
  notif_message: boolean;
  notif_weekly_digest: boolean;
  notif_marketing: boolean;
  onboarding_completed_at: string | null;
  referral_code: string | null;
  created_at: string;
  updated_at: string;
}

// ProfileUpdate is a helper type — it allows updating any profile field
// except the immutable ones (id, timestamps). `Partial` makes all fields optional.
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;

/** Represents a row from the `skills` table — a single skill belonging to a profile. */
export interface Skill {
  id: string;
  profile_id: string;
  name: string;
  level: SkillLevel;
  verified_by: VerifiedBy | null;
  created_at: string;
}

/** Represents a row from the `portfolio_items` table — a work sample on a talent profile. */
export interface PortfolioItem {
  id: string;
  profile_id: string;
  title: string;
  type: PortfolioType;
  summary: string;
  url: string | null;
  tags: string[];
  year: number;
  pinned: boolean;
  cover_url: string | null;
  created_at: string;
}

/** Represents a step in a company's hiring process, from the `company_hiring_steps` table. */
export interface HiringStep {
  id: string;
  company_id: string;
  step_order: number;
  label: string;
  description: string;
  duration: string;
  paid: boolean;
}

/**
 * Represents a row from the `jobs` table.
 * The optional `company` field is populated when the query joins the profiles table.
 */
export interface Job {
  id: string;
  company_id: string;
  title: string;
  location: string;
  arrangement: JobArrangement;
  comp: string;
  required_skills: string[];
  summary: string;
  applicants: number;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  company?: Profile;
}

/**
 * Represents a row from the `challenges` table.
 * Challenges are skill tests that companies post; talent submits entries.
 */
export interface Challenge {
  id: string;
  company_id: string;
  title: string;
  brief: string;
  deadline_at: string;
  required_skills: string[];
  submissions_count: number;
  prize: string | null;
  status: ChallengeStatus;
  created_at: string;
  updated_at: string;
  company?: Profile;
}

/** Represents a talent's submission to a challenge, from the `submissions` table. */
export interface Submission {
  id: string;
  challenge_id: string;
  talent_id: string;
  status: SubmissionStatus;
  work_url: string | null;
  writeup: string | null;
  file_urls: string[];
  match_score: number;
  created_at: string;
  updated_at: string;
  challenge?: Challenge;
  talent?: Profile;
}

/** Represents a talent's application to a job, from the `applications` table. */
export interface Application {
  id: string;
  job_id: string;
  talent_id: string;
  status: ApplicationStatus;
  match_score: number;
  message: string | null;
  challenge_submission_id: string | null;
  created_at: string;
  updated_at: string;
  job?: Job;
  talent?: Profile;
}

/**
 * Represents a match (invite) between a company and a talent, from the `matches` table.
 * A company initiates a match; the talent can accept or decline.
 * The nested `company` and `talent` shapes are intentionally minimal to avoid
 * over-fetching — only the fields needed for the match card UI.
 */
export interface Match {
  id: string;
  company_id: string;
  talent_id: string;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
  company?: {
    id: string;
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
    company_name: string | null;
    company_initials: string | null;
    company_industry: string | null;
    trust_score: number | null;
  };
  talent?: {
    id: string;
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
    completeness_pct: number;
    availability: Availability;
  };
}

/** Represents a direct-message thread between two users, from the `conversations` table. */
export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: string | null;
  created_at: string;
  profile_a?: Profile;
  profile_b?: Profile;
  last_message?: Message;
}

/** Represents a single message in a conversation, from the `messages` table. */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

/** Represents an in-app notification for a user, from the `notifications` table. */
export interface Notification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** Represents a team member's vote on a job application, from the `candidate_votes` table. */
export interface CandidateVote {
  id: string;
  application_id: string;
  voter_id: string;
  voter_name: string;
  vote: Vote;
  created_at: string;
  updated_at: string;
}

/** Represents a recruiter's note attached to a job application. */
export interface CandidateNote {
  id: string;
  application_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

/** Represents a ranked entry on the challenge leaderboard. */
export interface LeaderboardEntry {
  id: string;
  talent_id: string;
  challenge_id: string;
  rank: number;
  score: number;
  badge: Badge | null;
  highlight: string;
  created_at: string;
  talent?: Profile;
  challenge?: Challenge;
}

/** Salary/rate benchmark data for a skill in a location, from the `market_rates` table. */
export interface MarketRate {
  id: string;
  skill: string;
  location: string;
  p25: number;    // 25th percentile pay
  median: number; // 50th percentile pay
  p75: number;    // 75th percentile pay
  currency: string;
  trend: MarketTrend;
  delta: number;
  updated_at: string;
}

/** Tracks who viewed a talent's public profile, from the `profile_views` table. */
export interface ProfileView {
  id: string;
  profile_id: string;
  viewer_id: string | null;
  viewed_at: string;
}

// Input types — used when writing data to the DB (create/update operations).
// They are subsets of the full row types, omitting fields generated by the DB.

/** Input shape for talent onboarding — profile fields, skills, and portfolio. */
export interface TalentOnboardingData {
  display_name?: string;
  headline?: string;
  bio?: string;
  location?: string;
  availability?: Availability;
  video_intro_url?: string;
  skills?: Array<{ name: string; level: SkillLevel; verified_by?: VerifiedBy }>;
  portfolio?: Array<Omit<PortfolioItem, "id" | "profile_id" | "created_at">>;
}

/** Input shape for company onboarding — profile fields and hiring process steps. */
export interface CompanyOnboardingData {
  display_name?: string;
  headline?: string;
  bio?: string;
  company_name?: string;
  company_initials?: string;
  company_industry?: string;
  company_size?: string;
  company_about?: string;
  location?: string;
  hiring_steps?: Array<Omit<HiringStep, "id" | "company_id">>;
}

// These `Omit` types derive input types from full row types by removing
// server-generated fields. This keeps input and row shapes in sync automatically.
export type JobInput = Omit<
  Job,
  "id" | "company_id" | "applicants" | "created_at" | "updated_at" | "company"
>;
export type ChallengeInput = Omit<
  Challenge,
  "id" | "company_id" | "submissions_count" | "created_at" | "updated_at" | "company"
>;
export type SubmissionInput = {
  challenge_id: string;
  talent_id: string;
  status?: SubmissionStatus;
  work_url?: string;
  writeup?: string;
  file_urls?: string[];
};
export type ApplicationInput = {
  job_id: string;
  talent_id: string;
  message?: string;
  challenge_submission_id?: string;
};

/** Phone and social handle for a user — only revealed after a confirmed match. */
export interface ContactInfo {
  phone_number: string | null;
  social_handle: string | null;
}

/** Badge counts for unread messages and notifications — used in the nav bar. */
export interface UnreadCounts {
  messages: number;
  notifications: number;
}

/** Combined results from the global search across three content types. */
export interface SearchResults {
  jobs: Job[];
  challenges: Challenge[];
  talent: Profile[];
}

/** A profile bundled with its skills and portfolio items for display pages. */
export interface FullProfile {
  profile: Profile;
  skills: Skill[];
  portfolio: PortfolioItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Unwrap a Supabase query result, throwing on DB errors or null data.
 * This is a convenience wrapper used throughout this file so every function
 * doesn't need to repeat the same error-checking boilerplate.
 */
function throwOnError<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data returned");
  return data;
}

// ---------------------------------------------------------------------------
// Profile functions
// ---------------------------------------------------------------------------

/**
 * Fetch a profile with its skills and portfolio items in a single parallel batch.
 * Used on profile pages and wherever the full picture of a user is needed.
 *
 * DATABASE: reads `profiles`, `skills`, and `portfolio_items` for the given userId.
 * Returns a FullProfile object with all three arrays merged.
 */
export async function fetchProfile(userId: string): Promise<FullProfile> {
  const [profileRes, skillsRes, portfolioRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("skills").select("*").eq("profile_id", userId).order("created_at"),
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("profile_id", userId)
      .order("pinned", { ascending: false })
      .order("year", { ascending: false }),
  ]);

  const profile = throwOnError(profileRes.data, profileRes.error) as Profile;
  const skills = (skillsRes.data ?? []) as Skill[];
  const portfolio = (portfolioRes.data ?? []) as PortfolioItem[];

  return { profile, skills, portfolio };
}

/**
 * Update mutable profile fields for a user.
 * Only the fields included in `data` are changed — all other fields remain untouched.
 *
 * DATABASE: updates the `profiles` table row where id = userId.
 */
export async function updateProfile(userId: string, data: ProfileUpdate): Promise<Profile> {
  const { data: updated, error } = await supabase
    .from("profiles")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(data as any)
    .eq("id", userId)
    .select()
    .single();
  return throwOnError(updated, error) as Profile;
}

/**
 * Save talent onboarding data: profile fields, skills list, and portfolio items.
 * Skills are fully replaced on each save (delete + re-insert) to stay in sync
 * with the onboarding wizard which shows a fresh list each step.
 * Portfolio items are upserted (insert-or-update) on title conflict.
 *
 * DATABASE: updates `profiles`, replaces `skills`, upserts `portfolio_items`.
 */
export async function upsertTalentOnboarding(
  userId: string,
  data: TalentOnboardingData,
): Promise<void> {
  const { skills, portfolio, ...profileFields } = data;

  if (Object.keys(profileFields).length > 0) {
    const { error } = await supabase.from("profiles").update(profileFields).eq("id", userId);
    if (error) throw new Error(error.message);
  }

  if (skills && skills.length > 0) {
    // Delete existing and re-insert to keep in sync with onboarding flow
    const { error: delErr } = await supabase.from("skills").delete().eq("profile_id", userId);
    if (delErr) throw new Error(delErr.message);

    const rows = skills.map((s) => ({ ...s, profile_id: userId }));
    const { error: insErr } = await supabase.from("skills").insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  if (portfolio && portfolio.length > 0) {
    const rows = portfolio.map((p) => ({ ...p, profile_id: userId }));
    const { error } = await supabase
      .from("portfolio_items")
      .upsert(rows, { onConflict: "profile_id,title" });
    if (error) throw new Error(error.message);
  }
}

/**
 * Save company onboarding data: profile fields and hiring process steps.
 * Hiring steps are fully replaced (delete + re-insert) each save so the order
 * is always exactly what the user submitted in the wizard.
 *
 * DATABASE: updates `profiles`, replaces `company_hiring_steps`.
 */
export async function upsertCompanyOnboarding(
  userId: string,
  data: CompanyOnboardingData,
): Promise<void> {
  const { hiring_steps, ...profileFields } = data;

  if (Object.keys(profileFields).length > 0) {
    const { error } = await supabase.from("profiles").update(profileFields).eq("id", userId);
    if (error) throw new Error(error.message);
  }

  if (hiring_steps && hiring_steps.length > 0) {
    const { error: delErr } = await supabase
      .from("company_hiring_steps")
      .delete()
      .eq("company_id", userId);
    if (delErr) throw new Error(delErr.message);

    const rows = hiring_steps.map((s) => ({ ...s, company_id: userId }));
    const { error: insErr } = await supabase.from("company_hiring_steps").insert(rows);
    if (insErr) throw new Error(insErr.message);
  }
}

/**
 * Fetch a talent's public profile (profile + skills + portfolio, no contact info).
 * This is safe to call for any user — sensitive contact fields are excluded
 * by Postgres RLS policies rather than here in application code.
 *
 * DATABASE: reads `profiles`, `skills`, `portfolio_items` for talentId.
 */
export async function fetchTalentPublic(talentId: string): Promise<FullProfile> {
  return fetchProfile(talentId);
}

/**
 * Add a single skill to the authenticated user's profile.
 * Unlike onboarding, this does not clear existing skills first — it appends.
 *
 * DATABASE: inserts one row into the `skills` table.
 */
export async function addSkill(
  profileId: string,
  skill: { name: string; level: SkillLevel },
): Promise<Skill> {
  const { data, error } = await supabase
    .from("skills")
    .insert({ profile_id: profileId, name: skill.name, level: skill.level })
    .select()
    .single();
  return throwOnError(data, error) as Skill;
}

/**
 * Remove a skill by its row id.
 *
 * DATABASE: deletes from `skills` where id = skillId.
 */
export async function removeSkill(skillId: string): Promise<void> {
  const { error } = await supabase.from("skills").delete().eq("id", skillId);
  if (error) throw new Error(error.message);
}

/**
 * Add a portfolio item to the authenticated user's profile.
 *
 * DATABASE: inserts one row into the `portfolio_items` table.
 */
export async function addPortfolioItem(
  profileId: string,
  item: { title: string; summary: string; type: PortfolioType; tags: string[]; year: number },
): Promise<PortfolioItem> {
  const { data, error } = await supabase
    .from("portfolio_items")
    .insert({ profile_id: profileId, ...item })
    .select()
    .single();
  return throwOnError(data, error) as PortfolioItem;
}

/**
 * Toggle the pinned state of a portfolio item.
 * Pinned items appear first on the public profile.
 *
 * DATABASE: updates `pinned` column in `portfolio_items` where id = itemId.
 */
export async function pinPortfolioItem(itemId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from("portfolio_items").update({ pinned }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

/**
 * Get contact info for a user. Returns phone/social only if a confirmed match
 * exists between the caller and the subject — enforced by a Postgres security
 * definer function.
 *
 * AUTH: The Postgres `get_contact_info` RPC checks that a confirmed match exists
 * before returning sensitive fields, so this can't be bypassed client-side.
 *
 * DATABASE: calls the `get_contact_info` Postgres RPC with subject_id.
 */
export async function fetchContactInfo(subjectId: string): Promise<ContactInfo> {
  const { data, error } = await supabase.rpc("get_contact_info", { subject_id: subjectId });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    phone_number: row?.phone_number ?? null,
    social_handle: row?.social_handle ?? null,
  };
}

// ---------------------------------------------------------------------------
// Job functions
// ---------------------------------------------------------------------------

/**
 * List open jobs, optionally filtered by a search query.
 * Includes the company's profile so job cards can show company info without
 * a second request.
 *
 * VALIDATION: the query string is sanitized before use in a PostgREST .or() filter.
 * DATABASE: reads `jobs` joined to `profiles` (company), filtered to status=open.
 */
export async function fetchJobs(query?: string): Promise<Job[]> {
  let q = supabase
    .from("jobs")
    .select("*, company:profiles!company_id(*)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (query && query.trim()) {
    const safe = sanitizeSearchTerm(query.trim());
    q = q.or(`title.ilike.%${safe}%,summary.ilike.%${safe}%,location.ilike.%${safe}%`);
  }

  const { data, error } = await q;
  return throwOnError(data, error) as Job[];
}

/**
 * Fetch a single job with its company profile.
 * Used on the job detail page.
 *
 * DATABASE: reads one row from `jobs` joined to `profiles`, filtered to id = jobId.
 */
export async function fetchJob(jobId: string): Promise<Job> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, company:profiles!company_id(*)")
    .eq("id", jobId)
    .single();
  return throwOnError(data, error) as Job;
}

/**
 * Create a new job posting for a company.
 * The company_id is passed in so we never rely on client-supplied data for ownership.
 *
 * DATABASE: inserts one row into the `jobs` table with company_id = companyId.
 */
export async function createJob(companyId: string, data: JobInput): Promise<Job> {
  const { data: created, error } = await supabase
    .from("jobs")
    .insert({ ...data, company_id: companyId })
    .select()
    .single();
  return throwOnError(created, error) as Job;
}

/**
 * Update a job posting (e.g., change status, edit title/summary).
 *
 * DATABASE: updates columns in `jobs` where id = jobId.
 */
export async function updateJob(jobId: string, data: Partial<JobInput>): Promise<Job> {
  const { data: updated, error } = await supabase
    .from("jobs")
    .update(data)
    .eq("id", jobId)
    .select()
    .single();
  return throwOnError(updated, error) as Job;
}

// ---------------------------------------------------------------------------
// Challenge functions
// ---------------------------------------------------------------------------

/**
 * List open challenges, optionally filtered by a search query.
 * Includes the company profile so challenge cards show company branding.
 *
 * DATABASE: reads `challenges` joined to `profiles`, filtered to status=open.
 */
export async function fetchChallenges(query?: string): Promise<Challenge[]> {
  let q = supabase
    .from("challenges")
    .select("*, company:profiles!company_id(*)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (query && query.trim()) {
    const safe = sanitizeSearchTerm(query.trim());
    q = q.or(`title.ilike.%${safe}%,brief.ilike.%${safe}%`);
  }

  const { data, error } = await q;
  return throwOnError(data, error) as Challenge[];
}

/**
 * Fetch a single challenge with its company profile.
 *
 * DATABASE: reads one row from `challenges` joined to `profiles`.
 */
export async function fetchChallenge(challengeId: string): Promise<Challenge> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*, company:profiles!company_id(*)")
    .eq("id", challengeId)
    .single();
  return throwOnError(data, error) as Challenge;
}

/**
 * Create a new challenge for a company.
 *
 * DATABASE: inserts one row into `challenges` with company_id = companyId.
 */
export async function createChallenge(companyId: string, data: ChallengeInput): Promise<Challenge> {
  const { data: created, error } = await supabase
    .from("challenges")
    .insert({ ...data, company_id: companyId })
    .select()
    .single();
  return throwOnError(created, error) as Challenge;
}

/**
 * Update an existing challenge (e.g., extend deadline, change status).
 *
 * DATABASE: updates columns in `challenges` where id = challengeId.
 */
export async function updateChallenge(
  challengeId: string,
  data: Partial<ChallengeInput>,
): Promise<Challenge> {
  const { data: updated, error } = await supabase
    .from("challenges")
    .update(data)
    .eq("id", challengeId)
    .select()
    .single();
  return throwOnError(updated, error) as Challenge;
}

// ---------------------------------------------------------------------------
// Submission functions
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated talent's own challenge submissions, with challenge data.
 * Used on the talent dashboard to show submission history and statuses.
 *
 * DATABASE: reads `submissions` joined to `challenges`, filtered to talent_id = talentId.
 */
export async function fetchMySubmissions(talentId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*, challenge:challenges(*)")
    .eq("talent_id", talentId)
    .order("created_at", { ascending: false });
  return throwOnError(data, error) as Submission[];
}

/**
 * Fetch all submissions for a challenge (company view).
 * Sorted by AI match_score descending so the best submissions appear first.
 * Includes the talent's profile for the company to see who submitted.
 *
 * DATABASE: reads `submissions` joined to `profiles` (talent), filtered to challenge_id.
 */
export async function fetchChallengeSubmissions(challengeId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*, talent:profiles!talent_id(*)")
    .eq("challenge_id", challengeId)
    .order("match_score", { ascending: false });
  return throwOnError(data, error) as Submission[];
}

/**
 * Create or update a submission (upsert on challenge_id + talent_id).
 * Using upsert means a talent can save a draft and come back to update it
 * without creating duplicate rows.
 *
 * DATABASE: upserts `submissions` on the unique (challenge_id, talent_id) pair.
 */
export async function upsertSubmission(data: SubmissionInput): Promise<Submission> {
  const { data: result, error } = await supabase
    .from("submissions")
    .upsert(data, { onConflict: "challenge_id,talent_id" })
    .select()
    .single();
  return throwOnError(result, error) as Submission;
}

// ---------------------------------------------------------------------------
// Application functions
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated talent's own job applications, with job + company info.
 * Used on the talent dashboard to track application statuses.
 *
 * DATABASE: reads `applications` joined to `jobs` and `profiles` (company), for the given talent.
 */
export async function fetchMyApplications(talentId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*, job:jobs(*, company:profiles!company_id(*))")
    .eq("talent_id", talentId)
    .order("created_at", { ascending: false });
  return throwOnError(data, error) as Application[];
}

/**
 * Fetch all applications for a specific job (company view).
 * Sorted by AI match_score so the best candidates appear at the top.
 *
 * DATABASE: reads `applications` joined to `profiles` (talent), filtered to job_id.
 */
export async function fetchJobApplications(jobId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*, talent:profiles!talent_id(*)")
    .eq("job_id", jobId)
    .order("match_score", { ascending: false });
  return throwOnError(data, error) as Application[];
}

/**
 * Fetch all applications across all of a company's jobs.
 * Optionally filter by status for a Kanban-style pipeline view.
 *
 * This is a two-step query: first get the company's job IDs, then get all
 * applications for those jobs. We do it in two steps because Supabase's JS
 * client doesn't support sub-selects in a single chained call.
 *
 * DATABASE: reads `jobs` for the company, then `applications` joined to
 * `profiles` (talent) and a slim `jobs` row for the job title.
 */
export async function fetchCompanyPipeline(
  companyId: string,
  status?: string,
): Promise<Application[]> {
  const { data: companyJobs, error: jobsErr } = await supabase
    .from("jobs")
    .select("id")
    .eq("company_id", companyId);
  if (jobsErr) throw new Error(jobsErr.message);
  const jobIds = (companyJobs ?? []).map((j) => j.id);
  if (jobIds.length === 0) return [];

  let q = supabase
    .from("applications")
    .select("*, talent:profiles!talent_id(*), job:jobs!job_id(id,title,arrangement)")
    .in("job_id", jobIds)
    .order("updated_at", { ascending: false });

  if (status) {
    q = q.eq("status", status);
  }

  const { data, error } = await q;
  return throwOnError(data, error) as Application[];
}

/**
 * Submit an application to a job.
 * The talent_id and job_id are explicit parameters so the server can verify
 * the caller owns the talent_id via RLS (not just trust the request body).
 *
 * DATABASE: inserts one row into the `applications` table.
 */
export async function applyToJob(data: ApplicationInput): Promise<Application> {
  const { data: created, error } = await supabase
    .from("applications")
    .insert(data)
    .select()
    .single();
  return throwOnError(created, error) as Application;
}

/**
 * Move an application through the hiring pipeline (e.g., from "new" to "reviewing").
 * Called by companies as they process candidates in the pipeline view.
 *
 * DATABASE: updates `status` in `applications` where id = applicationId.
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
): Promise<Application> {
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select()
    .single();
  return throwOnError(data, error) as Application;
}

// ---------------------------------------------------------------------------
// Messaging functions
// ---------------------------------------------------------------------------

/**
 * List all conversations for a user, ordered by most recent message.
 * Fetches both participant profiles so the conversation list can show names
 * and avatars without additional requests.
 *
 * VALIDATION: asserts userId is a valid UUID to prevent PostgREST filter injection.
 * DATABASE: reads `conversations` joined to `profiles` for both participants.
 */
export async function fetchConversations(userId: string): Promise<Conversation[]> {
  assertUUID(userId, "userId");
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      profile_a:profiles!participant_a(id,display_name,avatar_url,account_type),
      profile_b:profiles!participant_b(id,display_name,avatar_url,account_type)
    `,
    )
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  return throwOnError(data, error) as Conversation[];
}

/**
 * Fetch all messages in a conversation, oldest first.
 * Ordered ascending so message bubbles render top-to-bottom chronologically.
 *
 * DATABASE: reads all `messages` for the given conversation_id.
 */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return throwOnError(data, error) as Message[];
}

/**
 * Send a message in a conversation.
 *
 * DATABASE: inserts one row into the `messages` table.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select()
    .single();
  return throwOnError(data, error) as Message;
}

/**
 * Find an existing conversation between two participants or create one.
 * The two participants are stored in a normalised order (lower UUID first)
 * to avoid duplicates, but we query both orderings for safety.
 *
 * VALIDATION: both participant IDs are validated as UUIDs before use in filter strings.
 * DATABASE: reads then optionally inserts into `conversations`.
 */
export async function getOrCreateConversation(
  participantA: string,
  participantB: string,
): Promise<Conversation> {
  assertUUID(participantA, "participantA");
  assertUUID(participantB, "participantB");
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .or(
      `and(participant_a.eq.${participantA},participant_b.eq.${participantB}),` +
        `and(participant_a.eq.${participantB},participant_b.eq.${participantA})`,
    )
    .maybeSingle();

  if (existing) return existing as Conversation;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ participant_a: participantA, participant_b: participantB })
    .select()
    .single();
  return throwOnError(created, error) as Conversation;
}

// ---------------------------------------------------------------------------
// Notification functions
// ---------------------------------------------------------------------------

/**
 * Fetch all notifications for a user, newest first.
 *
 * DATABASE: reads `notifications` for user_id = userId.
 */
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return throwOnError(data, error) as Notification[];
}

/**
 * Return counts of unread messages and notifications for badge display.
 * Runs two DB queries in parallel for efficiency.
 *
 * VALIDATION: userId is validated as a UUID before use in filter strings.
 * DATABASE: counts unread rows from `notifications` and `messages` tables.
 * STATE: the result is used to drive the red badge numbers in the nav bar.
 */
export async function fetchUnreadCounts(userId: string): Promise<UnreadCounts> {
  assertUUID(userId, "userId");

  const { data: convRows } = await supabase
    .from("conversations")
    .select("id")
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`);
  const convIds = (convRows ?? []).map((c) => c.id);

  const [notifRes, msgRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    convIds.length > 0
      ? supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .is("read_at", null)
          .neq("sender_id", userId)
          .in("conversation_id", convIds)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  return {
    notifications: notifRes.count ?? 0,
    messages: msgRes.count ?? 0,
  };
}

/**
 * Mark all of a user's unread notifications as read.
 * Called when the user opens the notifications panel.
 *
 * DATABASE: bulk-updates `read_at` in `notifications` for all unread rows belonging to userId.
 */
export async function markNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

/**
 * Mark a single notification as read.
 *
 * DATABASE: updates `read_at` in `notifications` for the given notification id.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

/**
 * Mark a single message as read.
 * The `.is("read_at", null)` guard prevents updating already-read messages,
 * keeping the update idempotent.
 *
 * DATABASE: updates `read_at` in `messages` for the given message id.
 */
export async function markMessageRead(messageId: string): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Leaderboard functions
// ---------------------------------------------------------------------------

/**
 * Fetch the full leaderboard with talent profiles and challenge info.
 * Ordered by rank ascending so rank 1 is first.
 *
 * DATABASE: reads `leaderboard_entries` joined to `profiles` (talent) and `challenges`.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("*, talent:profiles!talent_id(*), challenge:challenges!challenge_id(id,title)")
    .order("rank", { ascending: true });
  return throwOnError(data, error) as LeaderboardEntry[];
}

/**
 * Fetch all leaderboard entries for a specific talent (their challenge win history).
 *
 * DATABASE: reads `leaderboard_entries` joined to `challenges`, filtered to talent_id.
 */
export async function fetchTalentChallengeHistory(talentId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("*, challenge:challenges!challenge_id(*)")
    .eq("talent_id", talentId)
    .order("created_at", { ascending: false });
  return throwOnError(data, error) as LeaderboardEntry[];
}

// ---------------------------------------------------------------------------
// Market rates
// ---------------------------------------------------------------------------

/**
 * Fetch market rate benchmarks, optionally filtering by a list of skill names.
 * Used on the Insights page to show salary percentile data for skills.
 *
 * DATABASE: reads `market_rates`, optionally filtered to a set of skill names.
 */
export async function fetchMarketRates(skills?: string[]): Promise<MarketRate[]> {
  let q = supabase.from("market_rates").select("*").order("skill").order("location");

  if (skills && skills.length > 0) {
    q = q.in("skill", skills);
  }

  const { data, error } = await q;
  return throwOnError(data, error) as MarketRate[];
}

// ---------------------------------------------------------------------------
// Admin functions
// ---------------------------------------------------------------------------

/**
 * Fetch all user profiles (admin only — relies on service role or admin JWT).
 * Row-level security on `profiles` should restrict this to admin users.
 *
 * DATABASE: reads all rows from `profiles`, ordered by newest first.
 */
export async function fetchAllUsers(limit = 300): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return throwOnError(data, error) as Profile[];
}

/**
 * Fetch a moderation queue — currently returns submissions in 'submitted'
 * status that haven't been reviewed. Extend as moderation needs grow.
 *
 * DATABASE: reads `submissions` with status=submitted, joined to `challenges` and `profiles`.
 */
export async function fetchModerationQueue(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*, challenge:challenges(*), talent:profiles!talent_id(id,display_name,avatar_url)")
    .eq("status", "submitted")
    .order("created_at", { ascending: true });
  return throwOnError(data, error) as Submission[];
}

/**
 * Suspend a user by removing their role entry.
 * A suspended user's JWT will still work until it expires, but they will
 * have no role and all role-gated operations will be denied.
 *
 * AUTH: removing the `user_roles` row is what revokes access — RLS policies
 * check this table to decide what a user is allowed to do.
 *
 * DATABASE: deletes from `user_roles` where user_id = userId.
 */
export async function suspendUser(userId: string): Promise<void> {
  const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Reinstate a suspended user by re-inserting their talent role.
 * Uses upsert to be safe — if the row already exists (user wasn't actually suspended),
 * this is a no-op rather than an error.
 *
 * DATABASE: upserts into `user_roles` with role = "talent" for the given userId.
 */
export async function reinstateUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "talent" }, { onConflict: "user_id,role" });
  if (error) throw new Error(error.message);
}

/**
 * Returns the set of user IDs that have at least one row in user_roles.
 * Any talent profile whose ID is NOT in this set has been suspended
 * (suspendUser deletes all their roles).
 *
 * DATABASE: reads user_id column from user_roles.
 */
export async function fetchActiveUserIds(): Promise<Set<string>> {
  const { data } = await supabase.from("user_roles").select("user_id");
  return new Set((data ?? []).map((r) => r.user_id as string));
}

/**
 * Append a row to the admin audit log.
 * Call this after every admin action (suspend, reinstate, delete, etc.).
 * Silently swallows errors so a logging failure never breaks the action itself.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  await supabase.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId ?? null,
    details: (details ?? {}) as Record<string, never>,
  });
}

/**
 * Count how many times the authenticated user's profile was viewed in the last 30 days.
 * Used on the talent dashboard to show profile visibility stats.
 *
 * DATABASE: counts rows in `profile_views` for the given profile in the last 30 days.
 */
export async function fetchProfileViewCount(profileId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("profile_views")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .gte("viewed_at", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Record a profile view (called when someone visits a talent's public profile).
 * viewerId is null for anonymous visitors.
 *
 * DATABASE: inserts one row into `profile_views`.
 */
export async function recordProfileView(profileId: string, viewerId?: string): Promise<void> {
  const { error } = await supabase
    .from("profile_views")
    .insert({ profile_id: profileId, viewer_id: viewerId ?? null });
  if (error) throw new Error(error.message);
}

/**
 * Update a submission's status (admin/company moderation action).
 * For example, moving from "submitted" to "reviewed" or "shortlisted".
 *
 * DATABASE: updates `status` in `submissions` where id = submissionId.
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
): Promise<void> {
  const { error } = await supabase.from("submissions").update({ status }).eq("id", submissionId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Contact submissions
// ---------------------------------------------------------------------------

/** Input for the public contact form on the landing page. */
export interface ContactSubmissionInput {
  name: string;
  email: string;
  company?: string;
  topic: string;
  message: string;
}

/**
 * Persist a contact form submission so the team can follow up.
 *
 * DATABASE: inserts one row into `contact_submissions`.
 */
export async function submitContact(data: ContactSubmissionInput): Promise<void> {
  const { error } = await supabase.from("contact_submissions").insert(data);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Talent shortlists (company saves talent)
// ---------------------------------------------------------------------------

/**
 * Return all talent IDs that a company has shortlisted, as a Set for O(1) lookup.
 * Used to highlight the "saved" state on talent cards without needing a separate query.
 *
 * DATABASE: reads `talent_shortlists` for the given company_id.
 */
export async function fetchCompanyShortlists(companyId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("talent_shortlists")
    .select("talent_id")
    .eq("company_id", companyId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.talent_id as string));
}

/**
 * Count how many companies have shortlisted a talent profile in the last 30 days.
 * Displayed on the talent's dashboard as social proof.
 *
 * DATABASE: counts rows in `talent_shortlists` for the given talent in the last 30 days.
 */
export async function fetchShortlistCount(talentId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("talent_shortlists")
    .select("*", { count: "exact", head: true })
    .eq("talent_id", talentId)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Add a talent to a company's shortlist.
 * Uses upsert so clicking "save" a second time is safe (no duplicate rows).
 *
 * DATABASE: upserts into `talent_shortlists` on the (company_id, talent_id) unique pair.
 */
export async function addToShortlist(companyId: string, talentId: string): Promise<void> {
  const { error } = await supabase
    .from("talent_shortlists")
    .upsert({ company_id: companyId, talent_id: talentId }, { onConflict: "company_id,talent_id" });
  if (error) throw new Error(error.message);
}

/**
 * Remove a talent from a company's shortlist.
 *
 * DATABASE: deletes from `talent_shortlists` where company_id and talent_id match.
 */
export async function removeFromShortlist(companyId: string, talentId: string): Promise<void> {
  const { error } = await supabase
    .from("talent_shortlists")
    .delete()
    .eq("company_id", companyId)
    .eq("talent_id", talentId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Admin analytics
// ---------------------------------------------------------------------------

/** A single data point for time-series charts: a calendar day and a count. */
export interface DayCount {
  day: string; // YYYY-MM-DD
  count: number;
}

/**
 * Return profile view counts for the last 7 calendar days, including days
 * with 0 views so the chart always has 7 bars.
 *
 * We fetch the raw rows and aggregate in JS rather than using a SQL group-by
 * because Supabase's JS client doesn't natively support date truncation grouping.
 *
 * DATABASE: reads `profile_views` for the last 7 days.
 */
export async function fetchNetworkPulse(): Promise<DayCount[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("profile_views")
    .select("viewed_at")
    .gte("viewed_at", since);
  if (error) throw new Error(error.message);

  // Pre-fill all 7 days with 0 so the chart has a complete x-axis
  const counts: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    counts[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of data ?? []) {
    const day = (row.viewed_at as string).slice(0, 10);
    if (day in counts) counts[day] = (counts[day] ?? 0) + 1;
  }
  return Object.entries(counts).map(([day, count]) => ({ day, count }));
}

/** Summary statistics about platform trust and profile quality. */
export interface TrustStats {
  verifiedPct: number; // % talent with completeness_pct >= 60
  avgCompleteness: number; // 0-100
  disputeRate: number; // moderation queue / total submissions (%)
}

/**
 * Compute network trust statistics for the admin dashboard.
 * Runs three queries in parallel for speed.
 *
 * DATABASE: reads `profiles` (talent completeness), counts from `submissions`,
 * and counts from `submissions` with status=submitted (moderation queue).
 */
export async function fetchTrustStats(): Promise<TrustStats> {
  const [usersRes, submissionsRes, queueRes] = await Promise.all([
    supabase.from("profiles").select("completeness_pct").eq("account_type", "talent"),
    supabase.from("submissions").select("*", { count: "exact", head: true }),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted"),
  ]);

  const talent = (usersRes.data ?? []) as { completeness_pct: number }[];
  const total = talent.length || 1;
  const verified = talent.filter((t) => t.completeness_pct >= 60).length;
  const avg = Math.round(talent.reduce((s, t) => s + t.completeness_pct, 0) / total);
  const totalSubs = submissionsRes.count ?? 0;
  const queue = queueRes.count ?? 0;
  const disputeRate = totalSubs > 0 ? parseFloat(((queue / totalSubs) * 100).toFixed(1)) : 0;

  return {
    verifiedPct: Math.round((verified / total) * 100),
    avgCompleteness: avg,
    disputeRate,
  };
}

// ---------------------------------------------------------------------------
// Contact submissions (admin read)
// ---------------------------------------------------------------------------

/** Full row from the `contact_submissions` table. */
export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  topic: string;
  message: string;
  created_at: string;
}

/**
 * Fetch all contact form submissions, newest first (admin only).
 *
 * DATABASE: reads all rows from `contact_submissions`.
 */
export async function fetchContactSubmissions(): Promise<ContactSubmission[]> {
  const { data, error } = await supabase
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactSubmission[];
}

// ---------------------------------------------------------------------------
// Matches (company invites talent)
// ---------------------------------------------------------------------------

/**
 * Create a pending match invite from a company to a talent.
 * Uses upsert so sending a second invite doesn't create a duplicate row.
 *
 * DATABASE: upserts into `matches` on (company_id, talent_id) with status=pending.
 */
export async function createMatch(companyId: string, talentId: string): Promise<void> {
  const { error } = await supabase
    .from("matches")
    .upsert(
      { company_id: companyId, talent_id: talentId, status: "pending" },
      { onConflict: "company_id,talent_id" },
    );
  if (error) throw new Error(error.message);
}

/**
 * Fetch all matches for a talent (pending invites + confirmed matches).
 * Includes a minimal company profile for the match card display.
 *
 * DATABASE: reads `matches` joined to `profiles` (company), filtered to talent_id.
 */
export async function fetchTalentMatches(talentId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "*, company:profiles!company_id(id,display_name,headline,avatar_url,company_name,company_initials,company_industry,trust_score)",
    )
    .eq("talent_id", talentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Match[];
}

/**
 * Fetch all matches initiated by a company.
 * Includes a minimal talent profile so company can see who they've invited.
 *
 * DATABASE: reads `matches` joined to `profiles` (talent), filtered to company_id.
 */
export async function fetchCompanyMatches(companyId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "*, talent:profiles!talent_id(id,display_name,headline,avatar_url,completeness_pct,availability)",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Match[];
}

/**
 * Update a match status (talent accepts/declines, or company withdraws).
 *
 * DATABASE: updates `status` in `matches` where id = matchId.
 */
export async function updateMatchStatus(matchId: string, status: MatchStatus): Promise<void> {
  const { error } = await supabase.from("matches").update({ status }).eq("id", matchId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Candidate votes & notes
// ---------------------------------------------------------------------------

/**
 * Fetch all votes cast on an application, sorted by time.
 * Company users can see all votes for their job applications (enforced by RLS).
 *
 * DATABASE: reads `candidate_votes` for the given applicationId.
 */
export async function fetchApplicationVotes(applicationId: string): Promise<CandidateVote[]> {
  const { data, error } = await supabase
    .from("candidate_votes")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at");
  return throwOnError(data, error) as CandidateVote[];
}

/**
 * Cast or update the current user's vote on an application.
 * Uses upsert on the (application_id, voter_id) unique pair so voting twice
 * replaces the previous vote rather than creating a duplicate row.
 *
 * AUTH: voter_id = current auth.uid(); voter_name from user metadata.
 * DATABASE: upserts into `candidate_votes`.
 */
export async function upsertVote(
  applicationId: string,
  vote: Vote,
  voterName: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("candidate_votes")
    .upsert(
      { application_id: applicationId, voter_id: user.id, voter_name: voterName, vote },
      { onConflict: "application_id,voter_id" },
    );
  if (error) throw new Error(error.message);
}

/**
 * Fetch all notes on an application, oldest first.
 *
 * DATABASE: reads `candidate_notes` for the given applicationId.
 */
export async function fetchApplicationNotes(applicationId: string): Promise<CandidateNote[]> {
  const { data, error } = await supabase
    .from("candidate_notes")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at");
  return throwOnError(data, error) as CandidateNote[];
}

/**
 * Add a note to an application.
 *
 * AUTH: author_id must match auth.uid() (enforced by RLS INSERT policy).
 * DATABASE: inserts into `candidate_notes`.
 */
export async function addApplicationNote(
  applicationId: string,
  authorId: string,
  authorName: string,
  body: string,
): Promise<CandidateNote> {
  const { data, error } = await supabase
    .from("candidate_notes")
    .insert({ application_id: applicationId, author_id: authorId, author_name: authorName, body })
    .select()
    .single();
  return throwOnError(data, error) as CandidateNote;
}

// ---------------------------------------------------------------------------
// Edge function helpers
// ---------------------------------------------------------------------------

/**
 * Permanently delete the currently authenticated user's account.
 * Calls a security-definer Postgres function that deletes the auth.users row,
 * which cascades to profiles and all child tables.
 *
 * AUTH: the `delete_own_account` RPC is a security-definer function — it runs
 * with elevated privileges but verifies the calling user's identity via the JWT.
 * The cascade delete in Postgres handles cleaning up all related data.
 *
 * API: calls the `delete_own_account` Postgres RPC via Supabase.
 */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw new Error(error.message);
}

/**
 * Mark onboarding as complete in the database.
 * Sets a timestamp rather than a boolean so we can track when users finished.
 *
 * VALIDATION: asserts userId is a valid UUID before the DB call.
 * DATABASE: updates `onboarding_completed_at` in `profiles`.
 */
export async function completeOnboarding(userId: string): Promise<void> {
  assertUUID(userId);
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Check if onboarding is complete.
 * Only the DB flag is authoritative — don't use local storage or session state
 * for this check, as those can be cleared or spoofed.
 */
export function isOnboardingComplete(profile: { onboarding_completed_at: string | null } | null): boolean {
  return !!profile?.onboarding_completed_at;
}

/**
 * Invoke the `send-match-invite` edge function to notify a talent of a new match.
 * Errors are logged but not re-thrown — a failed notification should not break
 * the main match creation flow.
 *
 * API: calls the `send-match-invite` Supabase edge function.
 */
export async function notifyMatchInvite(talentId: string, companyName: string): Promise<void> {
  const { error } = await supabase.functions.invoke("send-match-invite", {
    body: { talent_id: talentId, company_name: companyName },
  });
  if (error) console.warn("[notifyMatchInvite]", error.message);
}

/**
 * Invoke the `send-contact-notification` edge function to email the team about
 * a new contact form submission. Errors are non-fatal for the same reason as above.
 *
 * API: calls the `send-contact-notification` Supabase edge function.
 */
export async function notifyContactSubmission(data: ContactSubmissionInput): Promise<void> {
  const { error } = await supabase.functions.invoke("send-contact-notification", {
    body: data,
  });
  if (error) console.warn("[notifyContactSubmission]", error.message);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/**
 * Full-text search across jobs, challenges, and talent profiles simultaneously.
 * Runs three queries in parallel and returns combined results.
 *
 * Uses Postgres ILIKE for simplicity; upgrade to full-text search vectors
 * (`to_tsvector`) for production-scale datasets.
 *
 * VALIDATION: the search term is sanitized before use in filter strings.
 * DATABASE: reads `jobs`, `challenges`, and `profiles` with ILIKE filters.
 */
export async function searchAll(query: string): Promise<SearchResults> {
  if (!query.trim()) return { jobs: [], challenges: [], talent: [] };

  const term = `%${sanitizeSearchTerm(query.trim())}%`;

  const [jobsRes, challengesRes, talentRes] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "*, company:profiles!company_id(id,display_name,avatar_url,company_name,company_initials)",
      )
      .eq("status", "open")
      .or(`title.ilike.${term},summary.ilike.${term},location.ilike.${term}`)
      .limit(10),

    supabase
      .from("challenges")
      .select(
        "*, company:profiles!company_id(id,display_name,avatar_url,company_name,company_initials)",
      )
      .eq("status", "open")
      .or(`title.ilike.${term},brief.ilike.${term}`)
      .limit(10),

    supabase
      .from("profiles")
      .select(
        "id,display_name,headline,avatar_url,location,availability,account_type,challenge_wins,completeness_pct",
      )
      .eq("account_type", "talent")
      .or(
        `display_name.ilike.${term},headline.ilike.${term},location.ilike.${term},bio.ilike.${term}`,
      )
      .limit(10),
  ]);

  return {
    jobs: (jobsRes.data ?? []) as Job[],
    challenges: (challengesRes.data ?? []) as Challenge[],
    talent: (talentRes.data ?? []) as Profile[],
  };
}

// ---------------------------------------------------------------------------
// Platform stats (public — used on marketing and onboarding pages)
// ---------------------------------------------------------------------------

export interface PlatformStats {
  talentCount: number;
  companyCount: number;
  openJobsCount: number;
  openChallengesCount: number;
  closedChallengesCount: number;
  totalSkillsCount: number;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  // Uses a SECURITY DEFINER RPC so unauthenticated visitors on public pages
  // still get real counts (direct table queries return 0 for anon due to RLS).
  const { data, error } = await supabase.rpc("get_platform_stats");
  if (error) throw new Error(error.message);
  const d = data as unknown as PlatformStats;
  return {
    talentCount: d.talentCount ?? 0,
    companyCount: d.companyCount ?? 0,
    openJobsCount: d.openJobsCount ?? 0,
    openChallengesCount: d.openChallengesCount ?? 0,
    closedChallengesCount: d.closedChallengesCount ?? 0,
    totalSkillsCount: d.totalSkillsCount ?? 0,
  };
}

export interface FeaturedTalent {
  id: string;
  display_name: string;
  headline: string;
  bio: string;
  avatar_url: string | null;
  challenge_wins: number;
  portfolio_count: number;
  skills: { name: string; level: string }[];
}

/**
 * Returns the most complete talent profile for use as a live showcase on the
 * public landing page. Selects the profile with the highest completeness_pct
 * that has both a headline and bio set.
 *
 * DATABASE: reads profiles, skills, and portfolio_items tables.
 */
export async function fetchFeaturedTalent(): Promise<FeaturedTalent | null> {
  // Uses a SECURITY DEFINER RPC so the landing page (anon visitors) can load
  // a real talent card despite RLS blocking direct profile reads for anon.
  const { data, error } = await supabase.rpc("get_featured_talent");
  if (error || !data) return null;
  const d = data as unknown as FeaturedTalent;
  return {
    id: d.id,
    display_name: d.display_name,
    headline: d.headline ?? "",
    bio: d.bio ?? "",
    avatar_url: d.avatar_url,
    challenge_wins: d.challenge_wins ?? 0,
    portfolio_count: d.portfolio_count ?? 0,
    skills: d.skills ?? [],
  };
}

// ---------------------------------------------------------------------------
// Subscriptions (Stripe billing)
// ---------------------------------------------------------------------------

export interface Subscription {
  id: string;
  company_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchSubscription(companyId: string): Promise<Subscription | null> {
  assertUUID(companyId);
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Subscription | null;
}

// ---------------------------------------------------------------------------
// Notifications (in-app + email)
// ---------------------------------------------------------------------------

export interface NotificationInput {
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  /** If provided, an email is also sent via the send-email edge function. */
  email?: string;
}

/**
 * Create an in-app notification. If `email` is provided, also fires the
 * send-email edge function (best-effort — failure is logged, not thrown).
 *
 * DATABASE: inserts into `notifications`.
 * API: optionally calls the `send-email` edge function.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  const { email, ...row } = input;

  // Use SECURITY DEFINER RPC — direct client INSERT has no INSERT policy.
  const { error } = await supabase.rpc("create_notification", {
    p_user_id: row.user_id,
    p_kind: row.kind,
    p_title: row.title,
    p_body: row.body,
    p_link: row.link ?? undefined,
  });
  if (error) throw new Error(error.message);

  if (email) {
    const safeTitle = escapeHtml(row.title);
    const safeBody  = escapeHtml(row.body);
    const safeLink  = safeLinkHref(row.link);

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
        <div style="font-size:20px;font-weight:600;margin-bottom:8px">${safeTitle}</div>
        <p style="color:#666;margin:0 0 20px">${safeBody}</p>
        ${safeLink ? `<a href="${safeLink}" style="background:#000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">View →</a>` : ""}
        <p style="margin-top:32px;font-size:12px;color:#999">Skill Network · <a href="https://tanstack-start-app.skillnetwork.workers.dev/app/settings" style="color:#999">Manage notifications</a></p>
      </div>`;

    supabase.functions
      .invoke("send-email", { body: { to: email, subject: row.title, html } })
      .catch((e: Error) => console.warn("[createNotification] email send failed:", e.message));
  }
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export interface Referral {
  id: string;
  referrer_id: string;
  code: string;
  referred_user_id: string | null;
  converted_at: string | null;
  created_at: string;
}

export interface ReferralStats {
  total_referrals: number;
  converted_referrals: number;
}

export async function fetchReferralStats(userId: string): Promise<ReferralStats> {
  assertUUID(userId);
  const { data, error } = await supabase
    .from("referral_stats")
    .select("total_referrals, converted_referrals")
    .eq("referrer_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { total_referrals: data?.total_referrals ?? 0, converted_referrals: data?.converted_referrals ?? 0 };
}

export async function recordReferral(referralCode: string, referredUserId: string): Promise<void> {
  assertUUID(referredUserId);
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("referral_code", referralCode)
    .single();
  if (!profile) return;
  await supabase.from("referrals").upsert(
    { referrer_id: profile.id, code: referralCode, referred_user_id: referredUserId, converted_at: new Date().toISOString() },
    { onConflict: "code" }
  );
}
