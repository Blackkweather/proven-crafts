// =============================================================================
// env.ts — src/lib/env.ts
// =============================================================================
// Startup environment validation. This file is imported once at app entry
// (main.tsx) and throws immediately if required environment variables are
// missing or malformed. Failing fast with a clear error message prevents
// mysterious "blank screen" failures caused by missing configuration.
//
// In production it also renders the error message directly into the page DOM
// so the team can diagnose deployment issues without opening the browser console.
//
// KEYWORDS: VALIDATION
// =============================================================================

/**
 * Startup environment validation.
 * Imported once at app entry — throws immediately if required vars are missing
 * so the team sees a clear error instead of mysterious runtime failures.
 */

/** The shape of required environment variables. */
interface EnvSchema {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

/**
 * Read, validate, and return the required environment variables.
 * Throws with a human-readable message listing all missing or invalid vars
 * so the developer or deployment engineer knows exactly what to fix.
 *
 * VALIDATION:
 * - VITE_SUPABASE_URL must be present and start with "https://"
 * - VITE_SUPABASE_PUBLISHABLE_KEY must be present and at least 20 characters
 *
 * In production, the error is also written into the page HTML so it's visible
 * even without the browser console open.
 */
function validateEnv(): EnvSchema {
  const errors: string[] = [];

  // import.meta.env is Vite's way of reading environment variables at build time.
  // Variables must be prefixed with VITE_ to be included in the browser bundle.
  const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const VITE_SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined;

  if (!VITE_SUPABASE_URL) {
    errors.push("VITE_SUPABASE_URL is required");
  } else if (!VITE_SUPABASE_URL.startsWith("https://")) {
    // Guard against accidentally using an http:// URL in production,
    // which would expose auth tokens over an unencrypted connection
    errors.push("VITE_SUPABASE_URL must start with https://");
  }

  if (!VITE_SUPABASE_PUBLISHABLE_KEY) {
    errors.push("VITE_SUPABASE_PUBLISHABLE_KEY is required");
  } else if (VITE_SUPABASE_PUBLISHABLE_KEY.length < 20) {
    // A real Supabase anon key is a long JWT (~200+ chars); a short value
    // indicates it was set to a placeholder like "xxx" or left as an example
    errors.push("VITE_SUPABASE_PUBLISHABLE_KEY looks invalid (too short)");
  }

  if (errors.length > 0) {
    const message = [
      "❌ Skill Network — missing or invalid environment variables:",
      ...errors.map((e) => `  · ${e}`),
      "",
      "Copy .env.example → .env and fill in the values.",
    ].join("\n");

    // In production, surface the error visibly instead of a blank screen.
    // This makes deployment failures immediately obvious without needing DevTools.
    if (typeof document !== "undefined") {
      document.body.innerHTML = `<pre style="font-family:monospace;padding:2rem;color:#dc2626;background:#fff1f2;white-space:pre-wrap">${message}</pre>`;
    }

    throw new Error(message);
  }

  return {
    VITE_SUPABASE_URL: VITE_SUPABASE_URL!,
    VITE_SUPABASE_PUBLISHABLE_KEY: VITE_SUPABASE_PUBLISHABLE_KEY!,
  };
}

/**
 * Validated environment variables, ready to use throughout the app.
 * Import this object instead of reading import.meta.env directly so you
 * always get type-safe, validated values.
 *
 * This runs at module load time — if validation fails, the app stops here
 * rather than silently proceeding with undefined values.
 */
export const env = validateEnv();
