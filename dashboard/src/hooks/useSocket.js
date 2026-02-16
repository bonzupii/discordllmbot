import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    const socketInstance = io();

    socketInstance.on('bot:status', (status) => {
      setIsRestarting(status.isRestarting);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const clearRestarting = useCallback(() => {
    setIsRestarting(false);
  }, []);

  return { socket, isRestarting, clearRestarting };
}
