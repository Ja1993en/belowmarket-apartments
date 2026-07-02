export async function onRequestPost({ request, env }) {
  try {
    const authError = validateEmailAccess(request, env);
    if (authError) return jsonResponse({ error: authError }, 401);

    const configError = validateEmailConfig(env);
    if (configError) return jsonResponse({ error: configError }, 500);

    const payload = await request.json();
    const to = cleanText(payload.to);
    const subject =
      cleanText(payload.subject) || "Your Below Market Apartments recommendations";
    const recommendationUrl = cleanText(payload.recommendationUrl);

    if (!to) {
      return jsonResponse({ error: "Add a renter email before sending." }, 400);
    }

    if (!recommendationUrl) {
      return jsonResponse({ error: "Save recommendations before sending email." }, 400);
    }

    const fromEmail =
      env.RESEND_FROM_EMAIL ||
      "Below Market Apartments <onboarding@resend.dev>";
    const replyTo =
      env.LEAD_REPLY_TO ||
      env.LEAD_NOTIFICATION_TO ||
      "jalen.l.mcneal@belowmarketapartments.com";

    const emailResult = await sendResendEmail(env, {
      from: fromEmail,
      to,
      reply_to: replyTo,
      subject,
      html: buildRecommendationEmailHtml(payload),
      text: buildRecommendationEmailText(payload),
    });

    if (!emailResult.ok) {
      return jsonResponse(
        {
          error:
            emailResult.body?.message ||
            "Resend could not send the recommendation email.",
        },
        emailResult.status
      );
    }

    return jsonResponse({
      id: emailResult.body.id,
      to,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error?.message || "Could not send the recommendation email.",
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

function validateEmailAccess(request, env) {
  const expectedPin = String(
    env.RECOMMENDATION_SEND_PIN || env.SMS_SEND_PIN || ""
  ).trim();

  if (!expectedPin) {
    return "Recommendation sending is not configured yet. Add RECOMMENDATION_SEND_PIN or SMS_SEND_PIN in Cloudflare.";
  }

  const providedPin = String(request.headers.get("x-bma-send-pin") || "").trim();

  if (providedPin !== expectedPin) {
    return "Enter the correct recommendation send PIN.";
  }

  return "";
}

function validateEmailConfig(env) {
  if (!env.RESEND_API_KEY) {
    return "Resend is not configured yet. Add RESEND_API_KEY in Cloudflare.";
  }

  return "";
}

async function sendResendEmail(env, email) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(email),
  });
  const body = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function buildRecommendationEmailHtml(payload) {
  const leadName = cleanText(payload.leadName) || "there";
  const recommendationUrl = cleanText(payload.recommendationUrl);
  const message = cleanText(payload.message);
  const properties = Array.isArray(payload.properties) ? payload.properties : [];
  const floorPlans = Array.isArray(payload.floorPlanItems)
    ? payload.floorPlanItems
    : [];

  return `
    <div style="font-family: Arial, sans-serif; color: #102426; line-height: 1.6;">
      <h1 style="margin: 0 0 12px; font-size: 24px;">Your apartment recommendations are ready</h1>
      <p style="margin: 0 0 16px;">Hi ${escapeHtml(leadName)},</p>
      <p style="margin: 0 0 16px;">
        ${escapeHtml(message) ||
          "I put together apartment options based on your search. You can compare the selected properties, specials, pricing, and tour options using the link below."}
      </p>
      <p style="margin: 0 0 22px;">
        <a href="${escapeHtml(recommendationUrl)}" style="display: inline-block; background: #173f3f; color: #ffffff; padding: 13px 18px; border-radius: 14px; text-decoration: none; font-weight: 700;">
          View recommendations
        </a>
      </p>
      ${properties.length > 0 ? buildPropertyListHtml(properties) : ""}
      ${floorPlans.length > 0 ? buildFloorPlanListHtml(floorPlans) : ""}
      <p style="margin: 22px 0 0; color: #526260;">
        Reply to this email with the options you like, and I can help confirm pricing, availability, and tour times.
      </p>
      <p style="margin: 14px 0 0;">Below Market Apartments</p>
    </div>
  `;
}

function buildPropertyListHtml(properties) {
  return `
    <div style="margin: 20px 0; padding: 16px; background: #f5f8f1; border: 1px solid #d7e6df; border-radius: 14px;">
      <p style="margin: 0 0 10px; font-weight: 700;">Selected properties</p>
      ${properties
        .map(
          (property) => `
            <p style="margin: 8px 0;">
              <strong>${escapeHtml(property.name)}</strong>
              ${cleanText(property.area) ? ` - ${escapeHtml(property.area)}` : ""}
              ${cleanText(property.special) ? `<br><span style="color: #8a5b0a;">${escapeHtml(property.special)}</span>` : ""}
            </p>
          `
        )
        .join("")}
    </div>
  `;
}

function buildFloorPlanListHtml(floorPlans) {
  return `
    <div style="margin: 20px 0; padding: 16px; background: #fff8e6; border: 1px solid #f2d08a; border-radius: 14px;">
      <p style="margin: 0 0 10px; font-weight: 700;">Exact floor plans attached</p>
      ${floorPlans
        .map(
          (item) => `
            <p style="margin: 8px 0;">
              <strong>${escapeHtml(item.floorPlanName)}</strong>
              ${cleanText(item.propertyName) ? ` at ${escapeHtml(item.propertyName)}` : ""}
              ${cleanText(item.effectiveRent || item.rent) ? `<br>${escapeHtml(item.effectiveRent || item.rent)}` : ""}
            </p>
          `
        )
        .join("")}
    </div>
  `;
}

function buildRecommendationEmailText(payload) {
  const leadName = cleanText(payload.leadName) || "there";
  const recommendationUrl = cleanText(payload.recommendationUrl);
  const message =
    cleanText(payload.message) ||
    "I put together apartment options based on your search.";
  const properties = Array.isArray(payload.properties) ? payload.properties : [];
  const floorPlans = Array.isArray(payload.floorPlanItems)
    ? payload.floorPlanItems
    : [];
  const lines = [
    `Hi ${leadName},`,
    "",
    message,
    "",
    `View your recommendations: ${recommendationUrl}`,
  ];

  if (properties.length > 0) {
    lines.push("", "Selected properties:");
    properties.forEach((property) => {
      lines.push(
        `- ${cleanText(property.name)}${cleanText(property.area) ? ` - ${cleanText(property.area)}` : ""}${cleanText(property.special) ? ` - ${cleanText(property.special)}` : ""}`
      );
    });
  }

  if (floorPlans.length > 0) {
    lines.push("", "Exact floor plans attached:");
    floorPlans.forEach((item) => {
      lines.push(
        `- ${cleanText(item.floorPlanName)}${cleanText(item.propertyName) ? ` at ${cleanText(item.propertyName)}` : ""}${cleanText(item.effectiveRent || item.rent) ? ` - ${cleanText(item.effectiveRent || item.rent)}` : ""}`
      );
    });
  }

  lines.push(
    "",
    "Reply to this email with the options you like, and I can help confirm pricing, availability, and tour times.",
    "",
    "Below Market Apartments"
  );

  return lines.join("\n");
}

function cleanText(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return cleanText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
    },
  });
}
