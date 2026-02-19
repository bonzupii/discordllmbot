import { loadRelationships, saveRelationships, saveGuild } from '../../../shared/storage/persistence.js';
import { getBotConfig } from '../../../shared/config/configLoader.js';
import { Guild } from 'discord.js';

interface Relationship {
    username: string;
    displayName: string;
    avatarUrl?: string;
    attitude: string;
    behavior: string[];
    boundaries: string[];
    ignored?: boolean;
}

interface GuildRelationships {
    [userId: string]: Relationship;
}

const guildRelationships: Record<string, GuildRelationships> = {};

function createDefaultRelationship(): Relationship {
    return {
        username: '',
        displayName: '',
        attitude: 'neutral',
        behavior: [
            'treat them like a normal server regular'
        ],
        boundaries: []
    };
}

async function getDefaultRelationship(): Promise<Relationship> {
    try {
        const botConfig = await getBotConfig('') as Record<string, unknown>;
        const defaultRel = botConfig.defaultRelationship as Relationship | undefined;
        return defaultRel ?? createDefaultRelationship();
    } catch {
        return createDefaultRelationship();
    }
}

export function getRelationship(guildId: string, userId: string): Relationship {
    return guildRelationships[guildId]?.[userId] ?? createDefaultRelationship();
}

export function setRelationship(guildId: string, guildName: string, userId: string, config: Relationship): void {
    guildRelationships[guildId] ??= {};
    guildRelationships[guildId][userId] = config;
    saveGuildRelationships(guildId, guildName);
}

export async function loadGuildRelationships(guildId: string): Promise<GuildRelationships> {
    const rels = await loadRelationships(guildId);
    guildRelationships[guildId] = rels;
    return rels;
}

export async function saveGuildRelationships(guildId: string, guildName: string): Promise<void> {
    if (guildRelationships[guildId]) {
        await saveRelationships(guildId, guildRelationships[guildId]);
    }
}

export async function initializeGuildRelationships(guild: Guild): Promise<void> {
    const guildId = guild.id;
    const guildName = guild.name;

    await saveGuild(guildId, guildName);

    const existingRels = await loadRelationships(guildId);
    guildRelationships[guildId] = existingRels;

    const staleUsers = new Set(Object.keys(existingRels));

    let members;
    try {
        members = await guild.members.fetch();
    } catch {
        members = guild.members.cache;
    }

    const defaultRel = await getDefaultRelationship();
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
                behavior: Array.isArray(defaultRel.behavior) ? [...defaultRel.behavior] : [],
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
        await saveRelationships(guildId, guildRelationships[guildId]);
    }
}

export function getAllRelationships(): Record<string, GuildRelationships> {
    return guildRelationships;
}
