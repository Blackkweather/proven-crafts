import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useChallenges } from "@/lib/hooks";
import { createChallenge, updateChallenge, fetchChallengeSubmissions } from "@/lib/db";
import type { Submission, Challenge } from "@/lib/db";

export const Route = createFileRoute("/company/challenges")({
  component: ChallengesPanel,
});

type WizardStep = "brief" | "skills" | "logistics" | "preview";

interface NewChallenge {
  title: string;
  brief: string;
  skills: string[];
  skillInput: string;
  deadlineDays: number;
  prize: string;
  paid: boolean;
}

const BLANK: NewChallenge = {
  title: "",
  brief: "",
  skills: [],
  skillInput: "",
  deadlineDays: 14,
  prize: "",
  paid: false,
};

const STEP_ORDER: WizardStep[] = ["brief", "skills", "logistics", "preview"];
const STEP_LABELS: Record<WizardStep, string> = {
  brief: "Write the brief",
  skills: "Required skills",
  logistics: "Deadline & prize",
  preview: "Preview & publish",
};

const SKILL_CHIPS = [
  "React",
  "TypeScript",
  "Figma",
  "Python",
  "Data Analysis",
  "GraphQL",
  "Node.js",
  "Design Systems",
  "SQL",
  "Motion Design",
  "Rust",
  "Go",
  "Accessibility",
  "UX Research",
  "CSS",
];

