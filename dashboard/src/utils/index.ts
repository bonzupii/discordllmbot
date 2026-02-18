/**
 * Utility functions export
 * @module utils
 */

export { 
  isChannelIgnored, 
  formatUptime, 
  deepClone, 
  updateNestedProperty, 
  addToArrayProperty, 
  removeArrayItemByIndex, 
  updateArrayItemByIndex,
  formatDate,
  formatTime,
  getCurrentTimestamp,
  limitArray,
} from './helpers';
export { parseLogLine, getLogType, getLevelColor, getLogIcon } from './logParser';
export type { LogType, ParsedLog } from './logParser';
