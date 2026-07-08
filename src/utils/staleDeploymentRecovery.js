const STALE_DEPLOYMENT_RELOAD_KEY = "bmaStaleDeploymentReloadedV2";
const STALE_DEPLOYMENT_RELOAD_WINDOW_MS = 15000;

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

function isStaleDeploymentError(error) {
  const errorText = getErrorText(error);
  const failedSource = error?.target?.src || error?.target?.href || "";

  return (
    failedSource.includes("/assets/") ||
    staleDeploymentErrorPatterns.some((pattern) => errorText.includes(pattern))
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

export function registerStaleDeploymentRecovery() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", reloadOnceForFreshDeployment, true);
  window.addEventListener("unhandledrejection", reloadOnceForFreshDeployment);
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      removeSessionFlag(STALE_DEPLOYMENT_RELOAD_KEY);
    }, 3000);
  });
}
