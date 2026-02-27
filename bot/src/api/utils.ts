/**
 * API Route Utilities
 *
 * Shared utility functions for API routes.
 *
 * @module bot/src/api/utils
 */

/**
 * Get changed fields between two values for logging.
 */
export function getChangedFields(
    previousValue: unknown,
    nextValue: unknown,
    prefix = '',
): Record<string, unknown> {
    const previousObject = previousValue && typeof previousValue === 'object'
        ? previousValue as Record<string, unknown>
        : null;
    const nextObject = nextValue && typeof nextValue === 'object'
        ? nextValue as Record<string, unknown>
        : null;

    if (!previousObject || !nextObject || Array.isArray(previousObject) || Array.isArray(nextObject)) {
        if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) {
            return {};
        }
        return { [prefix || 'value']: nextValue };
    }

    const keys = new Set([...Object.keys(previousObject), ...Object.keys(nextObject)]);
    const changes: Record<string, unknown> = {};

    for (const key of keys) {
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        const childChanges = getChangedFields(previousObject[key], nextObject[key], nextPrefix);
        Object.assign(changes, childChanges);
    }

    return changes;
}

/**
 * Read and trim an environment variable, returning null if empty.
 */
export function readNonEmptyEnv(name: string): string | null {
    const value = process.env[name];
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
        return null;
    }
    return trimmed;
}

/**
 * Create PKCE challenge from code verifier.
 */
export function createPkceChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Prune expired OAuth state entries.
 */
export function pruneExpiredQwenOauthStates(): void {
    const now = Date.now();
    for (const [state, value] of qwenOauthStateStore.entries()) {
        if (now - value.createdAt > QWEN_OAUTH_STATE_TTL_MS) {
            qwenOauthStateStore.delete(state);
        }
    }
    for (const [deviceCode, value] of qwenDeviceFlowStore.entries()) {
        if (now - value.createdAt > value.expiresIn * 1000) {
            qwenDeviceFlowStore.delete(deviceCode);
        }
    }
}

const qwenOauthStateStore = new Map<string, { createdAt: number }>();
const qwenDeviceFlowStore = new Map<string, { createdAt: number; expiresIn: number }>();
const QWEN_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

import crypto from 'crypto';
