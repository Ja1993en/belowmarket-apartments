const STALE_DEPLOYMENT_RELOAD_KEY = "bmaStaleDeploymentReloadedV6";
const STALE_DEPLOYMENT_RELOAD_ATTEMPT_KEY = `${STALE_DEPLOYMENT_RELOAD_KEY}:attempts`;
const STALE_DEPLOYMENT_MAX_RELOAD_ATTEMPTS = 4;
const STALE_DEPLOYMENT_RELOAD_RETRY_DELAY_MS = 900;
const STALE_DEPLOYMENT_RELOAD_WINDOW_MS = 45000;

const staleDeploymentErrorPatterns = [
  "Failed to fetch dynamically imported module",
  "Expected a JavaScript-or-Wasm module script",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Load failed",
  "Failed to execute 'put' on 'Cache'",
  "Refused to apply style",
  "not a supported stylesheet MIME type",
  "MIME type",
];

const memoryFlags = new Set();

function getSessionFlag(key) {
  try {
    const storedValue = sessionStorage.getItem(key);
    const storedTime = Number(storedValue);

    return (
      memoryFlags.has(key) ||
      storedValue === "true" ||
      (Number.isFinite(storedTime) &&
        Date.now() - storedTime < STALE_DEPLOYMENT_RELOAD_WINDOW_MS)
    );
  } catch {
    return memoryFlags.has(key);
  }
}

function setSessionFlag(key) {
  memoryFlags.add(key);

  try {
    sessionStorage.setItem(key, String(Date.now()));
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

function getUrlReloadAttempt() {
  try {
    const urlAttempt = Number(new URL(window.location.href).searchParams.get("bma_retry"));

    return Number.isFinite(urlAttempt) ? urlAttempt : 0;
  } catch {
    return 0;
  }
}

function getReloadAttempts() {
  const urlAttempt = getUrlReloadAttempt();

  try {
    const storedAttempts = Number(sessionStorage.getItem(STALE_DEPLOYMENT_RELOAD_ATTEMPT_KEY));
    const safeStoredAttempts = Number.isFinite(storedAttempts) ? storedAttempts : 0;

    return Math.max(safeStoredAttempts, urlAttempt);
  } catch {
    return Math.max(memoryFlags.has(STALE_DEPLOYMENT_RELOAD_ATTEMPT_KEY) ? 1 : 0, urlAttempt);
  }
}

function setReloadAttempts(attemptCount) {
  if (attemptCount > 0) {
    memoryFlags.add(STALE_DEPLOYMENT_RELOAD_ATTEMPT_KEY);
  }

  try {
    sessionStorage.setItem(STALE_DEPLOYMENT_RELOAD_ATTEMPT_KEY, String(attemptCount));
  } catch {
    // Some iPhone Safari privacy modes block session storage.
  }
}

function clearReloadAttempts() {
  memoryFlags.delete(STALE_DEPLOYMENT_RELOAD_ATTEMPT_KEY);

  try {
    sessionStorage.removeItem(STALE_DEPLOYMENT_RELOAD_ATTEMPT_KEY);
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
    error.target?.href,
  ]
    .filter(Boolean)
    .join(" ");
}

function isBuiltAssetUrl(value) {
  if (!value) return false;

  const textValue = String(value);

  if (/\/assets\/[^\s"'<>]+\.(js|css)(\?|#|\s|$)/i.test(textValue)) {
    return true;
  }

  try {
    const parsedUrl = new URL(textValue, window.location.href);

    return (
      parsedUrl.origin === window.location.origin &&
      parsedUrl.pathname.startsWith("/assets/") &&
      /\.(js|css)$/i.test(parsedUrl.pathname)
    );
  } catch {
    return false;
  }
}

function isStaleDeploymentError(error) {
  const errorText = getErrorText(error);
  const failedSource = error?.target?.src || error?.target?.href || "";

  return (
    isBuiltAssetUrl(failedSource) ||
    isBuiltAssetUrl(errorText) ||
    staleDeploymentErrorPatterns.some((pattern) => errorText.includes(pattern))
  );
}

async function clearOldCaches() {
  try {
    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    }
  } catch {
    // Reload still fixes normal stale deployment cases if cache cleanup is blocked.
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
  } catch {
    // Ignore service worker cleanup failures and continue with the reload.
  }
}

function getFreshDeploymentUrl(nextReloadAttempt) {
  const freshUrl = new URL(window.location.href);

  freshUrl.searchParams.set("bma_cache_clear", "1");
  freshUrl.searchParams.set("bma_refresh", String(Date.now()));
  freshUrl.searchParams.set("bma_retry", String(nextReloadAttempt));

  return freshUrl.toString();
}

function cleanRefreshParams() {
  const currentUrl = new URL(window.location.href);

  if (!currentUrl.searchParams.has("bma_cache_clear")) return;

  currentUrl.searchParams.delete("bma_cache_clear");
  currentUrl.searchParams.delete("bma_refresh");
  currentUrl.searchParams.delete("bma_retry");
  window.history.replaceState(
    null,
    "",
    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
  );
}

async function reloadOnceForFreshDeployment(error) {
  if (!isStaleDeploymentError(error)) return;

  const currentReloadAttempts = getReloadAttempts();

  if (currentReloadAttempts >= STALE_DEPLOYMENT_MAX_RELOAD_ATTEMPTS) {
    return;
  }

  const nextReloadAttempt = currentReloadAttempts + 1;

  setReloadAttempts(nextReloadAttempt);
  setSessionFlag(STALE_DEPLOYMENT_RELOAD_KEY);
  await clearOldCaches();
  window.setTimeout(() => {
    window.location.replace(getFreshDeploymentUrl(nextReloadAttempt));
  }, currentReloadAttempts === 0 ? 0 : STALE_DEPLOYMENT_RELOAD_RETRY_DELAY_MS);
}

export function registerStaleDeploymentRecovery() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", reloadOnceForFreshDeployment, true);
  window.addEventListener("unhandledrejection", reloadOnceForFreshDeployment);
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      cleanRefreshParams();
      clearReloadAttempts();
      removeSessionFlag(STALE_DEPLOYMENT_RELOAD_KEY);
    }, 10000);
  });
}
