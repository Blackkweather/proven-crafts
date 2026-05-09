import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, dashboardPathFor, type AccountType } from "@/lib/auth";
import { AuthLayout, Field, AccountTypePicker } from "./login";

export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("talent");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const res = await signUp(name, email, password, accountType);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Sign-up failed");
      return;
    }
    setInfo("Check your inbox to confirm your email, then sign in.");
    setTimeout(() => router.navigate({ to: dashboardPathFor(accountType) }), 800);
  }

  async function googleSignUp() {
    setError(null);
    const res = await signInWithGoogle();
    if (!res.ok) setError(res.error ?? "Google sign-in failed");
  }

  return (
    <AuthLayout
      eyebrow="Join the network"
      title="Show what you can do."
      sub="Take 3 minutes. Skip the resume."
      footer={
        <>
          Already a member?{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <button
          type="button"
          onClick={googleSignUp}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-accent"
        >
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
          {info && (
            <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-xs text-foreground">{info}</div>
          )}
          <AccountTypePicker value={accountType} onChange={setAccountType} />
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={accountType === "company" ? "Company name" : "Your name"}
              className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </Field>
          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              placeholder="you@work.com"
              className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </Field>
          <Field label="Password">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
              className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </Field>
          <button
            disabled={loading}
            className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
