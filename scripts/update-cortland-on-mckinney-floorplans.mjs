import fs from "node:fs";

const PROPERTY_ID = "cortland-on-mckinney";
const PROPERTY_NAME = "Cortland on McKinney";
const OFFICIAL_FLOORPLANS_URL = "https://cortland.com/apartments/cortland-on-mckinney/floorplans/";
const FREE_WEEKS = 6;
const LEASE_TERM_MONTHS = 12;

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const officialPageHtml = await fetchOfficialFloorplansPage();
const preload = parseCortlandPreload(officialPageHtml);
const floorPlanImagesById = extractFloorPlanImagesById(officialPageHtml);
const existing = await getExistingProperty();

const floorPlans = Object.values(preload.floorplans).map((floorPlan) =>
  buildFloorPlan(floorPlan, preload.apartments, floorPlanImagesById)
);
const availableFloorPlans = floorPlans.filter((floorPlan) => floorPlan.availableUnits.length > 0);
const availableRents = availableFloorPlans
  .map((floorPlan) => parseCurrency(floorPlan.startingRent))
  .filter((rent) => rent > 0);
const effectiveRents = availableFloorPlans
  .map((floorPlan) => floorPlan.effectiveRentNumber)
  .filter((rent) => rent > 0);
const startingRent = Math.min(...availableRents);
const effectiveRent = Math.min(...effectiveRents);
const bedrooms = [...new Set(availableFloorPlans.map((floorPlan) => floorPlan.bedroomLabel))].sort(
  sortBedroomLabels
);

const updatedData = {
  ...existing.data,
  bedrooms,
  floorPlans,
  freeWeeks: FREE_WEEKS,
  leaseTermMonths: LEASE_TERM_MONTHS,
  rent: formatCurrency(startingRent),
  startingRent: formatCurrency(startingRent),
  effectiveRent: formatCurrency(effectiveRent),
  effectiveRentNumber: effectiveRent,
  savings: formatSavings(startingRent - effectiveRent),
  special: `${FREE_WEEKS} weeks free`,
  sourceUrl: OFFICIAL_FLOORPLANS_URL,
  updated: "Cortland on McKinney floor plans refreshed from official Cortland feed",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      floorPlanCount: floorPlans.length,
      availableFloorPlanCount: availableFloorPlans.length,
      availableUnitCount: availableFloorPlans.reduce(
        (count, floorPlan) => count + floorPlan.availableUnits.length,
        0
      ),
      startingRent: updatedData.startingRent,
      effectiveRent: updatedData.effectiveRent,
      includedUnavailablePlans: floorPlans
        .filter((floorPlan) => floorPlan.status === "unavailable")
        .map((floorPlan) => floorPlan.name),
    },
    null,
    2
  )
);

