/**
 * Socket.io connection for real-time bot status updates
 * @module hooks/useSocket
 */

import { useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';

/** Singleton socket instance - reused across all hook usages */
let socketInstance: ReturnType<typeof io> | null = null;

/** Whether the bot is currently restarting */
let isRestarting = false;

/** Set of listeners to notify when state changes */
const listeners = new Set<() => void>();

/**
 * Get or create the socket.io connection
 * Listens for bot:status events to track restart state
 */
function getSocket(): ReturnType<typeof io> {
  if (!socketInstance) {
    socketInstance = io();
    socketInstance.on('bot:status', (status: { isRestarting: boolean }) => {
      isRestarting = status.isRestarting;
      notifyListeners();
    });
  }
  return socketInstance;
}

/** Notify all subscribed listeners of state change */
function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * Subscribe to store updates
 * @param listener - Callback to run when store changes
 * @returns Unsubscribe function
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Hook to access socket connection and bot restart status
 * Uses useSyncExternalStore for React 18 concurrent features compatibility
 * @returns Socket instance, restarting state, and clear function
 */
export function useSocket() {
  const isRestartingValue = useSyncExternalStore(
    subscribe,
    () => isRestarting,
    () => isRestarting
  );

  /**
   * Clear the restarting flag (called after user acknowledges)
   */
  const clearRestarting = () => {
    isRestarting = false;
    notifyListeners();
  };

  return { socket: getSocket(), isRestarting: isRestartingValue, clearRestarting };
}
