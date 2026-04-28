import { createFileRoute } from "@tanstack/react-router";
import { companies, jobs, challenges } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompanies,
});

function AdminCompanies() {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{companies.length} active companies on the network</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {companies.map((c) => {
          const cJobs = jobs.filter((j) => j.companyId === c.id).length;
          const cCh = challenges.filter((ch) => ch.companyId === c.id).length;
          return (
            <article key={c.id} className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-foreground text-background font-display">{c.initials}</div>
                <div className="flex-1">
                  <div className="font-display text-xl">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.industry} · {c.size}</div>
                </div>
                <button className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-accent">Manage</button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{c.about}</p>
              <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-paper text-center">
                <Stat n={cJobs} l="Roles" />
                <Stat n={cCh} l="Challenges" />
                <Stat n="A" l="Trust" />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: number | string; l: string }) {
  return (
    <div className="px-3 py-3">
      <div className="font-display text-xl">{n}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
    </div>
  );
}
