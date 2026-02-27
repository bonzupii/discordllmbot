/**
 * Prompt Builder Module
 * 
 * Constructs prompt strings for LLM generation based on bot persona,
 * user relationships, and conversation context.
 * 
 * @module bot/src/core/prompt
 */

import { getBotPersona } from '../personality/botPersona.js';
import { getContextualMemories, getUserFacts, recordMemoryAccess, getGlobalKnowledge } from '../../../shared/storage/hypergraphPersistence.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Represents the relationship data for a user.
 */
interface Relationship {
    attitude: string;
    behavior: string[];
    boundaries: string[];
    username?: string;
    displayName?: string;
}

/**
 * Represents a message in the conversation context.
 */
interface MessageContext {
    authorId: string;
    author: string;
    content: string;
}

/**
 * Bot persona configuration.
 */
interface BotPersonaConfig {
    name: string;
    description: string;
    speakingStyle: string[];
    globalRules: string[];
}

/**
 * Parameters for building a prompt.
 */
interface BuildPromptParams {
    relationship: Relationship;
    context: MessageContext[];
    guildRelationships?: Record<string, Relationship>;
    guildName?: string;
    userMessage: string;
    username: string;
    botConfig?: BotPersonaConfig;
    guildId: string;
    channelId: string;
    userId: string;
}

/**
 * Builds the prompt string to send to the LLM.
 * 
 * @param params - The parameters for building the prompt
 * @returns Promise resolving to the constructed prompt string
 */
export async function buildPrompt({
    relationship,
    context,
    guildRelationships = {},
    guildName = '',
    userMessage,
    username,
    botConfig,
    guildId,
    channelId,
    userId
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

    // Fetch hypergraph memories (primary memory system)
    let hypergraphMemoriesSection = '';
    try {
        // Get contextual memories from current channel (prioritizing current user)
        const channelMemories = await getContextualMemories(guildId, channelId, userId, 10);
        // Get user facts that can be shared across channels
        const userFacts = await getUserFacts(guildId, userId, 5);
        // Get global knowledge facts from ingested documents/RSS
        const globalKnowledge = await getGlobalKnowledge(guildId, 5);
        
        logger.info(`Fetched memories for prompt: ${channelMemories.length} channel, ${userFacts.length} user facts, ${globalKnowledge.length} global knowledge`);
        
        // Also fetch general stats/top entities for broader context
        const { getHypergraphStats } = await import('../../../shared/storage/hypergraphPersistence.js');
        const stats = await getHypergraphStats(guildId);
        const topEntities = stats.topEntities?.slice(0, 5).map((e: any) => e.name).join(', ') || '';

        const allMemories = [...channelMemories, ...userFacts, ...globalKnowledge];

        // Record access for retrieved memories (boosts importance)
        for (const memory of allMemories) {
            await recordMemoryAccess(memory.id);
        }

        if (allMemories.length > 0 || topEntities) {
            const memoryLines = allMemories.map(m => {
                const members = m.members || [];
                const memberInfo = members
                    .filter((mem: any) => mem.role === 'participant' || mem.role === 'subject' || mem.role === 'topic')
                    .map((mem: any) => mem.name)
                    .join(', ');
                
                let line = `- ${m.summary}`;
                if (memberInfo) line += ` (Keywords: ${memberInfo})`;
                return line;
            });
            
            hypergraphMemoriesSection = '\nRelevant memories and context:';
            if (topEntities) {
                hypergraphMemoriesSection += `\nTop entities in this server: ${topEntities}`;
            }
            if (memoryLines.length > 0) {
                hypergraphMemoriesSection += `\nPast events and knowledge:\n${memoryLines.join('\n')}`;
            }
        }
    } catch (err) {
        logger.warn('Failed to fetch hypergraph memories (continuing without)', err);
    }

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
${hypergraphMemoriesSection}

Recent conversation (for continuity):
${context.map(m => `${m.author}: ${m.content}`).join('\n')}

Message you are replying to:
${username}: ${userMessage}

Respond naturally. Stay in character. Use your memories above to maintain coherence.
`.trim();
}
