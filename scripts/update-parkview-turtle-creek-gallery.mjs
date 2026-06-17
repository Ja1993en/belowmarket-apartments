import fs from "node:fs";

const PROPERTY_ID = "parkview-turtle-creek-by-hanover";
const PROPERTY_NAME = "Parkview Turtle Creek by Hanover";
const SOURCE_URL =
  "https://www.realtor.com/rentals/details/2555-Turtle-Creek-Blvd_Dallas_TX_75219_M94895-12755";
const MEDIA_BASE = "https://ar.rdcpix.com";

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const photoSources = [
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f2394336127s.jpg",
    "Parkview Turtle Creek by Hanover exterior and arrival area",
    "Exterior",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f2102606531s.jpg",
    "Amenity interior at Parkview Turtle Creek by Hanover",
    "Amenity",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f3345960582s.jpg",
    "Apartment living room at Parkview Turtle Creek by Hanover",
    "Interior",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f4046566340s.jpg",
    "Resident lounge at Parkview Turtle Creek by Hanover",
    "Lounge",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f1513348298s.jpg",
    "Fitness center at Parkview Turtle Creek by Hanover",
    "Fitness",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f3988006003s.jpg",
    "Recreation room at Parkview Turtle Creek by Hanover",
    "Amenity",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f1417784789s.jpg",
    "Outdoor patio at Parkview Turtle Creek by Hanover",
    "Outdoor",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f3110572920s.jpg",
    "Parkview Turtle Creek by Hanover exterior view",
    "Exterior",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f2934504109s.jpg",
    "Bathroom at Parkview Turtle Creek by Hanover",
    "Bathroom",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f2883729114s.jpg",
    "Apartment living area at Parkview Turtle Creek by Hanover",
    "Interior",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f954939582s.jpg",
    "Kitchen at Parkview Turtle Creek by Hanover",
    "Kitchen",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f2039522341s.jpg",
    "Closet storage at Parkview Turtle Creek by Hanover",
    "Interior",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f990313477s.jpg",
    "Apartment living room with skyline view at Parkview Turtle Creek by Hanover",
    "Interior",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f702800437s.jpg",
    "Bathroom finishes at Parkview Turtle Creek by Hanover",
    "Bathroom",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f3670133957s.jpg",
    "Kitchen finishes at Parkview Turtle Creek by Hanover",
    "Kitchen",
  ],
  [
    "https://ar.rdcpix.com/c1026b35d16e341578ac4232d7cfb5b1c-f2078716526s.jpg",
    "Apartment interior at Parkview Turtle Creek by Hanover",
    "Interior",
  ],
];

const photos = validateOfficialPhotos(
  photoSources.map(([url, alt, category], index) => ({
    id: `${PROPERTY_ID}-gallery-${String(index + 1).padStart(2, "0")}`,
    name: alt,
    category,
    url,
    alt,
  }))
);

const existing = await getExistingProperty();
const updatedData = {
  ...existing.data,
  photos,
  image: photos[0].url,
  sourceUrl: SOURCE_URL,
  updated: "Parkview Turtle Creek by Hanover gallery replaced with verified property media",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      photoCount: photos.length,
      image: updatedData.image,
      removed: "broken Parkview cache gallery URLs",
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
      throw new Error(`Invalid Parkview gallery URL: ${photo.url}`);
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
