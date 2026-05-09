import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, dashboardPathFor } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { signIn, signInWithGoogle, refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Sign-in failed");
      return;
    }
    // Pull fresh roles, then route by primary role.
    await refresh();
    // Best-effort route — auth listener will hydrate roles too.
    router.navigate({ to: dashboardPathFor(null) });
  }

  async function googleSignIn() {
    setError(null);
    const res = await signInWithGoogle();
    if (!res.ok) setError(res.error ?? "Google sign-in failed");
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Step back into the network."
      sub="Sign in with the email you used to join."
      footer={
        <>
          New to Skill Network?{" "}
          <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <button
          type="button"
          onClick={googleSignIn}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-accent"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-5">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
          )}
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" className={inputCls} />
          </Field>
          <Field label="Password">
            <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" className={inputCls} />
          </Field>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

export function AccountTypePicker({
  value,
  onChange,
}: {
  value: "talent" | "company";
  onChange: (v: "talent" | "company") => void;
}) {
  const opts = [
    { v: "talent" as const, t: "I'm talent", d: "Show work, win challenges" },
    { v: "company" as const, t: "I'm hiring", d: "Recruit on real signal" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-paper p-1">
      {opts.map((o) => {
        const active = o.v === value;
        return (
          <button
            type="button"
            key={o.v}
            onClick={() => onChange(o.v)}
            className={
              "rounded-md px-3 py-2 text-left text-xs transition-all " +
              (active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-accent")
            }
          >
            <div className="font-semibold">{o.t}</div>
            <div className={"mt-0.5 " + (active ? "text-background/70" : "text-muted-foreground")}>{o.d}</div>
          </button>
        );
      })}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.4 39.6 16.1 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

export function AuthLayout({
  eyebrow,
  title,
  sub,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-foreground p-12 text-background lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-background text-foreground">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="3" cy="3" r="2" fill="currentColor" />
              <circle cx="11" cy="3" r="2" fill="currentColor" />
              <circle cx="7" cy="11" r="2" fill="currentColor" />
            </svg>
          </span>
          <span className="font-display text-lg">Skill Network</span>
        </Link>
        <div>
          <p className="font-display text-3xl leading-tight text-background/95">
            "I stopped sending CVs the day I joined. My last three roles came from challenges."
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-background/10 font-display">JR</div>
            <div className="text-sm">
              <div className="font-medium">Javier Rodriguez</div>
              <div className="text-background/60">Senior Engineer · Lisbon</div>
            </div>
          </div>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-background/50">
          v0.1 · preview build
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
          <h1 className="mt-3 font-display text-4xl leading-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-xs text-muted-foreground">{footer}</div>
        </div>
      </div>
    </div>
  );
}
