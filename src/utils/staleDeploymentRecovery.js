const STALE_DEPLOYMENT_RELOAD_KEY = "bmaStaleDeploymentReloaded";

const staleDeploymentErrorPatterns = [
  "Failed to fetch dynamically imported module",
  "Expected a JavaScript-or-Wasm module script",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Load failed",
  "Failed to execute 'put' on 'Cache'",
];

const CACHE_CLEANUP_KEY = "bmaBrowserCacheCleaned";
const memoryFlags = new Set();

function getSessionFlag(key) {
  try {
    return sessionStorage.getItem(key) === "true" || memoryFlags.has(key);
  } catch {
    return memoryFlags.has(key);
  }
}

function setSessionFlag(key) {
  memoryFlags.add(key);

  try {
    sessionStorage.setItem(key, "true");
  } catch {
    // Some iPhone Safari privacy modes block session storage.
  }
}

function removeSessionFlag(key) {
  memoryFlags.delete(key);

  try {
    sessionStorage.removeItem(key);
  } catch {
    // Some iPhone Safari privacy modes block session storage.
  }
}

function getErrorText(error) {
  if (!error) return "";

  return [
    error.message,
    error.reason?.message,
    error.reason,
    error.filename,
    error.target?.src,
  ]
    .filter(Boolean)
    .join(" ");
}

function isStaleDeploymentError(error) {
  const errorText = getErrorText(error);

  return staleDeploymentErrorPatterns.some((pattern) =>
    errorText.includes(pattern)
  );
}

function reloadOnceForFreshDeployment(error) {
  if (!isStaleDeploymentError(error)) return;

  if (getSessionFlag(STALE_DEPLOYMENT_RELOAD_KEY)) {
    return;
  }

  setSessionFlag(STALE_DEPLOYMENT_RELOAD_KEY);
  window.location.reload();
}

function cleanupLegacyBrowserCaches() {
  if (getSessionFlag(CACHE_CLEANUP_KEY)) {
    return;
  }

  setSessionFlag(CACHE_CLEANUP_KEY);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister()))
      )
      .catch((error) => {
        console.warn("Could not unregister legacy service workers.", error);
      });
  }

  if ("caches" in window) {
    window.caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)))
      )
      .catch((error) => {
        console.warn("Could not clear legacy browser caches.", error);
      });
  }
}

export function registerStaleDeploymentRecovery() {
  if (typeof window === "undefined") return;

  cleanupLegacyBrowserCaches();

  window.addEventListener("error", reloadOnceForFreshDeployment, true);
  window.addEventListener("unhandledrejection", reloadOnceForFreshDeployment);
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      removeSessionFlag(STALE_DEPLOYMENT_RELOAD_KEY);
    }, 3000);
  });
}
