import pg from 'pg';
import { logger } from '../utils/logger.js';
import { acquireLock, releaseLock, waitForLock } from './lock.js';

const { Pool } = pg;
let pool;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function connect() {
    if (pool) return pool;

    let retries = 5;
    while (retries) {
        try {
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
            });
            await pool.query('SELECT 1'); // Test the connection
            logger.info('✓ Connected to PostgreSQL database.');
            return pool;
        } catch (err) {
            logger.error(`Failed to connect to PostgreSQL database. Retrying in 5 seconds... (${retries} retries left)`);
            retries--;
            await sleep(5000);
        }
    }

    throw new Error('Cannot start without a valid database connection.');
}

export async function setupSchema() {
    if (!acquireLock()) {
        logger.info('Schema setup already in progress, waiting for it to complete.');
        await waitForLock();
        logger.info('Schema setup lock released, proceeding.');
        return;
    }

    if (!pool) await connect();

    try {
        const queries = [
            `CREATE TABLE IF NOT EXISTS relationships (
                guildId TEXT NOT NULL,
                userId TEXT NOT NULL,
                attitude TEXT,
                PRIMARY KEY (guildId, userId)
            );`,
            `CREATE TABLE IF NOT EXISTS relationship_behaviors (
                id SERIAL PRIMARY KEY,
                guildId TEXT NOT NULL,
                userId TEXT NOT NULL,
                behavior TEXT NOT NULL,
                FOREIGN KEY (guildId, userId) REFERENCES relationships(guildId, userId) ON DELETE CASCADE
            );`,
            `CREATE TABLE IF NOT EXISTS relationship_boundaries (
                id SERIAL PRIMARY KEY,
                guildId TEXT NOT NULL,
                userId TEXT NOT NULL,
                boundary TEXT NOT NULL,
                FOREIGN KEY (guildId, userId) REFERENCES relationships(guildId, userId) ON DELETE CASCADE
            );`,
            `CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                guildId TEXT NOT NULL,
                channelId TEXT NOT NULL,
                authorId TEXT NOT NULL,
                authorName TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );`
        ];

        for (const query of queries) {
            await pool.query(query);
        }

        logger.info('✓ Database schema verified/created.');
    } catch (err) {
        logger.error('Failed to set up database schema', err);
        throw new Error('Cannot start without a valid database schema.');
    } finally {
        releaseLock();
    }
}
