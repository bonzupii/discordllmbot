import { saveMessage } from '../../../shared/storage/persistence.js';
import { getMemoryConfig } from '../../../shared/config/configLoader.js';

interface Message {
    authorId: string;
    author: string;
    content: string;
}

interface ChannelContext {
    [channelId: string]: Message[];
}

interface GuildContext {
    [guildId: string]: ChannelContext;
}

const guildContexts: GuildContext = {};

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

export function getContext(guildId: string, channelId: string): Message[] {
    return guildContexts[guildId]?.[channelId] ?? [];
}

export function loadGuildContexts(guildId: string): void {
    guildContexts[guildId] = {};
}
