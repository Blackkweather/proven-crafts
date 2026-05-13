// =============================================================================
// TALENT PROFILE PAGE — src/routes/talent.$talentId.tsx
// =============================================================================
// Public-facing profile page for a specific talent (job seeker). Visible to
// anyone — logged-out visitors, other talent, and company users. The URL
// parameter `$talentId` is the Supabase user ID of the profile owner.
//
// Shows: name, headline, availability badge, bio, video intro, skills (with
// verification badges), challenge history (wins), and portfolio items.
//
// Company users see extra actions: "Save to shortlist" and "Send a message".
// Own-profile viewers see no message/shortlist actions.
// Privacy settings (`allow_messages`) control whether the message button appears.
//
// DATA FLOW: Route loader fetches `fetchProfile` + `fetchTalentChallengeHistory`
//            in parallel before the page renders. The video intro is a Supabase
//            Storage object — a signed URL is fetched on the client because
//            server-generated signed URLs expire after 1 hour (the stored path
//            is permanent but the signed URL must be re-generated each visit).
// KEYWORDS: AUTH, DATABASE, STATE, NAVIGATION
// =============================================================================

import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import {
  fetchProfile,
  fetchTalentChallengeHistory,
  recordProfileView,
  getOrCreateConversation,
  addToShortlist,
  removeFromShortlist,
  fetchCompanyShortlists,
} from "@/lib/db";
import { getVideoIntroSignedUrl } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { SkillTag } from "@/components/skill-tag";

