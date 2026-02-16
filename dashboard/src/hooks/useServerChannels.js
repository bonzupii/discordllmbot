import { useState, useEffect, useCallback } from 'react';
import { serversApi } from '../services/api';

export function useServerChannels(guildId) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChannels = useCallback(async () => {
    if (!guildId || loading) return;
    
    setLoading(true);
    try {
      const response = await serversApi.getChannels(guildId);
      setChannels(response.data);
      setError(null);
    } catch (err) {
      setError(err);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [guildId, loading]);

  useEffect(() => {
    if (guildId) {
      fetchChannels();
    }
  }, [guildId, fetchChannels]);

  return { 
    channels, 
    loading, 
    error,
    refetch: fetchChannels 
  };
}
