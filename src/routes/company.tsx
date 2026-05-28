// =============================================================================
// COMPANY DASHBOARD LAYOUT — src/routes/company.tsx
// =============================================================================
// Layout wrapper for the entire company dashboard (/company/*).
// Every route under /company (e.g. /company/jobs, /company/candidates)
// renders inside the <DashboardShell> defined here.
//
// WHAT IT DOES:
//   1. Protects the dashboard — <RequireRole allow={["company"]}> blocks access
//      if the user is not logged in or isn't a company account
//   2. Checks onboarding status — redirects to /onboarding/company if the
//      company hasn't finished their setup wizard
//   3. Renders the sidebar navigation with company-specific links
//   4. Renders <Outlet /> where the child page renders (e.g. company.jobs.tsx)
//
// ROUTE STRUCTURE:
//   /company            → company.index.tsx   (Overview / home)
//   /company/jobs       → company.jobs.tsx    (Manage job postings)
//   /company/challenges → company.challenges.tsx (Run skill challenges)
//   /company/candidates → company.candidates.tsx (Review applicants)
//   /company/talent     → company.talent.tsx  (Browse talent directory)
//   /company/inbox      → company.inbox.tsx   (Message candidates)
//
// KEYWORDS: DASHBOARD, AUTH, MIDDLEWARE, NAVIGATION
// =============================================================================

import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashboardShell, Icons } from "@/components/dashboard-shell";
import { RequireRole } from "@/components/require-role";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/company")({
  component: CompanyLayout,
});

// =============================================================================
// COMPANY LAYOUT — CompanyLayout
// =============================================================================
// The layout component for the /company/* route tree.
//
// AUTH + MIDDLEWARE: Two layers of protection:
//   1. <RequireRole allow={["company"]}> — blocks non-company users.
//      Talent and admin users who land here get redirected to their own dashboards.
//   2. Onboarding guard — new companies that haven't completed their profile
//      setup are sent to /onboarding/company before accessing the dashboard.
//
// STATE: The subtitle dynamically shows the company's display name once the
// profile has loaded from the database.
//
// NAVIGATION: The nav array defines all sidebar links for this dashboard.
//   The Inbox link includes a real-time unread message badge.
// =============================================================================
function CompanyLayout() {
  const router = useRouter();

  // AUTH: Read the company's profile and loading state from AuthContext
  const { profile, loading } = useAuth();

  // MIDDLEWARE: Onboarding guard — redirect to setup wizard if not completed.
  // We wait for loading = false so we don't redirect during the initial auth check.
  useEffect(() => {
    if (loading || !profile) return;
    if (!profile.onboarding_completed_at) {
      router.navigate({ to: "/onboarding/company" });
    }
  }, [loading, profile, router]);

  // STATE: Build subtitle dynamically using the company's display name.
  // Falls back to a generic label if the profile hasn't loaded yet.
  const subtitle = profile?.display_name
    ? `${profile.display_name} · Company workspace`
    : "Company workspace";

  return (
    // AUTH: RequireRole blocks any user who isn't a "company".
    // Talent users landing on /company are redirected to /app.
    // Admin users are redirected to /admin.
    <RequireRole allow={["company"]}>
      {/* DASHBOARD: DashboardShell provides the sidebar + top header layout.
          title = top header text, badge = pill label next to the logo. */}
      <DashboardShell
        title="Hiring control panel"
        subtitle={subtitle}
        badge="Company"
        // NAVIGATION: Sidebar links specific to the company dashboard.
        // badgeKey="messages" connects to live unread count from Supabase Realtime.
        nav={[
          { to: "/company",            label: "Overview",    icon: Icons.home      },
          { to: "/company/jobs",       label: "Roles",       icon: Icons.briefcase },
          { to: "/company/challenges", label: "Challenges",  icon: Icons.bolt      },
          { to: "/company/candidates", label: "Pipeline",    icon: Icons.users     },
          { to: "/company/talent",     label: "Find Talent", icon: Icons.search    },
          { to: "/company/inbox",      label: "Inbox",       icon: Icons.inbox,    badgeKey: "messages" as const },
          { to: "/company/analytics",  label: "Analytics",   icon: Icons.chart     },
          { to: "/company/billing",    label: "Billing",     icon: Icons.bolt      },
          { to: "/company/settings",   label: "Settings",    icon: Icons.gear      },
        ]}
      >
        {/* DASHBOARD: <Outlet /> renders the matched child route here.
            e.g. /company/jobs renders company.jobs.tsx in this slot. */}
        <Outlet />
      </DashboardShell>
    </RequireRole>
  );
}
