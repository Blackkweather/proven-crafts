// =============================================================================
// AUTH — src/lib/auth.tsx
// =============================================================================
// Central authentication module for Skill Network.
//
// HOW IT WORKS:
//   1. On app load, we call supabase.auth.getSession() to restore any existing
//      session from localStorage (so users don't have to log in on every visit).
//   2. supabase.auth.onAuthStateChange() listens for future auth events
//      (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED) and keeps state in sync.
//   3. After identifying the user, we load their "profile" row (display name,
//      bio, avatar, etc.) and their "user_roles" (talent / company / admin)
//      from the Supabase database.
//   4. The AuthContext exposes all of this — user, profile, roles, loading —
//      so any component can call useAuth() to access it.
//   5. The freshSignIn flag fires once after a new login (not on page reload).
//      PostAuthRedirect in __root.tsx watches this and sends the user to either
//      onboarding or their dashboard.
//
// DATA FLOW:
//   Supabase Auth ──► onAuthStateChange ──► loadProfileAndRoles ──► AuthContext
//                                                                      │
//                                                          useAuth() in components
//
// KEYWORDS: AUTH, LOGIN, DATABASE, STATE
// =============================================================================

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { setUserContext } from "@/lib/monitoring";

// =============================================================================
// TYPES
// =============================================================================

// The three user roles in the system.
// Each role unlocks different dashboards and features.
export type Role = "talent" | "company" | "admin";

// Used during sign-up to determine which onboarding flow to show.
export type AccountType = "talent" | "company";

// A row from the "profiles" table in Supabase.
// Stores editable user data separate from the auth.users table.
export interface ProfileRow {
  id: string;                          // Matches auth.users.id
  display_name: string;
  headline: string;                    // Short bio line (e.g. "Senior React Dev")
  bio: string;                         // Longer description
  avatar_url: string | null;           // Supabase Storage URL or null
  account_type: AccountType;           // "talent" or "company"
  onboarding_completed_at: string | null; // null = hasn't finished onboarding
}

// Everything exposed through the AuthContext
interface AuthCtx {
  user: User | null;          // Supabase auth user object
  session: Session | null;    // Full JWT session (includes access_token)
  profile: ProfileRow | null; // DB profile row for this user
  roles: Role[];              // All roles assigned (e.g. ["talent"])
  primaryRole: Role | null;   // First role — used for dashboard routing
  loading: boolean;           // True during the initial session check
  freshSignIn: boolean;       // True immediately after a new login event
  consumeFreshSignIn: () => void;  // Call to reset freshSignIn to false
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string, accountType: AccountType) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>; // Re-fetches profile + roles from DB
}

const Ctx = createContext<AuthCtx | null>(null);

// =============================================================================
// DATABASE — loadProfileAndRoles
// =============================================================================
// Fetches the user's profile row and role list from Supabase in parallel.
// Called after every auth event so the context stays up-to-date with the DB.
//
// Tables accessed:
//   - profiles    → display name, avatar, onboarding status
//   - user_roles  → role assignments (talent / company / admin)
//
// KEYWORDS: DATABASE, AUTH
// =============================================================================
async function loadProfileAndRoles(userId: string) {
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  return {
    profile: (profile ?? null) as ProfileRow | null,
    roles: (roleRows ?? []).map((r) => r.role as Role),
  };
}

