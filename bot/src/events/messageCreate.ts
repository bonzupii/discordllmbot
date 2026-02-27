/**
 * Message Create Event Handler
 *
 * Handles incoming Discord messages and decides whether to reply.
 * Uses hypergraph memory system for long-term context and recent messages for continuity.
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
import { getBotConfig, getApiConfig, getReplyBehavior } from '../../../shared/config/configLoader.js';
import { getAllRelationships } from '../personality/relationships.js';
import { extractDockerCommand, executeInSandbox, isSandboxEnabled } from '../sandbox/index.js';
import { createMemoryData } from '../memory/structuralExtractor.js';
import { createHyperedge, getHypergraphConfig } from '../../../shared/storage/hypergraphPersistence.js';

const SANDBOX_KEYWORDS = ['docker', 'sandbox', 'container', 'docker command'];

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

    logger.message(`Received message from ${message.author.username} in ${message.guild.name}/#${channelName}`, {
        guildId,
        channelId: message.channel.id,
        userId: message.author.id,
    });

    const botConfig = await getBotConfig(guildId);
    const replyBehavior = await getReplyBehavior(guildId);

    const guildSpecificChannels = (replyBehavior.guildSpecificChannels as Record<string, { ignored?: string[] }>) ?? {};
    const guildIgnoredChannels = guildSpecificChannels[guildId]?.ignored ?? [];
    const isChannelIgnored = guildIgnoredChannels.includes(message.channel.id);

    if (isChannelIgnored) {
        logger.info(`Skipping message storage for ignored channel #${channelName}`, {
            guildId,
            channelId: message.channel.id,
        });
        return;
    }

    logger.info('Loaded message handling config', {
        guildId,
        botName: botConfig.name,
        mentionOnly: replyBehavior.mentionOnly,
        replyProbability: replyBehavior.replyProbability,
    });

    logger.message(`@mention from ${message.author.username} in #${channelName}: "${cleanMessage}"`);

    try {
        const relationship = getRelationship(
            guildId,
            message.author.id
        );

        logger.info('Loaded user relationship for message handling', {
            guildId,
            userId: message.author.id,
            relationship,
        });

        await addMessage(
            guildId,
            message.channel.id,
            message.author.id,
            message.author.username,
            message.content
        );

        // Create hypergraph memory from message structure (no LLM call)
        try {
            const config = await getHypergraphConfig(guildId);
            if (config.extractionEnabled) {
                const memoryData = createMemoryData(message);
                if (memoryData) {
                    await createHyperedge(guildId, memoryData);
                }
            }
        } catch (err) {
            // Don't let hypergraph errors break message handling
            logger.warn('Failed to create hypergraph memory (non-critical)', err);
        }

        // Use only very recent messages for immediate context (last 5)
        // Hypergraph provides broader semantic memory
        const context = (await loadContexts(guildId, message.channel.id, 6)).slice(0, -1);
        const guildRelationships = getAllRelationships()[guildId] ?? {};

        logger.info('Loaded context for reply generation', {
            guildId,
            contextMessages: context.length,
            relationshipCount: Object.keys(guildRelationships).length,
        });

        const prompt = await buildPrompt({
            relationship,
            context,
            guildRelationships,
            guildName: message.guild.name,
            userMessage: cleanMessage,
            username: message.author.username,
            botConfig,
            guildId,
            channelId: message.channel.id,
            userId: message.author.id
        });

        const botUserId = client.user?.id;
        const isMentioned = botUserId ? message.mentions.has(botUserId) : false;
        
        const hasSandboxKeyword = SANDBOX_KEYWORDS.some(keyword => 
            cleanMessage.toLowerCase().includes(keyword)
        );
        
        const hasDockerCommandIntent = cleanMessage.toLowerCase().includes('docker command');
        const requiresMention = replyBehavior.mentionOnly;
        
        const isSandboxRequest = !requiresMention 
            ? (hasSandboxKeyword || hasDockerCommandIntent)
            : (isMentioned && (hasSandboxKeyword || hasDockerCommandIntent));

        logger.info('Mention and sandbox detection', { isMentioned, hasSandboxKeyword, isSandboxRequest, requiresMention, cleanMessage: cleanMessage.substring(0, 50) });

        if (isSandboxRequest) {
            logger.info('Detected sandbox request', { guildId, cleanMessage });
            
            const sandboxEnabled = await isSandboxEnabled();
            
            if (!sandboxEnabled) {
                await message.reply('Sandbox is currently disabled. Enable it in the bot settings.');
                return;
            }

            try {
                const dockerCommand = await extractDockerCommand(cleanMessage);
                
                if (!dockerCommand) {
                    await message.reply('I couldn\'t understand that as a Docker command. Try something like "docker ps" or "check container stats".');
                    return;
                }

                logger.info('Executing docker command in sandbox', { command: dockerCommand });
                const result = await executeInSandbox(dockerCommand);
                
                let response: string;
                if (result.success) {
                    response = `\`$ ${dockerCommand}\`\n\n${result.stdout || result.stderr || '(no output)'}`;
                } else {
                    response = `Command failed: ${result.error || `Exit code: ${result.exitCode}`}`;
                }

                if (response.length > 1900) {
                    response = response.substring(0, 1897) + '...';
                }

                await message.reply(response);
                return;
            } catch (sandboxErr) {
                logger.error('Sandbox execution failed', sandboxErr);
                await message.reply(`Sandbox error: ${sandboxErr instanceof Error ? sandboxErr.message : String(sandboxErr)}`);
                return;
            }
        }

        logger.info('Evaluating reply decision', {
            guildId,
            isMentioned,
            replyBehavior,
        });
        
        const replyDecision = await shouldReply({ message, isMentioned, replyBehavior, relationship, context, botName: botConfig.name });
        logger.info('Reply decision evaluated', {
            guildId,
            shouldReply: replyDecision.result,
            reason: replyDecision.reason,
        });

        if (!replyDecision.result) {
            logger.info(`Bot decided not to reply in guild ${message.guild.name}`, {
                guildId,
                reason: replyDecision.reason,
            });
            return;
        }

        logger.info(`Bot decided to reply in guild ${message.guild.name}`, { guildId });

        const startTime = Date.now();
        const { text: reply, usageMetadata } = await generateReply(prompt);
        const processingTimeMs = Date.now() - startTime;

        logger.info('Generated LLM reply payload', {
            guildId,
            replyLength: reply?.length ?? 0,
            processingTimeMs,
        });

        if (reply) {
            let finalReply = reply;
            if (reply.length > 2000) {
                finalReply = reply.substring(0, 1997) + '...';
                logger.warn(`Reply truncated from ${reply.length} to 2000 chars`);
            }

            logger.info('Sending Discord reply', {
                guildId,
                channelId: message.channel.id,
                finalReplyLength: finalReply.length,
            });

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
                client.user?.id ?? 'bot',
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
            logger.warn('No reply text generated by LLM', { guildId });
        }
    } catch (err) {
        logger.error(`Error handling messageCreate event in guild ${message.guild.name} (${guildId})`, err);
    }
}