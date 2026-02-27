/**
 * Socket.io connection for real-time bot status updates
 * @module hooks/useSocket
 * @deprecated Use useSocketContext() from @contexts instead
 */

import { useSocketContext } from '@context/SocketContext';

/**
 * Hook to access socket connection and bot restart status
 * @deprecated Use useSocketContext() from @contexts instead
 * @returns Socket instance, restarting state, and clear function
 */
export function useSocket() {
  const { socket, isRestarting, clearRestarting } = useSocketContext();
  return { socket, isRestarting, clearRestarting };
}
