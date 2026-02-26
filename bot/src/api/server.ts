/**
 * API Server Module
 * 
 * Express + Socket.io API server for the Discord bot dashboard.
 * Provides REST endpoints for configuration, relationships, analytics, and database management.
 * Also handles real-time log streaming via Socket.io.
 * 
 * @module bot/src/api/server
 * @requires express
 * @requires socket.io
 * @requires discord.js
 */

import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Client } from 'discord.js';
import { logger } from '../../../shared/utils/logger.js';
import { loadConfig, reloadConfig, getServerConfig, updateServerConfig, clearServerConfigCache } from '../../../shared/config/configLoader.js';
import { loadGuildRelationships } from '../personality/relationships.js';
import { generateReply, getAvailableModels } from '../llm/index.js';
import { getLatestReplies, getAnalyticsData, loadRelationships, saveRelationships, deleteServerConfig, saveGlobalConfig, getDb, getSqlLogEmitter } from '../../../shared/storage/persistence.js';
import os from 'os';
import crypto from 'crypto';

const LOG_FILE_PATH = path.join(process.cwd(), '..', 'logs', 'discordllmbot.log');

/**
 * Interface for CPU times used in CPU usage calculation.
 */
interface CpuTimes {
    idle: number;
    total: number;
}

type JsonRecord = Record<string, unknown>;

let prevCpuTimes: CpuTimes | null = null;
let prevTimestamp: number | null = null;
let isRestarting = false;
let io: SocketIOServer;


interface QwenOauthState {
    codeVerifier: string;
    redirectUri: string;
    clientId: string;
    createdAt: number;
}

interface QwenDeviceFlowState {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete: string;
    expiresIn: number;
    interval: number;
    codeVerifier: string;
    createdAt: number;
}

const qwenOauthStateStore = new Map<string, QwenOauthState>();
const qwenDeviceFlowStore = new Map<string, QwenDeviceFlowState>();
const QWEN_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const QWEN_OAUTH_DEFAULT_CLIENT_ID = 'f0304373b74a44d2b584a3fb70ca9e56';
const QWEN_OAUTH_BASE_URL = 'https://chat.qwen.ai';
const QWEN_OAUTH_DEVICE_CODE_ENDPOINT = `${QWEN_OAUTH_BASE_URL}/api/v1/oauth2/device/code`;
const QWEN_OAUTH_TOKEN_ENDPOINT = `${QWEN_OAUTH_BASE_URL}/api/v1/oauth2/token`;
const QWEN_OAUTH_SCOPE = 'openid profile email model.completion';
const QWEN_OAUTH_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

function createPkceChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function pruneExpiredQwenOauthStates(): void {
    const now = Date.now();
    for (const [state, value] of qwenOauthStateStore.entries()) {
        if (now - value.createdAt > QWEN_OAUTH_STATE_TTL_MS) {
            qwenOauthStateStore.delete(state);
        }
    }
    // Also prune expired device flow states
    for (const [deviceCode, value] of qwenDeviceFlowStore.entries()) {
        if (now - value.createdAt > value.expiresIn * 1000) {
            qwenDeviceFlowStore.delete(deviceCode);
        }
    }
}


function readNonEmptyEnv(name: string): string | null {
    const value = process.env[name];
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
        return null;
    }

    return trimmed;
}

function normalizeBaseUrl(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed) {
        return null;
    }

    try {
        const parsed = new URL(trimmed);
        return parsed.origin;
    } catch {
        return null;
    }
}

function getPublicApiBaseUrl(req: Request): string {
    const configuredPublicBaseUrl = readNonEmptyEnv('PUBLIC_API_BASE_URL');
    const configuredQwenCallbackUrl = readNonEmptyEnv('QWEN_OAUTH_REDIRECT_URI');

    if (configuredQwenCallbackUrl) {
        try {
            const parsed = new URL(configuredQwenCallbackUrl);
            return parsed.origin;
        } catch {
            logger.warn('Invalid QWEN_OAUTH_REDIRECT_URI provided; falling back to request-derived URL');
        }
    }

    if (configuredPublicBaseUrl) {
        const normalizedConfiguredBase = normalizeBaseUrl(configuredPublicBaseUrl);
        if (normalizedConfiguredBase) {
            return normalizedConfiguredBase;
        }
        logger.warn('Invalid PUBLIC_API_BASE_URL provided; falling back to request-derived URL');
    }

    const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();

    if (forwardedProto && forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
    }

    const originHeader = req.get('origin');
    if (originHeader) {
        const normalizedOrigin = normalizeBaseUrl(originHeader);
        if (normalizedOrigin) {
            return normalizedOrigin;
        }
    }

    const requestHost = req.get('host') ?? 'localhost:3000';
    const isInternalHost = requestHost.startsWith('bot:') || requestHost === 'bot';
    const fallbackHost = isInternalHost ? 'localhost:3000' : requestHost;
    return `${req.protocol}://${fallbackHost}`;
}

