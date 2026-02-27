import { generateReply } from '../llm/index.js';
import { logger } from '@shared/utils/logger.js';

const SANDBOX_PROMPT = `You are a command extractor for a sandboxed Docker container.

The user wants to run a command inside an isolated container. Extract ONLY the command they want to run (without the "docker" prefix).

Rules:
1. Extract the command the user wants to run inside the container
2. Do NOT include "docker" at the start - the command runs directly in the container
3. Do not add explanations, backticks, or any formatting
4. If the request is not asking to run a command, output "NOT_A_COMMAND"

Examples:
User: "can you run echo hello"
Output: echo hello

User: "check the hostname"
Output: cat /etc/hostname

User: "list files"
Output: ls -la

User: "what's in /proc/cpuinfo"
Output: cat /proc/cpuinfo

User: "hello"
Output: NOT_A_COMMAND

Now extract the command from this request:`;

export async function extractDockerCommand(userMessage: string): Promise<string | null> {
    const fullPrompt = `${SANDBOX_PROMPT}\n\nUser request: "${userMessage}"`;

    try {
        logger.info('Extracting docker command from user message');
        const { text } = await generateReply(fullPrompt);
        
        let extracted = text?.trim() ?? '';
        
        if (extracted === 'NOT_A_COMMAND' || !extracted) {
            return null;
        }

        extracted = extracted
            .replace(/^Output:\s*/i, '')
            .replace(/^Command:\s*/i, '')
            .replace(/^Command to run inside the container:\s*/i, '')
            .replace(/^The user wants to run the command.*?"/i, '')
            .replace(/^['"]?/i, '')
            .replace(/['"]?\s*$/i, '')
            .replace(/^```\w*\n?/g, '')
            .replace(/```$/g, '')
            .trim();

        if (!extracted || extracted.length < 2) {
            logger.warn('Extracted command is empty', { extracted });
            return null;
        }

        logger.info('Extracted docker command', { command: extracted });
        return extracted;
    } catch (err) {
        logger.error('Failed to extract docker command', err);
        return null;
    }
}
