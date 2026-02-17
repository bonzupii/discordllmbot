import { useState, useEffect, useCallback } from 'react';
import { healthApi } from '@services';
import type { HealthResponse } from '@types';

const POLLING_INTERVAL = 5000;

export function useHealth(pollingInterval = POLLING_INTERVAL) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

  useEffect(() => {
    fetchHealth();

    if (pollingInterval > 0) {
      const interval = setInterval(fetchHealth, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [fetchHealth, pollingInterval]);

  return { health, loading, error, refetch: fetchHealth };
}
