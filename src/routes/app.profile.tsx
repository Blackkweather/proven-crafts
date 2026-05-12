import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks";
import { getAIProfileFeedback, type ProfileFeedbackResult } from "@/lib/ai";
import {
  updateProfile,
  addSkill,
  removeSkill,
  addPortfolioItem,
  pinPortfolioItem,
  type SkillLevel,
  type PortfolioType,
} from "@/lib/db";
import { uploadVideoIntro, getVideoIntroSignedUrl } from "@/lib/storage";
import { SkillTag } from "@/components/skill-tag";
import { MatchBar } from "@/components/match-score";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

const verifiedIcon: Record<string, string> = {
  challenge: "⚡",
  portfolio: "✦",
  reference: "◎",
};

const SKILL_SUGGESTIONS = [
  "Node.js",
  "Python",
  "Figma",
  "CSS",
  "Next.js",
  "Vue",
  "Svelte",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "GraphQL",
  "REST APIs",
  "Testing",
  "CI/CD",
  "AWS",
  "Product Design",
  "Animation",
];

type EditHeader = {
  display_name: string;
  headline: string;
  bio: string;
  location: string;
  availability: "open" | "exploring" | "booked";
};

const availabilityMeta: Record<string, { label: string; color: string }> = {
  open: { label: "Open to offers", color: "bg-primary text-primary-foreground" },
  exploring: { label: "Exploring opportunities", color: "bg-warm text-warm-foreground" },
  booked: { label: "Not looking", color: "bg-muted text-muted-foreground" },
};