function getChangedFields(previousValue: unknown, nextValue: unknown, prefix = ''): JsonRecord {
    const previousObject = previousValue && typeof previousValue === 'object' ? previousValue as JsonRecord : null;
    const nextObject = nextValue && typeof nextValue === 'object' ? nextValue as JsonRecord : null;

    if (!previousObject || !nextObject || Array.isArray(previousObject) || Array.isArray(nextObject)) {
        if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) {
            return {};
        }

        return {
            [prefix || 'value']: nextValue,
        };
    }

    const keys = new Set([...Object.keys(previousObject), ...Object.keys(nextObject)]);
    const changes: JsonRecord = {};

    for (const key of keys) {
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        const childChanges = getChangedFields(previousObject[key], nextObject[key], nextPrefix);
        Object.assign(changes, childChanges);
    }

    return changes;
}

/**
 * Logs database query execution time to connected dashboard clients.
 * @param tableName - Name of the database table
 * @param query - Description of the query
 * @param duration - Query execution time in milliseconds
 */
function logDbQuery(tableName: string, query: string, duration: number): void {
    const timestamp = new Date().toISOString();
    const logLine = `[DB] ${timestamp} - ${tableName}: ${query} (${duration}ms)`;
    if (io) {
        io.emit('db:log', logLine);
    }
}

/**
 * Starts the Express API server and Socket.io for the dashboard.
 * Sets up all REST endpoints and real-time log streaming.
 * 
 * @param client - The Discord.js client instance
 * @returns Object containing the Express app and Socket.io server
 */