// =============================================================================
// AUTH PROVIDER — AuthProvider
// =============================================================================
// React context provider that wraps the entire app (mounted in __root.tsx).
// Manages all auth state and exposes it to child components via useAuth().
//
// STATE managed here:
//   - session, user        → from Supabase auth
//   - profile, roles       → loaded from DB after auth
//   - loading              → true during initial session restore
//   - freshSignIn          → flags a new login so PostAuthRedirect can fire
//
// KEYWORDS: AUTH, STATE, DATABASE
// =============================================================================
export function AuthProvider({ children }: { children: ReactNode }) {
  // STATE: Core auth state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // STATE: freshSignIn is true only on a new login — not on session restore.
  // Used by PostAuthRedirect to navigate the user to the right place.
  const [freshSignIn, setFreshSignIn] = useState(false);

  // Ref tracks whether the initial getSession() call has finished.
  // This lets us distinguish a real SIGNED_IN event from the initial load.
  const initialLoadDone = useRef(false);

  // DATABASE: Hydrates all state from a Supabase session object
  const hydrate = async (s: Session | null) => {
    setSession(s);
    setUser(s?.user ?? null);
    setUserContext(s?.user?.id ?? null); // For error monitoring (e.g. Sentry)

    if (!s?.user) {
      setProfile(null);
      setRoles([]);
      return;
    }

    // Load profile + roles from DB in parallel
    const { profile, roles } = await loadProfileAndRoles(s.user.id);
    setProfile(profile);
    setRoles(roles);
  };

  useEffect(() => {
    // Skip on server-side render (no localStorage available)
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // AUTH: Subscribe to future auth events BEFORE checking the existing session.
    // This prevents a race where a sign-in event fires before the listener is ready.
    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        // Only mark as fresh if the initial load is done (so we don't redirect on page refresh)
        const isFresh = initialLoadDone.current && event === "SIGNED_IN";

        // Defer Supabase calls to avoid deadlocks inside this callback
        setTimeout(() => {
          loadProfileAndRoles(s.user.id).then(({ profile, roles }) => {
            setProfile(profile);
            setRoles(roles);
            // Set freshSignIn AFTER roles load so PostAuthRedirect has role info
            if (isFresh) setFreshSignIn(true);
          });
        }, 0);
      } else {
        // AUTH: User signed out — clear all profile/role state
        setProfile(null);
        setRoles([]);
      }
    });

    // AUTH: Check for an existing session (from localStorage / cookie).
    // This restores the session on page refresh without requiring a new login.
    supabase.auth.getSession().then(({ data }) => {
      hydrate(data.session).finally(() => {
        setLoading(false);
        initialLoadDone.current = true;

        // AUTH: If a session exists after the initial load (e.g. returning from
        // Google OAuth redirect), treat it as a fresh sign-in so PostAuthRedirect fires.
        if (data.session?.user) {
          setFreshSignIn(true);
        }
      });
    });

    // Cleanup: unsubscribe when the provider unmounts
    return () => sub.subscription.unsubscribe();
  }, []);

  // The value object exposed to all child components via useAuth()
  const value: AuthCtx = {
    user,
    session,
    profile,
    roles,
    primaryRole: roles[0] ?? null,
    loading,
    freshSignIn,
    consumeFreshSignIn: () => setFreshSignIn(false),

    // LOGIN: Email + password sign-in via Supabase Auth
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
      // After success, onAuthStateChange fires SIGNED_IN → loads profile/roles → sets freshSignIn
    },

    // AUTH — SIGNUP: Creates a new Supabase auth user.
    // Passes display_name and account_type as user_metadata so the DB trigger
    // can create the profiles row automatically.
    signUp: async (name, email, password, accountType) => {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { display_name: name, account_type: accountType },
        },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // AUTH: Google OAuth — opens a Google sign-in popup/redirect.
    // After the user approves, Google redirects back to our origin URL.
    // Supabase then fires SIGNED_IN in onAuthStateChange.
    signInWithGoogle: async () => {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },

    // AUTH: Signs the user out from Supabase. Clears the local session.
    // After this, onAuthStateChange fires SIGNED_OUT → clears profile/roles.
    signOut: async () => {
      await supabase.auth.signOut();
    },

    // DATABASE: Manually refreshes profile + roles from the DB.
    // Useful after the user edits their profile so the header updates immediately.
    refresh: async () => {
      if (!user) return;
      const { profile, roles } = await loadProfileAndRoles(user.id);
      setProfile(profile);
      setRoles(roles);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// =============================================================================
// useAuth — Hook
// =============================================================================
// Call this in any component to access auth state and methods.
//
// Example:
//   const { user, profile, loading, signOut } = useAuth();
//
// KEYWORD: AUTH
// =============================================================================
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}

// =============================================================================
// dashboardPathFor — Helper
// =============================================================================
// Returns the correct dashboard URL for a given role.
// Used after login to send users to the right place.
//
// Role → Path mapping:
//   company → /company
//   admin   → /admin
//   talent  → /app  (default)
//
// KEYWORDS: AUTH, NAVIGATION
// =============================================================================
export function dashboardPathFor(role: Role | null): string {
  if (role === "company") return "/company";
  if (role === "admin") return "/admin";
  return "/app";
}
