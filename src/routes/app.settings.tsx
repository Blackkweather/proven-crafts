import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/hooks";
import { updateProfile, deleteOwnAccount } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

const TABS = ["Profile", "Privacy", "Notifications", "Account"] as const;
type Tab = (typeof TABS)[number];

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Profile");

  return (
    <div className="max-w-2xl">
      <div className="flex w-fit gap-1 rounded-lg border border-border bg-paper p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-md px-4 py-2 text-sm transition-colors " +
              (tab === t
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "Profile" && <ProfileSettings />}
        {tab === "Privacy" && <PrivacySettings />}
        {tab === "Notifications" && <NotificationSettings />}
        {tab === "Account" && <AccountSettings />}
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.id);

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [availability, setAvailability] = useState<"open" | "exploring" | "booked">("open");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setHeadline(profile.headline ?? "");
    setBio(profile.bio ?? "");
    setLocation(profile.location ?? "");
    setAvailability(profile.availability ?? "open");
  }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, { display_name: name, headline, bio, location, availability });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading profile…</div>;
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Field label="Display name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Headline">
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          className={inputCls}
          placeholder="Senior Frontend Engineer · Design Systems"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Shown on your profile card and in search results.
        </p>
      </Field>
      <Field label="Bio">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          className={inputCls + " resize-none"}
        />
      </Field>
      <Field label="Location">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={inputCls}
          placeholder="Berlin, DE"
        />
      </Field>
      <Field label="Availability status">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { v: "open", label: "Open to work" },
              { v: "exploring", label: "Exploring" },
              { v: "booked", label: "Not available" },
            ] as const
          ).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => setAvailability(v)}
              className={
                "rounded-full border px-4 py-2 text-sm transition-all " +
                (availability === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40")
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Controls the badge on your public profile.
        </p>
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-primary">Saved ✓</span>}
      </div>
    </form>
  );
}

function PrivacySettings() {
  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.id);

  const [profileVisible, setProfileVisible] = useState<"anyone" | "companies" | "invited">(
    "companies",
  );
  const [showLocation, setShowLocation] = useState(true);
  const [allowMessages, setAllowMessages] = useState<"anyone" | "companies" | "none">("companies");
  const [blindMode, setBlindMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setProfileVisible(profile.profile_visibility ?? "companies");
    setShowLocation(profile.show_location ?? true);
    setAllowMessages(profile.allow_messages ?? "companies");
    setBlindMode(profile.blind_mode ?? false);
  }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, {
        profile_visibility: profileVisible,
        show_location: showLocation,
        allow_messages: allowMessages,
        blind_mode: blindMode,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      <SettingGroup
        title="Profile visibility"
        desc="Controls who can discover your profile on the network."
      >
        <div className="flex flex-col gap-2">
          {(
            [
              { v: "anyone", label: "Anyone on the network" },
              { v: "companies", label: "Verified companies only" },
              { v: "invited", label: "Only people I've invited" },
            ] as const
          ).map(({ v, label }) => (
            <label
              key={v}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 has-[:checked]:border-primary transition-colors"
            >
              <input
                type="radio"
                name="visibility"
                value={v}
                checked={profileVisible === v}
                onChange={() => setProfileVisible(v)}
                className="accent-primary"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </SettingGroup>

      <SettingGroup title="Location" desc="Show or hide your city on your public profile.">
        <div className="flex items-center gap-3">
          <Toggle checked={showLocation} onChange={setShowLocation} />
          <span className="text-sm text-muted-foreground">Show location on profile</span>
        </div>
      </SettingGroup>

      <SettingGroup
        title="Who can message you"
        desc="Unwanted messages are automatically flagged and removed."
      >
        <div className="flex flex-col gap-2">
          {(
            [
              { v: "anyone", label: "Anyone" },
              { v: "companies", label: "Verified companies only" },
              { v: "none", label: "No one — read-only mode" },
            ] as const
          ).map(({ v, label }) => (
            <label
              key={v}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 has-[:checked]:border-primary transition-colors"
            >
              <input
                type="radio"
                name="messaging"
                value={v}
                checked={allowMessages === v}
                onChange={() => setAllowMessages(v)}
                className="accent-primary"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </SettingGroup>

      <SettingGroup
        title="Blind screening"
        desc="Companies review your work before seeing your name or photo. Reduces bias in early evaluation."
      >
        <div className="flex items-center gap-3">
          <Toggle checked={blindMode} onChange={setBlindMode} />
          <span className="text-sm text-muted-foreground">
            {blindMode ? "Blind screening enabled" : "Enable blind screening"}
          </span>
        </div>
        {blindMode && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
            Companies will see your work and skills first. Your name and photo are revealed only
            after they express interest.
          </div>
        )}
      </SettingGroup>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save privacy settings"}
        </button>
        {saved && <span className="text-sm text-primary">Saved ✓</span>}
      </div>
    </div>
  );
}

function NotificationSettings() {
  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.id);

  const [prefs, setPrefs] = useState({
    newMatch: true,
    applicationUpdate: true,
    challengeResult: true,
    message: true,
    weeklyDigest: false,
    marketingEmails: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setPrefs({
      newMatch: profile.notif_new_match ?? true,
      applicationUpdate: profile.notif_application_update ?? true,
      challengeResult: profile.notif_challenge_result ?? true,
      message: profile.notif_message ?? true,
      weeklyDigest: profile.notif_weekly_digest ?? false,
      marketingEmails: profile.notif_marketing ?? false,
    });
  }, [profile]);

  const toggle = (k: keyof typeof prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  async function save() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, {
        notif_new_match: prefs.newMatch,
        notif_application_update: prefs.applicationUpdate,
        notif_challenge_result: prefs.challengeResult,
        notif_message: prefs.message,
        notif_weekly_digest: prefs.weeklyDigest,
        notif_marketing: prefs.marketingEmails,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    {
      key: "newMatch",
      label: "New job matches",
      desc: "When a role matches ≥80% of your verified skills.",
    },
    {
      key: "applicationUpdate",
      label: "Application updates",
      desc: "Status changes on your applications.",
    },
    {
      key: "challengeResult",
      label: "Challenge results",
      desc: "When submissions are reviewed or shortlisted.",
    },
    {
      key: "message",
      label: "New messages",
      desc: "When a company or team member sends you a message.",
    },
    {
      key: "weeklyDigest",
      label: "Weekly digest",
      desc: "A curated roundup of new roles and challenges every Monday.",
    },
    {
      key: "marketingEmails",
      label: "Product updates",
      desc: "Occasional news about new features.",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4"
          >
            <div>
              <div className="text-sm font-medium">{label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
            </div>
            <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save notification settings"}
        </button>
        {saved && <span className="text-sm text-primary">Saved ✓</span>}
      </div>
    </div>
  );
}

function AccountSettings() {
  const { user, signOut } = useAuth();
  const email = user?.email ?? "";

  return (
    <div className="space-y-8">
      <ChangeEmailSection currentEmail={email} />
      <ChangePasswordSection />
      <ConnectedAccountsSection />
      <DangerZone email={email} signOut={signOut} />
    </div>
  );
}

function ChangeEmailSection({ currentEmail }: { currentEmail: string }) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === currentEmail) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (err) throw new Error(err.message);
      setMessage("Confirmation link sent to " + newEmail + ". Check your inbox.");
      setEditing(false);
      setNewEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingGroup title="Email address" desc="Used for sign-in and notifications.">
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email address"
            className={inputCls}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !newEmail.trim() || newEmail === currentEmail}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Sending…" : "Send confirmation"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setNewEmail(""); setError(null); }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <input defaultValue={currentEmail} className={inputCls + " flex-1"} readOnly />
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-4 text-sm hover:bg-accent"
          >
            Change
          </button>
        </div>
      )}
      {message && <p className="text-xs text-primary">{message}</p>}
    </SettingGroup>
  );
}

