/**
 * Environment Validation Module
 * 
 * Validates that required environment variables are set before starting the bot.
 * 
 * @module shared/config/validation
 */

import { logger } from '../utils/logger.js'

const REQUIRED_ENV_VARS = [
    'DISCORD_TOKEN'
]

/**
 * Validates that all required environment variables are set
 * @throws {Error} If any required env vars are missing
 */
export function validateEnvironment() {
    const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName])

    if (missing.length > 0) {
        const message = `Missing required environment variables: ${missing.join(', ')}`
        logger.error(message)
        throw new Error(message)
    }

    logger.info('✓ Environment validation passed')
}
