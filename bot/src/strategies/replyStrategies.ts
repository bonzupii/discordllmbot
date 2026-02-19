import { Message } from 'discord.js';

interface ReplyBehavior {
    proactiveReplyChance?: number;
}

interface MessageContext {
    content?: string;
}

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

export function MentionOnlyStrategy({ isMentioned }: StrategyParams): boolean {
    return isMentioned ?? false;
}

export function PassiveStrategy({ isMentioned }: StrategyParams): boolean {
    return isMentioned ?? false;
}

export function DisabledStrategy(): boolean {
    return false;
}

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