async function fetchOfficialFloorplansPage() {
  const response = await fetch(OFFICIAL_FLOORPLANS_URL);

  if (!response.ok) {
    throw new Error(`Could not load official Cortland page: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseCortlandPreload(html) {
  const marker = "var preload = ";
  const start = html.indexOf(marker);

  if (start === -1) {
    throw new Error("Could not find Cortland preload floor plan data.");
  }

  const jsonStart = start + marker.length;
  const scriptEnd = html.indexOf("</script>", jsonStart);
  const rawJson = html.slice(jsonStart, scriptEnd).trim().replace(/;$/, "");
  const preload = JSON.parse(rawJson);

  if (!preload.floorplans || !preload.apartments) {
    throw new Error("Cortland preload data did not include floorplans and apartments.");
  }

  return preload;
}

function extractFloorPlanImagesById(html) {
  const imagesById = new Map();
  const favoriteRegex =
    /favorites\.toggleFavorite\('add','floorplan','[^']+','(\d+)','([^']+)'\)/g;

  for (const match of html.matchAll(favoriteRegex)) {
    const [, floorPlanId, encodedFavoriteData] = match;
    const favoriteData = JSON.parse(decodeHtml(encodedFavoriteData));

    if (favoriteData.image) {
      imagesById.set(Number(floorPlanId), favoriteData.image.replaceAll("\\/", "/"));
    }
  }

  return imagesById;
}

function buildFloorPlan(floorPlan, apartments, floorPlanImagesById) {
  const id = slugify(floorPlan.title);
  const name = cleanText(floorPlan.title);
  const bedrooms = Number(floorPlan.bedroom || 0);
  const bathrooms = Number(floorPlan.bathroom || 0);
  const squareFeet = Number(floorPlan.square_feet || 0);
  const availableUnits = (floorPlan.apartments || [])
    .map((apartmentId) => apartments[apartmentId])
    .filter(Boolean)
    .sort((firstUnit, secondUnit) => Number(firstUnit.rent_min || 0) - Number(secondUnit.rent_min || 0))
    .map((unit) => buildAvailableUnit(id, unit));
  const isAvailable = availableUnits.length > 0;
  const startingRentNumber = isAvailable
    ? Math.min(...availableUnits.map((unit) => parseCurrency(unit.rent)))
    : 0;
  const effectiveRentNumber = isAvailable ? calculateEffectiveRent(startingRentNumber) : 0;
  const monthlyConcession = isAvailable ? startingRentNumber - effectiveRentNumber : 0;
  const image = floorPlanImagesById.get(Number(floorPlan.id)) || "";

  return {
    id,
    name,
    beds: bedrooms,
    bedrooms,
    bedroomLabel: formatBedroomLabel(bedrooms),
    baths: bathrooms,
    bathrooms,
    sqft: squareFeet,
    squareFeet,
    image,
    photos: image
      ? [
          {
            id: `${id}-image`,
            url: image,
            name: `${name} floor plan`,
            category: "Floor plan",
          },
        ]
      : [],
    status: isAvailable ? "available" : "unavailable",
    available: isAvailable ? formatAvailableCount(availableUnits.length) : "Not Currently Available",
    availability: isAvailable ? formatAvailableCount(availableUnits.length) : "Not Currently Available",
    availableDate: isAvailable ? getEarliestAvailableDate(availableUnits) : "Not Currently Available",
    availableUnits,
    rent: isAvailable ? formatCurrency(startingRentNumber) : "Contact for pricing",
    startingRent: isAvailable ? formatCurrency(startingRentNumber) : "Contact for pricing",
    totalMonthlyRent: isAvailable ? formatCurrency(startingRentNumber) : "",
    effectiveRent: isAvailable ? formatCurrency(effectiveRentNumber) : "",
    effectiveRentNumber,
    savings: isAvailable ? formatSavings(monthlyConcession) : "",
    monthlyConcession: isAvailable ? formatSavings(monthlyConcession) : "",
    belowMarketPercent: isAvailable ? `${Math.round((monthlyConcession / startingRentNumber) * 100)}%` : "",
    currentSpecial: isAvailable ? `${FREE_WEEKS} weeks free` : "",
    freeWeeks: isAvailable ? FREE_WEEKS : 0,
    leaseTermMonths: LEASE_TERM_MONTHS,
    special: isAvailable
      ? {
          label: `${FREE_WEEKS} weeks free`,
          freeWeeks: FREE_WEEKS,
          leaseTermMonths: LEASE_TERM_MONTHS,
        }
      : null,
  };
}

function buildAvailableUnit(floorPlanId, unit) {
  const rent = Number(unit.rent_min || 0);
  const effectiveRent = calculateEffectiveRent(rent);
  const monthlyConcession = rent - effectiveRent;
  const availableDate = formatAvailableDate(unit.made_ready_date);

  return {
    id: `${floorPlanId}-unit-${unit.apartment_number}`,
    unit: `#${unit.apartment_number}`,
    floor: unit.floor || "",
    status: "available",
    rent: formatCurrency(rent),
    startingRent: formatCurrency(rent),
    totalMonthlyRent: formatCurrency(rent),
    effectiveRent: formatCurrency(effectiveRent),
    effectiveRentNumber: effectiveRent,
    monthlyConcession: formatSavings(monthlyConcession),
    available: availableDate,
    availableDate,
    currentSpecial: `${FREE_WEEKS} weeks free`,
    freeWeeks: FREE_WEEKS,
    leaseTermMonths: LEASE_TERM_MONTHS,
  };
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

function calculateEffectiveRent(rent) {
  return Math.round(rent - (rent * (FREE_WEEKS / 4)) / LEASE_TERM_MONTHS);
}

function getEarliestAvailableDate(availableUnits) {
  return [...availableUnits]
    .sort((firstUnit, secondUnit) => {
      const firstTime = Date.parse(firstUnit.availableDate);
      const secondTime = Date.parse(secondUnit.availableDate);
      return firstTime - secondTime;
    })
    .at(0).available;
}

function formatAvailableDate(dateValue) {
  const today = new Date("2026-06-16T00:00:00-05:00");
  const date = new Date(`${dateValue}T00:00:00-05:00`);

  if (Number.isNaN(date.getTime())) {
    return "Available Now";
  }

  if (date <= today) {
    return "Available Now";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}

function formatCurrency(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString("en-US")}`;
}

function formatSavings(value) {
  return `${formatCurrency(value)}/mo`;
}

function formatAvailableCount(count) {
  return `${count} ${count === 1 ? "available" : "available"}`;
}

function formatBedroomLabel(value) {
  if (Number(value) === 0) return "Studio";
  return `${value} bd`;
}

function sortBedroomLabels(firstLabel, secondLabel) {
  return bedroomSortValue(firstLabel) - bedroomSortValue(secondLabel);
}

function bedroomSortValue(label) {
  if (label === "Studio") return 0;
  return Number.parseInt(label, 10) || 99;
}

function parseCurrency(value) {
  const match = String(value || "").match(/\$?([\d,]+)/);
  return match ? Number(match[1].replaceAll(",", "")) : 0;
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtml(value) {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&amp;", "&")
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'");
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
