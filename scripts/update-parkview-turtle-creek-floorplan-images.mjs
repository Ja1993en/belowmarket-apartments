import fs from "node:fs";

const PROPERTY_ID = "parkview-turtle-creek-by-hanover";
const PROPERTY_NAME = "Parkview Turtle Creek by Hanover";
const SOURCE_URL =
  "https://www.realtor.com/rentals/details/2555-Turtle-Creek-Blvd_Dallas_TX_75219_M94895-12755";
const REALTOR_IMAGE_BASE = "https://ar.rdcpix.com/";

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const realtorFloorPlanImages = await getRealtorFloorPlanImages();
const existing = await getExistingProperty();
const currentFloorPlans = existing.data.floorPlans || [];

const updatedFloorPlans = currentFloorPlans.map((floorPlan) => {
  const imageUrl = realtorFloorPlanImages.get(normalizeFloorPlanName(floorPlan.name));

  if (!imageUrl) return floorPlan;

  return {
    ...floorPlan,
    image: imageUrl,
    cardImage: imageUrl,
    thumbnailImage: imageUrl,
    photos: [
      {
        id: `${floorPlan.id || normalizeFloorPlanName(floorPlan.name)}-floorplan-image`,
        name: `${floorPlan.name} floor plan`,
        category: "Floor Plan",
        url: imageUrl,
        alt: `${PROPERTY_NAME} ${floorPlan.name} floor plan`,
      },
    ],
  };
});

const updatedCount = updatedFloorPlans.filter((floorPlan, index) => {
  return floorPlan.image !== currentFloorPlans[index]?.image;
}).length;
const unchangedFloorPlans = updatedFloorPlans
  .filter((floorPlan) => !realtorFloorPlanImages.has(normalizeFloorPlanName(floorPlan.name)))
  .map((floorPlan) => floorPlan.name);

const updatedData = {
  ...existing.data,
  floorPlans: updatedFloorPlans,
  floorPlanImageSourceUrl: SOURCE_URL,
  updated: "Parkview Turtle Creek floor plan images verified against Realtor floorplan media",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      sourceFloorPlanImages: realtorFloorPlanImages.size,
      existingFloorPlanCount: currentFloorPlans.length,
      updatedFloorPlanImages: updatedCount,
      unchangedFloorPlans,
    },
    null,
    2
  )
);

async function getRealtorFloorPlanImages() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not load Realtor source. ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!nextDataMatch) {
    throw new Error("Could not find Realtor floorplan data payload.");
  }

  const nextData = JSON.parse(nextDataMatch[1]);
  const floorPlans =
    nextData.props?.pageProps?.initialReduxState?.propertyDetails
      ?.community_rental_floorplans || [];
  const imagesByName = new Map();

  for (const floorPlan of floorPlans) {
    const floorPlanName = floorPlan.floorplan_description?.name;
    const imageUrl = floorPlan.photos?.[0]?.href;

    if (!floorPlanName || !imageUrl) continue;
    if (!imageUrl.startsWith(REALTOR_IMAGE_BASE) || !/\.jpe?g$/i.test(imageUrl)) {
      throw new Error(`Unexpected Parkview floorplan image URL: ${imageUrl}`);
    }

    await verifyImageUrl(imageUrl);
    imagesByName.set(normalizeFloorPlanName(floorPlanName), imageUrl);
  }

  if (imagesByName.size === 0) {
    throw new Error("No Realtor floorplan images were found for Parkview.");
  }

  return imagesByName;
}

async function verifyImageUrl(imageUrl) {
  const response = await fetch(imageUrl, { method: "HEAD" });

  if (!response.ok) {
    throw new Error(`Floorplan image is not reachable: ${imageUrl}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Floorplan URL is not an image: ${imageUrl}`);
  }
}

function normalizeFloorPlanName(name = "") {
  return String(name)
    .trim()
    .toUpperCase()
    .replace(/^P[-\s]?H0?(\d+)$/, "PH$1")
    .replace(/^PH0+(\d+)$/, "PH$1");
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
