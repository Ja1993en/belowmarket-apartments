import crypto from "node:crypto";
import fs from "node:fs";

const PROPERTY_ID = "kessler-bluffs";
const PROPERTY_NAME = "Kessler Bluffs";
const SOURCE_URL = "https://www.kesslerbluffsdallas.com/";
const MEDIA_BASE = "https://sxxweb8cdn.cachefly.net";
const MEDIA_PATH = "/common/uploads/zrs2019/678/media/";
const PREFERRED_IMAGE_URL = `${MEDIA_BASE}${MEDIA_PATH}b4812081-1217-4e2c-904a-f3df85bbd50c.jpg`;

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const officialHtml = await fetchText(SOURCE_URL);
const sourceUrls = extractMediaUrls(officialHtml);
const photos = await verifyAndBuildPhotos(sourceUrls);
const existing = await getExistingProperty();
const previousPhotoCount = existing.data.photos?.length || 0;

const updatedData = {
  ...existing.data,
  photos,
  image: photos[0].url,
  sourceUrl: SOURCE_URL,
  updated: "Kessler Bluffs gallery replaced with verified official property photos",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      previousPhotoCount,
      sourceUrlCount: sourceUrls.length,
      photoCount: photos.length,
      image: updatedData.image,
      categories: [...new Set(photos.map((photo) => photo.category))],
    },
    null,
    2
  )
);

function extractMediaUrls(html) {
  const rawUrls = [
    ...html.matchAll(/https:\/\/sxxweb8cdn\.cachefly\.net\/[^"'<> )]+/g),
  ].map((match) => match[0].replaceAll("&amp;", "&"));

  const normalizedUrls = rawUrls
    .map((url) => {
      if (!url.includes("/img/thumbnail.aspx?p=")) {
        return url;
      }

      const parsedUrl = new URL(url);
      const directPath = parsedUrl.searchParams.get("p");
      return directPath ? `${MEDIA_BASE}${directPath}` : url;
    })
    .filter((url) => url.startsWith(`${MEDIA_BASE}${MEDIA_PATH}`))
    .filter((url) => /\.(jpe?g)$/i.test(url));

  const uniqueUrls = [...new Set(normalizedUrls)];
  return movePreferredImageFirst(uniqueUrls);
}

function movePreferredImageFirst(urls) {
  return [
    PREFERRED_IMAGE_URL,
    ...urls.filter((url) => url !== PREFERRED_IMAGE_URL),
  ].filter((url, index, orderedUrls) => orderedUrls.indexOf(url) === index);
}

async function verifyAndBuildPhotos(urls) {
  const seenHashes = new Set();
  const photosToSave = [];

  for (const url of urls) {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.startsWith("image/")) {
      throw new Error(`Kessler Bluffs photo failed verification (${response.status} ${contentType}): ${url}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");

    if (seenHashes.has(hash)) {
      continue;
    }

    seenHashes.add(hash);
    const index = photosToSave.length + 1;
    const category = inferCategory(url, index);
    const name = `Kessler Bluffs ${category.toLowerCase()} photo ${index}`;

    photosToSave.push({
      id: `${PROPERTY_ID}-gallery-${String(index).padStart(2, "0")}`,
      name,
      category,
      url,
      alt: `${name} at ${PROPERTY_NAME} in Dallas, Texas`,
    });
  }

  if (!photosToSave.length) {
    throw new Error("No verified Kessler Bluffs gallery photos were found.");
  }

  return photosToSave;
}

function inferCategory(url, index) {
  const categoryMap = new Map([
    ["b4812081-1217-4e2c-904a-f3df85bbd50c", "Exterior"],
    ["617eb8c2-9608-4701-bebd-e680b68c06bb", "Interior"],
    ["93bd3162-85bb-4033-a5b9-e0de7bb63944", "Pool"],
    ["5ecf5173-9b33-4f01-a290-0242e68aeb22", "Outdoor"],
    ["39750eae-58c1-4340-9c50-424c9d13709e", "Kitchen"],
  ]);

  for (const [filenameFragment, category] of categoryMap.entries()) {
    if (url.includes(filenameFragment)) {
      return category;
    }
  }

  return index <= 12 ? "Gallery" : "Property";
}

async function fetchText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
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
