import fs from "node:fs";

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const MIRO_SOURCE_URL = "https://liveatmiro.com/";

const photos = [
  photo("miro-kitchen-01", "Interior", "Miro kitchen with stainless appliances", "https://liveatmiro.com/assets/images/cache/cyWRXeFAwWbcUUpmD6mXU0G6ZWxUEeIazxpH26D3-f9a4e0804c3c803b19592b4fd2bfebc2.jpg"),
  photo("miro-kitchen-02", "Interior", "Miro open kitchen", "https://liveatmiro.com/assets/images/cache/IQxdH2gLrmilJYFn4hB9JF1QtGjjuIxhSo7FgXfQ-f766148f4841252d76538750ac3e2d3d.jpg"),
  photo("miro-kitchen-03", "Interior", "Miro kitchen and living area", "https://liveatmiro.com/assets/images/cache/vFbLYeQXZ3rVe379tJSrCtsIPNsMNwEE7AM5tF6s-4d5a74fa0f96223bbfe39d755d5a90a2.jpg"),
  photo("miro-living-01", "Interior", "Miro living and dining area", "https://liveatmiro.com/assets/images/cache/KuM9SuG8G4o84xfCdPktC2ivHrZpFclF3MjpwroN-87607b9d0f2276bd2585c3239ba3c660.jpg"),
  photo("miro-living-02", "Interior", "Miro furnished living room", "https://liveatmiro.com/assets/images/cache/FY2QqZuQUwuRCsuK49Nfdx9Fm4zBObqrbjT6zyAY-e1676f17b4df3a5ee3f8566336d34302.jpg"),
  photo("miro-living-03", "Interior", "Miro living room with natural light", "https://liveatmiro.com/assets/images/cache/rN4XfwilHPSeC2mwI86C1oAizwaj0JZnTjAu50uj-168015fb2ca98fa70777addd2a2d031f.jpg"),
  photo("miro-bedroom-01", "Bedroom", "Miro bedroom", "https://liveatmiro.com/assets/images/cache/5abwF5IcltE2bYYj0LwXqzsjXQlz4EeEXKvfULdr-e49810f45b03cd53b971a7e0ebd5164e.jpg"),
  photo("miro-bathroom-01", "Bathroom", "Miro bathroom", "https://liveatmiro.com/assets/images/cache/igLCHs0DeR5rOdaRunHF9SimNu2JsEpuDiF3IQxN-27e649e5d2526ac87de2da0420e47067.jpg"),
  photo("miro-laundry-01", "Interior", "Miro in-home laundry", "https://liveatmiro.com/assets/images/cache/TlL2IeKSMfJehDATvUDYRFetBDJU51WeK73lmEKz-086523abf41253de8107060e8da1e4a0.jpg"),
  photo("miro-closet-01", "Interior", "Miro closet storage", "https://liveatmiro.com/assets/images/cache/fpCm86MTRM7JV98KEJPEjlmxRqWBxYlMAZe2xb3r-2a42a361fe70cb71cf3f9d6d35a2e265.jpg"),
  photo("miro-balcony-01", "Outdoor", "Miro private balcony", "https://liveatmiro.com/assets/images/cache/GQIAMyzKHUTfEajiiZUOwuiuoAewJaNW8v5QAhbY-4a7433536fb30afa7c6f0eef142948fa.jpg"),
  photo("miro-balcony-02", "Outdoor", "Miro balcony seating", "https://liveatmiro.com/assets/images/cache/yziigAm2Sz3oWKNgVFiBejcJXfA24xlZ1pYmqSZB-37aae8a257b047b8193f94716f5c182c.jpg"),
  photo("miro-pool-01", "Pool", "Miro pool deck", "https://liveatmiro.com/assets/images/cache/ZY8s1pdFsI8dLxdnwyF36VClMg5Vp2gEV0ckya2E-c26004a5ebae3085f245975734614b4f.jpg"),
  photo("miro-pool-02", "Pool", "Miro resort-style pool", "https://liveatmiro.com/assets/images/cache/88Oe0ZNNE65tnMJzISKuvvTsOkSBGuZ0YtFe4Tg9-e8f7e56c4d268d28319d389fe9fc067c.jpg"),
  photo("miro-pool-03", "Pool", "Miro pool and cabanas", "https://liveatmiro.com/assets/images/cache/1H330UkhsiVr66iRkT2FPw810IMareSmHJqKdhSb-4dc467f9b1f21b9dc957460b7e84b7ea.jpg"),
  photo("miro-spa-01", "Pool", "Miro hot tub", "https://liveatmiro.com/assets/images/cache/7iHveVxSu1jJ5qgCGx9S4IrUNHPKFZIdpUGgLyB5-29132a80275b31ee66b32cc12512c925.jpg"),
  photo("miro-grill-01", "Outdoor", "Miro grilling area", "https://liveatmiro.com/assets/images/cache/uZvIorrSqpoiDq3LbYngyNXl5mP6uR2j0hCnaEwk-c308ec196787979796b359634290ca8c.jpg"),
  photo("miro-fitness-01", "Fitness", "Miro fitness center", "https://liveatmiro.com/assets/images/cache/xySS59KU7CVspd1XQz1Y2cPXCORYR1vqLXAzcEk4-9dc2a7d0af582fa1f714cb7b477d7ba3.jpg"),
  photo("miro-fitness-02", "Fitness", "Miro gym equipment", "https://liveatmiro.com/assets/images/cache/YZutpAbznfvPPlJZPnTzu4FGQGBVaRDwvkCoCtda-c0491d174020bba9f4fcb5dec4900dc8.jpg"),
  photo("miro-yoga-01", "Fitness", "Miro yoga and fitness room", "https://liveatmiro.com/assets/images/cache/7F7IABjB85DLIDv7XmvK9J6rWxXhYDOVwOpXp8Lu-9683ee3452b290fb8e16f53563a22122.jpg"),
  photo("miro-lounge-01", "Clubhouse", "Miro amenity kitchen", "https://liveatmiro.com/assets/images/cache/mkNceT2hryFrBZcGaGVGq2AQyyDIdP6bDVXkqEoM-e6c0951ffa1682e4106e2f103e2e0941.jpg"),
  photo("miro-lounge-02", "Clubhouse", "Miro resident lounge", "https://liveatmiro.com/assets/images/cache/E3x0P2KMiQxGWoauMPoEzzT8NpV89VtX5hDIY4V8-989130085a8e5a3d15c7c3cbd9a27cb5.jpg"),
  photo("miro-mail-01", "Amenities", "Miro mail room", "https://liveatmiro.com/assets/images/cache/dKiVLDU1ZcnQT8601bc8aSJwz5fNEd0w9f9hdp5b-1bb7cda31360ba8c4a248a0d4f298ef7.jpg"),
  photo("miro-garage-01", "Parking", "Miro attached garages", "https://liveatmiro.com/assets/images/cache/YuBmyRZecPKPq7QZ3CwGvnDHb59j6hsmuEKS23rW-8d2e25bfafd9da7b285a2dab8e1343a1.jpg"),
  photo("miro-pet-01", "Pet Friendly", "Miro pet area", "https://liveatmiro.com/assets/images/cache/ytpXS51VR2867DbLlrTFYSb4PGmNnU8iFvScgbaL-44f8a743861cf33479b01e974ab1868e.jpg"),
  photo("miro-exterior-01", "Exterior", "Miro community walkway", "https://liveatmiro.com/assets/images/cache/klBD5ELzA3tbgVFzUmTHfuvHfILMe8ZY0zysQ258-72974936c22b3e691bef6036e7fc22c2.jpg"),
  photo("miro-exterior-02", "Exterior", "Miro exterior", "https://liveatmiro.com/assets/images/cache/xtvrbgBUCFgV8DkjIM4hK6pRC1pWsHSjuvxydjga-9991749e714e11e25dfa2034ed3d221b.jpg"),
  photo("miro-exterior-03", "Exterior", "Miro community exterior", "https://liveatmiro.com/assets/images/cache/PVtqM1DaaWZ8ad7YYV4fuETz8ehzWFOGfQ33l1ag-6268e6ceae152ebb9833ba1070874adc.jpg"),
];

