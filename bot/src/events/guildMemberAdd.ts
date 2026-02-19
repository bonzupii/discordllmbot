/**
 * Guild Member Add Event Handler
 * 
 * Handles when a new member joins a guild.
 * Creates a default relationship entry for the new member.
 * 
 * @module bot/src/events/guildMemberAdd
 */

import { GuildMember } from 'discord.js';
import { logger } from '../../../shared/utils/logger.js';
import { setRelationship } from '../personality/relationships.js';
import { getBotConfig } from '../../../shared/config/configLoader.js';

/**
 * Default relationship configuration.
 */
interface DefaultRelationship {
    attitude?: string;
    behavior?: string[];
    boundaries?: string[];
}

/**
 * Handles the guildMemberAdd event.
 * 
 * @param member - The Discord guild member that joined
 */
export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
    if (member.user.bot) return;
    const guildId = member.guild.id;
    const guildName = member.guild.name;
    const userId = member.id;

    try {
        const displayName = member.displayName ?? member.user.username ?? userId;
        const username = member.user.username ?? userId;
        const botConfig = await getBotConfig(guildId) as Record<string, unknown>;
        const defaultRel = (botConfig.defaultRelationship as DefaultRelationship) ?? { attitude: 'neutral', behavior: [], boundaries: [] };

        setRelationship(guildId, guildName, userId, {
            username,
            displayName,
            attitude: defaultRel.attitude || 'neutral',
            behavior: Array.isArray(defaultRel.behavior) ? [...defaultRel.behavior] : [],
            boundaries: Array.isArray(defaultRel.boundaries) ? [...defaultRel.boundaries] : []
        });

        logger.info(`Relationship entry created for new member ${username} in server "${guildName}"`);
    } catch (e) {
        logger.warn(`Failed to add relationship for new member ${member.id} in server "${member.guild.name}"`, e);
    }
}
