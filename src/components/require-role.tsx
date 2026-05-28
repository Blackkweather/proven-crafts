// =============================================================================
// REQUIRE ROLE — src/components/require-role.tsx
// =============================================================================
// A client-side route guard that protects dashboard pages based on user role.
// Wrap any page or layout with <RequireRole allow={["talent"]}> to restrict it.
//
// HOW IT WORKS:
//   1. Reads the current user and their roles from AuthContext
//   2. While auth is loading → shows a loading spinner (prevents flash of content)
//   3. If no user is logged in → redirects to /login
//   4. If user doesn't have the required role → redirects to their own dashboard
//   5. If user IS authorized → renders the children (the protected content)
//
// EXAMPLE USAGE:
//   // Only talent users can see this:
//   <RequireRole allow={["talent"]}>
//     <TalentDashboard />
//   </RequireRole>
//
//   // Both talent and admin can see this:
//   <RequireRole allow={["talent", "admin"]}>
//     <SharedPage />
//   </RequireRole>
//
// SECURITY NOTE:
//   This is a UI-layer guard only. It prevents unauthorized users from
//   seeing pages, but does NOT secure the data. All sensitive database
//   operations must also be protected by Supabase RLS (Row Level Security)
//   policies on the server side. Never rely on this component alone for
//   data security.
//
// KEYWORDS: AUTH, MIDDLEWARE, NAVIGATION
// =============================================================================

import { useEffect, type ReactNode } from "react";
import { useRouter, useLocation } from "@tanstack/react-router";
import { useAuth, dashboardPathFor, type Role } from "@/lib/auth";

// =============================================================================
// REQUIRE ROLE — RequireRole Component
// =============================================================================
// Props:
//   allow    — array of roles that are permitted to view the children
//   children — the protected content to render if the user is authorized
// =============================================================================
export function RequireRole({ allow, children }: { allow: Role[]; children: ReactNode }) {
  // AUTH: Pull user identity, their roles, and loading state from AuthContext
  const { user, roles, primaryRole, loading } = useAuth();
  const router = useRouter();
  const { pathname } = useLocation();

  // AUTH: Check if any of the user's roles match the allowed list.
  const allowed = roles.some((r) => allow.includes(r));

  // When a logged-in user has no roles yet (brief gap while DB loads), don't
  // redirect — treat it as still loading to prevent an infinite loop where
  // dashboardPathFor(null) = "/app" points back at the same page.
  const rolesStillLoading = user !== null && roles.length === 0;

  // MIDDLEWARE: Handle redirects in a useEffect so they happen after render,
  // avoiding "navigate during render" React warnings.
  useEffect(() => {
    if (loading || rolesStillLoading) return;

    if (!user) {
      router.navigate({ to: "/login" });
      return;
    }

    if (!allowed) {
      const dest = dashboardPathFor(primaryRole);
      // Guard: never redirect to the current page — that creates an infinite loop.
      if (dest !== pathname) {
        router.navigate({ to: dest });
      }
    }
  }, [loading, rolesStillLoading, user, allowed, primaryRole, router, pathname]);

  // STATE: Show a loading screen while the auth session is being restored.
  if (loading || rolesStillLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  // AUTH: Show a brief "Redirecting" message while the router navigates.
  if (!user || !allowed) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          <div className="text-sm text-muted-foreground">Redirecting…</div>
        </div>
      </div>
    );
  }

  // AUTH: User is authorized — render the protected content
  return <>{children}</>;
}