// NAVIGATION: Defines the dynamic route "/talent/:talentId" with a loader and
// meta tags. `notFound()` is thrown if the profile doesn't exist in the DB.
export const Route = createFileRoute("/talent/$talentId")({
  // DATABASE: Fetch the talent's full profile and their challenge history
  // in parallel (Promise.all) before rendering the page.
  loader: async ({ params }) => {
    try {
      const [full, wins] = await Promise.all([
        fetchProfile(params.talentId),
        fetchTalentChallengeHistory(params.talentId),
      ]);
      return { talent: full.profile, skills: full.skills, portfolio: full.portfolio, wins };
    } catch {
      // If fetchProfile throws (e.g. profile not found), show the 404 component.
      throw notFound();
    }
  },
  // SEO: Set page title and Open Graph tags from the loaded profile data.
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.talent.display_name} — Skill Network` },
          { name: "description", content: loaderData.talent.bio ?? "" },
          {
            property: "og:title",
            content: `${loaderData.talent.display_name} · ${loaderData.talent.headline}`,
          },
          { property: "og:description", content: loaderData.talent.bio ?? "" },
        ]
      : [],
  }),
  component: TalentProfilePage,
  // Shown if the loader throws a generic error.
  errorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">
      {error.message}
    </div>
  ),
  // Shown if the loader throws notFound() — profile doesn't exist.
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <div className="font-display text-5xl">Profile unavailable</div>
        <p className="mt-2 text-sm text-muted-foreground">This person isn't on the network.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Back home
        </Link>
      </div>
    </div>
  ),
});

// Maps availability status strings to display labels and Tailwind colour classes.
const availabilityMeta: Record<string, { label: string; tone: string }> = {
  open: { label: "Open to work", tone: "bg-primary text-primary-foreground" },
  exploring: { label: "Exploring", tone: "bg-warm text-warm-foreground" },
  booked: { label: "Currently booked", tone: "bg-muted text-muted-foreground" },
};

function TalentProfilePage() {
  // DATABASE: Get the pre-loaded profile, skills, portfolio, and challenge wins.
  const { talent, skills, portfolio, wins } = Route.useLoaderData();

  // AUTH: Get the current user and their primary role (talent/company).
  const { user, primaryRole } = useAuth();

  // NAVIGATION: Used to redirect to the inbox or login page.
  const router = useRouter();

  // Look up the availability label and colour — fall back to "exploring" if unknown.
  const a = availabilityMeta[talent.availability] ?? availabilityMeta.exploring;

  // STATE: Re-signed Supabase Storage URL for the video intro.
  // We store a permanent path in the DB and generate a fresh signed URL on every load
  // because Supabase signed URLs expire after 1 hour.
  const [videoSignedUrl, setVideoSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!talent.video_intro_path) {
      setVideoSignedUrl(null);
      return;
    }
    // DATABASE (Storage): Convert the stored path into a time-limited signed URL.
    getVideoIntroSignedUrl(talent.video_intro_path)
      .then(setVideoSignedUrl)
      .catch(() => setVideoSignedUrl(null));
  }, [talent.video_intro_path]);

  // STATE: Tracks whether the current company user has this talent on their shortlist.
  const [shortlisted, setShortlisted] = useState(false);
  // STATE: True while a shortlist add/remove request is in flight.
  const [shortlisting, setShortlisting] = useState(false);
  // STATE: True while the "start conversation" request is in flight.
  const [messaging, setMessaging] = useState(false);
  // STATE: Error message shown in the CTA card if an action fails.
  const [actionError, setActionError] = useState<string | null>(null);

  // AUTH: True if the viewer is looking at their own profile — hides CTA actions.
  const isOwnProfile = !!user && user.id === talent.id;
  // AUTH: True if the viewer is a company user — shows shortlist button.
  const isCompany = primaryRole === "company";

  // AUTH: Resolve messaging permissions from the talent's privacy settings.
  // "anyone" — anyone can message, "companies" — only companies, "none" — nobody.
  const allowMessages = (talent.allow_messages ?? "anyone") as "anyone" | "companies" | "none";
  const canMessage =
    !isOwnProfile &&
    allowMessages !== "none" &&
    (allowMessages === "anyone" || isCompany);

  // AUTH: Only company users who are logged in and viewing someone else can shortlist.
  const canShortlist = !isOwnProfile && isCompany && !!user;

  // DATABASE: When a company user views the page, load their existing shortlist
  // so we know if this talent is already saved.
  useEffect(() => {
    if (!canShortlist || !user?.id) return;
    fetchCompanyShortlists(user.id)
      .then((set) => setShortlisted(set.has(talent.id)))
      .catch(() => {});
  }, [canShortlist, user?.id, talent.id]);

  // DATABASE: Record this profile view in Supabase (analytics).
  // Only fires if the viewer is not the profile owner.
  useEffect(() => {
    if (!isOwnProfile) {
      recordProfileView(talent.id, user?.id ?? undefined).catch(() => {});
    }
  }, [talent.id, user?.id, isOwnProfile]);

  // DATABASE + NAVIGATION: Start or open a conversation with this talent.
  // If the user isn't logged in, redirect to /login instead.
  async function handleMessage() {
    if (!user) {
      router.navigate({ to: "/login" });
      return;
    }
    setMessaging(true);
    setActionError(null);
    try {
      // DATABASE: Create the conversation row if it doesn't exist yet.
      await getOrCreateConversation(user.id, talent.id);
      // NAVIGATION: Send the user to the inbox (company or talent inbox).
      router.navigate({ to: isCompany ? "/company/inbox" : "/app/inbox" });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not start conversation.");
      setMessaging(false);
    }
  }

  // DATABASE: Toggle this talent on/off the company's shortlist.
  // Uses optimistic UI — the button updates immediately, then reverts if the API fails.
  async function handleShortlist() {
    if (!user || !isCompany) return;
    const next = !shortlisted;
    setShortlisted(next); // Optimistic: assume success before the API responds
    setShortlisting(true);
    setActionError(null);
    try {
      if (next) {
        await addToShortlist(user.id, talent.id);
      } else {
        await removeFromShortlist(user.id, talent.id);
      }
    } catch (err) {
      setShortlisted(!next); // Revert the optimistic update on failure
      setActionError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setShortlisting(false);
    }
  }

  // Filter down to only skills that have been verified (by a challenge, portfolio, or reference).
  const verifiedSkills = skills.filter((s) => s.verified_by);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <article className="container mx-auto px-6 pb-24 pt-16 lg:pt-20">
        <header className="grid gap-10 lg:grid-cols-12">
          {/* Left: identity — avatar, name, headline, availability badge */}
          <div className="lg:col-span-8">
            <div className="flex items-start gap-5">
              <div className="relative">
                {/* Avatar: initials-based, generated from display_name */}
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary text-primary-foreground font-display text-3xl">
                  {talent.display_name
                    ?.split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() ?? "?"}
                </div>
                {/* Badge: gold #1 indicator for challenge top performers */}
                {wins.some((w) => w.badge === "gold") && (
                  <div className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-yellow-400 text-[10px] font-black text-yellow-900">
                    #1
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-4xl leading-tight md:text-5xl">
                  {talent.display_name}
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">{talent.headline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {/* Availability badge — colour-coded from availabilityMeta */}
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-widest ${a.tone}`}
                  >
                    {a.label}
                  </span>
                  {/* Location — only shown if the talent has enabled `show_location` */}
                  {talent.show_location && talent.location && (
                    <span className="text-muted-foreground">· {talent.location}</span>
                  )}
                  {/* Challenge wins badge */}
                  {(talent.challenge_wins ?? 0) > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                      ⚡ {talent.challenge_wins} challenge win
                      {(talent.challenge_wins ?? 0) > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio paragraph */}
            <p className="mt-8 max-w-2xl text-lg text-foreground/85 leading-relaxed">
              {talent.bio}
            </p>

            {/* Video intro — always re-signed from the stored path; never uses the stored URL directly */}
            {videoSignedUrl && (
              <div className="mt-8">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  60-second intro
                </div>
                <div className="relative aspect-video max-w-lg overflow-hidden rounded-2xl border border-border bg-foreground">
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-background">
                    {/* Clicking the play button opens the video in a new tab */}
                    <button
                      onClick={() => window.open(videoSignedUrl, "_blank")}
                      className="grid h-14 w-14 place-items-center rounded-full bg-background/10 ring-1 ring-background/20 backdrop-blur hover:bg-background/20 transition-colors"
                      aria-label="Play video intro"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    <div className="text-sm text-background/70">Click to play intro</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: CTA card — sticky, contains message + shortlist buttons and quick stats */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <div className="surface-paper rounded-2xl p-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Get in touch
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Reach out via the network. Replies typically within 48h.
                </p>
                {/* STATE: Inline error banner for failed message/shortlist actions */}
                {actionError && (
                  <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {actionError}
                  </p>
                )}
                {/* Message button — shown to anyone who can message this talent,
                    or to logged-out visitors (who are prompted to sign in) */}
                {(canMessage || !user) && (
                  <button
                    onClick={handleMessage}
                    disabled={messaging}
                    className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                  >
                    {messaging ? "Opening…" : !user ? "Sign in to message" : "Send a message"}
                  </button>
                )}
                {/* Shortlist button — only shown to company users viewing someone else's profile */}
                {canShortlist && (
                  <button
                    onClick={handleShortlist}
                    disabled={shortlisting}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-60 transition-colors"
                  >
                    {shortlisting
                      ? "Saving…"
                      : shortlisted
                        ? "Saved to shortlist ✓"
                        : "Save to shortlist"}
                  </button>
                )}
              </div>

              {/* Quick stats card — verified skill count and portfolio item count */}
              <div className="surface-paper rounded-2xl p-5">
                <div className="grid grid-cols-2 divide-x divide-border text-center">
                  <div className="pr-4">
                    <div className="font-display text-2xl">{verifiedSkills.length}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Verified skills
                    </div>
                  </div>
                  <div className="pl-4">
                    <div className="font-display text-2xl">{portfolio.length}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      Portfolio items
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Skills section — renders all skills with verification badge legend */}
        <section className="mt-16">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl">Skills</h2>
            {/* Legend is only shown if at least one skill is verified */}
            {verifiedSkills.length > 0 && (
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="text-primary">⚡</span> Challenge verified
                </span>
                <span className="flex items-center gap-1">
                  <span>✦</span> Portfolio verified
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-muted-foreground">◎</span> Reference verified
                </span>
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {/* Each SkillTag renders with the appropriate verification icon if verified_by is set */}
            {skills.map((s) => (
              <SkillTag
                key={s.name}
                skill={{ name: s.name, level: s.level, verifiedBy: s.verified_by ?? undefined }}
                tone={s.level === "expert" ? "primary" : "default"}
              />
            ))}
          </div>
          {verifiedSkills.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {verifiedSkills.length} of {skills.length} skills verified by real work output.
            </p>
          )}
        </section>

        {/* Challenge history — only rendered if the talent has any challenge results */}
        {wins.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl">Challenge results</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reviewed and ranked by company engineering teams.
            </p>
            <div className="mt-5 space-y-3">
              {wins.map((entry) => {
                // The joined challenge data is included in the wins query response.
                const ch = (
                  entry as {
                    challenge?: {
                      title: string;
                      company?: { company_name?: string | null; display_name?: string };
                    };
                  }
                ).challenge;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-5 rounded-2xl border border-border bg-card p-5"
                  >
                    {/* Rank badge — gold/silver/bronze coloured circle */}
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${
                        entry.badge === "gold"
                          ? "bg-yellow-400 text-yellow-900"
                          : entry.badge === "silver"
                            ? "bg-slate-300 text-slate-800"
                            : entry.badge === "bronze"
                              ? "bg-amber-600 text-amber-100"
                              : "bg-foreground/10 text-foreground"
                      }`}
                    >
                      #{entry.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">
                        {ch?.company?.company_name ?? ch?.company?.display_name ?? "Company"} ·{" "}
                        {ch?.title ?? "Challenge"}
                      </div>
                      {/* Reviewer highlight quote for this submission */}
                      <p className="mt-1 text-sm italic text-foreground/80">"{entry.highlight}"</p>
                    </div>
                    {/* Match score percentage for this submission */}
                    <div className="shrink-0 text-right">
                      <div className="font-display text-xl">
                        {entry.score}
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">match</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Portfolio — only rendered if the talent has added portfolio items */}
        {portfolio.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl">Selected work</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {portfolio.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-elevated"
                >
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                    <span>{p.type}</span>
                    <span className="font-mono">{p.year}</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl leading-snug">{p.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{p.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span key={t} className="rounded-full bg-paper px-2.5 py-1 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
