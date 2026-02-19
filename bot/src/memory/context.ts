/**
 * Context Memory Module
 * 
 * Manages in-memory message history per channel for context-aware replies.
 * Persists messages to PostgreSQL for durability.
 * 
 * @module bot/src/memory/context
 */

import { saveMessage } from '../../../shared/storage/persistence.js';
import { getMemoryConfig } from '../../../shared/config/configLoader.js';

/**
 * Represents a single message in the context.
 */
interface Message {
    authorId: string;
    author: string;
    content: string;
}

/**
 * Channel context mapping channel IDs to message arrays.
 */
interface ChannelContext {
    [channelId: string]: Message[];
}

/**
 * Guild context mapping guild IDs to channel contexts.
 */
interface GuildContext {
    [guildId: string]: ChannelContext;
}

/**
 * In-memory storage for all guild contexts.
 */
const guildContexts: GuildContext = {};

/**
 * Adds a message to the channel context and persists to database.
 * 
 * @param guildId - The Discord guild ID
 * @param channelId - The Discord channel ID
 * @param authorId - The message author ID
 * @param authorName - The message author name
 * @param content - The message content
 * @returns {Promise<void>}
 * @example
 * const result = await addMessage('123456789', '987654321', '111222333', 'UserName', 'Hello world!');
 */
export async function addMessage(guildId: string, channelId: string, authorId: string, authorName: string, content: string): Promise<void> {
    guildContexts[guildId] ??= {};
    guildContexts[guildId][channelId] ??= [];

    const memoryConfig = await getMemoryConfig(guildId);
    const maxMessages = memoryConfig.maxContextMessages;

    const message: Message = { authorId, author: authorName, content };
    guildContexts[guildId][channelId].push(message);

    if (guildContexts[guildId][channelId].length > maxMessages) {
        guildContexts[guildId][channelId].shift();
    }

    await saveMessage(guildId, channelId, authorId, authorName, content);
}

/**
 * Gets the message context for a specific channel.
 * 
 * @param guildId - The Discord guild ID
 * @param channelId - The Discord channel ID
 * @returns Array of messages in the channel context
 */
export function getContext(guildId: string, channelId: string): Message[] {
    return guildContexts[guildId]?.[channelId] ?? [];
}

/**
 * Initializes an empty context for a guild.
 * 
 * @param guildId - The Discord guild ID
 */
export function loadGuildContexts(guildId: string): void {
    guildContexts[guildId] = {};
}
