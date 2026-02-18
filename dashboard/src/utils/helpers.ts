/**
 * Helper utility functions for the dashboard
 * @module utils/helpers
 */

import type { BotConfig } from '@types';

/**
 * Check if a channel is ignored based on the configuration
 */
export const isChannelIgnored = (config: BotConfig | null | undefined, guildId: string, channelId: string): boolean => {
  if (!config) return false;

  const replyBehavior = config.replyBehavior || {};
  const ignoreChannels = (replyBehavior as { ignoreChannels?: string[] })?.ignoreChannels || [];
  const guildSpecificChannels = (replyBehavior as { guildSpecificChannels?: Record<string, { allowed?: string[]; ignored?: string[] }> })?.guildSpecificChannels || {};

  // Check global ignore list
  if (ignoreChannels.includes(channelId)) {
    return true;
  }

  // Check guild-specific settings
  const guildChannels = guildSpecificChannels[guildId];
  if (guildChannels) {
    // If allowed channels are specified, only those are monitored
    if (Array.isArray(guildChannels.allowed) && guildChannels.allowed.length > 0) {
      return !guildChannels.allowed.includes(channelId);
    }

    // Otherwise check if this channel is specifically ignored
    if (Array.isArray(guildChannels.ignored) && guildChannels.ignored.length > 0) {
      return guildChannels.ignored.includes(channelId);
    }
  }

  return false;
};

/**
 * Format uptime from seconds to human readable string
 */
export const formatUptime = (seconds?: number): string => {
  if (!seconds) return 'N/A';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Update a nested property in an object
 */
export const updateNestedProperty = <T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T => {
  const newConfig = deepClone(obj);
  let current: Record<string, unknown> = newConfig;
  const keys = path.split('.');
  const lastKey = keys.pop() as string;

  for (const key of keys) {
    if (current[key]) {
      current[key] = { ...current[key] };
      current = current[key] as Record<string, unknown>;
    }
  }
  current[lastKey] = value;

  return newConfig as T;
};

/**
 * Add an item to a nested array property
 */
export const addToArrayProperty = <T extends Record<string, unknown>>(obj: T, path: string, item = ''): T => {
  const newConfig = deepClone(obj);
  let current: Record<string, unknown> = newConfig;
  const keys = path.split('.');
  const lastKey = keys.pop() as string;

  for (const key of keys) {
    if (current[key]) {
      current = current[key] as Record<string, unknown>;
    }
  }

  const arr = current[lastKey] as unknown[];
  if (arr.length > 0 && arr[arr.length - 1] === '') {
    return newConfig;
  }

  current[lastKey] = [...arr, item];
  return newConfig;
};

/**
 * Remove an item from a nested array property by index
 */
export const removeArrayItemByIndex = <T extends Record<string, unknown>>(obj: T, path: string, index: number): T => {
  const newConfig = deepClone(obj);
  let current: Record<string, unknown> = newConfig;
  const keys = path.split('.');
  const lastKey = keys.pop() as string;

  for (const key of keys) {
    if (current[key]) {
      current = current[key] as Record<string, unknown>;
    }
  }

  const arr = current[lastKey] as unknown[];
  arr.splice(index, 1);
  return newConfig;
};

/**
 * Update an item in a nested array property by index
 */
export const updateArrayItemByIndex = <T extends Record<string, unknown>>(obj: T, path: string, index: number, value: unknown): T => {
  const newConfig = deepClone(obj);
  let current: Record<string, unknown> = newConfig;
  const keys = path.split('.');
  const lastKey = keys.pop() as string;

  for (const key of keys) {
    if (current[key]) {
      current = current[key] as Record<string, unknown>;
    }
  }

  const arr = current[lastKey] as unknown[];
  const newArray = [...arr];
  newArray[index] = value;
  current[lastKey] = newArray;

  return newConfig as T;
};

// ===========================================================================
// Date/Time Formatting
// ===========================================================================

/**
 * Format a date string to locale date (e.g., "1/15/2024")
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString();
};

/**
 * Format a date string to locale time (e.g., "3:45 PM")
 * @param dateString - ISO date string
 * @returns Formatted time string
 */
export const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get current ISO timestamp
 * @returns ISO date string
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

// ===========================================================================
// Array Helpers
// ===========================================================================

/**
 * Limit an array to a maximum number of items
 * @param arr - Array to limit
 * @param maxItems - Maximum number of items
 * @returns New array with max items
 */
export const limitArray = <T>(arr: T[], maxItems: number): T[] => {
  return arr.slice(0, maxItems);
};
