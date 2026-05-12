import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashboardShell, Icons } from "@/components/dashboard-shell";
import { RequireRole } from "@/components/require-role";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  component: TalentLayout,
});

function TalentLayout() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading || !profile) return;
    if (!profile.onboarding_completed_at) {
      router.navigate({ to: "/onboarding/talent" });
    }
  }, [loading, profile, router]);
  return (
    <RequireRole allow={["talent"]}>
      <DashboardShell
        title="Welcome back."
        subtitle="Your editorial workspace · Talent"
        badge="Talent"
        nav={[
          { to: "/app", label: "Overview", icon: Icons.home },
          { to: "/app/profile", label: "Profile", icon: Icons.user },
          { to: "/app/jobs", label: "Jobs", icon: Icons.briefcase },
          { to: "/app/challenges", label: "Challenges", icon: Icons.bolt },
          { to: "/app/applications", label: "Applications", icon: Icons.clipboard },
          { to: "/app/matches", label: "Matches", icon: Icons.users },
          { to: "/app/insights", label: "Insights", icon: Icons.chart },
          { to: "/app/inbox", label: "Inbox", icon: Icons.inbox, badgeKey: "messages" as const },
          {
            to: "/app/notifications",
            label: "Notifications",
            icon: Icons.bell,
            badgeKey: "notifications" as const,
          },
          { to: "/app/settings", label: "Settings", icon: Icons.gear },
        ]}
      >
        <Outlet />
      </DashboardShell>
    </RequireRole>
  );
}
