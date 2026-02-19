/**
 * Response Delay Module
 * 
 * Calculates random delay times for bot responses to appear more natural.
 * 
 * @module bot/src/core/responseDelay
 */

/**
 * Reply behavior delay configuration.
 */
interface ReplyBehavior {
    minDelayMs?: number;
    maxDelayMs?: number;
}

/**
 * Calculates a random delay within the configured range.
 * 
 * @param replyBehavior - The reply behavior configuration
 * @returns Random delay in milliseconds
 */
export function calculateDelay(replyBehavior: ReplyBehavior = {}): number {
    const minMs = typeof replyBehavior.minDelayMs === 'number' ? replyBehavior.minDelayMs : 500;
    const maxMs = typeof replyBehavior.maxDelayMs === 'number' ? replyBehavior.maxDelayMs : 3000;
    const low = Math.max(0, Math.min(minMs, maxMs));
    const high = Math.max(low, maxMs);
    return Math.floor(low + Math.random() * (high - low));
}
