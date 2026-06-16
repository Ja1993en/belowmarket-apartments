import fs from "node:fs";

const PROPERTY_ID = "dominion-at-mercer-crossing";
const PROPERTY_NAME = "Dominion at Mercer Crossing";

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const photoSources = [
  ["https://dominionatmercercrossing.com/assets/images/cache/9oB6s8fQYb2k4MEuPPNvx7QFoKatPthtxNe8NdeF-2edc758f3fcddf4367343358f7403e14.jpg", "Kitchen island at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/4KKDRaOdXd6QM90XRiEUQkqnUOiBQULR8Nj48Who-e041a025ff5b5b406fce2292d348de25.jpg", "Kitchen with designer finishes at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/uMcnMmKYWxr9GeU0o6FGnvPgM0iOWo8nxEsZ3rb6-ea58b60365be0e988bf2eaf54b4331b0.jpg", "Kitchen and dining area at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/9RohEMr5pNaVKwstAu42MVBJX7STwYhWdnjTArIs-bf38ff1b9185aebf15121cd51eb905af.jpg", "Living room at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/y5Tbbncc8YwqBNMZcI0vtY0xE88AAKzGu9qtdZ0A-53b8b2ff20b3fc5c23966d489325ed49.jpg", "Living room with patio access at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/qycVyuZaJbvYwxSRyBEJdFuYKNUvYrTGaY6RC51v-9c6d67676e157adf18b595726ef7a02a.jpg", "Kitchen island and dining area at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/qlrrFSBcHCMZrmHLpK1yWCSkr5xkJfIiUtLlh6Zp-d243ec0faa03ca62cfafc2810b22383b.jpg", "Bedroom at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/4P5WyVuic62gRYUMVLl7NRixY68LllY18JPAWlCP-9194a54af496fcc510bdd45940265c5d.jpg", "Bedroom with large window at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/MjoPOi5v2YC5bXyDdjZN5tkylZ08dJmSqaSpWLWy-43d2714001bb08734ee6a46fd5614b3c.jpg", "Bathroom vanity at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/OMX6f6ufg5VqBUFGixstl9NunbBNUKgoc9LbJX6F-69d235a0298a22b870b15da55ad8d72e.jpg", "Kitchen with marble-style island at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/EcMPpbtUNtckcxluMoXWBxbCzuXpRJpjjmN1G8x9-ffae1b3c41e95c872c277840922b5a84.jpg", "Bathroom with shower tub at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/1njAesy75bOeR92TFQbOE7c0ymxm260gRjSmxJ9F-e24e801769b72b4bf7d494f3ec78b322.jpg", "Bedroom with window at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/KZaZFOmxXk4uYZwyIckfJqaEnYf8zXVG9XdwEcHd-e556e74113e20197294d3f854e69793d.jpg", "Bedroom with bedside lighting at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/OiE9d5YZGBMrd9riV5LqIOCmDrNqGwlAjXwG3Kys-41bae90ca5b6e43019da54fb164e8d36.jpg", "Large bathroom at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/lZR7mIt5vnbsYZTG2dIYPxvBIvWadpZXtATFSIRc-9cf5cb2e6bd609b3f3e39cf36af6afe2.jpg", "Walk-in closet at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/yhroBk3gxUK5W2tG5lGYLMmjml4D7jfGuOwoVlb4-86483869e0ee3dcf558662331076f1cf.jpg", "Closet shelving at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/eu5ebg5SlnMnVcP7INEbgqkuU3nZVriYwrzD2Qli-41c196a1699c83b9f14d1cbae0ac7e5c.jpg", "Closet storage at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/TMM2661N1E0F5R6k1Tk0tYRPkVy5j9PPie6JEIYj-6c3891f651ca7d152c49aa09f3917a32.jpg", "In-unit washer and dryer at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/DMkvlsO0ESC2qFN1kqtUVoBQpFf8SxWveRv9mOFg-af5618b6a8ee167442f0aaf1cc35c27f.jpg", "Apartment balcony at Dominion at Mercer Crossing", "Interior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/Y1VNLDAc63Erq0wL6Bs81GrY3cdQDyNyNB3UpgE8-839f70d3dcadf4b56fd9ac9fa3c72c99.jpg", "Pool courtyard at Dominion at Mercer Crossing", "Pool"],
  ["https://dominionatmercercrossing.com/assets/images/cache/KsmHI0b7VEcFC4nATV09UrsOIeK0lfGe9Yr0SuOd-6f991d6a9e95d679f13255f28a13bf42.jpg", "Resort-style pool at Dominion at Mercer Crossing", "Pool"],
  ["https://dominionatmercercrossing.com/assets/images/cache/cjKIKfMlEfgUqbIUpCFOTQEh9QlwzjHT8tZbqVCy-7b615d863c2e9619b0189dcf9954fdb0.jpg", "Outdoor lawn at Dominion at Mercer Crossing", "Outdoor"],
  ["https://dominionatmercercrossing.com/assets/images/cache/srAjKW4J7OpeUHGzM7HCjEFIWs9Z9CN8FSgich71-3a7b87259bceab8211d646a72d543fb3.jpg", "Pool courtyard cabana at Dominion at Mercer Crossing", "Pool"],
  ["https://dominionatmercercrossing.com/assets/images/cache/2KcFKNNaGOsjYxQo9mZcmjezOz4vsZv1p3ta9f0U-63474f29021c4d22fe0c5c63d41b3c23.jpg", "Resort-style pool courtyard at Dominion at Mercer Crossing", "Pool"],
  ["https://dominionatmercercrossing.com/assets/images/cache/SktgrWeuG1CA9LZEPkXaoHCdo4cvN5tg5SjO4q9O-1e288c10f998c9e6d409244765319b2e.jpg", "Pool and spa at Dominion at Mercer Crossing", "Pool"],
  ["https://dominionatmercercrossing.com/assets/images/cache/T7vRTBQPsX3GWMaZhhpiTfJszfnkCE5REjcC4DAX-b7d1ad8f655699613db7fcaf5d26b490.jpg", "Pool surrounded by apartment buildings at Dominion at Mercer Crossing", "Pool"],
  ["https://dominionatmercercrossing.com/assets/images/cache/BttGEe1SNMktzPS2cUWdbuVHYdY71MCTvAakOJGb-6f4800d93b146b415afa0a2445a5d614.jpg", "Poolside lounge cabana at Dominion at Mercer Crossing", "Pool"],
  ["https://dominionatmercercrossing.com/assets/images/cache/IGO914PalTPBhqiI19zxx79zRqWb6BUMiUfHYHqZ-90d46eeca0ac6d4e6e84ebbcaaa239b6.jpg", "Covered outdoor lounge at Dominion at Mercer Crossing", "Outdoor"],
  ["https://dominionatmercercrossing.com/assets/images/cache/A8EqZmzczpIuZmWZwtUJCELSUoNo095PvTSsLLTU-308b1ada36fe4533312eaa433a83f1a1.jpg", "Fitness center treadmills at Dominion at Mercer Crossing", "Fitness"],
  ["https://dominionatmercercrossing.com/assets/images/cache/L96KQe1NiKh4RQ7O6felQIjGYvjLA72svMuJd0EQ-099c902f113ac6c47a979a9efd6637d7.jpg", "Fitness center equipment at Dominion at Mercer Crossing", "Fitness"],
  ["https://dominionatmercercrossing.com/assets/images/cache/IccP1TarQDwjfdHxbvnuIdld6zFtFpJ5fcGrppLq-4419779fa3c8192c57f485d2dc688979.jpg", "Fitness center at Dominion at Mercer Crossing", "Fitness"],
  ["https://dominionatmercercrossing.com/assets/images/cache/yyk0T49BKwOsNCJc55XiNolO8njS8FtyiRZFiZKE-5f9d90d2dc543e93a082455d6a9dc668.jpg", "Gym equipment at Dominion at Mercer Crossing", "Fitness"],
  ["https://dominionatmercercrossing.com/assets/images/cache/91kMSPhBJZMmDZDH1C2ve6f9bi811cIxaAWKZCGu-9965c5e3dfcdc336eabfad4ad192fd35.jpg", "Resident dining room at Dominion at Mercer Crossing", "Lounge"],
  ["https://dominionatmercercrossing.com/assets/images/cache/gq32hrQetsYcRDzK4G3OHV8vifdnv3VBikmFPCQo-61b411276aaf7a5b3f27f5da298f5da2.jpg", "Resident lounge at Dominion at Mercer Crossing", "Lounge"],
  ["https://dominionatmercercrossing.com/assets/images/cache/oeF2Lkr7F8GArsyfktfkUbMCV7eoa7xEDKXo6wA8-3178548576b09e10ef060d06b2036f3b.jpg", "Resident kitchenette at Dominion at Mercer Crossing", "Lounge"],
  ["https://dominionatmercercrossing.com/assets/images/cache/uRICm2m1soo7r0gaSwmX2nbF2c1uAnt4qeH2FV2Z-46d238f25fe4edf1a52d3b114a89f484.jpg", "Resident lounge seating at Dominion at Mercer Crossing", "Lounge"],
  ["https://dominionatmercercrossing.com/assets/images/cache/LCPkOMV5sXvQez04O6aaXdMCwShQOQOb7IQTB7x4-bd78e00dd89620bd13879740ef2a0759.jpg", "Resident dining table at Dominion at Mercer Crossing", "Lounge"],
  ["https://dominionatmercercrossing.com/assets/images/cache/TSHWSBjjrKEKz1tU3jqPvFi0GdiKiYJ7rUP0kA8x-8104bd514c9fe1e2e2027fdd29f2eab2.jpg", "Lounge room with tables at Dominion at Mercer Crossing", "Lounge"],
  ["https://dominionatmercercrossing.com/assets/images/cache/q4gav8NWYTCo4rAeh2D742QoI4Dr0c7odCm3CGRc-fc0f26c7ea8790dd4d871acebd489cc0.jpg", "Apartment building exterior at Dominion at Mercer Crossing", "Exterior"],
  ["https://dominionatmercercrossing.com/assets/images/cache/Yi5b4cyM6WdBX3jddybWPV4s4ALi9XZACrV8T7Ba-71131d770587489c13960083c69da59b.jpg", "Courtyard benches at Dominion at Mercer Crossing", "Outdoor"],
  ["https://dominionatmercercrossing.com/assets/images/cache/OmSJeI2syPRhApcrrMZPH794G93jO4tWRxWAN3cB-c7b3abd6c98e621e665a1a2f0dde404f.jpg", "Resident amenity room at Dominion at Mercer Crossing", "Lounge"],
  ["https://dominionatmercercrossing.com/assets/images/cache/1Fz2iKULuHBV44LlIFpgXy0rtch5Hng75bLjvyiN-056caa49a92fc61b4eb4a872ca245a48.jpg", "Apartment building at Dominion at Mercer Crossing", "Exterior"],
];

const photos = photoSources.map(([url, alt, category], index) => ({
  id: `${PROPERTY_ID}-gallery-${String(index + 1).padStart(2, "0")}`,
  name: alt,
  category,
  url,
  alt,
}));

const existing = await getExistingProperty();
const updatedData = {
  ...existing.data,
  photos,
  image: photos[0].url,
  sourceUrl: existing.data.sourceUrl || "https://dominionatmercercrossing.com/gallery/",
  updated: "Dominion at Mercer Crossing gallery refreshed from official gallery",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      photoCount: photos.length,
      image: updatedData.image,
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
