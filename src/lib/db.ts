/**
 * db.ts — Async data service layer for Skill Network V2.
 * All functions throw on error; handle errors at the call site.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Security helpers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUUID(value: string, label = "id"): void {
  if (!UUID_RE.test(value)) throw new Error(`Invalid ${label}`);
}

/** Strip characters that break PostgREST .or() filter syntax. */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[(),."]/g, "");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;

export interface Skill {
  id: string;
  profile_id: string;
  name: string;
  level: SkillLevel;
  verified_by: VerifiedBy | null;
  created_at: string;
}

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

export interface HiringStep {
  id: string;
  company_id: string;
  step_order: number;
  label: string;
  description: string;
  duration: string;
  paid: boolean;
}

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

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

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

export interface CandidateVote {
  id: string;
  application_id: string;
  voter_id: string;
  voter_name: string;
  vote: Vote;
  created_at: string;
  updated_at: string;
}

export interface CandidateNote {
  id: string;
  application_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

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

export interface MarketRate {
  id: string;
  skill: string;
  location: string;
  p25: number;
  median: number;
  p75: number;
  currency: string;
  trend: MarketTrend;
  delta: number;
  updated_at: string;
}

export interface ProfileView {
  id: string;
  profile_id: string;
  viewer_id: string | null;
  viewed_at: string;
}

// Input types
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

export interface ContactInfo {
  phone_number: string | null;
  social_handle: string | null;
}

export interface UnreadCounts {
  messages: number;
  notifications: number;
}

export interface SearchResults {
  jobs: Job[];
  challenges: Challenge[];
  talent: Profile[];
}

export interface FullProfile {
  profile: Profile;
  skills: Skill[];
  portfolio: PortfolioItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function throwOnError<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data returned");
  return data;
}

// ---------------------------------------------------------------------------
// Profile functions
// ---------------------------------------------------------------------------

/** Fetch a profile with its skills and portfolio items. */
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

/** Update mutable profile fields. */
export async function updateProfile(userId: string, data: ProfileUpdate): Promise<Profile> {
  const { data: updated, error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId)
    .select()
    .single();
  return throwOnError(updated, error) as Profile;
}

/** Save talent onboarding data: profile fields + skills + portfolio items. */
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

/** Save company onboarding data: profile fields + hiring process steps. */
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

/** Fetch public talent profile (profile + skills + portfolio, no contact info). */
export async function fetchTalentPublic(talentId: string): Promise<FullProfile> {
  return fetchProfile(talentId);
}

/** Add a single skill to the authenticated user's profile. */
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

/** Remove a skill by its row id. */
export async function removeSkill(skillId: string): Promise<void> {
  const { error } = await supabase.from("skills").delete().eq("id", skillId);
  if (error) throw new Error(error.message);
}

/** Add a portfolio item to the authenticated user's profile. */
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

/** Toggle the pinned state of a portfolio item. */
export async function pinPortfolioItem(itemId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from("portfolio_items").update({ pinned }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

/**
 * Get contact info for a user. Returns phone/social only if a confirmed match
 * exists between the caller and the subject — enforced by a Postgres security
 * definer function.
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

/** List open jobs, optionally filtered by a search query. Includes company profile. */
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

/** Fetch a single job with company profile. */
export async function fetchJob(jobId: string): Promise<Job> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, company:profiles!company_id(*)")
    .eq("id", jobId)
    .single();
  return throwOnError(data, error) as Job;
}

/** Create a new job posting. */
export async function createJob(companyId: string, data: JobInput): Promise<Job> {
  const { data: created, error } = await supabase
    .from("jobs")
    .insert({ ...data, company_id: companyId })
    .select()
    .single();
  return throwOnError(created, error) as Job;
}

/** Update a job posting. */
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

/** List open challenges, optionally filtered. Includes company profile. */
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

/** Fetch a single challenge with company profile. */
export async function fetchChallenge(challengeId: string): Promise<Challenge> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*, company:profiles!company_id(*)")
    .eq("id", challengeId)
    .single();
  return throwOnError(data, error) as Challenge;
}

/** Create a new challenge. */
export async function createChallenge(companyId: string, data: ChallengeInput): Promise<Challenge> {
  const { data: created, error } = await supabase
    .from("challenges")
    .insert({ ...data, company_id: companyId })
    .select()
    .single();
  return throwOnError(created, error) as Challenge;
}

/** Update an existing challenge. */
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

/** Fetch the authenticated talent's own submissions with challenge data. */
export async function fetchMySubmissions(talentId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*, challenge:challenges(*)")
    .eq("talent_id", talentId)
    .order("created_at", { ascending: false });
  return throwOnError(data, error) as Submission[];
}

/** Fetch all submissions for a challenge (company view). Includes talent profile. */
export async function fetchChallengeSubmissions(challengeId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*, talent:profiles!talent_id(*)")
    .eq("challenge_id", challengeId)
    .order("match_score", { ascending: false });
  return throwOnError(data, error) as Submission[];
}

/** Create or update a submission (upsert on challenge_id + talent_id). */
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

/** Fetch the authenticated talent's own applications with job + company. */
export async function fetchMyApplications(talentId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*, job:jobs(*, company:profiles!company_id(*))")
    .eq("talent_id", talentId)
    .order("created_at", { ascending: false });
  return throwOnError(data, error) as Application[];
}

/** Fetch all applications for a specific job (company view). Includes talent profile. */
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

/** Submit an application to a job. */
export async function applyToJob(data: ApplicationInput): Promise<Application> {
  const { data: created, error } = await supabase
    .from("applications")
    .insert(data)
    .select()
    .single();
  return throwOnError(created, error) as Application;
}

/** Move an application through the hiring pipeline. */
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

/** List all conversations for a user, ordered by most recent message. */
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

/** Fetch all messages in a conversation, oldest first. */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return throwOnError(data, error) as Message[];
}

/** Send a message in a conversation. */
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

/** Fetch all notifications for a user, newest first. */
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return throwOnError(data, error) as Notification[];
}

