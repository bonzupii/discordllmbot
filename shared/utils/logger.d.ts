/**
 * Logger Module Type Declarations
 */

export interface Logger {
    onLog(callback: (logEntry: LogEntry) => void): void;
    api(message: string, data?: unknown): void;
    sql(message: string, data?: unknown): void;
    message(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, error?: unknown): void;
}

export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    data?: unknown;
    formatted: string;
}

export const logger: Logger;
export function initializeLogger(maxLines?: number): void;
export function setMaxLogLines(maxLines: number): void;
