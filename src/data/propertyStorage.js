import {
  getManagementCompanyById,
  getManagementCompanyIdByName,
} from "./managementCompanyStorage";


const STORAGE_KEY = "belowMarketProperties";
const CUSTOM_PROPERTIES_KEY = "belowMarketCustomProperties";
const DELETED_PROPERTIES_KEY = "belowMarketDeletedProperties";
const MAX_QUOTA_SAFE_PROPERTY_PHOTOS = 4;
const MAX_QUOTA_SAFE_FLOOR_PLAN_PHOTOS = 1;
const MAX_QUOTA_SAFE_OTHER_PROPERTY_PHOTOS = 1;
const MAX_QUOTA_SAFE_PHOTO_BYTES = 140 * 1024;

const DEFAULT_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80";

export function getStoredPropertyUpdates() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
}

export function getStoredCustomProperties() {
  return JSON.parse(localStorage.getItem(CUSTOM_PROPERTIES_KEY) || "[]");
}

export function getDeletedPropertyIds() {
  return JSON.parse(localStorage.getItem(DELETED_PROPERTIES_KEY) || "[]");
}

export function getAllProperties() {
  const updates = getStoredPropertyUpdates();
  const customProperties = getStoredCustomProperties();
  const deletedPropertyIds = new Set(getDeletedPropertyIds());

  const savedCustomProperties = customProperties.filter((property) => !deletedPropertyIds.has(property.id)).map((property) => normalizePropertyCompany({
      ...property,
      ...(updates[property.id] || {}),
    }));

  return savedCustomProperties;
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

    writeCustomProperties(updatedCustomProperties, propertyId);

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

export function deleteStoredProperty(propertyId) {
  const normalizedPropertyId = String(propertyId);
  const customProperties = getStoredCustomProperties();
  const customProperty = customProperties.find(
    (property) => property.id === normalizedPropertyId
  );

  if (customProperty) {
    writeCustomProperties(
      customProperties.filter((property) => property.id !== normalizedPropertyId)
    );
  }

  const savedUpdates = getStoredPropertyUpdates();
  if (savedUpdates[normalizedPropertyId]) {
    const nextUpdates = { ...savedUpdates };
    delete nextUpdates[normalizedPropertyId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUpdates));
  }

  const deletedPropertyIds = new Set(getDeletedPropertyIds());
  deletedPropertyIds.add(normalizedPropertyId);
  localStorage.setItem(
    DELETED_PROPERTIES_KEY,
    JSON.stringify([...deletedPropertyIds])
  );
}

export function createStoredProperty(propertyDraft) {
  const customProperties = getStoredCustomProperties();
  const propertyId = createUniquePropertyId(propertyDraft.name);
  const property = {
    id: propertyId,
    name: propertyDraft.name,
    area: propertyDraft.area,
    manager: propertyDraft.manager,
    managementCompanyId: propertyDraft.managementCompanyId,
    managementCompany: propertyDraft.managementCompany,
    address: propertyDraft.address,
    city: propertyDraft.city,
    state: propertyDraft.state,
    zipcode: propertyDraft.zipcode,
    yearBuilt: propertyDraft.yearBuilt,
    yearRenovated: propertyDraft.yearRenovated,
    propertyClass: propertyDraft.propertyClass,
    benchmarkClass: propertyDraft.benchmarkClass,
    assetClass: propertyDraft.assetClass,
    realPage: propertyDraft.realPage,
    amenities: propertyDraft.amenities || [],
    communityAmenities: propertyDraft.communityAmenities || [],
    apartmentAmenities: propertyDraft.apartmentAmenities || [],
    unitFeatures: propertyDraft.unitFeatures || [],
    rent: propertyDraft.rent,
    marketRent: propertyDraft.marketRent,
    requiredMonthlyFees: propertyDraft.requiredMonthlyFees,
    effectiveRent: propertyDraft.effectiveRent,
    monthlyConcession: propertyDraft.monthlyConcession,
    savings: propertyDraft.savings,
    belowMarketPercent: propertyDraft.belowMarketPercent,
    status: propertyDraft.status || "Draft",
    special: propertyDraft.special,
    image: propertyDraft.image || DEFAULT_PROPERTY_IMAGE,
    photos: propertyDraft.photos || [],
    floorPlans: propertyDraft.floorPlans || [],
    bedrooms: propertyDraft.bedrooms || [],
    schoolDistrict: propertyDraft.schoolDistrict,
    schoolGrade: propertyDraft.schoolGrade,
    schoolNote: propertyDraft.schoolNote,
    schools: propertyDraft.schools || [],
    updated: "Just now",
  };

  writeCustomProperties([...customProperties, property], propertyId);

  return property;
}

