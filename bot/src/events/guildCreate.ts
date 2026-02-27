/**
 * Guild Create Event Handler
 * 
 * Handles when the bot joins a new guild.
 * Initializes relationship and context data for the guild.
 * 
 * @module bot/src/events/guildCreate
 */

import { Guild } from 'discord.js';
import { logger } from '@shared/utils/logger.js';
import { initializeGuildRelationships } from '@/personality/relationships.js';
import { loadGuildContexts } from '@/memory/context.js';

/**
 * Handles the guildCreate event when bot joins a server.
 * 
 * @param guild - The Discord guild that was joined
 */
export async function handleGuildCreate(guild: Guild): Promise<void> {
    try {
        await initializeGuildRelationships(guild);
        await loadGuildContexts(guild.id);
        logger.info(`Guild joined: initialized guild data for server "${guild.name}"`);
    } catch (e) {
        logger.warn(`Failed to initialize guild data for server "${guild.name}"`, e);
    }
}
