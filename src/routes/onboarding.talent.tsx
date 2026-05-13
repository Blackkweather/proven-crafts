// =============================================================================
// TALENT ONBOARDING WIZARD — src/routes/onboarding.talent.tsx
// =============================================================================
// 4-step onboarding wizard for new talent accounts. Runs immediately after
// signup (before the user can access /app). Collects the minimum information
// needed to build a useful profile and show relevant job matches.
//
// Step 1 — Role: Pick a primary role (e.g. "Frontend Dev") and seniority level
// Step 2 — Skills: Browse by category, select skills, rate each with proficiency
// Step 3 — Preferences: Work type, arrangement, location, salary range, availability
// Step 4 — Portfolio: Optional links — GitHub, LinkedIn, website, other
//
// On completion: saves data to Supabase via `upsertTalentOnboarding`, marks
// onboarding complete via `completeOnboarding`, refreshes the auth token, and
// navigates to /app.
//
// IMPORTANT: Uses `supabase.auth.getUser()` directly (not the auth context
// profile) to avoid a race condition where the profile hasn't loaded yet
// immediately after email/password signup.
//
// DATA FLOW:
//   - `upsertTalentOnboarding(userId, data)` — writes headline, location,
//     availability, and skills to the profiles/talent_skills tables
//   - `completeOnboarding(userId)` — flips the onboarding_complete flag
//   - `auth.refresh()` — re-fetches the session so the auth context sees
//     the updated profile before navigation to /app
// KEYWORDS: AUTH, DATABASE, STATE, VALIDATION, NAVIGATION
// =============================================================================

import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
// Direct Supabase client — needed to call getUser() and avoid auth context race condition.
import { supabase } from "@/integrations/supabase/client";
import { upsertTalentOnboarding, completeOnboarding } from "@/lib/db";
import {
  Briefcase,
  Sparkles,
  SlidersHorizontal,
  Link2,
  Code2,
  Server,
  Layers,
  Smartphone,
  PenTool,
  Map,
  BarChart2,
  Brain,
  Cloud,
  Megaphone,
  TrendingUp,
  MoreHorizontal,
  Layout,
  Database,
  Terminal,
  GitBranch,
  Check,
  ArrowRight,
  ChevronLeft,
  Github,
  Linkedin,
  Globe,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

// NAVIGATION: Route definition for "/onboarding/talent".
export const Route = createFileRoute("/onboarding/talent")({
  component: TalentOnboarding,
});

// ─── Step metadata ────────────────────────────────────────────────────────────
// Each step has an icon, a sidebar label, a content heading, and a motivational
// insight shown in the left panel. These drive the sidebar step list and headings.
const STEP_META = [
  {
    Icon: Briefcase,
    label: "Role",
    title: "Start with who you are",
    insight: "Profiles with a clear role title get 3× more views from matching companies.",
  },
  {
    Icon: Sparkles,
    label: "Skills",
    title: "Skills you've earned",
    insight: "Honest skill levels build trust. Companies filter by proficiency first.",
  },
  {
    Icon: SlidersHorizontal,
    label: "Preferences",
    title: "What you want matters",
    insight: "Setting preferences cuts mismatched conversations by more than half.",
  },
  {
    Icon: Link2,
    label: "Portfolio",
    title: "Show, don't tell",
    insight: "One real project link does more than five lines of a CV.",
  },
];

// Static platform stats shown in the left sidebar to build confidence.
const PLATFORM_STATS = [
  "4,200+ companies hiring",
  "18,000+ verified skills",
  "Avg. 8 days to first call",
];

// ─── Role data ────────────────────────────────────────────────────────────────
// The 12 primary role categories a user can choose from on Step 1.
const ROLES = [
  { label: "Frontend Dev", Icon: Layout },
  { label: "Backend Dev", Icon: Server },
  { label: "Full-stack", Icon: Layers },
  { label: "Mobile Dev", Icon: Smartphone },
  { label: "Designer", Icon: PenTool },
  { label: "Product Manager", Icon: Map },
  { label: "Data Scientist", Icon: BarChart2 },
  { label: "ML / AI Engineer", Icon: Brain },
  { label: "DevOps / Platform", Icon: Cloud },
  { label: "Marketing", Icon: Megaphone },
  { label: "Growth", Icon: TrendingUp },
  { label: "Other", Icon: MoreHorizontal },
];

// Seniority levels with year-range descriptions. Stored as the `v` value.
const SENIORITY = [
  { v: "junior", label: "Junior", desc: "0–2 yrs" },
  { v: "mid", label: "Mid-level", desc: "2–5 yrs" },
  { v: "senior", label: "Senior", desc: "5–8 yrs" },
  { v: "lead", label: "Lead", desc: "8–12 yrs" },
  { v: "principal", label: "Principal", desc: "12+ yrs" },
];

// ─── Skills data ──────────────────────────────────────────────────────────────
// Skills are organised into 7 categories. Each category has an icon and a list
// of skill names. The user browses by category and clicks skills to select them.
const SKILL_CATEGORIES: { label: string; Icon: React.ElementType; skills: string[] }[] = [
  {
    label: "Frontend",
    Icon: Layout,
    skills: ["React", "Vue", "Angular", "TypeScript", "Next.js", "Svelte", "Tailwind", "CSS"],
  },
  {
    label: "Backend",
    Icon: Server,
    skills: ["Node.js", "Python", "Go", "Rust", "Java", "PHP", "Ruby", ".NET", "Elixir"],
  },
  {
    label: "Mobile",
    Icon: Smartphone,
    skills: ["React Native", "Flutter", "Swift", "Kotlin", "Expo"],
  },
  {
    label: "Data & AI",
    Icon: Brain,
    skills: ["Python", "SQL", "TensorFlow", "PyTorch", "pandas", "LLMs", "scikit-learn", "dbt"],
  },
  {
    label: "DevOps",
    Icon: Cloud,
    skills: ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "CI/CD", "Linux"],
  },
  {
    label: "Design",
    Icon: PenTool,
    skills: ["Figma", "UI Design", "UX Research", "Prototyping", "Design Systems", "Framer"],
  },
  {
    label: "Product",
    Icon: BarChart2,
    skills: ["Strategy", "Roadmapping", "Agile", "Analytics", "A/B Testing"],
  },
];

