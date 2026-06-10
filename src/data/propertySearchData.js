import { getAllProperties } from "./propertyStorage";

export const DEFAULT_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80";

export function getPublicSearchProperties() {
  return getAllProperties().filter(
    (property) => property.status === "Live"
  );
}

export function getPropertySearchSuggestions(properties, query, limit = 6) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return [];

  const suggestions = new Map();

  properties.forEach((property) => {
    getSuggestionCandidates(property).forEach((candidate) => {
      const normalizedValue = normalizeSearchValue(
        `${candidate.label} ${candidate.detail || ""}`
      );

      if (!normalizedValue.includes(normalizedQuery)) return;

      const suggestionKey = `${candidate.type}:${candidate.value.toLowerCase()}`;
      const score = normalizedValue.startsWith(normalizedQuery) ? 0 : 1;
      const currentSuggestion = suggestions.get(suggestionKey);

      if (!currentSuggestion || score < currentSuggestion.score) {
        suggestions.set(suggestionKey, {
          ...candidate,
          score,
        });
      }
    });
  });

  return [...suggestions.values()]
    .sort((firstSuggestion, secondSuggestion) => {
      if (firstSuggestion.score !== secondSuggestion.score) {
        return firstSuggestion.score - secondSuggestion.score;
      }

      return firstSuggestion.label.localeCompare(secondSuggestion.label);
    })
    .slice(0, limit);
}

export function matchesPropertySearch(property, query) {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) return true;

  return normalizeSearchValue(getSearchablePropertyText(property)).includes(
    normalizedQuery
  );
}

export function getPropertyAddressLabel(property) {
  const cityStateZip = [property.city, property.state, property.zipcode]
    .filter(Boolean)
    .join(", ");
  const addressParts = [property.address, cityStateZip].filter(Boolean);

  return addressParts.join(" ") || property.area || "Dallas, TX";
}

export function hasPreciseStreetAddress(property) {
  return Boolean(
    property?.address &&
      /\d/.test(property.address) &&
      property?.city &&
      property?.state
  );
}

export function isReliableGeocodeResult(feature) {
  const relevance = Number(feature?.relevance);
  const placeTypes = feature?.place_type || [];

  return (
    Number.isFinite(relevance) &&
    relevance >= 0.8 &&
    (placeTypes.includes("address") || placeTypes.includes("poi"))
  );
}

export function getPhotoImageUrl(photo) {
  return [
    photo?.url,
    photo?.src,
    photo?.dataUrl,
    photo?.previewUrl,
    photo?.image,
  ].find(Boolean) || "";
}

export function getPropertyPrimaryImage(property) {
  const uploadedPhotoUrl = (property?.photos || [])
    .map(getPhotoImageUrl)
    .find(Boolean);

  return (
    uploadedPhotoUrl ||
    property?.image ||
    property?.imageUrl ||
    property?.photoUrl ||
    DEFAULT_PROPERTY_IMAGE
  );
}

function getSuggestionCandidates(property) {
  const cityState = [property.city, property.state].filter(Boolean).join(", ");
  const addressLabel = getPropertyAddressLabel(property);
  const specialLabels = getPropertySpecialLabels(property);
  const candidates = [
    {
      type: "Property",
      label: property.name,
      detail: addressLabel,
      value: property.name,
    },
    {
      type: "City",
      label: cityState,
      detail: property.zipcode || "",
      value: cityState,
    },
    {
      type: "Address",
      label: addressLabel,
      detail: property.name,
      value: addressLabel,
    },
    ...specialLabels.map((specialLabel) => ({
      type: "Special",
      label: specialLabel,
      detail: property.name,
      value: specialLabel,
    })),
  ];

  return candidates.filter((candidate) => candidate.label);
}

function getSearchablePropertyText(property) {
  return [
    property.name,
    property.area,
    property.manager,
    property.managementCompany,
    property.address,
    property.city,
    property.state,
    property.zipcode,
    property.special,
    ...getPropertySpecialLabels(property),
  ]
    .filter(Boolean)
    .join(" ");
}

function getPropertySpecialLabels(property) {
  const labels = [
    property.special,
    ...(property.floorPlans || []).flatMap((floorPlan) => [
      floorPlan.currentSpecial,
      floorPlan.special?.label,
      ...(floorPlan.availableUnits || []).flatMap((unit) => [
        unit.currentSpecial,
        unit.special?.label,
      ]),
    ]),
  ];

  return [
    ...new Set(
      labels
        .filter(Boolean)
        .filter((label) => label !== "Special not listed")
    ),
  ];
}

function normalizeSearchValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
