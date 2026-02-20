/**
 * Logger Module
 * 
 * Structured logging utility that logs to console AND file with timestamp and severity level.
 * Supports different log levels: api, sql, message, info, warn, error.
 * 
 * @module shared/utils/logger
 * @example
 * import { logger } from './shared/utils/logger.js';
 * 
 * logger.info('Server started', { port: 3000 });
 * logger.error('Failed to connect', { error: err.message });
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { EventEmitter } from 'events'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_FILE = path.join(__dirname, '../../logs/discordllmbot.log')

const logEmitter = new EventEmitter()

/**
 * Log levels available
 * @typedef {Object} LOG_LEVELS
 * @property {string} api - External API calls
 * @property {string} sql - Database queries
 * @property {string} message - Discord message events
 * @property {string} info - General information
 * @property {string} warn - Warnings
 * @property {string} error - Errors
 */
const LOG_LEVELS = {
    api: 'API',
    sql: 'SQL',
    message: 'MESSAGE',
    info: 'INFO',
    warn: 'WARN',
    error: 'ERROR'
}

let MAX_LOG_LINES = 1000

function timestamp() {
    const now = new Date()
    return now.toISOString()
}

function format(level, message, data = null) {
    const time = timestamp()
    const prefix = `[${time}] [${level}]`
    return `${prefix} ${message}`
}

function writeToFile(message) {
    try {
        fs.appendFileSync(LOG_FILE, message + '\n', 'utf-8')
    } catch (err) {
        // Silently fail if we can't write to file
        console.warn('Failed to write to log file:', err.message)
    }
}

function emitLog(level, message, data = null) {
    const formatted = format(level, message)
    const logEntry = {
        timestamp: timestamp(),
        level,
        message,
        data,
        formatted
    }
    logEmitter.emit('log', logEntry)
    return formatted
}

/**
 * Structured logger utility.
 * Logs messages to the console and to a file (`discordllmbot.log`).
 * Supports different log levels: API, MESSAGE, INFO, WARN, ERROR.
 */
export const logger = {
    /**
     * Subscribe to log events.
     * @param {Function} callback - Function to call on each log.
     */
    onLog(callback) {
        logEmitter.on('log', callback)
    },

    /**
     * Logs an API-related event.
     * @param {string} message - The log message.
     * @param {Object} [data=null] - Optional data to log.
     */
    api(message, data = null) {
        const formatted = emitLog(LOG_LEVELS.api, message, data)
        if (data) {
            console.log(formatted, data)
            writeToFile(formatted + ' ' + JSON.stringify(data))
        } else {
            console.log(formatted)
            writeToFile(formatted)
        }
    },

    /**
     * Logs an SQL query event.
     * @param {string} message - The log message.
     * @param {Object} [data=null] - Optional data to log.
     */
    sql(message, data = null) {
        const formatted = emitLog(LOG_LEVELS.sql, message, data)
        if (data) {
            console.log(formatted, data)
            const jsonStr = JSON.stringify(data).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            writeToFile(formatted + ' ' + jsonStr)
        } else {
            console.log(formatted)
            writeToFile(formatted)
        }
    },

    /**
     * Logs a message-related event (e.g., received message, reply sent).
     * @param {string} message - The log message.
     * @param {Object} [data=null] - Optional data to log.
     */
    message(message, data = null) {
        const formatted = emitLog(LOG_LEVELS.message, message, data)
        if (data) {
            console.log(formatted, data)
            writeToFile(formatted + ' ' + JSON.stringify(data))
        } else {
            console.log(formatted)
            writeToFile(formatted)
        }
    },

    /**
     * Logs a general informational message.
     * @param {string} message - The log message.
     * @param {Object} [data=null] - Optional data to log.
     */
    info(message, data = null) {
        const formatted = emitLog(LOG_LEVELS.info, message, data)
        if (data) {
            console.log(formatted, data)
            writeToFile(formatted + ' ' + JSON.stringify(data))
        } else {
            console.log(formatted)
            writeToFile(formatted)
        }
    },

    /**
     * Logs a warning message.
     * @param {string} message - The log message.
     * @param {Object} [data=null] - Optional data to log.
     */
    warn(message, data = null) {
        const formatted = emitLog(LOG_LEVELS.warn, message, data)
        if (data) {
            console.warn(formatted, data)
            writeToFile(formatted + ' ' + JSON.stringify(data))
        } else {
            console.warn(formatted)
            writeToFile(formatted)
        }
    },

    /**
     * Logs an error message.
     * @param {string} message - The log message.
     * @param {Error|Object} [error=null] - The error object or data to log.
     */
    error(message, error = null) {
        const formatted = emitLog(LOG_LEVELS.error, message, error)
        if (error) {
            console.error(formatted, error)
            const errorData = error && error.stack 
                ? { error: error.message, stack: error.stack }
                : { error: error.message ?? error };
            writeToFile(formatted + ' ' + JSON.stringify(errorData))
        } else {
            console.error(formatted)
            writeToFile(formatted)
        }
    }
}

/**
 * Initialize logger - truncates/creates log file
 * Call this at app startup
 */
export function initializeLogger(maxLines) {
    const start = Date.now();
    if (typeof maxLines === 'number' && maxLines > 0) {
        MAX_LOG_LINES = Math.floor(maxLines)
    }

    const logDir = path.dirname(LOG_FILE)
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
    }

    try {
        // Truncate log file to the last MAX_LOG_LINES lines instead of wiping
        if (fs.existsSync(LOG_FILE)) {
            try {
                const content = fs.readFileSync(LOG_FILE, 'utf-8')
                const lines = content.split(/\r?\n/)
                const _start = Math.max(0, lines.length - MAX_LOG_LINES)
                const truncated = lines.slice(_start).join('\n')
                fs.writeFileSync(LOG_FILE, truncated + (truncated.endsWith('\n') ? '' : '\n'), 'utf-8')
            } catch (e) {
                // If truncation fails, fall back to creating/overwriting the file
                try { fs.writeFileSync(LOG_FILE, '', 'utf-8') } catch (_) {}
            }
        } else {
            // Create empty log file
            fs.writeFileSync(LOG_FILE, '', 'utf-8')
        }

        logger.info(`Logger initialized (${Date.now() - start}ms)`)
    } catch (err) {
        console.error('Failed to initialize log file:', err)
    }
}
