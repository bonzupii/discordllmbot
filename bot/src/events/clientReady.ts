/**
 * Client Ready Event Handler
 * 
 * Handles the Discord clientReady event.
 * Updates bot profile and loads guild data on startup.
 * 
 * @module bot/src/events/clientReady
 */

import { Client, Guild } from 'discord.js';
import { logger } from '../../../shared/utils/logger.js';
import { updateDiscordProfile } from '../utils/profileUpdater.js';
import { loadGuildRelationships, initializeGuildRelationships } from '../personality/relationships.js';
import { loadGuildContexts } from '../memory/context.js';

/**
 * Bot configuration interface.
 */
interface BotConfig {
    name: string;
    description: string;
    persona: string;
}

/**
 * Handles the clientReady event.
 * 
 * @param client - The Discord client instance
 * @param botConfig - The bot configuration
 */
export async function handleClientReady(client: Client, botConfig: BotConfig): Promise<void> {
    logger.info(`✓ Logged in as ${client.user?.tag}`);
    
    await updateDiscordProfile(client, {
        username: botConfig.name,
        avatarUrl: undefined
    });

    const guildCount = client.guilds.cache.size;
    if (guildCount === 0) {
        logger.info('Not connected to any servers');
    } else {
        logger.info(`✓ Connected to ${guildCount} server${guildCount > 1 ? 's' : ''}`);
    }

    try {
        for (const [, guild] of client.guilds.cache) {
            try {
                loadGuildRelationships(guild.id);
                loadGuildContexts(guild.id);
                await initializeGuildRelationships(guild);
                logger.info(`Initialized relationships and contexts for server "${guild.name}"`);
            } catch (e) {
                logger.warn(`Failed to initialize guild data for server "${guild.name}"`, e);
            }
        }
    } catch (e) {
        logger.warn('Error during guild initialization', e);
    }
}
