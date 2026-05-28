// =============================================================================
// hooks.ts — src/lib/hooks.ts
// =============================================================================
// React custom hooks that wrap the database functions in db.ts.
// Each hook manages its own loading/error state so components don't have to.
// Several hooks also set up Supabase Realtime subscriptions for live updates
// (e.g., new messages appear instantly without polling).
//
// Import from this file in React components instead of calling db.ts directly —
// hooks handle the async lifecycle, whereas db.ts functions are plain async
// functions that you'd have to manage manually with useEffect + useState.
//
// KEYWORDS: STATE, DATABASE, API
// =============================================================================

/**
 * hooks.ts — React hooks wrapping db.ts for use in components.
 * Each hook handles loading / error state and, where applicable, sets up
 * Supabase Realtime subscriptions for live updates.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchProfile,
  fetchJobs,
  fetchJob,
  fetchChallenges,
  fetchChallenge,
  fetchMyApplications,
  fetchMySubmissions,
  fetchCompanyPipeline,
  fetchConversations,
  fetchMessages,
  fetchNotifications,
  fetchUnreadCounts,
  markNotificationsRead,
  fetchLeaderboard,
  fetchMarketRates,
  fetchPlatformStats,
  searchAll,
  type FullProfile,
  type Job,
  type Challenge,
  type Application,
  type Submission,
  type Conversation,
  type Message,
  type Notification,
  type UnreadCounts,
  type LeaderboardEntry,
  type MarketRate,
  type PlatformStats,
  type SearchResults,
} from "./db";

// ---------------------------------------------------------------------------
// Internal utility
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// useProfile
// ---------------------------------------------------------------------------

/**
 * Fetch a user's full profile (profile row + skills array + portfolio array).
 * Re-fetches automatically when userId changes.
 * Returns individual properties so destructuring is convenient for components.
 *
 * STATE: tracks `data` (FullProfile), `loading` (boolean), and `error` (string|null).
 * DATABASE: calls fetchProfile(userId) from db.ts.
 */
export function useProfile(userId?: string) {
  // STATE: data holds the full profile bundle; null while loading or if userId is absent
  const [data, setData] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `load` is memoized with useCallback so it only changes when userId changes.
  // This prevents the useEffect below from re-running on unrelated renders.
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProfile(userId);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Return flattened fields for ergonomic destructuring in components
  return {
    profile: data?.profile ?? null,
    skills: data?.skills ?? [],
    portfolio: data?.portfolio ?? [],
    loading,
    error,
    refetch: load,
  };
}

// ---------------------------------------------------------------------------
// useJobs
// ---------------------------------------------------------------------------

/**
 * Fetch the list of open jobs, optionally filtered by a search query.
 * Re-fetches when the query changes (e.g., user types in a filter box).
 *
 * STATE: tracks `jobs` array, `loading`, and `error`.
 * DATABASE: calls fetchJobs(query) from db.ts.
 */
export function useJobs(query?: string) {
  // STATE: jobs is the array of job results, empty until loaded
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJobs(await fetchJobs(query));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  return { jobs, loading, error, refetch: load };
}

// ---------------------------------------------------------------------------
// useJob
// ---------------------------------------------------------------------------

/**
 * Fetch a single job by ID.
 * Uses a `cancelled` flag pattern to avoid setting state on an unmounted component
 * (which would cause a React memory leak warning).
 *
 * STATE: tracks `job` (Job|null), `loading`, and `error`.
 * DATABASE: calls fetchJob(jobId) from db.ts.
 */
