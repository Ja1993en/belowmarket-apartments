const STALE_DEPLOYMENT_RELOAD_KEY = "bmaStaleDeploymentReloaded";

const staleDeploymentErrorPatterns = [
  "Failed to fetch dynamically imported module",
  "Expected a JavaScript-or-Wasm module script",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Load failed",
];

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

export function registerStaleDeploymentRecovery() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", reloadOnceForFreshDeployment, true);
  window.addEventListener("unhandledrejection", reloadOnceForFreshDeployment);
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      sessionStorage.removeItem(STALE_DEPLOYMENT_RELOAD_KEY);
    }, 3000);
  });
}
