/**
 * Log entry object emitted when subscribing to logs
 */
export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data: any;
  formatted: string;
}

/**
 * Structured logger utility.
 * Logs messages to the console and to a file (`discordllmbot.log`).
 * Supports different log levels: API, MESSAGE, INFO, WARN, ERROR.
 */
export interface Logger {
  /**
   * Subscribe to log events.
   * @param callback - Function to call on each log.
   */
  onLog(callback: (entry: LogEntry) => void): void;

  /**
   * Logs an API-related event.
   * @param message - The log message.
   * @param data - Optional data to log.
   */
  api(message: string, data?: any): void;

  /**
   * Logs an SQL query event.
   * @param message - The log message.
   * @param data - Optional data to log.
   */
  sql(message: string, data?: any): void;

  /**
   * Logs a message-related event (e.g., received message, reply sent).
   * @param message - The log message.
   * @param data - Optional data to log.
   */
  message(message: string, data?: any): void;

  /**
   * Logs a general informational message.
   * @param message - The log message.
   * @param data - Optional data to log.
   */
  info(message: string, data?: any): void;

  /**
   * Logs a warning message.
   * @param message - The log message.
   * @param data - Optional data to log.
   */
  warn(message: string, data?: any): void;

  /**
   * Logs an error message.
   * @param message - The log message.
   * @param error - The error object or data to log.
   */
  error(message: string, error?: any): void;
}

/**
 * Initialize logger - truncates/creates log file.
 * Call this at app startup.
 * @param maxLines - Maximum number of lines to keep in log file.
 */
export function initializeLogger(maxLines?: number): void;

/**
 * The logger instance.
 */
export const logger: Logger;
