import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useJobs } from "@/lib/hooks";
import {
  fetchAllUsers,
  fetchCompanyShortlists,
  addToShortlist,
  removeFromShortlist,
  getOrCreateConversation,
  createMatch,
  fetchCompanyMatches,
  notifyMatchInvite,
} from "@/lib/db";
import type { Profile, Skill, Match } from "@/lib/db";
import { useRouter } from "@tanstack/react-router";
import { SkillTag } from "@/components/skill-tag";
import { MatchScore } from "@/components/match-score";

export const Route = createFileRoute("/company/talent")({
  component: TalentDiscovery,
});

const SKILL_FILTERS = [
  "React",
  "TypeScript",
  "Go",
  "Python",
  "Design Systems",
  "WebGL",
  "Accessibility",
  "Node.js",
  "Kubernetes",
  "Figma",
];

const AVAIL_OPTS = ["All", "Open to work", "Exploring", "Not available"];
const availMap: Record<string, string> = {
  "Open to work": "open",
  Exploring: "exploring",
  "Not available": "booked",
};

const availMeta: Record<string, { label: string; cls: string }> = {
  open: { label: "Open to work", cls: "bg-primary text-primary-foreground" },
  exploring: { label: "Exploring", cls: "bg-warm text-warm-foreground" },
  booked: { label: "Not available", cls: "bg-muted text-muted-foreground" },
};

// Profile as returned by fetchAllUsers may include joined skills
type ProfileWithSkills = Profile & { skills?: Skill[] };

