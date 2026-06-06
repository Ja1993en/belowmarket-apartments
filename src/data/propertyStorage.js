import { properties as mockProperties } from "./mockData";


const STORAGE_KEY = "belowMarketProperties";

export function getStoredPropertyUpdates() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

export function getAllProperties() {
  const updates = getStoredPropertyUpdates();

  return mockProperties.map((property) => ({
    ...property,
    ...(updates[property.id] || {}),
  }));
}

export function getAnyPropertyById(propertyId) {
  return getAllProperties().find(
    (property) => property.id === String(propertyId)
  );
}

export function updateStoredProperty(propertyId, updates) {
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