export async function hasAdminAccess() {
  try {
    const response = await fetch("/api/admin-session", {
      credentials: "include",
    });

    if (!response.ok) return false;

    const body = await response.json();
    return Boolean(body.authenticated);
  } catch {
    return false;
  }
}

export async function loginAdmin(username, password) {
  try {
    const response = await fetch("/api/admin-login", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
    const body = await response.json().catch(() => ({}));

    return {
      ok: response.ok && Boolean(body.authenticated),
      error: body.error || "Incorrect admin credentials.",
    };
  } catch {
    return {
      ok: false,
      error: "Could not reach the admin login service.",
    };
  }
}

export async function logoutAdmin() {
  await fetch("/api/admin-logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}