function writeCustomProperties(properties, preferredPropertyId = "") {
  const normalizedPreferredPropertyId = String(preferredPropertyId || "");

  try {
    localStorage.setItem(CUSTOM_PROPERTIES_KEY, JSON.stringify(properties));
    return;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      throw error;
    }
  }

  const quotaSafeProperties = compactPropertiesForQuota(
    properties,
    normalizedPreferredPropertyId
  );

  try {
    localStorage.setItem(
      CUSTOM_PROPERTIES_KEY,
      JSON.stringify(quotaSafeProperties)
    );
    console.warn(
      "Property photos were compacted because browser storage is almost full."
    );
    return;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      throw error;
    }
  }

  localStorage.setItem(
    CUSTOM_PROPERTIES_KEY,
    JSON.stringify(
      quotaSafeProperties.map((property) =>
        stripPropertyPhotosForQuota(property, normalizedPreferredPropertyId)
      )
    )
  );
  console.warn(
    "Property photos were reduced because browser storage quota was exceeded."
  );
}

function compactPropertiesForQuota(properties, preferredPropertyId) {
  return properties.map((property) => {
    const isPreferredProperty = String(property.id) === preferredPropertyId;
    const maxPropertyPhotos = isPreferredProperty
      ? MAX_QUOTA_SAFE_PROPERTY_PHOTOS
      : MAX_QUOTA_SAFE_OTHER_PROPERTY_PHOTOS;

    const photos = compactPhotoList(property.photos, maxPropertyPhotos);
    const floorPlans = (property.floorPlans || []).map((floorPlan) => {
      const floorPlanPhotos = compactPhotoList(
        floorPlan.photos,
        isPreferredProperty ? MAX_QUOTA_SAFE_FLOOR_PLAN_PHOTOS : 0
      );

      return {
        ...floorPlan,
        photos: floorPlanPhotos,
        image: getPhotoImageUrl(floorPlanPhotos[0]) || getExternalImageUrl(floorPlan.image),
      };
    });

    return {
      ...property,
      photos,
      image: getPhotoImageUrl(photos[0]) || getExternalImageUrl(property.image),
      floorPlans,
    };
  });
}

function stripPropertyPhotosForQuota(property, preferredPropertyId) {
  const isPreferredProperty = String(property.id) === preferredPropertyId;
  const photos = isPreferredProperty ? compactPhotoList(property.photos, 1) : [];

  return {
    ...property,
    photos,
    image: getPhotoImageUrl(photos[0]) || getExternalImageUrl(property.image),
    floorPlans: (property.floorPlans || []).map((floorPlan) => ({
      ...floorPlan,
      photos: [],
      image: getExternalImageUrl(floorPlan.image),
    })),
  };
}

function compactPhotoList(photos = [], limit) {
  if (limit <= 0) return [];

  return photos
    .map((photo) => sanitizePhotoForQuota(photo))
    .filter((photo) => getPhotoImageUrl(photo))
    .filter((photo) => !isOversizedDataUrl(getPhotoImageUrl(photo)))
    .slice(0, limit);
}

function sanitizePhotoForQuota(photo) {
  const photoUrl = getPhotoImageUrl(photo);

  return {
    id: photo?.id,
    name: photo?.name,
    category: photo?.category,
    url: photoUrl,
    originalSize: photo?.originalSize,
    storedSize: photo?.storedSize,
  };
}

function getPhotoImageUrl(photo) {
  return [
    photo?.url,
    photo?.src,
    photo?.dataUrl,
    photo?.previewUrl,
    photo?.image,
  ].find(Boolean) || "";
}

function getExternalImageUrl(imageUrl) {
  if (!imageUrl || isDataUrl(imageUrl)) return "";

  return imageUrl;
}

function isOversizedDataUrl(value) {
  return isDataUrl(value) && getDataUrlByteSize(value) > MAX_QUOTA_SAFE_PHOTO_BYTES;
}

function isDataUrl(value) {
  return String(value || "").startsWith("data:");
}

function getDataUrlByteSize(dataUrl) {
  const base64Value = String(dataUrl).split(",")[1] || "";

  return Math.ceil((base64Value.length * 3) / 4);
}

function isQuotaExceededError(error) {
  return (
    error?.name === "QuotaExceededError" ||
    error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error?.code === 22 ||
    error?.code === 1014
  );
}

function normalizePropertyCompany(property) {
  const fallbackCompanyName = property.managementCompany || property.manager || "";
  const managementCompanyId =
    property.managementCompanyId || getManagementCompanyIdByName(fallbackCompanyName);
  const managementCompany = getManagementCompanyById(managementCompanyId);

  return {
    ...property,
    managementCompanyId,
    managementCompany: managementCompany?.name || fallbackCompanyName,
  };
}

function createUniquePropertyId(name) {
  const existingIds = new Set([
    ...getAllProperties().map((property) => property.id),
    ...getDeletedPropertyIds(),
  ]);
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
