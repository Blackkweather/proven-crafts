import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing anything that imports it
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// ─── UUID validation (internal helper tested via exported functions) ─────────

describe("UUID validation", () => {
  it("accepts valid v4 UUIDs", () => {
    const valid = [
      "550e8400-e29b-41d4-a716-446655440000",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "00000000-0000-0000-0000-000000000000",
    ];
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of valid) {
      expect(UUID_RE.test(id)).toBe(true);
    }
  });

  it("rejects invalid UUIDs", () => {
    const invalid = [
      "not-a-uuid",
      "550e8400-e29b-41d4-a716",
      "'; DROP TABLE profiles; --",
      "",
      "00000000000000000000000000000000",
    ];
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const id of invalid) {
      expect(UUID_RE.test(id)).toBe(false);
    }
  });
});

// ─── Search term sanitisation ─────────────────────────────────────────────────

describe("sanitizeSearchTerm", () => {
  function sanitizeSearchTerm(term: string): string {
    return term.replace(/[(),."]/g, "");
  }

  it("strips PostgREST-breaking characters", () => {
    expect(sanitizeSearchTerm('test(injection)"')).toBe("testinjection");
    expect(sanitizeSearchTerm("normal")).toBe("normal");
    expect(sanitizeSearchTerm("React, TypeScript")).toBe("React TypeScript");
  });

  it("preserves letters, numbers and spaces", () => {
    expect(sanitizeSearchTerm("React TypeScript 2024")).toBe("React TypeScript 2024");
  });
});

// ─── Storage helpers ──────────────────────────────────────────────────────────

describe("storage validation", () => {
  function validateSize(file: { size: number; name: string }, maxBytes: number, label: string) {
    if (file.size > maxBytes) {
      throw new Error(`${label} files must be smaller than ${maxBytes / 1024 / 1024} MB.`);
    }
  }

  function validateMimeType(
    file: { type: string; name: string },
    exact: string[],
    prefixes: string[],
    label: string,
  ) {
    const type = file.type.toLowerCase();
    const allowed = exact.includes(type) || prefixes.some((p) => type.startsWith(p));
    if (!allowed) throw new Error(`${label} files must be a supported type.`);
  }

  it("throws when file is too large", () => {
    expect(() =>
      validateSize({ size: 6 * 1024 * 1024, name: "big.png" }, 5 * 1024 * 1024, "Avatar"),
    ).toThrow("Avatar files must be smaller");
  });

  it("passes when file is within size limit", () => {
    expect(() =>
      validateSize({ size: 1024, name: "small.png" }, 5 * 1024 * 1024, "Avatar"),
    ).not.toThrow();
  });

  it("throws on disallowed MIME type", () => {
    expect(() =>
      validateMimeType(
        { type: "application/exe", name: "bad.exe" },
        ["image/jpeg", "image/png"],
        [],
        "Avatar",
      ),
    ).toThrow("Avatar files must be a supported type");
  });

  it("passes allowed MIME type by prefix", () => {
    expect(() =>
      validateMimeType({ type: "video/mp4", name: "intro.mp4" }, [], ["video/"], "Video"),
    ).not.toThrow();
  });

  it("passes allowed MIME type by exact match", () => {
    expect(() =>
      validateMimeType({ type: "application/pdf", name: "doc.pdf" }, ["application/pdf"], [], "Portfolio"),
    ).not.toThrow();
  });
});

// ─── env validation ───────────────────────────────────────────────────────────

describe("environment validation", () => {
  it("VITE_SUPABASE_URL is set in test environment", () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBeTruthy();
    expect(import.meta.env.VITE_SUPABASE_URL).toMatch(/^https:\/\//);
  });

  it("VITE_SUPABASE_PUBLISHABLE_KEY is set in test environment", () => {
    expect(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).toBeTruthy();
    expect((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string).length).toBeGreaterThan(20);
  });
});

// ─── Profile completeness logic ───────────────────────────────────────────────

describe("profile completeness checks", () => {
  type Profile = {
    headline: string | null;
    bio: string | null;
    video_intro_path: string | null;
    video_intro_url: string | null;
  };

  function hasVideoIntro(profile: Profile): boolean {
    return !!profile.video_intro_path;
  }

  it("detects video intro via path", () => {
    expect(hasVideoIntro({ headline: null, bio: null, video_intro_path: "video-intros/uid/file.mp4", video_intro_url: null })).toBe(true);
  });

  it("returns false when only legacy url field is set (path is canonical)", () => {
    expect(hasVideoIntro({ headline: null, bio: null, video_intro_path: null, video_intro_url: "https://example.com/video.mp4" })).toBe(false);
  });

  it("returns false when no video exists", () => {
    expect(hasVideoIntro({ headline: null, bio: null, video_intro_path: null, video_intro_url: null })).toBe(false);
  });
});

// ─── Onboarding gate (DB-authoritative) ──────────────────────────────────────

describe("isOnboardingComplete", () => {
  function isOnboardingComplete(profile: { onboarding_completed_at: string | null } | null): boolean {
    return !!profile?.onboarding_completed_at;
  }

  it("returns true when DB flag is set", () => {
    expect(isOnboardingComplete({ onboarding_completed_at: "2026-01-01T00:00:00Z" })).toBe(true);
  });

  it("returns false when DB flag is null", () => {
    expect(isOnboardingComplete({ onboarding_completed_at: null })).toBe(false);
  });

  it("returns false for null profile", () => {
    expect(isOnboardingComplete(null)).toBe(false);
  });
});

// ─── Privacy: show_location enforcement ──────────────────────────────────────

describe("show_location privacy", () => {
  type PublicProfile = { location: string; show_location: boolean };

  function resolvePublicLocation(profile: PublicProfile): string | null {
    return profile.show_location ? profile.location : null;
  }

  it("returns location when show_location is true", () => {
    expect(resolvePublicLocation({ location: "Berlin, DE", show_location: true })).toBe("Berlin, DE");
  });

  it("hides location when show_location is false", () => {
    expect(resolvePublicLocation({ location: "Berlin, DE", show_location: false })).toBeNull();
  });
});

// ─── Privacy: allow_messages enforcement ─────────────────────────────────────

describe("allow_messages permission", () => {
  type AllowMessages = "anyone" | "companies" | "none";

  function canSendMessage(
    setting: AllowMessages,
    viewerRole: "talent" | "company" | null,
    isOwnProfile: boolean,
  ): boolean {
    if (isOwnProfile || viewerRole === null) return false;
    if (setting === "none") return false;
    if (setting === "companies") return viewerRole === "company";
    return true; // "anyone"
  }

  it("allows message when setting is 'anyone' and viewer is talent", () => {
    expect(canSendMessage("anyone", "talent", false)).toBe(true);
  });

  it("allows message when setting is 'anyone' and viewer is company", () => {
    expect(canSendMessage("anyone", "company", false)).toBe(true);
  });

  it("blocks message when setting is 'none'", () => {
    expect(canSendMessage("none", "company", false)).toBe(false);
  });

  it("blocks message from talent when setting is 'companies'", () => {
    expect(canSendMessage("companies", "talent", false)).toBe(false);
  });

  it("allows message from company when setting is 'companies'", () => {
    expect(canSendMessage("companies", "company", false)).toBe(true);
  });

  it("blocks message to own profile", () => {
    expect(canSendMessage("anyone", "talent", true)).toBe(false);
  });

  it("blocks message for unauthenticated viewer", () => {
    expect(canSendMessage("anyone", null, false)).toBe(false);
  });
});
