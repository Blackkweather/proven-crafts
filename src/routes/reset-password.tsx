import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field } from "./login";
import { ArrowLeft, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends the user here with a hash containing the access_token.
  // The auth state change listener picks it up automatically.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function validatePassword(pw: string): string | null {
    if (pw.length < 12) return "Password must be at least 12 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
    if (!/[^A-Za-z0-9]/.test(pw)) return "Password must contain at least one special character.";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.navigate({ to: "/login" }), 2500);
  }

  if (done) {
    return (
      <AuthLayout
        eyebrow="All done"
        title="Password updated."
        sub="You can now sign in with your new password."
        footer={
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

  if (!sessionReady) {
    return (
      <AuthLayout
        eyebrow="Reset password"
        title="Waiting for link…"
        sub="Open the reset link from your email to continue."
        footer={
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

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Choose a new password."
      sub="At least 12 characters with uppercase, a number, and a special character."
      footer={
        <Link
          to="/login"
          className="flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft size={13} /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}
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
