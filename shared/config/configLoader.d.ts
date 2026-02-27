/**
 * Configuration Loader Module Type Declarations
 */

export interface GlobalConfig {
    botPersona: BotPersonaConfig;
    llm: ApiConfig;
    memory: MemoryConfig;
    logger: LoggerConfig;
    sandbox: SandboxConfig;
}

export interface BotPersonaConfig {
    username: string;
    description: string;
    globalRules: string[];
}

export interface ApiConfig {
    provider: 'gemini' | 'ollama' | 'qwen';
    geminiModel: string;
    ollamaModel: string;
    qwenModel: string;
    geminiApiKey: string;
    ollamaApiKey: string;
    qwenApiKey: string;
    retryAttempts: number;
    retryBackoffMs: number;
    geminiApiKeyFromEnv: boolean;
    ollamaApiKeyFromEnv: boolean;
    qwenApiKeyFromEnv: boolean;
}

export interface MemoryConfig {
    maxMessages: number;
    maxMessageAgeDays: number;
}

export interface LoggerConfig {
    maxLogLines: number;
    logReplyDecisions: boolean;
    logSql: boolean;
}

export interface SandboxConfig {
    enabled: boolean;
    timeoutMs: number;
    allowedCommands: string[];
}

export interface ServerConfig {
    nickname: string;
    speakingStyle: string[];
    replyBehavior: ReplyBehaviorConfig;
}

export interface ReplyBehaviorConfig {
    replyProbability: number;
    minDelayMs: number;
    maxDelayMs: number;
    mentionOnly: boolean;
    ignoreUsers: string[];
    ignoreChannels: string[];
    ignoreKeywords: string[];
    guildSpecificChannels: Record<string, unknown>;
}

export interface BotConfig {
    name: string;
    description: string;
    globalRules: string[];
    speakingStyle: string[];
}

export function loadConfig(): Promise<GlobalConfig>;
export function getServerConfig(guildId: string): Promise<ServerConfig>;
export function updateServerConfig(guildId: string, newConfig: Partial<ServerConfig>): Promise<void>;
export function reloadConfig(): Promise<GlobalConfig>;
export function getBotConfig(guildId: string): Promise<BotConfig>;
export function getMemoryConfig(): Promise<MemoryConfig>;
export function getGlobalMemoryConfig(): Promise<MemoryConfig>;
export function getApiConfig(): Promise<ApiConfig>;
export function getReplyBehavior(guildId: string): Promise<ReplyBehaviorConfig>;
export function getLoggerConfig(): Promise<LoggerConfig>;
export function getSandboxConfig(): Promise<SandboxConfig>;
export function setSqlLoggingEnabled(enabled: boolean): void;
export function isSqlLoggingEnabled(): boolean;
export function clearServerConfigCache(guildId: string): void;
