import type { Client, Guild, Message, GuildMember, TextChannel, Channel, APIChannel } from 'discord.js';

export function validateEnvironment(): void;

export interface GlobalConfig {
    botPersona: BotPersonaConfig;
    llm: ApiConfig;
    memory: MemoryConfig;
    logger: LoggerConfig;
    sandbox: SandboxConfig;
}

export interface SandboxConfig {
    enabled: boolean;
    timeoutMs: number;
    allowedCommands: string[];
}

export interface BotPersonaConfig {
    username: string;
    description: string;
    globalRules: string[];
}

export interface BotConfig {
    name: string;
    description: string;
    speakingStyle: string[];
    globalRules: string[];
}

export interface MemoryConfig {
    maxContextMessages: number;
    maxMessageAgeDays: number;
}

export interface LoggerConfig {
    maxLogLines?: number;
    logSql?: boolean;
}

export interface ApiConfig {
    provider: 'gemini' | 'ollama' | 'qwen';
    geminiModel?: string;
    ollamaModel?: string;
    qwenModel?: string;
    geminiApiKey?: string;
    ollamaApiKey?: string;
    qwenApiKey?: string;
    retryAttempts?: number;
    retryBackoffMs?: number;
    model?: string;
    ollamaUrl?: string;
}

export interface ReplyBehaviorConfig {
    replyProbability: number;
    minDelayMs: number;
    maxDelayMs: number;
    ignoreUsers: string[];
    ignoreChannels: string[];
    ignoreKeywords: string[];
    mentionOnly: boolean;
}

export interface ServerConfig {
    nickname?: string;
    speakingStyle: string[];
    replyBehavior: ReplyBehaviorConfig;
}

export async function loadConfig(): Promise<GlobalConfig>;
export async function getServerConfig(guildId: string): Promise<ServerConfig>;
export async function updateServerConfig(guildId: string, config: Partial<ServerConfig>): Promise<void>;
export async function reloadConfig(): Promise<void>;
export async function getBotConfig(guildId: string): Promise<BotConfig>;
export async function getMemoryConfig(guildId: string): Promise<MemoryConfig>;
export async function getGlobalMemoryConfig(): Promise<MemoryConfig>;
export async function getApiConfig(): Promise<ApiConfig>;
export async function getReplyBehavior(guildId: string): Promise<ReplyBehaviorConfig>;
export async function getLoggerConfig(guildId: string): Promise<LoggerConfig>;
export async function getSandboxConfig(): Promise<SandboxConfig>;
export function setSqlLoggingEnabled(enabled: boolean): void;
export function isSqlLoggingEnabled(): boolean;
export function clearServerConfigCache(guildId: string): void;

export interface Logger {
    error(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    api(message: string, ...args: unknown[]): void;
    message(message: string, ...args: unknown[]): void;
    sql(message: string, ...args: unknown[]): void;
}

export function initializeLogger(maxLogLines?: number): void;
export const logger: Logger;

export interface DatabasePool {
    query: (text: string, params?: unknown[]) => Promise<{
        rows: unknown[];
        rowCount: number;
    }>;
    connect: () => Promise<DatabaseClient>;
}

export interface DatabaseClient {
    query: (text: string, params?: unknown[]) => Promise<{
        rows: unknown[];
        rowCount: number;
    }>;
    release: () => void;
}

export function getSqlLogEmitter(): {
    on(event: 'query', listener: (logLine: string, data?: unknown) => void): void;
    emit(event: 'query', logLine: string, data?: unknown): void;
};

export function resetPoolWrapper(): Promise<void>;
export function getDb(): Promise<DatabasePool>;

export interface Relationship {
    attitude: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    ignored: boolean;
    behavior: string;
    boundaries: string[];
}

export type Relationships = Record<string, Relationship>;

export async function loadRelationships(guildId: string): Promise<Relationships>;
export async function saveRelationships(guildId: string, relationships: Relationships): Promise<void>;
export async function getServerConfig(guildId: string): Promise<ServerConfig | null>;
export async function saveServerConfig(guildId: string, config: ServerConfig): Promise<void>;
export async function deleteServerConfig(guildId: string): Promise<void>;
export async function getGlobalConfig(): Promise<GlobalConfig | null>;
export async function saveGlobalConfig(config: GlobalConfig): Promise<void>;
export async function deleteGlobalConfig(): Promise<void>;
export async function getAllServerConfigs(): Promise<Array<{ guildId: string; config: ServerConfig; guildName: string; updatedAt: Date }>>;

export interface MessageContext {
    authorId: string;
    author: string;
    content: string;
}

export async function loadContexts(guildId: string, channelId: string, maxMessages: number): Promise<MessageContext[]>;
export async function saveMessage(guildId: string, channelId: string, authorId: string, authorName: string, content: string): Promise<void>;
export async function saveGuild(guildId: string, guildName: string): Promise<void>;
export async function pruneOldMessages(maxAgeDays: number): Promise<void>;
export async function logBotReply(
    guildId: string,
    channelId: string,
    userId: string,
    username: string,
    displayName: string,
    avatarUrl: string,
    userMessage: string,
    botReply: string,
    processingTimeMs: number,
    promptTokens: number,
    responseTokens: number
): Promise<void>;
export async function getLatestReplies(limit?: number): Promise<unknown[]>;
export async function getAnalyticsData(): Promise<{
    stats24h: unknown;
    volume: unknown[];
    topServers: unknown[];
}>;

export function initializeDatabase(): Promise<void>;
