/**
 * LLM Routes
 *
 * REST endpoints for LLM provider interactions.
 *
 * @module bot/src/api/routes/llm
 */

import { Router, Request, Response } from 'express';

import { OAUTH } from '@shared/constants';
import { loadConfig, reloadConfig } from '@shared/config/configLoader.js';
import { saveGlobalConfig } from '@shared/storage/persistence.js';
import { logger } from '@shared/utils/logger.js';

import { generateReply, getAvailableModels } from '@llm/index.js';

import { createPkceChallenge, pruneExpiredQwenOauthStates, readNonEmptyEnv } from '@api/utils.js';

const { QWEN } = OAUTH;

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

const qwenDeviceFlowStore = new Map<string, QwenDeviceFlowState>();

/**
 * Create LLM routes router.
 */
export function createLlmRoutes(): Router {
    const router = Router();

    /**
     * GET /api/models - Get available models
     */
    router.get('/models', async (req: Request, res: Response) => {
        try {
            const config = await loadConfig();
            const requestedProvider = (req.query.provider as string) ?? config.llm?.provider ?? 'gemini';
            const models = await getAvailableModels(requestedProvider);
            res.json(models);
        } catch (err) {
            logger.error('Failed to fetch models:', err);
            res
                .status(500)
                .json({
                    error: `Failed to fetch models from ${(req.query.provider as string) ?? 'Gemini'} API`,
                });
        }
    });

    /**
     * POST /api/llm/qwen/oauth/start - Start Qwen OAuth flow
     */
    router.post('/llm/qwen/oauth/start', async (req: Request, res: Response) => {
        try {
            pruneExpiredQwenOauthStates(OAUTH.QWEN.STATE_TTL_MS);

            const configuredClientId = readNonEmptyEnv('QWEN_OAUTH_CLIENT_ID');
            const clientId = configuredClientId ?? QWEN.DEFAULT_CLIENT_ID;
            const scope = QWEN.SCOPE;

            const codeVerifier = crypto.randomBytes(32).toString('base64url');
            const codeChallenge = createPkceChallenge(codeVerifier);

            const deviceCodeResponse = await fetch(`${QWEN.BASE_URL}${QWEN.DEVICE_CODE_ENDPOINT}`, {
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

            const deviceData = (await deviceCodeResponse.json()) as {
                device_code: string;
                user_code: string;
                verification_uri: string;
                verification_uri_complete: string;
                expires_in: number;
                interval: number;
            };

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
            res
                .status(500)
                .json({ error: 'Failed to initialize Qwen Device Authorization flow' });
        }
    });

    /**
     * POST /api/llm/qwen/oauth/poll - Poll Qwen OAuth token
     */
    router.post('/llm/qwen/oauth/poll', async (req: Request, res: Response) => {
        const { deviceCode } = req.body as { deviceCode?: string };

        if (!deviceCode) {
            return res.status(400).json({ error: 'Missing device_code' });
        }

        const deviceFlowState = qwenDeviceFlowStore.get(deviceCode);
        if (!deviceFlowState) {
            return res.status(400).json({ error: 'Device code not found or expired' });
        }

        const configuredClientId = readNonEmptyEnv('QWEN_OAUTH_CLIENT_ID');
        const clientId = configuredClientId ?? QWEN.DEFAULT_CLIENT_ID;

        try {
            const tokenResponse = await fetch(`${QWEN.BASE_URL}${QWEN.TOKEN_ENDPOINT}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: QWEN.GRANT_TYPE,
                    client_id: clientId,
                    device_code: deviceCode,
                    code_verifier: deviceFlowState.codeVerifier,
                }).toString(),
            });

            if (!tokenResponse.ok) {
                const errorData = (await tokenResponse
                    .json()
                    .catch(() => ({ error: 'unknown' }))) as { error?: string };

                if (errorData.error === 'authorization_pending') {
                    return res.json({ status: 'pending' });
                }

                if (errorData.error === 'slow_down') {
                    return res.json({
                        status: 'slow_down',
                        interval: deviceFlowState.interval + 5,
                    });
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

            const tokenData = (await tokenResponse.json()) as {
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

            qwenDeviceFlowStore.delete(deviceCode);

            logger.info('Qwen Device Authorization completed successfully');

            res.json({ status: 'success', accessToken });
        } catch (oauthErr) {
            logger.error('Failed to poll Qwen OAuth token', oauthErr);
            const message = oauthErr instanceof Error ? oauthErr.message : 'Qwen OAuth failed';
            res.status(500).json({ error: message });
        }
    });

    /**
     * POST /api/chat - Generate chat reply
     */
    router.post('/chat', async (req: Request, res: Response) => {
        try {
            const { prompt } = req.body as { prompt?: string };
            if (!prompt) {
                return res.status(400).json({ error: 'Missing prompt' });
            }

            const result = await generateReply(prompt);
            res.json(result);
        } catch (err) {
            logger.error('Failed to generate chat reply', err);
            res.status(500).json({ error: 'Failed to generate chat reply' });
        }
    });

    return router;
}

import crypto from 'crypto';
