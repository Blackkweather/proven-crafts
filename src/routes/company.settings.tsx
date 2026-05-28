// =============================================================================
// COMPANY SETTINGS — src/routes/company.settings.tsx
// =============================================================================
// Post-onboarding company profile editor. Three tabs:
//   Profile  — name, industry, size, location, about
//   Pipeline — custom hiring stage configuration
//   Billing  — redirect to /company/billing
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks";
import { updateProfile } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, Check } from "lucide-react";

export const Route = createFileRoute("/company/settings")({
  component: CompanySettingsPage,
});

const TABS = ["Profile", "Pipeline", "Billing"] as const;
type Tab = (typeof TABS)[number];

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

const INDUSTRIES = [
  "Software / SaaS", "Fintech", "Healthtech", "E-commerce", "AI / ML",
  "Gaming", "Media & Content", "Agency", "Consulting", "Hardware",
  "Crypto / Web3", "Education", "Other",
];
const COMPANY_SIZES = [
  { v: "1-10", label: "1–10" }, { v: "11-50", label: "11–50" },
  { v: "51-200", label: "51–200" }, { v: "201-500", label: "201–500" },
  { v: "500+", label: "500+" },
];

function CompanySettingsPage() {
  const [tab, setTab] = useState<Tab>("Profile");

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl">Settings</h1>

      <div className="mt-6 flex w-fit gap-1 rounded-lg border border-border bg-paper p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-md px-4 py-2 text-sm transition-colors " +
              (tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "Profile" && <ProfileTab />}
        {tab === "Pipeline" && <PipelineTab />}
        {tab === "Billing" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Manage your subscription, invoices, and payment method.</p>
            <Link to="/company/billing" search={{ success: false }} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Go to Billing →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, refresh } = useAuth();
  const { profile, loading } = useProfile(user?.id);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState("");
  const [location, setLocation] = useState("");
  const [about, setAbout] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.company_name ?? profile.display_name ?? "");
    setIndustry(profile.company_industry ?? "");
    setSize(profile.company_size ?? "");
    setLocation(profile.location ?? "");
    setAbout(profile.company_about ?? "");
  }, [profile]);

  async function save() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, {
        company_name: name,
        company_initials: name.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join(""),
        company_industry: industry,
        company_size: size,
        location,
        company_about: about,
      });
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
          Company name
        </label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." className={inputCls} />
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">Industry</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => setIndustry(ind)}
              className={
                "rounded-xl border px-3 py-2 text-left text-sm font-medium transition-all " +
                (industry === ind ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40 hover:bg-accent")
              }
            >
              {industry === ind && <Check size={11} strokeWidth={2.5} className="mb-1" />}
              {ind}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">Team size</div>
        <div className="flex flex-wrap gap-2">
          {COMPANY_SIZES.map((s) => (
            <button
              key={s.v}
              type="button"
              onClick={() => setSize(s.v)}
              className={
                "rounded-lg border px-4 py-2 text-sm font-medium transition-all " +
                (size === s.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
          HQ Location
        </label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Amsterdam, Netherlands" className={inputCls} />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
          About
        </label>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={4}
          placeholder="What does your company build? What's the mission?"
          className={inputCls + " resize-none"}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────
interface Stage {
  id?: string;
  step_order: number;
  label: string;
  description: string;
  duration: string;
  paid: boolean;
}

function PipelineTab() {
  const { user } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("company_hiring_steps")
      .select("*")
      .eq("company_id", user.id)
      .order("step_order")
      .then(({ data }) => {
        if (data && data.length > 0) setStages(data as Stage[]);
        else setStages(defaultStages());
        setLoading(false);
      });
  }, [user?.id]);

  function defaultStages(): Stage[] {
    return [
      { step_order: 1, label: "Application review", description: "We review your profile and portfolio", duration: "3–5 days", paid: false },
      { step_order: 2, label: "Skill challenge", description: "Complete a short async challenge", duration: "1–2 weeks", paid: false },
      { step_order: 3, label: "Interview", description: "30-min video call with the hiring team", duration: "1 week", paid: false },
      { step_order: 4, label: "Offer", description: "We make a decision and extend an offer", duration: "2–3 days", paid: false },
    ];
  }

  function addStage() {
    setStages((prev) => [...prev, { step_order: prev.length + 1, label: "", description: "", duration: "", paid: false }]);
  }

  function removeStage(i: number) {
    setStages((prev) => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, step_order: idx + 1 })));
  }

  function updateStage(i: number, field: keyof Stage, value: string | boolean) {
    setStages((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  async function save() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    try {
      // Delete old and re-insert
      await supabase.from("company_hiring_steps").delete().eq("company_id", user.id);
      if (stages.length > 0) {
        const rows = stages.map((s, i) => ({
          company_id: user.id,
          step_order: i + 1,
          label: s.label,
          description: s.description,
          duration: s.duration,
          paid: s.paid,
        }));
        const { error: insErr } = await supabase.from("company_hiring_steps").insert(rows);
        if (insErr) throw new Error(insErr.message);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Define the steps in your hiring process. Candidates see this on your job postings so they know exactly what to expect.
      </p>

      <div className="space-y-3">
        {stages.map((stage, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="mt-2 flex flex-col items-center gap-1">
                <GripVertical size={16} className="text-muted-foreground/40 cursor-grab" />
                <span className="text-xs font-mono text-muted-foreground">{i + 1}</span>
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={stage.label}
                    onChange={(e) => updateStage(i, "label", e.target.value)}
                    placeholder="Stage name (e.g. Technical interview)"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    value={stage.duration}
                    onChange={(e) => updateStage(i, "duration", e.target.value)}
                    placeholder="Duration (e.g. 1–2 weeks)"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <input
                  value={stage.description}
                  onChange={(e) => updateStage(i, "description", e.target.value)}
                  placeholder="What happens in this stage?"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stage.paid}
                    onChange={(e) => updateStage(i, "paid", e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-muted-foreground">This stage includes a paid task or trial</span>
                </label>
              </div>
              <button
                onClick={() => removeStage(i)}
                className="mt-1 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addStage}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
      >
        <Plus size={15} />
        Add stage
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save pipeline"}
      </button>
    </div>
  );
}
