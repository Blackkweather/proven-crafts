import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell, Icons } from "@/components/dashboard-shell";
import { RequireRole } from "@/components/require-role";

export const Route = createFileRoute("/app")({
  component: TalentLayout,
});

function TalentLayout() {
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
          { to: "/app/inbox", label: "Inbox", icon: Icons.inbox },
          { to: "/app/notifications", label: "Notifications", icon: Icons.bell },
        ]}
      >
        <Outlet />
      </DashboardShell>
    </RequireRole>
  );
}
