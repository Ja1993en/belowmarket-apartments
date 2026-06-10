const CURRENT_YEAR = new Date().getFullYear();

const CLASS_LABELS = {
  luxury: "Luxury benchmark",
  newConstruction: "New construction benchmark",
  renovated: "Renovated benchmark",
  value: "Value benchmark",
};

const LUXURY_KEYWORDS = [
  "concierge",
  "coworking",
  "co-working",
  "resort",
  "sky lounge",
  "clubroom",
  "package locker",
  "ev charging",
  "smart home",
  "quartz",
  "stainless",
  "wine fridge",
  "rooftop",
  "valet",
];

const RENOVATION_KEYWORDS = [
  "renovated",
  "updated",
  "upgraded",
  "modernized",
  "new appliances",
  "vinyl plank",
];

export function inferPropertyBenchmarkClass(property = {}) {
  const explicitClass = normalizeExplicitClass(
    property.propertyClass ||
      property.benchmarkClass ||
      property.assetClass ||
      property.realPage?.propertyClass ||
      property.realPage?.assetClass
  );

  if (explicitClass) {
    return createResult(explicitClass, "High", ["Provided by property feed"]);
  }

  const text = collectClassificationText(property);
  const yearBuilt = parseYear(property.yearBuilt || property.builtYear);
  const yearRenovated = parseYear(
    property.yearRenovated ||
      property.renovatedYear ||
      property.lastRenovated ||
      property.realPage?.yearRenovated
  );

  const reasons = [];
  let score = 0;

  if (yearBuilt && yearBuilt >= CURRENT_YEAR - 5) {
    score += 4;
    reasons.push(`Built ${yearBuilt}`);
  } else if (yearBuilt && yearBuilt >= CURRENT_YEAR - 12) {
    score += 2;
    reasons.push(`Newer build: ${yearBuilt}`);
  }

  if (yearRenovated && yearRenovated >= CURRENT_YEAR - 8) {
    score += 3;
    reasons.push(`Renovated ${yearRenovated}`);
  }

  const luxuryMatches = LUXURY_KEYWORDS.filter((keyword) =>
    text.includes(keyword)
  );
  const renovationMatches = RENOVATION_KEYWORDS.filter((keyword) =>
    text.includes(keyword)
  );

  if (luxuryMatches.length) {
    score += Math.min(luxuryMatches.length, 4);
    reasons.push(`Luxury signals: ${luxuryMatches.slice(0, 3).join(", ")}`);
  }

  if (renovationMatches.length) {
    score += Math.min(renovationMatches.length, 3);
    reasons.push(`Renovation signals: ${renovationMatches.slice(0, 3).join(", ")}`);
  }

  const photoCount = Number(property.photos?.length || property.photoCount || 0);
  if (photoCount >= 8) {
    score += 1;
    reasons.push("Strong photo set");
  }

  if (score >= 7 || (yearBuilt && yearBuilt >= CURRENT_YEAR - 5)) {
    return createResult("newConstruction", "Estimated", reasons);
  }

  if (score >= 5) {
    return createResult("luxury", "Estimated", reasons);
  }

  if (score >= 2 || yearRenovated) {
    return createResult("renovated", "Estimated", reasons);
  }

  return createResult("value", "Estimated", reasons.length ? reasons : ["Limited feed signals"]);
}

function createResult(key, confidence, reasons) {
  return {
    key,
    label: CLASS_LABELS[key],
    confidence,
    reasons,
  };
}

function collectClassificationText(property) {
  return [
    property.description,
    property.summary,
    property.special,
    property.propertyType,
    property.realPage?.description,
    property.realPage?.marketingDescription,
    ...(property.amenities || []),
    ...(property.communityAmenities || []),
    ...(property.apartmentAmenities || []),
    ...(property.unitFeatures || []),
    ...(property.realPage?.amenities || []),
    ...(property.realPage?.unitFeatures || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizeExplicitClass(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();
  if (!normalizedValue) return "";
  if (normalizedValue.includes("new")) return "newConstruction";
  if (normalizedValue.includes("luxury") || normalizedValue === "a" || normalizedValue === "class a") {
    return "luxury";
  }
  if (normalizedValue.includes("renovated") || normalizedValue === "b" || normalizedValue === "class b") {
    return "renovated";
  }
  if (normalizedValue.includes("value") || normalizedValue === "c" || normalizedValue === "class c") {
    return "value";
  }
  return "";
}

function parseYear(value) {
  const year = Number(String(value || "").match(/\d{4}/)?.[0]);
  return year >= 1900 && year <= CURRENT_YEAR + 2 ? year : 0;
}
