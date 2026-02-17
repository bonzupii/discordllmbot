// API Response Types
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

// Server Types
export interface Server {
  id: string;
  name: string;
  iconURL?: string;
  memberCount?: number;
  joinedAt?: string;
}

export interface ServerConfig {
  replyBehavior: {
    guildSpecificChannels?: Record<string, {
      allowed?: string[];
      ignored?: string[];
    }>;
  };
  [key: string]: unknown;
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

// Bot Config Types
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

// Chat Types
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

// Bot Info Types
export interface BotInfo {
  clientId?: string;
  inviteUrl?: string;
}

// Utility Types
export type LogType = 'ERROR' | 'WARN' | 'INFO' | 'API' | 'MESSAGE' | 'OTHER';

export interface ParsedLog {
  timestamp: string | null;
  level: LogType;
  text: string;
  json: Record<string, unknown> | null;
}
