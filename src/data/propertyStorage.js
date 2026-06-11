import { supabase } from "./supabaseClient";

const PROPERTY_PHOTOS_BUCKET = "property-photos";
const DEFAULT_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80";

export async function getAllProperties() {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map(mapSupabaseProperty);
}

export async function getAnyPropertyById(propertyId) {
  if (!propertyId) return null;

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", String(propertyId))
    .maybeSingle();

  if (error) throw error;

  return data ? mapSupabaseProperty(data) : null;
}

export async function createStoredProperty(propertyDraft) {
  const propertyId = await createUniquePropertyId(propertyDraft.name);
  const property = await ensureManagementCompanyForProperty(
    await preparePropertyForSupabase(propertyDraft, propertyId)
  );

  const { error } = await supabase
    .from("properties")
    .insert(toSupabasePropertyRow(property));

  if (error) throw error;

  return property;
}

export async function updateStoredProperty(propertyId, updates, options = {}) {
  const existingProperty = await getAnyPropertyById(propertyId);
  const mergedProperty = {
    ...(existingProperty || {}),
    ...updates,
    id: String(propertyId),
    updated: "Just now",
  };
  const property = await ensureManagementCompanyForProperty(
    await preparePropertyForSupabase(mergedProperty, propertyId, options)
  );

  const { error } = await supabase
    .from("properties")
    .upsert(toSupabasePropertyRow(property), { onConflict: "id" });

  if (error) throw error;

  return property;
}

export async function deleteStoredProperty(propertyId) {
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", String(propertyId));

  if (error) throw error;
}

export function getLegacyLocalPropertyCount(options = {}) {
  return getLegacyLocalProperties(options).length;
}

export async function migrateLegacyLocalPropertiesToSupabase(options = {}) {
  const legacyProperties = getLegacyLocalProperties(options);
  const migratedProperties = [];

  for (const property of legacyProperties) {
    const propertyId = property.id || slugify(property.name) || `property-${Date.now()}`;
    const savedProperty = await updateStoredProperty(propertyId, {
      ...property,
      id: propertyId,
      updated: "Migrated from browser storage",
    }, {
      uploadPhotos: true,
    });

    migratedProperties.push(savedProperty);
  }

  if (migratedProperties.length > 0) {
    const migratedIds = new Set(getMigratedLegacyPropertyIds());

    migratedProperties.forEach((property) => migratedIds.add(property.id));
    localStorage.setItem("belowMarketLegacyPropertiesMigrated", new Date().toISOString());
    localStorage.setItem(
      "belowMarketLegacyPropertiesMigratedIds",
      JSON.stringify([...migratedIds])
    );
  }

  return migratedProperties;
}

function getLegacyLocalProperties({ includeMigrated = false } = {}) {
  if (typeof localStorage === "undefined") return [];

  try {
    const customProperties = normalizeLegacyPropertyList(
      JSON.parse(localStorage.getItem("belowMarketCustomProperties") || "[]")
    );
    const propertyUpdates = normalizeLegacyPropertyUpdates(
      JSON.parse(localStorage.getItem("belowMarketProperties") || "{}")
    );
    const deletedPropertyIds = new Set(
      JSON.parse(localStorage.getItem("belowMarketDeletedProperties") || "[]")
    );
    const migratedPropertyIds = new Set(getMigratedLegacyPropertyIds());
    const propertiesById = new Map();

    customProperties.forEach((property) => {
      if (!property?.id) return;

      propertiesById.set(property.id, {
        ...property,
        ...(propertyUpdates[property.id] || {}),
      });
    });

    Object.entries(propertyUpdates).forEach(([propertyId, updates]) => {
      if (!propertiesById.has(propertyId) && updates?.name) {
        propertiesById.set(propertyId, {
          ...updates,
          id: propertyId,
        });
      }
    });

    return [...propertiesById.values()]
      .filter(
        (property) =>
          property?.id &&
          !deletedPropertyIds.has(property.id) &&
          (includeMigrated || !migratedPropertyIds.has(property.id))
      );
  } catch (error) {
    console.error("Could not read legacy local properties.", error);
    return [];
  }
}

function normalizeLegacyPropertyList(value) {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    return Object.entries(value).map(([propertyId, property]) => ({
      ...(property || {}),
      id: property?.id || propertyId,
    }));
  }

  return [];
}

function normalizeLegacyPropertyUpdates(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;

  return {};
}

function getMigratedLegacyPropertyIds() {
  if (typeof localStorage === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem("belowMarketLegacyPropertiesMigratedIds") || "[]");
  } catch {
    return [];
  }
}

async function preparePropertyForSupabase(
  propertyDraft,
  propertyId,
  { uploadPhotos = true } = {}
) {
  const photos = uploadPhotos
    ? await uploadPhotoList(propertyDraft.photos || [], {
      propertyId,
      folder: "gallery",
    })
    : sanitizeStoredPhotoList(propertyDraft.photos || []);
  const floorPlans = await Promise.all(
    (propertyDraft.floorPlans || []).map(async (floorPlan, index) => {
      const floorPlanId = floorPlan.id || `floor-plan-${index + 1}`;
      const floorPlanPhotos = uploadPhotos
        ? await uploadPhotoList(floorPlan.photos || [], {
          propertyId,
          folder: `floor-plans/${floorPlanId}`,
        })
        : sanitizeStoredPhotoList(floorPlan.photos || []);

      return {
        ...floorPlan,
        id: floorPlanId,
        photos: floorPlanPhotos,
        image:
          getPhotoImageUrl(floorPlanPhotos[0]) ||
          getStoredImageUrl(floorPlan.image) ||
          "",
      };
    })
  );

  return {
    id: String(propertyId),
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
    image:
      getPhotoImageUrl(photos[0]) ||
      getStoredImageUrl(propertyDraft.image) ||
      DEFAULT_PROPERTY_IMAGE,
    photos,
    floorPlans,
    bedrooms: propertyDraft.bedrooms || [],
    schoolDistrict: propertyDraft.schoolDistrict,
    schoolGrade: propertyDraft.schoolGrade,
    schoolNote: propertyDraft.schoolNote,
    schools: propertyDraft.schools || [],
    updated: "Just now",
  };
}

