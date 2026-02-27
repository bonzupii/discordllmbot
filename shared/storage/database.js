/**
 * Database Module
 * 
 * PostgreSQL connection management and schema initialization.
 * Handles connection pooling and database setup.
 * 
 * @module shared/storage/database
 * @requires pg
 */

import pg from 'pg';
import { logger } from '../utils/logger.js';
import { acquireLock, releaseLock, waitForLock } from './lock.js';

const { Pool } = pg;
let pool;
let isConnected = false;
let isSchemaReady = false;
let initPromise = null;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Establishes a connection to the PostgreSQL database.
 * Retries connection up to 3 times with 2-second delays.
 *
 * @returns {Promise<Pool>} The PostgreSQL connection pool.
 * @throws {Error} If connection fails after all retries.
 */
export async function connect() {
    if (pool) return pool;

    let retries = 3;
    while (retries) {
        try {
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                connectionTimeoutMillis: 5000,
                idleTimeoutMillis: 30000,
            });
            await pool.query('SELECT 1'); // Test the connection
            logger.info('✓ Connected to PostgreSQL database.');
            isConnected = true;
            return pool;
        } catch (err) {
            logger.error(`Failed to connect to PostgreSQL database. Retrying in 2 seconds... (${retries} retries left)`);
            retries--;
            await sleep(2000);
        }
    }

    throw new Error('Cannot start without a valid database connection.');
}

/**
 * Initialize database connection and schema at bot startup.
 * This should be called once during bot initialization.
 *
 * @returns {Promise<void>}
 */
export async function initializeDatabase() {
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        await connect();
        await setupSchema();
        isSchemaReady = true;
        logger.info('✓ Database initialization complete.');
    })();
    
    return initPromise;
}

/**
 * Get the database pool.
 * Returns immediately if already initialized, otherwise waits for initialization.
 *
 * @returns {Promise<Pool>} The PostgreSQL connection pool.
 */
export async function getPool() {
    if (isConnected && isSchemaReady) {
        return pool;
    }
    
    // If initialization is in progress, wait for it
    if (initPromise) {
        await initPromise;
        return pool;
    }
    
    // Fallback: initialize on demand (for backward compatibility)
    await initializeDatabase();
    return pool;
}

/**
 * Sets up the database schema if it doesn't exist.
 * Uses a lock to prevent race conditions during initialization.
 *
 * @returns {Promise<void>}
 */
