import { useState, useEffect, useCallback } from 'react';
import { serversApi } from '@services';
import type { Relationship } from '@types';

export function useServerRelationships(guildId: string) {
  const [relationships, setRelationships] = useState<Record<string, Relationship>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchRelationships = useCallback(async () => {
    setLoading(true);
    try {
      const response = await serversApi.getRelationships(guildId);
      setRelationships(response.data);
      setError(null);
    } catch {
      setError(new Error('Failed to fetch relationships'));
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  return { relationships, loading, error, refetch: fetchRelationships };
}
