/**
 * Hook for fetching server-specific configuration
 * @module hooks/useServerConfig
 */

import { useState, useEffect, useCallback } from 'react';
import { serversApi } from '@services';
import type { ServerConfig } from '@types';

/**
 * Hook to get a specific server's configuration
 * @param guildId - Discord server ID
 */
export function useServerConfig(guildId: string) {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch server config
   */
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await serversApi.getServerConfig(guildId);
      setConfig(response.data);
      setError(null);
    } catch {
      setError(new Error('Failed to fetch server config'));
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  // Fetch on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, error, refetch: fetchConfig };
}