function computeMatchScore(companySkills: string[], talentSkills: Skill[]): number {
  if (companySkills.length === 0 || talentSkills.length === 0) return 0;
  const talentSkillNames = talentSkills.map((s) => s.name.toLowerCase());
  const matched = companySkills.filter((cs) => talentSkillNames.includes(cs.toLowerCase())).length;
  return Math.round((matched / companySkills.length) * 100);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function TalentDiscovery() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [availFilter, setAvailFilter] = useState("All");
  const [activeSkills, setActiveSkills] = useState<string[]>([]);
  const [shortlist, setShortlist] = useState<Set<string>>(new Set());
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [messaging, setMessaging] = useState<string | null>(null);

  const [talentList, setTalentList] = useState<ProfileWithSkills[]>([]);
  const [talentLoading, setTalentLoading] = useState(false);

  const { jobs: allJobs } = useJobs();
  const companyJobs = allJobs.filter((j) => j.company_id === user?.id);
  const companyRequiredSkills = [...new Set(companyJobs.flatMap((j) => j.required_skills ?? []))];

  useEffect(() => {
    let cancelled = false;
    setTalentLoading(true);
    Promise.all([
      fetchAllUsers(),
      user?.id ? fetchCompanyShortlists(user.id) : Promise.resolve(new Set<string>()),
      user?.id ? fetchCompanyMatches(user.id) : Promise.resolve([] as Match[]),
    ])
      .then(([profiles, saved, existingMatches]) => {
        if (!cancelled) {
          setTalentList(profiles.filter((p) => p.account_type === "talent") as ProfileWithSkills[]);
          setShortlist(saved);
          setInvitedIds(new Set(existingMatches.map((m) => m.talent_id)));
        }
      })
      .catch(() => {
        if (!cancelled) setTalentList([]);
      })
      .finally(() => {
        if (!cancelled) setTalentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  function toggleSkill(s: string) {
    setActiveSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function startConversation(talentId: string) {
    if (!user?.id) return;
    setMessaging(talentId);
    try {
      const conv = await getOrCreateConversation(user.id, talentId);
      router.navigate({ to: "/company/inbox", search: { conv: conv.id } });
    } finally {
      setMessaging(null);
    }
  }

  async function toggleInvite(talentId: string) {
    if (!user?.id) return;
    await createMatch(user.id, talentId);
    setInvitedIds((prev) => new Set([...prev, talentId]));
    const companyName =
      (user as { company_name?: string; display_name?: string }).company_name ??
      (user as { display_name?: string }).display_name ??
      "A company";
    notifyMatchInvite(talentId, companyName).catch(() => {});
  }

  async function toggleShortlist(id: string) {
    if (!user?.id) return;
    const adding = !shortlist.has(id);
    setShortlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    try {
      if (adding) {
        await addToShortlist(user.id, id);
      } else {
        await removeFromShortlist(user.id, id);
      }
    } catch {
      // Revert optimistic update on failure
      setShortlist((prev) => {
        const next = new Set(prev);
        if (adding) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  }

  const list = talentList
    .filter((c) => {
      const nameMatch =
        (c.display_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
        (c.headline ?? "").toLowerCase().includes(query.toLowerCase());
      const availMatch = availFilter === "All" || c.availability === availMap[availFilter];
      const talentSkills = c.skills ?? [];
      const skillMatch =
        activeSkills.length === 0 ||
        activeSkills.some((s) => talentSkills.some((sk) => sk.name === s));
      return nameMatch && availMatch && skillMatch;
    })
    .map((c) => ({
      ...c,
      score: computeMatchScore(companyRequiredSkills, c.skills ?? []),
    }))
    .sort((a, b) => b.score - a.score);

  if (talentLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-muted-foreground animate-pulse">Loading talent…</div>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or headline…"
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AVAIL_OPTS.map((a) => (
            <button
              key={a}
              onClick={() => setAvailFilter(a)}
              className={
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                (availFilter === a
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground")
              }
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Skill filters */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SKILL_FILTERS.map((s) => {
          const active = activeSkills.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggleSkill(s)}
              className={
                "rounded-full border px-3 py-1 text-xs transition-all " +
                (active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40")
              }
            >
              {s}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {list.length} profile{list.length !== 1 ? "s" : ""} · ranked by match to your open roles
        </span>
        {shortlist.size > 0 && (
          <span className="font-medium text-foreground">{shortlist.size} on shortlist</span>
        )}
      </div>

      {/* Talent grid */}
      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="font-display text-xl text-muted-foreground">No profiles match</div>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => {
            const avail = availMeta[t.availability] ?? {
              label: t.availability,
              cls: "bg-muted text-muted-foreground",
            };
            const saved = shortlist.has(t.id);
            const talentSkills = t.skills ?? [];
            const displayName = t.display_name ?? "Unknown";
            const initials = getInitials(displayName);

            return (
              <article
                key={t.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-soft"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-lg leading-tight">{displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">{t.location}</div>
                    </div>
                  </div>
                  <MatchScore value={t.score} size="sm" />
                </div>

                {/* Headline */}
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                  {t.headline ?? ""}
                </p>

                {/* Top skills */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {talentSkills.slice(0, 4).map((s) => {
                    const isMatch = companyRequiredSkills.some(
                      (cs) => cs.toLowerCase() === s.name.toLowerCase(),
                    );
                    return <SkillTag key={s.name} skill={s} tone={isMatch ? "primary" : "muted"} />;
                  })}
                  {talentSkills.length > 4 && (
                    <span className="rounded-full border border-border bg-paper px-2 py-0.5 text-[11px] text-muted-foreground">
                      +{talentSkills.length - 4}
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${avail.cls}`}
                  >
                    {avail.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.completeness_pct ?? 0}% complete
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex gap-2 border-t border-border pt-4">
                  <Link
                    to="/talent/$talentId"
                    params={{ talentId: t.id }}
                    className="flex-1 rounded-md border border-border bg-card py-2 text-center text-xs font-medium hover:bg-accent transition-colors"
                  >
                    View profile
                  </Link>
                  <button
                    onClick={() => toggleShortlist(t.id)}
                    className={
                      "rounded-md py-2 px-3 text-xs font-medium transition-colors " +
                      (saved
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card hover:bg-accent")
                    }
                  >
                    {saved ? "Saved ✓" : "Shortlist"}
                  </button>
                  <button
                    onClick={() => toggleInvite(t.id)}
                    disabled={invitedIds.has(t.id)}
                    className={
                      "rounded-md py-2 px-3 text-xs font-medium transition-colors " +
                      (invitedIds.has(t.id)
                        ? "bg-green-100 text-green-800 cursor-default"
                        : "border border-border bg-card hover:bg-accent")
                    }
                  >
                    {invitedIds.has(t.id) ? "Invited ✓" : "Invite"}
                  </button>
                  <button
                    onClick={() => startConversation(t.id)}
                    disabled={messaging === t.id}
                    className="rounded-md border border-border bg-card px-3 py-2 text-xs hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {messaging === t.id ? "…" : "Message"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
