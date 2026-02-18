/**
 * API Response Types for DiscordLLMBot dashboard
 * @module types
 */

// ===========================================================================
// Health & Analytics
// ===========================================================================

/**
 * Response from the /health endpoint
 */
export interface HealthResponse {
  status: string;
  uptime: number;
  cpu_usage: number;
  memory_usage: number;
}

/**
 * Response from the /analytics endpoint
 */
export interface AnalyticsResponse {
  stats24h: {
    total_replies: number;
    active_servers: number;
    active_users: number;
    total_tokens: number;
  };
  volume: Array<{
    date: string;
    count: number;
  }>;
  topServers: Array<{
    guildname: string;
    reply_count: number;
    icon_url?: string;
  }>;
}

/**
 * A bot reply stored in the database
 */
export interface Reply {
  id: number;
  username: string;
  displayname: string;
  avatarurl: string;
  guildname: string;
  usermessage: string;
  botreply: string;
  timestamp: string;
}

// ===========================================================================
// Server Management
// ===========================================================================

/**
 * Discord server the bot is connected to
 */
export interface Server {
  id: string;
  name: string;
  iconURL?: string;
  memberCount?: number;
  joinedAt?: string;
}

/**
 * Server-specific configuration overrides
 */
export interface ServerConfig {
  replyBehavior: {
    guildSpecificChannels?: Record<string, {
      allowed?: string[];
      ignored?: string[];
    }>;
  };
  [key: string]: unknown;
}

/**
 * User relationship data - defines how the bot interacts with a user
 */
export interface Relationship {
  attitude: string;
  behavior: string[];
  ignored: boolean;
}

/**
 * Discord channel information
 */
export interface Channel {
  id: string;
  name: string;
  type: number;
}

// ===========================================================================
// Bot Configuration
// ===========================================================================

/**
 * Complete bot configuration structure
 * Used for both global config and server-specific overrides
 */
export interface BotConfig {
  bot: {
    name: string;
    username: string;
    description: string;
    globalRules: string[];
  };
  api: {
    provider: 'gemini' | 'ollama';
    geminiModel: string;
    ollamaModel: string;
    retryAttempts: number;
    retryBackoffMs: number;
  };
  memory: {
    maxMessages: number;
    maxMessageAgeDays: number;
  };
  logger: {
    maxLogLines: number;
    logReplyDecisions: boolean;
    logSql: boolean;
  };
  replyBehavior: {
    guildSpecificChannels?: Record<string, {
      allowed?: string[];
      ignored?: string[];
    }>;
  };
}

// ===========================================================================
// Chat / Playground
// ===========================================================================

/**
 * A message in the chat playground
 */
export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  username: string;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

/**
 * Request body for sending a chat message
 */
export interface ChatRequest {
  message: string;
  username: string;
  guildName: string;
}

/**
 * Response from the chat endpoint
 */
export interface ChatResponse {
  reply: string;
  timestamp: string;
  usage: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

// ===========================================================================
// Bot Info
// ===========================================================================

/**
 * Bot information from the API
 */
export interface BotInfo {
  clientId?: string;
  inviteUrl?: string;
}

// ===========================================================================
// Logging
// ===========================================================================

/**
 * Log level types
 */
export type LogType = 'ERROR' | 'WARN' | 'INFO' | 'API' | 'MESSAGE' | 'OTHER';

/**
 * A parsed log entry
 */
export interface ParsedLog {
  timestamp: string | null;
  level: LogType;
  text: string;
  json: Record<string, unknown> | null;
}
