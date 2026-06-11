export async function onRequestPost({ request, env }) {
  try {
    const authError = validateSmsAccess(request, env);
    if (authError) return jsonResponse({ error: authError }, 401);

    const configError = validateTwilioConfig(env);
    if (configError) return jsonResponse({ error: configError }, 500);

    const payload = await request.json();
    const to = normalizePhone(payload.to);
    const body = String(payload.body || "").trim();

    if (!to) {
      return jsonResponse({ error: "Add a renter phone number before sending." }, 400);
    }

    if (!body) {
      return jsonResponse({ error: "Add a message before sending." }, 400);
    }

    const twilioResponse = await sendTwilioMessage({ env, to, body });
    const twilioBody = await twilioResponse.json();

    if (!twilioResponse.ok) {
      return jsonResponse(
        {
          error:
            twilioBody.message ||
            "Twilio could not send this message. Check your trial number and verified recipient.",
        },
        twilioResponse.status
      );
    }

    return jsonResponse({
      sid: twilioBody.sid,
      status: twilioBody.status,
      to: twilioBody.to,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error?.message || "Could not send this SMS. Please try again.",
      },
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

function validateSmsAccess(request, env) {
  const expectedPin = String(env.SMS_SEND_PIN || "").trim();

  if (!expectedPin) {
    return "SMS sending is not configured yet. Add SMS_SEND_PIN in Cloudflare.";
  }

  const providedPin = String(request.headers.get("x-bma-sms-pin") || "").trim();

  if (providedPin !== expectedPin) {
    return "Enter the correct SMS send PIN.";
  }

  return "";
}

function validateTwilioConfig(env) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return "Twilio credentials are missing in Cloudflare.";
  }

  if (!env.TWILIO_MESSAGING_SERVICE_SID && !env.TWILIO_FROM_PHONE_NUMBER) {
    return "Add TWILIO_FROM_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID in Cloudflare.";
  }

  return "";
}

async function sendTwilioMessage({ env, to, body }) {
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
    env.TWILIO_ACCOUNT_SID
  )}/Messages.json`;
  const formData = new URLSearchParams();

  formData.set("To", to);
  formData.set("Body", body);

  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    formData.set("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    formData.set("From", normalizePhone(env.TWILIO_FROM_PHONE_NUMBER));
  }

  return fetch(twilioUrl, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(
        `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
      )}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });
}

function normalizePhone(value) {
  const phone = String(value || "").replace(/[^\d+]/g, "");

  if (!phone) return "";
  if (phone.startsWith("+")) return phone;
  if (phone.length === 10) return `+1${phone}`;

  return phone;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
    },
  });
}
