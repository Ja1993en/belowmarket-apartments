const ADMIN_COOKIE_NAME = "bma_admin_session";

export async function onRequestGet({ request, env }) {
  const authenticated = await verifyAdminSession(request, env);

  return jsonResponse({ authenticated });
}

export async function onRequest({ request, env }) {
  if (request.method === "GET") {
    return onRequestGet({ request, env });
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
}

async function verifyAdminSession(request, env) {
  const cookieValue = getCookie(request, ADMIN_COOKIE_NAME);
  const [payload, signature] = cookieValue.split(".");

  if (!payload || !signature) return false;

  const expectedSignature = await signValue(payload, getSessionSecret(env));
  if (signature !== expectedSignature) return false;

  const session = parseSessionPayload(payload);
  if (!session?.expiresAt || Date.now() > session.expiresAt) return false;

  return true;
}

function parseSessionPayload(payload) {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const matchingCookie = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return matchingCookie ? matchingCookie.slice(name.length + 1) : "";
}

function getSessionSecret(env) {
  return String(
    env.ADMIN_SESSION_SECRET ||
      env.ADMIN_PASSWORD ||
      env.VITE_ADMIN_PASSWORD ||
      ""
  ).trim();
}

async function signValue(value, secret) {
  if (!secret) return "";

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

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function base64UrlEncodeBytes(bytes) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
    },
  });
}
