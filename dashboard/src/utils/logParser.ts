/**
 * Log Parsing Utilities
 * Parses bot log output into structured data for display
 * @module utils/logParser
 */

import type { LogType as LogTypeType, ParsedLog as ParsedLogType } from '@types';

export type LogType = LogTypeType;
export type ParsedLog = ParsedLogType;

/**
 * Parse a raw log line into structured data
 * Extracts timestamp, log level, text, and optional JSON object
 * @param line - Raw log line from bot
 * @returns Parsed log entry with level, timestamp, text, and json
 */
export const parseLogLine = (line: string): ParsedLog => {
  try {
    // Extract timestamp and level
    const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
    const levelMatch = line.match(/\[([A-Z]+)\]/);

    // Find JSON object at the end of the line using a balanced bracket approach
    let braceCount = 0;
    let jsonStartIndex = -1;

    // Search backwards from the end to find the opening brace that balances the closing brace at the end
    for (let i = line.length - 1; i >= 0; i--) {
      if (line[i] === '}') {
        braceCount++;
      } else if (line[i] === '{') {
        braceCount--;
        if (braceCount === 0) {
          jsonStartIndex = i;
          break;
        }
      }
    }

    if (jsonStartIndex !== -1) {
      const textPart = line.substring(0, jsonStartIndex).trim();
      const jsonPart = line.substring(jsonStartIndex);

      try {
        const jsonObject = JSON.parse(jsonPart);
        return {
          timestamp: timestampMatch ? timestampMatch[1] : null,
          level: (levelMatch ? levelMatch[1] : 'OTHER') as LogType,
          text: textPart,
          json: jsonObject,
        };
      } catch {
        // If JSON parsing fails, return the whole line as text
        return {
          timestamp: timestampMatch ? timestampMatch[1] : null,
          level: (levelMatch ? levelMatch[1] : 'OTHER') as LogType,
          text: line,
          json: null,
        };
      }
    } else {
      // If no JSON object found, return the whole line as text
      return {
        timestamp: timestampMatch ? timestampMatch[1] : null,
        level: (levelMatch ? levelMatch[1] : 'OTHER') as LogType,
        text: line,
        json: null,
      };
    }
  } catch {
    return {
      timestamp: null,
      level: 'OTHER' as LogType,
      text: line,
      json: null,
    };
  }
};

/**
 * Determine log level from raw log line text
 * Uses simple string matching to find level indicators
 * @param line - Raw log line
 * @returns Log level type
 */
export const getLogType = (line: string): LogType => {
  if (line.includes('[ERROR]')) return 'ERROR';
  if (line.includes('[WARN]')) return 'WARN';
  if (line.includes('[API]')) return 'API';
  if (line.includes('[INFO]')) return 'INFO';
  if (line.includes('[MESSAGE]')) return 'MESSAGE';
  return 'OTHER';
};

/**
 * Get MUI color for a log level
 * Used for colored log output in the UI
 * @param type - Log level
 * @returns MUI theme color string
 */
export const getLevelColor = (type: LogType): string => {
  switch (type) {
    case 'ERROR':
      return 'error.main';
    case 'WARN':
      return 'warning.main';
    case 'API':
      return 'info.main';
    case 'INFO':
      return 'success.main';
    case 'MESSAGE':
      return 'text.primary';
    default:
      return 'text.secondary';
  }
};

/**
 * Get icon name for a log level
 * Returns MUI icon component names for display
 * @param type - Log level
 * @returns Icon component name
 */
export const getLogIcon = (type: LogType): string => {
  switch (type) {
    case 'ERROR':
      return 'ErrorIcon';
    case 'WARN':
      return 'WarningIcon';
    case 'API':
      return 'ApiIcon';
    case 'INFO':
      return 'InfoIcon';
    case 'MESSAGE':
      return 'ChatIcon';
    default:
      return 'VisibilityIcon';
  }
};
