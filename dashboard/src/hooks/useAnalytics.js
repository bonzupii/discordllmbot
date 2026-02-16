import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../services/api';

const DEFAULT_POLLING_INTERVAL = 30000;

export function useAnalytics(pollingInterval = DEFAULT_POLLING_INTERVAL) {
  const [stats, setStats] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    } catch (err) {
      setError(err);
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
