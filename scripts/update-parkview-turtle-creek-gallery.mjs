import fs from "node:fs";

const PROPERTY_ID = "parkview-turtle-creek-by-hanover";
const PROPERTY_NAME = "Parkview Turtle Creek by Hanover";
const OFFICIAL_GALLERY_URL = "https://parkviewturtlecreek.com/gallery/";
const MEDIA_BASE = "https://parkviewturtlecreek.com/assets/images/cache";

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const photoSources = [
  [
    "Parkview-Turtle-Creek_V01_Pool-Deck-Dusk_Pv_HR_25-11-072-e008ecf48a42679cf938bac4045f0c7f.jpg",
    "Rooftop pool deck at Parkview Turtle Creek by Hanover",
    "Pool",
  ],
  [
    "Parkview-Turtle-Creek_V05_Garden-Courtyard_Pv_HR_25-10-271-60e75c037123bc0006b6c0e711be6db9.jpg",
    "Garden courtyard at Parkview Turtle Creek by Hanover",
    "Courtyard",
  ],
  [
    "Parkview-Turtle-Creek_V01_Pool-Deck-Dusk_Pv_HR_25-11-071-6fc00a32c3051afd64648bd8426d7e04.jpg",
    "Pool deck lounge at Parkview Turtle Creek by Hanover",
    "Pool",
  ],
  [
    "ECNk82w60jeBTFhQZWQ7yaa0rZyMmjs5Lb4NkhOO-cb0f5a2bd1a609d02edb3b1dfe5769dd.jpg",
    "Designer-selected interior at Parkview Turtle Creek by Hanover",
    "Interior",
  ],
  [
    "01-1640x900-PTC-DS-Graphite-Oak-e9d1336d2a9339b68a40c51a5570dc60.jpg",
    "Graphite Oak finish package at Parkview Turtle Creek by Hanover",
    "Finishes",
  ],
  [
    "02-1640x900-PTC-DS-Drift-Wood-64b886d57e5bdd56925802095e957c25.jpg",
    "Drift Wood finish package at Parkview Turtle Creek by Hanover",
    "Finishes",
  ],
  [
    "03-1640x900-PTC-DS-Saddle-Elm-60dc1790e33cc92c324fef9843af92af.jpg",
    "Saddle Elm finish package at Parkview Turtle Creek by Hanover",
    "Finishes",
  ],
];

const photos = validateOfficialPhotos(
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
  sourceUrl: OFFICIAL_GALLERY_URL,
  updated: "Parkview Turtle Creek by Hanover gallery narrowed to verified Parkview-specific media",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      photoCount: photos.length,
      image: updatedData.image,
      removed: "questionable hashed gallery assets",
      categories: [...new Set(photos.map((photo) => photo.category))],
    },
    null,
    2
  )
);

function validateOfficialPhotos(photosToValidate) {
  const seenUrls = new Set();

  return photosToValidate.map((photo) => {
    if (!photo.url.startsWith(`${MEDIA_BASE}/`) || !/\.(jpe?g|png|webp)$/i.test(photo.url)) {
      throw new Error(`Invalid Parkview official gallery URL: ${photo.url}`);
    }

    if (seenUrls.has(photo.url)) {
      throw new Error(`Duplicate Parkview gallery URL: ${photo.url}`);
    }

    seenUrls.add(photo.url);
    return photo;
  });
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
