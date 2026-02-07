/**
 * Simple structured logging utility
 * Logs to console AND to file with timestamp and severity level
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { EventEmitter } from 'events'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_FILE = path.join(__dirname, '../../discordllmbot.log')

const logEmitter = new EventEmitter()

const LOG_LEVELS = {
    api: 'API',
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
            writeToFile(formatted + ' ' + (error && error.stack ? error.stack : JSON.stringify(error)))
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
    if (typeof maxLines === 'number' && maxLines > 0) {
        MAX_LOG_LINES = Math.floor(maxLines)
    }

    try {
        // Truncate log file to the last MAX_LOG_LINES lines instead of wiping
        if (fs.existsSync(LOG_FILE)) {
            try {
                const content = fs.readFileSync(LOG_FILE, 'utf-8')
                const lines = content.split(/\r?\n/)
                const start = Math.max(0, lines.length - MAX_LOG_LINES)
                const truncated = lines.slice(start).join('\n')
                fs.writeFileSync(LOG_FILE, truncated + (truncated.endsWith('\n') ? '' : '\n'), 'utf-8')
            } catch (e) {
                // If truncation fails, fall back to creating/overwriting the file
                try { fs.writeFileSync(LOG_FILE, '', 'utf-8') } catch (_) {}
            }
        } else {
            // Create empty log file
            fs.writeFileSync(LOG_FILE, '', 'utf-8')
        }

        logger.info('Logger initialized')
    } catch (err) {
        console.error('Failed to initialize log file:', err)
    }
}
