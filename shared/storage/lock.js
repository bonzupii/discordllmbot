/**
 * Lock Module
 * 
 * Simple in-memory lock mechanism for coordinating database schema initialization.
 * Prevents race conditions during startup.
 * 
 * @module shared/storage/lock
 */

import { logger } from '../utils/logger.js';

let isLocked = false;
let resolveLock = null;
let lockPromise = null;

/**
 * Attempts to acquire the lock
 * @returns {boolean} True if lock acquired, false if already locked
 */
export function acquireLock() {
  if (isLocked) {
    logger.info('Lock: Failed to acquire (already locked)');
    return false;
  }
  isLocked = true;
  lockPromise = new Promise((resolve) => {
    resolveLock = resolve;
  });
  logger.info('Lock: Acquired');
  return true;
}

export function releaseLock() {
  if (resolveLock) {
    resolveLock();
    resolveLock = null;
  }
  isLocked = false;
  lockPromise = null;
  logger.info('Lock: Released');
}

export async function waitForLock() {
  if (lockPromise) {
    logger.info('Lock: Waiting...');
    await lockPromise;
    logger.info('Lock: Waited and proceeded');
  }
}
