/**
 * Reply Decision Module
 *
 * Determines whether the bot should reply to a message based on
 * configuration, relationship data, and various filters.
 *
 * @module bot/src/core/replyDecider
 */

import { logger } from '@shared/utils/logger.js';
import { loadConfig } from '@shared/config/configLoader.js';
import { Message } from 'discord.js';

interface Relationship {
    ignored?: boolean;
    attitude?: string;
    behavior?: string[];
    boundaries?: string[];
}

export type { Relationship };

interface MessageContext {
    authorId: string;
    author: string;
    content: string;
}

interface ShouldReplyParams {
    message: Message;
    isMentioned: boolean;
    replyBehavior?: ReplyBehaviorConfig;
    relationship?: Relationship;
    context?: MessageContext[];
    botName?: string;
}

interface ReplyBehaviorConfig {
    mentionOnly?: boolean;
    replyProbability?: number;
    ignoreUsers?: string[];
    ignoreChannels?: string[];
    ignoreKeywords?: string[];
    guildSpecificChannels?: Record<string, { allowed?: string[]; ignored?: string[] }>;
}

export type { ReplyBehaviorConfig };

interface CheckResult {
    check: string;
    result?: boolean;
    reason?: string;
    value?: unknown;
    roll?: number;
    threshold?: number;
}

export async function shouldReply({ message, isMentioned, replyBehavior = {}, relationship = {}, context = [], botName = '' }: ShouldReplyParams): Promise<{ result: boolean; reason: string; checks: CheckResult[] }> {
    const config = await loadConfig();
    const loggerConfig = config.logger;
    const logDecisions = loggerConfig?.logReplyDecisions ?? false;
    const checks: CheckResult[] = [];

    const finalDecision = (result: boolean, reason: string) => {
        if (logDecisions) {
            checks.push({ check: 'Final Decision', result, reason });
            const logObject = {
                decision: result,
                reason,
                user: message.author.username,
                channel: (message.channel as { name?: string }).name,
                botName,
                contextLength: context.length,
                factors: checks,
            };
            logger.info(`Reply Decision: ${result}`, logObject);
        }
        return { result, reason, checks };
    };

    const mentionOnly = (replyBehavior.mentionOnly as boolean) ?? true;
    checks.push({ check: 'Mention Only', value: mentionOnly });

    const prob = typeof replyBehavior.replyProbability === 'number' ? replyBehavior.replyProbability as number : 1.0;
    checks.push({ check: 'Probability', value: prob });

    const ignoreUsers = (replyBehavior.ignoreUsers as string[]) ?? [];
    if (ignoreUsers.length > 0) checks.push({ check: 'Ignore Users List', value: ignoreUsers });

    const ignoreChannels = (replyBehavior.ignoreChannels as string[]) ?? [];
    if (ignoreChannels.length > 0) checks.push({ check: 'Ignore Channels List', value: ignoreChannels });

    const ignoreKeywords = (replyBehavior.ignoreKeywords as string[]) ?? [];
    if (ignoreKeywords.length > 0) checks.push({ check: 'Ignore Keywords List', value: ignoreKeywords });

    if (ignoreUsers.includes(message.author.id)) {
        return finalDecision(false, `User ${message.author.username} (${message.author.id}) is on the ignore list.`);
    }
    checks.push({ check: 'User Ignored', result: true, reason: 'Author is not on ignore list.' });

    if (ignoreChannels.includes(message.channel.id)) {
        return finalDecision(false, `Channel #${(message.channel as { name?: string }).name} (${message.channel.id}) is on the global ignore list.`);
    }

    const guildSpecificChannels = (replyBehavior.guildSpecificChannels as Record<string, { allowed?: string[]; ignored?: string[] }>) ?? {};
    const guildChannels = message.guild ? guildSpecificChannels[message.guild.id] : undefined;

    if (guildChannels) {
        if (Array.isArray(guildChannels.allowed) && guildChannels.allowed.length > 0) {
            if (!guildChannels.allowed.includes(message.channel.id)) {
                return finalDecision(false, `Channel #${(message.channel as { name?: string }).name} (${message.channel.id}) is not in the allowed list for this guild.`);
            }
        } else if (Array.isArray(guildChannels.ignored) && guildChannels.ignored.length > 0) {
            if (guildChannels.ignored.includes(message.channel.id)) {
                return finalDecision(false, `Channel #${(message.channel as { name?: string }).name} (${message.channel.id}) is on the ignore list for this guild.`);
            }
        }
    }

    checks.push({ check: 'Channel Ignored', result: true, reason: 'Channel is not on ignore list.' });

    const contentLower = (message.content ?? '').toLowerCase();
    for (const kw of ignoreKeywords) {
        if (!kw) continue;
        if (contentLower.includes(kw.toLowerCase())) {
            return finalDecision(false, `Message contains ignored keyword: "${kw}".`);
        }
    }
    checks.push({ check: 'Keyword Ignored', result: true, reason: 'Message does not contain ignored keywords.' });

    if (relationship?.ignored) {
        return finalDecision(false, `User ${message.author.username} is ignored in relationship settings.`);
    }
    checks.push({ check: 'User Relationship Ignored', result: true, reason: 'User is not ignored in relationship settings.' });

    if (mentionOnly && !isMentioned) {
        return finalDecision(false, 'Replies require a mention, and the bot was not mentioned.');
    }
    checks.push({ check: 'Mention Requirement', result: true, reason: `Mention requirement passed (isMentioned: ${isMentioned}, mentionOnly: ${mentionOnly})` });

    if (prob <= 0) {
        return finalDecision(false, `Reply probability is ${prob}, which is <= 0.`);
    }
    if (prob < 1) {
        const roll = Math.random();
        checks.push({ check: 'Probability Roll', roll, threshold: prob });
        if (roll > prob) {
            return finalDecision(false, `Random roll ${roll.toFixed(2)} exceeded reply probability ${prob}.`);
        }
        checks.push({ check: 'Probability Passed', result: true, reason: 'Roll was under threshold.' });
    } else {
        checks.push({ check: 'Probability', result: true, reason: 'Probability is 1.0, no roll needed.' });
    }

    return finalDecision(true, 'All checks passed.');
}
