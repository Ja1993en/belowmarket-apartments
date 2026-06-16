import fs from "node:fs";

const PROPERTY_ID = "residences-at-the-grove";
const PROPERTY_NAME = "Residences at the Grove";
const OFFICIAL_RENTCAFE_URL =
  "https://www.rentcafe.com/apartments/tx/dallas/residences-at-the-grove/default.aspx";
const MEDIA_BASE = "https://cdn.rentcafe.com/dmslivecafe/3/2187716";

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const photoSources = [
  ["IMG_3019.jpg", "Furnished living and bedroom space at Residences at the Grove", "Interior"],
  ["IMG_3022.jpg", "Apartment living room at Residences at the Grove", "Interior"],
  ["IMG_3023.jpg", "Bedroom with large windows at Residences at the Grove", "Bedroom"],
  ["IMG_3024.jpg", "Bedroom view at Residences at the Grove", "Bedroom"],
  ["IMG_3025.jpg", "Kitchen and living area at Residences at the Grove", "Kitchen"],
  ["IMG_3026.jpg", "Kitchen island at Residences at the Grove", "Kitchen"],
  ["IMG_3027.jpg", "Open apartment kitchen at Residences at the Grove", "Kitchen"],
  ["IMG_3029.jpg", "Apartment entry and kitchen finishes at Residences at the Grove", "Kitchen"],
  ["IMG_3030.jpg", "Granite island kitchen at Residences at the Grove", "Kitchen"],
  ["IMG_3031.jpg", "Kitchen cabinetry at Residences at the Grove", "Kitchen"],
  ["IMG_3032.jpg", "Apartment living area at Residences at the Grove", "Interior"],
  ["IMG_3033.jpg", "Bedroom layout at Residences at the Grove", "Bedroom"],
  ["IMG_3034.jpg", "Bedroom window view at Residences at the Grove", "Bedroom"],
  ["IMG_3035.jpg", "Secondary bedroom at Residences at the Grove", "Bedroom"],
  ["IMG_3036.jpg", "Bathroom with double vanity at Residences at the Grove", "Bathroom"],
];

const photos = await verifyPhotos(
  photoSources.map(([filename, alt, category], index) => ({
    id: `${PROPERTY_ID}-gallery-${String(index + 1).padStart(2, "0")}`,
    name: alt,
    category,
    url: `${MEDIA_BASE}/${filename}`,
    alt,
  }))
);

const existing = await getExistingProperty();
const updatedData = {
  ...existing.data,
  photos,
  image: photos[0].url,
  sourceUrl: existing.data.sourceUrl || OFFICIAL_RENTCAFE_URL,
  updated: "Residences at the Grove gallery refreshed from verified RentCafe media",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      photoCount: photos.length,
      image: updatedData.image,
      removed: "old mixed two-photo gallery",
      categories: [...new Set(photos.map((photo) => photo.category))],
    },
    null,
    2
  )
);

async function verifyPhotos(photosToVerify) {
  const verifiedPhotos = [];

  for (const photo of photosToVerify) {
    const response = await fetch(photo.url, { method: "HEAD" });
    const contentType = response.headers.get("content-type") || "";
    const contentLength = Number(response.headers.get("content-length") || 0);

    if (!response.ok || !contentType.startsWith("image/") || contentLength < 10000) {
      throw new Error(`Could not verify gallery image: ${photo.url}`);
    }

    verifiedPhotos.push(photo);
  }

  return verifiedPhotos;
}

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
