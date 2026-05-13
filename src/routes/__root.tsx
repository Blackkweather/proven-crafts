// =============================================================================
// ROOT ROUTE — src/routes/__root.tsx
// =============================================================================
// The top-level shell for the entire application. Every page renders inside
// this file because TanStack Router uses it as the outermost layout.
//
// WHAT THIS FILE DOES:
//   1. Sets up the HTML <head> with meta tags, fonts, and the stylesheet
//   2. Wraps the whole app in <AuthProvider> so every component can call useAuth()
//   3. Runs <PostAuthRedirect> after every new login to send users to the
//      right page (onboarding if new, dashboard if returning)
//   4. Mounts <GlobalSearch> so the Cmd+K search overlay works everywhere
//   5. Provides a clean 404 page and a global error boundary
//
// DATA FLOW (after login):
//   User logs in → onAuthStateChange fires → freshSignIn = true
//   → PostAuthRedirect detects it → checks onboarding status
//   → navigates to /onboarding/talent OR /app (or /company for company accounts)
//
// KEYWORDS: AUTH, MIDDLEWARE, NAVIGATION
// =============================================================================

import { Outlet, createRootRoute, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { AuthProvider, dashboardPathFor, useAuth } from "@/lib/auth";
import { GlobalSearch } from "@/components/global-search";
import "@/lib/env"; // VALIDATION: Throws at load time if required env vars are missing
import { initMonitoring, ErrorBoundary } from "@/lib/monitoring";

// Initialize error monitoring (e.g. Sentry) before anything else renders
initMonitoring();

// =============================================================================
// POST-AUTH REDIRECT — PostAuthRedirect
// =============================================================================
// Runs after every fresh sign-in (email/password OR Google OAuth).
// This is the single place that decides where a newly-logged-in user goes.
//
// LOGIC:
//   1. Wait for auth to finish loading and freshSignIn to be true
//   2. Check if onboarding has been completed (DB flag or localStorage)
//   3. If not completed → send to the correct onboarding flow
//   4. If completed → send to the dashboard for their role
//
// WHY CENTRALIZED: If each login/signup page handled its own redirect,
// Google OAuth would have nowhere to redirect to. This component handles all
// post-auth navigation in one place.
//
// KEYWORDS: AUTH, NAVIGATION, MIDDLEWARE
// =============================================================================
function PostAuthRedirect() {
  const { user, profile, roles, loading, freshSignIn, consumeFreshSignIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait until auth is loaded and a fresh sign-in has occurred
    if (loading || !freshSignIn || !user) return;

    // Consume the flag so this only runs once per login
    consumeFreshSignIn();

    // Check if the user has finished onboarding.
    // onboarding_completed_at lives in the `profiles` table, loaded via loadProfileAndRoles().
    const onboardingDone = !!profile?.onboarding_completed_at;

    const primaryRole = roles[0] ?? null;

    if (!onboardingDone) {
      // NAVIGATION: New user — send to onboarding based on their account type
      router.navigate({
        to: primaryRole === "company" ? "/onboarding/company" : "/onboarding/talent",
      });
    } else {
      // NAVIGATION: Returning user — send to their role-specific dashboard
      router.navigate({ to: dashboardPathFor(primaryRole) });
    }
  }, [loading, freshSignIn, user, profile, roles, router, consumeFreshSignIn]);

  // This component renders nothing — it only has side effects
  return null;
}

// =============================================================================
// 404 PAGE — NotFoundComponent
// =============================================================================
// Shown when the user navigates to a URL that doesn't match any route.
// Provides a friendly message and a link back to the home page.
// =============================================================================
function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-fade-up">
        <div className="font-display text-8xl text-foreground/10 select-none">404</div>
        <h2 className="mt-4 font-display text-2xl">Off the map.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That page doesn't exist. Let's get you back to somewhere useful.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ROUTE DEFINITION
