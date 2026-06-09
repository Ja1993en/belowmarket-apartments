import { getAllProperties } from "./propertyStorage";

export const FALLBACK_DALLAS_DEALS = [
  {
    id: "mirasol-park-lane",
    name: "Mirasol Park Lane",
    address: "Park Lane",
    city: "Dallas",
    state: "TX",
    zipcode: "",
    rent: "$1,953",
    startingRent: "$1,795",
    requiredMonthlyFees: "$158",
    effectiveRent: "$1,729",
    bedrooms: ["1 Bed"],
    savings: "$224/mo",
    special: "6 weeks free",
    latitude: 32.864,
    longitude: -96.768,
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "the-village-dallas",
    name: "The Village Dallas",
    address: "5605 Village Glen Dr",
    city: "Dallas",
    state: "TX",
    zipcode: "75206",
    rent: "$1,299 - $6,515",
    bedrooms: ["1 Bed", "2 Bed", "3 Bed"],
    savings: "$0/mo",
    special: "Special not listed",
    latitude: 32.853,
    longitude: -96.766,
    image: "https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "the-monte",
    name: "The Monte",
    address: "4909 Haverwood Ln",
    city: "Dallas",
    state: "TX",
    zipcode: "75287",
    rent: "$966 - $1,933",
    bedrooms: ["1 Bed", "2 Bed"],
    savings: "$0/mo",
    special: "Special not listed",
    latitude: 32.986,
    longitude: -96.824,
    image: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "ava-apartment-homes",
    name: "Ava Apartment Homes",
    address: "8401 Skillman St",
    city: "Dallas",
    state: "TX",
    zipcode: "75231",
    rent: "$743 - $7,857",
    bedrooms: ["Studio", "1 Bed", "2 Bed", "3 Bed"],
    savings: "$0/mo",
    special: "Special not listed",
    latitude: 32.893,
    longitude: -96.731,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  },
];

export function getPublicSearchProperties() {
  const liveProperties = getAllProperties().filter(
    (property) => property.status === "Live"
  );
  const livePropertyIds = new Set(liveProperties.map((property) => property.id));
  const fallbackProperties = FALLBACK_DALLAS_DEALS.filter(
    (property) => !livePropertyIds.has(property.id)
  ).map((property) => ({
    ...property,
    isFallback: true,
    status: "Live",
  }));

  return [...liveProperties, ...fallbackProperties];
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
  return String(value || "").trim().toLowerCase();
}
