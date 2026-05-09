import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell, Icons } from "@/components/dashboard-shell";
import { RequireRole } from "@/components/require-role";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RequireRole allow={["admin"]}>
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
    </RequireRole>
  );
}
