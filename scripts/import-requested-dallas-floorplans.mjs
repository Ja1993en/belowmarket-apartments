import fs from "node:fs";

const WEEKS_PER_MONTH = 4;
const LEASE_TERM_MONTHS = 12;

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const requestedProperties = [
  buildMaaCathedralArts(),
  buildCortlandOnMckinney(),
  buildDraftProperty({
    id: "cedar-at-the-branch",
    name: "Cedar at the Branch",
    address: "4606 Amesbury Dr",
    city: "Dallas",
    state: "TX",
    zipcode: "75206",
    special: "6 weeks free",
    area: "East Dallas",
    sourceNote:
      "Draft placeholder added from the requested address and special. Publish after verified floor-plan pricing is available.",
  }),
  buildDraftProperty({
    id: "miro-dallas",
    name: "Miro",
    address: "2225 N Harwood St",
    city: "Dallas",
    state: "TX",
    zipcode: "75201",
    special: "3 weeks free",
    area: "Harwood District",
    managementCompany: "Harwood International",
    sourceNote:
      "Draft placeholder added from the requested address and special. Publish after verified Dallas Miro floor-plan pricing is available.",
  }),
];

for (const property of requestedProperties) {
  await upsertManagementCompany(property);
  const existing = await getExistingProperty(property.id);
  const mergedProperty = mergeProperty(existing, property);

  await upsertProperty(mergedProperty);
  console.log(
    `${mergedProperty.status}: ${mergedProperty.name} (${mergedProperty.floorPlans.length} floor plans)`
  );
}

function buildMaaCathedralArts() {
  const photos = [
    "https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-hero/maa-cathedral-arts-resort-style-pool-close-up-main.jpg?h=628&iar=0&w=493",
    "https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-resort-style-pool-aeriel.jpg?h=2467&iar=0&w=3840",
    "https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-coworking-spaces.jpg?h=2467&iar=0&w=3840",
    "https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-rooftop-lounge.jpg?h=2467&iar=0&w=3840",
    "https://edge.sitecorecloud.io/midamericaa7861-test603e-prod9e24-2f78/media/project/maac/maac_com/texas/dallas/properties/maa-cathedral-arts/property-gallery/maa-cathedral-arts-clubhouse-coworking-spaces-wide-angle.jpg?h=2467&iar=0&w=3840",
  ];

  const floorPlans = [
    maaFloorPlan("S1", "S1 0x1 507 SF", 0, 1, 507, 1218, 1288, 2, 0, "", "06/10/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/S1A Light.png"),
    maaFloorPlan("S2", "S2 0x1 542 SF", 0, 1, 542, 1338, 1338, 1, 0, "", "08/05/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/S2 Light.png"),
    maaFloorPlan("A2", "A2 1x1 674 SF", 1, 1, 674, 1653, 1848, 7, 4, "Lease Now for 4 weeks free", "06/15/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A2 Light.png"),
    maaFloorPlan("A3", "A3 1x1 701 SF", 1, 1, 701, 1683, 1783, 7, 4, "Lease Now for 4 weeks free", "06/23/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A3 Light.png"),
    maaFloorPlan("A5", "A5 1x1 801 SF", 1, 1, 801, 1838, 1923, 3, 6, "Lease Now for 6 weeks free", "06/12/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A5 Light.png"),
    maaFloorPlan("A6", "A6 1x1 902 SF", 1, 1, 902, 2063, 2063, 1, 4, "Lease Now for 4 weeks free", "08/26/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A6 Light.png"),
    maaFloorPlan("A8", "A8 1x1 1046 SF", 1, 1, 1046, 2178, 2178, 1, 4, "Lease Now for 4 weeks free", "07/15/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/A8 Light.png"),
    maaFloorPlan("B1", "B1 2x2 1011 SF", 2, 2, 1011, 2158, 2273, 5, 6, "Lease Now for 6 weeks free", "05/21/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/B1 Light.png"),
    maaFloorPlan("B3", "B3 2x2 1209 SF", 2, 2, 1209, 2293, 2598, 5, 6, "Lease Now for 6 weeks free", "03/24/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/B3 Light.png"),
    maaFloorPlan("B4", "B4 2x2 1388 SF", 2, 2, 1388, 2608, 2608, 1, 8, "Lease Now for 8 weeks free", "06/26/2026", "https://cdngeneralcf.rentcafe.com/dmslivecafe/3/1839724/B4 Light.png"),
  ];

  return propertyRecord({
    id: "maa-cathedral-arts",
    name: "MAA Cathedral Arts",
    area: "Lower Greenville",
    manager: "MAA",
    managementCompany: "MAA",
    address: "5088 Ross Avenue",
    city: "Dallas",
    state: "TX",
    zipcode: "75206",
    latitude: 32.8077,
    longitude: -96.7728,
    special: "Up to 8 weeks free",
    status: "Live",
    photos,
    floorPlans,
    amenities: [
      "Clubhouse",
      "24/hr Fitness Center",
      "In unit laundry",
      "Two sparkling pools with sun deck",
      "Sky lounge with city views",
      "Two pet spas",
      "Controlled access buildings",
      "EV charging station",
      "Coworking spaces",
      "Yoga studio",
    ],
    sourceUrl: "https://www.maac.com/texas/dallas/maa-cathedral-arts/",
  });
}

