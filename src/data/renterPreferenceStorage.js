const SAVED_PROPERTIES_KEY = "bmaSavedPropertyIds";
const COMPARE_PROPERTIES_KEY = "bmaComparePropertyIds";
const MAX_COMPARE_PROPERTIES = 4;

export function getSavedPropertyIds() {
  return readStoredIds(SAVED_PROPERTIES_KEY);
}

export function getComparePropertyIds() {
  return readStoredIds(COMPARE_PROPERTIES_KEY);
}

export function toggleSavedPropertyId(propertyId) {
  return toggleStoredId(SAVED_PROPERTIES_KEY, propertyId);
}

export function toggleComparePropertyId(propertyId) {
  return toggleStoredId(COMPARE_PROPERTIES_KEY, propertyId, MAX_COMPARE_PROPERTIES);
}

function toggleStoredId(storageKey, propertyId, maxItems = Infinity) {
  const currentIds = readStoredIds(storageKey);
  const nextIds = currentIds.includes(propertyId)
    ? currentIds.filter((id) => id !== propertyId)
    : [propertyId, ...currentIds].slice(0, maxItems);

  writeStoredIds(storageKey, nextIds);
  return nextIds;
}

function readStoredIds(storageKey) {
  if (typeof window === "undefined") return [];

  try {
    const parsedIds = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsedIds) ? parsedIds.filter(Boolean) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function writeStoredIds(storageKey, ids) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(ids));
}
