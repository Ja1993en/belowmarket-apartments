export async function onRequestPost({ request, env }) {
  try {
    const configError = validateEmailConfig(env);
    if (configError) return jsonResponse({ error: configError }, 500);

    const lead = await request.json();
    const leadName = cleanText(lead.name) || "New renter lead";
    const adminUrl =
      cleanText(lead.adminUrl) ||
      `https://belowmarketapartments.com/admin/leads/${encodeURIComponent(
        cleanText(lead.id)
      )}`;
    const fromEmail =
      env.RESEND_FROM_EMAIL ||
      "Below Market Apartments <onboarding@resend.dev>";
    const replyTo =
      env.LEAD_REPLY_TO ||
      env.LEAD_NOTIFICATION_TO ||
      "jalen.l.mcneal@belowmarketapartments.com";

    const adminEmailResult = await sendResendEmail(env, {
      from: fromEmail,
      to: env.LEAD_NOTIFICATION_TO || "jalen.l.mcneal@belowmarketapartments.com",
      reply_to: replyTo,
      subject: `New apartment lead: ${leadName}`,
      html: buildLeadEmailHtml(lead, adminUrl),
      text: buildLeadEmailText(lead, adminUrl),
    });

    if (!adminEmailResult.ok) {
      return jsonResponse(
        {
          error:
            adminEmailResult.body?.message ||
            "Resend could not send the lead notification email.",
        },
        adminEmailResult.status
      );
    }

    const renterEmail = cleanText(lead.email);
    let renterEmailResult = null;

    if (renterEmail) {
      renterEmailResult = await sendResendEmail(env, {
        from: fromEmail,
        to: renterEmail,
        reply_to: replyTo,
        subject: "We received your apartment search request",
        html: buildRenterConfirmationHtml(lead),
        text: buildRenterConfirmationText(lead),
      });
    }

    return jsonResponse({
      id: adminEmailResult.body.id,
      renterConfirmationSent: Boolean(renterEmailResult?.ok),
      renterConfirmationError: renterEmailResult?.ok
        ? ""
        : renterEmailResult?.body?.message || "",
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error?.message || "Could not send the lead notification email.",
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

function buildLeadEmailHtml(lead, adminUrl) {
  const rows = [
    ["Name", lead.name],
    ["Phone", lead.phone],
    ["Email", lead.email],
    ["Preference", lead.preference],
    ["Bedrooms", lead.bedrooms],
    ["Budget", lead.budget],
    ["Move-in", lead.moveIn],
    ["Contact Method", lead.contactMethod],
    ["Source", lead.source],
    ["Source Property", lead.sourcePropertyName],
    ["UTM Source", lead.utmSource],
    ["UTM Medium", lead.utmMedium],
    ["UTM Campaign", lead.utmCampaign],
    ["Google Click ID", lead.gclid],
    ["Notes", lead.notes],
  ].filter(([, value]) => cleanText(value));

  return `
    <div style="font-family: Arial, sans-serif; color: #102426; line-height: 1.5;">
      <h1 style="margin: 0 0 12px; font-size: 24px;">New apartment lead</h1>
      <p style="margin: 0 0 20px;">A renter submitted the Below Market Apartments start form.</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #d7e6df; font-weight: 700; background: #f5f8f1; width: 170px;">${escapeHtml(label)}</td>
                <td style="padding: 10px; border: 1px solid #d7e6df;">${escapeHtml(value)}</td>
              </tr>
            `
          )
          .join("")}
      </table>
      <p style="margin-top: 24px;">
        <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #173f3f; color: #ffffff; padding: 12px 18px; border-radius: 14px; text-decoration: none; font-weight: 700;">
          View lead in admin
        </a>
      </p>
    </div>
  `;
}

function buildRenterConfirmationHtml(lead) {
  const renterName = cleanText(lead.name) || "there";
  const details = [
    ["Preferred Area", getPreferenceArea(lead)],
    ["Bedrooms", lead.bedrooms],
    ["Budget", lead.budget],
    ["Move-in", lead.moveIn],
    ["Contact Method", lead.contactMethod],
  ].filter(([, value]) => cleanText(value));

  return `
    <div style="font-family: Arial, sans-serif; color: #102426; line-height: 1.6;">
      <h1 style="margin: 0 0 12px; font-size: 24px;">We received your apartment search request</h1>
      <p style="margin: 0 0 16px;">Hi ${escapeHtml(renterName)},</p>
      <p style="margin: 0 0 16px;">
        Thanks for reaching out to Below Market Apartments. We will review your preferences and follow up with current Dallas-area apartment specials that fit your search.
      </p>
      <div style="margin: 20px 0; padding: 16px; background: #f5f8f1; border: 1px solid #d7e6df; border-radius: 14px;">
        <p style="margin: 0 0 10px; font-weight: 700;">Search summary</p>
        ${details
          .map(
            ([label, value]) => `
              <p style="margin: 6px 0;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>
            `
          )
          .join("")}
      </div>
      <p style="margin: 0 0 16px;">
        If anything changes, reply to this email or call/text 945-269-3768.
      </p>
      <p style="margin: 0;">Below Market Apartments</p>
    </div>
  `;
}

function buildRenterConfirmationText(lead) {
  const renterName = cleanText(lead.name) || "there";
  const lines = [
    `Hi ${renterName},`,
    "",
    "We received your apartment search request.",
    "We will review your preferences and follow up with current Dallas-area apartment specials that fit your search.",
    "",
    "Search summary:",
    `Preferred Area: ${getPreferenceArea(lead)}`,
    `Bedrooms: ${cleanText(lead.bedrooms)}`,
    `Budget: ${cleanText(lead.budget)}`,
    `Move-in: ${cleanText(lead.moveIn)}`,
    `Contact Method: ${cleanText(lead.contactMethod)}`,
    "",
    "If anything changes, reply to this email or call/text 945-269-3768.",
    "",
    "Below Market Apartments",
  ];

  return lines.filter((line) => !line.endsWith(": ")).join("\n");
}

function buildLeadEmailText(lead, adminUrl) {
  const lines = [
    "New apartment lead",
    "",
    `Name: ${cleanText(lead.name)}`,
    `Phone: ${cleanText(lead.phone)}`,
    `Email: ${cleanText(lead.email)}`,
    `Preference: ${cleanText(lead.preference)}`,
    `Bedrooms: ${cleanText(lead.bedrooms)}`,
    `Budget: ${cleanText(lead.budget)}`,
    `Move-in: ${cleanText(lead.moveIn)}`,
    `Contact Method: ${cleanText(lead.contactMethod)}`,
    `Source: ${cleanText(lead.source)}`,
    `Source Property: ${cleanText(lead.sourcePropertyName)}`,
    `UTM Source: ${cleanText(lead.utmSource)}`,
    `UTM Medium: ${cleanText(lead.utmMedium)}`,
    `UTM Campaign: ${cleanText(lead.utmCampaign)}`,
    `Google Click ID: ${cleanText(lead.gclid)}`,
    `Notes: ${cleanText(lead.notes)}`,
    "",
    `View lead: ${adminUrl}`,
  ];

  return lines.filter((line) => !line.endsWith(": ")).join("\n");
}

function getPreferenceArea(lead) {
  const preference = cleanText(lead.preference);

  if (!preference) return "";

  const [, area] = preference.split(" - ");

  return cleanText(area) || preference;
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
