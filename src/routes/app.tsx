import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardShell, Icons } from "@/components/dashboard-shell";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("sn:user");
    if (!raw) throw redirect({ to: "/login" });
    try {
      const u = JSON.parse(raw);
      if (u.role !== "talent") throw redirect({ to: (u.role === "company" ? "/company" : "/admin") as string });
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: TalentLayout,
});

function TalentLayout() {
  return (
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
  );
}
