import { useState, useEffect, useCallback } from 'react';
import { serversApi } from '../services/api';

export function useServerRelationships(guildId) {
  const [relationships, setRelationships] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRelationships = useCallback(async () => {
    if (!guildId || loading) return;
    
    setLoading(true);
    try {
      const response = await serversApi.getRelationships(guildId);
      setRelationships(response.data);
      setError(null);
    } catch (err) {
      setError(err);
      setRelationships({});
    } finally {
      setLoading(false);
    }
  }, [guildId, loading]);

  const updateRelationship = useCallback(async (userId, data) => {
    try {
      await serversApi.updateRelationship(guildId, userId, data);
      setRelationships((prev) => ({
        ...prev,
        [userId]: data,
      }));
      setError(null);
      return true;
    } catch (err) {
      setError(err);
      return false;
    }
  }, [guildId]);

  useEffect(() => {
    if (guildId) {
      fetchRelationships();
    }
  }, [guildId, fetchRelationships]);

  return { 
    relationships, 
    loading, 
    error, 
    updateRelationship,
    refetch: fetchRelationships 
  };
}
