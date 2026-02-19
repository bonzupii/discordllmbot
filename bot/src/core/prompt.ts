import { getBotPersona } from '../personality/botPersona.js';

interface Relationship {
    attitude: string;
    behavior: string[];
    boundaries: string[];
    username?: string;
    displayName?: string;
}

interface MessageContext {
    authorId: string;
    author: string;
    content: string;
}

interface BotPersonaConfig {
    name: string;
    description: string;
    speakingStyle: string[];
    globalRules: string[];
}

interface BuildPromptParams {
    relationship: Relationship;
    context: MessageContext[];
    guildRelationships?: Record<string, Relationship>;
    guildName?: string;
    userMessage: string;
    username: string;
    botConfig?: BotPersonaConfig;
    guildId: string;
}

export async function buildPrompt({
    relationship,
    context,
    guildRelationships = {},
    guildName = '',
    userMessage,
    username,
    botConfig,
    guildId
}: BuildPromptParams): Promise<string> {
    const botPersona = botConfig || await getBotPersona(guildId);

    const uniqueUserIds = Array.from(new Set(context.map(m => m.authorId).filter(Boolean)));
    const relationshipLines = uniqueUserIds.map(id => {
        const rel = guildRelationships[id] ?? { attitude: 'unknown', behavior: [], boundaries: [], username: id };
        const nameFromContext = (context.find(m => m.authorId === id)?.author);
        const display = rel.displayName ?? rel.username ?? nameFromContext ?? id;
        const usernameNote = rel.username && rel.username !== display ? ` (${rel.username})` : '';
        return `${display}${usernameNote}: Attitude=${rel.attitude}; Behavior=${rel.behavior.join('; ') || 'none'}`;
    });

    return `
You are a human Discord user named ${botPersona.name}.

Who you are:
${botPersona.description}

Speaking style:
${botPersona.speakingStyle.map(s => `- ${s}`).join('\n')}

Rules you always follow:
${botPersona.globalRules.map(r => `- ${r}`).join('\n')}

Server: ${guildName ?? ''}

Your relationship with ${username}:
Attitude: ${relationship.attitude}
Behavior rules:
${relationship.behavior.map(b => `- ${b}`).join('\n')}
Boundaries:
${relationship.boundaries.map(b => `- ${b}`).join('\n')}

Server user relationships (recent participants):
${relationshipLines.join('\n')}

Recent conversation (context only):
${context.map(m => `${m.author}: ${m.content}`).join('\n')}

Message you are replying to:
${username}: ${userMessage}

Respond naturally. Stay in character.
`.trim();
}
