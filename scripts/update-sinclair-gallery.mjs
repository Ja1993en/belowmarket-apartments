import fs from "node:fs";

const PROPERTY_ID = "the-sinclair-residences";
const PROPERTY_NAME = "The Sinclair Residences";
const OFFICIAL_SITE_URL = "https://www.thesinclairresidences.com/";
const MEDIA_BASE = "https://sxxweb8cdn.cachefly.net/common/uploads/zrs2019/752/media";

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const photoSources = [
  ["4f8d4476-fedc-4ac0-b3d7-1154ea42b4a3.jpg", "Living room with downtown views at The Sinclair Residences", "Interior"],
  ["bcb1b31f-309b-4464-a335-8c4fff3205a7.jpg", "Kitchen finishes at The Sinclair Residences", "Kitchen"],
  ["ceea6d17-1d03-4d7a-928a-3018d611c947.jpg", "Bathroom vanity with downtown view at The Sinclair Residences", "Bathroom"],
  ["436c94c9-b40a-456f-aa93-17cc04ea3748.jpg", "Styled living room at The Sinclair Residences", "Interior"],
  ["1a0d01a5-b830-4e4a-8990-6691a5eed87e.jpg", "Bedroom styling at The Sinclair Residences", "Bedroom"],
  ["56074ad5-1059-479b-a851-9e6bdb6566a4.jpg", "In-home washer and dryer at The Sinclair Residences", "Interior"],
  ["9e86d836-d783-4086-928d-0dcaa9dc8651.jpg", "Lounge seating detail at The Sinclair Residences", "Interior"],
  ["c2cd5216-9990-4f96-80a1-d85608c93a5d.jpg", "Work from home nook at The Sinclair Residences", "Interior"],
  ["9b9f3637-1c03-4ed6-a997-7c3206539d2a.jpg", "Furnished living room detail at The Sinclair Residences", "Interior"],
  ["e39c1d77-406c-4cde-8086-3c241362098e.jpg", "Residence detail at The Sinclair Residences", "Interior"],
];

const photos = photoSources.map(([filename, alt, category], index) => ({
  id: `${PROPERTY_ID}-gallery-${String(index + 1).padStart(2, "0")}`,
  name: alt,
  category,
  url: `${MEDIA_BASE}/${filename}`,
  alt,
}));

const existing = await getExistingProperty();
const updatedData = {
  ...existing.data,
  photos,
  image: photos[0].url,
  sourceUrl: OFFICIAL_SITE_URL,
  updated: "The Sinclair gallery refreshed from official property media",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      photoCount: photos.length,
      image: updatedData.image,
      removed: "thumbnail wrappers, floor plan diagrams, logo, favicon, and pattern placeholder",
      categories: [...new Set(photos.map((photo) => photo.category))],
    },
    null,
    2
  )
);

async function getExistingProperty() {
  const response = await supabaseFetch(
    `/rest/v1/properties?id=eq.${encodeURIComponent(PROPERTY_ID)}&select=id,data`
  );
  const rows = await response.json();
  const [property] = rows;

  if (!property) {
    throw new Error(`Could not find ${PROPERTY_NAME} (${PROPERTY_ID}) in Supabase.`);
  }

  return property;
}

async function updateProperty(id, data) {
  await supabaseFetch(`/rest/v1/properties?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ data }),
  });
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return response;
}

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env", "utf8")
      .split(/\n/)
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        return [key, value];
      })
  );
}
