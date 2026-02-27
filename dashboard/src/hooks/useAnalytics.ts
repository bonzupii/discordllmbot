/**
 * Hook for fetching analytics and reply history
 * @module hooks/useAnalytics
 */

import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '@services';
import type { AnalyticsResponse, Reply, AnalyticsOverview, AnalyticsVolume } from '@types';

/** Default polling interval (30 seconds) */
const DEFAULT_POLLING_INTERVAL = 30000;

/**
 * Hook to get analytics data and recent bot replies
 * @param pollingInterval - How often to refetch (0 to disable)
 */
export function useAnalytics(pollingInterval = DEFAULT_POLLING_INTERVAL) {
    const [stats, setStats] = useState<AnalyticsResponse | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [volume, setVolume] = useState<AnalyticsVolume | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    /**
     * Fetch analytics and replies
     */
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [analyticsRes, repliesRes, overviewRes, volumeRes] = await Promise.all([
                analyticsApi.getAnalytics(),
                analyticsApi.getReplies(50),
                analyticsApi.getOverview(7),
                analyticsApi.getVolume(7),
            ]);
            setStats(analyticsRes.data);
            setReplies(repliesRes.data);
            setOverview(overviewRes.data);
            setVolume(volumeRes.data);
            setError(null);
        } catch {
            setError(new Error('Failed to fetch analytics'));
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on mount and optionally poll
    useEffect(() => {
        fetchData();

        if (pollingInterval > 0) {
            const interval = setInterval(fetchData, pollingInterval);
            return () => clearInterval(interval);
        }
    }, [fetchData, pollingInterval]);

    return { stats, replies, overview, volume, loading, error, refetch: fetchData };
}
