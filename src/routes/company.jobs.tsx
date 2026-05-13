import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useJobs } from "@/lib/hooks";
import { createJob, updateJob, type JobInput } from "@/lib/db";

export const Route = createFileRoute("/company/jobs")({
  component: JobsPanel,
});

const ARRANGEMENTS = ["Remote", "Hybrid", "Onsite"] as const;

function JobsPanel() {
  const { user } = useAuth();
  const { jobs, loading, refetch } = useJobs(undefined);
  const companyJobs = jobs.filter((j) => j.company_id === user?.id);
  const [creating, setCreating] = useState(false);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {companyJobs.length} open role{companyJobs.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:bg-foreground/90"
        >
          + New role
        </button>
      </div>

      {companyJobs.length === 0 && (
        <div className="mt-8 flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="font-display text-lg">No open roles yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Post your first role to start receiving applications.</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {companyJobs.map((j) => (
          <article
            key={j.id}
            className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-soft"
          >
            <div>
              <div className="text-xs text-muted-foreground">
                {j.location} · {j.arrangement} · {j.comp}
              </div>
              <h3 className="mt-1 font-display text-xl">{j.title}</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {j.required_skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="font-display text-2xl">{j.applicants}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  applicants
                </div>
              </div>
              <button
                onClick={async () => {
                  await updateJob(j.id, { status: "closed" });
                  refetch();
                }}
                className="rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-accent"
              >
                Close
              </button>
            </div>
          </article>
        ))}
      </div>

      {creating && user && (
        <CreateRoleModal
          onClose={() => setCreating(false)}
          onCreate={async (data) => {
            await createJob(user.id, data);
            await refetch();
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function CreateRoleModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: JobInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("Remote");
  const [arrangement, setArrangement] = useState<"Remote" | "Hybrid" | "Onsite">("Remote");
  const [comp, setComp] = useState("");
  const [summary, setSummary] = useState("");
  const [skills, setSkills] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        title: title.trim(),
        location,
        arrangement,
        comp,
        summary,
        required_skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        status: "open",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role.");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-background p-8 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Post a new role
        </div>
        <h2 className="mt-2 font-display text-2xl">Bring a role to the network.</h2>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Title *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Staff Frontend Engineer"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Location
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Berlin / Remote"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Arrangement
              </label>
              <select
                value={arrangement}
                onChange={(e) => setArrangement(e.target.value as typeof arrangement)}
                className={inputCls}
              >
                {ARRANGEMENTS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Compensation
              </label>
              <input
                value={comp}
                onChange={(e) => setComp(e.target.value)}
                placeholder="€80–100k"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Required skills
            </label>
            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="React, TypeScript, Design Systems"
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Comma separated — used for match scoring.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="What makes this role exciting?"
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Publishing…" : "Publish role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
