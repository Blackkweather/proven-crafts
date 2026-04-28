import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DashboardShell, Icons } from "@/components/dashboard-shell";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("sn:user");
    if (!raw) throw redirect({ to: "/login" });
    try {
      const u = JSON.parse(raw);
      if (u.role !== "admin") throw redirect({ to: (u.role === "company" ? "/company" : "/app") as string });
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <DashboardShell
      title="Network operations"
      subtitle="Moderation · trust · health"
      badge="Admin"
      nav={[
        { to: "/admin", label: "Overview", icon: Icons.home },
        { to: "/admin/users", label: "People", icon: Icons.users },
        { to: "/admin/companies", label: "Companies", icon: Icons.building },
        { to: "/admin/moderation", label: "Moderation", icon: Icons.shield },
      ]}
    >
      <Outlet />
    </DashboardShell>
  );
}
