import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { validateEnvironment } from '../../shared/config/validation.js';
import { logger, initializeLogger } from '../../shared/utils/logger.js';
import { pruneOldMessages, resetPoolWrapper, getDb } from '../../shared/storage/persistence.js';
import { initializeDatabase } from '../../shared/storage/database.js';
import { handleClientReady, handleMessageCreate, handleGuildCreate, handleGuildMemberAdd } from './events/index.js';
import { startApi } from './api/server.js';

initializeLogger(undefined);

async function startBot(): Promise<void> {
    let cleanupInterval: NodeJS.Timeout | null = null;

    try {
        const BOT_CONFIG_PATH = path.join(process.cwd(), 'shared', 'config', 'bot.json');
        let initialMaxLogLines: number | undefined;
        let initialSqlLogging = false;
        if (fs.existsSync(BOT_CONFIG_PATH)) {
            const cfg = JSON.parse(fs.readFileSync(BOT_CONFIG_PATH, 'utf-8'));
            initialMaxLogLines = cfg?.logger?.maxLogLines;
            initialSqlLogging = cfg?.logger?.logSql ?? false;
            if (initialMaxLogLines !== undefined) {
                initializeLogger(initialMaxLogLines);
            }
        }

        const { setSqlLoggingEnabled } = await import('../../shared/config/configLoader.js');
        setSqlLoggingEnabled(initialSqlLogging);

        logger.info('Initializing database...');
        await initializeDatabase();
        logger.info('Database ready.');

        const { loadConfig, getGlobalMemoryConfig } = await import('../../shared/config/configLoader.js');
        const fullConfig = await loadConfig();
        
        initializeLogger(fullConfig.logger?.maxLogLines);
        
        setSqlLoggingEnabled(fullConfig.logger?.logSql ?? false);
        resetPoolWrapper();
        await getDb();
        const botConfig = fullConfig.bot;

        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ],
            partials: [Partials.Channel]
        });

        validateEnvironment();

        client.once('clientReady', async () => {
            handleClientReady(client, botConfig);
            cleanupInterval = setInterval(async () => {
                try {
                    const memoryConfig = await getGlobalMemoryConfig();
                    await pruneOldMessages(memoryConfig.maxMessageAgeDays);
                } catch (err) {
                    logger.error('Error during message pruning', err);
                }
            }, 1000 * 60 * 60 * 24);
        });
        client.on('messageCreate', (message) => handleMessageCreate(message, client));
        client.on('guildCreate', handleGuildCreate);
        client.on('guildMemberAdd', handleGuildMemberAdd);

        startApi(client);

        process.on('SIGINT', async () => {
            logger.info('Received SIGINT, shutting down gracefully...');
            try {
                if (cleanupInterval) {
                    clearInterval(cleanupInterval);
                }
                await client.destroy();
                logger.info('✓ Discord client disconnected');
            } catch (err) {
                logger.error('Error during shutdown', err);
            }
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM, shutting down gracefully...');
            try {
                if (cleanupInterval) {
                    clearInterval(cleanupInterval);
                }
                await client.destroy();
                logger.info('✓ Discord client disconnected');
            } catch (err) {
                logger.error('Error during shutdown', err);
            }
            process.exit(0);
        });

        client.login(process.env.DISCORD_TOKEN);
    } catch (err) {
        logger.error('Failed to start bot', err);
        if (cleanupInterval) {
            clearInterval(cleanupInterval);
        }
        process.exit(1);
    }
}

startBot();
