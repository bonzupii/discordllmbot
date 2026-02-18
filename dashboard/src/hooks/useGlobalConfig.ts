import { useState, useEffect, useCallback, useRef } from 'react';
import { configApi, modelsApi } from '@services';
import type { BotConfig } from '@types';

export function useGlobalConfig() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState<{ open: boolean; text: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    text: '',
    severity: 'success'
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConfig = useCallback(async (): Promise<BotConfig | null> => {
    try {
      const response = await configApi.getConfig();
      setConfig(response.data);
      setError(null);
      return response.data;
    } catch {
      setError(null);
      setMessage({ open: true, text: 'Failed to load configuration.', severity: 'error' });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async (provider: string): Promise<string[]> => {
    if (!provider) return [];

    setIsFetchingModels(true);
    try {
      const response = await modelsApi.getModels(provider);
      setModels(response.data);
      return response.data;
    } catch {
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

  const saveConfig = useCallback(async (newConfig: BotConfig): Promise<boolean> => {
    setSaving(true);
    try {
      await configApi.updateConfig(newConfig);
      setMessage({ open: true, text: 'Settings saved successfully!', severity: 'success' });
      return true;
    } catch {
      setMessage({ open: true, text: 'Error saving settings.', severity: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const debouncedSave = useCallback((newConfig: BotConfig, isRestarting: boolean) => {
    if (isRestarting) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      saveConfig(newConfig);
    }, 1000);
  }, [saveConfig]);

  const updateNested = useCallback((path: string, value: unknown, isRestarting: boolean) => {
    setConfig((prev: BotConfig | null) => {
      if (!prev) return prev;

      const newConfig = { ...prev };
      let current: Record<string, unknown> = newConfig;
      const keys = path.split('.');
      const lastKey = keys.pop() as string;

      for (const key of keys) {
        const currentValue = current[key];
        current[key] = typeof currentValue === 'object' && currentValue !== null ? { ...currentValue } : currentValue;
        current = current[key] as Record<string, unknown>;
      }
      current[lastKey] = value;

      debouncedSave(newConfig, isRestarting);

      return newConfig;
    });
  }, [debouncedSave]);

  const addArrayItem = useCallback((path: string, item = '') => {
    setConfig((prev: BotConfig | null) => {
      if (!prev) return prev;

      const newConfig = { ...prev };
      let current: Record<string, unknown> = newConfig;
      const keys = path.split('.');
      const lastKey = keys.pop() as string;

      for (const key of keys) current = current[key] as Record<string, unknown>;

      const arr = current[lastKey] as string[];
      if (arr.length > 0 && arr[arr.length - 1] === '') {
        return newConfig;
      }

      current[lastKey] = [...arr, item];
      return newConfig;
    });
  }, []);

  const removeArrayItem = useCallback((path: string, itemToRemove: unknown) => {
    setConfig((prev: BotConfig | null) => {
      if (!prev) return prev;

      const newConfig = { ...prev };
      let current: Record<string, unknown> = newConfig;
      const keys = path.split('.');
      const lastKey = keys.pop() as string;

      for (const key of keys) current = current[key] as Record<string, unknown>;

      const arr = current[lastKey] as unknown[];
      current[lastKey] = arr.filter((item) => item !== itemToRemove);
      return newConfig;
    });
  }, []);

  const updateArrayItem = useCallback((path: string, index: number, value: unknown, isRestarting: boolean) => {
    setConfig((prev: BotConfig | null) => {
      if (!prev) return prev;

      const newConfig = { ...prev };
      let current: Record<string, unknown> = newConfig;
      const keys = path.split('.');
      const lastKey = keys.pop() as string;

      for (const key of keys) current = current[key] as Record<string, unknown>;

      const arr = current[lastKey] as unknown[];
      const newArray = [...arr];
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
