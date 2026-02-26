/**
 * Qwen LLM Provider
 *
 * Uses Qwen's OpenAI-compatible API surface.
 */

import { logger } from '../../../shared/utils/logger.js';
import { getApiConfig } from '../../../shared/config/configLoader.js';

interface ApiConfig {
    qwenModel?: string;
    qwenApiKey?: string;
    retryAttempts?: number;
    retryBackoffMs?: number;
}

interface UsageMetadata {
    promptTokenCount?: number | null;
    candidatesTokenCount?: number | null;
    totalTokenCount?: number;
}

interface QwenResponse {
    text: string | null;
    usageMetadata: UsageMetadata | null;
}

class QwenAPIError extends Error {
    statusCode: number;
    retryable: boolean;

    constructor(message: string, statusCode: number, retryable = false) {
        super(message);
        this.name = 'QwenAPIError';
        this.statusCode = statusCode;
        this.retryable = retryable;
    }
}

function isRetryable(error: Error): boolean {
    if (error instanceof QwenAPIError) return error.retryable;
    return error.message?.includes('timeout') || error.message?.includes('ECONNRESET');
}

async function retry<T>(fn: () => Promise<T>, maxRetries = 3, baseBackoffMs = 1000): Promise<T> {
    let lastError: Error;
    const safeMaxRetries = Number.isFinite(maxRetries) ? Math.max(0, Math.floor(maxRetries)) : 3;
    const totalAttempts = safeMaxRetries + 1;

    for (let i = 0; i < totalAttempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err as Error;

            if (!isRetryable(lastError)) {
                throw lastError;
            }

            if (i < totalAttempts - 1) {
                const backoffMs = Math.pow(2, i) * baseBackoffMs + Math.random() * Math.min(1000, baseBackoffMs);
                logger.warn(`Retrying Qwen API (attempt ${i + 2}/${totalAttempts}) after ${backoffMs}ms: ${lastError.message}`);
                await new Promise(r => setTimeout(r, backoffMs));
            }
        }
    }

    throw lastError!;
}

function getQwenBaseUrl(): string {
    return process.env.QWEN_API_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
}

function resolveQwenApiKey(config: ApiConfig): string {
    const fromConfig = config.qwenApiKey?.trim();
    if (fromConfig) return fromConfig;

    const fromEnv = process.env.QWEN_API_KEY?.trim();
    if (fromEnv) return fromEnv;

    throw new Error('Qwen API key is not configured. Set llm.qwenApiKey in dashboard or QWEN_API_KEY in env.');
}

export async function generateReply(prompt: string): Promise<QwenResponse> {
    const apiCfg: ApiConfig = await getApiConfig();
    const qwenModel = apiCfg.qwenModel || 'qwen-plus';
    const retryAttempts = Number.isFinite(apiCfg.retryAttempts) ? Math.max(0, Math.floor(apiCfg.retryAttempts as number)) : 3;
    const retryBackoffMs = apiCfg.retryBackoffMs ?? 1000;

    return retry(async () => {
        const apiKey = resolveQwenApiKey(apiCfg);
        const url = `${getQwenBaseUrl()}/chat/completions`;

        logger.api(`→ Qwen API Request: Model=${qwenModel} Function=generateReply()`);

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: qwenModel,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new QwenAPIError(
                `Qwen API error: ${res.status}${errorText ? `: ${errorText}` : ''}`,
                res.status,
                res.status >= 500 || res.status === 429 || res.status === 408
            );
        }

        const data = await res.json() as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };

        return {
            text: data?.choices?.[0]?.message?.content ?? null,
            usageMetadata: {
                promptTokenCount: data?.usage?.prompt_tokens ?? null,
                candidatesTokenCount: data?.usage?.completion_tokens ?? null,
                totalTokenCount: data?.usage?.total_tokens,
            },
        };
    }, retryAttempts, retryBackoffMs);
}

export async function getAvailableModels(): Promise<string[]> {
    const apiCfg: ApiConfig = await getApiConfig();
    const apiKey = resolveQwenApiKey(apiCfg);

    const res = await fetch(`${getQwenBaseUrl()}/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new QwenAPIError(`Qwen API error fetching models: ${res.status}${errorText ? `: ${errorText}` : ''}`, res.status, res.status >= 500 || res.status === 429);
    }

    const data = await res.json() as { data?: Array<{ id?: string }> };
    return (data?.data ?? []).map(model => model.id || '').filter(Boolean);
}
