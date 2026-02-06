import { logger } from '../utils/logger.js'
import { getApiConfig } from '../config/configLoader.js'

/**
 * Get Gemini API URL for the configured model
 */
function getGeminiUrl() {
    const { geminiModel } = getApiConfig()
    return `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`
}

/**
 * Custom error class for Gemini API errors
 */
export class GeminiAPIError extends Error {
    constructor(message, statusCode, retryable = false) {
        super(message)
        this.name = 'GeminiAPIError'
        this.statusCode = statusCode
        this.retryable = retryable
    }
}

/**
 * Check if an error is retryable (rate limit, timeout, server error)
 */
function isRetryable(error) {
    if (error instanceof GeminiAPIError) {
        return error.retryable
    }
    return error.message?.includes('timeout') || error.message?.includes('ECONNRESET')
}

/**
 * Exponential backoff retry logic
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise}
 */
async function retry(fn, maxRetries = 3) {
    let lastError

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn()
        } catch (err) {
            lastError = err

            if (!isRetryable(err)) {
                throw err
            }

            if (i < maxRetries - 1) {
                const backoffMs = Math.pow(2, i) * 1000 + Math.random() * 1000
                logger.warn(`Retrying Gemini API (attempt ${i + 2}/${maxRetries}) after ${backoffMs}ms`, err.message)
                await new Promise(r => setTimeout(r, backoffMs))
            }
        }
    }

    throw lastError
}

/**
 * Generate a reply from Gemini API with retry logic
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<string|null>} Reply text or null if no content
 */
export async function generateReply(prompt) {
    return retry(async () => {
        const url = getGeminiUrl()
        const { geminiModel } = getApiConfig()
        const apiKey = process.env.GEMINI_API_KEY
        
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not set in environment')
        }

        const promptPreview = prompt.substring(0, 150).replace(/\n/g, ' ')
        const promptLength = prompt.length
        
        logger.api(`→ Gemini API Request`)
        logger.api(`  Model: ${geminiModel}`)
        logger.api(`  Function: generateReply()`)
        logger.api(`  Prompt length: ${promptLength} chars`)
        logger.api(`  Preview: "${promptPreview}${promptLength > 150 ? '...' : ''}"`)
        
        const res = await fetch(
            `${url}?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: prompt }]
                        }
                    ]
                })
            }
        )

        if (!res.ok) {
            const errorText = await res.text()
            logger.error(`Gemini API error ${res.status}: ${errorText.substring(0, 200)}`)
            
            const isRetryable = res.status >= 500 || res.status === 429
            const error = new GeminiAPIError(
                `Gemini API error: ${res.status}`,
                res.status,
                isRetryable
            )
            throw error
        }

        const data = await res.json()
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
        
        if (reply) {
            const replyPreview = reply.substring(0, 150).replace(/\n/g, ' ')
            const replyLength = reply.length
            
            logger.api(`← Gemini API Response`)
            logger.api(`  Status: 200`)
            logger.api(`  Reply length: ${replyLength} chars`)
            logger.api(`  Preview: "${replyPreview}${replyLength > 150 ? '...' : ''}"`)
        }

        return reply
    })
}

