/**
 * Custom React hooks for state management and API communication.
 * @module hooks
 */
/* eslint-disable @typescript-eslint/no-deprecated */
export { useAnalytics } from './useAnalytics';
export { useChat } from './useChat';
export { useGlobalConfig } from './useGlobalConfig';
export { useHealth } from './useHealth';
export { useServerChannels } from './useServerChannels';
export { useServerConfig } from './useServerConfig';
export { useServerRelationships } from './useServerRelationships';
export { useServers } from './useServers';
export { useSocket } from './useSocket';
export { useSocketContext } from '@context/SocketContext';
export type { ChatMessage } from '@types';
