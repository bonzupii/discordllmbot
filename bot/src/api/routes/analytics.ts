/**
 * Analytics Routes
 *
 * REST endpoints for analytics data retrieval.
 *
 * @module bot/src/api/routes/analytics
 */

import { Router, Request, Response } from 'express';
import { logger } from '@shared/utils/logger.js';
import {
    getAnalyticsData,
    getLatestReplies,
    getAnalyticsOverview,
    getAnalyticsVolume,
    getAnalyticsDecisions,
    getAnalyticsProviders,
    getAnalyticsPerformance,
    getAnalyticsUsers,
    getAnalyticsChannels,
    getAnalyticsErrors,
} from '@shared/storage/persistence';

/**
 * Create analytics routes router.
 */
export function createAnalyticsRoutes(): Router {
    const router = Router();

    /**
     * GET /api/analytics - Get all analytics data
     */
    router.get('/analytics', async (_req: Request, res: Response) => {
        try {
            const data = await getAnalyticsData();
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch analytics', err);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    });

    /**
     * GET /api/replies - Get recent bot replies
     */
    router.get('/replies', async (req: Request, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const replies = await getLatestReplies(limit);
            res.json(replies);
        } catch (err) {
            logger.error('Failed to fetch replies', err);
            res.status(500).json({ error: 'Failed to fetch replies' });
        }
    });

    /**
     * GET /api/analytics/overview - Get analytics overview
     */
    router.get('/analytics/overview', async (req: Request, res: Response) => {
        try {
            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            const data = await getAnalyticsOverview(days);
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch analytics overview', err);
            res.status(500).json({ error: 'Failed to fetch analytics overview' });
        }
    });

    /**
     * GET /api/analytics/volume - Get analytics volume data
     */
    router.get('/analytics/volume', async (req: Request, res: Response) => {
        try {
            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            const data = await getAnalyticsVolume(days);
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch analytics volume', err);
            res.status(500).json({ error: 'Failed to fetch analytics volume' });
        }
    });

    /**
     * GET /api/analytics/decisions - Get decision analytics
     */
    router.get('/analytics/decisions', async (req: Request, res: Response) => {
        try {
            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            logger.info(`Fetching decision analytics for ${days} days`);
            const data = await getAnalyticsDecisions(days) as { breakdown: unknown; funnel: unknown };
            logger.info('Decision analytics result', {
                breakdown: data.breakdown,
                funnel: data.funnel,
            });
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch decision analytics', err);
            res.status(500).json({ error: 'Failed to fetch decision analytics' });
        }
    });

    /**
     * GET /api/analytics/providers - Get provider analytics
     */
    router.get('/analytics/providers', async (req: Request, res: Response) => {
        try {
            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            const data = await getAnalyticsProviders(days);
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch provider analytics', err);
            res.status(500).json({ error: 'Failed to fetch provider analytics' });
        }
    });

    /**
     * GET /api/analytics/performance - Get performance analytics
     */
    router.get('/analytics/performance', async (req: Request, res: Response) => {
        try {
            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            const data = await getAnalyticsPerformance(days);
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch performance analytics', err);
            res.status(500).json({ error: 'Failed to fetch performance analytics' });
        }
    });

    /**
     * GET /api/analytics/users - Get user analytics
     */
    router.get('/analytics/users', async (req: Request, res: Response) => {
        try {
            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            const guildIdRaw = req.query.guildId as string | undefined;
            const guildId = guildIdRaw && guildIdRaw.trim() ? guildIdRaw.trim() : null;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const data = await getAnalyticsUsers(days, guildId, limit);
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch user analytics', err);
            res.status(500).json({ error: 'Failed to fetch user analytics' });
        }
    });

    /**
     * GET /api/analytics/channels - Get channel analytics
     */
    router.get('/analytics/channels', async (req: Request, res: Response) => {
        try {
            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            const guildIdRaw = req.query.guildId as string | undefined;
            const guildId = guildIdRaw && guildIdRaw.trim() ? guildIdRaw.trim() : null;
            const data = await getAnalyticsChannels(days, guildId);
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch channel analytics', err);
            res.status(500).json({ error: 'Failed to fetch channel analytics' });
        }
    });

    /**
     * GET /api/analytics/errors - Get error analytics
     */
    router.get('/analytics/errors', async (req: Request, res: Response) => {
        try {
            const days = req.query.days ? parseInt(req.query.days as string) : 7;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
            const data = await getAnalyticsErrors(days, limit);
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch error analytics', err);
            res.status(500).json({ error: 'Failed to fetch error analytics' });
        }
    });

    return router;
}
