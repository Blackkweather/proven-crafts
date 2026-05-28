import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/invite/$code")({
  component: InvitePage,
});

function InvitePage() {
  const { code } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [referrer, setReferrer] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    async function load() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("referral_code", code)
        .single();
      if (!data) { setInvalid(true); }
      else { setReferrer(data); }
      setLoading(false);
    }
    load();
    // Store in localStorage so we can credit after signup
    if (code) localStorage.setItem("referral_code", code);
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <h1 className="font-display text-3xl">Invalid invite link</h1>
          <p className="text-muted-foreground">This invite link doesn't exist or has expired.</p>
          <Link to="/signup" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Sign up anyway →
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const initials = referrer?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />

      <section className="container mx-auto flex min-h-[80vh] max-w-lg flex-col items-center justify-center px-6 py-20 text-center">
        {/* Avatar */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {referrer?.avatar_url ? (
            <img src={referrer.avatar_url} alt={referrer.display_name} className="h-full w-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>

        <h1 className="mt-6 font-display text-4xl leading-tight">
          <span className="text-primary">{referrer?.display_name}</span> invited you<br />to Skill Network
        </h1>

        <p className="mt-4 text-lg text-muted-foreground">
          The hiring platform where your work speaks louder than your CV.
          Take challenges, get matched, land roles at companies that value skill.
        </p>

        <div className="mt-8 grid w-full gap-3">
          {user ? (
            <button
              onClick={() => navigate({ to: "/app" })}
              className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to your dashboard →
            </button>
          ) : (
            <>
              <Link
                to="/signup"
                className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Create your free profile →
              </Link>
              <Link
                to="/login"
                className="rounded-lg border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-accent"
              >
                Already have an account? Log in
              </Link>
            </>
          )}
        </div>

        <div className="mt-12 grid grid-cols-3 gap-6 rounded-2xl border border-border bg-card p-6">
          {[
            { stat: "100%", label: "Free for talent" },
            { stat: "72h", label: "Avg. time to interview" },
            { stat: "3×", label: "Higher hire rate vs job boards" },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div className="font-display text-3xl">{stat}</div>
              <div className="mt-1 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