function ChallengesPanel() {
  const { user } = useAuth();
  const { challenges: allChallenges, loading, refetch } = useChallenges();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const companyChallenges = allChallenges.filter((c) => c.company_id === user?.id);

  const totalSubmissions = companyChallenges.reduce(
    (sum, c) => sum + (c.submissions_count ?? 0),
    0,
  );

  async function publishChallenge(c: NewChallenge) {
    if (!user?.id) return;
    setPublishing(true);
    try {
      const deadline_at = new Date(Date.now() + c.deadlineDays * 86400000).toISOString();
      await createChallenge(user.id, {
        title: c.title,
        brief: c.brief,
        required_skills: c.skills,
        deadline_at,
        prize: c.prize || null,
        status: "open",
      });
      await refetch();
    } catch (err) {
      console.error(
        "Failed to publish challenge:",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setPublishing(false);
      setWizardOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {companyChallenges.length} active · {totalSubmissions} submissions across all briefs
        </p>
        <button
          onClick={() => setWizardOpen(true)}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:bg-foreground/90"
        >
          + New challenge
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-sm text-muted-foreground animate-pulse">Loading challenges…</div>
        </div>
      ) : companyChallenges.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="font-display text-xl text-muted-foreground">No challenges yet</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first challenge to start receiving submissions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {companyChallenges.map((c) => {
            const isEditing = editId === c.id;
            const daysLeft = c.deadline_at
              ? Math.max(0, Math.ceil((new Date(c.deadline_at).getTime() - Date.now()) / 86400000))
              : 0;

            return (
              <article
                key={c.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-start">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {daysLeft}d left · {c.submissions_count ?? 0} entries
                      </span>
                      {c.prize && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-warm-foreground bg-warm rounded-full px-2 py-0.5">
                            🏆 {c.prize}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="mt-1 font-display text-2xl leading-snug">{c.title}</h3>
                    {isEditing ? (
                      <InlineEdit
                        challenge={{
                          title: c.title,
                          brief: c.brief,
                          requiredSkills: c.required_skills ?? [],
                        }}
                        onSave={async (updated) => {
                          try {
                            await updateChallenge(c.id, {
                              title: updated.title,
                              brief: updated.brief,
                              required_skills: updated.requiredSkills,
                            });
                            await refetch();
                          } catch (err) {
                            console.error(
                              "Failed to update challenge:",
                              err instanceof Error ? err.message : String(err),
                            );
                          }
                          setEditId(null);
                        }}
                        onCancel={() => setEditId(null)}
                      />
                    ) : (
                      <>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{c.brief}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(c.required_skills ?? []).map((s) => (
                            <span
                              key={s}
                              className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => setEditId(c.id)}
                      className="shrink-0 rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-accent"
                    >
                      Edit brief
                    </button>
                  )}
                </div>

                {!isEditing && (
                  <SubmissionsPanel
                    challengeId={c.id}
                    submissionsCount={c.submissions_count ?? 0}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}

      {wizardOpen && (
        <CreateWizard
          onPublish={publishChallenge}
          onClose={() => setWizardOpen(false)}
          publishing={publishing}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lazy-loaded submissions for a single challenge
// ---------------------------------------------------------------------------

function SubmissionsPanel({
  challengeId,
  submissionsCount,
}: {
  challengeId: string;
  submissionsCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    setSubsLoading(true);
    fetchChallengeSubmissions(challengeId)
      .then((data) => {
        if (!cancelled) setSubs(data);
      })
      .catch(() => {
        if (!cancelled) setSubs([]);
      })
      .finally(() => {
        if (!cancelled) setSubsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, challengeId]);

  if (submissionsCount === 0) return null;

  return (
    <div className="border-t border-border bg-paper px-6 py-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        Submissions ({submissionsCount}) {expanded ? "▲" : "▼"}
      </button>

      {expanded && (
        <div className="mt-3">
          {subsLoading ? (
            <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
              Loading submissions…
            </div>
          ) : subs.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              No submissions found.
            </div>
          ) : (
            <ul className="space-y-2">
              {subs.map((s) => {
                const talent = s.talent;
                const displayName = talent?.display_name ?? "Unknown";
                const initials = displayName
                  .split(" ")
                  .slice(0, 2)
                  .map((w: string) => w[0] ?? "")
                  .join("")
                  .toUpperCase();
                const daysAgo = Math.round(
                  (Date.now() - new Date(s.created_at).getTime()) / 86400000,
                );

                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm"
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background font-display text-xs">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {talent?.headline ?? ""}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{daysAgo}d ago</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        s.status === "shortlisted"
                          ? "border-warm/40 bg-warm text-warm-foreground"
                          : "border-border bg-paper text-muted-foreground"
                      }`}
                    >
                      {s.status}
                    </span>
                    <span className="font-display text-lg text-primary">
                      {s.match_score ?? 0}
                      <span className="text-[0.5em] text-muted-foreground">%</span>
                    </span>
                    <button className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent">
                      Review
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline edit for existing challenge
// ---------------------------------------------------------------------------

function InlineEdit({
  challenge,
  onSave,
  onCancel,
}: {
  challenge: { title: string; brief: string; requiredSkills: string[] };
  onSave: (updated: { title: string; brief: string; requiredSkills: string[] }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(challenge.title);
  const [brief, setBrief] = useState(challenge.brief);
  const [skills, setSkills] = useState<string[]>(challenge.requiredSkills);
  const [skillInput, setSkillInput] = useState("");

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput("");
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Brief</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          className={`${inputCls} resize-none`}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Required skills
        </label>
        <div className="flex gap-2">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Add skill…"
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={addSkill}
            className="rounded-md border border-border px-3 text-xs hover:bg-accent"
          >
            Add
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 rounded-full border border-border bg-paper px-2.5 py-0.5 text-[11px]"
            >
              {s}
              <button
                onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ title, brief, requiredSkills: skills })}
          className="rounded-md bg-foreground px-4 py-2 text-xs font-medium text-background hover:bg-foreground/90"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-xs hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create wizard
// ---------------------------------------------------------------------------

function CreateWizard({
  onPublish,
  onClose,
  publishing,
}: {
  onPublish: (c: NewChallenge) => void;
  onClose: () => void;
  publishing: boolean;
}) {
  const [step, setStep] = useState<WizardStep>("brief");
  const [form, setForm] = useState<NewChallenge>({ ...BLANK });

  const stepIdx = STEP_ORDER.indexOf(step);
  const isLast = step === "preview";

  function next() {
    const nextStep = STEP_ORDER[stepIdx + 1];
    if (nextStep) setStep(nextStep);
  }

  function back() {
    const prev = STEP_ORDER[stepIdx - 1];
    if (prev) setStep(prev);
  }

  function addSkill() {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s], skillInput: "" }));
    } else {
      setForm((f) => ({ ...f, skillInput: "" }));
    }
  }

  function toggleSkill(s: string) {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s],
    }));
  }

  const canProceed: Record<WizardStep, boolean> = {
    brief: !!form.title.trim() && !!form.brief.trim(),
    skills: form.skills.length > 0,
    logistics: form.deadlineDays > 0,
    preview: true,
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-background shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-8 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              New challenge
            </div>
            <h2 className="mt-1 font-display text-xl">{STEP_LABELS[step]}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-accent text-muted-foreground"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-0 border-b border-border">
          {STEP_ORDER.map((s, i) => (
            <button
              key={s}
              onClick={() => {
                if (i < stepIdx || canProceed[STEP_ORDER[i - 1] as WizardStep]) setStep(s);
              }}
              className={`flex-1 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
                step === s
                  ? "border-foreground text-foreground"
                  : i < stepIdx
                    ? "border-border text-muted-foreground hover:text-foreground"
                    : "border-transparent text-muted-foreground/40"
              }`}
            >
              <span className="hidden sm:inline">{i + 1}. </span>
              {STEP_LABELS[s].split(" ").slice(-1)[0]}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-8">
          {step === "brief" && (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Challenge title
                </label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Design our new onboarding flow"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Brief{" "}
                  <span className="font-normal text-muted-foreground/60">
                    — what should candidates deliver?
                  </span>
                </label>
                <textarea
                  value={form.brief}
                  onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
                  rows={6}
                  placeholder="Describe the problem, context, and what a great submission looks like. Be specific — clarity gets better submissions."
                  className={`${inputCls} resize-none`}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {form.brief.length} chars · aim for 150–400
                </p>
              </div>
            </div>
          )}

          {step === "skills" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Pick skills required to complete this challenge. Talent will be matched and ranked
                against these.
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILL_CHIPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`rounded-full border px-3 py-1 text-xs transition-all ${
                      form.skills.includes(s)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-paper hover:border-foreground/20"
                    }`}
                  >
                    {form.skills.includes(s) && "✓ "}
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={form.skillInput}
                  onChange={(e) => setForm((f) => ({ ...f, skillInput: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Add a custom skill…"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="rounded-md border border-border px-3 text-xs hover:bg-accent"
                >
                  Add
                </button>
              </div>
              {form.skills.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Selected ({form.skills.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {form.skills.map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                      >
                        {s}
                        <button
                          onClick={() =>
                            setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))
                          }
                          className="opacity-60 hover:opacity-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "logistics" && (
            <div className="space-y-6">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Deadline
                </label>
                <div className="flex flex-wrap gap-2">
                  {[7, 14, 21, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, deadlineDays: d }))}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        form.deadlineDays === d
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  14 days is the sweet spot — long enough for quality work, short enough to stay
                  relevant.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Prize / recognition <span className="font-normal opacity-60">(optional)</span>
                </label>
                <input
                  value={form.prize}
                  onChange={(e) => setForm((f) => ({ ...f, prize: e.target.value }))}
                  placeholder="e.g. €500, Free license, Interview fast-track"
                  className={inputCls}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Challenges with prizes get 2.4× more top-tier submissions.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-paper p-4">
                <input
                  type="checkbox"
                  checked={form.paid}
                  onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))}
                  className="accent-primary h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium">Paid challenge</div>
                  <div className="text-xs text-muted-foreground">
                    All participants receive a base stipend. Signals respect for talent's time.
                  </div>
                </div>
              </label>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs text-muted-foreground">
                  {form.deadlineDays}d · {form.skills.length} skills required
                  {form.prize ? ` · 🏆 ${form.prize}` : ""}
                  {form.paid ? " · Paid" : ""}
                </div>
                <h3 className="mt-1 font-display text-2xl">{form.title || "—"}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{form.brief || "—"}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {form.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-foreground">
                Your challenge will be visible to all talent on Skill Network and surface in
                relevant skill searches.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-8 py-5">
          <button
            onClick={stepIdx === 0 ? onClose : back}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            {stepIdx === 0 ? "Cancel" : "← Back"}
          </button>
          <button
            onClick={isLast ? () => onPublish(form) : next}
            disabled={!canProceed[step] || publishing}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {isLast ? (publishing ? "Publishing…" : "Publish challenge") : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
