import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { jobs as initial, applications, type Job } from "@/lib/mock-data";

export const Route = createFileRoute("/company/jobs")({
  component: JobsPanel,
});

function JobsPanel() {
  const [list, setList] = useState<Job[]>(initial);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} open roles · {applications.length} candidates active</p>
        <button onClick={() => setCreating(true)} className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:bg-foreground/90">
          + New role
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {list.map((j) => (
          <article key={j.id} className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-soft">
            <div>
              <div className="text-xs text-muted-foreground">{j.location} · {j.arrangement} · {j.comp}</div>
              <h3 className="mt-1 font-display text-xl">{j.title}</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {j.requiredSkills.map((s) => (
                  <span key={s} className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="font-display text-2xl">{j.applicants}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">applicants</div>
              </div>
              <button className="rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-accent">Manage</button>
            </div>
          </article>
        ))}
      </div>

      {creating && <CreateRole onClose={() => setCreating(false)} onCreate={(j) => { setList((xs) => [j, ...xs]); setCreating(false); }} />}
    </div>
  );
}

function CreateRole({ onClose, onCreate }: { onClose: () => void; onCreate: (j: Job) => void }) {
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState("React, TypeScript");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-background p-8 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Post a new role</div>
        <h2 className="mt-2 font-display text-2xl">Bring a role to the network.</h2>
        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            onCreate({
              id: "j" + Math.random().toString(36).slice(2, 7),
              companyId: "c-meridian",
              title: title || "Untitled role",
              location: "Remote", arrangement: "Remote", comp: "Competitive",
              postedDays: 0, applicants: 0,
              requiredSkills: skills.split(",").map((s) => s.trim()).filter(Boolean),
              summary: "Crafted with care.",
            });
          }}
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Staff Frontend Engineer" className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">Required skills</label>
            <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, Design Systems" className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />
            <p className="mt-1 text-[11px] text-muted-foreground">Comma separated. Used for match scoring.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Publish role</button>
          </div>
        </form>
      </div>
    </div>
  );
}
