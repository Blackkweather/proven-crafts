// =============================================================================
// RESET PASSWORD PAGE — src/routes/reset-password.tsx
// =============================================================================
// The second step of the password reset flow. The user arrives here by clicking
// the reset link in their email (sent from the forgot-password page). Supabase
// embeds an access token in the URL hash; the `onAuthStateChange` listener
// detects the PASSWORD_RECOVERY event and activates the form.
//
// The page has three UI states:
//   1. Waiting — the page is listening for the PASSWORD_RECOVERY auth event
//   2. Form — the user can enter and confirm their new password
//   3. Done — success confirmation; auto-redirects to /login after 2.5s
//
// Password requirements: 12+ characters, 1 uppercase letter, 1 number, 1
// special character. Both the client-side `validatePassword` function and
// Supabase server-side rules enforce this.
//
// DATA FLOW: Calls `supabase.auth.updateUser({ password })` to save the new
//            password to Supabase Auth. No custom database rows are written.
// KEYWORDS: AUTH, STATE, VALIDATION, NAVIGATION
// =============================================================================

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
// Direct Supabase client — needed to listen for auth events and call updateUser.
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field } from "./login";
import { ArrowLeft, CheckCircle } from "lucide-react";

// NAVIGATION: Registers this component at the "/reset-password" route.
export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  // NAVIGATION: Used to redirect the user to /login after a successful reset.
  const router = useRouter();

  // STATE: The new password entered by the user.
  const [password, setPassword] = useState("");

  // STATE: The confirmation entry — must match `password` exactly.
  const [confirm, setConfirm] = useState("");

  // STATE: True while the Supabase request is in flight.
  const [loading, setLoading] = useState(false);

  // STATE: Switches the UI to the success/confirmation screen.
  const [done, setDone] = useState(false);

  // STATE: Error message shown above the form if validation or the API call fails.
  const [error, setError] = useState<string | null>(null);

  // STATE: True only after Supabase has confirmed a PASSWORD_RECOVERY session.
  // The form is hidden until this is true to prevent accidental submissions.
  const [sessionReady, setSessionReady] = useState(false);

  // AUTH: Supabase sends the user here with a URL hash containing the access_token.
  // The `onAuthStateChange` listener fires a PASSWORD_RECOVERY event when Supabase
  // processes that token. We wait for that event before showing the password form.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });
    // Cleanup: unsubscribe from the auth listener when the component unmounts.
    return () => sub.subscription.unsubscribe();
  }, []);

  // VALIDATION: Client-side password strength check.
  // Returns an error string if the password doesn't meet requirements, null if OK.
  function validatePassword(pw: string): string | null {
    if (pw.length < 12) return "Password must be at least 12 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain at least one special character.";
    return null;
  }

  // AUTH: Validates and submits the new password to Supabase.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // VALIDATION: Passwords must match before we send anything to the server.
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    // VALIDATION: Run the strength check before the API call.
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);
    // AUTH: Updates the authenticated user's password via Supabase Auth.
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // STATE: Show success screen and auto-redirect after 2.5 seconds.
    setDone(true);
    setTimeout(() => router.navigate({ to: "/login" }), 2500);
  }

  // ─── Success screen ───────────────────────────────────────────────────────
  // Shown after the password has been successfully updated.
  if (done) {
    return (
      <AuthLayout
        eyebrow="All done"
        title="Password updated."
        sub="You can now sign in with your new password."
        footer={
          // NAVIGATION: Manual link in case the auto-redirect doesn't fire.
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in →
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card py-8 text-center">
          <CheckCircle size={32} className="text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
        </div>
      </AuthLayout>
    );
  }

  // ─── Waiting screen ───────────────────────────────────────────────────────
  // Shown before the PASSWORD_RECOVERY event fires. Prevents the user from
  // submitting the form before Supabase has set up the recovery session.
  if (!sessionReady) {
    return (
      <AuthLayout
        eyebrow="Reset password"
        title="Waiting for link…"
        sub="Open the reset link from your email to continue."
        footer={
          // NAVIGATION: Send the user back to forgot-password to request a fresh link.
          <Link
            to="/forgot-password"
            className="flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
          >
            <ArrowLeft size={13} /> Request a new link
          </Link>
        }
      >
        <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          If you arrived from the email link, this page will activate automatically.
        </div>
      </AuthLayout>
    );
  }

  // ─── Password form ────────────────────────────────────────────────────────
  // Shown once the PASSWORD_RECOVERY session is confirmed.
  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Choose a new password."
      sub="At least 12 characters with uppercase, a number, and a special character."
      footer={
        // NAVIGATION: Back to sign in for users who realise they don't need to reset.
        <Link
          to="/login"
          className="flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft size={13} /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {/* VALIDATION: Error banner for both validation failures and API errors */}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}
        {/* VALIDATION: Password field — minLength is 12 to match server-side policy */}
        <Field label="New password">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            minLength={12}
            placeholder="At least 12 characters"
            className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </Field>
        {/* VALIDATION: Confirmation field — checked against `password` before submit */}
        <Field label="Confirm password">
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            type="password"
            placeholder="Same as above"
            className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </Field>
        {/* STATE: Disabled while the API call is running */}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
