import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { analyticsApi, interviewApi, userApi, type SessionListItem, type UserProfile } from "@/services/apiClient";

export interface OverviewData {
  total_sessions: number;
  completed_sessions: number;
  average_score: number;
  highest_score?: number;
  performance_trend: string;
  recent_scores: number[];
}

export interface ProgressData {
  score_timeline: { date: string; score: number; mode: string; readiness: string }[];
  top_strengths?: { item: string; count: number }[];
  top_improvements?: { item: string; count: number }[];
}

/**
 * Everything the dashboard shows, fetched as before (moved verbatim from
 * Dashboard.tsx): profile with auth fallback, 20 sessions, overview + progress,
 * and a refetch whenever the tab regains focus. New: `loading` (true until the
 * first fetch settles, so the page shows skeletons rather than zeros) and
 * `sessionsError` / `analyticsError`, so a failed request is never rendered as
 * an empty account or a row of zeros.
 */
export function useDashboardData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [sessionsError, setSessionsError] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);

  const fetchProfile = async () => {
    try {
      const data = await userApi.getProfile();
      setProfile(data);
    } catch (error) {
      // Fallback to auth-context user metadata
      setProfile({
        uid: user?.uid || "",
        email: user?.email || undefined,
        display_name: user?.displayName || user?.email?.split("@")[0] || "User",
        avatar_url: user?.photoURL || undefined,
      });
    }
  };

  const fetchSessions = async (): Promise<boolean> => {
    try {
      const data = await interviewApi.listSessions(20);
      setSessions(data);
      setSessionsError(false);
      return true;
    } catch (error) {
      setSessionsError(true);
      toast({
        title: "Error Loading Sessions",
        description: "Failed to load your interview sessions. Please try refreshing.",
        variant: "destructive",
      });
      return false;
    }
  };

  const fetchAnalytics = async (): Promise<boolean> => {
    try {
      const [ov, prog] = await Promise.all([analyticsApi.getOverview(), analyticsApi.getProgress()]);
      setOverview(ov as OverviewData);
      setProgress(prog as ProgressData);
      setAnalyticsError(false);
      return true;
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalyticsError(true);
      return false;
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([fetchProfile(), fetchSessions(), fetchAnalytics()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        fetchSessions();
        fetchAnalytics();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchSessions();
        fetchAnalytics();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  /** Refetches and says what actually happened (the old version always said "Refreshed"). */
  const refresh = async () => {
    const [sessionsOk, analyticsOk] = await Promise.all([fetchSessions(), fetchAnalytics()]);
    if (sessionsOk && analyticsOk) {
      toast({ title: "Refreshed", description: "Data has been refreshed successfully." });
    } else {
      toast({ title: "Refresh Failed", description: "Unable to refresh data. Please try again.", variant: "destructive" });
    }
  };

  return { loading, profile, sessions, overview, progress, sessionsError, analyticsError, refresh };
}
