/**
 * Persistence Module Type Declarations
 */

export interface Relationship {
    attitude: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    ignored: boolean;
    behavior: string[];
    boundaries: string[];
}

export type Relationships = Record<string, Relationship>;

export interface MessageContext {
    authorId: string;
    author: string;
    content: string;
}

export interface BotReplyData {
    guildId: string;
    channelId: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    userMessage: string;
    botReply: string;
    processingTimeMs: number;
    promptTokens: number;
    responseTokens: number;
}

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

export function getSqlLogEmitter(): EventEmitter;
export function resetPoolWrapper(): void;
export function getDb(): Promise<DatabasePool>;

export function loadRelationships(guildId: string): Promise<Relationships>;
export function saveRelationships(guildId: string, relationships: Relationships): Promise<void>;
export function getServerConfig(guildId: string): Promise<ServerConfig | null>;
export function saveServerConfig(guildId: string, config: ServerConfig): Promise<void>;
export function deleteServerConfig(guildId: string): Promise<void>;
export function getGlobalConfig(): Promise<GlobalConfig | null>;
export function saveGlobalConfig(config: GlobalConfig): Promise<void>;
export function deleteGlobalConfig(): Promise<void>;
export function getAllServerConfigs(): Promise<Array<{
    guildId: string;
    config: ServerConfig;
    guildName: string;
    updatedAt: Date;
}>>;

export function loadContexts(guildId: string, channelId: string, maxMessages: number): Promise<MessageContext[]>;
export function saveMessage(guildId: string, channelId: string, authorId: string, authorName: string, content: string): Promise<void>;
export function saveGuild(guildId: string, guildName: string): Promise<void>;
export function pruneOldMessages(maxAgeDays: number): Promise<void>;
export function logBotReply(
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
export function getLatestReplies(limit?: number): Promise<unknown[]>;
export function getAnalyticsData(): Promise<{
    stats24h: unknown;
    volume: unknown[];
    topServers: unknown[];
}>;
export function logAnalyticsEvent(eventType: string, guildId: string, channelId: string, userId: string, metadata?: Record<string, unknown>): Promise<void>;
export function getAnalyticsOverview(days?: number): Promise<unknown>;
export function getAnalyticsVolume(days?: number): Promise<unknown>;
export function getAnalyticsDecisions(days?: number): Promise<unknown>;
export function getAnalyticsProviders(days?: number): Promise<unknown>;
export function getAnalyticsPerformance(days?: number): Promise<unknown>;
export function getAnalyticsUsers(days?: number, guildId?: string | null, limit?: number): Promise<unknown>;
export function getAnalyticsChannels(days?: number, guildId?: string | null): Promise<unknown>;
export function getAnalyticsErrors(days?: number, limit?: number): Promise<unknown>;

import { EventEmitter } from 'events';
import { GlobalConfig, ServerConfig } from '../config/configLoader.js';
