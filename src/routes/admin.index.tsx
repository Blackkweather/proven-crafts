import { createFileRoute } from "@tanstack/react-router";
import { candidates, companies, jobs, challenges } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const stats = [
    { k: "Talent", v: candidates.length, sub: "+312 / 30d" },
    { k: "Companies", v: companies.length, sub: "+5 / 30d" },
    { k: "Active roles", v: jobs.length, sub: "across the network" },
    { k: "Open challenges", v: challenges.length, sub: "73 entries" },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="surface-paper rounded-2xl p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{s.k}</div>
            <div className="mt-2 font-display text-4xl">{s.v}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-xl">Network pulse · last 7 days</h3>
          <div className="mt-6 grid grid-cols-7 items-end gap-2 h-40">
            {[42, 51, 38, 60, 48, 72, 65].map((v, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-full rounded-t bg-foreground/85 transition-all hover:bg-primary" style={{ height: `${v}%` }} />
                <span className="text-[10px] text-muted-foreground">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-foreground p-6 text-background">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-background/60">Trust score</div>
          <div className="mt-2 font-display text-5xl">98.2</div>
          <p className="mt-2 text-sm text-background/70">Verified profiles, signal quality, and dispute rate combined.</p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[["Verified", "94%"], ["Signal", "A+"], ["Disputes", "0.3%"]].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-background/5 p-2">
                <div className="text-[10px] uppercase tracking-widest text-background/60">{k}</div>
                <div className="font-display text-base">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