const floorPlans = [
  floorPlan("A1", 1, 1, 690, 1, "https://liveatmiro.com/assets/images/a1_single11.svg"),
  floorPlan("A2", 1, 1, 730, 4, "https://liveatmiro.com/assets/images/a2_single11.svg"),
  floorPlan("A3", 1, 1, 760, 1, "https://liveatmiro.com/assets/images/a3_single11.svg"),
  floorPlan("A2.1", 1, 1, 767, 0, "https://liveatmiro.com/assets/images/a2.1_single11.svg"),
  floorPlan("B1.1", 2, 2, 907, 2, "https://liveatmiro.com/assets/images/b1.1_single11.svg"),
  floorPlan("B1", 2, 2, 920, 0, "https://liveatmiro.com/assets/images/b1_single11.svg"),
  floorPlan("B2", 2, 2, 982, 0, "https://liveatmiro.com/assets/images/b2_single11.svg"),
  floorPlan("B3", 2, 2, 1072, 0, "https://liveatmiro.com/assets/images/b3_single11.svg"),
  floorPlan("B3.1", 2, 2, 1118, 0, "https://liveatmiro.com/assets/images/b3.1_single11.svg"),
  floorPlan("B3.2", 2, 2, 1160, 0, "https://liveatmiro.com/assets/images/b3.2_single11.svg"),
  floorPlan("C1", 3, 2, 1188, 0, "https://liveatmiro.com/assets/images/c1_single11.svg"),
  floorPlan("C1.1", 3, 2, 1244, 0, "https://liveatmiro.com/assets/images/c1.1_single11.svg"),
];