function buildCortlandOnMckinney() {
  const floorPlans = [
    cortlandFloorPlan("7803", "The Akard", 1, 1, 1065, 2880, "Available Now", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A1-Akard-Copy-ca56b696073d0894f438bba5705b6e8c.jpg"),
    cortlandFloorPlan("7864", "The Caroline", 1, 1, 1119, 3155, "Available Now", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A2-Caroline-Copy-866a7fffa2d907b9d3efbbcef89c0f14.jpg"),
    cortlandFloorPlan("7816", "The Cedar Springs", 1, 1, 1196, 3190, "Available Now", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A3-Cedar-Springs-Copy-880e58b0b94b3ec41714bc009e6a3c99.jpg"),
    cortlandFloorPlan("7806", "The Harwood", 1, 1, 1253, 0, "Currently Unavailable", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A4-Harwood-Copy-e7a90fa16267854a25785d4703147f90.jpg"),
    cortlandFloorPlan("7810", "The Olive", 1, 1, 2616, 0, "Currently Unavailable", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_1x1-A8-Olive-Copy-5c2bc3e74451f7eb8648bb8c7da8ab46.jpg"),
    cortlandFloorPlan("7811", "The Pearl", 2, 2, 1487, 3674, "Available starting 7/27", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_2x2-B1-Pearl-Copy-55579a23df6b118e4631e55184b7a5c6.jpg"),
    cortlandFloorPlan("7812", "The Ross", 2, 2, 1673, 4099, "Available Now", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_2x2-B2-Ross-Copy-26c1fad0928983b9f9d7632645a6a17c.jpg"),
    cortlandFloorPlan("7813", "The St. Paul", 2, 2, 1911, 0, "Currently Unavailable", "https://cortland.com/assets/images/cache/CortlandOnMckinney_1900MckinneyAve_II-12040322_3DF_2x2-B3-St.-Paul-Copy-36fbaab784464e45af7ae6dd614c529f.jpg"),
  ];

  return propertyRecord({
    id: "cortland-on-mckinney",
    name: "Cortland on McKinney",
    area: "Uptown Dallas",
    manager: "Cortland",
    managementCompany: "Cortland",
    address: "1900 McKinney Ave",
    city: "Dallas",
    state: "TX",
    zipcode: "75201",
    latitude: 32.789599,
    longitude: -96.803578,
    special: "6 weeks free",
    status: "Live",
    floorPlans,
    sourceUrl: "https://cortland.com/apartments/cortland-on-mckinney/floorplans/",
  });
}

function buildDraftProperty({
  id,
  name,
  address,
  city,
  state,
  zipcode,
  area,
  special,
  managementCompany = "",
  sourceNote,
}) {
  return propertyRecord({
    id,
    name,
    area,
    manager: managementCompany,
    managementCompany,
    address,
    city,
    state,
    zipcode,
    special,
    status: "Draft",
    floorPlans: [],
    sourceNote,
  });
}

function propertyRecord({
  id,
  name,
  area,
  manager,
  managementCompany,
  address,
  city,
  state,
  zipcode,
  latitude,
  longitude,
  special,
  status,
  photos = [],
  floorPlans,
  amenities = [],
  sourceUrl = "",
  sourceNote = "",
}) {
  const liveFloorPlans = floorPlans.filter((floorPlan) => floorPlan.status !== "unavailable");
  const availableRents = liveFloorPlans
    .map((floorPlan) => Number(floorPlan.startingRent || 0))
    .filter(Boolean);
  const bestFloorPlan = liveFloorPlans
    .filter((floorPlan) => Number(floorPlan.effectiveRentNumber || floorPlan.startingRent || 0))
    .sort(
      (first, second) =>
      Number(first.effectiveRentNumber || first.startingRent || 0) -
      Number(second.effectiveRentNumber || second.startingRent || 0)
    )[0];
  const bedroomCounts = floorPlans.map((floorPlan) => Number(floorPlan.bedrooms || 0));
  const hasStudio = bedroomCounts.includes(0) && floorPlans.length > 0;
  const maxBedrooms = bedroomCounts.length ? Math.max(...bedroomCounts, 0) : 0;

  return {
    id,
    name,
    area,
    manager,
    managementCompany,
    managementCompanyId: managementCompany ? slugify(managementCompany) : "",
    address,
    city,
    state,
    zipcode,
    latitude,
    longitude,
    rent: availableRents.length ? `$${Math.min(...availableRents).toLocaleString()}+` : "",
    startingRent: availableRents.length ? `$${Math.min(...availableRents).toLocaleString()}` : "",
    effectiveRent: bestFloorPlan?.effectiveRent || "",
    monthlyConcession: bestFloorPlan?.monthlyConcession || "",
    savings: bestFloorPlan?.savings || "",
    belowMarketPercent: bestFloorPlan?.belowMarketPercent || "",
    bedrooms: maxBedrooms || hasStudio ? bedroomRange(maxBedrooms, hasStudio) : [],
    status,
    special,
    image: photos[0]?.url || bestFloorPlan?.image || "",
    photos,
    floorPlans,
    amenities,
    schoolDistrict: "Dallas ISD",
    schoolGrade: "Verify",
    sourceUrl,
    sourceNote,
    updated: "Imported from requested floor-plan update",
  };
}

function maaFloorPlan(id, name, bedrooms, bathrooms, sqft, minRent, maxRent, availableCount, freeWeeks, label, availableDate, image) {
  const units = Array.from({ length: availableCount }).map((_, index) => ({
    id: `${id.toLowerCase()}-unit-${index + 1}`,
    unit: availableCount === 1 ? "Available unit" : `Available unit ${index + 1}`,
    rent: formatCurrency(minRent),
    available: availableDate,
    status: "available",
    currentSpecial: label,
    freeWeeks,
    leaseTermMonths: LEASE_TERM_MONTHS,
  }));

  return floorPlanRecord({
    id: id.toLowerCase(),
    name,
    bedrooms,
    bathrooms,
    sqft,
    startingRent: minRent,
    maxRent,
    availableCount,
    freeWeeks,
    specialLabel: label,
    availableDate,
    image,
    units,
  });
}

function cortlandFloorPlan(id, name, bedrooms, bathrooms, sqft, startingRent, availability, image) {
  const isUnavailable = !startingRent || /unavailable/i.test(availability);
  const availableDate = /starting/i.test(availability)
    ? availability.replace(/^Available starting\s*/i, "")
    : availability || "";

  return floorPlanRecord({
    id: slugify(name) || id,
    name,
    bedrooms,
    bathrooms,
    sqft,
    startingRent,
    maxRent: startingRent,
    availableCount: isUnavailable ? 0 : 1,
    freeWeeks: isUnavailable ? 0 : 6,
    specialLabel: isUnavailable ? "" : "6 weeks free",
    availableDate,
    image,
    status: isUnavailable ? "unavailable" : "available",
    units: isUnavailable
      ? [
          {
            id: `${slugify(name)}-unavailable-unit`,
            unit: "Unavailable unit",
            rent: "Contact for pricing",
            available: "Currently Unavailable",
            status: "unavailable",
            currentSpecial: "",
            freeWeeks: 0,
            leaseTermMonths: LEASE_TERM_MONTHS,
          },
        ]
      : [
          {
            id: `${slugify(name)}-available-unit`,
            unit: "Available unit",
            rent: formatCurrency(startingRent),
            available: availableDate || "Now",
            status: "available",
            currentSpecial: "6 weeks free",
            freeWeeks: 6,
            leaseTermMonths: LEASE_TERM_MONTHS,
          },
        ],
  });
}

function floorPlanRecord({
  id,
  name,
  bedrooms,
  bathrooms,
  sqft,
  startingRent,
  maxRent,
  availableCount,
  freeWeeks,
  specialLabel,
  availableDate,
  image,
  units,
  status = "available",
}) {
  const deal = calculateDeal(startingRent, freeWeeks);

  return {
    id,
    name,
    bedrooms,
    beds: bedrooms,
    bedroomLabel: bedrooms === 0 ? "Studio" : `${bedrooms} bd`,
    bathrooms,
    baths: bathrooms,
    squareFeet: sqft,
    sqft,
    startingRent: startingRent ? formatCurrency(startingRent) : "",
    rent: startingRent && maxRent && maxRent !== startingRent
      ? `${formatCurrency(startingRent)} - ${formatCurrency(maxRent)}`
      : startingRent
        ? formatCurrency(startingRent)
        : "Contact for pricing",
    totalMonthlyRent: startingRent ? formatCurrency(startingRent) : "",
    effectiveRent: deal.effectiveRent,
    effectiveRentNumber: deal.effectiveRentNumber,
    monthlyConcession: deal.monthlyConcession,
    savings: deal.savings,
    belowMarketPercent: deal.belowMarketPercent,
    currentSpecial: specialLabel,
    special: specialLabel
      ? {
          label: specialLabel,
          freeWeeks,
          leaseTermMonths: LEASE_TERM_MONTHS,
        }
      : null,
    freeWeeks,
    leaseTermMonths: LEASE_TERM_MONTHS,
    availability: availableCount > 0 ? `${availableCount} available` : "Unavailable",
    available: availableCount > 0 ? `${availableCount} available` : "Unavailable",
    availableDate,
    status,
    image,
    photos: image ? [{ id: `${id}-image`, name: `${name} floor plan`, category: "Floor plan", url: image }] : [],
    availableUnits: units,
  };
}

function calculateDeal(startingRent, freeWeeks) {
  if (!startingRent || !freeWeeks) {
    return {
      effectiveRent: startingRent ? formatCurrency(startingRent) : "",
      effectiveRentNumber: startingRent || 0,
      monthlyConcession: "",
      savings: "",
      belowMarketPercent: "",
    };
  }

  const freeMonths = Number(freeWeeks || 0) / WEEKS_PER_MONTH;
  const monthlyConcessionNumber = (startingRent * freeMonths) / LEASE_TERM_MONTHS;
  const effectiveRentNumber = Math.max(startingRent - monthlyConcessionNumber, 0);
  const belowMarketPercentNumber = Math.round((monthlyConcessionNumber / startingRent) * 100);

  return {
    effectiveRent: formatCurrency(effectiveRentNumber),
    effectiveRentNumber: Math.round(effectiveRentNumber),
    monthlyConcession: `${formatCurrency(monthlyConcessionNumber)}/mo`,
    savings: `${formatCurrency(monthlyConcessionNumber)}/mo`,
    belowMarketPercent: `${belowMarketPercentNumber}%`,
  };
}

function mergeProperty(existing, imported) {
  if (!existing) return imported;

  return {
    ...existing,
    ...imported,
    photos: imported.photos.length ? imported.photos : existing.photos || [],
    image: imported.image || existing.image || "",
    amenities: imported.amenities.length ? imported.amenities : existing.amenities || [],
    updated: imported.updated,
  };
}

async function getExistingProperty(propertyId) {
  const response = await supabaseFetch(`/rest/v1/properties?id=eq.${encodeURIComponent(propertyId)}&select=data`);
  const rows = await response.json();

  return rows[0]?.data || null;
}

async function upsertManagementCompany(property) {
  if (!property.managementCompanyId) return;

  await supabaseFetch("/rest/v1/management_companies?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: property.managementCompanyId,
      name: property.managementCompany,
      contact_name: "",
      phone: "",
      email: "",
      data: {
        id: property.managementCompanyId,
        name: property.managementCompany,
      },
      updated_at: new Date().toISOString(),
    }),
  });
}

async function upsertProperty(property) {
  await supabaseFetch("/rest/v1/properties?on_conflict=id", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: property.id,
      name: property.name,
      status: property.status,
      city: property.city,
      state: property.state,
      zipcode: property.zipcode,
      management_company_id: property.managementCompanyId || null,
      data: property,
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

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));
}

function bedroomRange(maxBedrooms, hasStudio) {
  const bedrooms = [];

  if (hasStudio) bedrooms.push("Studio");
  for (let bedroom = 1; bedroom <= maxBedrooms; bedroom += 1) {
    bedrooms.push(`${bedroom} bd`);
  }

  return bedrooms;
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
