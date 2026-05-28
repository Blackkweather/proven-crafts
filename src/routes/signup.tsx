// =============================================================================
// SIGN UP PAGE — src/routes/signup.tsx
// =============================================================================
// New user registration page. Supports two paths: email/password sign-up and
// Google OAuth. The user must choose an account type (talent or company) before
// submitting, which determines which onboarding flow they enter next.
// After a successful sign-up, the auth context handles redirection automatically
// via the `signUp` function in `@/lib/auth`.
//
// DATA FLOW: Calls `signUp(name, email, password, accountType)` from the auth
//            context, which creates a Supabase user and writes initial profile
//            data. Google sign-in calls `signInWithGoogle()` which triggers the
//            Supabase OAuth redirect flow.
// KEYWORDS: AUTH, DATABASE, STATE, VALIDATION, NAVIGATION
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, type AccountType } from "@/lib/auth";
// AuthLayout, Field, and AccountTypePicker are defined in login.tsx and re-exported
// here to keep auth page styles consistent across login/signup/forgot-password.
import { AuthLayout, Field, AccountTypePicker } from "./login";

// NAVIGATION: Route definition for the "/signup" path.
export const Route = createFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  // AUTH: Pull sign-up methods from the global auth context.
  const { signUp, signInWithGoogle } = useAuth();

  // STATE: Form field values — name, email, password.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // STATE: Whether the user is signing up as "talent" or "company".
  // Defaults to "talent". This is sent to Supabase as user metadata.
  const [accountType, setAccountType] = useState<AccountType>("talent");

  // STATE: Error message shown below the form if sign-up fails.
  const [error, setError] = useState<string | null>(null);

  // STATE: Info/success message (e.g. "Account created! Setting up your profile…")
  const [info, setInfo] = useState<string | null>(null);

  // STATE: True when Supabase requires the user to confirm their email before
  // they can sign in. Renders a dedicated "check your inbox" screen.
  const [needsVerify, setNeedsVerify] = useState(false);

  // STATE: Disable the submit button while the network request is in flight.
  const [loading, setLoading] = useState(false);

  // VALIDATION + AUTH: Handles email/password form submission.
  async function submit(e: React.FormEvent) {
    e.preventDefault(); // Prevent the browser from reloading the page
    setError(null);
    setInfo(null);
    setLoading(true);
    // AUTH: signUp creates the Supabase user + profile row + triggers redirect.
    const res = await signUp(name, email, password, accountType);
    setLoading(false);
    if (!res.ok) {
      // VALIDATION: Show the error returned by Supabase (e.g. "Email already in use").
      setError(res.error ?? "Sign-up failed");
      return;
    }
    if (res.needsVerify) {
      // Supabase "Confirm email" is enabled — the user must click the link in
      // their inbox before they can sign in. Show a dedicated screen.
      setNeedsVerify(true);
      return;
    }
    // Auto-confirm is enabled: session returned immediately, auth context
    // will fire SIGNED_IN and navigate the user to their dashboard.
    setInfo("Account created! Setting up your profile…");
  }

  // AUTH: Triggers the Google OAuth sign-in flow (redirect-based).
  async function googleSignUp() {
    setError(null);
    const res = await signInWithGoogle();
    if (!res.ok) setError(res.error ?? "Google sign-in failed");
  }

  // AUTH: Email confirmation required — show a dedicated screen instead of the form.
  if (needsVerify) {
    return (
      <AuthLayout
        eyebrow="Check your inbox"
        title="Confirm your email."
        sub={`We sent a link to ${email}. Click it to activate your account.`}
        footer={
          <>
            Wrong address?{" "}
            <button
              type="button"
              onClick={() => setNeedsVerify(false)}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Go back
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Once you confirm, return here and{" "}
          <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            sign in
          </Link>
          .
        </p>
      </AuthLayout>
    );
  }

  return (
    // AuthLayout: shared wrapper with logo, title, and footer link area.
    <AuthLayout
      eyebrow="Join the network"
      title="Show what you can do."
      sub="Take 3 minutes. Skip the resume."
      footer={
        <>
          Already a member?{" "}
          {/* NAVIGATION: Link back to login for returning users */}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {/* AUTH: Google sign-in button — triggers OAuth redirect */}
        <button
          type="button"
          onClick={googleSignUp}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-accent"
        >
          Continue with Google
        </button>

        {/* Divider between OAuth and email/password paths */}
        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-5">
          {/* VALIDATION: Error banner shown when sign-up fails */}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
          {/* STATE: Success/info message shown after account creation */}
          {info && (
            <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-xs text-foreground">
              {info}
            </div>
          )}

          {/* AUTH: Account type picker — sets whether user signs up as talent or company */}
          <AccountTypePicker value={accountType} onChange={setAccountType} />

          {/* VALIDATION: Name is required; placeholder changes based on account type */}
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={accountType === "company" ? "Company name" : "Your name"}
              className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </Field>

          {/* VALIDATION: Email is required and must be a valid email format */}
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

          {/* VALIDATION: Password must be at least 8 characters (enforced by minLength) */}
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

          {/* STATE: Button is disabled while the request is in flight */}
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
