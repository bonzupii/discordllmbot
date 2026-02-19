interface ReplyBehavior {
    minDelayMs?: number;
    maxDelayMs?: number;
}

export function calculateDelay(replyBehavior: ReplyBehavior = {}): number {
    const minMs = typeof replyBehavior.minDelayMs === 'number' ? replyBehavior.minDelayMs : 500;
    const maxMs = typeof replyBehavior.maxDelayMs === 'number' ? replyBehavior.maxDelayMs : 3000;
    const low = Math.max(0, Math.min(minMs, maxMs));
    const high = Math.max(low, maxMs);
    return Math.floor(low + Math.random() * (high - low));
}