function ProfilePage() {
  const { user } = useAuth();
  const { profile, skills, portfolio, loading, refetch } = useProfile(user?.id);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [headerDraft, setHeaderDraft] = useState<EditHeader | null>(null);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [addPortfolioOpen, setAddPortfolioOpen] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<ProfileFeedbackResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoSignedUrl, setVideoSignedUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Re-sign video intro URL on every page load (path lives forever, signed URLs expire).
  useEffect(() => {
    const path = profile?.video_intro_path;
    if (!path) {
      setVideoSignedUrl(null);
      return;
    }
    getVideoIntroSignedUrl(path)
      .then(setVideoSignedUrl)
      .catch(() => setVideoSignedUrl(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.video_intro_path]);

  async function loadAIFeedback() {
    if (!profile) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await getAIProfileFeedback(profile, skills, portfolio);
      setAiFeedback(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Could not load AI feedback.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingVideo(true);
    setVideoError(null);
    try {
      const path = await uploadVideoIntro(user.id, file);
      const freshUrl = await getVideoIntroSignedUrl(path);
      await updateProfile(user.id, { video_intro_path: path, video_intro_url: freshUrl });
      setVideoSignedUrl(freshUrl);
      await refetch();
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploadingVideo(false);
      // Reset input so the same file can be re-selected if needed
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  if (loading || !profile) {
    return <div className="text-sm text-muted-foreground">Loading profile…</div>;
  }

  const initials =
    profile.display_name
      ?.split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const verifiedSkills = skills.filter((s) => s.verified_by);
  const unverifiedCount = skills.filter((s) => !s.verified_by).length;
  const pinnedId = portfolio.find((p) => p.pinned)?.id ?? null;

  async function saveHeader() {
    if (!headerDraft || !user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        display_name: headerDraft.display_name,
        headline: headerDraft.headline,
        bio: headerDraft.bio,
        location: headerDraft.location,
        availability: headerDraft.availability,
      });
      await refetch();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSkill(skillId: string) {
    await removeSkill(skillId);
    await refetch();
  }

  async function handleAddSkill(name: string, level: SkillLevel) {
    if (!user) return;
    await addSkill(user.id, { name, level });
    await refetch();
    setAddSkillOpen(false);
  }

  async function handleAddPortfolio(item: {
    title: string;
    summary: string;
    tags: string[];
    type: PortfolioType;
  }) {
    if (!user) return;
    await addPortfolioItem(user.id, { ...item, year: new Date().getFullYear() });
    await refetch();
    setAddPortfolioOpen(false);
  }

  async function handleTogglePin(itemId: string) {
    const isCurrentlyPinned = pinnedId === itemId;
    if (pinnedId && pinnedId !== itemId) {
      await pinPortfolioItem(pinnedId, false);
    }
    await pinPortfolioItem(itemId, !isCurrentlyPinned);
    await refetch();
  }

  const completeness = profile.completeness_pct ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        {/* Header card */}
        <section className="surface-paper rounded-2xl p-7">
          {editing && headerDraft ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    value={headerDraft.display_name}
                    onChange={(e) =>
                      setHeaderDraft((d) => d && { ...d, display_name: e.target.value })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Location">
                  <input
                    value={headerDraft.location}
                    onChange={(e) => setHeaderDraft((d) => d && { ...d, location: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
              <Field label="Headline">
                <input
                  value={headerDraft.headline}
                  onChange={(e) => setHeaderDraft((d) => d && { ...d, headline: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Bio">
                <textarea
                  value={headerDraft.bio}
                  onChange={(e) => setHeaderDraft((d) => d && { ...d, bio: e.target.value })}
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <Field label="Availability">
                <div className="flex flex-wrap gap-2">
                  {(["open", "exploring", "booked"] as const).map((v) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="availability"
                        value={v}
                        checked={headerDraft.availability === v}
                        onChange={() => setHeaderDraft((d) => d && { ...d, availability: v })}
                        className="accent-primary"
                      />
                      <span className="text-sm capitalize text-foreground">
                        {availabilityMeta[v].label}
                      </span>
                    </label>
                  ))}
                </div>
              </Field>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveHeader}
                  disabled={saving}
                  className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-5">
                <div className="relative shrink-0">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground font-display text-2xl">
                    {initials}
                  </div>
                  {(profile.challenge_wins ?? 0) > 0 && (
                    <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-yellow-400 text-[10px] font-bold text-yellow-900 shadow-sm">
                      {profile.challenge_wins}×
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-3xl">{profile.display_name}</h2>
                  <p className="text-sm text-muted-foreground">{profile.headline}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${availabilityMeta[profile.availability]?.color ?? ""}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      {availabilityMeta[profile.availability]?.label ?? profile.availability}
                    </span>
                    <span>·</span>
                    <span>{profile.location}</span>
                    {(profile.challenge_wins ?? 0) > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-yellow-600">
                          🏆 {profile.challenge_wins} challenge win
                          {profile.challenge_wins !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setHeaderDraft({
                      display_name: profile.display_name ?? "",
                      headline: profile.headline ?? "",
                      bio: profile.bio ?? "",
                      location: profile.location ?? "",
                      availability: profile.availability ?? "exploring",
                    });
                    setEditing(true);
                  }}
                  className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-xs hover:bg-accent"
                >
                  Edit
                </button>
              </div>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/85">
                {profile.bio}
              </p>
            </>
          )}
        </section>

        {/* Video intro */}
        <section className="rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-7 py-4">
            <h3 className="font-display text-xl">Video intro</h3>
            {(videoSignedUrl || profile.video_intro_path) && (
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingVideo}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {uploadingVideo ? "Uploading…" : "Replace"}
              </button>
            )}
          </div>
          {/* Hidden file input for video upload */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
          />
          {videoError && (
            <p className="px-7 pt-3 text-xs text-destructive">{videoError}</p>
          )}
          {videoSignedUrl ? (
            <div className="relative bg-foreground" style={{ aspectRatio: "16/7" }}>
              <div className="absolute inset-0 grid place-items-center bg-foreground/80">
                <button
                  onClick={() => window.open(videoSignedUrl, "_blank")}
                  className="grid h-16 w-16 place-items-center rounded-full bg-background/90 text-foreground shadow-elevated hover:bg-background transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 bg-paper px-7 py-12 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.844v6.312a1 1 0 0 1-1.447.913L15 14" />
                  <rect x="3" y="6" width="12" height="12" rx="2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Add a 60-second video intro</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Profiles with video intros get 3× more recruiter views.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={uploadingVideo}
                  onClick={() => videoInputRef.current?.click()}
                  className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
                >
                  {uploadingVideo ? "Uploading…" : "Upload file"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Skills */}
        <section className="rounded-2xl border border-border p-7">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Skills</h3>
            <button
              onClick={() => setAddSkillOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + Add skill
            </button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {skills.map((s) => (
              <div key={s.id} className="group relative">
                <SkillTag
                  skill={{ name: s.name, level: s.level, verifiedBy: s.verified_by ?? undefined }}
                  tone={s.level === "expert" ? "primary" : "default"}
                />
                <button
                  onClick={() => handleRemoveSkill(s.id)}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full bg-destructive text-background text-[9px] group-hover:grid"
                  title="Remove skill"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground border-t border-border pt-4">
            <span className="flex items-center gap-1">
              ⚡ <span>Verified by challenge</span>
            </span>
            <span className="flex items-center gap-1">
              ✦ <span>Verified by portfolio</span>
            </span>
            <span className="flex items-center gap-1">
              ◎ <span>Verified by reference</span>
            </span>
          </div>
        </section>

        {/* Portfolio */}
        <section>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Portfolio</h3>
            <button
              onClick={() => setAddPortfolioOpen(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              + Add piece
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {portfolio.map((p) => (
              <article
                key={p.id}
                className={`group relative flex h-full flex-col rounded-2xl border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-soft ${
                  p.pinned ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                }`}
              >
                {p.pinned && (
                  <span className="absolute right-4 top-4 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                    Pinned
                  </span>
                )}
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <span>{p.type}</span>
                  <span>{p.year}</span>
                </div>
                <h4 className="mt-3 font-display text-lg leading-snug">{p.title}</h4>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <button
                    onClick={() => handleTogglePin(p.id)}
                    className="rounded-md border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-accent"
                  >
                    {p.pinned ? "Unpin" : "Pin"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-6">
        <div className="surface-paper rounded-2xl p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Profile completeness
          </div>
          <div className="mt-3 flex items-end justify-between">
            <span className="font-display text-5xl">
              {completeness}
              <span className="text-2xl text-muted-foreground">%</span>
            </span>
          </div>
          <div className="mt-3">
            <MatchBar value={completeness} />
          </div>
          <ul className="mt-5 space-y-2 text-sm">
            {([
              ["Headline", !!profile.headline, () => { setHeaderDraft({ display_name: profile.display_name ?? "", headline: profile.headline ?? "", bio: profile.bio ?? "", location: profile.location ?? "", availability: profile.availability ?? "exploring" }); setEditing(true); }],
              ["Bio", !!profile.bio, () => { setHeaderDraft({ display_name: profile.display_name ?? "", headline: profile.headline ?? "", bio: profile.bio ?? "", location: profile.location ?? "", availability: profile.availability ?? "exploring" }); setEditing(true); }],
              ["Skills (5+)", skills.length >= 5, () => setAddSkillOpen(true)],
              ["Portfolio (3+)", portfolio.length >= 3, () => setAddPortfolioOpen(true)],
              ["Video intro", !!(profile.video_intro_path || profile.video_intro_url), () => videoInputRef.current?.click()],
            ] as [string, boolean, () => void][]).map(([k, done, action]) => (
              <li key={k} className="flex items-center justify-between">
                <span className={done ? "text-foreground" : "text-muted-foreground"}>
                  {k}
                </span>
                {done ? (
                  <span className="text-primary text-xs">✓</span>
                ) : (
                  <button
                    onClick={action}
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Pin CTA */}
        {portfolio.length > 0 && (
          <div className="rounded-2xl border border-border bg-warm p-6">
            <div className="font-display text-lg text-warm-foreground">Highlight a project</div>
            <p className="mt-1 text-sm text-warm-foreground/80">
              Pinned work appears first to recruiters reviewing your profile.
            </p>
            {pinnedId ? (
              <div className="mt-4 rounded-lg border border-warm-foreground/20 bg-card/40 p-3 text-xs text-warm-foreground">
                ✓ Pinned:{" "}
                <span className="font-medium">
                  {portfolio.find((p) => p.id === pinnedId)?.title?.slice(0, 40)}…
                </span>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {portfolio.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleTogglePin(p.id)}
                    className="w-full rounded-md border border-warm-foreground/20 bg-card/40 px-3 py-2 text-left text-xs text-warm-foreground hover:bg-card/60 transition-colors"
                  >
                    {p.title.slice(0, 45)}
                    {p.title.length > 45 ? "…" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Profile Feedback */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              AI Feedback
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">✦ Gemini</span>
          </div>
          {!aiFeedback && !aiLoading && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Get AI-powered suggestions to improve your profile and attract more companies.</p>
              <button
                onClick={loadAIFeedback}
                className="mt-3 w-full rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background hover:bg-foreground/90"
              >
                Analyse my profile
              </button>
              {aiError && <p className="mt-2 text-xs text-destructive">{aiError}</p>}
            </div>
          )}
          {aiLoading && (
            <div className="mt-4 animate-pulse text-xs text-muted-foreground">Analysing your profile…</div>
          )}
          {aiFeedback && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                  aiFeedback.overall_strength === "strong" ? "bg-primary/10 text-primary" :
                  aiFeedback.overall_strength === "good" ? "bg-green-100 text-green-800" :
                  aiFeedback.overall_strength === "fair" ? "bg-warm text-warm-foreground" :
                  "bg-muted text-muted-foreground"
                }`}>{aiFeedback.overall_strength}</span>
                <span className="font-display text-2xl">{aiFeedback.score}<span className="text-sm text-muted-foreground">/100</span></span>
              </div>
              <p className="text-xs text-muted-foreground">{aiFeedback.summary}</p>
              <div className="space-y-2">
                {aiFeedback.suggestions.map((s, i) => (
                  <div key={i} className={`rounded-lg border p-3 text-xs ${
                    s.priority === "high" ? "border-destructive/20 bg-destructive/5" :
                    s.priority === "medium" ? "border-warm/40 bg-warm/10" :
                    "border-border bg-paper"
                  }`}>
                    <div className="font-medium">{s.action}</div>
                    <div className="mt-0.5 text-muted-foreground">{s.why}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={loadAIFeedback}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Verified skills summary */}
        {verifiedSkills.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Skill verification
            </div>
            <div className="mt-4 space-y-2">
              {verifiedSkills.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg bg-paper px-3 py-2 text-sm"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {verifiedIcon[s.verified_by!]} {s.verified_by}
                  </span>
                </div>
              ))}
              {unverifiedCount > 0 && (
                <p className="pt-1 text-xs text-muted-foreground">
                  {unverifiedCount} skill{unverifiedCount !== 1 ? "s" : ""} unverified — complete a
                  challenge to verify.
                </p>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Add Skill Modal */}
      {addSkillOpen && (
        <AddSkillModal
          existing={skills.map((s) => s.name)}
          onAdd={handleAddSkill}
          onClose={() => setAddSkillOpen(false)}
        />
      )}

      {/* Add Portfolio Modal */}
      {addPortfolioOpen && (
        <AddPortfolioModal onAdd={handleAddPortfolio} onClose={() => setAddPortfolioOpen(false)} />
      )}
    </div>
  );
}

function AddSkillModal({
  existing,
  onAdd,
  onClose,
}: {
  existing: string[];
  onAdd: (name: string, level: SkillLevel) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<SkillLevel>("proficient");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = SKILL_SUGGESTIONS.filter(
    (s) => s.toLowerCase().includes(name.toLowerCase()) && !existing.includes(s),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(name.trim(), level);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add skill.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-background p-8 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl">Add a skill</h2>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Skill name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TypeScript, Figma…"
              className={inputCls}
            />
            {name && filtered.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {filtered.slice(0, 6).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setName(s)}
                    className="rounded-full border border-border bg-paper px-2.5 py-0.5 text-xs hover:bg-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Proficiency
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["foundational", "proficient", "advanced", "expert"] as SkillLevel[]).map((l) => (
                <label
                  key={l}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    level === l
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="radio"
                    name="level"
                    value={l}
                    checked={level === l}
                    onChange={() => setLevel(l)}
                    className="sr-only"
                  />
                  <span className="capitalize">{l}</span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
            >
              {submitting ? "Adding…" : "Add skill"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddPortfolioModal({
  onAdd,
  onClose,
}: {
  onAdd: (item: {
    title: string;
    summary: string;
    tags: string[];
    type: PortfolioType;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [type, setType] = useState<PortfolioType>("project");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAdd({ title: title.trim(), summary: summary.trim(), tags, type });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add portfolio item.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-background p-8 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl">Add portfolio piece</h2>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="flex gap-2">
            {(["project", "writing", "video"] as PortfolioType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                  type === t
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-accent"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Field label="Title">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What did you build or write?"
              className={inputCls}
            />
          </Field>
          <Field label="Summary">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="2–3 sentences on what you did and the impact."
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Tags">
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="React, Figma…"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-md border border-border px-3 text-xs hover:bg-accent"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full border border-border bg-paper px-2 py-0.5 text-[11px]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!title.trim() || !summary.trim() || submitting}
              className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
            >
              {submitting ? "Adding…" : "Add piece"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