/** Return counts of unread messages and notifications for badge display. */
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

/** Mark all of a user's notifications as read. */
export async function markNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

/** Mark a single message as read. */
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

/** Fetch the full leaderboard with talent profiles and challenge info. */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("leaderboard_entries")
    .select("*, talent:profiles!talent_id(*), challenge:challenges!challenge_id(id,title)")
    .order("rank", { ascending: true });
  return throwOnError(data, error) as LeaderboardEntry[];
}

/** Fetch all leaderboard entries for a specific talent (their challenge history). */
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

/** Fetch market rate benchmarks, optionally filtering by a list of skill names. */
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

/** Fetch all user profiles (admin only — relies on service role or admin JWT). */
export async function fetchAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  return throwOnError(data, error) as Profile[];
}

/**
 * Fetch a moderation queue — currently returns submissions in 'submitted'
 * status that haven't been reviewed. Extend as moderation needs grow.
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
 */
export async function suspendUser(userId: string): Promise<void> {
  const { error } = await supabase.from("user_roles").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** Reinstate a suspended user by re-inserting their talent role. */
export async function reinstateUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "talent" }, { onConflict: "user_id,role" });
  if (error) throw new Error(error.message);
}

/** Count how many times the authenticated user's profile was viewed in the last 30 days. */
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

/** Record a profile view (called when someone visits a talent's public profile). */
export async function recordProfileView(profileId: string, viewerId?: string): Promise<void> {
  const { error } = await supabase
    .from("profile_views")
    .insert({ profile_id: profileId, viewer_id: viewerId ?? null });
  if (error) throw new Error(error.message);
}

/** Update a submission's status (admin/company moderation action). */
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

export interface ContactSubmissionInput {
  name: string;
  email: string;
  company?: string;
  topic: string;
  message: string;
}

/** Persist a contact form submission. */
export async function submitContact(data: ContactSubmissionInput): Promise<void> {
  const { error } = await supabase.from("contact_submissions").insert(data);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Talent shortlists (company saves talent)
// ---------------------------------------------------------------------------

/** Return all talent IDs that a company has shortlisted. */
export async function fetchCompanyShortlists(companyId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("talent_shortlists")
    .select("talent_id")
    .eq("company_id", companyId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.talent_id as string));
}

/** Count how many companies have shortlisted a talent profile in the last 30 days. */
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

/** Add a talent to a company's shortlist. */
export async function addToShortlist(companyId: string, talentId: string): Promise<void> {
  const { error } = await supabase
    .from("talent_shortlists")
    .upsert({ company_id: companyId, talent_id: talentId }, { onConflict: "company_id,talent_id" });
  if (error) throw new Error(error.message);
}

/** Remove a talent from a company's shortlist. */
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

export interface DayCount {
  day: string; // YYYY-MM-DD
  count: number;
}

/**
 * Return profile view counts for the last 7 calendar days, including days
 * with 0 views so the chart always has 7 bars.
 */
export async function fetchNetworkPulse(): Promise<DayCount[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("profile_views")
    .select("viewed_at")
    .gte("viewed_at", since);
  if (error) throw new Error(error.message);

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

export interface TrustStats {
  verifiedPct: number; // % talent with completeness_pct >= 60
  avgCompleteness: number; // 0-100
  disputeRate: number; // moderation queue / total submissions (%)
}

/** Compute network trust statistics for the admin dashboard. */
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

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  topic: string;
  message: string;
  created_at: string;
}

/** Fetch all contact form submissions, newest first (admin only). */
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

/** Create a pending match invite from a company to a talent. */
export async function createMatch(companyId: string, talentId: string): Promise<void> {
  const { error } = await supabase
    .from("matches")
    .upsert(
      { company_id: companyId, talent_id: talentId, status: "pending" },
      { onConflict: "company_id,talent_id" },
    );
  if (error) throw new Error(error.message);
}

/** Fetch all matches for a talent (pending invites + confirmed). */
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

/** Fetch all matches initiated by a company. */
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

/** Update a match status (talent accepts/declines, or company withdraws). */
export async function updateMatchStatus(matchId: string, status: MatchStatus): Promise<void> {
  const { error } = await supabase.from("matches").update({ status }).eq("id", matchId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Edge function helpers
// ---------------------------------------------------------------------------

/**
 * Permanently delete the currently authenticated user's account.
 * Calls a security-definer Postgres function that deletes the auth.users row,
 * which cascades to profiles and all child tables.
 */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw new Error(error.message);
}

/** Mark onboarding as complete in the database. */
export async function completeOnboarding(userId: string): Promise<void> {
  assertUUID(userId);
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Check if onboarding is complete. Only the DB flag is authoritative. */
export function isOnboardingComplete(profile: { onboarding_completed_at: string | null } | null): boolean {
  return !!profile?.onboarding_completed_at;
}

export async function notifyMatchInvite(talentId: string, companyName: string): Promise<void> {
  const { error } = await supabase.functions.invoke("send-match-invite", {
    body: { talent_id: talentId, company_name: companyName },
  });
  if (error) console.warn("[notifyMatchInvite]", error.message);
}

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
 * Full-text search across jobs, challenges, and talent profiles.
 * Uses Postgres ILIKE for simplicity; upgrade to full-text search vectors
 * (`to_tsvector`) for production-scale datasets.
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
