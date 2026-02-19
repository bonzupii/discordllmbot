/**
 * Profile Updater Module
 * 
 * Handles updating the Discord bot's username and avatar.
 * 
 * @module bot/src/utils/profileUpdater
 */

import { Client } from 'discord.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Bot profile configuration.
 */
interface BotConfig {
    username?: string;
    avatarUrl?: string;
}

/**
 * Updates the bot's Discord profile (username and avatar).
 * 
 * @param client - The Discord client instance
 * @param botConfig - The bot configuration with username/avatar
 */
export async function updateDiscordProfile(client: Client, botConfig: BotConfig): Promise<void> {
    const updates: string[] = [];

    if (botConfig.username && client.user && botConfig.username !== client.user.username) {
        try {
            await client.user.setUsername(botConfig.username);
            logger.api('→ Discord API: user.setUsername()');
            logger.api(`  New username: ${botConfig.username}`);
            updates.push('username');
        } catch (err) {
            const error = err as { message?: string; code?: number };
            if (error.message?.includes('rate limited') || error.code === 429) {
                logger.warn(
                    `Cannot update username: Discord rate limit (must wait before changing again). Current: "${client.user.username}"`
                );
            } else if (error.message?.includes('changed too many times')) {
                logger.warn(
                    'Cannot update username: Changed too recently. Wait before trying again.'
                );
            } else {
                logger.error('Failed to update Discord username', err);
            }
        }
    }

    if (botConfig.avatarUrl) {
        try {
            if (!isValidImageUrl(botConfig.avatarUrl)) {
                logger.warn(`Invalid avatar URL in config: ${botConfig.avatarUrl}`);
            } else if (client.user) {
                const currentAvatarUrl = client.user.avatarURL();
                const currentAvatarBase = currentAvatarUrl ? currentAvatarUrl.split('?')[0] : null;
                const configAvatarBase = botConfig.avatarUrl.split('?')[0];
                
                if (configAvatarBase !== currentAvatarBase) {
                    await client.user.setAvatar(botConfig.avatarUrl);
                    logger.api('→ Discord API: user.setAvatar()');
                    logger.api(`  New avatar URL: ${botConfig.avatarUrl.substring(0, 100)}...`);
                    updates.push('avatar');
                }
            }
        } catch (err) {
            const error = err as { message?: string; code?: number };
            if (error.message?.includes('rate limited') ||429) {
                logger.warn('Cannot error.code ===  update avatar: Discord rate limit. Try again later.');
            } else {
                logger.error('Failed to update Discord avatar', err);
            }
        }
    }

    if (updates.length === 0) {
        logger.info('Discord profile already matches config');
    }
}

function isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    try {
        new URL(url);
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('data:image');
    } catch {
        return false;
    }
}
