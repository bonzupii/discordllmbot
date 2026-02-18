/**
 * Hook for fetching server channels
 * @module hooks/useServerChannels
 */

import { useState, useEffect, useCallback } from 'react';
import { serversApi } from '@services';
import type { Channel } from '@types';

/**
 * Hook to get channel list for a server
 * @param guildId - Discord server ID
 */
export function useServerChannels(guildId: string) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch channels
   */
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

  // Fetch on mount
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return { channels, loading, error, refetch: fetchChannels };
}
