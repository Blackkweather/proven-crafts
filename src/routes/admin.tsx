// =============================================================================
// ADMIN DASHBOARD LAYOUT — src/routes/admin.tsx
// =============================================================================
// Layout wrapper for the admin panel (/admin/*).
// Every route under /admin (e.g. /admin/users, /admin/moderation)
// renders inside the <DashboardShell> defined here.
//
// WHAT IT DOES:
//   1. Protects the panel — <RequireRole allow={["admin"]}> ensures ONLY users
//      with the "admin" role can access this area. Anyone else is immediately
//      redirected to their own dashboard (talent → /app, company → /company).
//   2. Renders the sidebar navigation with admin-specific links
//   3. Renders <Outlet /> where the child admin page renders
//
// SECURITY NOTE:
//   Role-based access is enforced at TWO levels:
//     1. Client-side: RequireRole redirects unauthorized users in the browser
//     2. Database-level: Supabase Row Level Security (RLS) policies block
//        any direct API calls from non-admin accounts even if the UI is bypassed
//   Never rely on client-side checks alone for sensitive admin operations.
//
// ROUTE STRUCTURE:
//   /admin             → admin.index.tsx      (Overview / platform stats)
//   /admin/users       → admin.users.tsx      (Manage all user accounts)
//   /admin/companies   → admin.companies.tsx  (Manage company accounts)
//   /admin/moderation  → admin.moderation.tsx (Review flagged content)
//   /admin/contact     → admin.contact.tsx    (Support / contact messages)
//
// KEYWORDS: DASHBOARD, AUTH, MIDDLEWARE, NAVIGATION
// =============================================================================

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell, Icons } from "@/components/dashboard-shell";
import { RequireRole } from "@/components/require-role";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

// =============================================================================
// ADMIN LAYOUT — AdminLayout
// =============================================================================
// The layout component for the /admin/* route tree.
//
// AUTH + MIDDLEWARE: Protected by <RequireRole allow={["admin"]}>.
// This is the strictest access control level in the app — only accounts
// with the "admin" role in the user_roles table can enter.
//
// NOTE: No onboarding check here — admins are created manually and don't
// go through the standard onboarding flow.
//
// NAVIGATION: The nav array defines the sidebar links for the admin panel.
//   These cover every admin operation: users, companies, moderation, support.
// =============================================================================
function AdminLayout() {
  return (
    // AUTH: RequireRole is the gatekeeper for this entire section.
    // Any non-admin user who somehow reaches /admin will be redirected.
    <RequireRole allow={["admin"]}>
      {/* DASHBOARD: DashboardShell provides the sidebar + top header layout.
          The "Admin" badge in the sidebar clearly indicates elevated access. */}
      <DashboardShell
        title="Network operations"
        subtitle="Moderation · trust · health"
        badge="Admin"
        // NAVIGATION: Admin-specific sidebar links.
        // Each link maps to a sub-page that performs a distinct admin function.
        nav={[
          // Platform overview: stats, health indicators, recent activity
          { to: "/admin",            label: "Overview",   icon: Icons.home     },
          // User management: search, suspend, promote, delete accounts
          { to: "/admin/users",      label: "People",     icon: Icons.users    },
          // Company management: verify, feature, or remove company accounts
          { to: "/admin/companies",  label: "Companies",  icon: Icons.building },
          // Content moderation: review flagged submissions, challenges, profiles
          { to: "/admin/moderation", label: "Moderation", icon: Icons.shield   },
          // Support inbox: contact form submissions from users
          { to: "/admin/contact",    label: "Inbox",      icon: Icons.mail     },
        ]}
      >
        {/* DASHBOARD: Child admin pages render here via <Outlet />.
            e.g. /admin/users renders admin.users.tsx in this slot. */}
        <Outlet />
      </DashboardShell>
    </RequireRole>
  );
}
