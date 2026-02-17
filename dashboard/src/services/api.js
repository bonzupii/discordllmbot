import axios from 'axios';

/**
 * @typedef {Object} HealthResponse
 * @property {string} status
 * @property {number} uptime
 * @property {number} cpu_usage
 * @property {number} memory_usage
 */

/**
 * @typedef {Object} AnalyticsResponse
 * @property {Object} stats24h
 * @property {Array} volume
 * @property {Array} topServers
 */

/**
 * @typedef {Object} Reply
 * @property {number} id
 * @property {string} username
 * @property {string} displayname
 * @property {string} avatarurl
 * @property {string} guildname
 * @property {string} usermessage
 * @property {string} botreply
 * @property {string} timestamp
 */

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health endpoints
export const healthApi = {
  /**
   * @returns {Promise<import('axios').AxiosResponse<HealthResponse>>}
   */
  getHealth: () => api.get('/health'),
};

// Analytics endpoints
export const analyticsApi = {
  /**
   * @returns {Promise<import('axios').AxiosResponse<AnalyticsResponse>>}
   */
  getAnalytics: () => api.get('/analytics'),
  /**
   * @param {number} limit
   * @returns {Promise<import('axios').AxiosResponse<Reply[]>>}
   */
  getReplies: (limit = 50) => api.get(`/replies?limit=${limit}`),
};

// Server endpoints
export const serversApi = {
  getServers: () => api.get('/servers'),
  leaveServer: (serverId) => api.delete(`/servers/${serverId}`),
  getServerConfig: (guildId) => api.get(`/servers/${guildId}/config`),
  updateServerConfig: (guildId, config) => api.post(`/servers/${guildId}/config`, config),
  resetServerConfig: (guildId) => api.delete(`/servers/${guildId}/config`),
  getRelationships: (guildId) => api.get(`/guilds/${guildId}/relationships`),
  updateRelationship: (guildId, userId, data) => 
    api.post(`/guilds/${guildId}/relationships/${userId}`, data),
  getChannels: (guildId) => api.get(`/guilds/${guildId}/channels`),
};

// Config endpoints
export const configApi = {
  getConfig: () => api.get('/config'),
  updateConfig: (config) => api.post('/config', config),
};

// Bot info endpoints
export const botInfoApi = {
  getBotInfo: () => api.get('/bot-info'),
};

// Models endpoints
export const modelsApi = {
  /**
   * @param {string} provider
   * @returns {Promise<import('axios').AxiosResponse<string[]>>}
   */
  getModels: (provider) => api.get('/models', { params: { provider } }),
};

// Chat endpoints
export const chatApi = {
  /**
   * @param {string} message
   * @param {string} username
   * @param {string} guildName
   * @returns {Promise<import('axios').AxiosResponse<{reply: string, timestamp: string, usage: Object}>>}
   */
  sendMessage: (message, username, guildName) => 
    api.post('/chat', { message, username, guildName }),
};

export default api;
