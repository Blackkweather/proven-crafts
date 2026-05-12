import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field } from "./login";
import { ArrowLeft, Mail } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout
        eyebrow="Check your inbox"
        title="Link on its way."
        sub={`We sent a reset link to ${email}. It expires in 1 hour.`}
        footer={
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

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Forgot your password?"
      sub="Enter your email and we'll send a reset link."
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