// Proficiency levels used to rate each selected skill.
const PROFICIENCY = [
  { v: "foundational", label: "Learning" },
  { v: "proficient", label: "Proficient" },
  { v: "advanced", label: "Advanced" },
  { v: "expert", label: "Expert" },
];

// ─── Preference data ──────────────────────────────────────────────────────────
const WORK_TYPES = ["Full-time", "Contract", "Freelance", "Open to anything"];
const ARRANGEMENTS = ["Remote", "Hybrid", "Onsite", "Flexible"];
const SALARY_RANGES = [
  "< €30k",
  "€30–50k",
  "€50–70k",
  "€70–90k",
  "€90–120k",
  "€120–150k",
  "> €150k",
];
const AVAILABILITY_OPTS = [
  { v: "now", label: "Available now" },
  { v: "2weeks", label: "2 weeks notice" },
  { v: "1month", label: "1 month+" },
  { v: "passive", label: "Passively looking" },
];

// ─── Root component ───────────────────────────────────────────────────────────

function TalentOnboarding() {
  // AUTH: Used to access the display name and to call `refresh()` after saving.
  const auth = useAuth();
  const { profile } = auth;

  // NAVIGATION: Navigate to /app after onboarding completes.
  const router = useRouter();

  // STATE: Which step (1–4) we are on.
  const [step, setStep] = useState(1);

  // STATE: True while the final save operation is in progress.
  const [saving, setSaving] = useState(false);

  // STATE: Error message shown in the footer if the save fails.
  const [saveError, setSaveError] = useState<string | null>(null);

  // STATE — Step 1: role type and seniority level.
  const [role, setRole] = useState("");
  const [seniority, setSeniority] = useState("");

  // STATE — Step 2: currently visible skill category index + selected skills.
  // `skills` is a Record<skillName, proficiencyLevel> so we can rate each skill.
  const [activeCategory, setActiveCategory] = useState(0);
  const [skills, setSkills] = useState<Record<string, string>>({});

  // STATE — Step 3: work preferences.
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [arrangement, setArrangement] = useState("");
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [availability, setAvailability] = useState("");

  // STATE — Step 4: portfolio links (all optional).
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [website, setWebsite] = useState("");
  const [other, setOther] = useState("");

  // Toggle a skill on/off. If not selected, adds it with "proficient" as the default level.
  // If already selected, removes it from the map.
  function toggleSkill(name: string) {
    setSkills((prev) => {
      if (prev[name] !== undefined) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: "proficient" };
    });
  }

  // VALIDATION: Returns true only if the current step has the minimum required data.
  // Used to enable/disable the "Continue" button.
  function canContinue() {
    if (step === 1) return !!role && !!seniority;
    if (step === 2) return Object.keys(skills).length > 0;
    if (step === 3) return workTypes.length > 0 && !!arrangement && !!availability;
    return true; // Step 4 (portfolio links) is fully optional
  }

  // DATABASE + AUTH + NAVIGATION: Save all collected data to Supabase and navigate to /app.
  async function done() {
    setSaving(true);
    setSaveError(null);

    // AUTH: Use getUser() directly to avoid a race condition where the auth context
    // profile hasn't loaded yet (e.g. immediately after email/password signup).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      // AUTH: No session found — redirect to login.
      router.navigate({ to: "/login" });
      return;
    }

    try {
      // DATABASE: Write the talent profile data (headline, location, availability, skills).
      await upsertTalentOnboarding(user.id, {
        headline: `${seniority} ${role}`.trim(),
        location,
        availability: (availability as "open" | "exploring" | "booked") || "exploring",
        skills: Object.entries(skills).map(([name, level]) => ({
          name,
          level: level as "foundational" | "proficient" | "advanced" | "expert",
        })),
      });
      // DATABASE: Mark the user's onboarding as complete in the profiles table.
      await completeOnboarding(user.id);
      // AUTH: Refresh the auth session so the context picks up the updated profile.
      await auth.refresh();
      // NAVIGATION: Send the user to their talent dashboard.
      router.navigate({ to: "/app" });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const isLast = step === STEP_META.length;
  const meta = STEP_META[step - 1]; // Current step's metadata (icon, title, insight)

  return (
    <div className="flex min-h-dvh">
      {/* ── Left panel — sidebar with step list, insight, and platform stats ── */}
      <aside className="hidden lg:flex w-[340px] shrink-0 flex-col justify-between bg-foreground px-10 py-12 text-background sticky top-0 h-dvh overflow-hidden">
        {/* Logo — links back to the landing page */}
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-background/10 ring-1 ring-background/20">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="3" cy="3" r="2" fill="currentColor" />
              <circle cx="11" cy="3" r="2" fill="currentColor" />
              <circle cx="7" cy="11" r="2" fill="currentColor" />
            </svg>
          </span>
          <span className="font-display text-xl">Skill Network</span>
        </Link>

        {/* Step list — shows all 4 steps with done/active/future visual states */}
        <nav className="space-y-1">
          {STEP_META.map((s, i) => {
            const num = i + 1;
            const done = num < step;   // Steps before current are marked done
            const active = num === step; // Current step is highlighted
            return (
              <div key={num} className="flex gap-4">
                {/* Circle + connector line column */}
                <div className="flex flex-col items-center">
                  <div
                    className={
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-all duration-300 " +
                      (done
                        ? "bg-background text-foreground"       // Done: solid white circle
                        : active
                          ? "ring-2 ring-background text-background" // Active: ring highlight
                          : "ring-1 ring-background/20 text-background/30") // Future: dimmed
                    }
                  >
                    {done ? <Check size={13} strokeWidth={2.5} /> : num}
                  </div>
                  {/* Vertical connector line between step circles */}
                  {i < STEP_META.length - 1 && (
                    <div
                      className={
                        "my-1 w-px flex-1 min-h-[24px] transition-colors duration-500 " +
                        (done ? "bg-background/40" : "bg-background/10")
                      }
                    />
                  )}
                </div>

                {/* Step label + subtitle (only shown for the active step) */}
                <div className="pb-6">
                  <div
                    className={
                      "text-sm font-medium transition-colors duration-200 " +
                      (active
                        ? "text-background"
                        : done
                          ? "text-background/50"
                          : "text-background/25")
                    }
                  >
                    {s.label}
                  </div>
                  {active && (
                    <div className="mt-0.5 text-xs text-background/50 leading-relaxed">
                      {s.title}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Insight quote + platform stats at the bottom of the sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl bg-background/[0.06] p-4 ring-1 ring-background/10">
            <meta.Icon size={16} className="mb-2 text-background/50" />
            <p className="text-sm leading-relaxed text-background/70 italic">"{meta.insight}"</p>
          </div>
          <div className="space-y-2">
            {PLATFORM_STATS.map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs text-background/40">
                <span className="h-1 w-1 rounded-full bg-background/30" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Right panel — main content area ── */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar — only visible on small screens */}
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4 lg:hidden">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <circle cx="3" cy="3" r="2" fill="currentColor" />
                <circle cx="11" cy="3" r="2" fill="currentColor" />
                <circle cx="7" cy="11" r="2" fill="currentColor" />
              </svg>
            </span>
            <span className="font-display text-lg">Skill Network</span>
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            {step} / {STEP_META.length}
          </span>
        </div>

        {/* Progress bar — fills from left to right as steps are completed */}
        <div className="h-0.5 bg-border lg:block">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${(step / STEP_META.length) * 100}%` }}
          />
        </div>

        {/* Step content area — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-10 lg:px-16 lg:py-14">
          <div className="mx-auto max-w-lg">
            {/* Step heading — icon + step counter + title */}
            <div className="mb-10" key={`heading-${step}`}>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <meta.Icon size={13} />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  Step {step} of {STEP_META.length}
                </span>
              </div>
              <h1 className="font-display text-4xl leading-tight text-balance">{meta.title}</h1>
            </div>

            {/* Step body — each step renders its own sub-component */}
            <div key={step} className="animate-fade-up">
              {step === 1 && (
                <Step1Role
                  role={role}
                  setRole={setRole}
                  seniority={seniority}
                  setSeniority={setSeniority}
                />
              )}
              {step === 2 && (
                <Step2Skills
                  skills={skills}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  toggleSkill={toggleSkill}
                  setSkillLevel={(n, l) => setSkills((p) => ({ ...p, [n]: l }))}
                />
              )}
              {step === 3 && (
                <Step3Preferences
                  workTypes={workTypes}
                  setWorkTypes={setWorkTypes}
                  arrangement={arrangement}
                  setArrangement={setArrangement}
                  location={location}
                  setLocation={setLocation}
                  salary={salary}
                  setSalary={setSalary}
                  availability={availability}
                  setAvailability={setAvailability}
                />
              )}
              {step === 4 && (
                <Step4Portfolio
                  github={github}
                  setGithub={setGithub}
                  linkedin={linkedin}
                  setLinkedin={setLinkedin}
                  website={website}
                  setWebsite={setWebsite}
                  other={other}
                  setOther={setOther}
                  name={profile?.display_name ?? ""}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sticky bottom navigation bar — Back, Continue/Enter buttons */}
        <div className="sticky bottom-0 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-sm lg:px-16">
          {/* STATE: Save error shown above the nav buttons if the final save fails */}
          {saveError && (
            <p className="mx-auto mb-3 max-w-lg rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {saveError}
            </p>
          )}
          <div className="mx-auto flex max-w-lg items-center justify-between">
            {/* Back button — disabled on the first step */}
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1 || saving}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={15} />
              Back
            </button>

            <div className="flex flex-col items-center gap-1.5">
              {/* VALIDATION: Continue button — disabled until canContinue() returns true */}
              {!isLast ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canContinue()}
                  className="flex items-center gap-2 rounded-lg bg-primary px-7 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  Continue
                  <ArrowRight size={15} />
                </button>
              ) : (
                // DATABASE + NAVIGATION: Final "Enter the network" button on step 4
                <button
                  type="button"
                  onClick={done}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-7 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {saving ? "Saving…" : "Enter the network"}
                  {!saving && <ArrowRight size={15} />}
                </button>
              )}
              {/* Skip link — lets users skip optional steps (steps 2, 3, 4) */}
              {!isLast && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Role & Seniority ─────────────────────────────────────────────────
// Presents a grid of 12 role tiles and a row of seniority buttons.
// Both must be selected before the user can continue to step 2.
function Step1Role({
  role,
  setRole,
  seniority,
  setSeniority,
}: {
  role: string;
  setRole: (v: string) => void;
  seniority: string;
  setSeniority: (v: string) => void;
}) {
  return (
    <div className="space-y-10">
      {/* Role grid — 12 tiles, one per role category */}
      <div>
        <p className="mb-4 text-sm text-muted-foreground">Pick your primary role — be specific.</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {ROLES.map(({ label, Icon }) => {
            const active = role === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setRole(label)}
                className={
                  "group flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all duration-200 " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground shadow-elevated"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent hover:shadow-soft")
                }
              >
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  className={
                    active
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground transition-colors"
                  }
                />
                <span className="text-xs font-medium leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seniority level selector — pill buttons */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Seniority level
        </p>
        <div className="flex flex-wrap gap-2">
          {SENIORITY.map(({ v, label, desc }) => {
            const active = seniority === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setSeniority(v)}
                className={
                  "flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition-all duration-200 " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent")
                }
              >
                {active && <Check size={13} strokeWidth={2.5} />}
                <span className="font-medium">{label}</span>
                <span
                  className={
                    active ? "text-primary-foreground/60 text-xs" : "text-xs text-muted-foreground"
                  }
                >
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Skills ───────────────────────────────────────────────────────────
// Category tabs at the top, skill chips below. Selected skills appear in a
// proficiency rating panel. At least one skill must be selected to continue.
function Step2Skills({
  skills,
  activeCategory,
  setActiveCategory,
  toggleSkill,
  setSkillLevel,
}: {
  skills: Record<string, string>;
  activeCategory: number;
  setActiveCategory: (i: number) => void;
  toggleSkill: (n: string) => void;
  setSkillLevel: (n: string, l: string) => void;
}) {
  const selected = Object.entries(skills);
  const cat = SKILL_CATEGORIES[activeCategory]; // Currently visible category

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Select skills you actually use. Rate each one honestly — companies see this.
      </p>

      {/* Category tab pills — clicking a tab switches the skill list below */}
      <div className="flex flex-wrap gap-1.5">
        {SKILL_CATEGORIES.map((c, i) => {
          const active = i === activeCategory;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => setActiveCategory(i)}
              className={
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 " +
                (active
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground")
              }
            >
              <c.Icon size={11} />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Skill chips for the active category — toggled on/off by clicking */}
      <div className="flex flex-wrap gap-2">
        {cat.skills.map((skill) => {
          const isSelected = skills[skill] !== undefined;
          return (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 " +
                (isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40")
              }
            >
              {isSelected && <Check size={12} strokeWidth={2.5} />}
              {skill}
            </button>
          );
        })}
      </div>

      {/* Proficiency rating panel — only visible if at least one skill is selected */}
      {selected.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Rate proficiency — {selected.length} skill{selected.length > 1 ? "s" : ""}
          </p>
          <div className="space-y-2.5">
            {selected.map(([name, level]) => (
              <div key={name} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">{name}</span>
                {/* Proficiency buttons: Learning / Proficient / Advanced / Expert */}
                <div className="flex gap-1">
                  {PROFICIENCY.map((p) => (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => setSkillLevel(name, p.v)}
                      className={
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
                        (level === p.v
                          ? "bg-foreground text-background"  // Selected: solid
                          : "bg-accent text-muted-foreground hover:text-foreground") // Unselected
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Preferences ──────────────────────────────────────────────────────
// Work type (multi-select), arrangement (single), location text input,
// salary range (single), and availability (single). workTypes, arrangement,
// and availability are all required before continuing.
function Step3Preferences({
  workTypes,
  setWorkTypes,
  arrangement,
  setArrangement,
  location,
  setLocation,
  salary,
  setSalary,
  availability,
  setAvailability,
}: {
  workTypes: string[];
  setWorkTypes: (v: string[]) => void;
  arrangement: string;
  setArrangement: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  salary: string;
  setSalary: (v: string) => void;
  availability: string;
  setAvailability: (v: string) => void;
}) {
  // Generic toggle helper for multi-select arrays.
  function toggle(arr: string[], v: string, set: (a: string[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        This shapes which opportunities we surface for you — nothing is locked in.
      </p>

      {/* Work type — multi-select pill group */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Type of work
        </p>
        <div className="flex flex-wrap gap-2">
          {WORK_TYPES.map((t) => {
            const active = workTypes.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(workTypes, t, setWorkTypes)}
                className={
                  "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40")
                }
              >
                {active && <Check size={12} strokeWidth={2.5} />}
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Arrangement — single-select 4-column grid */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Work arrangement
        </p>
        <div className="grid grid-cols-4 gap-2">
          {ARRANGEMENTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setArrangement(a)}
              className={
                "rounded-xl border py-3 text-sm font-medium transition-all " +
                (arrangement === a
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent")
              }
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Location (text) + salary range (grid) — side by side on wider screens */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Location
            </p>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </label>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Salary range
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {SALARY_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSalary(r)}
                className={
                  "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all " +
                  (salary === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-accent")
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Availability — 4 options in a 2×2 grid */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Availability
        </p>
        <div className="grid grid-cols-2 gap-2">
          {AVAILABILITY_OPTS.map((a) => (
            <button
              key={a.v}
              type="button"
              onClick={() => setAvailability(a.v)}
              className={
                "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all " +
                (availability === a.v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent")
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Portfolio ────────────────────────────────────────────────────────
// Four optional link fields: GitHub, LinkedIn, portfolio website, and "other".
// Renders a confirmation message once any link is entered.
function Step4Portfolio({
  github,
  setGithub,
  linkedin,
  setLinkedin,
  website,
  setWebsite,
  other,
  setOther,
  name,
}: {
  github: string;
  setGithub: (v: string) => void;
  linkedin: string;
  setLinkedin: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  other: string;
  setOther: (v: string) => void;
  name: string; // The user's display name — used in the confirmation message
}) {
  // Each link field has a label, placeholder, current value, setter, and icon.
  const links = [
    {
      label: "GitHub",
      placeholder: "github.com/username",
      value: github,
      set: setGithub,
      Icon: Github,
    },
    {
      label: "LinkedIn",
      placeholder: "linkedin.com/in/yourname",
      value: linkedin,
      set: setLinkedin,
      Icon: Linkedin,
    },
    {
      label: "Portfolio / Website",
      placeholder: "yoursite.com",
      value: website,
      set: setWebsite,
      Icon: Globe,
    },
    {
      label: "Other",
      placeholder: "Dribbble, Behance, Substack…",
      value: other,
      set: setOther,
      Icon: ExternalLink,
    },
  ];

  // STATE: True if any link has been filled in — triggers the confirmation message.
  const hasAny = github || linkedin || website || other;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        All optional — add whatever's relevant. Quality beats quantity.
      </p>

      <div className="space-y-4">
        {links.map(({ label, placeholder, value, set, Icon }) => (
          // Each field is a styled label wrapper with an icon on the left.
          <label
            key={label}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 has-[:focus]:border-primary has-[:focus]:ring-2 has-[:focus]:ring-primary/20 transition-colors cursor-text"
          >
            <Icon size={16} className="shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                {label}
              </span>
              <input
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </label>
        ))}
      </div>

      {/* STATE: Confirmation message shown once at least one link is entered */}
      {hasAny && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            {/* Greet the user by first name if we have their name */}
            <span className="font-medium">{name ? `Great, ${name.split(" ")[0]}.` : "Great."}</span>{" "}
            Your profile is ready. You can refine everything from your dashboard anytime.
          </p>
        </div>
      )}
    </div>
  );
}
