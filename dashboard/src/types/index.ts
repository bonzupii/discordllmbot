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
    geminiApiKeyFromEnv?: boolean;
    ollamaApiKeyFromEnv?: boolean;
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
  sandbox: {
    enabled: boolean;
    timeoutMs: number;
    allowedCommands: string[];
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

export interface AnalyticsOverview {
  stats: {
    total_replies: number;
    total_declined: number;
    total_messages: number;
    active_servers: number;
    active_users: number;
    avg_latency: number;
    total_prompt_tokens: number;
    total_response_tokens: number;
    total_errors: number;
  };
  replyRate: number;
  errorRate: number;
}

export interface AnalyticsVolume {
  daily: {
    date: string;
    messages: number;
    reply_attempts: number;
    replies_sent: number;
    replies_declined: number;
  }[];
  hourly: {
    hour: number;
    messages: number;
    replies: number;
  }[];
}

export interface AnalyticsDecisions {
  breakdown: {
    reason: string;
    count: number;
  }[];
  funnel: {
    messages_received: number;
    messages_mentioned: number;
    reply_attempts: number;
    replies_sent: number;
  };
}

export interface AnalyticsProviders {
  byProvider: {
    provider: string;
    model: string;
    call_count: number;
    avg_latency: number;
    prompt_tokens: number;
    response_tokens: number;
    error_count: number;
  }[];
  errorTypes: {
    error_type: string;
    provider: string;
    count: number;
  }[];
}

export interface AnalyticsPerformance {
  latencyTrend: {
    date: string;
    avg_latency: number;
    min_latency: number;
    max_latency: number;
    p50_latency: number;
    p95_latency: number;
  }[];
  tokenTrend: {
    date: string;
    prompt_tokens: number;
    response_tokens: number;
    call_count: number;
  }[];
}

export interface AnalyticsUsers {
  topUsers: {
    userId: string;
    username: string;
    messages_sent: number;
    replies_received: number;
    channels_used: number;
    first_seen: string;
    last_seen: string;
  }[];
  userDistribution: {
    message_range: string;
    user_count: number;
  }[];
}

export interface AnalyticsChannels {
  channelActivity: {
    channelId: string;
    channel_name: string;
    messages: number;
    replies: number;
    unique_users: number;
  }[];
}

export interface AnalyticsErrors {
  errors: {
    eventType: string;
    provider: string;
    model: string;
    error_type: string;
    status_code: string;
    message: string;
    timestamp: string;
    guildId: string;
    userId: string;
  }[];
}
