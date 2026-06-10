import { getAllProperties } from "./propertyStorage";

export const DEFAULT_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80";

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
    mapAccuracy: "approximate",
    schoolDistrict: "Full street address needed",
    schoolGrade: "Verify",
    schools: [
      {
        level: "Elementary",
        name: "Attendance zone needed",
        grade: "Verify",
        note: "Add the full property address to confirm assigned schools.",
      },
      {
        level: "Middle",
        name: "Attendance zone needed",
        grade: "Verify",
        note: "Add the full property address to confirm assigned schools.",
      },
      {
        level: "High",
        name: "Attendance zone needed",
        grade: "Verify",
        note: "Add the full property address to confirm assigned schools.",
      },
    ],
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "junction-at-7760",
    name: "Junction at 7760",
    address: "7760 McCallum Blvd",
    city: "Dallas",
    state: "TX",
    zipcode: "75252",
    rent: "$883 - $1,116",
    startingRent: "$883 - $1,116",
    effectiveRent: "$773 - $977",
    bedrooms: ["Studio", "1 Bed"],
    savings: "$110 - $140/mo",
    special: "6 weeks free + $99 admin fee",
    latitude: 32.987165,
    longitude: -96.772025,
    schoolDistrict: "Plano ISD",
    schoolGrade: "A",
    schools: [
      {
        level: "Elementary",
        name: "Elementary school zone",
        grade: "A-",
        note: "Location-based estimate. Confirm attendance zone with Plano ISD.",
      },
      {
        level: "Middle",
        name: "Middle school zone",
        grade: "A",
        note: "Location-based estimate. Confirm attendance zone with Plano ISD.",
      },
      {
        level: "High",
        name: "High school zone",
        grade: "A-",
        note: "Location-based estimate. Confirm attendance zone with Plano ISD.",
      },
    ],
    image: "https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=900&q=80",
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
    latitude: 32.859682,
    longitude: -96.764093,
    schoolDistrict: "Dallas ISD",
    schoolGrade: "B",
    schools: [
      {
        level: "Elementary",
        name: "Elementary school zone",
        grade: "B",
        note: "Location-based estimate. Confirm attendance zone with Dallas ISD.",
      },
      {
        level: "Middle",
        name: "Middle school zone",
        grade: "B",
        note: "Location-based estimate. Confirm attendance zone with Dallas ISD.",
      },
      {
        level: "High",
        name: "High school zone",
        grade: "B-",
        note: "Location-based estimate. Confirm attendance zone with Dallas ISD.",
      },
    ],
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
    latitude: 33.006938,
    longitude: -96.820116,
    schoolDistrict: "Plano ISD",
    schoolGrade: "A",
    schools: [
      {
        level: "Elementary",
        name: "Elementary school zone",
        grade: "A-",
        note: "Location-based estimate. Confirm attendance zone with Plano ISD.",
      },
      {
        level: "Middle",
        name: "Middle school zone",
        grade: "A",
        note: "Location-based estimate. Confirm attendance zone with Plano ISD.",
      },
      {
        level: "High",
        name: "High school zone",
        grade: "A-",
        note: "Location-based estimate. Confirm attendance zone with Plano ISD.",
      },
    ],
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
    latitude: 32.893765,
    longitude: -96.726659,
    schoolDistrict: "Richardson ISD",
    schoolGrade: "B+",
    schools: [
      {
        level: "Elementary",
        name: "Elementary school zone",
        grade: "B+",
        note: "Location-based estimate. Confirm attendance zone with Richardson ISD.",
      },
      {
        level: "Middle",
        name: "Middle school zone",
        grade: "B+",
        note: "Location-based estimate. Confirm attendance zone with Richardson ISD.",
      },
      {
        level: "High",
        name: "High school zone",
        grade: "B",
        note: "Location-based estimate. Confirm attendance zone with Richardson ISD.",
      },
    ],
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
