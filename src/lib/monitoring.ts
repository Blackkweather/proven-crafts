// =============================================================================
// monitoring.ts — src/lib/monitoring.ts
// =============================================================================
// Frontend error-tracking and observability using Sentry. This file wraps the
// Sentry SDK so the rest of the app can call simple, app-specific functions
// rather than importing Sentry directly everywhere.
//
// When VITE_SENTRY_DSN is absent (local development), all calls are no-ops so
// the console stays clean without any configuration. In production, errors are
// captured and sent to Sentry with optional extra context.
//
// Also exports a React ErrorBoundary component so any subtree can catch
// render-time errors gracefully.
//
// KEYWORDS: API, STATE
// =============================================================================

/**
 * Observability — wraps Sentry for frontend error tracking.
 * Configure VITE_SENTRY_DSN in your environment to enable.
 * When DSN is absent, all calls are no-ops so dev builds stay clean.
 */

import * as Sentry from "@sentry/react";

// Read environment variables at module load time.
// VITE_SENTRY_DSN is set in .env for production deployments.
const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const IS_PROD = import.meta.env.PROD as boolean;

// STATE: tracks whether Sentry has been initialised to prevent double-init
let initialised = false;

/**
 * Initialise Sentry once at app startup.
 * Call this once in your root entry file (e.g., main.tsx) before rendering.
 * If the DSN is missing or Sentry was already initialised, this is a no-op.
 *
 * Configuration notes:
 * - `tracesSampleRate: 0.1` captures 10% of transactions in production to
 *   avoid Sentry quota limits while still showing performance trends.
 * - `replaysOnErrorSampleRate: 1.0` captures a session replay for every error
 *   in production, which is invaluable for debugging hard-to-reproduce bugs.
 * - `beforeSend` strips email addresses from breadcrumbs to comply with GDPR.
 */
export function initMonitoring() {
  if (initialised || !DSN) return;
  initialised = true;

  Sentry.init({
    dsn: DSN,
    environment: IS_PROD ? "production" : "development",
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    // In production, sample 10% of page navigations for performance data.
    // 0 in development means no performance overhead locally.
    tracesSampleRate: IS_PROD ? 0.1 : 0,
    replaysSessionSampleRate: 0, // Don't record sessions unless there's an error
    replaysOnErrorSampleRate: IS_PROD ? 1.0 : 0, // Record a replay for every error in prod
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    beforeSend(event) {
      // Strip email addresses from breadcrumb messages before sending to Sentry.
      // This prevents user emails from being stored in error tracking (GDPR compliance).
      const crumbs = event.breadcrumbs as { values?: Array<{ message?: string }> } | undefined;
      if (crumbs?.values) {
        crumbs.values.forEach((b) => {
          if (b.message) {
            b.message = b.message.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]");
          }
        });
      }
      return event;
    },
  });
}

/**
 * Capture an unexpected error with optional extra context.
 * If Sentry isn't initialised (e.g., in local dev), falls back to console.error
 * so errors are still visible during development.
 *
 * The `context` object is attached as "extras" in Sentry, letting you add useful
 * debugging data like the current userId, route, or request payload.
 */
export function captureError(err: unknown, context?: Record<string, unknown>) {
  if (!initialised) {
    console.error("[monitoring]", err, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}

/**
 * Send a non-error diagnostic message to Sentry (e.g., "user completed onboarding").
 * Falls back to console.log when Sentry isn't initialised.
 *
 * Useful for tracking important business events without throwing errors.
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  if (!initialised) {
    console.log(`[monitoring:${level}]`, message);
    return;
  }
  Sentry.captureMessage(message, level);
}

/**
 * Associate subsequent Sentry events with a specific user ID.
 * Call this after a successful login and again with `null` on logout.
 * This lets you look up all errors a specific user has seen in the Sentry dashboard.
 */
export function setUserContext(userId: string | null) {
  if (!initialised) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/**
 * A React error boundary component powered by Sentry when the DSN is configured.
 * Wrap any subtree with this to catch render-time errors and display a fallback UI.
 * Example: <ErrorBoundary fallback={<p>Something went wrong</p>}>...</ErrorBoundary>
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * A higher-order component that wraps a component with Sentry profiling.
 * Use on performance-critical components to measure their render time in Sentry.
 */
export const withProfiler = Sentry.withProfiler;
