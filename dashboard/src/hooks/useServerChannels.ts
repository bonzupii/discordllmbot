import { useState, useEffect, useCallback } from 'react';
import { serversApi } from '@services';
import type { Channel } from '@types';

export function useServerChannels(guildId: string) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await serversApi.getChannels(guildId);
      setChannels(response.data);
      setError(null);
    } catch {
      setError(new Error('Failed to fetch channels'));
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return { channels, loading, error, refetch: fetchChannels };
}
