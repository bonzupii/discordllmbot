/**
 * Config Routes
 *
 * REST endpoints for global and server-specific configuration management.
 *
 * @module bot/src/api/routes/config
 */

import { Router, Request, Response } from 'express';
import { Client } from 'discord.js';
import { logger } from '@shared/utils/logger.js';
import {
    loadConfig,
    reloadConfig,
    getServerConfig,
    updateServerConfig,
    clearServerConfigCache,
} from '@shared/config/configLoader.js';
import { deleteServerConfig, saveGlobalConfig } from '@shared/storage/persistence.js';
import { getChangedFields } from '../utils.js';

export interface ConfigRoutesOptions {
    client: Client;
    io: import('socket.io').Server;
    isRestarting: boolean;
    setIsRestarting: (value: boolean) => void;
}

/**
 * Create config routes router.
 */
export function createConfigRoutes(options: ConfigRoutesOptions): Router {
    const router = Router();
    const { client, io } = options;

    /**
     * GET /api/config - Load global config
     */
    router.get('/config', async (_req: Request, res: Response) => {
        try {
            const config = await loadConfig();
            logger.info('Loaded global config via API');
            res.json(config);
        } catch (err) {
            logger.error('Failed to load global config', err);
            res.status(500).json({ error: 'Failed to load config' });
        }
    });

    /**
     * GET /api/servers/:guildId/config - Load server config
     */
    router.get('/servers/:guildId/config', async (req: Request, res: Response) => {
        try {
            const guildId = req.params.guildId as string;
            const config = await getServerConfig(guildId);

            const guild = client.guilds.cache.get(guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';

            logger.info(`Loaded server config for guild ${guildName} (${guildId})`);
            res.json(config);
        } catch (err) {
            const guildId = req.params.guildId as string;
            const guild = client.guilds.cache.get(guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';
            logger.error(`Failed to get config for guild ${guildName} (${guildId})`, err);
            res.status(500).json({ error: 'Failed to get server config' });
        }
    });

    /**
     * POST /api/servers/:guildId/config - Update server config
     */
    router.post('/servers/:guildId/config', async (req: Request, res: Response) => {
        try {
            const guildId = req.params.guildId as string;
            const newConfig = req.body;
            if (!newConfig || typeof newConfig !== 'object') {
                return res.status(400).json({ error: 'Invalid config format' });
            }

            const previousConfig = await getServerConfig(guildId);
            const guild = client.guilds.cache.get(guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';

            await updateServerConfig(guildId, newConfig);

            const changedFields = getChangedFields(previousConfig, newConfig);
            logger.info(`Updated Server Config for guild ${guildName} (${guildId})`, changedFields);

            if (guild) {
                const nextNickname = typeof newConfig.nickname === 'string' ? newConfig.nickname.trim() : '';
                const me = guild.members.me ?? await guild.members.fetchMe();
                const targetNickname = nextNickname.length > 0 ? nextNickname : null;
                if (me.nickname !== targetNickname) {
                    try {
                        await me.setNickname(targetNickname);
                        logger.info(`Updated Discord nickname for guild ${guildName} (${guildId}) to ${targetNickname ?? 'default username'}`);
                    } catch (nicknameErr) {
                        logger.warn(`Failed to update Discord nickname for guild ${guildName} (${guildId})`, nicknameErr);
                    }
                }
            }

            res.json({ message: 'Server config updated successfully' });
        } catch (err) {
            const guildId = req.params.guildId as string;
            const guild = client.guilds.cache.get(guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';
            logger.error(`Failed to update config for guild ${guildName} (${guildId})`, err);
            res.status(500).json({ error: 'Failed to update server config' });
        }
    });

    /**
     * DELETE /api/servers/:guildId/config - Reset server config
     */
    router.delete('/servers/:guildId/config', async (req: Request, res: Response) => {
        try {
            const guildId = req.params.guildId as string;
            const guild = client.guilds.cache.get(guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';

            await deleteServerConfig(guildId);
            clearServerConfigCache(guildId);
            logger.info(`Server config reset to default for guild ${guildName} (${guildId})`);
            res.json({ message: 'Server config reset to default' });
        } catch (err) {
            const guildId = req.params.guildId as string;
            const guild = client.guilds.cache.get(guildId);
            const guildName = guild ? guild.name : 'Unknown Guild';
            logger.error(`Failed to reset config for guild ${guildName} (${guildId})`, err);
            res.status(500).json({ error: 'Failed to reset server config' });
        }
    });

    /**
     * POST /api/config - Update global config
     */
    router.post('/config', async (req: Request, res: Response) => {
        try {
            const newConfig = req.body;
            if (!newConfig || typeof newConfig !== 'object') {
                return res.status(400).json({ error: 'Invalid config format' });
            }

            const previousConfig = await loadConfig();
            await saveGlobalConfig(newConfig);
            logger.info('Global config updated via API and saved to database');

            options.setIsRestarting(true);
            io.emit('bot:status', { isRestarting: true });

            try {
                const reloadedConfig = await reloadConfig();
                logger.info('Global configuration reloaded from database.');

                const changedFields = getChangedFields(previousConfig, reloadedConfig);
                logger.info('Updated Global Config fields', changedFields);

                const previousUsername = previousConfig.botPersona?.username;
                const nextUsername = reloadedConfig.botPersona?.username;
                if (client.user && nextUsername && previousUsername !== nextUsername) {
                    try {
                        await client.user.setUsername(nextUsername);
                        logger.info(`Updated Discord bot username to ${nextUsername}`);
                    } catch (usernameErr) {
                        logger.warn('Failed to update Discord bot username immediately', usernameErr);
                    }
                }
            } catch (reloadErr) {
                logger.error('Failed to reload global config in memory', reloadErr);
            } finally {
                options.setIsRestarting(false);
                io.emit('bot:status', { isRestarting: false });
            }

            res.json({ message: 'Global config updated successfully' });
        } catch (err) {
            logger.error('Failed to update global config', err);
            res.status(500).json({ error: 'Failed to update global config' });
        }
    });

    return router;
}
