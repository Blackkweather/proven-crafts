import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell, Icons } from "@/components/dashboard-shell";
import { RequireRole } from "@/components/require-role";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/company")({
  component: CompanyLayout,
});

function CompanyLayout() {
  const { profile } = useAuth();
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
          { to: "/company/candidates", label: "Candidates", icon: Icons.users },
          { to: "/company/inbox", label: "Inbox", icon: Icons.inbox },
        ]}
      >
        <Outlet />
      </DashboardShell>
    </RequireRole>
  );
}
