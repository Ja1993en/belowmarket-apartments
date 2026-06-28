export const DEFAULT_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80";

export function getPublicSearchProperties(properties = []) {
  return properties.filter((property) => property.status === "Live");
}

export function getPropertySearchSuggestions(properties, query, limit = 6) {
  const normalizedQuery = normalizeSearchValue(query);
  const queryTokens = getSearchTokens(query);
  if (!normalizedQuery && queryTokens.length === 0) return [];

  const suggestions = new Map();

  properties.forEach((property) => {
    getSuggestionCandidates(property).forEach((candidate) => {
      const normalizedValue = normalizeSearchValue(
        candidate.searchText || `${candidate.label} ${candidate.detail || ""}`
      );

      if (!doesSearchTextMatchQuery(normalizedValue, queryTokens, normalizedQuery)) {
        return;
      }

      if (
        (candidate.type === "Property" || candidate.type === "Area") &&
        !doesAnyTokenMatchValue(queryTokens, candidate.label)
      ) {
        return;
      }

      const suggestionKey = `${candidate.type}:${candidate.value.toLowerCase()}`;
      const score = getSuggestionScore(normalizedValue, normalizedQuery, queryTokens);
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
      const firstPriority = getSuggestionTypePriority(firstSuggestion.type);
      const secondPriority = getSuggestionTypePriority(secondSuggestion.type);

      if (firstPriority !== secondPriority) {
        return firstPriority - secondPriority;
      }

      if (firstSuggestion.score !== secondSuggestion.score) {
        return firstSuggestion.score - secondSuggestion.score;
      }

      return firstSuggestion.label.localeCompare(secondSuggestion.label);
    })
    .slice(0, limit);
}

export function matchesPropertySearch(property, query) {
  const normalizedQuery = normalizeSearchValue(query);
  const queryTokens = getSearchTokens(query);
  if (!normalizedQuery && queryTokens.length === 0) return true;

  return doesSearchTextMatchQuery(
    normalizeSearchValue(getSearchablePropertyText(property)),
    queryTokens,
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
  return getPropertyCardImage(property, 900);
}

export function getPropertyCardImage(property, width = 900) {
  const uploadedPhotoUrl = (property?.photos || [])
    .map((photo) => photo?.cardUrl || photo?.thumbnailUrl || getPhotoImageUrl(photo))
    .find(Boolean);

  return optimizePropertyImageUrl(
    property?.cardImage ||
    property?.thumbnailImage ||
    uploadedPhotoUrl ||
    property?.image ||
    property?.imageUrl ||
    property?.photoUrl ||
    DEFAULT_PROPERTY_IMAGE,
    width
  );
}

export function getFloorPlanCardImage(floorPlan, fallbackImage = "", width = 700) {
  const uploadedPhotoUrl = (floorPlan?.photos || [])
    .map((photo) => photo?.cardUrl || photo?.thumbnailUrl || getPhotoImageUrl(photo))
    .find(Boolean);

  return optimizePropertyImageUrl(
    floorPlan?.cardImage ||
    floorPlan?.thumbnailImage ||
    uploadedPhotoUrl ||
    floorPlan?.image ||
    fallbackImage,
    width
  );
}

export function getPropertyFullImage(property) {
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

export function optimizePropertyImageUrl(imageUrl, width = 900) {
  const url = String(imageUrl || "");

  if (!url) return "";

  if (url.includes("lh3.googleusercontent.com")) {
    return url.replace(/=(?:s|w|h)\d+(?:-rw)?$/i, `=s${width}-rw`);
  }

  if (url.includes("images.unsplash.com")) {
    try {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set("auto", "format");
      parsedUrl.searchParams.set("fit", parsedUrl.searchParams.get("fit") || "crop");
      parsedUrl.searchParams.set("w", String(width));
      parsedUrl.searchParams.set("q", "75");

      return parsedUrl.toString();
    } catch {
      return url;
    }
  }

  return url;
}

function getSuggestionCandidates(property) {
  const cityState = [property.city, property.state].filter(Boolean).join(", ");
  const addressLabel = getPropertyAddressLabel(property);
  const specialLabels = getPropertySpecialLabels(property);
  const managerLabel = property.managementCompany || property.manager || "";
  const candidates = [
    {
      type: "Property",
      label: property.name,
      detail: addressLabel,
      value: property.name,
      searchText: [
        property.name,
        property.area,
        property.city,
        property.state,
        property.zipcode,
      ].filter(Boolean).join(" "),
    },
    {
      type: "City",
      label: cityState,
      detail: property.zipcode || "",
      value: cityState,
      searchText: [cityState, property.city, property.state, property.zipcode]
        .filter(Boolean)
        .join(" "),
    },
    {
      type: "Area",
      label: property.area,
      detail: cityState,
      value: property.area,
      searchText: [property.area, property.city, property.state]
        .filter(Boolean)
        .join(" "),
    },
    {
      type: "ZIP",
      label: property.zipcode,
      detail: cityState || property.area || "",
      value: property.zipcode,
      searchText: property.zipcode,
    },
    {
      type: "Manager",
      label: managerLabel,
      detail: property.name,
      value: managerLabel,
      searchText: managerLabel,
    },
    ...specialLabels.map((specialLabel) => ({
      type: "Special",
      label: specialLabel,
      detail: property.name,
      value: specialLabel,
      searchText: specialLabel,
    })),
  ];

  return candidates.filter((candidate) => candidate.label);
}

function getSearchablePropertyText(property) {
  const cityState = [property.city, property.state].filter(Boolean).join(" ");
  const addressLabel = getPropertyAddressLabel(property);
  const floorPlanText = (property.floorPlans || [])
    .flatMap((floorPlan) => [
      floorPlan.name,
      floorPlan.beds,
      floorPlan.baths,
      floorPlan.sqft,
      floorPlan.rent,
      floorPlan.effectiveRent,
      floorPlan.available,
      floorPlan.status,
      floorPlan.currentSpecial,
      floorPlan.special?.label,
      ...(floorPlan.availableUnits || []).flatMap((unit) => [
        unit.unit,
        unit.rent,
        unit.available,
        unit.status,
        unit.currentSpecial,
        unit.special?.label,
      ]),
    ]);

  return [
    property.name,
    property.area,
    property.manager,
    property.managementCompany,
    property.address,
    addressLabel,
    property.city,
    cityState,
    property.state,
    property.zipcode,
    property.special,
    ...getPropertySpecialLabels(property),
    ...floorPlanText,
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
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalizeSearchAliases(normalizedValue);
}

function normalizeSearchAliases(value) {
  if (!value) return "";

  return value
    .split(" ")
    .map((token) => SEARCH_ALIASES[token] || token)
    .join(" ");
}

const SEARCH_ALIASES = {
  apartment: "apartments",
  apts: "apartments",
  apt: "apartments",
  avenue: "ave",
  boulevard: "blvd",
  drive: "dr",
  east: "e",
  freeway: "fwy",
  highway: "hwy",
  north: "n",
  parkway: "pkwy",
  place: "pl",
  road: "rd",
  south: "s",
  saint: "st",
  street: "st",
  texas: "tx",
  west: "w",
};

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "apartments",
  "apartment",
  "apt",
  "apts",
  "at",
  "for",
  "in",
  "near",
  "rent",
  "rentals",
  "the",
  "to",
]);

function getSearchTokens(query) {
  return normalizeSearchValue(query)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !SEARCH_STOP_WORDS.has(token));
}

function doesSearchTextMatchQuery(normalizedText, queryTokens, normalizedQuery) {
  if (!normalizedText) return false;

  if (normalizedQuery && normalizedText.includes(normalizedQuery)) {
    return true;
  }

  if (queryTokens.length === 0) return true;

  return queryTokens.every((token) => normalizedText.includes(token));
}

function getSuggestionScore(normalizedValue, normalizedQuery, queryTokens) {
  if (normalizedQuery && normalizedValue === normalizedQuery) return 0;
  if (normalizedQuery && normalizedValue.startsWith(normalizedQuery)) return 1;
  if (normalizedQuery && normalizedValue.includes(normalizedQuery)) return 2;

  const firstTokenIndex = queryTokens.length > 0
    ? normalizedValue.indexOf(queryTokens[0])
    : -1;

  return firstTokenIndex === 0 ? 3 : 4;
}

function getSuggestionTypePriority(type) {
  return {
    City: 0,
    Area: 1,
    Property: 2,
    ZIP: 3,
    Special: 4,
    Manager: 5,
  }[type] ?? 10;
}

function doesAnyTokenMatchValue(queryTokens, value) {
  const normalizedValue = normalizeSearchValue(value);

  if (!normalizedValue) return false;

  return queryTokens.some((token) => normalizedValue.includes(token));
}
