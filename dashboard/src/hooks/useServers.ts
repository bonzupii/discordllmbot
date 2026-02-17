import { useState, useEffect, useCallback } from 'react';
import { serversApi, botInfoApi } from '@services';
import type { Server, BotInfo } from '@types';

export function useServers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

  const fetchBotInfo = useCallback(async () => {
    try {
      const response = await botInfoApi.getBotInfo();
      setBotInfo(response.data);
    } catch {
      // Silently fail - bot info is not critical
    }
  }, []);

  const leaveServer = useCallback(async (serverId: string) => {
    await serversApi.leaveServer(serverId);
    await fetchServers();
  }, [fetchServers]);

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
