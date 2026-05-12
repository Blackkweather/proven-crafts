/**
 * Observability — wraps Sentry for frontend error tracking.
 * Configure VITE_SENTRY_DSN in your environment to enable.
 * When DSN is absent, all calls are no-ops so dev builds stay clean.
 */

import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const IS_PROD = import.meta.env.PROD as boolean;

let initialised = false;

export function initMonitoring() {
  if (initialised || !DSN) return;
  initialised = true;

  Sentry.init({
    dsn: DSN,
    environment: IS_PROD ? "production" : "development",
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    tracesSampleRate: IS_PROD ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: IS_PROD ? 1.0 : 0,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    beforeSend(event) {
      // Strip email addresses from breadcrumb messages before sending to Sentry
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

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  if (!initialised) {
    console.log(`[monitoring:${level}]`, message);
    return;
  }
  Sentry.captureMessage(message, level);
}

export function setUserContext(userId: string | null) {
  if (!initialised) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/** React error boundary powered by Sentry when DSN is set. */
export const ErrorBoundary = Sentry.ErrorBoundary;
export const withProfiler = Sentry.withProfiler;
