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
import { useRouter } from "@tanstack/react-router";
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

  // AUTH: Check if any of the user's roles match the allowed list.
  // A user can have multiple roles (e.g. both talent and admin).
  const allowed = roles.some((r) => allow.includes(r));

  // MIDDLEWARE: Handle redirects in a useEffect so they happen after render,
  // avoiding "navigate during render" React warnings.
  useEffect(() => {
    // Wait until auth has finished loading — don't redirect prematurely
    if (loading) return;

    if (!user) {
      // AUTH: No session → send to login page
      router.navigate({ to: "/login" });
      return;
    }

    if (!allowed) {
      // NAVIGATION: User is logged in but has the wrong role.
      // Send them to the correct dashboard for their actual role.
      // e.g. a talent user landing on /admin → goes to /app
      router.navigate({ to: dashboardPathFor(primaryRole) });
    }
  }, [loading, user, allowed, primaryRole, router]);

  // STATE: Show a loading screen while the auth session is being restored.
  // This prevents the protected content from flashing before the redirect fires.
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          {/* Animated spinner */}
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  // AUTH: Show a brief "Redirecting" message while the router navigates.
  // This covers the window between the useEffect redirect and the actual
  // navigation completing, preventing a flash of unauthorized content.
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
