import { useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';

// Singleton socket instance
let socketInstance = null;
let isRestarting = false;
const listeners = new Set();

// Initialize socket if not already done
function getSocket() {
  if (!socketInstance) {
    socketInstance = io();
    socketInstance.on('bot:status', (status) => {
      isRestarting = status.isRestarting;
      notifyListeners();
    });
  }
  return socketInstance;
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
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
