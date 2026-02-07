import { logger } from '../utils/logger.js'; // Import logger

let isLocked = false;
let resolveLock = null;
let lockPromise = null;

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