const property = {
  id: "miro-dallas",
  name: "Miro",
  area: "Source verification needed",
  manager: "Miro",
  managementCompany: "Miro",
  managementCompanyId: "miro",
  address: "12257 Heritage Springs Drive",
  city: "Sante Fe Springs",
  state: "CA",
  zipcode: "90670",
  latitude: 33.940439797669086,
  longitude: -118.07166400097773,
  yearBuilt: "",
  propertyClass: "",
  benchmarkClass: "",
  rent: "Contact",
  startingRent: "Contact",
  effectiveRent: "",
  monthlyConcession: "",
  savings: "",
  belowMarketPercent: "",
  bedrooms: ["1 bd", "2 bd", "3 bd"],
  status: "Draft",
  special: "No verified special published in source data",
  image: photos[0].url,
  photos,
  floorPlans,
  amenities: [
    "Energy-efficient stainless-steel appliances",
    "Attached garages",
    "Gas range",
    "Electric car charging stations",
    "Hardwood flooring",
    "Fitness area with free weights",
    "High ceilings",
    "Grilling area",
    "In-home washer/dryer",
    "On-site management",
    "Nest thermostat",
    "Pool area",
    "Pool spa",
    "Patio/balcony",
    "Spacious closets",
    "Privacy gates with remote access",
    "Upscale clubhouse",
  ],
  schoolDistrict: "Verify",
  schoolGrade: "Verify",
  sourceUrl: MIRO_SOURCE_URL,
  sourceNote:
    "The live Miro source located during verification is for Sante Fe Springs, CA, not Dallas. Pricing is not published in the official structured data, so this record is kept Draft until the correct Dallas Miro source/pricing is verified.",
  updated: "Verified Miro source data imported from liveatmiro.com",
};

await upsertManagementCompany(property);
await upsertProperty(property);

console.log(
  `Updated ${property.id}: ${property.status}, ${property.floorPlans.length} floor plans, ${property.photos.length} photos`
);

function floorPlan(name, bedrooms, bathrooms, sqft, availableCount, image) {
  const id = slugify(name);
  const availableText = availableCount > 0 ? `${availableCount} available` : "Unavailable";
  const units = availableCount > 0
    ? Array.from({ length: availableCount }).map((_, index) => ({
        id: `${id}-unit-${index + 1}`,
        unit: availableCount === 1 ? "Available unit" : `Available unit ${index + 1}`,
        rent: "Contact for pricing",
        available: availableText,
        status: "available",
        currentSpecial: "",
        freeWeeks: 0,
        leaseTermMonths: 12,
        image,
      }))
    : [
        {
          id: `${id}-unavailable-unit`,
          unit: "Unavailable unit",
          rent: "Contact for pricing",
          available: "Currently unavailable",
          status: "unavailable",
          currentSpecial: "",
          freeWeeks: 0,
          leaseTermMonths: 12,
          image,
        },
      ];

  return {
    id,
    name,
    bedrooms,
    beds: bedrooms,
    bedroomLabel: `${bedrooms} bd`,
    bathrooms,
    baths: bathrooms,
    squareFeet: sqft,
    sqft,
    startingRent: "",
    rent: "Contact for pricing",
    totalMonthlyRent: "",
    effectiveRent: "",
    effectiveRentNumber: 0,
    monthlyConcession: "",
    savings: "",
    belowMarketPercent: "",
    currentSpecial: "",
    special: null,
    freeWeeks: 0,
    leaseTermMonths: 12,
    availability: availableText,
    available: availableText,
    availableDate: "",
    status: availableCount > 0 ? "available" : "unavailable",
    image,
    photos: [{ id: `${id}-image`, name: `${name} floor plan`, category: "Floor plan", url: image }],
    availableUnits: units,
  };
}

function photo(id, category, alt, url) {
  return {
    id,
    name: alt,
    category,
    url,
    alt,
  };
}

async function upsertManagementCompany(propertyData) {
  await supabaseFetch("/rest/v1/management_companies?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: propertyData.managementCompanyId,
      name: propertyData.managementCompany,
      contact_name: "",
      phone: "",
      email: "",
      data: {
        id: propertyData.managementCompanyId,
        name: propertyData.managementCompany,
      },
      updated_at: new Date().toISOString(),
    }),
  });
}

async function upsertProperty(propertyData) {
  await supabaseFetch("/rest/v1/properties?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: propertyData.id,
      name: propertyData.name,
      status: propertyData.status,
      city: propertyData.city,
      state: propertyData.state,
      zipcode: propertyData.zipcode,
      management_company_id: propertyData.managementCompanyId,
      data: propertyData,
      updated_at: new Date().toISOString(),
    }),
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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
        const value = line
          .slice(separatorIndex + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        return [key, value];
      })
  );
}