// =============================================================================
// createRootRoute registers this file as the root of the route tree.
// The head() function sets up global HTML meta tags and font preloads.
// shellComponent wraps the HTML/body; component renders inside <body>.
// =============================================================================
export const Route = createRootRoute({
  // SEO: Meta tags, OG tags, Twitter cards, and font preloads
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Skill Network — Hire proven skills, not resumes" },
      {
        name: "description",
        content:
          "Skill Network is the editorial hiring platform for the people who actually do the work. Showcase real projects, take real challenges, get hired on signal.",
      },
      { property: "og:title", content: "Skill Network — Hire proven skills, not resumes" },
      {
        property: "og:description",
        content: "An editorial hiring platform built around proven skills, real work, and meaningful matches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Skill Network — Hire proven skills, not resumes" },
      {
        name: "twitter:description",
        content: "An editorial hiring platform built around proven skills, real work, and meaningful matches.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c73c6bbc-7707-4282-9d69-804185a1934a/id-preview-7ddf422b--655c0f96-28fe-414d-8691-0a415fda0f7a.lovable.app-1777372800715.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c73c6bbc-7707-4282-9d69-804185a1934a/id-preview-7ddf422b--655c0f96-28fe-414d-8691-0a415fda0f7a.lovable.app-1777372800715.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Font preconnect for performance — avoids a render-blocking DNS lookup
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

// =============================================================================
// ROOT SHELL — RootShell
// =============================================================================
// Renders the outer HTML/body wrapper. TanStack Router calls this once
// to set up the full document structure. HeadContent injects the <head>
// tags defined above; Scripts injects the Vite/React runtime scripts.
// =============================================================================
function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Polyfill for process.env in browser environments */}
        <script dangerouslySetInnerHTML={{ __html: "window.process=window.process||{env:{}};" }} />
        {/* Disable React DevTools in production */}
        <script dangerouslySetInnerHTML={{ __html: "if(typeof window!==\"undefined\"&&window.__REACT_DEVTOOLS_GLOBAL_HOOK__)window.__REACT_DEVTOOLS_GLOBAL_HOOK__.isDisabled=true;" }} />
        {/* Block right-click and common devtools shortcuts in production */}
        {import.meta.env.PROD && (
          <script dangerouslySetInnerHTML={{ __html: `
(function(){
  document.addEventListener('contextmenu',function(e){e.preventDefault();});
  document.addEventListener('keydown',function(e){
    if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&['I','J','C'].includes(e.key))||(e.ctrlKey&&e.key==='U'))
      e.preventDefault();
  });
})();`.trim() }} />
        )}
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// =============================================================================
// ROOT COMPONENT — RootComponent
// =============================================================================
// The React tree that renders inside <body>. Wraps everything in:
//   - ErrorBoundary: catches unhandled errors and shows a friendly message
//   - AuthProvider:  provides auth state to the entire app
//   - PostAuthRedirect: handles navigation after login
//   - GlobalSearch:  Cmd+K search overlay (available on all pages)
//   - <Outlet />:    where the matched child route renders
//
// KEYWORDS: AUTH, MIDDLEWARE
// =============================================================================
function RootComponent() {
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div className="flex min-h-dvh items-center justify-center bg-background px-4">
          <div className="max-w-md text-center">
            <div className="font-display text-4xl text-destructive">Something broke</div>
            <p className="mt-3 text-sm text-muted-foreground">
              {import.meta.env.DEV && error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Reload page
            </button>
          </div>
        </div>
      )}
    >
      {/* AUTH: AuthProvider must wrap everything so useAuth() works in all child routes */}
      <AuthProvider>
        {/* MIDDLEWARE: Watches for fresh logins and redirects accordingly */}
        <PostAuthRedirect />
        {/* Global Cmd+K search overlay — works on every page */}
        <GlobalSearch />
        {/* Child route renders here (the actual page content) */}
        <Outlet />
      </AuthProvider>
    </ErrorBoundary>
  );
}
