const ADMIN_COOKIE_NAME = "bma_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();
    const expectedUsername = getAdminUsername(env);
    const expectedPassword = getAdminPassword(env);

    if (!expectedUsername || !expectedPassword) {
      return jsonResponse(
        { authenticated: false, error: "Admin login is not configured." },
        500
      );
    }

    if (username !== expectedUsername || password !== expectedPassword) {
      return jsonResponse(
        { authenticated: false, error: "Incorrect admin credentials." },
        401
      );
    }

    const sessionCookie = await createAdminSessionCookie({
      env,
      request,
      username,
    });

    return jsonResponse(
      { authenticated: true },
      200,
      {
        "set-cookie": sessionCookie,
      }
    );
  } catch {
    return jsonResponse(
      { authenticated: false, error: "Could not log in right now." },
      500
    );
  }
}

export async function onRequest({ request, env }) {
  if (request.method === "POST") {
    return onRequestPost({ request, env });
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
}

function getAdminUsername(env) {
  return String(env.ADMIN_USERNAME || env.VITE_ADMIN_USERNAME || "").trim();
}

function getAdminPassword(env) {
  return String(env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || "").trim();
}

function getSessionSecret(env) {
  return String(
    env.ADMIN_SESSION_SECRET ||
      env.ADMIN_PASSWORD ||
      env.VITE_ADMIN_PASSWORD ||
      ""
  ).trim();
}

async function createAdminSessionCookie({ env, request, username }) {
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000;
  const payload = base64UrlEncode(
    JSON.stringify({
      username,
      expiresAt,
    })
  );
  const signature = await signValue(payload, getSessionSecret(env));
  const secureFlag = new URL(request.url).protocol === "https:" ? "; Secure" : "";

  return [
    `${ADMIN_COOKIE_NAME}=${payload}.${signature}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ADMIN_SESSION_TTL_SECONDS}`,
    secureFlag.replace(/^; /, ""),
  ]
    .filter(Boolean)
    .join("; ");
}

async function signValue(value, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function base64UrlEncode(value) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      ...headers,
    },
  });
}
