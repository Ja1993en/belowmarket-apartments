const ADMIN_ACCESS_KEY = "belowMarketAdminAccess";

export function hasAdminAccess() {
  return sessionStorage.getItem(ADMIN_ACCESS_KEY) === "true";
}

export function loginAdmin(username, password) {
  const adminUsername = import.meta.env.VITE_ADMIN_USERNAME;
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  if (
    adminUsername &&
    adminPassword &&
    username === adminUsername &&
    password === adminPassword
  ) {
    sessionStorage.setItem(ADMIN_ACCESS_KEY, "true");
    return true;
  }

  return false;
}

export function logoutAdmin() {
  sessionStorage.removeItem(ADMIN_ACCESS_KEY);
}
