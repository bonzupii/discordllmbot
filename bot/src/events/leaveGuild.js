import { logger } from '../../../shared/utils/logger.js';

export async function handleLeaveGuild(req, res, client) {
    try {
        const { serverId } = req.params;
        
        const guild = client.guilds.cache.get(serverId);
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        await guild.leave();
        logger.info(`Left guild: ${guild.name} (${guild.id})`);
        
        res.json({ message: 'Successfully left guild' });
    } catch (err) {
        logger.error(`Failed to leave guild ${req.params.serverId}`, err);
        res.status(500).json({ error: 'Failed to leave guild' });
    }
}