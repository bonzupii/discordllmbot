import { useState, useEffect, useCallback } from 'react';
import { serversApi } from '../services/api';

export function useServerConfig(guildId) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    
    setLoading(true);
    try {
      const response = await serversApi.getServerConfig(guildId);
      setConfig(response.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  const updateConfig = useCallback(async (newConfig) => {
    setSaving(true);
    try {
      await serversApi.updateServerConfig(guildId, newConfig);
      setConfig(newConfig);
      setError(null);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [guildId]);

  const resetConfig = useCallback(async () => {
    setSaving(true);
    try {
      await serversApi.resetServerConfig(guildId);
      await fetchConfig();
      setError(null);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [guildId, fetchConfig]);

  useEffect(() => {
    if (guildId) {
      fetchConfig();
    }
  }, [guildId, fetchConfig]);

  return { 
    config, 
    loading, 
    error, 
    saving,
    updateConfig, 
    resetConfig,
    refetch: fetchConfig 
  };
}
