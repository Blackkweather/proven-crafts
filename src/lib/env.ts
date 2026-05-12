/**
 * Startup environment validation.
 * Imported once at app entry — throws immediately if required vars are missing
 * so the team sees a clear error instead of mysterious runtime failures.
 */

interface EnvSchema {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

function validateEnv(): EnvSchema {
  const errors: string[] = [];

  const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const VITE_SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined;

  if (!VITE_SUPABASE_URL) {
    errors.push("VITE_SUPABASE_URL is required");
  } else if (!VITE_SUPABASE_URL.startsWith("https://")) {
    errors.push("VITE_SUPABASE_URL must start with https://");
  }

  if (!VITE_SUPABASE_PUBLISHABLE_KEY) {
    errors.push("VITE_SUPABASE_PUBLISHABLE_KEY is required");
  } else if (VITE_SUPABASE_PUBLISHABLE_KEY.length < 20) {
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

export const env = validateEnv();
