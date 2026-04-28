import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardShell, Icons } from "@/components/dashboard-shell";

export const Route = createFileRoute("/company")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("sn:user");
    if (!raw) throw redirect({ to: "/login" });
    try {
      const u = JSON.parse(raw);
      if (u.role !== "company") throw redirect({ to: (u.role === "admin" ? "/admin" : "/app") as string });
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: CompanyLayout,
});

function CompanyLayout() {
  return (
    <DashboardShell
      title="Hiring control panel"
      subtitle="Meridian Labs · Company workspace"
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
  );
}
