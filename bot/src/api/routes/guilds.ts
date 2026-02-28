/**
 * Guilds & Servers Routes
 *
 * REST endpoints for guild/server management.
 *
 * @module bot/src/api/routes/guilds
 */

import { Client } from 'discord.js';
import { Router, Request, Response } from 'express';

import { loadRelationships, saveRelationships } from '@shared/storage/persistence';
import { logger } from '@shared/utils/logger.js';

export interface GuildsRoutesOptions {
    client: Client;
}

/**
 * Create guilds routes router.
 */
export function createGuildsRoutes(options: GuildsRoutesOptions): Router {
    const router = Router();
    const { client } = options;

    /**
     * GET /api/guilds - Get all guilds (simple list)
     */
    router.get('/guilds', async (_req: Request, res: Response) => {
        try {
            const guilds = client.guilds.cache.map(guild => ({ id: guild.id, name: guild.name }));
            res.json(guilds);
        } catch (err) {
            logger.error('Failed to load guilds', err);
            res.status(500).json({ error: 'Failed to load guilds' });
        }
    });

    /**
     * GET /api/servers - Get all servers with details
     */
    router.get('/servers', async (_req: Request, res: Response) => {
        try {
            const servers = client.guilds.cache.map(guild => ({
                id: guild.id,
                name: guild.name,
                joinedAt: guild.joinedAt,
                iconURL: guild.iconURL({ forceStatic: true, size: 64 }),
                memberCount: guild.memberCount,
                ownerId: guild.ownerId,
            }));
            res.json(servers);
        } catch (err) {
            logger.error('Failed to load servers', err);
            res.status(500).json({ error: 'Failed to load servers' });
        }
    });

    /**
     * DELETE /api/servers/:serverId - Leave a server
     */
    router.delete('/servers/:serverId', async (req: Request, res: Response) => {
        try {
            const serverId = req.params.serverId as string;
            const guild = client.guilds.cache.get(serverId);
            if (guild) {
                await guild.leave();
                res.json({ message: 'Server left successfully' });
            } else {
                res.status(404).json({ error: 'Server not found' });
            }
        } catch (err) {
            logger.error('Failed to leave server', err);
            res.status(500).json({ error: 'Failed to leave server' });
        }
    });

    /**
     * GET /api/guilds/:guildId/relationships - Get guild relationships
     */
    router.get('/guilds/:guildId/relationships', async (req: Request, res: Response) => {
        try {
            const guildId = req.params.guildId as string;
            const relationships = await loadRelationships(guildId);
            res.json(relationships);
        } catch (err) {
            logger.error('Failed to load relationships', err);
            res.status(500).json({ error: 'Failed to load relationships' });
        }
    });

    /**
     * POST /api/guilds/:guildId/relationships/:userId - Update user relationship
     */
    router.post('/guilds/:guildId/relationships/:userId', async (req: Request, res: Response) => {
        try {
            const guildId = req.params.guildId as string;
            const userId = req.params.userId as string;
            const newRel = req.body;

            const currentRels = await loadRelationships(guildId);
            currentRels[userId] = newRel;

            await saveRelationships(guildId, currentRels);

            try {
                await loadRelationships(guildId);
                logger.info(`Reloaded relationships for guild ${guildId} via API.`);
            } catch (reloadErr) {
                logger.error(`Failed to reload relationships for guild ${guildId}`, reloadErr);
            }

            res.json({ message: 'Relationship updated successfully' });
        } catch (err) {
            logger.error('Failed to update relationship', err);
            res.status(500).json({ error: 'Failed to update relationship' });
        }
    });

    /**
     * GET /api/guilds/:guildId/channels - Get guild channels
     */
    router.get('/guilds/:guildId/channels', async (req: Request, res: Response) => {
        try {
            const guildId = req.params.guildId as string;
            const guild = client.guilds.cache.get(guildId);

            if (!guild) {
                return res.status(404).json({ error: 'Guild not found' });
            }

            const channels = await guild.channels.fetch();
            const channelList = channels
                .filter((channel): channel is import('discord.js').TextChannel => channel?.type === 0 && channel !== null)
                .map((channel) => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    parentId: channel.parentId,
                    position: channel.position,
                }));

            res.json(channelList);
        } catch (err) {
            logger.error('Failed to fetch channels', err);
            res.status(500).json({ error: 'Failed to fetch channels' });
        }
    });

    return router;
}
