// =============================================================================
// TALENT DASHBOARD LAYOUT — src/routes/app.tsx
// =============================================================================
// This file defines the layout wrapper for the entire talent dashboard.
// Every route under /app/* (e.g. /app/profile, /app/jobs) renders inside
// the <DashboardShell> defined here.
//
// WHAT IT DOES:
//   1. Protects the dashboard — <RequireRole> blocks access if the user is not
//      logged in or doesn't have the "talent" role (redirects to /login)
//   2. Checks onboarding status — if the user hasn't finished onboarding,
//      they're sent to /onboarding/talent before seeing the dashboard
//   3. Renders the sidebar navigation with all talent-specific links
//   4. Renders <Outlet /> where the child page (e.g. app.jobs.tsx) appears
//
// ROUTE STRUCTURE:
//   /app          → app.index.tsx   (Overview / home)
//   /app/profile  → app.profile.tsx
//   /app/jobs     → app.jobs.tsx
//   /app/challenges → app.challenges.tsx
//   /app/applications → app.applications.tsx
//   /app/matches  → app.matches.tsx
//   /app/insights → app.insights.tsx
//   /app/inbox    → app.inbox.tsx
//   /app/notifications → app.notifications.tsx
//   /app/settings → app.settings.tsx
//
// KEYWORDS: DASHBOARD, AUTH, MIDDLEWARE, NAVIGATION
// =============================================================================

import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashboardShell, Icons } from "@/components/dashboard-shell";
import { RequireRole } from "@/components/require-role";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  component: TalentLayout,
});

// =============================================================================
// TALENT LAYOUT — TalentLayout
// =============================================================================
// The layout component for the /app/* route tree.
//
// AUTH + MIDDLEWARE: Uses two layers of protection:
//   1. <RequireRole allow={["talent"]}> — blocks non-talent users at the
//      component level (company/admin users are redirected to their own dashboards)
//   2. onboarding check — new users who haven't completed setup are sent to
//      /onboarding/talent before they can use the dashboard
//
// NAVIGATION: The nav array defines the sidebar links for this dashboard.
//   Each item maps to a route, label, icon, and optional unread badge.
// =============================================================================
function TalentLayout() {
  const router = useRouter();

  // AUTH: Read the user's profile and loading state from AuthContext
  const { profile, loading } = useAuth();

  // MIDDLEWARE: Onboarding guard — if the user hasn't finished onboarding,
  // redirect them before they can see the dashboard.
  // We wait for loading to be false so we don't redirect on the initial render.
  useEffect(() => {
    if (loading || !profile) return;
    if (!profile.onboarding_completed_at) {
      router.navigate({ to: "/onboarding/talent" });
    }
  }, [loading, profile, router]);

  return (
    // AUTH: RequireRole blocks any user who isn't a "talent".
    // Company and admin users who land here will be redirected to their dashboards.
    <RequireRole allow={["talent"]}>
      {/* DASHBOARD: DashboardShell provides the sidebar + header layout.
          title and subtitle appear in the top header bar.
          badge appears as a pill next to the app logo in the sidebar. */}
      <DashboardShell
        title="Welcome back."
        subtitle="Your editorial workspace · Talent"
        badge="Talent"
        // NAVIGATION: Sidebar links specific to the talent dashboard.
        // The order here is the order they appear in the sidebar.
        // badgeKey links to live unread counts (messages / notifications).
        nav={[
          { to: "/app",               label: "Overview",      icon: Icons.home      },
          { to: "/app/profile",       label: "Profile",       icon: Icons.user      },
          { to: "/app/jobs",          label: "Jobs",          icon: Icons.briefcase },
          { to: "/app/challenges",    label: "Challenges",    icon: Icons.bolt      },
          { to: "/app/applications",  label: "Applications",  icon: Icons.clipboard },
          { to: "/app/matches",       label: "Matches",       icon: Icons.users     },
          { to: "/app/insights",      label: "Insights",      icon: Icons.chart     },
          { to: "/app/inbox",         label: "Inbox",         icon: Icons.inbox,    badgeKey: "messages" as const },
          { to: "/app/notifications", label: "Notifications", icon: Icons.bell,     badgeKey: "notifications" as const },
          { to: "/app/settings",      label: "Settings",      icon: Icons.gear      },
        ]}
      >
        {/* DASHBOARD: <Outlet /> renders the matched child route here.
            e.g. when visiting /app/jobs, app.jobs.tsx renders in this slot. */}
        <Outlet />
      </DashboardShell>
    </RequireRole>
  );
}
