import { useState, useEffect, useCallback } from 'react';
import { serversApi, botInfoApi } from '../services/api';

export function useServers() {
  const [servers, setServers] = useState([]);
  const [botInfo, setBotInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await serversApi.getServers();
      setServers(response.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBotInfo = useCallback(async () => {
    try {
      const response = await botInfoApi.getBotInfo();
      setBotInfo(response.data);
    } catch (err) {
      // Silently fail - bot info is not critical
    }
  }, []);

  const leaveServer = useCallback(async (serverId) => {
    await serversApi.leaveServer(serverId);
    await fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    Promise.all([fetchServers(), fetchBotInfo()]).catch((err) => {
      setError(err);
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
