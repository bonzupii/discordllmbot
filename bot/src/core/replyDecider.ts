/**
 * Reply Decision Module
 * 
 * Determines whether the bot should reply to a message based on
 * configuration, relationship data, and various filters.
 * 
 * @module bot/src/core/replyDecider
 */

import { MentionOnlyStrategy, PassiveStrategy, ActiveStrategy, DisabledStrategy } from '../strategies/replyStrategies.js';
import { logger } from '../../../shared/utils/logger.js';
import { loadConfig } from '../../../shared/config/configLoader.js';
import { Message } from 'discord.js';

/**
 * User relationship data structure.
 */
interface Relationship {
    ignored?: boolean;
    attitude?: string;
    behavior?: string[];
    boundaries?: string[];
}

/**
 * Message context for reply decisions.
 */
interface MessageContext {
    authorId: string;
    author: string;
    content: string;
}

/**
 * Parameters for shouldReply function.
 */
interface ShouldReplyParams {
    message: Message;
    isMentioned: boolean;
    replyBehavior?: Record<string, unknown>;
    relationship?: Relationship;
    context?: MessageContext[];
    botName?: string;
}

/**
 * Result of a single check in the reply decision process.
 */
interface CheckResult {
    check: string;
    result?: boolean;
    reason?: string;
    value?: unknown;
    strategy?: string;
    roll?: number;
    threshold?: number;
}

/**
 * Decides whether the bot should reply to a message.
 * 
 * @param params - The parameters for the reply decision
 * @returns Promise resolving to the decision result with reason and check details
 */
