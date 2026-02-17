import axios, { AxiosResponse } from 'axios';
import type {
  HealthResponse,
  AnalyticsResponse,
  Reply,
  Server,
  ServerConfig,
  Relationship,
  Channel,
  BotConfig,
  BotInfo,
  ChatResponse,
} from '@types';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health endpoints
export const healthApi = {
  getHealth: (): Promise<AxiosResponse<HealthResponse>> => api.get('/health'),
};

// Analytics endpoints
export const analyticsApi = {
  getAnalytics: (): Promise<AxiosResponse<AnalyticsResponse>> => api.get('/analytics'),
  getReplies: (limit = 50): Promise<AxiosResponse<Reply[]>> => api.get(`/replies?limit=${limit}`),
};

// Server endpoints
export const serversApi = {
  getServers: (): Promise<AxiosResponse<Server[]>> => api.get('/servers'),
  leaveServer: (serverId: string): Promise<AxiosResponse<void>> => api.delete(`/servers/${serverId}`),
  getServerConfig: (guildId: string): Promise<AxiosResponse<ServerConfig>> => api.get(`/servers/${guildId}/config`),
  updateServerConfig: (guildId: string, config: ServerConfig): Promise<AxiosResponse<ServerConfig>> => api.post(`/servers/${guildId}/config`, config),
  resetServerConfig: (guildId: string): Promise<AxiosResponse<void>> => api.delete(`/servers/${guildId}/config`),
  getRelationships: (guildId: string): Promise<AxiosResponse<Record<string, Relationship>>> => api.get(`/guilds/${guildId}/relationships`),
  updateRelationship: (guildId: string, userId: string, data: Relationship): Promise<AxiosResponse<Relationship>> =>
    api.post(`/guilds/${guildId}/relationships/${userId}`, data),
  getChannels: (guildId: string): Promise<AxiosResponse<Channel[]>> => api.get(`/guilds/${guildId}/channels`),
};

// Config endpoints
export const configApi = {
  getConfig: (): Promise<AxiosResponse<BotConfig>> => api.get('/config'),
  updateConfig: (config: BotConfig): Promise<AxiosResponse<BotConfig>> => api.post('/config', config),
};

// Bot info endpoints
export const botInfoApi = {
  getBotInfo: (): Promise<AxiosResponse<BotInfo>> => api.get('/bot-info'),
};

// Models endpoints
export const modelsApi = {
  getModels: (provider: string): Promise<AxiosResponse<string[]>> => api.get('/models', { params: { provider } }),
};

// Chat endpoints
export const chatApi = {
  sendMessage: (message: string, username: string, guildName: string): Promise<AxiosResponse<ChatResponse>> =>
    api.post('/chat', { message, username, guildName }),
};

export default api;
