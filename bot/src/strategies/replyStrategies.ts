/**
 * Reply Strategies Module
 * 
 * Strategy pattern implementation for different reply behaviors.
 * Provides MentionOnly, Passive, Active, and Disabled strategies.
 * 
 * @module bot/src/strategies/replyStrategies
 */

import { Message } from 'discord.js';

/**
 * Reply behavior configuration.
 */
interface ReplyBehavior {
    proactiveReplyChance?: number;
}

/**
 * Message context for strategy evaluation.
 */
interface MessageContext {
    content?: string;
}

/**
 * Parameters passed to strategy functions.
 */
interface StrategyParams {
    message?: Message;
    isMentioned?: boolean;
    replyBehavior?: ReplyBehavior;
    context?: MessageContext[];
    botName?: string;
    relationship?: unknown;
    _message?: Message;
    _replyBehavior?: ReplyBehavior;
}

/**
 * Strategy that only replies when mentioned.
 * 
 * @param params - Strategy parameters
 * @returns True if the bot should reply
 */
export function MentionOnlyStrategy({ isMentioned }: StrategyParams): boolean {
    return isMentioned ?? false;
}

/**
 * Strategy that replies when mentioned (passive mode).
 * 
 * @param params - Strategy parameters
 * @returns True if the bot should reply
 */
export function PassiveStrategy({ isMentioned }: StrategyParams): boolean {
    return isMentioned ?? false;
}

/**
 * Strategy that never replies (disabled mode).
 * 
 * @returns Always returns false
 */
export function DisabledStrategy(): boolean {
    return false;
}

/**
 * Active strategy that can reply proactively based on context.
 * Replies to mentions, questions, recent mentions of the bot, or randomly.
 * 
 * @param params - Strategy parameters
 * @returns True if the bot should reply
 */
export function ActiveStrategy({ message, isMentioned, replyBehavior, context = [], botName = '' }: StrategyParams): boolean {
    if (isMentioned) return true;

    const recent = context.slice(-3);
    const lowerBot = (botName || '').toLowerCase();
    for (const m of recent) {
        if (!m || !m.content) continue;
        if (/<@!?(\d+)>/.test(m.content)) return true;
        if (lowerBot && m.content.toLowerCase().includes(lowerBot)) return true;
    }

    const text = (message?.content || '').trim();
    if (text.endsWith('?')) return true;

    const proactiveChance = replyBehavior?.proactiveReplyChance ?? 0;
    if (proactiveChance > 0 && Math.random() < proactiveChance) return true;

    return false;
}