function toSupabasePropertyRow(property) {
  return {
    id: property.id,
    name: property.name || "",
    status: property.status || "Draft",
    city: property.city || "",
    state: property.state || "",
    zipcode: property.zipcode || "",
    management_company_id: property.managementCompanyId || null,
    data: property,
    updated_at: new Date().toISOString(),
  };
}

function mapSupabaseProperty(row) {
  const data = row.data || {};

  return {
    ...data,
    id: row.id,
    name: data.name || row.name || "",
    status: data.status || row.status || "Draft",
    city: data.city || row.city || "",
    state: data.state || row.state || "",
    zipcode: data.zipcode || row.zipcode || "",
    managementCompanyId: data.managementCompanyId || row.management_company_id || "",
  };
}

async function ensureManagementCompanyForProperty(property) {
  const managementCompanyName = String(
    property.managementCompany || property.manager || ""
  ).trim();
  const managementCompanyId =
    String(property.managementCompanyId || "").trim() ||
    (managementCompanyName ? slugify(managementCompanyName) : "");

  if (!managementCompanyId) {
    return {
      ...property,
      managementCompanyId: "",
    };
  }

  const managementCompany = {
    id: managementCompanyId,
    name: managementCompanyName || humanizeSlug(managementCompanyId),
    contactName: "",
    phone: "",
    email: "",
  };

  const { error } = await supabase.from("management_companies").upsert(
    {
      id: managementCompany.id,
      name: managementCompany.name,
      contact_name: managementCompany.contactName,
      phone: managementCompany.phone,
      email: managementCompany.email,
      data: managementCompany,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    console.warn(
      "Management company could not be linked. The property will still be saved.",
      error
    );

    return {
      ...property,
      managementCompanyId: "",
    };
  }

  return {
    ...property,
    managementCompanyId,
    managementCompany: managementCompany.name,
  };
}

function sanitizeStoredPhotoList(photos) {
  return photos
    .map((photo) => sanitizePhoto(photo, getStoredImageUrl(getPhotoImageUrl(photo))))
    .filter((photo) => getPhotoImageUrl(photo));
}

async function uploadPhotoList(photos, options) {
  const uploadedPhotos = await Promise.all(
    photos.map((photo, index) => uploadPhoto(photo, index, options))
  );

  return uploadedPhotos.filter((photo) => getPhotoImageUrl(photo));
}

async function uploadPhoto(photo, index, options) {
  const photoUrl = getPhotoImageUrl(photo);
  const cleanPhoto = sanitizePhoto(photo, photoUrl);

  if (!photoUrl || !isDataUrl(photoUrl)) {
    return cleanPhoto;
  }

  try {
    const response = await fetch(photoUrl);
    const blob = await response.blob();
    const extension = getFileExtension(blob.type, photo.name);
    const fileName = `${String(index + 1).padStart(2, "0")}-${Date.now()}-${slugify(
      photo.name || "photo"
    )}.${extension}`;
    const filePath = `${options.propertyId}/${options.folder}/${fileName}`;

    const { error } = await supabase.storage
      .from(PROPERTY_PHOTOS_BUCKET)
      .upload(filePath, blob, {
        cacheControl: "31536000",
        contentType: blob.type || "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.warn(
        "Property photo upload skipped. Create the property-photos bucket to save uploaded images.",
        error
      );

      return sanitizePhoto(photo, "");
    }

    const { data } = supabase.storage
      .from(PROPERTY_PHOTOS_BUCKET)
      .getPublicUrl(filePath);

    return {
      ...cleanPhoto,
      url: data.publicUrl,
      storagePath: filePath,
      storedSize: blob.size,
    };
  } catch (error) {
    console.warn(
      "Property photo upload skipped. The property record will still be saved.",
      error
    );

    return sanitizePhoto(photo, "");
  }
}

function sanitizePhoto(photo, fallbackUrl = "") {
  return {
    id: photo?.id || `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: photo?.name || "Property photo",
    category: photo?.category || "Property",
    url: fallbackUrl,
    originalSize: photo?.originalSize,
    storedSize: photo?.storedSize,
    storagePath: photo?.storagePath,
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

function getStoredImageUrl(imageUrl) {
  if (!imageUrl || isDataUrl(imageUrl)) return "";

  return imageUrl;
}

function isDataUrl(value) {
  return String(value || "").startsWith("data:");
}

async function createUniquePropertyId(name) {
  const fallbackId = `property-${Date.now()}`;
  const baseId = slugify(name) || fallbackId;
  const { data, error } = await supabase.from("properties").select("id");

  if (error) throw error;

  const existingIds = new Set((data || []).map((property) => property.id));
  let propertyId = baseId;
  let suffix = 2;

  while (existingIds.has(propertyId)) {
    propertyId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return propertyId;
}

function getFileExtension(contentType, fileName = "") {
  const fileExtension = String(fileName).split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "webp"].includes(fileExtension)) {
    return fileExtension === "jpeg" ? "jpg" : fileExtension;
  }

  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";

  return "jpg";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function humanizeSlug(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}
