/**
 * Parse a log line into structured data
 * @param {string} line - The log line to parse
 * @returns {Object} - Parsed log object with timestamp, level, text, and json properties
 */
export const parseLogLine = (line) => {
  try {
    // Extract timestamp and level
    const timestampMatch = line.match(
      /\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/,
    );
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
          level: levelMatch ? levelMatch[1] : 'OTHER',
          text: textPart,
          json: jsonObject,
        };
      } catch {
        // If JSON parsing fails, return the whole line as text
        return {
          timestamp: timestampMatch ? timestampMatch[1] : null,
          level: levelMatch ? levelMatch[1] : 'OTHER',
          text: line,
          json: null,
        };
      }
    } else {
      // If no JSON object found, return the whole line as text
      return {
        timestamp: timestampMatch ? timestampMatch[1] : null,
        level: levelMatch ? levelMatch[1] : 'OTHER',
        text: line,
        json: null,
      };
    }
  } catch {
    return {
      timestamp: null,
      level: 'OTHER',
      text: line,
      json: null,
    };
  }
};

/**
 * Get the log type from a log line
 * @param {string} line - The log line
 * @returns {string} - The log type
 */
export const getLogType = (line) => {
  if (line.includes('[ERROR]')) return 'ERROR';
  if (line.includes('[WARN]')) return 'WARN';
  if (line.includes('[API]')) return 'API';
  if (line.includes('[INFO]')) return 'INFO';
  if (line.includes('[MESSAGE]')) return 'MESSAGE';
  return 'OTHER';
};

/**
 * Get the color for a log level
 * @param {string} type - The log type
 * @returns {string} - MUI color value
 */
export const getLevelColor = (type) => {
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
 * Get the icon for a log level
 * @param {string} type - The log type
 * @returns {React.ReactNode} - The icon component
 */
export const getLogIcon = (type) => {
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
