import { properties as mockProperties } from "./mockData";


const STORAGE_KEY = "belowMarketProperties";
const CUSTOM_PROPERTIES_KEY = "belowMarketCustomProperties";

const DEFAULT_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80";

export function getStoredPropertyUpdates() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

export function getStoredCustomProperties() {
  return JSON.parse(localStorage.getItem(CUSTOM_PROPERTIES_KEY) || "[]");
}

export function getAllProperties() {
  const updates = getStoredPropertyUpdates();
  const customProperties = getStoredCustomProperties();

  const savedMockProperties = mockProperties.map((property) => ({
      ...property,
      ...(updates[property.id] || {}),
    }));

  const savedCustomProperties = customProperties.map((property) => ({
      ...property,
      ...(updates[property.id] || {}),
    }));

  return [...savedMockProperties, ...savedCustomProperties];
}

export function getAnyPropertyById(propertyId) {
  return getAllProperties().find(
    (property) => property.id === String(propertyId)
  );
}

export function updateStoredProperty(propertyId, updates) {
  const customProperties = getStoredCustomProperties();
  const customProperty = customProperties.find(
    (property) => property.id === String(propertyId)
  );

  if (customProperty) {
    const updatedCustomProperties = customProperties.map((property) =>
      property.id === String(propertyId)
        ? {
            ...property,
            ...updates,
            updated: "Just now",
          }
        : property
    );

    localStorage.setItem(
      CUSTOM_PROPERTIES_KEY,
      JSON.stringify(updatedCustomProperties)
    );

    return getAnyPropertyById(propertyId);
  }

  const savedUpdates = getStoredPropertyUpdates();

  const nextUpdates = {
    ...savedUpdates,
    [propertyId]: {
      ...(savedUpdates[propertyId] || {}),
      ...updates,
      updated: "Just now",
    },
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUpdates));

  return getAnyPropertyById(propertyId);
}

export function createStoredProperty(propertyDraft) {
  const customProperties = getStoredCustomProperties();
  const propertyId = createUniquePropertyId(propertyDraft.name);
  const property = {
    id: propertyId,
    name: propertyDraft.name,
    area: propertyDraft.area,
    manager: propertyDraft.manager,
    address: propertyDraft.address,
    city: propertyDraft.city,
    state: propertyDraft.state,
    zipcode: propertyDraft.zipcode,
    rent: propertyDraft.rent,
    marketRent: propertyDraft.marketRent,
    effectiveRent: propertyDraft.effectiveRent,
    savings: propertyDraft.savings,
    belowMarketPercent: propertyDraft.belowMarketPercent,
    status: propertyDraft.status || "Draft",
    special: propertyDraft.special,
    image: propertyDraft.image || DEFAULT_PROPERTY_IMAGE,
    floorPlans: propertyDraft.floorPlans || [],
    bedrooms: propertyDraft.bedrooms || [],
    updated: "Just now",
  };

  localStorage.setItem(
    CUSTOM_PROPERTIES_KEY,
    JSON.stringify([...customProperties, property])
  );

  return property;
}

function createUniquePropertyId(name) {
  const existingIds = new Set(getAllProperties().map((property) => property.id));
  const fallbackId = `property-${Date.now()}`;
  const baseId = slugify(name) || fallbackId;
  let propertyId = baseId;
  let suffix = 2;

  while (existingIds.has(propertyId)) {
    propertyId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return propertyId;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