export function startApi(client: Client): { app: Express; io: SocketIOServer } {
    const app: Express = express();
    const httpServer: HttpServer = createServer(app);
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    const PORT = process.env.API_PORT || 3000;

    app.use(cors());
    app.use(express.json());

    app.get('/api/health', (req: Request, res: Response) => {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsagePercent = (usedMemory / totalMemory) * 100;

        const currentTimestamp = Date.now();
        const currentCpus = os.cpus();

        let currentTotalIdle = 0;
        let currentTotalTick = 0;

        for (let i = 0; i < currentCpus.length; i++) {
            const cpu = currentCpus[i];
            for (const type in cpu.times) {
                currentTotalTick += cpu.times[type];
            }
            currentTotalIdle += cpu.times.idle;
        }

        let cpuUsagePercent = 0;

        if (prevCpuTimes !== null && prevTimestamp !== null) {
            const elapsedMs = currentTimestamp - prevTimestamp;
            const idleDiff = currentTotalIdle - prevCpuTimes.idle;
            const totalDiff = currentTotalTick - prevCpuTimes.total;

            if (elapsedMs > 0 && totalDiff > 0) {
                const idlePercentage = (idleDiff / totalDiff) * 100;
                cpuUsagePercent = 100 - idlePercentage;
                cpuUsagePercent = Math.max(0, Math.min(100, cpuUsagePercent));
            }
        }

        prevCpuTimes = {
            idle: currentTotalIdle,
            total: currentTotalTick
        };
        prevTimestamp = currentTimestamp;

        res.json({
            status: 'ok',
            uptime: process.uptime(),
            cpu_usage: parseFloat(cpuUsagePercent.toFixed(2)),
            memory_usage: parseFloat(memoryUsagePercent.toFixed(2)),
            botStatus: client.isReady() ? 'ready' : 'not_ready'
        });
    });

    app.get('/api/config', async (req: Request, res: Response) => {
        try {
            const config = await loadConfig();
            logger.info('Loaded global config via API');
            res.json(config);
        } catch (err) {
            logger.error('Failed to load global config', err);
            res.status(500).json({ error: 'Failed to load config' });
        }
    });

    app.get('/api/servers/:guildId/config', async (req: Request, res: Response) => {
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

    app.post('/api/servers/:guildId/config', async (req: Request, res: Response) => {
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

    app.delete('/api/servers/:guildId/config', async (req: Request, res: Response) => {
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

    app.post('/api/config', async (req: Request, res: Response) => {
        try {
            const newConfig = req.body;
            if (!newConfig || typeof newConfig !== 'object') {
                return res.status(400).json({ error: 'Invalid config format' });
            }

            const previousConfig = await loadConfig();

            await saveGlobalConfig(newConfig);
            logger.info('Global config updated via API and saved to database');

            isRestarting = true;
            io.emit('bot:status', { isRestarting });

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
                isRestarting = false;
                io.emit('bot:status', { isRestarting });
            }

            res.json({ message: 'Global config updated successfully' });
        } catch (err) {
            logger.error('Failed to update global config', err);
            res.status(500).json({ error: 'Failed to update global config' });
        }
    });

    app.get('/api/guilds', async (req: Request, res: Response) => {
        try {
            const guilds = client.guilds.cache.map(guild => ({ id: guild.id, name: guild.name }));
            res.json(guilds);
        } catch (err) {
            logger.error('Failed to load guilds', err);
            res.status(500).json({ error: 'Failed to load guilds' });
        }
    });

    app.get('/api/guilds/:guildId/relationships', async (req: Request, res: Response) => {
        try {
            const guildId = req.params.guildId as string;
            const relationships = await loadRelationships(guildId);
            res.json(relationships);
        } catch (err) {
            logger.error('Failed to load relationships', err);
            res.status(500).json({ error: 'Failed to load relationships' });
        }
    });

    app.post('/api/guilds/:guildId/relationships/:userId', async (req: Request, res: Response) => {
        try {
            const guildId = req.params.guildId as string; const userId = req.params.userId as string;
            const newRel = req.body;

            const currentRels = await loadRelationships(guildId);
            currentRels[userId] = newRel;

            await saveRelationships(guildId, currentRels);

            try {
                await loadGuildRelationships(guildId);
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

    io.on('connection', (socket: Socket) => {
        logger.info('Dashboard client connected');

        socket.emit('bot:status', { isRestarting });

        try {
            if (fs.existsSync(LOG_FILE_PATH)) {
                const logs = fs.readFileSync(LOG_FILE_PATH, 'utf-8')
                    .split('\n')
                    .slice(-50)
                    .map((line) => line.replace(/[\n\r]/g, '\\n'))
                    .filter((l) => l.trim());
                socket.emit('logs:init', logs);
            }
        } catch (err) {
            logger.error('Failed to read log file for init', err);
        }

        socket.on('disconnect', () => {
            logger.info('Dashboard client disconnected');
        });
    });

    const sqlLogEmitter = getSqlLogEmitter();
    sqlLogEmitter.on('query', (logLine: string, data: { query: string; params?: unknown[]; duration: number; error?: string }) => {
        const timestamp = new Date().toISOString();
        const jsonStr = JSON.stringify(data).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        const fullLogLine = `[${timestamp}] [SQL] ${logLine} ${jsonStr}`;
        io.emit('log', fullLogLine);
        io.emit('db:log', fullLogLine);
    });

    logger.onLog((logEntry: { timestamp: string; level: string; message: string; formatted: string }) => {
        if (io) {
            io.emit('log', logEntry.formatted);
        }
    });

    app.get('/api/servers', async (req: Request, res: Response) => {
        try {
            const servers = client.guilds.cache.map(guild => ({
                id: guild.id,
                name: guild.name,
                joinedAt: guild.joinedAt,
                iconURL: guild.iconURL({ forceStatic: true, size: 64 }),
                memberCount: guild.memberCount,
                ownerId: guild.ownerId
            }));
            res.json(servers);
        } catch (err) {
            logger.error('Failed to load servers', err);
            res.status(500).json({ error: 'Failed to load servers' });
        }
    });

    app.delete('/api/servers/:serverId', async (req: Request, res: Response) => {
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

    app.get('/api/bot-info', async (req: Request, res: Response) => {
        try {
            const botInviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&permissions=274878229568&scope=bot%20applications.commands`;

            res.json({
                inviteUrl: botInviteUrl,
                clientId: process.env.DISCORD_CLIENT_ID
            });
        } catch (err) {
            logger.error('Failed to get bot info', err);
            res.status(500).json({ error: 'Failed to get bot info' });
        }
    });

    app.get('/api/models', async (req: Request, res: Response) => {
        try {
            const config = await loadConfig();
            const requestedProvider = (req.query.provider as string) ?? config.llm?.provider ?? 'gemini';
            const models = await getAvailableModels(requestedProvider);
            res.json(models);
        } catch (err) {
            logger.error('Failed to fetch models:', err);
            res.status(500).json({ error: `Failed to fetch models from ${(req.query.provider as string) ?? 'Gemini'} API` });
        }
    });

    app.post('/api/llm/qwen/oauth/start', async (req: Request, res: Response) => {
        try {
            pruneExpiredQwenOauthStates();

            const configuredClientId = readNonEmptyEnv('QWEN_OAUTH_CLIENT_ID');
            const clientId = configuredClientId ?? QWEN_OAUTH_DEFAULT_CLIENT_ID;
            const scope = QWEN_OAUTH_SCOPE;

            const codeVerifier = crypto.randomBytes(32).toString('base64url');
            const codeChallenge = createPkceChallenge(codeVerifier);

            // Request device code from Qwen
            const deviceCodeResponse = await fetch(QWEN_OAUTH_DEVICE_CODE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    scope,
                    code_challenge: codeChallenge,
                    code_challenge_method: 'S256',
                }).toString(),
            });

            if (!deviceCodeResponse.ok) {
                const errorText = await deviceCodeResponse.text();
                throw new Error(`Failed to get device code (${deviceCodeResponse.status}): ${errorText}`);
            }

            const deviceData = await deviceCodeResponse.json() as {
                device_code: string;
                user_code: string;
                verification_uri: string;
                verification_uri_complete: string;
                expires_in: number;
                interval: number;
            };

            // Store device flow state
            qwenDeviceFlowStore.set(deviceData.device_code, {
                deviceCode: deviceData.device_code,
                userCode: deviceData.user_code,
                verificationUri: deviceData.verification_uri,
                verificationUriComplete: deviceData.verification_uri_complete,
                expiresIn: deviceData.expires_in,
                interval: deviceData.interval,
                codeVerifier,
                createdAt: Date.now(),
            });

            logger.info('Initialized Qwen Device Authorization Flow', {
                userCode: deviceData.user_code,
                verificationUri: deviceData.verification_uri,
                expiresIn: deviceData.expires_in,
            });

            res.json({
                deviceCode: deviceData.device_code,
                userCode: deviceData.user_code,
                verificationUri: deviceData.verification_uri,
                verificationUriComplete: deviceData.verification_uri_complete,
                expiresIn: deviceData.expires_in,
                interval: deviceData.interval,
            });
        } catch (err) {
            logger.error('Failed to initialize Qwen Device Authorization flow', err);
            res.status(500).json({ error: 'Failed to initialize Qwen Device Authorization flow' });
        }
    });

    app.post('/api/llm/qwen/oauth/poll', async (req: Request, res: Response) => {
        const { deviceCode } = req.body as { deviceCode?: string };

        if (!deviceCode) {
            return res.status(400).json({ error: 'Missing device_code' });
        }

        const deviceFlowState = qwenDeviceFlowStore.get(deviceCode);
        if (!deviceFlowState) {
            return res.status(400).json({ error: 'Device code not found or expired' });
        }

        const configuredClientId = readNonEmptyEnv('QWEN_OAUTH_CLIENT_ID');
        const clientId = configuredClientId ?? QWEN_OAUTH_DEFAULT_CLIENT_ID;

        try {
            const tokenResponse = await fetch(QWEN_OAUTH_TOKEN_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: QWEN_OAUTH_GRANT_TYPE,
                    client_id: clientId,
                    device_code: deviceCode,
                    code_verifier: deviceFlowState.codeVerifier,
                }).toString(),
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json().catch(() => ({ error: 'unknown' }));
                
                if (errorData.error === 'authorization_pending') {
                    return res.json({ status: 'pending' });
                }
                
                if (errorData.error === 'slow_down') {
                    return res.json({ status: 'slow_down', interval: deviceFlowState.interval + 5 });
                }
                
                if (errorData.error === 'access_denied') {
                    qwenDeviceFlowStore.delete(deviceCode);
                    return res.status(400).json({ error: 'Authorization denied' });
                }
                
                if (errorData.error === 'expired_token') {
                    qwenDeviceFlowStore.delete(deviceCode);
                    return res.status(400).json({ error: 'Token expired' });
                }

                const errorText = await tokenResponse.text();
                throw new Error(`Token exchange failed (${tokenResponse.status}): ${errorText}`);
            }

            const tokenData = await tokenResponse.json() as {
                access_token?: string;
                refresh_token?: string;
                id_token?: string;
                expires_in?: number;
                token_type?: string;
            };

            const accessToken = tokenData.access_token?.trim();
            if (!accessToken) {
                throw new Error('OAuth response did not include access_token');
            }

            // Save token to config
            const config = await loadConfig();
            const updatedConfig = {
                ...config,
                llm: {
                    ...config.llm,
                    qwenApiKey: accessToken,
                },
            };

            await saveGlobalConfig(updatedConfig);
            await reloadConfig();

            // Clean up device flow state
            qwenDeviceFlowStore.delete(deviceCode);

            logger.info('Qwen Device Authorization completed successfully');

            res.json({ status: 'success', accessToken });
        } catch (oauthErr) {
            logger.error('Failed to poll Qwen OAuth token', oauthErr);
            const message = oauthErr instanceof Error ? oauthErr.message : 'Qwen OAuth failed';
            res.status(500).json({ error: message });
        }
    });

    app.get('/api/guilds/:guildId/channels', async (req: Request, res: Response) => {
        try {
            const guildId = req.params.guildId as string;
            const guild = client.guilds.cache.get(guildId);

            if (!guild) {
                return res.status(404).json({ error: 'Guild not found' });
            }

            const channels = await guild.channels.fetch();
            const channelList = channels
                .filter(channel => channel.type === 0)
                .map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    parentId: channel.parentId,
                    position: channel.position
                }));

            res.json(channelList);
        } catch (err) {
            logger.error('Failed to fetch channels', err);
            res.status(500).json({ error: 'Failed to fetch channels' });
        }
    });

    app.get('/api/replies', async (req: Request, res: Response) => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const replies = await getLatestReplies(limit);
            res.json(replies);
        } catch (err) {
            logger.error('Failed to fetch latest replies', err);
            res.status(500).json({ error: 'Failed to fetch latest replies' });
        }
    });

    app.get('/api/analytics', async (req: Request, res: Response) => {
        try {
            const data = await getAnalyticsData();
            res.json(data);
        } catch (err) {
            logger.error('Failed to fetch analytics', err);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    });

    app.post('/api/chat', async (req: Request, res: Response) => {
        try {
            const { content } = req.body;
            const reply = await generateReply(content);
            res.json(reply);
        } catch (err) {
            logger.error('Failed to generate reply', err);
            res.status(500).json({ error: 'Failed to generate reply' });
        }
    });

    app.get('/api/db/tables', async (req: Request, res: Response) => {
        const startTime = Date.now();
        try {
            const db = await getDb() as any;
            const result = await db.query(`
                SELECT 
                    t.table_name,
                    obj_description(t.table_name::regclass) as description,
                    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
                FROM information_schema.tables t
                WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_name
            `);
            logDbQuery('information_schema', 'SELECT tables', Date.now() - startTime);
            res.json(result.rows);
        } catch (err) {
            logger.error('Failed to fetch tables', err);
            res.status(500).json({ error: 'Failed to fetch tables' });
        }
    });

    app.get('/api/db/tables/:tableName/schema', async (req: Request, res: Response) => {
        const startTime = Date.now();
        try {
            const tableName = req.params.tableName as string;
            const db = await getDb() as any;
            
            const columnsResult = await db.query(`
                SELECT 
                    c.column_name,
                    c.data_type,
                    c.is_nullable,
                    c.column_default,
                    c.character_maximum_length,
                    (SELECT COUNT(*) > 0 FROM information_schema.table_constraints tc
                     JOIN information_schema.key_column_usage kcu
                     ON tc.constraint_name = kcu.constraint_name
                     WHERE tc.table_name = c.table_name
                     AND tc.constraint_type = 'PRIMARY KEY'
                     AND kcu.column_name = c.column_name) as is_primary_key,
                    (SELECT kcu2.column_name 
                     FROM information_schema.table_constraints tc2
                     JOIN information_schema.key_column_usage kcu2
                     ON tc2.constraint_name = kcu2.constraint_name
                     WHERE tc2.table_name = c.table_name
                     AND tc2.constraint_type = 'FOREIGN KEY'
                     AND kcu2.column_name = c.column_name
                     LIMIT 1) as foreign_key
                FROM information_schema.columns c
                WHERE c.table_name = $1 AND c.table_schema = 'public'
                ORDER BY c.ordinal_position
            `, [tableName]);

            const fkResult = await db.query(`
                SELECT
                    kcu.column_name as column_name,
                    ccu.table_name AS foreign_table,
                    ccu.column_name AS foreign_column
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_name = $1
            `, [tableName]);

            const foreignKeys: Record<string, { table: string; column: string }> = {};
            fkResult.rows.forEach((fk: Record<string, string>) => {
                foreignKeys[fk.column_name] = {
                    table: fk.foreign_table,
                    column: fk.foreign_column
                };
            });

            logDbQuery(tableName, 'SELECT schema', Date.now() - startTime);
            res.json({
                columns: columnsResult.rows,
                foreignKeys
            });
        } catch (err) {
            logger.error('Failed to fetch table schema', err);
            res.status(500).json({ error: 'Failed to fetch table schema' });
        }
    });

    app.get('/api/db/tables/:tableName/data', async (req: Request, res: Response) => {
        const startTime = Date.now();
        try {
            const tableName = req.params.tableName as string;
            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const offset = (page - 1) * pageSize;

            const validTables = ['bot_replies', 'global_config', 'guilds', 'messages',
                'relationship_behaviors', 'relationship_boundaries',
                'relationships', 'server_configs'];
            if (!validTables.includes(tableName)) {
                return res.status(400).json({ error: 'Invalid table name' });
            }

            const db = await getDb() as any;
            
            const countResult = await db.query(`SELECT COUNT(*) as total FROM ${tableName}`);
            const total = parseInt((countResult.rows[0] as Record<string, string>).total);

            const dataResult = await db.query(
                `SELECT * FROM ${tableName} ORDER BY 1 LIMIT $1 OFFSET $2`,
                [pageSize, offset]
            );

            logDbQuery(tableName, `SELECT data (page ${page}, ${pageSize} rows)`, Date.now() - startTime);
            res.json({
                data: dataResult.rows,
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages: Math.ceil(total / pageSize)
                }
            });
        } catch (err) {
            logger.error('Failed to fetch table data', err);
            res.status(500).json({ error: 'Failed to fetch table data' });
        }
    });

    app.get('/api/db/relationships', async (req: Request, res: Response) => {
        const startTime = Date.now();
        try {
            const db = await getDb() as any;
            const result = await db.query(`
                SELECT
                    tc.table_name AS from_table,
                    kcu.column_name AS from_column,
                    ccu.table_name AS to_table,
                    ccu.column_name AS to_column
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
                ORDER BY tc.table_name, kcu.column_name
            `);
            logDbQuery('information_schema', 'SELECT relationships', Date.now() - startTime);
            res.json(result.rows);
        } catch (err) {
            logger.error('Failed to fetch relationships', err);
            res.status(500).json({ error: 'Failed to fetch relationships' });
        }
    });

    if (fs.existsSync(LOG_FILE_PATH)) {
        let fileSize = fs.statSync(LOG_FILE_PATH).size;
        fs.watch(LOG_FILE_PATH, (event) => {
            if (event === 'change') {
                const stats = fs.statSync(LOG_FILE_PATH);
                if (stats.size > fileSize) {
                    const stream = fs.createReadStream(LOG_FILE_PATH, {
                        start: fileSize,
                        end: stats.size
                    });
                    stream.on('data', (chunk: Buffer) => {
                        const lines = chunk.toString().split('\n').filter(l => l.trim());
                        lines.forEach(line => io.emit('log', line));
                    });
                    fileSize = stats.size;
                } else if (stats.size < fileSize) {
                    fileSize = stats.size;
                }
            }
        });
    }

    httpServer.listen(PORT, () => {
        logger.info(`API server running on port ${PORT}`);
    });

    return { app, io };
}

export { io };
