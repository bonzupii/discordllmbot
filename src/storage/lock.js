let isLocked = false;
let lockPromise = null;

export function acquireLock() {
  if (isLocked) {
    return false;
  }
  isLocked = true;
  lockPromise = new Promise((resolve) => {
    releaseLock = () => {
      isLocked = false;
      lockPromise = null;
      resolve();
    };
  });
  return true;
}

export let releaseLock = () => {
  isLocked = false;
  lockPromise = null;
};

export async function waitForLock() {
  if (lockPromise) {
    await lockPromise;
  }
}