export function useJob(jobId: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    // `cancelled` prevents a resolved promise from setting state after the
    // component that called this hook has been removed from the page
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchJob(jobId)
      .then((d) => {
        if (!cancelled) setJob(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load job");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return { job, loading, error };
}

// ---------------------------------------------------------------------------
// useChallenges
// ---------------------------------------------------------------------------

/**
 * Fetch the list of open challenges, optionally filtered by a search query.
 *
 * STATE: tracks `challenges` array, `loading`, and `error`.
 * DATABASE: calls fetchChallenges(query) from db.ts.
 */
export function useChallenges(query?: string) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChallenges(await fetchChallenges(query));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  return { challenges, loading, error, refetch: load };
}

// ---------------------------------------------------------------------------
// useChallenge
// ---------------------------------------------------------------------------

/**
 * Fetch a single challenge by ID.
 *
 * STATE: tracks `challenge` (Challenge|null), `loading`, and `error`.
 * DATABASE: calls fetchChallenge(challengeId) from db.ts.
 */
export function useChallenge(challengeId: string) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!challengeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchChallenge(challengeId)
      .then((d) => {
        if (!cancelled) setChallenge(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load challenge");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  return { challenge, loading, error };
}

// ---------------------------------------------------------------------------
// useMyApplications
// ---------------------------------------------------------------------------

/**
 * Fetch the current talent user's job applications.
 * Returns an empty array if talentId is not yet available (e.g., auth is loading).
 *
 * STATE: tracks `applications` array, `loading`, and `error`.
 * DATABASE: calls fetchMyApplications(talentId) from db.ts.
 */
export function useMyApplications(talentId?: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!talentId) return;
    setLoading(true);
    setError(null);
    try {
      setApplications(await fetchMyApplications(talentId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [talentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { applications, loading, error, refetch: load };
}

// ---------------------------------------------------------------------------
// useMySubmissions
// ---------------------------------------------------------------------------

/**
 * Fetch the current talent user's challenge submissions.
 *
 * STATE: tracks `submissions` array, `loading`, and `error`.
 * DATABASE: calls fetchMySubmissions(talentId) from db.ts.
 */
export function useMySubmissions(talentId?: string) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!talentId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMySubmissions(talentId)
      .then((d) => {
        if (!cancelled) setSubmissions(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load submissions");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [talentId]);

  return { submissions, loading, error };
}

// ---------------------------------------------------------------------------
// useCompanyPipeline
// ---------------------------------------------------------------------------

/**
 * Fetch all job applications across a company's jobs (the hiring pipeline).
 * Optionally filtered by status for Kanban-style board views.
 *
 * STATE: tracks `applications` array, `loading`, and `error`.
 * DATABASE: calls fetchCompanyPipeline(companyId, status) from db.ts.
 */
export function useCompanyPipeline(companyId?: string, status?: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      setApplications(await fetchCompanyPipeline(companyId, status));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [companyId, status]);

  useEffect(() => {
    load();
  }, [load]);

  return { applications, loading, error, refetch: load };
}

// ---------------------------------------------------------------------------
// useConversations
// ---------------------------------------------------------------------------

/**
 * Fetch all conversations for the current user.
 *
 * STATE: tracks `conversations` array, `loading`, and `error`.
 * DATABASE: calls fetchConversations(userId) from db.ts.
 */
export function useConversations(userId?: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setConversations(await fetchConversations(userId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { conversations, loading, error, refetch: load };
}

// ---------------------------------------------------------------------------
// useMessages (with Realtime subscription)
// ---------------------------------------------------------------------------

/**
 * Fetch messages for a conversation AND subscribe to new messages in real time.
 * When a new message arrives via the Supabase Realtime channel, it is appended
 * to the local `messages` state immediately — no need to poll.
 *
 * Duplicate prevention: if the sender already added an optimistic update with
 * the same ID, the incoming real-time message is discarded.
 *
 * STATE: tracks `messages` array, `loading`, and `error`.
 * DATABASE: initial load calls fetchMessages(conversationId) from db.ts.
 * API: subscribes to `postgres_changes` on the `messages` table via Supabase Realtime.
 */
export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMessages(conversationId)
      .then((d) => {
        if (!cancelled) setMessages(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load messages");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Realtime subscription for new messages
  // This runs a second useEffect so the subscription lifecycle is independent
  // of the initial data load lifecycle
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates if the sender's optimistic update already added it
            const incoming = payload.new as Message;
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        },
      )
      .subscribe();

    // Cleanup: unsubscribe when the component unmounts or conversationId changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, error };
}

// ---------------------------------------------------------------------------
// useNotifications
// ---------------------------------------------------------------------------

/**
 * Fetch notifications and provide a `markAllRead` action.
 * The `unreadCount` is derived from the loaded data so it stays in sync
 * without an extra DB query.
 *
 * STATE: tracks `notifications` array, `loading`, `error`, and derived `unreadCount`.
 * DATABASE: calls fetchNotifications(userId) and markNotificationsRead(userId) from db.ts.
 */
export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setNotifications(await fetchNotifications(userId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Derived state: count notifications that don't yet have a read_at timestamp
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  /**
   * Mark all notifications as read both in the DB and in local state.
   * We optimistically update local state without waiting for a refetch,
   * so the badge clears instantly when the user opens the panel.
   */
  const markAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      await markNotificationsRead(userId);
      // Optimistically update local state so the badge clears immediately
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      );
    } catch (e: unknown) {
      console.error(
        "Failed to mark notifications read:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }, [userId]);

  return { notifications, setNotifications, loading, error, unreadCount, markAllRead };
}

// ---------------------------------------------------------------------------
// useUnreadCounts (polls every 30 s + Realtime for instant updates)
// ---------------------------------------------------------------------------

/**
 * Track the count of unread messages and notifications for the nav badge.
 * Uses two strategies together for freshness vs. efficiency:
 *   1. Polls the DB every 30 seconds (catches missed Realtime events)
 *   2. Increments counts instantly via a Realtime subscription (no perceived lag)
 *
 * STATE: tracks `counts` (UnreadCounts), `loading`.
 * DATABASE: calls fetchUnreadCounts(userId) from db.ts.
 * API: subscribes to `notifications` and `messages` inserts via Supabase Realtime.
 */
export function useUnreadCounts(userId?: string) {
  // STATE: starts at zero so the badge shows nothing before the first fetch
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0 });
  const [loading, setLoading] = useState(false);
  // Store the interval ID in a ref (not state) so it doesn't cause re-renders
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await fetchUnreadCounts(userId);
      setCounts(result);
    } catch {
      // Swallow — badge counts are non-critical
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));

    // Poll every 30 seconds as a safety net for missed Realtime events
    intervalRef.current = setInterval(refresh, 30_000);

    // Realtime: increment badge instantly on new notification or message
    const channel = supabase
      .channel(`unread-counts:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        // Increment notification count immediately — no round-trip needed
        () => setCounts((prev) => ({ ...prev, notifications: prev.notifications + 1 })),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        // For messages we re-query so we only count messages in our conversations
        () => refresh(),
      )
      .subscribe();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { messages: counts.messages, notifications: counts.notifications, loading };
}

// ---------------------------------------------------------------------------
// useLeaderboard
// ---------------------------------------------------------------------------

/**
 * Fetch the challenge leaderboard (all entries, sorted by rank).
 *
 * STATE: tracks `entries` (LeaderboardEntry[]), `loading`, and `error`.
 * DATABASE: calls fetchLeaderboard() from db.ts.
 */
export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLeaderboard()
      .then((d) => {
        if (!cancelled) setEntries(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load leaderboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { entries, loading, error };
}

// ---------------------------------------------------------------------------
// useMarketRates
// ---------------------------------------------------------------------------

/**
 * Fetch market rate data, optionally for a specific list of skills.
 * The `skillsKey` derived value is a stable string representation of the skills
 * array so the effect only re-runs when the actual content changes, not every
 * time the parent component re-renders with a new (but equal) inline array.
 *
 * STATE: tracks `rates` (MarketRate[]), `loading`, and `error`.
 * DATABASE: calls fetchMarketRates(skills) from db.ts.
 */
export function useMarketRates(skills?: string[]) {
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable key so we don't re-fetch on every render when skills is an inline array
  const skillsKey = skills ? skills.slice().sort().join(",") : "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMarketRates(skills && skills.length > 0 ? skills : undefined)
      .then((d) => {
        if (!cancelled) setRates(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load market rates");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsKey]);

  return { rates, loading, error };
}

// ---------------------------------------------------------------------------
// useSearch (debounced 300 ms)
// ---------------------------------------------------------------------------

/**
 * Debounced global search hook.
 * Waits 300ms after the user stops typing before firing the query. This prevents
 * a DB request for every keystroke and keeps the UI snappy.
 *
 * Returns immediately with empty results when query is blank so the UI shows
 * a prompt instead of a spinner.
 *
 * STATE: tracks `results` (SearchResults), `loading`.
 * DATABASE: calls searchAll(query) from db.ts after a 300ms debounce.
 */
export function useSearch(query: string) {
  // STATE: results holds the last fetched search results across all three categories
  const [results, setResults] = useState<SearchResults>({ jobs: [], challenges: [], talent: [] });
  const [loading, setLoading] = useState(false);
  // Store the debounce timer ID in a ref so it persists across renders without
  // causing re-renders itself
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ jobs: [], challenges: [], talent: [] });
      setLoading(false);
      return;
    }

    setLoading(true);

    // Cancel any pending debounce timer from the previous keystroke
    if (timerRef.current) clearTimeout(timerRef.current);

    // Wait 300ms before firing the actual search query
    timerRef.current = setTimeout(async () => {
      try {
        const data = await searchAll(query);
        setResults(data);
      } catch (e: unknown) {
        console.error("Search failed:", e instanceof Error ? e.message : String(e));
        setResults({ jobs: [], challenges: [], talent: [] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { results, loading };
}

// ---------------------------------------------------------------------------
// usePlatformStats
// ---------------------------------------------------------------------------

/**
 * Fetches platform-wide counts for use on marketing and onboarding pages.
 * Fetches once on mount — no realtime subscription needed for these counters.
 *
 * DATABASE: calls fetchPlatformStats() from db.ts.
 */
export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
