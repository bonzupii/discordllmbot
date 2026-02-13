import { getBotConfig } from '../../../shared/config/configLoader.js';

/**
 * The bot's persona configuration, loaded from the config file.
 * @returns {Object} Current bot persona config
 */
export function getBotPersona() {
    return getBotConfig();
}
