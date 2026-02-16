import { useState, useEffect, useCallback, useRef } from 'react';
import { configApi, modelsApi } from '../services/api';

export function useGlobalConfig() {
  const [config, setConfig] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ open: false, text: '', severity: 'success' });
  
  const debounceTimer = useRef(null);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await configApi.getConfig();
      setConfig(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      setError(err);
      setMessage({ open: true, text: 'Failed to load configuration.', severity: 'error' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async (provider) => {
    if (!provider) return [];

    setIsFetchingModels(true);
    try {
      const response = await modelsApi.getModels(provider);
      setModels(response.data);
      return response.data;
    } catch (err) {
      setMessage({ 
        open: true, 
        text: `Could not fetch models from the ${provider} API.`, 
        severity: 'warning' 
      });
      setModels([]);
      return [];
    } finally {
      setIsFetchingModels(false);
    }
  }, []);

  const saveConfig = useCallback(async (newConfig) => {
    setSaving(true);
    try {
      await configApi.updateConfig(newConfig);
      setMessage({ open: true, text: 'Settings saved successfully!', severity: 'success' });
      return true;
    } catch (err) {
      setMessage({ open: true, text: 'Error saving settings.', severity: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const debouncedSave = useCallback((newConfig, isRestarting) => {
    if (isRestarting) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      saveConfig(newConfig);
    }, 1000);
  }, [saveConfig]);

  const updateNested = useCallback((path, value, isRestarting) => {
    setConfig((prev) => {
      if (!prev) return prev;
      
      const newConfig = { ...prev };
      let current = newConfig;
      const keys = path.split('.');
      const lastKey = keys.pop();

      for (const key of keys) {
        current[key] = { ...current[key] };
        current = current[key];
      }
      current[lastKey] = value;

      debouncedSave(newConfig, isRestarting);

      return newConfig;
    });
  }, [debouncedSave]);

  const addArrayItem = useCallback((path, item = '') => {
    setConfig((prev) => {
      if (!prev) return prev;
      
      const newConfig = { ...prev };
      let current = newConfig;
      const keys = path.split('.');
      const lastKey = keys.pop();
      
      for (const key of keys) current = current[key];

      if (current[lastKey].length > 0 && current[lastKey][current[lastKey].length - 1] === '') {
        return newConfig;
      }
      
      current[lastKey] = [...current[lastKey], item];
      return newConfig;
    });
  }, []);

  const removeArrayItem = useCallback((path, itemToRemove) => {
    setConfig((prev) => {
      if (!prev) return prev;
      
      const newConfig = { ...prev };
      let current = newConfig;
      const keys = path.split('.');
      const lastKey = keys.pop();
      
      for (const key of keys) current = current[key];

      current[lastKey] = current[lastKey].filter((item) => item !== itemToRemove);
      return newConfig;
    });
  }, []);

  const updateArrayItem = useCallback((path, index, value, isRestarting) => {
    setConfig((prev) => {
      if (!prev) return prev;
      
      const newConfig = { ...prev };
      let current = newConfig;
      const keys = path.split('.');
      const lastKey = keys.pop();
      
      for (const key of keys) current = current[key];

      const newArray = [...current[lastKey]];
      newArray[index] = value;
      current[lastKey] = newArray;

      debouncedSave(newConfig, isRestarting);

      return newConfig;
    });
  }, [debouncedSave]);

  useEffect(() => {
    const init = async () => {
      const initialConfig = await fetchConfig();
      if (initialConfig) {
        await fetchModels(initialConfig.api?.provider || 'gemini');
      }
    };
    init();

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [fetchConfig, fetchModels]);

  const clearMessage = useCallback(() => {
    setMessage({ ...message, open: false });
  }, [message]);

  return { 
    config, 
    models, 
    loading, 
    saving, 
    isFetchingModels, 
    error,
    message,
    updateNested, 
    addArrayItem, 
    removeArrayItem, 
    updateArrayItem,
    fetchModels,
    clearMessage,
    refetch: fetchConfig 
  };
}
