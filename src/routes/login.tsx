// =============================================================================
// LOGIN PAGE — src/routes/login.tsx
// =============================================================================
// The sign-in page for returning users. Also exports shared components used
// by signup.tsx:
//   - AuthLayout      — split-screen layout (brand panel + form panel)
//   - Field           — accessible labeled input wrapper
//   - AccountTypePicker — talent vs company selector used in signup
//
// LOGIN FLOW:
//   1. User enters email + password (or clicks "Continue with Google")
//   2. signIn() / signInWithGoogle() calls Supabase Auth
//   3. On success, Supabase fires onAuthStateChange(SIGNED_IN)
//   4. AuthProvider loads the user's profile + roles from the DB
//   5. PostAuthRedirect in __root.tsx navigates to onboarding or dashboard
//
// NOTE: This page does NOT handle the post-login redirect itself.
//       All routing after login happens in PostAuthRedirect (__root.tsx).
//       This keeps the login page simple and avoids duplicating redirect logic.
//
// KEYWORDS: LOGIN, AUTH, VALIDATION, NAVIGATION
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

// =============================================================================
// LOGIN — Login Component
// =============================================================================
// The main login form. Supports:
//   - Email + password sign-in
//   - Google OAuth sign-in (one click)
//   - Error display for failed attempts
//   - Loading state on the submit button to prevent double-submits
//
// KEYWORDS: LOGIN, VALIDATION, AUTH
// =============================================================================
function Login() {
  // AUTH: Get sign-in methods from AuthContext
  const { signIn, signInWithGoogle } = useAuth();

  // VALIDATION: Controlled form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // STATE: UI feedback during form submission
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // LOGIN: Handles email/password form submission
  async function submit(e: React.FormEvent) {
    e.preventDefault(); // Prevent default browser form submission
    setError(null);     // Clear any previous error message
    setLoading(true);

    // AUTH: Call Supabase signInWithPassword via the AuthContext wrapper
    const res = await signIn(email, password);
    setLoading(false);

    if (!res.ok) {
      // VALIDATION: Show the error from Supabase (e.g. "Invalid credentials")
      setError(res.error ?? "Sign-in failed");
      return;
    }

    // NAVIGATION: PostAuthRedirect in __root.tsx handles routing after login.
    // We don't navigate here — the auth state change triggers it automatically.
  }

  // LOGIN: Initiates Google OAuth flow. Opens Google's sign-in page.
  async function googleSignIn() {
    setError(null);
    const res = await signInWithGoogle();
    if (!res.ok) setError(res.error ?? "Google sign-in failed");
    // On success: browser redirects to Google, then back to our origin.
    // PostAuthRedirect then fires on the return visit.
  }

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Step back into the network."
      sub="Sign in with the email you used to join."
      footer={
        <>
          New to Skill Network?{" "}
          <Link
            to="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {/* AUTH: Google OAuth button — faster than email/password for most users */}
        <button
          type="button"
          onClick={googleSignIn}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <GoogleMark />
          Continue with Google
        </button>

        {/* Visual divider between OAuth and email/password options */}
        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* LOGIN: Email + password form */}
        <form onSubmit={submit} className="space-y-5">

          {/* VALIDATION: Error message shown when login fails */}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* VALIDATION: Email field */}
          <Field label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={inputCls}
            />
          </Field>

          {/* VALIDATION: Password field */}
          <Field label="Password">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputCls}
            />
          </Field>

          {/* Forgot password link */}
          <div className="flex items-center justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* LOGIN: Submit button — disabled and shows spinner while loading */}
          <button
            disabled={loading}
            className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

// =============================================================================
// SHARED STYLES
// =============================================================================
// Reusable Tailwind class string for text inputs across the auth pages.
// Includes focus ring for keyboard accessibility.
// KEYWORD: VALIDATION
// =============================================================================
const inputCls =
  "w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring/20";

