import { useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';

// Singleton socket instance
let socketInstance: ReturnType<typeof io> | null = null;
let isRestarting = false;
const listeners = new Set<() => void>();

// Initialize socket if not already done
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

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSocket() {
  const isRestartingValue = useSyncExternalStore(
    subscribe,
    () => isRestarting,
    () => isRestarting
  );

  const clearRestarting = () => {
    isRestarting = false;
    notifyListeners();
  };

  return { socket: getSocket(), isRestarting: isRestartingValue, clearRestarting };
}
