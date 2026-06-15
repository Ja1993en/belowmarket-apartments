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

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from:
          env.RESEND_FROM_EMAIL ||
          "Below Market Apartments <onboarding@resend.dev>",
        to: env.LEAD_NOTIFICATION_TO || "jalen.l.mcneal@belowmarketapartments.com",
        subject: `New apartment lead: ${leadName}`,
        html: buildLeadEmailHtml(lead, adminUrl),
        text: buildLeadEmailText(lead, adminUrl),
      }),
    });

    const resendBody = await resendResponse.json();

    if (!resendResponse.ok) {
      return jsonResponse(
        {
          error:
            resendBody?.message ||
            "Resend could not send the lead notification email.",
        },
        resendResponse.status
      );
    }

    return jsonResponse({ id: resendBody.id });
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