// =============================================================================
// FIELD — Accessible labeled input wrapper
// =============================================================================
// Wraps an input inside a <label> so clicking the label focuses the input.
// The label text is styled as a small uppercase caption.
//
// USAGE:
//   <Field label="Email"><input type="email" ... /></Field>
//
// KEYWORD: VALIDATION
// =============================================================================
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

// =============================================================================
// ACCOUNT TYPE PICKER — AccountTypePicker
// =============================================================================
// A two-option toggle used during sign-up to let the user choose whether they
// are talent (looking for work) or a company (looking to hire).
//
// The selection is stored as state in signup.tsx and passed to signUp()
// as the accountType parameter, which gets saved to user_metadata in Supabase.
//
// AUTH: The account type determines which onboarding flow the user sees
// and which role gets assigned in the user_roles table.
//
// KEYWORDS: AUTH, VALIDATION
// =============================================================================
export function AccountTypePicker({
  value,
  onChange,
}: {
  value: "talent" | "company";
  onChange: (v: "talent" | "company") => void;
}) {
  const options = [
    { v: "talent" as const, title: "I'm talent", description: "Show work, win challenges" },
    { v: "company" as const, title: "I'm hiring", description: "Recruit on real signal" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-paper p-1">
      {options.map((opt) => {
        const active = opt.v === value;
        return (
          <button
            type="button"
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={
              "rounded-md px-3 py-2.5 text-left text-xs transition-all " +
              (active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-accent")
            }
          >
            <div className="font-semibold">{opt.title}</div>
            <div className={"mt-0.5 " + (active ? "text-background/70" : "text-muted-foreground/70")}>
              {opt.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// GOOGLE MARK — Google brand logo SVG
// =============================================================================
// Renders the colorful Google "G" logo inside the OAuth button.
// Using the official Google brand colors as required by their guidelines.
// =============================================================================
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.4 39.6 16.1 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

// =============================================================================
// AUTH LAYOUT — AuthLayout
// =============================================================================
// The split-screen layout shared by login.tsx and signup.tsx.
//
// LEFT PANEL (desktop only):
//   - Dark background with the brand logo
//   - A testimonial quote from a fictional user
//   - Build version stamp
//
// RIGHT PANEL:
//   - The form content (passed as children)
//   - Eyebrow label, title, subtitle, and footer link
//
// KEYWORD: AUTH
// =============================================================================
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

      {/* LEFT PANEL — Brand / social proof (desktop only) */}
      <div className="hidden flex-col justify-between bg-foreground p-12 text-background lg:flex">
        {/* Logo in top-left */}
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-background text-foreground shadow-sm">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="3" cy="3" r="2" fill="currentColor" />
              <circle cx="11" cy="3" r="2" fill="currentColor" />
              <circle cx="7" cy="11" r="2" fill="currentColor" />
            </svg>
          </span>
          <span className="font-display text-lg">Skill Network</span>
        </Link>

        {/* Testimonial quote — builds social proof on the login page */}
        <div>
          <p className="font-display text-3xl leading-tight text-background/95">
            "I stopped sending CVs the day I joined. My last three roles came from challenges."
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-background/10 font-display text-sm">
              JR
            </div>
            <div className="text-sm">
              <div className="font-semibold">Javier Rodriguez</div>
              <div className="text-background/60">Senior Engineer · Lisbon</div>
            </div>
          </div>
        </div>

        {/* Version stamp */}
        <div className="font-mono text-[10px] uppercase tracking-widest text-background/40">
          v0.1 · preview build
        </div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          {/* Eyebrow (small label above the title) */}
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
          {/* Page title */}
          <h1 className="mt-3 font-display text-4xl leading-tight">{title}</h1>
          {/* Subtitle */}
          <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
          {/* Form content (login form or signup form) */}
          <div className="mt-8">{children}</div>
          {/* Footer link (e.g. "Already have an account? Log in") */}
          <div className="mt-8 text-xs text-muted-foreground">{footer}</div>
        </div>
      </div>
    </div>
  );
}
