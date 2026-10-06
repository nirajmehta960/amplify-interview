import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { analyticsApi } from "@/services/apiClient";
import type { AnalyticsOverview, AnalyticsProgress, AnalyticsSkills } from "./analytics";

/**
 * Overview + progress (+ skills when asked) for Progress and Insights. One
 * request set, one `error`: a failure is shown as a failure, never as an
 * account with no interviews.
 */
export function useAnalytics({ skills: withSkills = false }: { skills?: boolean } = {}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [progress, setProgress] = useState<AnalyticsProgress | null>(null);
  const [skills, setSkills] = useState<AnalyticsSkills | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, prog, sk] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getProgress(),
        withSkills ? analyticsApi.getSkills() : Promise.resolve(null),
      ]);
      setOverview(ov as AnalyticsOverview);
      setProgress(prog as AnalyticsProgress);
      setSkills(sk as AnalyticsSkills | null);
      setError(false);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [withSkills]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  return { loading, error, overview, progress, skills, retry: load };
}
