/**
 * LLM Provider Abstraction Layer
 * 
 * Unified interface for multiple LLM providers (Gemini, Ollama, Qwen).
 * Handles provider selection based on configuration.
 * 
 * @module bot/src/llm
 */

import { generateReply as geminiGenerateReply, getAvailableModels as geminiGetAvailableModels } from './gemini.js';
import { generateReply as ollamaGenerateReply, getAvailableModels as ollamaGetAvailableModels } from './ollama.js';
import { generateReply as qwenGenerateReply, getAvailableModels as qwenGetAvailableModels } from './qwen.js';
import { getApiConfig } from '@shared/config/configLoader.js';
import { logger } from '@shared/utils/logger.js';


function maskSecret(value?: string): string {
    if (!value) {
        return '';
    }

    const trimmed = value.trim();
    if (trimmed.length <= 5) {
        return trimmed;
    }

    return `***${trimmed.slice(-5)}`;
}


/**
 * Response from LLM generation.
 */
export interface LLMResponse {
    text: string | null;
    usageMetadata: {
        promptTokenCount?: number | null;
        candidatesTokenCount?: number | null;
        totalTokenCount?: number;
    } | null;
}

/**
 * Generates a reply using the configured LLM provider.
 * 
 * @param prompt - The prompt string to send to the LLM
 * @returns Promise resolving to the LLM response
 */
export async function generateReply(prompt: string): Promise<LLMResponse> {
    const apiConfig = await getApiConfig();
    const maskedApiConfig = {
        ...apiConfig,
        geminiApiKey: maskSecret(apiConfig.geminiApiKey),
        ollamaApiKey: maskSecret(apiConfig.ollamaApiKey),
        qwenApiKey: maskSecret(apiConfig.qwenApiKey),
    };
    logger.info('generateReply using apiConfig', maskedApiConfig);
    const provider = apiConfig.provider || 'gemini';

    switch (provider.toLowerCase()) {
        case 'gemini':
            logger.info('Using Gemini provider for generateReply');
            return await geminiGenerateReply(prompt);
        case 'ollama':
            logger.info('Using Ollama provider for generateReply');
            return await ollamaGenerateReply(prompt);
        case 'qwen':
            logger.info('Using Qwen provider for generateReply');
            return await qwenGenerateReply(prompt);
        default:
            throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}

export async function getAvailableModels(overrideProvider?: string): Promise<string[]> {
    const apiConfig = await getApiConfig();
    const provider = overrideProvider || apiConfig.provider || 'gemini';

    switch (provider.toLowerCase()) {
        case 'gemini':
            logger.info('Fetching models from Gemini provider');
            return await geminiGetAvailableModels();
        case 'ollama':
            logger.info('Fetching models from Ollama provider');
            return await ollamaGetAvailableModels();
        case 'qwen':
            logger.info('Fetching models from Qwen provider');
            return await qwenGetAvailableModels();
        default:
            throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}

export async function getCurrentProvider(): Promise<string> {
    const apiConfig = await getApiConfig();
    return apiConfig.provider || 'gemini';
}

export async function validateProviderConfig(): Promise<boolean> {
    const apiConfig = await getApiConfig();
    const provider = apiConfig.provider || 'gemini';

    switch (provider.toLowerCase()) {
        case 'gemini':
            return !!apiConfig.geminiApiKey || !!process.env.GEMINI_API_KEY;
        case 'ollama':
            return true;
        case 'qwen':
            return !!apiConfig.qwenApiKey || !!process.env.QWEN_API_KEY;
        default:
            return false;
    }
}
