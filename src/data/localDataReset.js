const RESET_MARKER_KEY = "belowMarketLegacyDemoDataCleared";
const RESET_VERSION = "2026-06-10-live-data-cleanup";

const LEGACY_DEMO_PROPERTY_IDS = new Set([
  "the-monroe",
  "lakeview-lofts",
  "cedar-district",
  "mirasol-park-lane",
  "junction-at-7760",
  "the-village-dallas",
  "the-monte",
  "ava-apartment-homes",
]);

const LEGACY_DEMO_PROPERTY_NAMES = new Set([
  "the monroe",
  "lakeview lofts",
  "cedar district",
  "mirasol park lane",
  "junction at 7760",
  "the village dallas",
  "the monte",
  "ava apartment homes",
]);

export function clearLegacyDemoData() {
  if (typeof window === "undefined") return;

  try {
    if (localStorage.getItem(RESET_MARKER_KEY) === RESET_VERSION) return;

    cleanPropertyStorage();
    cleanLeadStorage();
    localStorage.setItem(RESET_MARKER_KEY, RESET_VERSION);
  } catch (error) {
    console.error("Could not clear legacy demo data.", error);
  }
}

function cleanPropertyStorage() {
  const propertyUpdates = readJson("belowMarketProperties", {});
  const cleanedUpdates = Object.fromEntries(
    Object.entries(propertyUpdates).filter(
      ([propertyId]) => !LEGACY_DEMO_PROPERTY_IDS.has(propertyId)
    )
  );
  writeJson("belowMarketProperties", cleanedUpdates, {});

  const customProperties = readJson("belowMarketCustomProperties", []);
  writeJson(
    "belowMarketCustomProperties",
    customProperties.filter((property) => !isLegacyDemoProperty(property)),
    []
  );

  const deletedProperties = readJson("belowMarketDeletedProperties", []);
  writeJson(
    "belowMarketDeletedProperties",
    deletedProperties.filter(
      (propertyId) => !LEGACY_DEMO_PROPERTY_IDS.has(String(propertyId))
    ),
    []
  );
}

function cleanLeadStorage() {
  const leads = readJson("belowMarketLeads", []);
  const legacyLeadIds = new Set(
    leads.filter(isLegacyDemoLead).map((lead) => String(lead.id))
  );

  writeJson(
    "belowMarketLeads",
    leads.filter((lead) => !legacyLeadIds.has(String(lead.id))),
    []
  );

  const tourRequests = readJson("belowMarketTourRequests", []);
  writeJson(
    "belowMarketTourRequests",
    tourRequests.filter(
      (request) =>
        !legacyLeadIds.has(String(request.leadId)) &&
        !LEGACY_DEMO_PROPERTY_IDS.has(String(request.propertyId))
    ),
    []
  );

  const leadActivities = readJson("belowMarketLeadActivities", []);
  writeJson(
    "belowMarketLeadActivities",
    leadActivities.filter(
      (activity) => !legacyLeadIds.has(String(activity.leadId))
    ),
    []
  );
}

function isLegacyDemoProperty(property) {
  return (
    LEGACY_DEMO_PROPERTY_IDS.has(String(property?.id)) ||
    LEGACY_DEMO_PROPERTY_NAMES.has(normalizeValue(property?.name))
  );
}

function isLegacyDemoLead(lead) {
  const email = normalizeValue(lead?.email);
  const name = normalizeValue(lead?.name);

  return (
    email.endsWith("@example.com") ||
    name === "test renter" ||
    String(lead?.source || "").toLowerCase() === "test data" ||
    (lead?.recommendedPropertyIds || []).some((propertyId) =>
      LEGACY_DEMO_PROPERTY_IDS.has(String(propertyId))
    )
  );
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function readJson(key, fallbackValue) {
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallbackValue));
}

function writeJson(key, value, emptyValue) {
  if (JSON.stringify(value) === JSON.stringify(emptyValue)) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}
