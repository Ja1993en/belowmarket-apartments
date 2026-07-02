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

  if (sessionStorage.getItem(STALE_DEPLOYMENT_RELOAD_KEY) === "true") {
    return;
  }

  sessionStorage.setItem(STALE_DEPLOYMENT_RELOAD_KEY, "true");
  window.location.reload();
}

function cleanupLegacyBrowserCaches() {
  if (sessionStorage.getItem(CACHE_CLEANUP_KEY) === "true") {
    return;
  }

  sessionStorage.setItem(CACHE_CLEANUP_KEY, "true");

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
      sessionStorage.removeItem(STALE_DEPLOYMENT_RELOAD_KEY);
    }, 3000);
  });
}
