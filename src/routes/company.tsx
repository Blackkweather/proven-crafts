import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashboardShell, Icons } from "@/components/dashboard-shell";
import { RequireRole } from "@/components/require-role";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/company")({
  component: CompanyLayout,
});

function CompanyLayout() {
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (loading || !profile) return;
    if (!profile.onboarding_completed_at) {
      router.navigate({ to: "/onboarding/company" });
    }
  }, [loading, profile, router]);
  const subtitle = profile?.display_name
    ? `${profile.display_name} · Company workspace`
    : "Company workspace";
  return (
    <RequireRole allow={["company"]}>
      <DashboardShell
        title="Hiring control panel"
        subtitle={subtitle}
        badge="Company"
        nav={[
          { to: "/company", label: "Overview", icon: Icons.home },
          { to: "/company/jobs", label: "Roles", icon: Icons.briefcase },
          { to: "/company/challenges", label: "Challenges", icon: Icons.bolt },
          { to: "/company/candidates", label: "Pipeline", icon: Icons.users },
          { to: "/company/talent", label: "Find Talent", icon: Icons.search },
          {
            to: "/company/inbox",
            label: "Inbox",
            icon: Icons.inbox,
            badgeKey: "messages" as const,
          },
        ]}
      >
        <Outlet />
      </DashboardShell>
    </RequireRole>
  );
}