export async function setupSchema() {
    logger.info('setupSchema: Called');
    if (!acquireLock()) {
        logger.info('Schema setup already in progress, waiting for it to complete.');
        await waitForLock();
        logger.info('Schema setup lock released, proceeding.');
        return;
    }

    logger.info('setupSchema: Lock acquired, connecting...');
    if (!pool) await connect();
    logger.info('setupSchema: Connected, running queries...');

    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS guilds (
                guildId TEXT PRIMARY KEY,
                guildName TEXT NOT NULL
            );`,
            `CREATE TABLE IF NOT EXISTS relationships (
                guildId TEXT NOT NULL REFERENCES guilds(guildId) ON DELETE CASCADE,
                userId TEXT NOT NULL,
                attitude TEXT,
                PRIMARY KEY (guildId, userId)
            );`,
            `ALTER TABLE relationships ADD COLUMN IF NOT EXISTS username TEXT;`,
            `ALTER TABLE relationships ADD COLUMN IF NOT EXISTS displayName TEXT;`,
            `ALTER TABLE relationships ADD COLUMN IF NOT EXISTS avatarUrl TEXT;`,
            `ALTER TABLE relationships ADD COLUMN IF NOT EXISTS ignored BOOLEAN DEFAULT FALSE;`,
            `CREATE TABLE IF NOT EXISTS relationship_behaviors (
                id SERIAL PRIMARY KEY,
                guildId TEXT NOT NULL REFERENCES guilds(guildId) ON DELETE CASCADE,
                userId TEXT NOT NULL,
                behavior TEXT NOT NULL,
                FOREIGN KEY (guildId, userId) REFERENCES relationships(guildId, userId) ON DELETE CASCADE
            );`,
            `CREATE TABLE IF NOT EXISTS relationship_boundaries (
                id SERIAL PRIMARY KEY,
                guildId TEXT NOT NULL REFERENCES guilds(guildId) ON DELETE CASCADE,
                userId TEXT NOT NULL,
                boundary TEXT NOT NULL,
                FOREIGN KEY (guildId, userId) REFERENCES relationships(guildId, userId) ON DELETE CASCADE
            );`,
            `CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                guildId TEXT NOT NULL REFERENCES guilds(guildId) ON DELETE CASCADE,
                channelId TEXT NOT NULL,
                authorId TEXT NOT NULL,
                authorName TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS bot_replies (
                id SERIAL PRIMARY KEY,
                guildId TEXT NOT NULL REFERENCES guilds(guildId) ON DELETE CASCADE,
                channelId TEXT NOT NULL,
                userId TEXT NOT NULL,
                username TEXT NOT NULL,
                displayName TEXT,
                avatarUrl TEXT,
                userMessage TEXT NOT NULL,
                botReply TEXT NOT NULL,
                processingTimeMs INTEGER,
                promptTokens INTEGER,
                responseTokens INTEGER,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS server_configs (
                guildId TEXT PRIMARY KEY REFERENCES guilds(guildId) ON DELETE CASCADE,
                nickname TEXT,
                speakingStyle JSONB NOT NULL,
                replyProbability DOUBLE PRECISION NOT NULL,
                minDelayMs INTEGER NOT NULL,
                maxDelayMs INTEGER NOT NULL,
                mentionOnly BOOLEAN NOT NULL,
                ignoreUsers JSONB NOT NULL DEFAULT '[]'::jsonb,
                ignoreChannels JSONB NOT NULL DEFAULT '[]'::jsonb,
                ignoreKeywords JSONB NOT NULL DEFAULT '[]'::jsonb,
                guildSpecificChannels JSONB NOT NULL DEFAULT '{}'::jsonb,
                createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE INDEX IF NOT EXISTS idx_server_configs_guildId ON server_configs(guildId);`,
            `CREATE INDEX IF NOT EXISTS idx_server_configs_updated_at ON server_configs(updatedAt);`,
            `CREATE TABLE IF NOT EXISTS global_config (
                id TEXT PRIMARY KEY DEFAULT 'global',
                botUsername TEXT NOT NULL,
                botDescription TEXT NOT NULL,
                botGlobalRules JSONB NOT NULL,
                llmProvider TEXT NOT NULL,
                llmGeminiModel TEXT NOT NULL,
                llmOllamaModel TEXT NOT NULL,
                llmQwenModel TEXT NOT NULL,
                llmGeminiApiKey TEXT,
                llmOllamaApiKey TEXT,
                llmQwenApiKey TEXT,
                llmRetryAttempts INTEGER NOT NULL,
                llmRetryBackoffMs INTEGER NOT NULL,
                memoryMaxMessages INTEGER NOT NULL,
                memoryMaxMessageAgeDays INTEGER NOT NULL,
                loggerMaxLogLines INTEGER NOT NULL,
                loggerLogReplyDecisions BOOLEAN NOT NULL,
                loggerLogSql BOOLEAN NOT NULL,
                createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );`,

            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS botUsername TEXT DEFAULT 'BotUsername';`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS botDescription TEXT DEFAULT 'A helpful and friendly Discord bot.';`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS botGlobalRules JSONB DEFAULT '[]'::jsonb;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS llmProvider TEXT DEFAULT 'gemini';`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS llmGeminiModel TEXT DEFAULT 'gemini-2.0-flash';`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS llmOllamaModel TEXT DEFAULT 'llama3.2';`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS llmQwenModel TEXT DEFAULT 'qwen-plus';`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS llmGeminiApiKey TEXT;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS llmOllamaApiKey TEXT;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS llmQwenApiKey TEXT;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS llmRetryAttempts INTEGER DEFAULT 3;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS llmRetryBackoffMs INTEGER DEFAULT 1000;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS memoryMaxMessages INTEGER DEFAULT 25;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS memoryMaxMessageAgeDays INTEGER DEFAULT 30;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS loggerMaxLogLines INTEGER DEFAULT 1000;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS loggerLogReplyDecisions BOOLEAN DEFAULT FALSE;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS loggerLogSql BOOLEAN DEFAULT FALSE;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS sandboxEnabled BOOLEAN DEFAULT FALSE;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS sandboxTimeoutMs INTEGER DEFAULT 30000;`,
            `ALTER TABLE global_config ADD COLUMN IF NOT EXISTS sandboxAllowedCommands JSONB DEFAULT '["ps", "stats", "images", "top", "logs", "inspect", "version", "info", "df", "free", "uname"]'::jsonb;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS nickname TEXT;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS speakingStyle JSONB DEFAULT '[]'::jsonb;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS replyProbability DOUBLE PRECISION DEFAULT 1.0;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS minDelayMs INTEGER DEFAULT 500;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS maxDelayMs INTEGER DEFAULT 3000;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS mentionOnly BOOLEAN DEFAULT TRUE;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS ignoreUsers JSONB DEFAULT '[]'::jsonb;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS ignoreChannels JSONB DEFAULT '[]'::jsonb;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS ignoreKeywords JSONB DEFAULT '[]'::jsonb;`,
            `ALTER TABLE server_configs ADD COLUMN IF NOT EXISTS guildSpecificChannels JSONB DEFAULT '{}'::jsonb;`
        ];

        logger.info('setupSchema: Verifying and updating schema...');
        for (const query of queries) {
            await pool.query(query);
        }

        // Add columns to bot_replies if they don't exist, for backward compatibility
        const columns = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'bot_replies'
        `);
        const columnNames = columns.rows.map(r => r.column_name);

        let schemaUpdated = false;
        if (!columnNames.includes('displayname')) {
            await pool.query('ALTER TABLE bot_replies ADD COLUMN displayName TEXT;');
            schemaUpdated = true;
        }

        if (!columnNames.includes('avatarurl')) {
            await pool.query('ALTER TABLE bot_replies ADD COLUMN avatarUrl TEXT;');
            schemaUpdated = true;
        }

        if (!columnNames.includes('processingtimems')) {
            await pool.query('ALTER TABLE bot_replies ADD COLUMN processingTimeMs INTEGER;');
            schemaUpdated = true;
        }

        if (!columnNames.includes('prompttokens')) {
            await pool.query('ALTER TABLE bot_replies ADD COLUMN promptTokens INTEGER;');
            schemaUpdated = true;
        }

        if (!columnNames.includes('responsetokens')) {
            await pool.query('ALTER TABLE bot_replies ADD COLUMN responseTokens INTEGER;');
            schemaUpdated = true;
        }

        if (schemaUpdated) {
            logger.info('Updated bot_replies table for backward compatibility.');
        }

        logger.info('✓ Database schema verified/created.');
    } catch (err) {
        logger.error('Failed to set up database schema', err);
        throw new Error('Cannot start without a valid database schema.');
    } finally {
        logger.info('setupSchema: Releasing lock...');
        releaseLock();
    }
}
