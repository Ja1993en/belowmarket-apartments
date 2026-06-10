import { inferPropertyBenchmarkClass } from "./propertyClassification";

const MARKET_RENT_BENCHMARKS = [
  {
    city: "Dallas",
    state: "TX",
    zipcode: "75252",
    areaName: "Far North Dallas",
    rents: {
      studio: 1125,
      "1": 1425,
      "2": 1875,
      "3": 2450,
    },
  },
  {
    city: "Dallas",
    state: "TX",
    zipcode: "75206",
    areaName: "The Village / East Dallas",
    rents: {
      studio: 1375,
      "1": 1725,
      "2": 2325,
      "3": 3100,
    },
  },
  {
    city: "Dallas",
    state: "TX",
    zipcode: "75231",
    areaName: "Lake Highlands",
    rents: {
      studio: 1125,
      "1": 1450,
      "2": 1950,
      "3": 2525,
    },
  },
  {
    city: "Dallas",
    state: "TX",
    zipcode: "75287",
    areaName: "North Dallas / Addison",
    rents: {
      studio: 1225,
      "1": 1550,
      "2": 2050,
      "3": 2700,
    },
  },
  {
    city: "Dallas",
    state: "TX",
    zipcode: "75205",
    areaName: "Park Cities / Knox",
    rents: {
      studio: 1675,
      "1": 2250,
      "2": 3150,
      "3": 4200,
    },
  },
  {
    city: "Dallas",
    state: "TX",
    zipcode: "75204",
    areaName: "Uptown / Old East Dallas",
    rents: {
      studio: 1500,
      "1": 1950,
      "2": 2825,
      "3": 3850,
    },
  },
  {
    city: "Dallas",
    state: "TX",
    zipcode: "75201",
    areaName: "Downtown Dallas",
    rents: {
      studio: 1475,
      "1": 1900,
      "2": 2800,
      "3": 3800,
    },
  },
  {
    city: "Dallas",
    state: "TX",
    zipcode: "75219",
    areaName: "Oak Lawn",
    rents: {
      studio: 1450,
      "1": 1850,
      "2": 2650,
      "3": 3600,
    },
  },
];

const CLASS_MULTIPLIERS = {
  value: 0.88,
  renovated: 1,
  luxury: 1.22,
  newConstruction: 1.32,
};

const CITY_DEFAULTS = {
  "dallas|tx": {
    city: "Dallas",
    state: "TX",
    areaName: "Dallas area",
    rents: {
      studio: 1300,
      "1": 1650,
      "2": 2250,
      "3": 2950,
    },
  },
};

export function getMarketRentBenchmark(property, floorPlan) {
  const bedroomKey = getBedroomKey(floorPlan?.beds || floorPlan?.bedrooms);
  if (!bedroomKey) return null;
  const propertyClass = inferPropertyBenchmarkClass(property);

  const zipcode = String(property?.zipcode || property?.zip || "").trim();
  const city = normalize(property?.city);
  const state = normalize(property?.state || "TX");

  const zipBenchmark = MARKET_RENT_BENCHMARKS.find(
    (benchmark) => benchmark.zipcode === zipcode && benchmark.rents[bedroomKey]
  );

  const fallbackBenchmark =
    zipBenchmark || CITY_DEFAULTS[`${city}|${state}`];

  if (!fallbackBenchmark?.rents?.[bedroomKey]) return null;
  const classMultiplier = CLASS_MULTIPLIERS[propertyClass.key] || 1;
  const adjustedMarketRent = Math.round(
    fallbackBenchmark.rents[bedroomKey] * classMultiplier
  );

  return {
    areaName: fallbackBenchmark.areaName,
    city: fallbackBenchmark.city,
    state: fallbackBenchmark.state,
    zipcode: zipBenchmark ? fallbackBenchmark.zipcode : "",
    bedroomKey,
    marketRent: adjustedMarketRent,
    propertyClassKey: propertyClass.key,
    propertyClassLabel: propertyClass.label,
    classConfidence: propertyClass.confidence,
    classReasons: propertyClass.reasons,
    confidence: zipBenchmark
      ? `${propertyClass.label}, ZIP + bedroom estimate`
      : `${propertyClass.label}, city + bedroom estimate`,
    source: "BMA feed-ready starter benchmark",
    lastUpdated: "June 2026",
  };
}

function getBedroomKey(value) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return "";
  if (normalizedValue.includes("studio")) return "studio";

  const match = normalizedValue.match(/\d+/);
  return match ? match[0] : "";
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}
