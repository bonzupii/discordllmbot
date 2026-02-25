/**
 * API Response Types for DiscordLLMBot dashboard
 * @module types
 */

export interface HealthResponse {
  status: string;
  uptime: number;
  cpu_usage: number;
  memory_usage: number;
}

export interface AnalyticsResponse {
  stats24h: {
    total_replies: number;
    active_servers: number;
    active_users: number;
    total_tokens: number;
  };
  volume: {
    date: string;
    count: number;
  }[];
  topServers: {
    guildname: string;
    reply_count: number;
    icon_url?: string;
  }[];
}

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

export interface Server {
  id: string;
  name: string;
  iconURL?: string;
  memberCount?: number;
  joinedAt?: string;
}

export interface ServerConfig {
  nickname?: string;
  speakingStyle: string[];
  replyBehavior: {
    replyProbability: number;
    minDelayMs: number;
    maxDelayMs: number;
    mentionOnly: boolean;
    guildSpecificChannels?: Record<string, {
      allowed?: string[];
      ignored?: string[];
    }>;
  };
}

export interface Relationship {
  attitude: string;
  behavior: string[];
  ignored: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: number;
}

export interface BotConfig {
  botPersona: {
    username: string;
    description: string;
    globalRules: string[];
  };
  llm: {
    provider: 'gemini' | 'ollama' | 'qwen';
    geminiModel: string;
    ollamaModel: string;
    qwenModel: string;
    geminiApiKey: string;
    ollamaApiKey: string;
    qwenApiKey: string;
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
}

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

export interface ChatRequest {
  message: string;
  username: string;
  guildName: string;
}

export interface ChatResponse {
  reply: string;
  timestamp: string;
  usage: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export interface BotInfo {
  clientId?: string;
  inviteUrl?: string;
}

export type LogType = 'ERROR' | 'WARN' | 'INFO' | 'API' | 'SQL' | 'MESSAGE' | 'OTHER';

export interface ParsedLog {
  timestamp: string | null;
  level: LogType;
  text: string;
  json: Record<string, unknown> | null;
}
