/**
 * Events Index
 * 
 * Central export for all Discord event handlers.
 * 
 * @module bot/src/events
 */

import { handleClientReady } from './clientReady.js';
import { handleMessageCreate } from './messageCreate.js';
import { handleGuildCreate } from './guildCreate.js';
import { handleGuildMemberAdd } from './guildMemberAdd.js';

export {
    handleClientReady,
    handleMessageCreate,
    handleGuildCreate,
    handleGuildMemberAdd
};
