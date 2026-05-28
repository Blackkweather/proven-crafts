// =============================================================================
// COMPANY ONBOARDING WIZARD — src/routes/onboarding.company.tsx
// =============================================================================
// 5-step onboarding wizard for new company accounts. Runs immediately after
// signup (before the user can access /company). Collects the minimum information
// needed to build a company profile and start hiring on the platform.
//
// Step 1 — Company: Name, industry, team size, HQ location, website
// Step 2 — Goals: Engagement types (full-time / contract / freelance / challenges)
//           + an optional "what are you building?" description
// Step 3 — Stack: Tech skill requirements using a 3-state cycle per skill:
//           unselected → must-have (⭐) → nice-to-have (✓) → unselected
// Step 4 — Budget: Salary bands (per seniority), project budgets, challenge prizes
//           Only shows the relevant section based on engagement types from Step 2
// Step 5 — Culture: Interview rounds, decision timeline, remote policy, and
//           up to 3 priorities. Ends with a readiness confirmation message.
//
// On completion: saves data via `upsertCompanyOnboarding`, marks onboarding
// complete via `completeOnboarding`, refreshes the auth token, and navigates
// to /company.
//
// IMPORTANT: Uses `supabase.auth.getUser()` directly (not the auth context
// profile) to avoid a race condition where the profile hasn't loaded yet
// immediately after email/password signup.
//
// DATA FLOW:
//   - `upsertCompanyOnboarding(userId, data)` — writes company profile fields
//   - `completeOnboarding(userId)` — flips the onboarding_complete flag
//   - `auth.refresh()` — updates the auth context before navigation
// KEYWORDS: AUTH, DATABASE, STATE, VALIDATION, NAVIGATION
// =============================================================================

import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { upsertCompanyOnboarding, completeOnboarding, recordReferral } from "@/lib/db";
// Direct Supabase client — needed to call getUser() and avoid auth context race condition.
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Target,
  Cpu,
  Coins,
  Users2,
  UserCheck,
  FileText,
  Zap,
  Trophy,
  Layout,
  Server,
  Smartphone,
  Brain,
  Cloud,
  PenTool,
  BarChart2,
  Check,
  ArrowRight,
  ChevronLeft,
  Globe,
  MapPin,
  Star,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePlatformStats } from "@/lib/hooks";

// NAVIGATION: Route definition for "/onboarding/company".
export const Route = createFileRoute("/onboarding/company")({
  component: CompanyOnboarding,
});

// ─── Step metadata ────────────────────────────────────────────────────────────
// Each step has an icon, a sidebar label, a content heading, and a motivational
// insight shown in the left panel. These drive the sidebar step list and headings.
const STEP_META = [
  {
    Icon: Building2,
    label: "Company",
    title: "Your first impression",
    insight: "Companies with complete profiles attract 4× more qualified applicants.",
  },
  {
    Icon: Target,
    label: "Goals",
    title: "What are you building?",
    insight: "The platform works best when you're honest about what you're actually looking for.",
  },
  {
    Icon: Cpu,
    label: "Stack",
    title: "Your tech & skill needs",
    insight: "Skill-matched candidates convert to hires 8× more than cold applications.",
  },
  {
    Icon: Coins,
    label: "Budget",
    title: "Set honest expectations",
    insight: "Salary transparency reduces average hiring time by 3 weeks.",
  },
  {
    Icon: Users2,
    label: "Culture",
    title: "How you hire",
    insight: "Companies with a defined process attract 2× more senior applicants.",
  },
];


// ─── Company data ─────────────────────────────────────────────────────────────
// Industry options shown as a grid on Step 1.
const INDUSTRIES = [
  "Software / SaaS",
  "Fintech",
  "Healthtech",
  "E-commerce",
  "AI / ML",
  "Gaming",
  "Media & Content",
  "Agency",
  "Consulting",
  "Hardware",
  "Crypto / Web3",
  "Education",
  "Other",
];

