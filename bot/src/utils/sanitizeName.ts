/**
 * Name Sanitizer Utility
 * 
 * Sanitizes strings for safe use as filenames or identifiers.
 * Removes invalid characters for file systems.
 * 
 * @module bot/src/utils/sanitizeName
 */

/**
 * Sanitizes a name by removing invalid filesystem characters.
 * 
 * @param name - The name to sanitize
 * @returns Sanitized string safe for use as filename
 */
export function sanitizeName(name: string | null | undefined): string {
    if (!name || typeof name !== 'string') {
        return 'unnamed';
    }

    const sanitized = name
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/^[\s.]+|[\s.]+$/g, '')
        .replace(/_+/g, '_')
        .substring(0, 200);

    if (!sanitized) {
        return 'unnamed';
    }

    return sanitized;
}
