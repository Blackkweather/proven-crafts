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
  type SearchResults,
} from "./db";

// ---------------------------------------------------------------------------
// Internal utility
// ---------------------------------------------------------------------------

/** A no-op refetch placeholder used before data is first loaded. */
const noop = () => {};

// ---------------------------------------------------------------------------
// useProfile
// ---------------------------------------------------------------------------

export function useProfile(userId?: string) {
  const [data, setData] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

export function useJobs(query?: string) {
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

export function useJob(jobId: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, error };
}

// ---------------------------------------------------------------------------
// useNotifications
// ---------------------------------------------------------------------------

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

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      await markNotificationsRead(userId);
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

  return { notifications, loading, error, unreadCount, markAllRead };
}

// ---------------------------------------------------------------------------
// useUnreadCounts (polls every 30 s + Realtime for instant updates)
// ---------------------------------------------------------------------------

export function useUnreadCounts(userId?: string) {
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0 });
  const [loading, setLoading] = useState(false);
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
        () => setCounts((prev) => ({ ...prev, notifications: prev.notifications + 1 })),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => refresh(), // re-query so we only count messages in our conversations
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

export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResults>({ jobs: [], challenges: [], talent: [] });
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ jobs: [], challenges: [], talent: [] });
      setLoading(false);
      return;
    }

    setLoading(true);

    if (timerRef.current) clearTimeout(timerRef.current);

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
