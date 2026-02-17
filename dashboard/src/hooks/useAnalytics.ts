import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '@services';
import type { AnalyticsResponse, Reply } from '@types';

const DEFAULT_POLLING_INTERVAL = 30000;

export function useAnalytics(pollingInterval = DEFAULT_POLLING_INTERVAL) {
  const [stats, setStats] = useState<AnalyticsResponse | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, repliesRes] = await Promise.all([
        analyticsApi.getAnalytics(),
        analyticsApi.getReplies(50),
      ]);
      setStats(analyticsRes.data);
      setReplies(repliesRes.data);
      setError(null);
    } catch {
      setError(new Error('Failed to fetch analytics'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (pollingInterval > 0) {
      const interval = setInterval(fetchData, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, pollingInterval]);

  return { stats, replies, loading, error, refetch: fetchData };
}
