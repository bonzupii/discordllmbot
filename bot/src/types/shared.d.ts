/**
 * Type declarations for shared storage modules
 */

declare module '@shared/storage/hypergraphPersistence.js' {
  export function findOrCreateNode(guildId: string, nodeId: string, nodeType: string, name: string, metadata?: object): Promise<number>;
  export function getNodesByType(guildId: string, nodeType: string): Promise<any[]>;
  export function getAllNodes(guildId: string): Promise<any[]>;
  export function findNode(guildId: string, nodeId: string, nodeType: string): Promise<any | null>;
  export function createHyperedge(guildId: string, edgeData: any): Promise<number>;
  export function queryMemoriesByNode(guildId: string, nodeId: string, minUrgency?: number, limit?: number): Promise<any[]>;
  export function getContextualMemories(guildId: string, channelId: string, userId: string, limit?: number): Promise<any[]>;
  export function getUserFacts(guildId: string, userId: string, limit?: number): Promise<any[]>;
  export function getGlobalKnowledge(guildId: string, limit?: number): Promise<any[]>;
  export function searchMemories(guildId: string, keywords: string[], limit?: number): Promise<any[]>;
  export function getGraphData(guildId: string, channelId?: string | null, limit?: number): Promise<any>;
  export function updateMemoryUrgency(guildId: string, decayRate?: number, accessBoost?: number): Promise<any[]>;
  export function pruneLowUrgencyMemories(guildId: string, minUrgency?: number, minAgeDays?: number): Promise<number>;
  export function recordMemoryAccess(hyperedgeId: number): Promise<void>;
  export function getHypergraphStats(guildId: string): Promise<any>;
  export function getAllMemories(guildId: string, minUrgency?: number, limit?: number): Promise<any[]>;
  export function getChannelMemories(guildId: string, channelId: string, minUrgency?: number, limit?: number): Promise<any[]>;
  export function getHypergraphConfig(guildId: string): Promise<any>;
  export function deleteHyperedge(hyperedgeId: number): Promise<void>;
  export function updateHypergraphConfig(guildId: string, config: any): Promise<void>;
}

declare module '@shared/storage/knowledgePersistence.js' {
  export function createRssFeed(guildId: string, data: { url: string; name: string; intervalMinutes?: number }): Promise<any>;
  export function getRssFeeds(guildId: string): Promise<any[]>;
  export function updateRssFeed(id: number, data: { url?: string; name?: string; intervalMinutes?: number; enabled?: boolean }): Promise<any>;
  export function deleteRssFeed(id: number): Promise<void>;
  export function updateRssLastFetched(id: number): Promise<void>;
  export function createIngestedDocument(guildId: string, data: { filename: string; fileType: string }): Promise<any>;
  export function updateDocumentStatus(id: number, data: { status: string; errorMessage?: string | null; processedAt?: boolean | null }): Promise<any>;
  export function getIngestedDocuments(guildId: string): Promise<any[]>;
  export function deleteIngestedDocument(id: number): Promise<void>;
}

declare module '@shared/storage/persistence.js' {
  export function loadRelationships(guildId: string): Promise<any>;
  export function saveRelationships(guildId: string, relationships: any): Promise<void>;
  export function getServerConfig(guildId: string): Promise<any | null>;
  export function saveServerConfig(guildId: string, config: any): Promise<void>;
  export function deleteServerConfig(guildId: string): Promise<void>;
  export function getGlobalConfig(): Promise<any | null>;
  export function saveGlobalConfig(config: any): Promise<void>;
  export function deleteGlobalConfig(): Promise<void>;
  export function getAllServerConfigs(): Promise<any[]>;
  export function loadContexts(guildId: string, channelId: string, maxMessages: number): Promise<any[]>;
  export function saveMessage(guildId: string, channelId: string, authorId: string, authorName: string, content: string): Promise<void>;
  export function saveGuild(guildId: string, guildName: string): Promise<void>;
  export function pruneOldMessages(maxAgeDays: number): Promise<void>;
  export function logBotReply(guildId: string, channelId: string, userId: string, username: string, displayName: string, avatarUrl: string, userMessage: string, botReply: string, processingTimeMs: number, promptTokens: number, responseTokens: number): Promise<void>;
  export function getLatestReplies(limit?: number): Promise<any[]>;
  export function getAnalyticsData(): Promise<any>;
  export function logAnalyticsEvent(eventType: string, guildId: string, channelId: string, userId: string, metadata?: any): Promise<void>;
  export function getAnalyticsOverview(days?: number): Promise<any>;
  export function getAnalyticsVolume(days?: number): Promise<any>;
  export function getAnalyticsDecisions(days?: number): Promise<any>;
  export function getAnalyticsProviders(days?: number): Promise<any>;
  export function getAnalyticsErrors(days?: number, limit?: number): Promise<any>;
  export function getDb(): Promise<any>;
  export function getSqlLogEmitter(): any;
  export function resetPoolWrapper(): void;
}

