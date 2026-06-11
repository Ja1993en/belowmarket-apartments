const SITE_URL = "https://belowmarketapartments.com";
const DEFAULT_DESCRIPTION =
  "Find apartments with verified specials, effective rent, and renter-first deal transparency.";
const DEFAULT_IMAGE_URL = `${SITE_URL}/social-preview.svg`;
const META_BLOCK_PATTERN =
  /<!-- bma-og-start -->[\s\S]*?<!-- bma-og-end -->/;

const DEFAULT_META = {
  title: "Below Market Apartments",
  description: DEFAULT_DESCRIPTION,
  type: "website",
  url: SITE_URL,
  image: DEFAULT_IMAGE_URL,
  imageAlt: "Below Market Apartments preview card",
};

export async function onRequest({ request, env }) {
  const response = await env.ASSETS.fetch(request);
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  const url = new URL(request.url);
  const meta = await getMetaForUrl(url, env);
  const html = injectMeta(await response.text(), meta);
  const headers = new Headers(response.headers);

  headers.set("content-type", "text/html; charset=UTF-8");
  headers.delete("content-length");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function getMetaForUrl(url, env) {
  const propertyId = getPropertyId(url.pathname);

  if (!propertyId) {
    return {
      ...DEFAULT_META,
      url: `${SITE_URL}${url.pathname === "/" ? "/" : url.pathname}`,
    };
  }

  const property = await fetchProperty(propertyId, env);

  if (!property) {
    return {
      ...DEFAULT_META,
      title: "Apartment Listing | Below Market Apartments",
      url: `${SITE_URL}${url.pathname}`,
    };
  }

  return buildPropertyMeta(property, url.pathname);
}

function getPropertyId(pathname) {
  const match = pathname.match(/^\/properties\/([^/?#]+)/);

  return match ? decodeURIComponent(match[1]) : "";
}

async function fetchProperty(propertyId, env) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const query = new URL(`${supabaseUrl}/rest/v1/properties`);

    query.searchParams.set("select", "id,name,status,city,state,zipcode,data");
    query.searchParams.set("id", `eq.${propertyId}`);
    query.searchParams.set("limit", "1");

    const response = await fetch(query, {
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) return null;

    const [row] = await response.json();

    if (!row) return null;

    const data = row.data || {};

    return {
      ...data,
      id: row.id,
      name: data.name || row.name || "Apartment listing",
      status: data.status || row.status || "",
      city: data.city || row.city || "",
      state: data.state || row.state || "",
      zipcode: data.zipcode || row.zipcode || "",
    };
  } catch {
    return null;
  }
}

function buildPropertyMeta(property, pathname) {
  const title = `${property.name} | Below Market Apartments`;
  const location = [property.city, property.state, property.zipcode]
    .filter(Boolean)
    .join(", ");
  const specialLabel = getSpecialLabel(property);
  const rentLabel = getRentLabel(property);
  const descriptionParts = [
    specialLabel,
    rentLabel,
    location,
    "See photos, specials, floor plans, and renter-first details before you tour.",
  ].filter(Boolean);
  const description = descriptionParts.join(" • ");
  const image = getPropertyImage(property) || DEFAULT_IMAGE_URL;

  return {
    title,
    description,
    type: "website",
    url: `${SITE_URL}${pathname}`,
    image,
    imageAlt: `${property.name} apartment listing preview`,
  };
}

function getSpecialLabel(property) {
  const propertySpecial = getText(property.special);

  if (propertySpecial && propertySpecial !== "Special not listed") {
    return propertySpecial;
  }

  const floorPlanSpecial = (property.floorPlans || [])
    .map((floorPlan) => getText(floorPlan.special?.label || floorPlan.currentSpecial))
    .find(Boolean);

  return floorPlanSpecial || "";
}

function getRentLabel(property) {
  const propertyEffectiveRent = formatMoney(property.effectiveRent);
  const propertyRent = formatMoney(property.rent || property.startingRent);

  if (propertyEffectiveRent) return `Effective rent from ${propertyEffectiveRent}`;
  if (propertyRent) return `Rent from ${propertyRent}`;

  const floorPlanRent = (property.floorPlans || [])
    .flatMap((floorPlan) => [
      formatMoney(floorPlan.effectiveRent),
      formatMoney(floorPlan.startingRent || floorPlan.rent),
    ])
    .find(Boolean);

  return floorPlanRent ? `Rent from ${floorPlanRent}` : "";
}

function getPropertyImage(property) {
  const imageCandidates = [
    property.image,
    ...((property.photos || []).map(getPhotoUrl)),
    ...((property.floorPlans || []).flatMap((floorPlan) => [
      floorPlan.image,
      ...((floorPlan.photos || []).map(getPhotoUrl)),
    ])),
  ];

  return imageCandidates.map(toAbsoluteImageUrl).find(Boolean) || "";
}

function getPhotoUrl(photo) {
  return photo?.url || photo?.src || photo?.image || "";
}

function toAbsoluteImageUrl(value) {
  const imageUrl = getText(value);

  if (!imageUrl || imageUrl.startsWith("data:")) return "";

  try {
    return new URL(imageUrl, SITE_URL).href;
  } catch {
    return "";
  }
}

function formatMoney(value) {
  if (!value && value !== 0) return "";

  const numberValue = Number(String(value).replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(numberValue) || numberValue <= 0) return "";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function injectMeta(html, meta) {
  const resolvedMeta = {
    ...DEFAULT_META,
    ...meta,
  };
  const metaBlock = buildMetaBlock(resolvedMeta);

  const withTitle = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeText(resolvedMeta.title)}</title>`
  );
  const withDescription = replaceOrInsertHeadTag(
    withTitle,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeAttribute(
      resolvedMeta.description
    )}" />`
  );
  const withCanonical = replaceOrInsertHeadTag(
    withDescription,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escapeAttribute(resolvedMeta.url)}" />`
  );

  if (META_BLOCK_PATTERN.test(withCanonical)) {
    return withCanonical.replace(META_BLOCK_PATTERN, metaBlock);
  }

  return withCanonical.replace("</head>", `${metaBlock}\n  </head>`);
}

function replaceOrInsertHeadTag(html, pattern, tag) {
  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }

  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function buildMetaBlock(meta) {
  return [
    "<!-- bma-og-start -->",
    metaTag("property", "og:site_name", "Below Market Apartments"),
    metaTag("property", "og:title", meta.title),
    metaTag("property", "og:description", meta.description),
    metaTag("property", "og:type", meta.type),
    metaTag("property", "og:url", meta.url),
    metaTag("property", "og:image", meta.image),
    metaTag("property", "og:image:alt", meta.imageAlt),
    metaTag("name", "twitter:card", "summary_large_image"),
    metaTag("name", "twitter:title", meta.title),
    metaTag("name", "twitter:description", meta.description),
    metaTag("name", "twitter:image", meta.image),
    "<!-- bma-og-end -->",
  ].join("\n    ");
}

function metaTag(attribute, key, value) {
  return `<meta ${attribute}="${escapeAttribute(key)}" content="${escapeAttribute(
    value
  )}" />`;
}

function getText(value) {
  return String(value || "").trim();
}

function escapeText(value) {
  return getText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}
