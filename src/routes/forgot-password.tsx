// =============================================================================
// FORGOT PASSWORD PAGE — src/routes/forgot-password.tsx
// =============================================================================
// Allows users who've forgotten their password to request a reset link via
// email. The user enters their email address and Supabase sends a password
// reset link that expires in 1 hour. The link redirects the user to the
// `/reset-password` page where they choose a new password.
//
// The page has two UI states:
//   1. Form state — the user enters their email
//   2. Sent state — a confirmation message is shown after the email is dispatched
//
// DATA FLOW: Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
//            directly (not via a custom wrapper). No database rows are created;
//            this is a pure Supabase Auth operation.
// KEYWORDS: AUTH, STATE, VALIDATION, NAVIGATION
// =============================================================================

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
// Direct Supabase client — used here because the auth context doesn't expose
// a `resetPasswordForEmail` helper. We call Supabase directly.
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field } from "./login";
import { ArrowLeft, Mail } from "lucide-react";

// NAVIGATION: Registers this component at the "/forgot-password" route.
export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  // STATE: The email address entered by the user.
  const [email, setEmail] = useState("");

  // STATE: True while the Supabase request is in flight — disables the button.
  const [loading, setLoading] = useState(false);

  // STATE: Switches the UI to the confirmation screen after a successful send.
  const [sent, setSent] = useState(false);

  // STATE: Error message shown if the Supabase call fails.
  const [error, setError] = useState<string | null>(null);

  // AUTH: Sends a password reset email with a link back to /reset-password.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // AUTH: Supabase emails a magic link. The `redirectTo` URL tells Supabase
    // where to send the user after they click the link in their inbox.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // STATE: Show the confirmation UI instead of the form.
    setSent(true);
  }

  // ─── Post-send confirmation UI ────────────────────────────────────────────
  // Shown after the reset email has been dispatched successfully.
  if (sent) {
    return (
      <AuthLayout
        eyebrow="Check your inbox"
        title="Link on its way."
        sub={`We sent a reset link to ${email}. It expires in 1 hour.`}
        footer={
          // NAVIGATION: Let the user navigate back to the login page.
          <Link
            to="/login"
            className="flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
          >
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        }
      >
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <Mail size={28} className="mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">
            Didn't get it? Check your spam folder, or{" "}
            {/* STATE: Clicking "try again" resets to the form view */}
            <button
              onClick={() => setSent(false)}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              try again
            </button>
            .
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ─── Default: email input form ────────────────────────────────────────────
  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Forgot your password?"
      sub="Enter your email and we'll send a reset link."
      footer={
        // NAVIGATION: Back to login for users who remember their password.
        <Link
          to="/login"
          className="flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft size={13} /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {/* VALIDATION: Error banner — shown if Supabase returns an error */}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}
        {/* VALIDATION: Email field — must be a valid email format (type="email") */}
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
        {/* STATE: Disabled while sending to prevent duplicate requests */}
        <button
          disabled={loading}
          className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthLayout>
  );
}
