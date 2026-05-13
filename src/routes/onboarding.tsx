// =============================================================================
// ONBOARDING LAYOUT — src/routes/onboarding.tsx
// =============================================================================
// Thin layout shell for the onboarding section. This component exists solely
// so that child routes (`/onboarding/talent` and `/onboarding/company`) share
// the "/onboarding" URL prefix and can be colocated under the same file-based
// routing group.
//
// There is no UI here — it renders only an `<Outlet />` which is replaced by
// the actual child route component when navigated to. Any logic or layout
// shared across all onboarding steps should be added here in the future.
//
// KEYWORDS: NAVIGATION
// =============================================================================

import { createFileRoute, Outlet } from "@tanstack/react-router";

// NAVIGATION: Parent route that provides the "/onboarding" path prefix.
// Renders the matched child route via <Outlet />.
export const Route = createFileRoute("/onboarding")({
  component: () => <Outlet />,
});