declare module '@shared/storage/database.js' {
  export function connect(): Promise<any>;
  export function initializeDatabase(): Promise<void>;
  export function getPool(): Promise<any>;
  export function setupSchema(): Promise<void>;
}

declare module '@shared/utils/logger.js' {
  export const logger: {
    onLog(callback: (entry: any) => void): void;
    api(message: string, data?: any): void;
    sql(message: string, data?: any): void;
    message(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: any): void;
  };
  export function initializeLogger(maxLines?: number): void;
}

declare module '@shared/config/configLoader.js' {
  export function loadConfig(): Promise<any>;
  export function getServerConfig(guildId: string): Promise<any>;
  export function updateServerConfig(guildId: string, newConfig: any): Promise<void>;
  export function reloadConfig(): Promise<any>;
  export function getBotConfig(guildId: string): Promise<any>;
  export function getMemoryConfig(): Promise<any>;
  export function getGlobalMemoryConfig(): Promise<any>;
  export function getApiConfig(): Promise<any>;
  export function getReplyBehavior(guildId: string): Promise<any>;
  export function getLoggerConfig(): Promise<any>;
  export function getSandboxConfig(): Promise<any>;
  export function setSqlLoggingEnabled(enabled: boolean): void;
  export function isSqlLoggingEnabled(): boolean;
  export function clearServerConfigCache(guildId: string): void;
}

declare module '@shared/config/validation.js' {
  export function validateEnvironment(): void;
}

declare module '@shared/constants/index.ts' {
  export const OAUTH: any;
  export const TIME: any;
  export const CACHE: any;
  export const DATABASE: any;
  export const LOGGING: any;
  export const LLM: any;
  export const MEMORY: any;
  export const SANDBOX: any;
  export const DISCORD: any;
  export const API: any;
  export const ENV: any;
}

// External module declarations
declare module 'rss-parser' {
  export class Parser<T = any> {
    parseURL(url: string): Promise<T>;
    parseString(content: string): Promise<T>;
  }
  export default Parser;
}

declare module 'pdf-parse' {
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }
  function pdfParse(data: Buffer, options?: any): Promise<PDFParseResult>;
  namespace pdfParse {}
  export default pdfParse;
}

declare module 'multer' {
  import { Request } from 'express';
  
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        stream: NodeJS.ReadableStream;
        buffer: Buffer;
      }
      
      interface FileInfo {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
      }
      
      interface Options {
        dest?: string;
        storage?: StorageEngine;
        limits?: {
          fieldNameSize?: number;
          fieldSize?: number;
          fields?: number;
          fileSize?: number;
          files?: number;
          parts?: number;
          headerPairs?: number;
        };
        preservePath?: boolean;
        fileFilter?: (req: Request, file: File, cb: (error: Error | null, acceptFile?: boolean) => void) => void;
      }
      
      interface StorageEngine {
        _handleFile(req: Request, file: File, callback: (error?: any, info?: Partial<FileInfo>) => void): void;
        _removeFile(req: Request, file: File, callback: (error?: Error) => void): void;
      }
      
      interface DiskStorageOptions {
        destination?: string | ((req: Request, file: File, cb: (error: Error | null, destination: string) => void) => void);
        filename?: (req: Request, file: File, cb: (error: Error | null, filename: string) => void) => void;
      }
      
      interface SingleRequestHandler {
        (req: Request, res: Response, next: (err?: any) => void): void;
      }
    }
  }
  
  interface Multer {
    single(fieldname: string, maxCount?: number): Express.Multer.SingleRequestHandler;
    array(fieldname: string, maxCount?: number): Express.Multer.SingleRequestHandler;
    fields(fields: { name: string; maxCount?: number }[]): Express.Multer.SingleRequestHandler;
    none(): Express.Multer.SingleRequestHandler;
    any(): Express.Multer.SingleRequestHandler;
  }
  
  interface MulterInstance {
    (options?: Multer.Options): Multer;
    diskStorage(options: Multer.DiskStorageOptions): Multer.StorageEngine;
    memoryStorage(): Multer.StorageEngine;
  }
  
  const multer: MulterInstance;
  export default multer;
}

// Extend Express Request type for multer file uploads
declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      files?: Multer.File[];
    }
  }
}
