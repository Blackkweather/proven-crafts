import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, dashboardPathFor, DEMO_AUTH_ENABLED, type Role } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("anya@skill.network");
  const [password, setPassword] = useState("••••••••");
  const [role, setRole] = useState<Role>("talent");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = signIn(email, password, role);
    if (!res.ok) { setError(res.error ?? "Sign-in failed"); return; }
    router.navigate({ to: dashboardPathFor(role) });
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Step back into the network."
      sub="Pick the experience you came here for."
      footer={<>New to Skill Network? <Link to="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} className="space-y-5">
        {!DEMO_AUTH_ENABLED && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
            Sign-in is disabled in this preview. Connect Lovable Cloud to enable real authentication.
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
        )}
        <RolePicker value={role} onChange={setRole} />
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" className={inputCls} />
        </Field>
        <Field label="Password">
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" className={inputCls} />
        </Field>
        <button disabled={!DEMO_AUTH_ENABLED} className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
          Sign in
        </button>
      </form>
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

export function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  const opts: { v: Role; t: string; d: string }[] = [
    { v: "talent", t: "Talent", d: "Show work, win challenges" },
    { v: "company", t: "Company", d: "Hire on signal" },
    { v: "admin", t: "Admin", d: "Moderate the network" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-paper p-1">
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

export function AuthLayout({
  eyebrow, title, sub, children, footer,
}: { eyebrow: string; title: string; sub: string; children: React.ReactNode; footer: React.ReactNode }) {
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