function ChangePasswordSection() {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError("Passwords do not match."); return; }
    if (next.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      // Re-authenticate with current password first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Not authenticated.");
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (signInErr) throw new Error("Current password is incorrect.");
      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) throw new Error(updateErr.message);
      setMessage("Password updated successfully.");
      setEditing(false);
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingGroup title="Password" desc="Use a strong, unique password for your account.">
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <input
            type="password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            className={inputCls}
          />
          <input
            type="password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="New password (min 8 characters)"
            className={inputCls}
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className={inputCls}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !current || !next || !confirm}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Updating…" : "Update password"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(false); setCurrent(""); setNext(""); setConfirm(""); setError(null); }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent"
        >
          Change password
        </button>
      )}
      {message && <p className="text-xs text-primary">{message}</p>}
    </SettingGroup>
  );
}

function ConnectedAccountsSection() {
  const [identities, setIdentities] = useState<{ provider: string; id: string }[]>([]);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUserIdentities().then(({ data }) => {
      setIdentities((data?.identities ?? []).map((i) => ({ provider: i.provider, id: i.id })));
    });
  }, []);

  async function disconnect(provider: string) {
    setDisconnecting(provider);
    setError(null);
    try {
      const { data } = await supabase.auth.getUserIdentities();
      const identityList = data?.identities ?? [];
      if (identityList.length <= 1) {
        throw new Error("Cannot disconnect your only login method. Add a password first.");
      }
      const target = identityList.find((i) => i.provider === provider);
      if (!target) throw new Error("Identity not found.");
      const { error: err } = await supabase.auth.unlinkIdentity(target);
      if (err) throw new Error(err.message);
      setIdentities((prev) => prev.filter((i) => i.provider !== provider));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect.");
    } finally {
      setDisconnecting(null);
    }
  }

  const googleConnected = identities.some((i) => i.provider === "google");

  return (
    <SettingGroup title="Connected accounts" desc="Third-party accounts linked for sign-in.">
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      {googleConnected ? (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground/10 text-sm font-semibold">
              G
            </div>
            <span className="text-sm">Google account connected</span>
          </div>
          <button
            onClick={() => disconnect("google")}
            disabled={disconnecting === "google"}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            {disconnecting === "google" ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-paper px-5 py-4 text-sm text-muted-foreground">
          No third-party accounts connected.
        </div>
      )}
    </SettingGroup>
  );
}

function DangerZone({ email, signOut }: { email: string; signOut: () => Promise<void> }) {
  const [showDanger, setShowDanger] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirmEmail !== email) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteOwnAccount();
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <div className="font-medium text-destructive">Danger zone</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      {showDanger ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium">
            Type <span className="font-mono text-destructive">{email}</span> to confirm.
          </p>
          <input
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={email}
            className={inputCls}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={confirmEmail !== email || deleting}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "Delete account permanently"}
            </button>
            <button
              onClick={() => { setShowDanger(false); setConfirmEmail(""); setError(null); }}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowDanger(true)}
          className="mt-4 rounded-lg border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          Delete account
        </button>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function SettingGroup({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="font-medium">{title}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors " +
        (checked ? "bg-primary" : "bg-border")
      }
    >
      <span
        className={
          "inline-block h-4 w-4 rounded-full bg-background shadow transition-transform " +
          (checked ? "translate-x-5" : "translate-x-0")
        }
      />
    </button>
  );
}
