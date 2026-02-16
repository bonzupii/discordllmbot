import { useState, useEffect, useCallback } from 'react';
import { healthApi } from '../services/api';

const POLLING_INTERVAL = 5000;

export function useHealth(pollingInterval = POLLING_INTERVAL) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await healthApi.getHealth();
      setHealth(response.data);
      setError(null);
    } catch (err) {
      setError(err);
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
