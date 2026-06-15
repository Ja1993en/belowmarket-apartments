const SAVED_PROPERTIES_KEY = "bmaSavedPropertyIds";
const COMPARE_PROPERTIES_KEY = "bmaComparePropertyIds";
const COMPARE_FLOOR_PLANS_KEY = "bmaCompareFloorPlanItems";
export const MAX_COMPARE_PROPERTIES = 4;
export const MAX_COMPARE_FLOOR_PLANS = 5;

export function getSavedPropertyIds() {
  return readStoredIds(SAVED_PROPERTIES_KEY);
}

export function getComparePropertyIds() {
  return readStoredIds(COMPARE_PROPERTIES_KEY);
}

export function getCompareFloorPlanItems() {
  return readStoredItems(COMPARE_FLOOR_PLANS_KEY).filter(
    (item) => item.propertyId && item.floorPlanId
  );
}

export function toggleSavedPropertyId(propertyId) {
  return toggleStoredId(SAVED_PROPERTIES_KEY, propertyId);
}

export function toggleComparePropertyId(propertyId) {
  return toggleStoredId(COMPARE_PROPERTIES_KEY, propertyId, MAX_COMPARE_PROPERTIES);
}

export function removeComparePropertyId(propertyId) {
  const nextIds = getComparePropertyIds().filter((id) => id !== propertyId);
  writeStoredIds(COMPARE_PROPERTIES_KEY, nextIds);
  return nextIds;
}

export function toggleCompareFloorPlanItem(floorPlanItem) {
  const nextItem = normalizeFloorPlanCompareItem(floorPlanItem);
  if (!nextItem) return getCompareFloorPlanItems();

  const currentItems = getCompareFloorPlanItems();
  const nextItemKey = getCompareFloorPlanItemKey(nextItem);
  const itemAlreadySaved = currentItems.some(
    (item) => getCompareFloorPlanItemKey(item) === nextItemKey
  );
  const nextItems = itemAlreadySaved
    ? currentItems.filter((item) => getCompareFloorPlanItemKey(item) !== nextItemKey)
    : currentItems.length >= MAX_COMPARE_FLOOR_PLANS
      ? currentItems
      : [nextItem, ...currentItems];

  writeStoredItems(COMPARE_FLOOR_PLANS_KEY, nextItems);
  return nextItems;
}

export function removeCompareFloorPlanItem(floorPlanItem) {
  const removeKey = getCompareFloorPlanItemKey(floorPlanItem);
  const nextItems = getCompareFloorPlanItems().filter(
    (item) => getCompareFloorPlanItemKey(item) !== removeKey
  );

  writeStoredItems(COMPARE_FLOOR_PLANS_KEY, nextItems);
  return nextItems;
}

export function getCompareFloorPlanItemKey(item) {
  return `${item.propertyId}:${item.floorPlanId}`;
}

export function clearCompareSelections() {
  writeStoredIds(COMPARE_PROPERTIES_KEY, []);
  writeStoredItems(COMPARE_FLOOR_PLANS_KEY, []);

  return {
    propertyIds: [],
    floorPlanItems: [],
  };
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

function readStoredItems(storageKey) {
  if (typeof window === "undefined") return [];

  try {
    const parsedItems = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsedItems) ? parsedItems.filter(Boolean) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function writeStoredIds(storageKey, ids) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(ids));
}

function writeStoredItems(storageKey, items) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(items));
}

function normalizeFloorPlanCompareItem(item) {
  if (!item?.propertyId || !item?.floorPlanId) return null;

  return {
    propertyId: String(item.propertyId),
    propertyName: item.propertyName || "Apartment",
    floorPlanId: String(item.floorPlanId),
    floorPlanName: item.floorPlanName || "Floor plan",
    beds: item.beds || "",
    baths: item.baths || "",
    sqft: item.sqft || "",
    rent: item.rent || "",
    effectiveRent: item.effectiveRent || "",
    special: item.special || "",
    available: item.available || "",
    image: item.image || "",
  };
}