// Team size options with a descriptive stage label (e.g. "Seed", "Series A").
const COMPANY_SIZES = [
  { v: "1-10", label: "1–10", desc: "Seed" },
  { v: "11-50", label: "11–50", desc: "Series A" },
  { v: "51-200", label: "51–200", desc: "Growth" },
  { v: "201-500", label: "201–500", desc: "Scale-up" },
  { v: "500+", label: "500+", desc: "Enterprise" },
];

// The four types of talent engagement a company can use on the platform.
const ENGAGEMENT_TYPES = [
  {
    v: "fulltime",
    Icon: UserCheck,
    title: "Full-time hires",
    desc: "Permanent roles with salary and benefits",
  },
  {
    v: "contract",
    Icon: FileText,
    title: "Contract / Part-time",
    desc: "Fixed-term or ongoing part-time roles",
  },
  {
    v: "freelance",
    Icon: Zap,
    title: "Freelance projects",
    desc: "Hire talent for specific deliverables",
  },
  {
    v: "challenges",
    Icon: Trophy,
    title: "Skill challenges",
    desc: "Run open competitions to find top talent",
  },
];

// ─── Skill data ───────────────────────────────────────────────────────────────
// Same category structure as the talent onboarding. Companies mark skills as
// "must-have" or "nice-to-have" using the cycleSkill pattern.
const SKILL_CATEGORIES: { label: string; Icon: React.ElementType; skills: string[] }[] = [
  {
    label: "Frontend",
    Icon: Layout,
    skills: ["React", "Vue", "Angular", "TypeScript", "Next.js", "Svelte", "Tailwind"],
  },
  {
    label: "Backend",
    Icon: Server,
    skills: ["Node.js", "Python", "Go", "Rust", "Java", "PHP", "Ruby", ".NET"],
  },
  { label: "Mobile", Icon: Smartphone, skills: ["React Native", "Flutter", "Swift", "Kotlin"] },
  {
    label: "Data & AI",
    Icon: Brain,
    skills: ["Python", "SQL", "TensorFlow", "PyTorch", "pandas", "LLMs", "scikit-learn"],
  },
  {
    label: "DevOps",
    Icon: Cloud,
    skills: ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform"],
  },
  {
    label: "Design",
    Icon: PenTool,
    skills: ["Figma", "UI Design", "UX Research", "Design Systems", "Framer"],
  },
  {
    label: "Product",
    Icon: BarChart2,
    skills: ["Strategy", "Roadmapping", "Agile", "Analytics", "A/B Testing"],
  },
];

// ─── Budget data ──────────────────────────────────────────────────────────────
// Salary band options grouped by seniority level. Only shown if the company
// selected full-time or contract engagement types in Step 2.
const SALARY_BANDS = [
  { role: "Junior", ranges: ["< €30k", "€30–50k", "€50–60k"] },
  { role: "Mid-level", ranges: ["€50–70k", "€70–90k", "€90–110k"] },
  { role: "Senior", ranges: ["€90–120k", "€120–150k", "> €150k"] },
];

// Budget ranges for freelance projects. Only shown if freelance was selected.
const PROJECT_BUDGETS = ["< €1k", "€1–5k", "€5–15k", "€15–30k", "€30–60k", "> €60k", "Varies"];

// Prize options for skill challenges. Only shown if challenges was selected.
const CHALLENGE_PRIZES = ["No prize", "€100–500", "€500–1k", "€1–5k", "> €5k", "Job offer", "Mix"];

// ─── Culture data ─────────────────────────────────────────────────────────────
const INTERVIEW_ROUNDS = ["1 round", "2–3 rounds", "4+ rounds", "Async / challenge-based"];
const DECISION_TIMELINES = ["Within a week", "2–4 weeks", "1–2 months", "Flexible"];

// Up to 3 of these can be selected as the company's top hiring priorities.
const PRIORITIES = [
  "Portfolio & past work",
  "Skills match",
  "Cultural fit",
  "Domain knowledge",
  "Speed to hire",
  "Diversity & inclusion",
];

// ─── Root component ───────────────────────────────────────────────────────────

