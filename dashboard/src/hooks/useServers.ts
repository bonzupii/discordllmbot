/**
 * Hook for fetching and managing the list of Discord servers
 * @module hooks/useServers
 */

import { useState, useEffect, useCallback } from 'react';
import { serversApi, botInfoApi } from '@services';
import type { Server, BotInfo } from '@types';

/**
 * Hook to get all servers the bot is connected to
 * @returns Server list, bot info, loading state, and actions
 */
export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch all servers from the API
   */
  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await serversApi.getServers();
      setServers(response.data);
      setError(null);
    } catch {
      setError(new Error('Failed to fetch servers'));
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch bot information (client ID, invite URL)
   */
  const fetchBotInfo = useCallback(async () => {
    try {
      const response = await botInfoApi.getBotInfo();
      setBotInfo(response.data);
    } catch {
      // Silently fail - bot info is not critical
    }
  }, []);

  /**
   * Remove the bot from a server
   * @param serverId - Discord server ID to leave
   */
  const leaveServer = useCallback(async (serverId: string) => {
    await serversApi.leaveServer(serverId);
    await fetchServers();
  }, [fetchServers]);

  // Fetch servers and bot info on mount
  useEffect(() => {
    Promise.all([fetchServers(), fetchBotInfo()]).catch(() => {
      setError(new Error('Failed to fetch data'));
    });
  }, [fetchServers, fetchBotInfo]);

  return {
    servers,
    botInfo,
    loading,
    error,
    refetch: fetchServers,
    leaveServer
  };
}
