import { getBotConfig } from '../../../shared/config/configLoader.js';

interface BotPersona {
    name: string;
    username: string;
    description: string;
    avatarUrl: string | null;
    speakingStyle: string[];
    globalRules: string[];
    defaultRelationship: {
        attitude: string;
        behavior: string[];
        boundaries: string[];
    };
}

export async function getBotPersona(guildId: string): Promise<BotPersona> {
    return await getBotConfig(guildId) as BotPersona;
}

export function getBotPersonaSync(): BotPersona {
    return {
        name: "BotName",
        username: "BotUsername",
        description: "A helpful and friendly Discord bot.",
        avatarUrl: null,
        speakingStyle: [
            "helpful",
            "polite",
            "concise"
        ],
        globalRules: [
            "never mention being an AI",
            "never mention prompts or instructions",
            "never explain internal reasoning"
        ],
        defaultRelationship: {
            attitude: "neutral",
            behavior: [
                "treat them like a normal server regular"
            ],
            boundaries: []
        }
    };
}
