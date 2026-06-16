const ADMIN_COOKIE_NAME = "bma_admin_session";

export async function onRequestPost() {
  return jsonResponse(
    { authenticated: false },
    200,
    {
      "set-cookie": [
        `${ADMIN_COOKIE_NAME}=`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=0",
      ].join("; "),
    }
  );
}

export async function onRequest({ request }) {
  if (request.method === "POST") {
    return onRequestPost();
  }

  return jsonResponse({ error: "Method not allowed." }, 405);
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
