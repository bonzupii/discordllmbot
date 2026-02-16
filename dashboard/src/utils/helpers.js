/**
 * Check if a channel is ignored based on the configuration
 * @param {Object} config - The configuration object
 * @param {string} guildId - The guild/server ID
 * @param {string} channelId - The channel ID
 * @returns {boolean} - True if the channel is ignored
 */
export const isChannelIgnored = (config, guildId, channelId) => {
  if (!config) return false;

  const { ignoreChannels = [], guildSpecificChannels = {} } =
    config?.replyBehavior || {};

  // Check global ignore list
  if (ignoreChannels.includes(channelId)) {
    return true;
  }

  // Check guild-specific settings
  const guildChannels = guildSpecificChannels[guildId];
  if (guildChannels) {
    // If allowed channels are specified, only those are monitored
    if (
      Array.isArray(guildChannels.allowed) &&
      guildChannels.allowed.length > 0
    ) {
      return !guildChannels.allowed.includes(channelId);
    }

    // Otherwise check if this channel is specifically ignored
    if (
      Array.isArray(guildChannels.ignored) &&
      guildChannels.ignored.length > 0
    ) {
      return guildChannels.ignored.includes(channelId);
    }
  }

  return false;
};

/**
 * Format uptime from seconds to human readable string
 * @param {number} seconds - Uptime in seconds
 * @returns {string} - Formatted uptime string
 */
export const formatUptime = (seconds) => {
  if (!seconds) return 'N/A';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Update a nested property in an object
 * @param {Object} obj - The object to update
 * @param {string} path - Dot-separated path to the property
 * @param {*} value - The new value
 * @returns {Object} - New object with updated property
 */
export const updateNestedProperty = (obj, path, value) => {
  const newConfig = deepClone(obj);
  let current = newConfig;
  const keys = path.split('.');
  const lastKey = keys.pop();

  for (const key of keys) {
    current[key] = { ...current[key] };
    current = current[key];
  }
  current[lastKey] = value;

  return newConfig;
};

/**
 * Add an item to a nested array property
 * @param {Object} obj - The object to update
 * @param {string} path - Dot-separated path to the array
 * @param {*} item - Item to add
 * @returns {Object} - New object with added item
 */
export const addToArrayProperty = (obj, path, item = '') => {
  const newConfig = deepClone(obj);
  let current = newConfig;
  const keys = path.split('.');
  const lastKey = keys.pop();
  
  for (const key of keys) current = current[key];

  if (current[lastKey].length > 0 && current[lastKey][current[lastKey].length - 1] === '') {
    return newConfig;
  }
  
  current[lastKey] = [...current[lastKey], item];
  return newConfig;
};

/**
 * Remove an item from a nested array property by index
 * @param {Object} obj - The object to update
 * @param {string} path - Dot-separated path to the array
 * @param {number} index - Index to remove
 * @returns {Object} - New object with removed item
 */
export const removeArrayItemByIndex = (obj, path, index) => {
  const newConfig = deepClone(obj);
  let current = newConfig;
  const keys = path.split('.');
  const lastKey = keys.pop();
  
  for (const key of keys) current = current[key];

  current[lastKey].splice(index, 1);
  return newConfig;
};

/**
 * Update an item in a nested array property by index
 * @param {Object} obj - The object to update
 * @param {string} path - Dot-separated path to the array
 * @param {number} index - Index to update
 * @param {*} value - New value
 * @returns {Object} - New object with updated item
 */
export const updateArrayItemByIndex = (obj, path, index, value) => {
  const newConfig = deepClone(obj);
  let current = newConfig;
  const keys = path.split('.');
  const lastKey = keys.pop();
  
  for (const key of keys) current = current[key];

  const newArray = [...current[lastKey]];
  newArray[index] = value;
  current[lastKey] = newArray;

  return newConfig;
};
