import { MentionOnlyStrategy, PassiveStrategy, ActiveStrategy, DisabledStrategy } from '../strategies/replyStrategies.js'

/**
 * Decide whether the bot should reply to a message based on config and relationship
 * Strategy pattern: choose behavior by `replyBehavior.mode`
 */
export function shouldReply({ message, isMentioned, replyBehavior = {}, relationship = {}, context = [], botName = '' }) {
    const mode = replyBehavior.mode ?? 'mention-only'
    const requireMention = replyBehavior.requireMention ?? true
    const prob = typeof replyBehavior.replyProbability === 'number' ? replyBehavior.replyProbability : 1.0
    const ignoreUsers = replyBehavior.ignoreUsers ?? []
    const ignoreChannels = replyBehavior.ignoreChannels ?? []
    const ignoreKeywords = replyBehavior.ignoreKeywords ?? []

    // Basic ignores (always apply)
    if (mode === 'disabled') return false
    if (ignoreUsers.includes(message.author.id)) return false
    if (ignoreChannels.includes(message.channel.id)) return false

    const contentLower = (message.content || '').toLowerCase()
    for (const kw of ignoreKeywords) {
        if (!kw) continue
        if (contentLower.includes(kw.toLowerCase())) return false
    }

    // Strategy selection
    let decision = false
    const params = { message, isMentioned, replyBehavior, relationship, context, botName }
    switch (mode) {
        case 'active':
            decision = ActiveStrategy(params)
            break
        case 'passive':
            decision = PassiveStrategy(params)
            break
        case 'disabled':
            decision = DisabledStrategy(params)
            break
        case 'mention-only':
        default:
            decision = MentionOnlyStrategy(params)
            break
    }

    // If requireMention is true, and the strategy didn't already decide to reply based on a mention,
    // and we're not in an 'active' mode that bypasses explicit mentions, then we don't reply.
    if (requireMention && !isMentioned && mode !== 'active') {
        return false
    }

    if (!decision) return false

    // Apply probability roll
    if (prob <= 0) return false
    if (prob < 1) {
        if (Math.random() > prob) return false
    }

    return true
}
