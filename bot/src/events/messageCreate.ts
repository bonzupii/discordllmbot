/**
 * Message Create Event Handler
 * 
 * Handles incoming Discord messages and decides whether to reply.
 * Manages context, relationships, and LLM interaction.
 * 
 * @module bot/src/events/messageCreate
 */

import { Message, Client } from 'discord.js';
import { logger } from '../../../shared/utils/logger.js';
import { generateReply } from '../llm/index.js';
import { getRelationship } from '../personality/relationships.js';
import { addMessage } from '../memory/context.js';
import { loadContexts, logBotReply } from '../../../shared/storage/persistence.js';
import { buildPrompt } from '../core/prompt.js';
import { shouldReply } from '../core/replyDecider.js';
import { getBotConfig, getApiConfig, getReplyBehavior, getMemoryConfig } from '../../../shared/config/configLoader.js';
import { getAllRelationships } from '../personality/relationships.js';

/**
 * Handles the messageCreate Discord event.
 * Processes messages and generates replies when appropriate.
 * 
 * @param message - The Discord message object
 * @param client - The Discord client instance
 */
export async function handleMessageCreate(message: Message, client: Client): Promise<void> {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildId = message.guild.id;
    const cleanMessage = message.content.replace(/<@!?\d+>/g, '').trim();
    const channelName = (message.channel as { name?: string }).name ?? 'unknown';

    console.log(`DEBUG: Processing message from guild: ${message.guild.name} (${guildId}), channel: #${channelName}, user: ${message.author.username}`);

    const botConfig = await getBotConfig(guildId);
    const memoryConfig = await getMemoryConfig(guildId);
    const replyBehavior = await getReplyBehavior(guildId);

    const guildSpecificChannels = (replyBehavior.guildSpecificChannels as Record<string, { ignored?: string[] }>) ?? {};
    const guildIgnoredChannels = guildSpecificChannels[guildId]?.ignored ?? [];
    const isChannelIgnored = guildIgnoredChannels.includes(message.channel.id);

    if (isChannelIgnored) {
        console.log(`DEBUG: Channel #${channelName} (${message.channel.id}) is ignored, skipping message storage`);
        return;
    }

    console.log(`DEBUG: Retrieved configs for guild ${guildId}. Bot name: ${botConfig.name}, MentionOnly: ${replyBehavior.mentionOnly}, Reply Probability: ${replyBehavior.replyProbability}`);

    logger.message(`@mention from ${message.author.username} in #${channelName}: "${cleanMessage}"`);

    try {
        const relationship = getRelationship(
            guildId,
            message.author.id
        );

        console.log(`DEBUG: Retrieved relationship for user ${message.author.id} in guild ${guildId}:`, relationship);

        await addMessage(
            guildId,
            message.channel.id,
            message.author.id,
            message.author.username,
            message.content
        );

        const { maxMessages } = memoryConfig;
        const context = (await loadContexts(guildId, message.channel.id, maxMessages)).slice(0, -1);
        const guildRelationships = getAllRelationships()[guildId] ?? {};

        console.log(`DEBUG: Loaded context with ${context.length} messages, ${Object.keys(guildRelationships).length} relationships in guild ${guildId}`);

        const prompt = await buildPrompt({
            relationship,
            context,
            guildRelationships,
            guildName: message.guild.name,
            userMessage: cleanMessage,
            username: message.author.username,
            botConfig,
            guildId
        });

        const isMentioned = message.mentions.has(client.user);
        console.log(`DEBUG: Checking if should reply. Is mentioned: ${isMentioned}, Reply behavior:`, replyBehavior);
        
        const replyDecision = await shouldReply({ message, isMentioned, replyBehavior, relationship, context, botName: botConfig.name });
        console.log(`DEBUG: Reply decision result: ${replyDecision.result}, reason: ${replyDecision.reason}`);

        if (!replyDecision.result) {
            console.log(`DEBUG: Bot decided not to reply in guild ${message.guild.name} (${guildId})`);
            return;
        }

        console.log(`DEBUG: Bot decided to reply in guild ${message.guild.name} (${guildId})`);

        const startTime = Date.now();
        const { text: reply, usageMetadata } = await generateReply(prompt);
        const processingTimeMs = Date.now() - startTime;

        console.log(`DEBUG: Generated reply from LLM for guild ${message.guild.name} (${guildId}), length: ${reply?.length ?? 0} chars`);

        if (reply) {
            let finalReply = reply;
            if (reply.length > 2000) {
                finalReply = reply.substring(0, 1997) + '...';
                logger.warn(`Reply truncated from ${reply.length} to 2000 chars`);
            }

            console.log(`DEBUG: Sending reply to guild ${message.guild.name} (${guildId}), final length: ${finalReply.length}`);

            const textChannel = message.channel as { sendTyping: () => Promise<void> };
            await textChannel.sendTyping();

            await message.reply(finalReply);

            await logBotReply(
                message.guild.id,
                message.channel.id,
                message.author.id,
                message.author.username,
                message.member?.displayName ?? message.author.username,
                message.author.displayAvatarURL({ extension: 'png', size: 64 }),
                cleanMessage,
                finalReply,
                processingTimeMs,
                usageMetadata?.promptTokenCount ?? undefined,
                usageMetadata?.candidatesTokenCount ?? undefined
            );

            await addMessage(
                guildId,
                message.channel.id,
                client.user.id,
                botConfig.name,
                finalReply
            );

            const apiConfig = await getApiConfig();
            const provider = apiConfig.provider ?? 'gemini';
            const providerModel = provider === 'ollama'
                ? (apiConfig.ollamaModel ?? 'llama3.2')
                : provider === 'qwen'
                    ? (apiConfig.qwenModel ?? 'qwen-plus')
                    : (apiConfig.geminiModel ?? 'gemini-2.0-flash');
            logger.api(`→ ${provider}(${providerModel}):generateReply() -> Discord API: message.reply()`);

            const replyPreview = finalReply.substring(0, 80).replace(/\n/g, ' ');
            logger.message(`✓ Replied to ${message.author.username}: "${replyPreview}"`);
        } else {
            console.log(`DEBUG: No reply generated from LLM for guild ${message.guild.name} (${guildId})`);
        }
    } catch (err) {
        console.error(`DEBUG: Error handling messageCreate event in guild ${message.guild.name} (${guildId}):`, err);
        logger.error('Error handling messageCreate event', err);
    }
}