function CompanyOnboarding() {
  const { stats } = usePlatformStats();
  // AUTH: Used to access the company's display name and to call `refresh()` after saving.
  const auth = useAuth();
  const { profile } = auth;

  // NAVIGATION: Navigate to /company after onboarding completes.
  const router = useRouter();

  // STATE: Which step (1–5) we are on.
  const [step, setStep] = useState(1);

  // STATE: True while the final save operation is in progress.
  const [saving, setSaving] = useState(false);

  // STATE: Error message shown in the footer if the save fails.
  const [saveError, setSaveError] = useState<string | null>(null);

  // STATE — Step 1: Company identity fields.
  const [companyName, setCompanyName] = useState(profile?.display_name ?? "");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [hqLocation, setHqLocation] = useState("");
  const [website, setWebsite] = useState("");

  // STATE — Step 2: Engagement types and optional "what you're building" description.
  const [engagementTypes, setEngagementTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  // STATE — Step 3: Required and nice-to-have skills.
  // mustHave = skills that are absolutely required for the role.
  // niceToHave = skills that are preferred but not blockers.
  const [mustHave, setMustHave] = useState<string[]>([]);
  const [niceToHave, setNiceToHave] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);

  // STATE — Step 4: Budget preferences.
  // salaryBands: { "Junior": "€50–60k", "Senior": "> €150k", ... }
  const [salaryBands, setSalaryBands] = useState<Record<string, string>>({});
  const [projectBudget, setProjectBudget] = useState("");
  const [challengePrize, setChallengePrize] = useState("");

  // STATE — Step 5: Culture and process preferences.
  const [interviewRounds, setInterviewRounds] = useState("");
  const [timeline, setTimeline] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [remoteFriendly, setRemoteFriendly] = useState("");

  // VALIDATION: Returns true only if the current step has the minimum required data.
  // Used to enable/disable the "Continue" button.
  function canContinue() {
    if (step === 1) return !!companyName && !!industry && !!size; // Name + industry + size required
    if (step === 2) return engagementTypes.length > 0;           // At least one engagement type
    if (step === 3) return mustHave.length > 0;                  // At least one must-have skill
    return true; // Steps 4 and 5 are fully optional
  }

  // DATABASE + AUTH + NAVIGATION: Save all collected data to Supabase and navigate to /company.
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
      // DATABASE: Write the company profile data to Supabase.
      // company_initials is auto-generated from the first letters of each word in companyName.
      await upsertCompanyOnboarding(user.id, {
        company_name: companyName,
        company_initials: companyName
          .split(" ")
          .filter(Boolean)
          .map((w) => w[0].toUpperCase())
          .slice(0, 2)
          .join(""),
        company_industry: industry,
        company_size: size,
        company_about: description,
        location: hqLocation,
      });
      // DATABASE: Mark onboarding as complete.
      await completeOnboarding(user.id);
      // Track referral if the user came via an invite link
      const refCode = localStorage.getItem("referral_code");
      if (refCode) { recordReferral(refCode, user.id).catch(() => {}); localStorage.removeItem("referral_code"); }
      // AUTH: Refresh the auth session so the context picks up the updated profile.
      await auth.refresh();
      // NAVIGATION: Send the user to their company dashboard.
      router.navigate({ to: "/company" });
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

        {/* Step list — shows all 5 steps with done/active/future visual states */}
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
                        ? "bg-background text-foreground"
                        : active
                          ? "ring-2 ring-background text-background"
                          : "ring-1 ring-background/20 text-background/30")
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

        {/* Insight quote + platform stats */}
        <div className="space-y-6">
          <div className="rounded-xl bg-background/[0.06] p-4 ring-1 ring-background/10">
            <meta.Icon size={16} className="mb-2 text-background/50" />
            <p className="text-sm leading-relaxed text-background/70 italic">"{meta.insight}"</p>
          </div>
          <div className="space-y-2">
            {stats && [
              `${stats.talentCount.toLocaleString()}+ verified developers`,
              `${stats.openJobsCount}+ active roles`,
              `${stats.openChallengesCount}+ active challenges`,
            ].map((s) => (
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

        {/* Progress bar */}
        <div className="h-0.5 bg-border">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${(step / STEP_META.length) * 100}%` }}
          />
        </div>

        {/* Step content area — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-10 lg:px-16 lg:py-14">
          <div className="mx-auto max-w-lg">
            {/* Step heading */}
            <div className="mb-10">
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
                <Step1Basics
                  companyName={companyName}
                  setCompanyName={setCompanyName}
                  industry={industry}
                  setIndustry={setIndustry}
                  size={size}
                  setSize={setSize}
                  hqLocation={hqLocation}
                  setHqLocation={setHqLocation}
                  website={website}
                  setWebsite={setWebsite}
                />
              )}
              {step === 2 && (
                <Step2Goals
                  engagementTypes={engagementTypes}
                  setEngagementTypes={setEngagementTypes}
                  description={description}
                  setDescription={setDescription}
                />
              )}
              {step === 3 && (
                <Step3Stack
                  mustHave={mustHave}
                  setMustHave={setMustHave}
                  niceToHave={niceToHave}
                  setNiceToHave={setNiceToHave}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                />
              )}
              {step === 4 && (
                <Step4Budget
                  engagementTypes={engagementTypes}
                  salaryBands={salaryBands}
                  setSalaryBands={setSalaryBands}
                  projectBudget={projectBudget}
                  setProjectBudget={setProjectBudget}
                  challengePrize={challengePrize}
                  setChallengePrize={setChallengePrize}
                />
              )}
              {step === 5 && (
                <Step5Culture
                  interviewRounds={interviewRounds}
                  setInterviewRounds={setInterviewRounds}
                  timeline={timeline}
                  setTimeline={setTimeline}
                  priorities={priorities}
                  setPriorities={setPriorities}
                  remoteFriendly={remoteFriendly}
                  setRemoteFriendly={setRemoteFriendly}
                  companyName={companyName}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sticky bottom navigation bar */}
        <div className="sticky bottom-0 border-t border-border bg-background/95 px-6 py-4 backdrop-blur-sm lg:px-16">
          {/* STATE: Save error shown above the nav buttons */}
          {saveError && (
            <p className="mx-auto mb-3 max-w-lg rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {saveError}
            </p>
          )}
          <div className="mx-auto flex max-w-lg items-center justify-between">
            {/* Back button — disabled on step 1 */}
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1 || saving}
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:pointer-events-none disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={15} />
              Back
            </button>
            <div className="flex flex-col items-center gap-1.5">
              {/* VALIDATION: Continue — disabled until canContinue() returns true */}
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
                // DATABASE + NAVIGATION: Final "Start hiring" button on step 5
                <button
                  type="button"
                  onClick={done}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-primary px-7 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {saving ? "Saving…" : "Start hiring"}
                  {!saving && <ArrowRight size={15} />}
                </button>
              )}
              {/* Skip link for optional steps */}
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

// ─── Step 1: Company basics ───────────────────────────────────────────────────
// Collects company name (required), industry (required), team size (required),
// HQ location (optional), and website (optional).
function Step1Basics({
  companyName,
  setCompanyName,
  industry,
  setIndustry,
  size,
  setSize,
  hqLocation,
  setHqLocation,
  website,
  setWebsite,
}: {
  companyName: string;
  setCompanyName: (v: string) => void;
  industry: string;
  setIndustry: (v: string) => void;
  size: string;
  setSize: (v: string) => void;
  hqLocation: string;
  setHqLocation: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
}) {
  // Shared CSS class for plain text inputs in this step.
  const inputCls =
    "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        This is what talent sees when they find your open roles and challenges.
      </p>

      <div className="space-y-4">
        {/* Company name text input */}
        <label className="block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Company name
          </p>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Inc."
            className={inputCls}
          />
        </label>

        {/* Industry — 2–3 column grid of toggle buttons */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Industry
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => setIndustry(ind)}
                className={
                  "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all " +
                  (industry === ind
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent")
                }
              >
                {industry === ind && <Check size={12} strokeWidth={2.5} className="mb-1" />}
                {ind}
              </button>
            ))}
          </div>
        </div>

        {/* Team size — 5-column grid with stage labels */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Team size
          </p>
          <div className="grid grid-cols-5 gap-2">
            {COMPANY_SIZES.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => setSize(s.v)}
                className={
                  "rounded-xl border py-3 text-center transition-all " +
                  (size === s.v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent")
                }
              >
                <div className="text-sm font-bold">{s.label}</div>
                <div
                  className={
                    "text-[10px] " +
                    (size === s.v ? "text-primary-foreground/60" : "text-muted-foreground")
                  }
                >
                  {s.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* HQ location + website — side by side with icon prefix */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 py-2.5 has-[:focus]:border-primary has-[:focus]:ring-2 has-[:focus]:ring-primary/20 transition-colors cursor-text">
            <MapPin size={15} className="shrink-0 text-muted-foreground" />
            <input
              value={hqLocation}
              onChange={(e) => setHqLocation(e.target.value)}
              placeholder="HQ location"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </label>
          <label className="flex items-center gap-2.5 rounded-lg border border-input bg-card px-3.5 py-2.5 has-[:focus]:border-primary has-[:focus]:ring-2 has-[:focus]:ring-primary/20 transition-colors cursor-text">
            <Globe size={15} className="shrink-0 text-muted-foreground" />
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="yourcompany.com"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Goals / Engagement types ────────────────────────────────────────
// Multi-select card grid for the 4 engagement types + an optional text description.
// At least one engagement type is required to continue to step 3.
function Step2Goals({
  engagementTypes,
  setEngagementTypes,
  description,
  setDescription,
}: {
  engagementTypes: string[];
  setEngagementTypes: (v: string[]) => void;
  description: string;
  setDescription: (v: string) => void;
}) {
  // Toggle an engagement type on/off.
  function toggle(v: string) {
    setEngagementTypes(
      engagementTypes.includes(v)
        ? engagementTypes.filter((x) => x !== v)
        : [...engagementTypes, v],
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Select everything that applies. You can run multiple hiring modes in parallel.
      </p>

      {/* 2-column card grid for engagement types */}
      <div className="grid gap-3 sm:grid-cols-2">
        {ENGAGEMENT_TYPES.map(({ v, Icon, title, desc }) => {
          const active = engagementTypes.includes(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className={
                "group relative rounded-2xl border p-5 text-left transition-all duration-200 " +
                (active
                  ? "border-primary bg-primary text-primary-foreground shadow-elevated"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:shadow-soft")
              }
            >
              {/* Checkmark badge in top-right when active */}
              {active && (
                <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Check size={11} strokeWidth={2.5} />
                </span>
              )}
              <Icon
                size={22}
                strokeWidth={1.5}
                className={
                  "mb-3 transition-colors " +
                  (active
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-primary")
                }
              />
              <div className="text-sm font-semibold">{title}</div>
              <div
                className={
                  "mt-0.5 text-xs " +
                  (active ? "text-primary-foreground/70" : "text-muted-foreground")
                }
              >
                {desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Optional "what are you building" textarea */}
      <label className="block">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          What are you building?{" "}
          <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe your product, mission, or the kind of talent you're looking for…"
          className="w-full rounded-lg border border-input bg-card px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition-colors"
        />
      </label>
    </div>
  );
}

// ─── Step 3: Tech stack ───────────────────────────────────────────────────────
// Three-state skill cycling: unselected → must-have (⭐) → nice-to-have (✓) → unselected.
// At least one must-have skill is required to continue.
function Step3Stack({
  mustHave,
  setMustHave,
  niceToHave,
  setNiceToHave,
  activeCategory,
  setActiveCategory,
}: {
  mustHave: string[];
  setMustHave: (v: string[]) => void;
  niceToHave: string[];
  setNiceToHave: (v: string[]) => void;
  activeCategory: number;
  setActiveCategory: (i: number) => void;
}) {
  // Three-state cycle: unselected → must-have → nice-to-have → unselected.
  function cycleSkill(skill: string) {
    if (mustHave.includes(skill)) {
      // Transition: must-have → nice-to-have
      setMustHave(mustHave.filter((x) => x !== skill));
      setNiceToHave([...niceToHave, skill]);
    } else if (niceToHave.includes(skill)) {
      // Transition: nice-to-have → unselected (remove entirely)
      setNiceToHave(niceToHave.filter((x) => x !== skill));
    } else {
      // Transition: unselected → must-have
      setMustHave([...mustHave, skill]);
    }
  }

  // Returns the current state of a skill.
  function state(skill: string): "must" | "nice" | null {
    if (mustHave.includes(skill)) return "must";
    if (niceToHave.includes(skill)) return "nice";
    return null;
  }

  const cat = SKILL_CATEGORIES[activeCategory];
  const total = mustHave.length + niceToHave.length;

  return (
    <div className="space-y-6">
      {/* Legend explaining the 3-state cycling behaviour */}
      <div>
        <p className="text-sm text-muted-foreground">
          Click once for <strong>must-have</strong>, twice for <strong>nice-to-have</strong>, three
          times to remove.
        </p>
        <div className="mt-3 flex gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Must-have
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm border border-primary/50 bg-primary/10" />{" "}
            Nice-to-have
          </span>
        </div>
      </div>

      {/* Category tab pills */}
      <div className="flex flex-wrap gap-1.5">
        {SKILL_CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setActiveCategory(i)}
            className={
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 " +
              (i === activeCategory
                ? "bg-foreground text-background"
                : "border border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground")
            }
          >
            <c.Icon size={11} />
            {c.label}
          </button>
        ))}
      </div>

      {/* Skill chips for the active category */}
      <div className="flex flex-wrap gap-2">
        {cat.skills.map((skill) => {
          const s = state(skill);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => cycleSkill(skill)}
              className={
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 " +
                (s === "must"
                  ? "border-primary bg-primary text-primary-foreground"
                  : s === "nice"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/40")
              }
            >
              {s === "must" && <Star size={11} strokeWidth={2.5} />}
              {s === "nice" && <Check size={11} strokeWidth={2.5} />}
              {skill}
            </button>
          );
        })}
      </div>

      {/* Summary panel showing all selected must-have + nice-to-have skills */}
      {total > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Selected ({total})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mustHave.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
              >
                <Star size={9} strokeWidth={2.5} />
                {s}
              </span>
            ))}
            {niceToHave.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                <Check size={9} strokeWidth={2.5} />
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Budget ───────────────────────────────────────────────────────────
// Shows salary band selectors only if "fulltime" or "contract" engagement type was selected.
// Shows project budget selectors only if "freelance" was selected.
// Shows challenge prize selectors only if "challenges" was selected.
// All sections are optional — the user can skip this step entirely.
function Step4Budget({
  engagementTypes,
  salaryBands,
  setSalaryBands,
  projectBudget,
  setProjectBudget,
  challengePrize,
  setChallengePrize,
}: {
  engagementTypes: string[];
  salaryBands: Record<string, string>;
  setSalaryBands: (v: Record<string, string>) => void;
  projectBudget: string;
  setProjectBudget: (v: string) => void;
  challengePrize: string;
  setChallengePrize: (v: string) => void;
}) {
  // Determine which budget sections to show based on engagement types from Step 2.
  const wantsHiring = engagementTypes.includes("fulltime") || engagementTypes.includes("contract");
  const wantsFreelance = engagementTypes.includes("freelance");
  const wantsChallenges = engagementTypes.includes("challenges");

  // Reusable chip CSS class.
  function chipCls(active: boolean) {
    return (
      "rounded-lg border px-3 py-2 text-sm font-medium transition-all " +
      (active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:bg-accent")
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Honest ranges attract better candidates and cut time-to-hire significantly.
      </p>

      {/* Salary bands — only shown for full-time / contract hiring */}
      {wantsHiring && (
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Salary bands
          </p>
          <div className="space-y-4">
            {SALARY_BANDS.map((band) => (
              <div key={band.role} className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2.5 text-sm font-semibold">{band.role}</p>
                <div className="flex flex-wrap gap-1.5">
                  {band.ranges.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        setSalaryBands({
                          ...salaryBands,
                          [band.role]: salaryBands[band.role] === r ? "" : r,
                        })
                      }
                      className={chipCls(salaryBands[band.role] === r)}
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSalaryBands({ ...salaryBands, [band.role]: "Not this level" })
                    }
                    className={chipCls(salaryBands[band.role] === "Not this level")}
                  >
                    Not this level
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project budget — only shown for freelance hiring */}
      {wantsFreelance && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Typical project budget
          </p>
          <div className="flex flex-wrap gap-2">
            {PROJECT_BUDGETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setProjectBudget(b)}
                className={chipCls(projectBudget === b)}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Challenge prize — only shown for skill challenge hiring */}
      {wantsChallenges && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Challenge prize
          </p>
          <div className="flex flex-wrap gap-2">
            {CHALLENGE_PRIZES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setChallengePrize(p)}
                className={chipCls(challengePrize === p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Culture ──────────────────────────────────────────────────────────
// Collects interview rounds, decision timeline, remote policy, and up to 3
// hiring priorities. Ends with a readiness confirmation message.
function Step5Culture({
  interviewRounds,
  setInterviewRounds,
  timeline,
  setTimeline,
  priorities,
  setPriorities,
  remoteFriendly,
  setRemoteFriendly,
  companyName,
}: {
  interviewRounds: string;
  setInterviewRounds: (v: string) => void;
  timeline: string;
  setTimeline: (v: string) => void;
  priorities: string[];
  setPriorities: (v: string[]) => void;
  remoteFriendly: string;
  setRemoteFriendly: (v: string) => void;
  companyName: string; // Used in the readiness confirmation message
}) {
  // Toggle a priority on/off — max 3 can be selected at once.
  function togglePriority(p: string) {
    setPriorities(
      priorities.includes(p)
        ? priorities.filter((x) => x !== p)
        : priorities.length < 3
          ? [...priorities, p]
          : priorities, // Silently ignore if already at 3
    );
  }

  // Reusable chip CSS class.
  function chipCls(active: boolean) {
    return (
      "rounded-lg border px-3.5 py-2 text-sm font-medium transition-all " +
      (active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent")
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Transparency in how you hire builds trust before the first conversation.
      </p>

      {/* Interview rounds — single select */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Interview rounds
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERVIEW_ROUNDS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setInterviewRounds(r)}
              className={chipCls(interviewRounds === r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Decision timeline — single select */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Decision timeline
        </p>
        <div className="flex flex-wrap gap-2">
          {DECISION_TIMELINES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeline(t)}
              className={chipCls(timeline === t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Remote policy — single select */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Remote policy
        </p>
        <div className="flex gap-2">
          {["Fully remote", "Hybrid", "Office-first"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setRemoteFriendly(opt)}
              className={chipCls(remoteFriendly === opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Hiring priorities — multi-select, max 3 */}
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          What matters most?{" "}
          <span className="normal-case font-normal text-muted-foreground/60">(pick up to 3)</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePriority(p)}
              // STATE: Disabled if 3 are already selected and this one isn't one of them.
              disabled={!priorities.includes(p) && priorities.length >= 3}
              className={
                "flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all disabled:opacity-40 " +
                (priorities.includes(p)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent")
              }
            >
              {priorities.includes(p) && <Check size={12} strokeWidth={2.5} />}
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Readiness confirmation message */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <p className="text-sm font-medium text-foreground">
          {companyName ? `${companyName} is` : "Your company is"} ready to source talent — through
          challenges, direct hires, and freelance projects.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Post your first role or challenge from the dashboard.
        </p>
      </div>
    </div>
  );
}
