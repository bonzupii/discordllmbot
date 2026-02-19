import { generateReply as geminiGenerateReply, getAvailableModels as geminiGetAvailableModels } from './gemini.js';
import { generateReply as ollamaGenerateReply, getAvailableModels as ollamaGetAvailableModels } from './ollama.js';
import { getApiConfig } from '../../../shared/config/configLoader.js';
import { logger } from '../../../shared/utils/logger.js';

export interface LLMResponse {
    text: string | null;
    usageMetadata: {
        promptTokenCount?: number | null;
        candidatesTokenCount?: number | null;
        totalTokenCount?: number;
    } | null;
}

export async function generateReply(prompt: string): Promise<LLMResponse> {
    const apiConfig = await getApiConfig();
    console.log(`DEBUG: generateReply using apiConfig:`, apiConfig);
    const provider = apiConfig.provider || 'gemini';

    switch (provider.toLowerCase()) {
        case 'gemini':
            logger.info(`Using Gemini provider for generateReply`);
            return await geminiGenerateReply(prompt);
        case 'ollama':
            logger.info(`Using Ollama provider for generateReply`);
            return await ollamaGenerateReply(prompt);
        default:
            throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}

export async function getAvailableModels(overrideProvider?: string): Promise<string[]> {
    const apiConfig = await getApiConfig();
    const provider = overrideProvider || apiConfig.provider || 'gemini';

    switch (provider.toLowerCase()) {
        case 'gemini':
            logger.info(`Fetching models from Gemini provider`);
            return await geminiGetAvailableModels();
        case 'ollama':
            logger.info(`Fetching models from Ollama provider`);
            return await ollamaGetAvailableModels();
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
            return !!process.env.GEMINI_API_KEY;
        case 'ollama':
            return true;
        default:
            return false;
    }
}
