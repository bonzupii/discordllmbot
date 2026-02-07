import { saveMessage, loadContexts } from '../storage/persistence.js';
import { getMemoryConfig } from '../config/configLoader.js';

const guildContexts = {};

export function addMessage(guildId, channelId, authorId, authorName, content) {
    guildContexts[guildId] ??= {};
    guildContexts[guildId][channelId] ??= [];

    const { maxMessages } = getMemoryConfig();

    const message = { authorId, author: authorName, content };
    guildContexts[guildId][channelId].push(message);

    if (guildContexts[guildId][channelId].length > maxMessages) {
        guildContexts[guildId][channelId].shift();
    }

    saveMessage(guildId, channelId, authorId, authorName, content);
}

export function getContext(guildId, channelId) {
    return guildContexts[guildId]?.[channelId] ?? [];
}

export function loadGuildContexts(guildId) {
    // Since we are now loading contexts on a per-channel basis, this function can be simplified.
    // We will load the context for each channel as it is needed.
    guildContexts[guildId] = {};
}
