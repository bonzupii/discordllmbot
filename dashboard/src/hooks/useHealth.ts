/**
 * Hook for polling bot health status
 * @module hooks/useHealth
 */

import { useState, useEffect, useCallback } from 'react';
import { healthApi } from '@services';
import type { HealthResponse } from '@types';

/** Default polling interval in milliseconds */
const POLLING_INTERVAL = 5000;

/**
 * Hook to get bot health status with optional polling
 * @param pollingInterval - How often to refetch (0 to disable polling)
 */
export function useHealth(pollingInterval = POLLING_INTERVAL) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch current health status
   */
  const fetchHealth = useCallback(async () => {
    try {
      const response = await healthApi.getHealth();
      setHealth(response.data);
      setError(null);
    } catch {
      setError(new Error('Failed to fetch health status'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and optional polling
  useEffect(() => {
    fetchHealth();

    if (pollingInterval > 0) {
      const interval = setInterval(fetchHealth, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [fetchHealth, pollingInterval]);

  return { health, loading, error, refetch: fetchHealth };
}