export async function shouldReply({ message, isMentioned, replyBehavior = {}, relationship = {}, context = [], botName = '' }: ShouldReplyParams): Promise<{ result: boolean; reason: string; checks: CheckResult[] }> {
    const config = await loadConfig() as Record<string, unknown>;
    const loggerConfig = config.logger as Record<string, unknown> | undefined;
    const logDecisions = loggerConfig?.logReplyDecisions ?? false;
    const checks: CheckResult[] = [];
    
    const finalDecision = (result: boolean, reason: string) => {
        if (logDecisions) {
            checks.push({ check: 'Final Decision', result, reason });
            const logObject = {
                decision: result,
                reason: reason,
                user: message.author.username,
                channel: (message.channel as { name?: string }).name,
                factors: checks
            };
            logger.info(`Reply Decision: ${result}`, logObject);
        }
        return { result, reason, checks };
    };

    console.log(`DEBUG: shouldReply called for guild ${message.guild?.name} (${message.guild?.id}), user: ${message.author.username}, isMentioned: ${isMentioned}`);
    console.log(`DEBUG: replyBehavior:`, replyBehavior);
    console.log(`DEBUG: relationship:`, relationship);

    const mode = (replyBehavior.mode as string) ?? 'mention-only';
    checks.push({ check: 'Mode', value: mode });

    const requireMention = replyBehavior.requireMention as boolean ?? true;
    checks.push({ check: 'Require Mention', value: requireMention });

    const prob = typeof replyBehavior.replyProbability === 'number' ? replyBehavior.replyProbability as number : 1.0;
    checks.push({ check: 'Probability', value: prob });

    const ignoreUsers = (replyBehavior.ignoreUsers as string[]) ?? [];
    if (ignoreUsers.length > 0) checks.push({ check: 'Ignore Users List', value: ignoreUsers });

    const ignoreChannels = (replyBehavior.ignoreChannels as string[]) ?? [];
    if (ignoreChannels.length > 0) checks.push({ check: 'Ignore Channels List', value: ignoreChannels });

    const ignoreKeywords = (replyBehavior.ignoreKeywords as string[]) ?? [];
    if (ignoreKeywords.length > 0) checks.push({ check: 'Ignore Keywords List', value: ignoreKeywords });

    if (mode === 'disabled') {
        console.log(`DEBUG: Reply mode is disabled for guild ${message.guild?.name} (${message.guild?.id})`);
        return finalDecision(false, 'Bot reply mode is disabled globally.');
    }
    checks.push({ check: 'Global Mode', result: true, reason: `Mode is '${mode}', not 'disabled'.` });

    if (ignoreUsers.includes(message.author.id)) {
        console.log(`DEBUG: User ${message.author.username} (${message.author.id}) is on ignore list for guild ${message.guild?.name} (${message.guild?.id})`);
        return finalDecision(false, `User ${message.author.username} (${message.author.id}) is on the ignore list.`);
    }
    checks.push({ check: 'User Ignored', result: true, reason: 'Author is not on ignore list.' });

    if (ignoreChannels.includes(message.channel.id)) {
        console.log(`DEBUG: Channel #${(message.channel as { name?: string }).name} (${message.channel.id}) is on global ignore list for guild ${message.guild?.name} (${message.guild?.id})`);
        return finalDecision(false, `Channel #${(message.channel as { name?: string }).name} (${message.channel.id}) is on the global ignore list.`);
    }

    const guildSpecificChannels = (replyBehavior.guildSpecificChannels as Record<string, { allowed?: string[]; ignored?: string[] }>) || {};
    const guildChannels = message.guild ? guildSpecificChannels[message.guild.id] : undefined;

    if (guildChannels) {
        if (Array.isArray(guildChannels.allowed) && guildChannels.allowed.length > 0) {
            if (!guildChannels.allowed.includes(message.channel.id)) {
                console.log(`DEBUG: Channel #${(message.channel as { name?: string }).name} (${message.channel.id}) is not in allowed list for guild ${message.guild?.name} (${message.guild?.id})`);
                return finalDecision(false, `Channel #${(message.channel as { name?: string }).name} (${message.channel.id}) is not in the allowed list for this guild.`);
            }
        } else if (Array.isArray(guildChannels.ignored) && guildChannels.ignored.length > 0) {
            if (guildChannels.ignored.includes(message.channel.id)) {
                console.log(`DEBUG: Channel #${(message.channel as { name?: string }).name} (${message.channel.id}) is on ignore list for guild ${message.guild?.name} (${message.guild?.id})`);
                return finalDecision(false, `Channel #${(message.channel as { name?: string }).name} (${message.channel.id}) is on the ignore list for this guild.`);
            }
        }
    }

    checks.push({ check: 'Channel Ignored', result: true, reason: 'Channel is not on ignore list.' });

    const contentLower = (message.content || '').toLowerCase();
    for (const kw of ignoreKeywords) {
        if (!kw) continue;
        if (contentLower.includes(kw.toLowerCase())) {
            console.log(`DEBUG: Message contains ignored keyword "${kw}" in guild ${message.guild?.name} (${message.guild?.id})`);
            return finalDecision(false, `Message contains ignored keyword: "${kw}".`);
        }
    }
    checks.push({ check: 'Keyword Ignored', result: true, reason: 'Message does not contain ignored keywords.' });

    if (relationship?.ignored) {
        console.log(`DEBUG: User ${message.author.username} is ignored in relationship settings for guild ${message.guild?.name} (${message.guild?.id})`);
        return finalDecision(false, `User ${message.author.username} is ignored in relationship settings.`);
    }
    checks.push({ check: 'User Relationship Ignored', result: true, reason: 'User is not ignored in relationship settings.' });

    let strategyDecision = false;
    const params = { message, isMentioned, replyBehavior, relationship, context, botName };
    switch (mode) {
        case 'active':
            strategyDecision = ActiveStrategy(params);
            break;
        case 'passive':
            strategyDecision = PassiveStrategy(params);
            break;
        case 'disabled':
            strategyDecision = DisabledStrategy();
            break;
        case 'mention-only':
        default:
            strategyDecision = MentionOnlyStrategy(params);
            break;
    }
    checks.push({ check: 'Strategy Result', strategy: mode, result: strategyDecision });

    if (requireMention && !isMentioned && mode !== 'active') {
        console.log(`DEBUG: Require mention is true, not mentioned, and mode is not active for guild ${message.guild?.name} (${message.guild?.id})`);
        return finalDecision(false, `Replies require a mention, and the bot was not mentioned (mode: ${mode}).`);
    }
    checks.push({
        check: 'Mention Requirement',
        result: true,
        reason: `Mention requirement passed (isMentioned: ${isMentioned}, requireMention: ${requireMention}, mode: ${mode})`,
    });

    if (!strategyDecision) {
        console.log(`DEBUG: Strategy decided not to reply for guild ${message.guild?.name} (${message.guild?.id}), mode: ${mode}`);
        return finalDecision(false, `The '${mode}' strategy decided not to reply.`);
    }
    checks.push({ check: 'Strategy Passed', result: true, reason: `The '${mode}' strategy returned true.` });

    if (prob <= 0) {
        console.log(`DEBUG: Reply probability is ${prob} (<= 0) for guild ${message.guild?.name} (${message.guild?.id})`);
        return finalDecision(false, `Reply probability is ${prob}, which is <= 0.`);
    }
    if (prob < 1) {
        const roll = Math.random();
        checks.push({ check: 'Probability Roll', roll, threshold: prob });
        if (roll > prob) {
            console.log(`DEBUG: Probability roll ${roll.toFixed(2)} > ${prob} for guild ${message.guild?.name} (${message.guild?.id})`);
            return finalDecision(false, `Random roll ${roll.toFixed(2)} exceeded reply probability ${prob}.`);
        }
        checks.push({ check: 'Probability Passed', result: true, reason: 'Roll was under threshold.' });
    } else {
        checks.push({ check: 'Probability', result: true, reason: 'Probability is 1.0, no roll needed.' });
    }

    console.log(`DEBUG: All checks passed, bot will reply in guild ${message.guild?.name} (${message.guild?.id})`);
    return finalDecision(true, 'All checks passed.');
}
