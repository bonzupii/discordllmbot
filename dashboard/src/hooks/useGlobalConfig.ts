/**
 * Hook for managing global bot configuration
 * Provides config fetching, saving, and nested property updates
 * @module hooks/useGlobalConfig
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { configApi, modelsApi } from '@services';
import type { BotConfig } from '@types';

/**
 * Hook for fetching and updating global bot configuration
 * Includes auto-save with debounce and model fetching for LLM providers
 */
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

  /** Debounce timer for auto-save */
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Fetch global configuration from API
   * @returns The config object or null on failure
   */
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

  /**
   * Fetch available models for a provider
   * @param provider - LLM provider ('gemini' or 'ollama')
   * @returns Array of model names
   */
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

  /**
   * Save configuration to API
   * @param newConfig - Configuration object to save
   * @returns True if save succeeded
   */
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

  /**
   * Save config after delay (debounced)
   * @param newConfig - Configuration to save
   * @param isRestarting - Whether bot is restarting (skip save if true)
   */
  const debouncedSave = useCallback((newConfig: BotConfig, isRestarting: boolean) => {
    if (isRestarting) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      saveConfig(newConfig);
    }, 1000);
  }, [saveConfig]);

  /**
   * Update a nested config property and trigger save
   * @param path - Dot-notation path (e.g., 'api.geminiModel')
   * @param value - New value
   * @param isRestarting - Whether to skip saving
   */
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

  /**
   * Add item to a nested array property
   * @param path - Dot-notation path to array
   * @param item - Item to add (default empty string)
   */
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

  /**
   * Remove item from nested array property
   * @param path - Dot-notation path to array
   * @param itemToRemove - Item to remove
   */
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

  /**
   * Update item in nested array by index
   * @param path - Dot-notation path to array
   * @param index - Array index to update
   * @param value - New value
   * @param isRestarting - Whether to skip saving
   */
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

  // Fetch config and models on mount
  useEffect(() => {
    const init = async () => {
      const initialConfig = await fetchConfig();
      if (initialConfig) {
        await fetchModels(initialConfig.api?.provider || 'gemini');
      }
    };
    init();

    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [fetchConfig, fetchModels]);

  /**
   * Close the notification message
   */
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
