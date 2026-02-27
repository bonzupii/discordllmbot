/**
 * User Relationships Module
 * 
 * Manages per-user relationship data including attitudes, behaviors, and boundaries.
 * Provides in-memory caching with PostgreSQL persistence.
 * 
 * @module bot/src/personality/relationships
 */

import { loadRelationships, saveRelationships, saveGuild, Relationships } from '@shared/storage/persistence.js';
import { Guild } from 'discord.js';

/**
 * Represents relationship data for a user in a guild.
 */
export interface Relationship {
    username: string;
    displayName: string;
    avatarUrl?: string;
    attitude: string;
    behavior: string[];
    boundaries: string[];
    ignored?: boolean;
}

/**
 * Map of user IDs to their relationships in a guild.
 */
export interface GuildRelationships {
    [userId: string]: Relationship;
}

/**
 * In-memory cache of relationships per guild.
 */
const guildRelationships: Record<string, GuildRelationships> = {};

/**
 * Creates a default relationship with neutral attitude.
 * 
 * @returns Default relationship object
 */
function createDefaultRelationship(): Relationship {
    return {
        username: '',
        displayName: '',
        attitude: 'neutral',
        behavior: ['treat them like a normal server regular'],
        boundaries: []
    };
}

/**
 * Gets the relationship for a specific user in a guild.
 * 
 * @param guildId - The Discord guild ID
 * @param userId - The Discord user ID
 * @returns The user's relationship data
 */
export function getRelationship(guildId: string, userId: string): Relationship {
    return guildRelationships[guildId]?.[userId] ?? createDefaultRelationship();
}

/**
 * Sets the relationship for a specific user in a guild.
 * 
 * @param guildId - The Discord guild ID
 * @param guildName - The Discord guild name
 * @param userId - The Discord user ID
 * @param config - The relationship data to set
 */
export function setRelationship(guildId: string, guildName: string, userId: string, config: Relationship): void {
    guildRelationships[guildId] ??= {};
    guildRelationships[guildId][userId] = config;
    saveGuildRelationships(guildId, guildName);
}

/**
 * Loads all relationships for a guild from the database.
 * 
 * @param guildId - The Discord guild ID
 * @returns Promise resolving to the guild's relationships
 */
export async function loadGuildRelationships(guildId: string): Promise<GuildRelationships> {
    const rels = await loadRelationships(guildId) as unknown as GuildRelationships;
    guildRelationships[guildId] = rels;
    return rels;
}

/**
 * Saves all relationships for a guild to the database.
 * 
 * @param guildId - The Discord guild ID
 * @param guildName - The Discord guild name
 */
export async function saveGuildRelationships(guildId: string, _guildName: string): Promise<void> {
    if (guildRelationships[guildId]) {
        await saveRelationships(guildId, guildRelationships[guildId] as unknown as Relationships);
    }
}

export async function initializeGuildRelationships(guild: Guild): Promise<void> {
    const guildId = guild.id;

    if (guildRelationships[guildId]) {
        return;
    }

    const guildName = guild.name;

    await saveGuild(guildId, guildName);

    const existingRels = await loadRelationships(guildId) as unknown as GuildRelationships;
    guildRelationships[guildId] = existingRels;

    const staleUsers = new Set(Object.keys(existingRels));

    let members;
    try {
        members = await guild.members.fetch();
    } catch {
        members = guild.members.cache;
    }

    const defaultRel = createDefaultRelationship();
    let changed = false;

    for (const [, member] of members) {
        if (member.user?.bot) continue;

        staleUsers.delete(member.id);

        const existing = guildRelationships[guildId]?.[member.id];
        const displayName = member.displayName ?? member.user?.username ?? member.id;
        const username = member.user?.username ?? member.id;
        const avatarUrl = member.user?.displayAvatarURL({ forceStatic: true, size: 64 });

        if (!existing) {
            guildRelationships[guildId][member.id] = {
                username,
                displayName,
                avatarUrl,
                attitude: defaultRel.attitude,
                behavior: typeof defaultRel.behavior === 'string' ? [defaultRel.behavior] : defaultRel.behavior ?? [],
                boundaries: Array.isArray(defaultRel.boundaries) ? [...defaultRel.boundaries] : [],
                ignored: false
            };
            changed = true;
        } else {
            if (existing.username !== username || existing.displayName !== displayName || existing.avatarUrl !== avatarUrl) {
                existing.username = username;
                existing.displayName = displayName;
                existing.avatarUrl = avatarUrl;
                changed = true;
            }
        }
    }

    for (const userId of staleUsers) {
        delete guildRelationships[guildId][userId];
        changed = true;
    }

    if (changed) {
        await saveRelationships(guildId, guildRelationships[guildId] as unknown as Relationships);
    }
}

/**
 * Gets all relationships for all guilds.
 * 
 * @returns Record of guild IDs to their relationships
 */
export function getAllRelationships(): Record<string, GuildRelationships> {
    return guildRelationships;
}
