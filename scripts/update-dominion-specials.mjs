import fs from "node:fs";

const PROPERTY_ID = "dominion-at-mercer-crossing";
const SPECIAL_LABEL = "6 Weeks Free";
const FREE_WEEKS = 6;
const LEASE_TERM_MONTHS = 12;
const WEEKS_PER_MONTH = 4;

const env = readEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.");
}

const existing = await getExistingProperty();
const floorPlans = (existing.data.floorPlans || []).map(updateFloorPlanSpecial);
const availableFloorPlans = floorPlans.filter((floorPlan) => isAvailableFloorPlan(floorPlan));
const bestFloorPlan = availableFloorPlans
  .filter((floorPlan) => Number(floorPlan.effectiveRentNumber || 0))
  .sort(
    (first, second) =>
      Number(first.effectiveRentNumber || 0) - Number(second.effectiveRentNumber || 0)
  )[0];

const updatedData = {
  ...existing.data,
  special: SPECIAL_LABEL,
  effectiveRent: bestFloorPlan?.effectiveRent || existing.data.effectiveRent || "",
  monthlyConcession: bestFloorPlan?.monthlyConcession || existing.data.monthlyConcession || "",
  savings: bestFloorPlan?.savings || existing.data.savings || "",
  belowMarketPercent: bestFloorPlan?.belowMarketPercent || existing.data.belowMarketPercent || "",
  sourceUrl: "https://dominionatmercercrossing.com/floorplans/",
  floorPlans,
  updated: "Dominion at Mercer Crossing floor-plan specials normalized",
};

await updateProperty(existing.id, updatedData);

console.log(
  JSON.stringify(
    {
      id: existing.id,
      floorPlanCount: floorPlans.length,
      availableSpecials: availableFloorPlans.length,
      unavailableSpecials: floorPlans.filter(
        (floorPlan) => !isAvailableFloorPlan(floorPlan) && floorPlan.special
      ).length,
      bestEffectiveRent: updatedData.effectiveRent,
      special: updatedData.special,
    },
    null,
    2
  )
);

function updateFloorPlanSpecial(floorPlan) {
  if (!isAvailableFloorPlan(floorPlan)) {
    return {
      ...floorPlan,
      currentSpecial: "",
      specialLabel: "",
      special: null,
      freeWeeks: 0,
      leaseTermMonths: LEASE_TERM_MONTHS,
      monthlyConcession: "",
      savings: "",
      belowMarketPercent: "",
    };
  }

  const rentNumber = parseCurrency(floorPlan.startingRent || floorPlan.rent);
  const deal = calculateDeal(rentNumber, FREE_WEEKS);

  return {
    ...floorPlan,
    effectiveRent: deal.effectiveRent,
    effectiveRentNumber: deal.effectiveRentNumber,
    monthlyConcession: deal.monthlyConcession,
    savings: deal.savings,
    belowMarketPercent: deal.belowMarketPercent,
    currentSpecial: SPECIAL_LABEL,
    specialLabel: SPECIAL_LABEL,
    special: {
      label: SPECIAL_LABEL,
      freeWeeks: FREE_WEEKS,
      leaseTermMonths: LEASE_TERM_MONTHS,
    },
    freeWeeks: FREE_WEEKS,
    leaseTermMonths: LEASE_TERM_MONTHS,
  };
}

function isAvailableFloorPlan(floorPlan) {
  const status = String(floorPlan.status || floorPlan.available || floorPlan.availability || "")
    .toLowerCase();

  return !status.includes("unavailable") && parseCurrency(floorPlan.startingRent || floorPlan.rent) > 0;
}

function calculateDeal(rent, freeWeeks) {
  if (!rent || !freeWeeks) {
    return {
      effectiveRent: rent ? formatCurrency(rent) : "",
      effectiveRentNumber: rent || 0,
      monthlyConcession: "",
      savings: "",
      belowMarketPercent: "",
    };
  }

  const freeMonths = Number(freeWeeks || 0) / WEEKS_PER_MONTH;
  const monthlyConcessionNumber = (rent * freeMonths) / LEASE_TERM_MONTHS;
  const effectiveRentNumber = Math.max(rent - monthlyConcessionNumber, 0);
  const belowMarketPercentNumber = Math.round((monthlyConcessionNumber / rent) * 100);

  return {
    effectiveRent: formatCurrency(effectiveRentNumber),
    effectiveRentNumber: Math.round(effectiveRentNumber),
    monthlyConcession: `${formatCurrency(monthlyConcessionNumber)}/mo`,
    savings: `${formatCurrency(monthlyConcessionNumber)}/mo`,
    belowMarketPercent: `${belowMarketPercentNumber}%`,
  };
}

function parseCurrency(value) {
  return Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)));
}

async function getExistingProperty() {
  const response = await supabaseFetch(
    `/rest/v1/properties?id=eq.${encodeURIComponent(PROPERTY_ID)}&select=id,data`
  );
  const rows = await response.json();
  const [property] = rows;

  if (!property) {
    throw new Error(`Could not find ${PROPERTY_ID} in Supabase.`);
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
