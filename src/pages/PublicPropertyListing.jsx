import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
    DEFAULT_PROPERTY_IMAGE,
    getPhotoImageUrl,
    getPropertyAddressLabel,
    getPropertyPrimaryImage,
    hasPreciseStreetAddress,
    isReliableGeocodeResult,
} from "../data/propertySearchData";
import { getAnyPropertyById, getPublicPropertySummaries } from "../data/propertyStorage";
import {
    clearCompareSelections,
    getCompareFloorPlanItemKey,
    getCompareFloorPlanItems,
    getComparePropertyIds,
    getSavedPropertyIds,
    MAX_COMPARE_FLOOR_PLANS,
    MAX_COMPARE_PROPERTIES,
    removeCompareFloorPlanItem,
    removeComparePropertyId,
    toggleCompareFloorPlanItem,
    toggleComparePropertyId,
    toggleSavedPropertyId,
} from "../data/renterPreferenceStorage";
import { saveLocalLead } from "../data/leadStorage";
import { saveLeadEventInBackground } from "../data/supabaseLeadEvents";
import { saveSupabaseLead } from "../data/supabaseLeadStorage";
import { isLocalFallbackEnabled } from "../data/supabaseClient";
import { formatAvailability as formatAvailabilityLabel } from "../utils/displayFormatters";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const DALLAS_CENTER = { latitude: 32.7767, longitude: -96.797 };
const NEARBY_PLACE_RADIUS_MILES = 10;
const NEARBY_PLACE_CACHE_VERSION = "v4";
const NEARBY_PLACE_SUGGESTION_LIMIT = 10;
const FLOOR_PLAN_PAGE_SIZE = 6;
const FLOOR_PLAN_SCROLL_TARGET_KEY = "bma-scroll-target";
const NEARBY_PLACE_QUERIES = [
    {
        query: "Walmart",
        queryVariants: ["Walmart", "Walmart Supercenter", "Walmart Neighborhood Market"],
        label: "Walmart",
        detail: "Closest Walmart found near this property",
        type: "walmart",
        keywords: ["walmart"],
    },
    {
        query: "Target",
        label: "Target",
        detail: "Closest Target found near this property",
        type: "target",
        keywords: ["target"],
    },
    {
        query: "LA Fitness",
        label: "LA Fitness",
        detail: "Closest LA Fitness found near this property",
        type: "laFitness",
        keywords: ["la fitness", "lafitness"],
    },
    {
        query: "Planet Fitness",
        label: "Planet Fitness",
        detail: "Closest Planet Fitness found near this property",
        type: "planetFitness",
        keywords: ["planet fitness"],
    },
    {
        query: "Kroger grocery store",
        queryVariants: ["Kroger", "Kroger grocery store"],
        label: "Kroger",
        detail: "Closest Kroger found near this property",
        type: "kroger",
        keywords: ["kroger"],
    },
];
const mapboxGeocodeRequests = new Map();
const mapboxNearbyPlaceRequests = new Map();
const SCHOOL_DISTRICT_BY_ZIP = {
    75252: {
        district: "Plano ISD",
        districtGrade: "A",
    },
    75287: {
        district: "Plano ISD",
        districtGrade: "A",
    },
    75231: {
        district: "Richardson ISD",
        districtGrade: "B+",
    },
    75206: {
        district: "Dallas ISD",
        districtGrade: "B",
    },
};
const SCHOOL_DISTRICT_BY_CITY = {
    dallas: {
        district: "Dallas ISD",
        districtGrade: "B",
    },
    plano: {
        district: "Plano ISD",
        districtGrade: "A",
    },
    richardson: {
        district: "Richardson ISD",
        districtGrade: "B+",
    },
};
const DEFAULT_SCHOOL_LEVELS = [
    {
        level: "Elementary",
        name: "Elementary school zone",
        grade: "Verify",
    },
    {
        level: "Middle",
        name: "Middle school zone",
        grade: "Verify",
    },
    {
        level: "High",
        name: "High school zone",
        grade: "Verify",
    },
];
const amenities = [
    "Resort-style pool",
    "Fitness center",
    "Coworking lounge",
    "Pet-friendly",
    "Covered parking",
    "Package lockers",
    "In-unit washer/dryer",
    "Smart home features",
];

function normalizeListingFloorPlans(property) {
    const addMarketBenchmark = (plan) => enrichFloorPlanWithMarketBenchmark(property, plan);

    if (!property?.floorPlans?.length) {
        if (!property) return [];

        return [
            {
                name: property.bedrooms?.join(" / ") || "Available Floor Plan",
                beds: property.bedrooms?.join(" / ") || "Beds not listed",
                baths: "Contact for details",
                sqft: "Contact for details",
                rent: property.startingRent || property.rent || "Contact for pricing",
                effectiveRent: property.effectiveRent || "",
                marketRent: property.marketRent || "",
                savings: property.savings || "",
                belowMarketPercent: property.belowMarketPercent || "",
                available: "Contact for availability",
                status: "available",
                special:
                    property.special && property.special !== "Special not listed"
                        ? { label: property.special }
                        : null,
                availableUnits: [],
                image: getPropertyPrimaryImage(property),
            },
        ].map(addMarketBenchmark);
    }

    return property.floorPlans.map((plan, index) => {
        if (typeof plan === "string") {
            return addMarketBenchmark({
                name: plan,
                beds: property.bedrooms?.[0] || "Not set",
                baths: "Not set",
                sqft: "Not set",
                rent: property.rent || "Contact for pricing",
                effectiveRent: property.effectiveRent || "",
                marketRent: property.marketRent || "",
                savings: property.savings || "",
                belowMarketPercent: property.belowMarketPercent || "",
                available: "Not set",
                status: "available",
                special: property.special ? { label: property.special } : null,
                availableUnits: [],
            });
        }

        return addMarketBenchmark({
            ...plan,
            name: plan.name || `Floor Plan ${index + 1}`,
            beds: plan.bedrooms ?? plan.beds ?? "Not set",
            baths: plan.bathrooms || plan.baths || "Not set",
            sqft: plan.squareFeet || plan.sqft || "Not set",
            rent: plan.startingRent || plan.rent || "Contact for pricing",
            image: plan.image || (plan.photos || []).map(getPhotoImageUrl).find(Boolean) || "",
            effectiveRent: plan.effectiveRent || "",
            marketRent: plan.marketRent || "",
            savings: plan.savings || "",
            belowMarketPercent: plan.belowMarketPercent || "",
            available: plan.availability || plan.available || "Not set",
            status: plan.status || "available",
            special: normalizeSpecial(plan.special, plan.currentSpecial),
            availableUnits: plan.availableUnits || [],
        });
    });
}

function normalizeSpecial(special, fallbackLabel = "") {
    if (special && typeof special === "object") {
        return {
            ...special,
            label: special.label || fallbackLabel || "",
        };
    }

    const label = typeof special === "string" ? special : fallbackLabel;

    if (!label) return null;

    return {
        label,
        freeWeeks: getFreeWeeksFromSpecialLabel(label),
        rentCreditSpecial: getRentCreditSpecialFromLabel(label),
        leaseTermMonths: 12,
    };
}

function enrichFloorPlanWithMarketBenchmark(property, plan) {
    const manualMarketRent = plan.marketRent || property?.marketRent || "";
    const effectiveRentNumber =
        parseCurrency(plan.effectiveRent) || parseCurrency(plan.rent);

    if (manualMarketRent) {
        const manualMarketRentNumber = parseCurrency(manualMarketRent);
        const shouldShowManualComparison =
            manualMarketRentNumber > 0 &&
            (!effectiveRentNumber || manualMarketRentNumber > effectiveRentNumber);

        return {
            ...plan,
            marketRent: shouldShowManualComparison ? manualMarketRent : "",
            marketRentSource: shouldShowManualComparison
                ? "Property-entered market rent"
                : "",
        };
    }

    return {
        ...plan,
        marketRent: "",
        marketRentSource: "",
    };
}

function getMarketRentCopy({
    marketRentSource,
    marketRentAreaName,
    marketRentLastUpdated,
    beds,
}) {
    const bedroomLabel = formatBedroomLabel(beds).toLowerCase();
    const areaLabel = marketRentAreaName ? ` near ${marketRentAreaName}` : " nearby";
    const updatedLabel = marketRentLastUpdated ? ` Updated ${marketRentLastUpdated}.` : "";

    if (marketRentSource === "Property-entered market rent") {
        return {
            metricLabel: "Market",
            title: "Property market rent",
            cardNote: "Compared with the property's listed market rent.",
            detailNote:
                "This is the market rent entered for this listing. Use it to compare the normal rent, special, and estimated effective value before touring.",
        };
    }

    return {
        metricLabel: "Rent Context",
        title: "Rent estimate",
        cardNote: `Estimated ${bedroomLabel} rent context${areaLabel}.${updatedLabel}`,
        detailNote:
            `This estimate compares similar ${bedroomLabel} apartments${areaLabel}. It helps show whether the special creates real value, but it is not a quote from the property.${updatedLabel}`,
    };
}

function getPropertySeoMetadata({ property, listingFloorPlans, propertyGalleryImages }) {
    const propertyName = property?.name || "Apartment";
    const city = property?.city || "Dallas";
    const state = property?.state || "TX";
    const rentValues = getPropertySeoRentValues(listingFloorPlans);
    const lowestRent = rentValues.length > 0 ? Math.min(...rentValues) : 0;
    const highestRent = rentValues.length > 0 ? Math.max(...rentValues) : 0;
    const rentLabel =
        rentValues.length > 0
            ? `${formatCurrency(lowestRent)}+`
            : property?.rent || property?.startingRent || "contact for pricing";
    const specialLabel = getPropertySeoSpecialLabel(property, listingFloorPlans);
    const bedroomLabel = getPropertySeoBedroomLabel(property, listingFloorPlans);
    const titleParts = [
        `${propertyName} Apartments`,
        city && state ? `${city} ${state}` : "",
        specialLabel ? "Specials & Effective Rent" : "Pricing & Availability",
    ].filter(Boolean);
    const title = `${titleParts.join(" | ")} | Below Market Apartments`;
    const description = [
        `${propertyName} in ${city}, ${state} has ${bedroomLabel} with rents from ${rentLabel}.`,
        specialLabel ? `Current special: ${specialLabel}.` : "",
        "Compare normal rent, estimated effective rent, floor plans, photos, and nearby map details.",
    ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 300);
    const canonicalUrl = `https://belowmarketapartments.com/properties/${encodeURIComponent(
        property?.id || ""
    )}`;
    const imageUrl = getAbsoluteSeoImageUrl(
        propertyGalleryImages?.[0]?.url || getPropertyPrimaryImage(property)
    );
    const structuredData = getPropertySeoStructuredData({
        canonicalUrl,
        city,
        description,
        highestRent,
        imageUrl,
        listingFloorPlans,
        lowestRent,
        property,
        propertyGalleryImages,
        propertyName,
        specialLabel,
        state,
    });

    return {
        canonicalUrl,
        description,
        imageUrl,
        structuredData,
        title,
    };
}

function getPropertySeoRentValues(listingFloorPlans) {
    return listingFloorPlans
        .flatMap((plan) => [
            parseCurrency(plan.effectiveRent),
            parseCurrency(plan.rent),
            ...(plan.availableUnits || []).map((unit) => parseCurrency(unit.rent)),
        ])
        .filter(Boolean);
}

function getPropertySeoStructuredData({
    canonicalUrl,
    city,
    description,
    highestRent,
    imageUrl,
    listingFloorPlans,
    lowestRent,
    property,
    propertyGalleryImages,
    propertyName,
    specialLabel,
    state,
}) {
    const propertyNodeId = `${canonicalUrl}#property`;
    const webPageNodeId = `${canonicalUrl}#webpage`;
    const breadcrumbNodeId = `${canonicalUrl}#breadcrumb`;
    const listingNodeId = `${canonicalUrl}#listing`;
    const offerCatalogNodeId = `${canonicalUrl}#floor-plan-offers`;
    const faqNodeId = `${canonicalUrl}#property-faq`;
    const organizationNodeId = "https://belowmarketapartments.com/#organization";
    const absoluteGalleryImages = [
        ...new Set(
            propertyGalleryImages
                .map((image) => getAbsoluteSeoImageUrl(image.url))
                .filter(Boolean)
        ),
    ];
    const propertyCoordinates = getPropertyCoordinates(property);
    const floorPlanOffers = getPropertySeoFloorPlanOffers({
        canonicalUrl,
        listingFloorPlans,
        propertyName,
    });
    const propertyFaqs = getPropertySeoFaqs({
        listingFloorPlans,
        property,
        propertyName,
        specialLabel,
    });
    const aggregateOffer = {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: lowestRent || undefined,
        highPrice: highestRent || undefined,
        offerCount: floorPlanOffers.length || undefined,
        availability: "https://schema.org/InStock",
        url: canonicalUrl,
    };
    const apartmentNode = {
        "@type": "ApartmentComplex",
        "@id": propertyNodeId,
        name: propertyName,
        description,
        url: canonicalUrl,
        image: absoluteGalleryImages.length > 0 ? absoluteGalleryImages : imageUrl,
        photo: absoluteGalleryImages.slice(0, 12).map((url, index) => ({
            "@type": "ImageObject",
            "@id": `${canonicalUrl}#photo-${index + 1}`,
            contentUrl: url,
            name: `${propertyName} photo ${index + 1}`,
        })),
        address: {
            "@type": "PostalAddress",
            streetAddress: property?.address || "",
            addressLocality: city,
            addressRegion: state,
            postalCode: property?.zipcode || "",
            addressCountry: "US",
        },
        geo: propertyCoordinates
            ? {
                "@type": "GeoCoordinates",
                latitude: propertyCoordinates.latitude,
                longitude: propertyCoordinates.longitude,
            }
            : undefined,
        amenityFeature: amenities.map((amenity) => ({
            "@type": "LocationFeatureSpecification",
            name: amenity,
            value: true,
        })),
        additionalProperty: getPropertySeoAdditionalProperties({
            listingFloorPlans,
            property,
            specialLabel,
        }),
        mainEntityOfPage: { "@id": webPageNodeId },
        offers: aggregateOffer,
        subjectOf: [{ "@id": offerCatalogNodeId }, { "@id": faqNodeId }],
        containedInPlace: city && state
            ? {
                "@type": "City",
                name: `${city}, ${state}`,
            }
            : undefined,
        petsAllowed: property?.petPolicy || property?.petsAllowed || undefined,
    };
    const webPageNode = {
        "@type": "WebPage",
        "@id": webPageNodeId,
        url: canonicalUrl,
        name: `${propertyName} | Below Market Apartments`,
        description,
        isPartOf: {
            "@type": "WebSite",
            "@id": "https://belowmarketapartments.com/#website",
            name: "Below Market Apartments",
            url: "https://belowmarketapartments.com/",
            publisher: { "@id": organizationNodeId },
        },
        breadcrumb: { "@id": breadcrumbNodeId },
        primaryImageOfPage: absoluteGalleryImages[0]
            ? {
                "@type": "ImageObject",
                contentUrl: absoluteGalleryImages[0],
                name: `${propertyName} primary photo`,
            }
            : undefined,
        mainEntity: { "@id": propertyNodeId },
        about: [{ "@id": propertyNodeId }, { "@id": listingNodeId }, { "@id": offerCatalogNodeId }],
    };
    const listingNode = {
        "@type": "RealEstateListing",
        "@id": listingNodeId,
        name: `${propertyName} apartment listing`,
        url: canonicalUrl,
        description,
        image: absoluteGalleryImages.length > 0 ? absoluteGalleryImages : imageUrl,
        datePosted: property?.createdAt || property?.created_at || undefined,
        dateModified:
            property?.updatedAt ||
            property?.updated_at ||
            property?.lastUpdated ||
            undefined,
        mainEntityOfPage: { "@id": webPageNodeId },
        about: { "@id": propertyNodeId },
        offers: aggregateOffer,
        additionalProperty: getPropertySeoAdditionalProperties({
            listingFloorPlans,
            property,
            specialLabel,
        }),
    };
    const organizationNode = {
        "@type": "Organization",
        "@id": organizationNodeId,
        name: "Below Market Apartments",
        url: "https://belowmarketapartments.com/",
        logo: "https://belowmarketapartments.com/favicon-512.png",
    };
    const breadcrumbNode = {
        "@type": "BreadcrumbList",
        "@id": breadcrumbNodeId,
        itemListElement: [
            {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://belowmarketapartments.com/",
            },
            {
                "@type": "ListItem",
                position: 2,
                name: "Dallas Apartments",
                item: "https://belowmarketapartments.com/properties",
            },
            {
                "@type": "ListItem",
                position: 3,
                name: propertyName,
                item: canonicalUrl,
            },
        ],
    };
    const offerCatalogNode = {
        "@type": "OfferCatalog",
        "@id": offerCatalogNodeId,
        name: `${propertyName} floor plans and rent specials`,
        url: canonicalUrl,
        itemListElement: floorPlanOffers,
    };
    const faqNode = {
        "@type": "FAQPage",
        "@id": faqNodeId,
        mainEntity: propertyFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    };

    return {
        "@context": "https://schema.org",
        "@graph": [
            organizationNode,
            webPageNode,
            breadcrumbNode,
            listingNode,
            apartmentNode,
            offerCatalogNode,
            faqNode,
        ],
    };
}

function getPropertySeoFloorPlanOffers({
    canonicalUrl,
    listingFloorPlans,
    propertyName,
}) {
    return listingFloorPlans
        .filter((plan) => isFloorPlanAvailable(plan))
        .slice(0, 20)
        .map((plan, index) => {
            const rent = parseCurrency(plan.rent);
            const effectiveRent = parseCurrency(plan.effectiveRent);
            const bestPrice = effectiveRent || rent;
            const specialLabel = plan.special?.label || plan.currentSpecial || "";
            const availableUnitCount = getFloorPlanAvailableUnitCount(plan);
            const planImage = plan.image ? getAbsoluteSeoImageUrl(plan.image) : "";

            return {
                "@type": "Offer",
                "@id": `${canonicalUrl}#floor-plan-offer-${index + 1}`,
                name: `${propertyName} ${plan.name || `Floor Plan ${index + 1}`}`,
                url: canonicalUrl,
                price: bestPrice || undefined,
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                description: getFloorPlanSeoDescription(plan, specialLabel),
                image: planImage || undefined,
                priceSpecification: getFloorPlanSeoPriceSpecifications({
                    effectiveRent,
                    rent,
                }),
                additionalProperty: getFloorPlanSeoAdditionalProperties({
                    plan,
                    specialLabel,
                }),
                itemOffered: {
                    "@type": "Apartment",
                    name: plan.name || `Floor Plan ${index + 1}`,
                    numberOfBedrooms: formatBedroomLabel(plan.beds),
                    numberOfBathroomsTotal: plan.baths || undefined,
                    floorSize:
                        parseCurrency(plan.sqft) > 0
                            ? {
                                "@type": "QuantitativeValue",
                                value: parseCurrency(plan.sqft),
                                unitText: "square feet",
                            }
                            : undefined,
                },
                eligibleQuantity:
                    availableUnitCount > 0
                        ? {
                            "@type": "QuantitativeValue",
                            value: availableUnitCount,
                            unitText: "available units",
                        }
                        : undefined,
            };
        });
}

function getFloorPlanSeoPriceSpecifications({ effectiveRent, rent }) {
    return [
        rent
            ? {
                "@type": "UnitPriceSpecification",
                name: "Normal monthly rent",
                price: rent,
                priceCurrency: "USD",
                unitText: "month",
            }
            : null,
        effectiveRent && effectiveRent !== rent
            ? {
                "@type": "UnitPriceSpecification",
                name: "Estimated effective rent",
                price: effectiveRent,
                priceCurrency: "USD",
                unitText: "month",
            }
            : null,
    ].filter(Boolean);
}

function getFloorPlanSeoAdditionalProperties({ plan, specialLabel }) {
    return [
        { name: "Bedrooms", value: formatBedroomLabel(plan.beds) },
        { name: "Bathrooms", value: plan.baths },
        { name: "Square feet", value: plan.sqft },
        { name: "Current special", value: specialLabel },
        { name: "Market rent comparison", value: plan.marketRent },
        { name: "Estimated special value", value: plan.savings },
        { name: "Special value percent", value: plan.belowMarketPercent },
        { name: "Availability", value: plan.available || plan.availability },
    ]
        .filter((item) => item.value)
        .map((item) => ({
            "@type": "PropertyValue",
            name: item.name,
            value: item.value,
        }));
}

function getFloorPlanSeoDescription(plan, specialLabel) {
    return [
        `${plan.name || "Floor plan"}: ${formatBedroomLabel(plan.beds)}, ${plan.baths || "bath not listed"}, ${plan.sqft || "square footage not listed"}.`,
        plan.rent ? `Normal rent starts at ${plan.rent}.` : "",
        plan.effectiveRent ? `Estimated effective rent is ${plan.effectiveRent}.` : "",
        specialLabel ? `Current special: ${specialLabel}.` : "",
    ]
        .filter(Boolean)
        .join(" ");
}

function getPropertySeoAdditionalProperties({
    listingFloorPlans,
    property,
    specialLabel,
}) {
    const rentSummary = getPropertyLevelRentSummary({
        effectiveRentLabel: property?.effectiveRent || "",
        hasPropertySpecial: Boolean(specialLabel),
        listingFloorPlans,
        propertySpecialLabel: specialLabel || "No active special",
        startingRentLabel: property?.startingRent || property?.rent || "Contact for pricing",
    });
    const values = [
        { name: "Active special", value: specialLabel || "No active special listed" },
        { name: "Normal rent range", value: rentSummary.normalRentLabel },
        { name: "Estimated effective rent range", value: rentSummary.effectiveRentLabel },
        { name: "Availability", value: rentSummary.availabilityLabel },
        { name: "Required monthly fees", value: property?.requiredMonthlyFees || property?.monthlyFees || "" },
        { name: "Pet policy", value: property?.petPolicy || property?.petsAllowed || "" },
        { name: "Parking", value: property?.parking || property?.parkingPolicy || "" },
        { name: "School district", value: property?.schoolDistrict || "" },
        { name: "Property manager", value: property?.managementCompany || property?.manager || "" },
    ].filter((item) => item.value);

    return values.map((item) => ({
        "@type": "PropertyValue",
        name: item.name,
        value: item.value,
    }));
}

function getPropertySeoFaqs({
    listingFloorPlans,
    property,
    propertyName,
    specialLabel,
}) {
    const rentSummary = getPropertyLevelRentSummary({
        effectiveRentLabel: property?.effectiveRent || "",
        hasPropertySpecial: Boolean(specialLabel),
        listingFloorPlans,
        propertySpecialLabel: specialLabel || "No active special",
        startingRentLabel: property?.startingRent || property?.rent || "Contact for pricing",
    });

    return [
        {
            question: `Does ${propertyName} have an active apartment special?`,
            answer: specialLabel
                ? `${propertyName} is listed with this current special: ${specialLabel}. Renters should confirm the special is still active for the exact floor plan and move-in date before applying.`
                : `${propertyName} does not currently show an active special on Below Market Apartments. Renters should still confirm current concessions before applying.`,
        },
        {
            question: `What rent should renters compare at ${propertyName}?`,
            answer: `${propertyName} shows normal rent around ${rentSummary.normalRentLabel} and estimated effective value around ${rentSummary.effectiveRentLabel}. Effective rent is an estimate of deal value, not always the monthly amount due.`,
        },
        {
            question: `What floor plans are listed for ${propertyName}?`,
            answer: `${propertyName} currently shows ${rentSummary.availabilityLabel}. Availability can change quickly, so renters should confirm the exact unit before touring.`,
        },
        {
            question: `What fees should renters ask about at ${propertyName}?`,
            answer:
                "Renters should ask about required monthly add-ons, parking, utilities, trash, package fees, deposits, application fees, admin fees, and whether the special applies to base rent only.",
        },
    ];
}

function getPropertySeoSpecialLabel(property, listingFloorPlans) {
    const specialLabel =
        listingFloorPlans
            .map((plan) => plan.special?.label || plan.currentSpecial)
            .find((label) => label && label !== "Special not listed") ||
        (property?.special && property.special !== "Special not listed"
            ? property.special
            : "");

    return specialLabel || "";
}

function getPropertySeoBedroomLabel(property, listingFloorPlans) {
    const bedroomValues = [
        ...listingFloorPlans.map((plan) => plan.beds || plan.bedrooms),
        ...(property?.bedrooms || []),
    ].filter(Boolean);
    const uniqueBedrooms = [...new Set(bedroomValues)];

    if (uniqueBedrooms.length === 0) return "available floor plans";
    if (uniqueBedrooms.length === 1) return formatBedroomLabel(uniqueBedrooms[0]);

    return `${formatBedroomLabel(uniqueBedrooms[0])} to ${formatBedroomLabel(
        uniqueBedrooms[uniqueBedrooms.length - 1]
    )}`;
}

function getAbsoluteSeoImageUrl(imageUrl) {
    if (!imageUrl || String(imageUrl).startsWith("data:")) {
        return "https://belowmarketapartments.com/social-preview-bma.png";
    }

    if (/^https?:\/\//i.test(imageUrl)) {
        return imageUrl;
    }

    return `https://belowmarketapartments.com/${String(imageUrl).replace(/^\/+/, "")}`;
}

export default function PublicPropertyListing() {
    {/* Usestate start*/ }
    const { propertyId } = useParams();
    const location = useLocation();
    const floorPlansSectionRef = useRef(null);
    const [property, setProperty] = useState(null);
    const [compareProperties, setCompareProperties] = useState([]);
    const [isLoadingProperty, setIsLoadingProperty] = useState(true);

    useEffect(() => {
        let isMounted = true;

        getAnyPropertyById(propertyId)
            .then((savedProperty) => {
                if (isMounted) setProperty(savedProperty);
            })
            .catch((error) => {
                console.error(error);
                if (isMounted) setProperty(null);
            })
            .finally(() => {
                if (isMounted) setIsLoadingProperty(false);
            });

        return () => {
            isMounted = false;
        };
    }, [propertyId]);

    useEffect(() => {
        let isMounted = true;

        getPublicPropertySummaries()
            .then((savedProperties) => {
                if (isMounted) setCompareProperties(savedProperties);
            })
            .catch((error) => {
                console.error(error);
                if (isMounted) setCompareProperties([]);
            });

        return () => {
            isMounted = false;
        };
    }, []);
    const addressLabel = property ? getPropertyAddressLabel(property) : "";
    const startingRentLabel = property?.startingRent || property?.rent || "Contact for pricing";
    const effectiveRentLabel = property?.effectiveRent || "";
    const hasPropertySpecial = Boolean(
        property?.special && property.special !== "Special not listed"
    );
    const propertySpecialLabel = hasPropertySpecial
        ? property.special
        : "No active special listed";
    const managementLabel =
        property?.managementCompany || property?.manager || "Property management not listed";
    const heroManagementLabel =
        managementLabel === "Property management not listed"
            ? "Verified Dallas listing"
            : `Managed by ${managementLabel}`;
    const schoolSnapshot = getPropertySchoolSnapshot(property);
    const propertyPhotoImages = useMemo(
        () =>
            (property?.photos || [])
                .map((photo, index) => ({
                    category: photo.category || `Photo ${index + 1}`,
                    url: getPhotoImageUrl(photo),
                }))
                .filter((photo) => photo.url),
        [property?.photos]
    );
    const propertyPrimaryImage = property ? getPropertyPrimaryImage(property) : "";
    const hasRealPrimaryImage =
        Boolean(propertyPrimaryImage) &&
        propertyPrimaryImage !== DEFAULT_PROPERTY_IMAGE &&
        !propertyPrimaryImage.includes("images.unsplash.com/photo-1564013799919");
    const propertyGalleryImages = useMemo(
        () =>
            propertyPhotoImages.length > 0
                ? propertyPhotoImages
                : hasRealPrimaryImage
                    ? [{ category: "Property", url: propertyPrimaryImage }]
                    : [],
        [hasRealPrimaryImage, propertyPhotoImages, propertyPrimaryImage]
    );
    const hasPropertyGalleryImages = propertyGalleryImages.length > 0;
    const listingFloorPlans = useMemo(
        () => normalizeListingFloorPlans(property),
        [property]
    );
    useEffect(() => {
        if (!property) return undefined;

        let storedTargetId;
        try {
            storedTargetId = window.sessionStorage?.getItem(FLOOR_PLAN_SCROLL_TARGET_KEY);
        } catch {
            storedTargetId = null;
        }
        const requestedSection = new URLSearchParams(location.search).get("section");
        const targetId = requestedSection === "floor-plans"
            ? "floor-plans"
            : location.hash
            ? decodeURIComponent(location.hash.replace("#", ""))
            : storedTargetId;
        if (targetId !== "floor-plans") return undefined;

        let attempt = 0;
        let scrollTimer = 0;
        let animationFrame = 0;

        const scrollToFloorPlans = () => {
            const target = floorPlansSectionRef.current || document.getElementById(targetId);
            attempt += 1;

            if (target) {
                const targetTop = Math.max(
                    target.getBoundingClientRect().top + window.scrollY - 16,
                    0
                );
                const behavior = attempt < 3 ? "auto" : "smooth";

                window.scrollTo({ top: targetTop, behavior });
                document.documentElement.scrollTop = targetTop;
                document.body.scrollTop = targetTop;

                try {
                    window.sessionStorage?.removeItem(FLOOR_PLAN_SCROLL_TARGET_KEY);
                } catch {
                    // No cleanup needed if session storage is unavailable.
                }
            }

            if (attempt < 16) {
                scrollTimer = window.setTimeout(() => {
                    animationFrame = window.requestAnimationFrame(scrollToFloorPlans);
                }, attempt < 6 ? 150 : 300);
            }
        };

        animationFrame = window.requestAnimationFrame(scrollToFloorPlans);

        return () => {
            window.clearTimeout(scrollTimer);
            window.cancelAnimationFrame(animationFrame);
        };
    }, [location.hash, location.search, property, propertyId, listingFloorPlans.length]);

    useEffect(() => {
        if (!property || property.status !== "Live") return undefined;

        const propertySeo = getPropertySeoMetadata({
            listingFloorPlans,
            property,
            propertyGalleryImages,
        });
        const previousTitle = document.title;
        const descriptionMeta = document.querySelector("meta[name='description']");
        const canonicalLink = document.querySelector("link[rel='canonical']");
        const ogTitleMeta = document.querySelector("meta[property='og:title']");
        const ogDescriptionMeta = document.querySelector("meta[property='og:description']");
        const ogUrlMeta = document.querySelector("meta[property='og:url']");
        const ogImageMeta = document.querySelector("meta[property='og:image']");
        const twitterTitleMeta = document.querySelector("meta[name='twitter:title']");
        const twitterDescriptionMeta = document.querySelector(
            "meta[name='twitter:description']"
        );
        const twitterImageMeta = document.querySelector("meta[name='twitter:image']");
        const previousDescription = descriptionMeta?.getAttribute("content") || "";
        const previousCanonical = canonicalLink?.getAttribute("href") || "";
        const previousOgTitle = ogTitleMeta?.getAttribute("content") || "";
        const previousOgDescription = ogDescriptionMeta?.getAttribute("content") || "";
        const previousOgUrl = ogUrlMeta?.getAttribute("content") || "";
        const previousOgImage = ogImageMeta?.getAttribute("content") || "";
        const previousTwitterTitle = twitterTitleMeta?.getAttribute("content") || "";
        const previousTwitterDescription =
            twitterDescriptionMeta?.getAttribute("content") || "";
        const previousTwitterImage = twitterImageMeta?.getAttribute("content") || "";
        const structuredDataScript = document.createElement("script");

        structuredDataScript.type = "application/ld+json";
        structuredDataScript.dataset.bmaPropertySeo = "true";
        structuredDataScript.textContent = JSON.stringify(propertySeo.structuredData);

        document
            .querySelector("script[data-bma-property-seo='true']")
            ?.remove();
        document.title = propertySeo.title;
        descriptionMeta?.setAttribute("content", propertySeo.description);
        canonicalLink?.setAttribute("href", propertySeo.canonicalUrl);
        ogTitleMeta?.setAttribute("content", propertySeo.title);
        ogDescriptionMeta?.setAttribute("content", propertySeo.description);
        ogUrlMeta?.setAttribute("content", propertySeo.canonicalUrl);
        ogImageMeta?.setAttribute("content", propertySeo.imageUrl);
        twitterTitleMeta?.setAttribute("content", propertySeo.title);
        twitterDescriptionMeta?.setAttribute("content", propertySeo.description);
        twitterImageMeta?.setAttribute("content", propertySeo.imageUrl);
        document.head.appendChild(structuredDataScript);

        return () => {
            document.title = previousTitle;
            descriptionMeta?.setAttribute("content", previousDescription);
            canonicalLink?.setAttribute("href", previousCanonical);
            ogTitleMeta?.setAttribute("content", previousOgTitle);
            ogDescriptionMeta?.setAttribute("content", previousOgDescription);
            ogUrlMeta?.setAttribute("content", previousOgUrl);
            ogImageMeta?.setAttribute("content", previousOgImage);
            twitterTitleMeta?.setAttribute("content", previousTwitterTitle);
            twitterDescriptionMeta?.setAttribute("content", previousTwitterDescription);
            twitterImageMeta?.setAttribute("content", previousTwitterImage);
            structuredDataScript.remove();
        };
    }, [listingFloorPlans, property, propertyGalleryImages]);
    const benchmarkFloorPlan = listingFloorPlans.find(
        (plan) => plan.marketRent && plan.marketRentSource
    );
    const marketRentLabel = benchmarkFloorPlan?.marketRent || "";
    const savingsLabel = property?.savings || benchmarkFloorPlan?.savings || "";
    const renterValueToolkit = getRenterValueToolkit({
        effectiveRentLabel,
        hasPropertySpecial,
        listingFloorPlans,
        marketRentLabel,
        property,
        propertySpecialLabel,
        savingsLabel,
        startingRentLabel,
    });
    const compactSeoSummary = getCompactPropertySeoSummary({
        addressLabel,
        listingFloorPlans,
        property,
        propertySpecialLabel,
    });
    const floorPlanFilters = [
        "All",
        ...new Set(
            listingFloorPlans
                .map((plan) => plan.beds)
                .filter((beds) => beds !== null && beds !== undefined && beds !== "")
        ),
    ];
    const [showGallery, setShowGallery] = useState(false);
    const [activePhotoCategory, setActivePhotoCategory] = useState("All");
    const [selectedPhoto, setSelectedPhoto] = useState(propertyGalleryImages[0]);
    const [floorPlanSort, setFloorPlanSort] = useState("recommended");
    const [activeFloorPlanFilter, setActiveFloorPlanFilter] = useState("All");
    const [floorPlanPage, setFloorPlanPage] = useState(1);
    const [showUnavailableFloorPlans, setShowUnavailableFloorPlans] = useState(false);
    const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
    const [showSidebarError, setShowSidebarError] = useState(false);
    const [leadFormError, setLeadFormError] = useState("");
    const [isSubmittingLead, setIsSubmittingLead] = useState(false);
    const [nearbyPlaces, setNearbyPlaces] = useState([]);
    const [savedPropertyIds, setSavedPropertyIds] = useState(getSavedPropertyIds);
    const [comparePropertyIds, setComparePropertyIds] = useState(getComparePropertyIds);
    const [compareFloorPlanItems, setCompareFloorPlanItems] = useState(getCompareFloorPlanItems);
    const [compareMessage, setCompareMessage] = useState("");
    const [isCompareBoardOpen, setIsCompareBoardOpen] = useState(false);
    const [activeCompareTab, setActiveCompareTab] = useState("Floor Plans");
    const compareListRef = useRef(null);
    {/* Usestate end*/ }

    const changeFloorPlanPage = (nextPage) => {
        setFloorPlanPage(nextPage);
        window.setTimeout(() => {
            floorPlansSectionRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 0);
    };

    const filteredGalleryImages =
        activePhotoCategory === "All"
            ? propertyGalleryImages
            : propertyGalleryImages.filter(
                (image) => image.category === activePhotoCategory
            );
    const photoCategories = [
        "All",
        ...new Set(propertyGalleryImages.map((image) => image.category)),
    ];
    const selectedGalleryPhoto = selectedPhoto || propertyGalleryImages[0];
    const isPropertySaved = property ? savedPropertyIds.includes(property.id) : false;
    const isPropertyCompared = property ? comparePropertyIds.includes(property.id) : false;
    const selectedCompareProperties = comparePropertyIds
        .map((comparePropertyId) =>
            compareProperties.find((compareProperty) => compareProperty.id === comparePropertyId)
        )
        .filter(Boolean);
    const compareFloorPlanPropertyIds = new Set(
        compareFloorPlanItems.map((item) => item.propertyId)
    );
    const propertyOnlyCompareProperties = selectedCompareProperties.filter(
        (compareProperty) => !compareFloorPlanPropertyIds.has(compareProperty.id)
    );
    const shouldShowCompareList =
        propertyOnlyCompareProperties.length > 0 || compareFloorPlanItems.length > 0;
    const compareFloorPlanKeys = new Set(
        compareFloorPlanItems.map((item) => getCompareFloorPlanItemKey(item))
    );
    const floorPlanCompareRows = compareFloorPlanItems.map((item) => {
        const matchingFloorPlan =
            item.propertyId === property?.id
                ? listingFloorPlans.find(
                    (plan) =>
                        getCompareFloorPlanItemKey(getFloorPlanCompareItem(property, plan)) ===
                        getCompareFloorPlanItemKey(item)
                )
                : null;

        return {
            id: getCompareFloorPlanItemKey(item),
            type: "Floor plan",
            propertyId: item.propertyId,
            title: item.floorPlanName,
            subtitle: item.propertyName,
            beds: formatBedroomLabel(item.beds, item.floorPlanName),
            baths: formatBathroomLabel(item.baths),
            sqft: item.sqft ? `${item.sqft} sq ft` : "Sq ft not listed",
            normalRent: item.rent || "Contact",
            effectiveRent: item.effectiveRent || item.rent || "Contact",
            special: item.special || "No special listed",
            availability: formatAvailabilityLabel(item.available) || "Availability not listed",
            savings: getCompareSavingsLabel(item.rent, item.effectiveRent),
            image: item.image || matchingFloorPlan?.image || "",
            floorPlan: matchingFloorPlan,
        };
    });
    const compareDetailRows = [
        ...floorPlanCompareRows,
        ...propertyOnlyCompareProperties.map((compareProperty) => ({
            id: compareProperty.id,
            type: "Property",
            propertyId: compareProperty.id,
            title: compareProperty.name,
            subtitle: compareProperty.area || compareProperty.city || "Dallas area",
            beds: getPropertyBedroomCompareLabel(compareProperty),
            baths: "Varies",
            sqft: "Varies",
            normalRent: compareProperty.marketRent || compareProperty.rent || compareProperty.startingRent || "Contact",
            effectiveRent: compareProperty.effectiveRent || compareProperty.rent || compareProperty.startingRent || "Contact",
            special: compareProperty.special || "No special listed",
            availability: compareProperty.availability || "View floor plans",
            savings: compareProperty.savings || getCompareSavingsLabel(
                compareProperty.marketRent || compareProperty.rent,
                compareProperty.effectiveRent
            ),
            floorPlan: null,
        })),
    ];
    const compareItemCount = compareFloorPlanItems.length + propertyOnlyCompareProperties.length;
    const compareSummaryItems = getCompareSummaryItems({
        floorPlanCount: compareFloorPlanItems.length,
        propertyOnlyCount: propertyOnlyCompareProperties.length,
        rows: compareDetailRows,
    });
    useEffect(() => {
        if (!propertyGalleryImages.length) return;

        const resetSelectedPhoto = window.setTimeout(() => setSelectedPhoto((currentPhoto) => {
            const selectedPhotoStillExists = propertyGalleryImages.some(
                (image) => image.url === currentPhoto?.url
            );

            return selectedPhotoStillExists ? currentPhoto : propertyGalleryImages[0];
        }), 0);

        return () => window.clearTimeout(resetSelectedPhoto);
    }, [propertyGalleryImages]);

    const scrollToCompareBoard = () => {
        window.setTimeout(() => {
            compareListRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 50);
    };

    const handleViewCompareDock = () => {
        setIsCompareBoardOpen(true);
        setActiveCompareTab("Floor Plans");
    };

    const handleToggleFloorPlanCompare = (compareFloorPlanItem, isFloorPlanCompared) => {
        if (!isFloorPlanCompared && compareFloorPlanItems.length >= MAX_COMPARE_FLOOR_PLANS) {
            setCompareMessage(
                `You can compare up to ${MAX_COMPARE_FLOOR_PLANS} floor plans. Remove one before adding another.`
            );
            scrollToCompareBoard();
            return;
        }

        const nextCompareFloorPlanItems = toggleCompareFloorPlanItem(compareFloorPlanItem);

        setCompareFloorPlanItems(nextCompareFloorPlanItems);

        if (property?.id && !comparePropertyIds.includes(property.id)) {
            setComparePropertyIds(toggleComparePropertyId(property.id));
        }

        setCompareMessage(
            isFloorPlanCompared
                ? "Floor plan removed from compare."
                : "Floor plan added to compare."
        );
    };

    const handleTogglePropertyCompare = () => {
        if (!property?.id) return;

        if (!isPropertyCompared && comparePropertyIds.length >= MAX_COMPARE_PROPERTIES) {
            setCompareMessage(
                `You can compare up to ${MAX_COMPARE_PROPERTIES} properties. Remove one before adding another.`
            );
            scrollToCompareBoard();
            return;
        }

        setComparePropertyIds(toggleComparePropertyId(property.id));
        setCompareMessage(
            isPropertyCompared
                ? "Property removed from compare."
                : "Property added to compare."
        );
        scrollToCompareBoard();
    };

    const handleClearCompareBoard = () => {
        const clearedSelections = clearCompareSelections();

        setComparePropertyIds(clearedSelections.propertyIds);
        setCompareFloorPlanItems(clearedSelections.floorPlanItems);
        setIsCompareBoardOpen(false);
        setCompareMessage("Compare board cleared.");
    };

    const intakePanelPaddingClass = shouldShowCompareList ? "p-3" : "p-3.5 xl:p-4";
    const intakeSectionSpacingClass = shouldShowCompareList ? "mt-2" : "mt-3";
    const intakeGridSpacingClass = shouldShowCompareList
        ? "mt-1.5 gap-1.5"
        : "mt-2 gap-2";
    const intakeFieldSizeClass = shouldShowCompareList
        ? "md:py-1.5 lg:py-1.5 xl:py-1.5 xl:text-sm"
        : "md:py-2 lg:py-2 xl:py-2.5 xl:text-sm";
    const intakeConsentClass = shouldShowCompareList
        ? "mt-2 p-2 text-[10px] leading-3"
        : "mt-3 p-2.5 text-[11px] leading-4";
    const intakeSubmitClass = shouldShowCompareList
        ? "mt-2 py-2.5 text-sm"
        : "mt-3 py-3 text-sm";
    const intakeFinePrintClass = shouldShowCompareList
        ? "mt-1.5 text-[10px] leading-3"
        : "mt-2 text-[10px] leading-4 xl:text-xs";
    const intakeCardHeightClass = shouldShowCompareList
        ? "md:min-h-[calc(100vh-12rem)]"
        : "md:min-h-[calc(100vh-8rem)]";
    const intakePanelLayoutClass = shouldShowCompareList
        ? "md:min-h-[calc(100vh-12.5rem)]"
        : "md:min-h-[calc(100vh-8.5rem)]";

    const filteredFloorPlans =
        activeFloorPlanFilter === "All"
            ? listingFloorPlans
            : listingFloorPlans.filter((plan) => plan.beds === activeFloorPlanFilter);

    const sortedFloorPlans = [...filteredFloorPlans].sort((a, b) => {
        const rentA = Number(String(a.rent || "").replace(/[^0-9]/g, ""));
        const rentB = Number(String(b.rent || "").replace(/[^0-9]/g, ""));

        const sqftA = Number(String(a.sqft || "").replace(/[^0-9]/g, ""));
        const sqftB = Number(String(b.sqft || "").replace(/[^0-9]/g, ""));
        const availableA = getAvailabilitySortValue(a);
        const availableB = getAvailabilitySortValue(b);

        if (floorPlanSort === "price-low") return rentA - rentB;
        if (floorPlanSort === "price-high") return rentB - rentA;
        if (floorPlanSort === "sqft") return sqftB - sqftA;
        if (floorPlanSort === "availability") return availableB - availableA;

        if (availableA !== availableB) return availableB - availableA;
        if (a.effectiveRent && !b.effectiveRent) return -1;
        if (!a.effectiveRent && b.effectiveRent) return 1;
        if (rentA && rentB) return rentA - rentB;

        return 0;
    });
    const availableFloorPlans = sortedFloorPlans.filter(isFloorPlanAvailable);
    const unavailableFloorPlans = sortedFloorPlans.filter(
        (plan) => !isFloorPlanAvailable(plan)
    );
    const availableUnitCount = availableFloorPlans.reduce(
        (total, plan) => total + (getFloorPlanAvailableUnitCount(plan) || 0),
        0
    );
    const paginatedFloorPlans = showUnavailableFloorPlans
        ? sortedFloorPlans
        : availableFloorPlans;
    const totalFloorPlanPages = Math.max(
        Math.ceil(paginatedFloorPlans.length / FLOOR_PLAN_PAGE_SIZE),
        1
    );
    const currentFloorPlanPage = Math.min(floorPlanPage, totalFloorPlanPages);
    const visibleFloorPlans = paginatedFloorPlans.slice(
        (currentFloorPlanPage - 1) * FLOOR_PLAN_PAGE_SIZE,
        currentFloorPlanPage * FLOOR_PLAN_PAGE_SIZE
    );
    const floorPlanPageStart =
        paginatedFloorPlans.length > 0
            ? (currentFloorPlanPage - 1) * FLOOR_PLAN_PAGE_SIZE + 1
            : 0;
    const floorPlanPageEnd = Math.min(
        currentFloorPlanPage * FLOOR_PLAN_PAGE_SIZE,
        paginatedFloorPlans.length
    );

    const [leadForm, setLeadForm] = useState({
        name: "",
        phone: "",
        email: "",
        moveInDate: "",
        contactMethod: "",
        bedroomsNeeded: "",
        budget: "",
        tourPreference: "",
        selectedUnit: "",
        smsConsent: false,

    });

    const getEmptyLeadForm = (selectedUnit = "") => ({
        name: "",
        phone: "",
        email: "",
        moveInDate: "",
        contactMethod: "",
        bedroomsNeeded: "",
        budget: "",
        tourPreference: "",
        selectedUnit,
        smsConsent: false,
    });

    const openFloorPlanAvailabilityRequest = (plan, selectedUnit = "") => {
        setSelectedFloorPlan(plan);
        setLeadSubmitted(false);
        setLeadForm(getEmptyLeadForm(selectedUnit));

        window.setTimeout(() => {
            document
                .getElementById("floor-plan-lead-form")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
        }, 0);
    };

    const sortedUnits = selectedFloorPlan?.availableUnits
        ? [...selectedFloorPlan.availableUnits].sort((a, b) => {
            const rentA = Number(a.rent.replace(/[^0-9]/g, ""));
            const rentB = Number(b.rent.replace(/[^0-9]/g, ""));
            return rentA - rentB;
        })
        : [];

    const selectedUnitDetails = sortedUnits.find(
        (unit) => unit.unit === leadForm.selectedUnit
    );


    const handleCallTextClick = (clickLocation) => {
        const clickData = {
            propertyId,
            eventType: "phone_click",
            eventCategory: "engagement",
            pageSource: "public_property_listing",
            clickLocation,
            status: "clicked",
            floorPlan: selectedFloorPlan?.name || null,
            selectedUnit: leadForm.selectedUnit || null,
            contactSnapshot: {
                name: leadForm.name || null,
                phone: leadForm.phone || null,
                email: leadForm.email || null,
            },
            propertySnapshot: {
                propertyName: propertyId,
                floorPlan: selectedFloorPlan?.name || null,
                selectedUnit: leadForm.selectedUnit || null,
                rent: selectedFloorPlan?.rent || null,
                specialLabel: selectedFloorPlan?.special?.label || null,
            },
            unitSnapshot: leadForm.selectedUnit
                ? {
                    unit: leadForm.selectedUnit,
                    rent: selectedUnitDetails?.rent || null,
                    available: selectedUnitDetails?.available || null,
                    requestCount: selectedUnitDetails?.requestCount || 0,
                }
                : null,
            priority: leadForm.selectedUnit
                ? "high"
                : selectedFloorPlan
                    ? "medium"
                    : "normal",
            leadScore: getLeadScore(),
            leadIntent: getLeadIntent(),
            createdAt: new Date().toISOString(),

        };

        console.table(clickData);
        // Later:
        // await supabase.from("lead_events").insert(clickData);
    };

    const getLeadScore = () => {
        if (leadForm.selectedUnit) return 100;
        if (selectedFloorPlan) return 70;
        return 40;
    };

    const getLeadIntent = () => {
        if (leadForm.selectedUnit) return "unit";
        if (selectedFloorPlan) return "floor_plan";
        return "property";
    };

    const handleFloorPlanLeadSubmit = async () => {
        const isFloorPlanRequest = Boolean(selectedFloorPlan);
        const leadBedrooms =
            leadForm.bedroomsNeeded ||
            (selectedFloorPlan
                ? formatBedroomLabel(selectedFloorPlan.beds, selectedFloorPlan.name)
                : "");
        const leadBudget = leadForm.budget.trim();
        const leadMoveIn = leadForm.moveInDate.trim();
        const leadArea =
            property?.marketArea ||
            property?.neighborhood ||
            property?.city ||
            addressLabel ||
            "Dallas";

        if (
            !leadForm.name.trim() ||
            !leadForm.phone.trim() ||
            !leadForm.email.trim() ||
            !leadBedrooms ||
            !leadBudget ||
            !leadMoveIn
        ) {
            setShowSidebarError(true);
            setLeadFormError(
                "Add name, phone, email, bedrooms, budget, and move-in timing so this lead appears correctly in admin."
            );
            return;
        }

        if (!leadForm.smsConsent) {
            setShowSidebarError(true);
            setLeadFormError("Please agree to receive text messages before submitting.");
            return;
        }

        setShowSidebarError(false);
        setLeadFormError("");

        const createdAt = new Date().toISOString();
        const sourcePropertyId = property?.id || propertyId;
        const sourcePropertyName = property?.name || propertyId;
        const selectedSpecialLabel =
            selectedFloorPlan?.special?.label ||
            (hasPropertySpecial ? propertySpecialLabel : "");
        const leadNotes = [
            `Interested property: ${sourcePropertyName}`,
            addressLabel ? `Address: ${addressLabel}` : null,
            isFloorPlanRequest ? `Floor plan: ${selectedFloorPlan.name}` : null,
            leadForm.selectedUnit ? `Selected unit: ${leadForm.selectedUnit}` : null,
            selectedUnitDetails?.rent ? `Selected unit rent: ${selectedUnitDetails.rent}` : null,
            selectedSpecialLabel ? `Special to confirm: ${selectedSpecialLabel}` : null,
            leadForm.contactMethod ? `Preferred contact: ${leadForm.contactMethod}` : null,
        ]
            .filter(Boolean)
            .join("\n");

        const leadData = {
            ...leadForm,
            propertyId,
            eventType: "lead_submit",
            eventCategory: "lead",
            pageSource: "public_property_listing",
            createdAt: new Date().toISOString(),
            status: "new",
            leadSource: leadForm.selectedUnit
                ? "unit_modal"
                : selectedFloorPlan
                    ? "floor_plan_modal"
                    : "property_locator_form",
            floorPlan: selectedFloorPlan?.name,
            selectedUnit: leadForm.selectedUnit || null,
            selectedUnitRent: selectedUnitDetails?.rent || null,
            selectedUnitAvailability: selectedUnitDetails?.available || null,
            beds: selectedFloorPlan?.beds,
            baths: selectedFloorPlan?.baths,
            sqft: selectedFloorPlan?.sqft,
            rent: selectedFloorPlan?.rent,
            estimatedRentAfterSpecial: hasCalculableSelectedSpecial
                ? Math.round(effectiveRent)
                : null,
            monthlySavings: hasCalculableSelectedSpecial
                ? Math.round(monthlySavings)
                : null,
            concessionValue: hasCalculableSelectedSpecial
                ? Math.round(concessionValue)
                : null, special: selectedFloorPlan?.special || null,
            propertySnapshot: {
                propertyName: propertyId,
                floorPlan: selectedFloorPlan?.name,
                rent: selectedFloorPlan?.rent,
                beds: selectedFloorPlan?.beds,
                baths: selectedFloorPlan?.baths,
                sqft: selectedFloorPlan?.sqft,
                specialLabel: selectedFloorPlan?.special?.label || null,
                unitSnapshot: leadForm.selectedUnit
                    ? {
                        unit: leadForm.selectedUnit,
                        rent: selectedUnitDetails?.rent || null,
                        available: selectedUnitDetails?.available || null,
                        requestCount: selectedUnitDetails?.requestCount || 0,
                    }
                    : null,
            },
            priority: leadForm.selectedUnit
                ? "high"
                : selectedFloorPlan
                    ? "medium"
                    : "normal", contactMethod: leadForm.contactMethod || null,
            moveInDate: leadForm.moveInDate || null,
            leadScore: getLeadScore(),
            leadIntent: getLeadIntent(),

        };

        const adminLeadPayload = {
            id: `property-lead-${Date.now()}`,
            name: leadForm.name.trim(),
            phone: leadForm.phone.trim(),
            email: leadForm.email.trim(),
            preference: `${leadBedrooms} - ${leadArea} - ${leadBudget} budget`,
            bedrooms: leadBedrooms,
            budget: leadBudget,
            moveIn: leadMoveIn,
            status: "New Lead",
            quality: leadForm.selectedUnit || selectedFloorPlan ? "High Intent" : "New",
            priority: leadForm.selectedUnit ? "High" : selectedFloorPlan ? "High" : "Medium",
            source: selectedFloorPlan ? "Property floor plan page" : "Property listing page",
            sourcePropertyId,
            sourcePropertyName,
            assignedTo: "Unassigned",
            lastTouch: "Just now",
            notes: leadNotes,
            recommendedPropertyIds: [sourcePropertyId].filter(Boolean),
            token: `lead-${Date.now()}`,
            contactMethod: leadForm.contactMethod || "Text",
            createdAt,
            landingPage: `${window.location.pathname}${window.location.search}`,
            referrer: document.referrer || "",
        };

        try {
            setIsSubmittingLead(true);
            const savedLead = await saveSupabaseLead(adminLeadPayload);

            saveLeadEventInBackground({
                leadId: savedLead.id,
                eventType: "lead_submitted",
                propertyId: sourcePropertyId,
                propertyName: sourcePropertyName,
                metadata: leadData,
            });

            setLeadSubmitted(true);
        } catch (error) {
            console.error(error);

            if (isLocalFallbackEnabled) {
                saveLocalLead(adminLeadPayload);
                setLeadSubmitted(true);
                return;
            }

            setShowSidebarError(true);
            setLeadFormError("Could not save this request. Please try again.");
        } finally {
            setIsSubmittingLead(false);
        }
    };

    const [leadSubmitted, setLeadSubmitted] = useState(false);

    if (!property || property.status !== "Live") {
        return (
            <main className="min-h-screen bg-[#f5f8f1] p-6 text-[#102426]">
                <div className="mx-auto max-w-4xl rounded-3xl border border-[#d7e6df] bg-white p-8 shadow-sm">
                    <h1 className="text-3xl font-black text-[#102426]">
                        {isLoadingProperty ? "Loading property..." : "Property not found"}
                    </h1>

                    <p className="mt-2 text-[#526260]">
                        This property listing is not currently available to renters.
                    </p>

                    <Link
                        to="/properties"
                        className="mt-6 inline-block rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold !text-white hover:bg-[#102426] hover:!text-white"
                    >
                        Back to Search
                    </Link>
                </div>
            </main>
        );
    }

    const rentNumber = selectedFloorPlan
        ? Number(String(selectedFloorPlan.rent || "").replace(/[^0-9]/g, ""))
        : 0;

    const freeWeeks =
        selectedFloorPlan?.special?.freeWeeks ||
        getFreeWeeksFromSpecialLabel(selectedFloorPlan?.special?.label) ||
        0;
    const rentCreditSpecialNumber =
        parseCurrency(
            selectedFloorPlan?.rentCreditSpecial ||
            selectedFloorPlan?.special?.rentCreditSpecial ||
            getRentCreditSpecialFromLabel(selectedFloorPlan?.special?.label)
        );
    const hasSelectedFloorPlanSpecial = Boolean(selectedFloorPlan?.special);
    const hasCalculableSelectedSpecial =
        rentNumber > 0 && (freeWeeks > 0 || rentCreditSpecialNumber > 0);

    const leaseMonths =
        selectedFloorPlan?.leaseTermMonths || 12;

    const effectiveRent =
        rentNumber -
        (rentNumber * (freeWeeks / 4) + rentCreditSpecialNumber) / leaseMonths;

    const monthlySavings =
        rentNumber - effectiveRent;

    const concessionValue = rentNumber * (freeWeeks / 4) + rentCreditSpecialNumber;

    const getLowestUnitRent = (units = []) => {
        if (!units.length) return null;

        return Math.min(
            ...units.map((unit) =>
                Number(unit.rent.replace(/[^0-9]/g, ""))
            )
        );
    };
    const lowestUnitRent = selectedFloorPlan
        ? getLowestUnitRent(selectedFloorPlan.availableUnits)
        : null;

    const highestRequestCount = selectedFloorPlan?.availableUnits?.length
        ? Math.max(...selectedFloorPlan.availableUnits.map((unit) => unit.requestCount || 0))
        : 0;

    const getSnapshotMetricValue = (label, fallback = "Confirm") =>
        renterValueToolkit.snapshotMetrics.find((metric) => metric.label === label)?.value || fallback;
    const listingSummaryCards = [
        {
            label: "Listed rent",
            value: getSnapshotMetricValue("Normal rent", startingRentLabel),
            note: "Before specials and required add-ons",
        },
        {
            label: "Effective value",
            value: getSnapshotMetricValue("Effective value", effectiveRentLabel || startingRentLabel),
            note: hasPropertySpecial ? "Estimated after special" : "No active special applied",
        },
        {
            label: "Availability",
            value: `${availableFloorPlans.length} plan${availableFloorPlans.length === 1 ? "" : "s"}`,
            note: availableUnitCount > 0
                ? `${availableUnitCount} listed unit${availableUnitCount === 1 ? "" : "s"}`
                : "Ask for exact units",
        },
        {
            label: "Fees",
            value: getSnapshotMetricValue("Fees"),
            note: "Parking, utilities, admin/app",
        },
    ];

    const renderCompareTabs = () => (
        <>
            <div className="flex flex-wrap gap-2">
                {["Floor Plans", "Properties", "Details"].map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveCompareTab(tab)}
                        className={`rounded-full px-4 py-2 text-sm font-black ${
                            activeCompareTab === tab
                                ? "bg-[#173f3f] !text-white hover:!text-white"
                                : "bg-[#f5f8f1] text-[#173f3f] hover:bg-[#d7e6df]"
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeCompareTab === "Floor Plans" && (
                compareFloorPlanItems.length > 0 ? (
                    <div className="mt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black text-[#102426]">
                                Selected floor plans
                            </p>
                            <span className="rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-black text-[#173f3f]">
                                {compareFloorPlanItems.length} exact pick
                                {compareFloorPlanItems.length === 1 ? "" : "s"}
                            </span>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {compareFloorPlanItems.map((item) => {
                                const compareProperty = compareProperties.find(
                                    (savedProperty) => savedProperty.id === item.propertyId
                                );

                                return (
                                    <ComparedFloorPlanCard
                                        key={getCompareFloorPlanItemKey(item)}
                                        item={item}
                                        currentPropertyId={property?.id}
                                        fallbackImage={
                                            compareProperty
                                                ? getPropertyPrimaryImage(compareProperty)
                                                : propertyPrimaryImage
                                        }
                                        onRemove={() =>
                                            setCompareFloorPlanItems(removeCompareFloorPlanItem(item))
                                        }
                                    />
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <CompareEmptyState text="Choose exact floor plans below to compare specific layouts." />
                )
            )}

            {activeCompareTab === "Properties" && (
                propertyOnlyCompareProperties.length > 0 ? (
                    <div className="mt-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black text-[#102426]">
                                Properties to compare
                            </p>
                            <span className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-black text-[#8a5b0a]">
                                Choose a floor plan for more detail
                            </span>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {propertyOnlyCompareProperties.map((compareProperty) => {
                                const isCurrentCompareProperty = compareProperty.id === property?.id;

                                return (
                                    <div
                                        key={compareProperty.id}
                                        className="rounded-2xl bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df]"
                                    >
                                        <Link
                                            to={`/properties/${compareProperty.id}`}
                                            className="flex min-w-0 gap-3 hover:opacity-90"
                                        >
                                            <img
                                                src={getPropertyPrimaryImage(compareProperty)}
                                                alt={compareProperty.name}
                                                loading="lazy"
                                                decoding="async"
                                                className="h-14 w-14 shrink-0 rounded-xl object-cover"
                                            />

                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-black text-[#102426]">
                                                    {compareProperty.name}
                                                </span>
                                                {isCurrentCompareProperty && (
                                                    <span className="mt-1 inline-flex rounded-full bg-[#f2b84b] px-2 py-0.5 text-[10px] font-black uppercase text-[#102426]">
                                                        Current page
                                                    </span>
                                                )}
                                                <span className="mt-1 block truncate text-xs font-semibold text-[#526260]">
                                                    {compareProperty.area || compareProperty.city || "Dallas area"}
                                                </span>
                                                <span className="mt-1 block truncate text-xs font-bold text-[#8a5b0a]">
                                                    {compareProperty.special || "View deal details"}
                                                </span>
                                            </span>
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setComparePropertyIds(removeComparePropertyId(compareProperty.id))
                                            }
                                            className="mt-3 w-full rounded-xl bg-[#fff0ea] px-3 py-2 text-xs font-black text-[#e4572e] hover:bg-[#fde8df]"
                                        >
                                            Remove from compare
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <CompareEmptyState text="Property-only cards will appear here before you choose exact floor plans." />
                )
            )}

            {activeCompareTab === "Details" && (
                floorPlanCompareRows.length > 0 ? (
                    <CompareDetailsTable
                        rows={floorPlanCompareRows}
                        onRequestFloorPlan={(floorPlan) =>
                            openFloorPlanAvailabilityRequest(floorPlan)
                        }
                    />
                ) : (
                    <CompareEmptyState text="Choose exact floor plans to unlock the side-by-side shortlist." />
                )
            )}
        </>
    );

    return (

        <main className="min-h-screen bg-[#f5f8f1] pb-32 text-[#102426] md:pb-32">
            <header className="sticky top-0 z-40 border-b border-[#d7e6df] bg-white/95 shadow-sm backdrop-blur">
                <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 py-2 md:px-6">
                    <Link to="/" className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#173f3f] text-[11px] font-black text-[#f2b84b]">
                            BMA
                        </span>
                        <span className="hidden truncate text-sm font-black text-[#102426] sm:block">
                            Below Market Apartments
                        </span>
                    </Link>

                    <a
                        href="#request-info"
                        className="rounded-lg bg-[#f2b84b] px-3.5 py-2.5 text-xs font-black text-[#102426] hover:bg-[#f9d783]"
                    >
                        Find Locator
                    </a>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 pb-5 pt-2 md:px-6 md:pb-6 md:pt-3">
                <Link
                    to="/properties"
                    className="inline-flex items-center gap-2 text-sm font-black text-[#173f3f] hover:text-[#102426]"
                >
                    ← Back to Dallas apartments
                </Link>

                <section className="mt-2 overflow-hidden rounded-2xl bg-[#dcebe4] lg:grid lg:min-h-[420px] lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)] lg:gap-2">
                    {hasPropertyGalleryImages ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setShowGallery(true)}
                                aria-label={`View all ${propertyGalleryImages.length} photos for ${property.name}`}
                                className="relative block h-[320px] w-full overflow-hidden bg-[#dcebe4] text-left lg:h-auto lg:min-h-[420px]"
                            >
                                <img
                                    src={propertyGalleryImages[0].url}
                                    alt={property.name}
                                    fetchPriority="high"
                                    decoding="async"
                                    className="!h-full w-full object-cover"
                                />

                                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#102426]/75 via-[#102426]/25 to-transparent lg:hidden" />

                                <span className="absolute bottom-4 left-4 right-4 inline-flex justify-center rounded-xl bg-white/95 px-4 py-3 text-sm font-black text-[#102426] shadow-[0_14px_34px_rgba(16,36,38,0.38)] ring-2 ring-[#f2d08a] sm:left-auto sm:right-4 sm:w-auto lg:hidden">
                                    View all photos
                                </span>
                            </button>

                            <div className="hidden gap-2 lg:grid lg:grid-cols-2">
                                {[1, 2, 3].map((photoIndex) => {
                                    const image = propertyGalleryImages[photoIndex] || propertyGalleryImages[0];
                                    const isWideTile = photoIndex === 1;
                                    const isLastTile = photoIndex === 3;

                                    return (
                                        <button
                                            key={`${image.url}-${photoIndex}`}
                                            type="button"
                                            onClick={() => setShowGallery(true)}
                                            className={`relative overflow-hidden bg-[#dcebe4] text-left ${
                                                isWideTile ? "col-span-2" : ""
                                            }`}
                                        >
                                            <img
                                                src={image.url}
                                                alt={`${image.category} photo`}
                                                loading="lazy"
                                                decoding="async"
                                                className="!h-full min-h-[206px] w-full object-cover"
                                            />

                                            {isLastTile && (
                                                <span className="absolute bottom-4 right-4 rounded-xl bg-white/95 px-4 py-3 text-sm font-black text-[#102426] shadow-[0_14px_34px_rgba(16,36,38,0.28)] ring-2 ring-[#f2d08a]">
                                                    View {propertyGalleryImages.length} photos
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex min-h-[420px] items-center justify-center bg-[#e8efe9] p-8 text-center lg:col-span-2">
                            <div>
                                <p className="text-lg font-black text-[#102426]">
                                    Photos coming soon
                                </p>
                                <p className="mt-2 text-sm font-semibold text-[#526260]">
                                    This property does not have verified listing photos yet.
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                <section className="grid gap-4 border-b border-[#d7e6df] py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-[#526260]">
                            {heroManagementLabel}
                        </p>
                        <h1 className="mt-1 text-3xl font-black leading-tight text-[#102426] md:text-4xl">
                            {property.name}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold leading-5 text-[#526260]">
                            <span>
                                {addressLabel}
                                {property.yearBuilt ? ` • Built ${property.yearBuilt}` : ""}
                            </span>

                            {hasPropertySpecial && (
                                <span className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-black text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                                    {propertySpecialLabel}
                                </span>
                            )}
                        </div>
                    </div>

                </section>

                <section className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
                    {listingSummaryCards.map((card) => (
                        <div
                            key={card.label}
                            className={`rounded-xl border p-3 ${
                                card.special
                                    ? "border-[#f2d08a] bg-[#fff8e6]"
                                    : "border-[#d7e6df] bg-white"
                            }`}
                        >
                            <p className="text-[10px] font-black uppercase text-[#526260]">
                                {card.label}
                            </p>
                            <p className="mt-1 truncate text-lg font-black text-[#102426]">
                                {card.value}
                            </p>
                            <p className="mt-1 text-xs font-bold leading-4 text-[#526260]">
                                {card.note}
                            </p>
                        </div>
                    ))}
                </section>

                <nav className="sticky top-14 z-30 mb-3 flex gap-1.5 overflow-x-auto rounded-xl border border-[#d7e6df] bg-white/95 p-1.5 shadow-sm backdrop-blur">
                    {[
                        ["Floor plans", "#floor-plans"],
                        ["Map", "#location"],
                        ["Photos", "#photos"],
                        ["Schools", "#schools"],
                    ].map(([label, href], index) => (
                        <a
                            key={label}
                            href={href}
                            onClick={(event) => {
                                if (href === "#photos") {
                                    event.preventDefault();
                                    setShowGallery(true);
                                }
                            }}
                            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black ${
                                index === 0
                                    ? "bg-[#173f3f] !text-white hover:!text-white"
                                    : "text-[#526260] hover:bg-[#f5f8f1] hover:text-[#173f3f]"
                            }`}
                        >
                            {label}
                        </a>
                    ))}
                </nav>

                <div className="mt-4 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_370px] md:items-stretch xl:grid-cols-[minmax(0,1fr)_400px]">
                    <div className="min-w-0">

                                {shouldShowCompareList && (
                                    <div
                                        ref={compareListRef}
                                        className="mt-4 rounded-3xl border border-[#d7e6df] bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-xs font-black uppercase text-[#1f6f63]">
                                                        Compare board
                                                    </p>
                                                    <span className="rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-black text-[#173f3f]">
                                                        {compareItemCount} selected
                                                    </span>
                                                </div>
                                                <h3 className="mt-2 text-xl font-black text-[#102426]">
                                                    Review your saved options side by side.
                                                </h3>
                                                <p className="mt-1 text-sm font-semibold text-[#526260]">
                                                    Open the chart when you are ready to compare rent, specials, size, and availability.
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsCompareBoardOpen(true);
                                                        setActiveCompareTab("Floor Plans");
                                                    }}
                                                    className="w-fit rounded-2xl bg-[#173f3f] px-4 py-2 text-sm font-bold !text-white hover:bg-[#102426] hover:!text-white"
                                                >
                                                    View Comparison Chart
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleClearCompareBoard}
                                                    className="w-fit rounded-2xl border border-[#f2b84b] bg-[#b42318] px-4 py-2 text-sm font-bold !text-white hover:bg-[#8f1d15] hover:!text-white"
                                                >
                                                    Clear all
                                                </button>
                                            </div>
                                        </div>

                                        {compareMessage && (
                                            <p className="mt-4 rounded-2xl bg-[#fff8e6] px-4 py-3 text-sm font-bold text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                                                {compareMessage}
                                            </p>
                                        )}

                                        {propertyOnlyCompareProperties.length === 1 && isPropertyCompared && compareFloorPlanItems.length === 0 && (
                                            <p className="mt-3 rounded-2xl bg-[#fff8e6] px-4 py-3 text-sm font-semibold text-[#8a5b0a]">
                                                Add more properties from search, or choose a floor plan below to compare exact layouts.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/*Floor Plans*/}
                                <div
                                    id="floor-plans"
                                    ref={floorPlansSectionRef}
                                    className="mt-6 scroll-mt-32 rounded-2xl border border-[#d7e6df] bg-white p-4 shadow-sm md:p-5"
                                >
                                    <div>
                                        <p className="text-xs font-black uppercase text-[#1f6f63]">
                                            Available layouts
                                        </p>
                                        <h2 className="mt-1 text-2xl font-black text-[#102426]">
                                            Floor plans
                                        </h2>

                                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#526260]">
                                            Compare listed rent, estimated effective value, specials, and availability without leaving the page.
                                        </p>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap gap-2">
                                            {floorPlanFilters.map((filter) => (
                                                <button
                                                    key={filter}
                                                    onClick={() => {
                                                        setActiveFloorPlanFilter(filter);
                                                        setFloorPlanPage(1);
                                                    }}
                                                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${activeFloorPlanFilter === filter
                                                        ? "bg-[#173f3f] !text-white hover:!text-white"
                                                        : "bg-[#f5f8f1] text-[#173f3f] hover:bg-[#d7e6df]"
                                                        }`}
                                                >
                                                    {formatBedroomLabel(filter)}
                                                </button>
                                            ))}
                                        </div>

                                        <select
                                            value={floorPlanSort}
                                            onChange={(event) => {
                                                setFloorPlanSort(event.target.value);
                                                setFloorPlanPage(1);
                                            }}
                                            className="rounded-full border border-[#d7e6df] bg-white px-3 py-1.5 text-xs font-bold text-[#173f3f]"
                                        >
                                            <option value="recommended">
                                                Sort: Recommended
                                            </option>

                                            <option value="price-low">
                                                Price: Low to High
                                            </option>

                                            <option value="price-high">
                                                Price: High to Low
                                            </option>

                                            <option value="sqft">
                                                Square Feet
                                            </option>

                                            <option value="availability">
                                                Availability
                                            </option>
                                        </select>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f5f8f1] px-4 py-3">
                                        <div>
                                            <p className="text-sm font-black text-[#102426]">
                                                {paginatedFloorPlans.length > 0
                                                    ? `Showing ${floorPlanPageStart}-${floorPlanPageEnd} of ${paginatedFloorPlans.length} ${showUnavailableFloorPlans ? "total" : "available"} floor plan${paginatedFloorPlans.length === 1 ? "" : "s"}`
                                                    : `${availableFloorPlans.length} available floor plan${availableFloorPlans.length === 1 ? "" : "s"}`}
                                            </p>

                                            {availableUnitCount > 0 && !showUnavailableFloorPlans && (
                                                <p className="mt-1 text-xs font-bold text-[#526260]">
                                                    {availableUnitCount} available unit
                                                    {availableUnitCount === 1 ? "" : "s"}
                                                </p>
                                            )}

                                            {unavailableFloorPlans.length > 0 && (
                                                <p className="mt-1 text-xs font-bold text-[#526260]">
                                                    {unavailableFloorPlans.length} unavailable layout
                                                    {unavailableFloorPlans.length === 1 ? "" : "s"}{" "}
                                                    {showUnavailableFloorPlans ? "shown below." : "hidden by default."}
                                                </p>
                                            )}
                                        </div>

                                        {unavailableFloorPlans.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowUnavailableFloorPlans(
                                                        (currentValue) => !currentValue
                                                    );
                                                    setFloorPlanPage(1);
                                                }}
                                                className={`rounded-full px-4 py-2 text-sm font-black ${
                                                    showUnavailableFloorPlans
                                                        ? "bg-[#173f3f] !text-white hover:!text-white"
                                                        : "bg-white text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#d7e6df]"
                                                }`}
                                            >
                                                {showUnavailableFloorPlans
                                                    ? "Hide unavailable"
                                                    : "View unavailable"}
                                            </button>
                                        )}
                                    </div>




                                    {paginatedFloorPlans.length === 0 && (
                                        <div className="mt-6 rounded-2xl bg-[#f5f8f1] p-5 text-center">
                                            <p className="font-bold text-[#102426]">
                                                {filteredFloorPlans.length === 0
                                                    ? "No floor plans found"
                                                    : "No available floor plans right now"}
                                            </p>


                                            <p className="mt-2 text-sm text-[#526260]">
                                                {filteredFloorPlans.length === 0
                                                    ? "Try selecting a different bedroom type."
                                                    : "Use View unavailable to see every layout for this bedroom type."}
                                            </p>
                                        </div>
                                    )}


                                    <div className="mt-5 grid gap-3">
                                        {visibleFloorPlans.map((plan) => {
                                            const compareFloorPlanItem = getFloorPlanCompareItem(property, plan);
                                            const isFloorPlanCompared = compareFloorPlanKeys.has(
                                                getCompareFloorPlanItemKey(compareFloorPlanItem)
                                            );

                                            return (
                                                <FloorPlanCard
                                                    key={plan.name}
                                                    propertyId={propertyId}
                                                    name={plan.name}
                                                    beds={plan.beds}
                                                    baths={plan.baths}
                                                    sqft={plan.sqft}
                                                    rent={plan.rent}
                                                    effectiveRent={plan.effectiveRent}
                                                    marketRent={plan.marketRent}
                                                    marketRentSource={plan.marketRentSource}
                                                    marketRentConfidence={plan.marketRentConfidence}
                                                    marketRentAreaName={plan.marketRentAreaName}
                                                    marketRentLastUpdated={plan.marketRentLastUpdated}
                                                    marketRentPropertyClass={plan.marketRentPropertyClass}
                                                    marketRentClassConfidence={plan.marketRentClassConfidence}
                                                    savings={plan.savings}
                                                    belowMarketPercent={plan.belowMarketPercent}
                                                    available={plan.available}
                                                    availableUnits={plan.availableUnits}
                                                    image={plan.image}
                                                    status={plan.status}
                                                    special={plan.special}
                                                    isCompared={isFloorPlanCompared}
                                                    onToggleCompare={() =>
                                                        handleToggleFloorPlanCompare(
                                                            compareFloorPlanItem,
                                                            isFloorPlanCompared
                                                        )
                                                    }
                                                    onCheckAvailability={() =>
                                                        openFloorPlanAvailabilityRequest(plan)
                                                    }
                                                />
                                            );
                                        })}
                                    </div>

                                    {paginatedFloorPlans.length > FLOOR_PLAN_PAGE_SIZE && (
                                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeFloorPlanPage((currentPage) =>
                                                        Math.max(currentPage - 1, 1)
                                                    )
                                                }
                                                disabled={currentFloorPlanPage === 1}
                                                className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#d7e6df] disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                &lt;
                                            </button>

                                            {Array.from(
                                                { length: totalFloorPlanPages },
                                                (_, index) => index + 1
                                            )
                                                .filter((pageNumber) => {
                                                    if (totalFloorPlanPages <= 7) return true;
                                                    if (
                                                        pageNumber === 1 ||
                                                        pageNumber === totalFloorPlanPages
                                                    ) {
                                                        return true;
                                                    }

                                                    return Math.abs(pageNumber - currentFloorPlanPage) <= 1;
                                                })
                                                .map((pageNumber, index, pages) => {
                                                    const previousPageNumber = pages[index - 1];
                                                    const shouldShowGap =
                                                        previousPageNumber &&
                                                        pageNumber - previousPageNumber > 1;

                                                    return (
                                                        <span
                                                            key={pageNumber}
                                                            className="flex items-center gap-2"
                                                        >
                                                            {shouldShowGap && (
                                                                <span className="px-1 text-sm font-black text-[#526260]">
                                                                    ...
                                                                </span>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => changeFloorPlanPage(pageNumber)}
                                                                className={`h-10 min-w-10 rounded-full px-3 text-sm font-black ${
                                                                    currentFloorPlanPage === pageNumber
                                                                        ? "bg-[#173f3f] !text-white hover:!text-white"
                                                                        : "bg-white text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#d7e6df]"
                                                                }`}
                                                            >
                                                                {pageNumber}
                                                            </button>
                                                        </span>
                                                    );
                                                })}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    changeFloorPlanPage((currentPage) =>
                                                        Math.min(currentPage + 1, totalFloorPlanPages)
                                                    )
                                                }
                                                disabled={currentFloorPlanPage === totalFloorPlanPages}
                                                className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#d7e6df] disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                &gt;
                                            </button>
                                        </div>
                                    )}

                                </div>





                                <div className="mt-8 space-y-6">
                                    <section
                                        id="location"
                                        className="scroll-mt-32 overflow-hidden rounded-3xl border border-[#d7e6df] bg-white shadow-sm"
                                    >
                                        <div className="border-b border-[#edf4ef] p-5 lg:flex lg:items-start lg:justify-between lg:gap-5">
                                            <div>
                                                <p className="text-sm font-black text-[#1f6f63]">
                                                    Location
                                                </p>
                                                <h2 className="mt-2 text-2xl font-black text-[#102426]">
                                                    Map and nearby essentials
                                                </h2>
                                                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#526260]">
                                                    {addressLabel}
                                                </p>
                                            </div>

                                            <a
                                                href="#request-info"
                                                className="mt-4 inline-flex rounded-2xl bg-[#f2b84b] px-4 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783] lg:mt-0"
                                            >
                                                Ask about this area
                                            </a>
                                        </div>

                                        <div className="p-4 md:p-5">
                                            <PropertyLocationMap
                                                property={property}
                                                addressLabel={addressLabel}
                                                nearbyPlaces={nearbyPlaces}
                                                onNearbyPlacesChange={setNearbyPlaces}
                                            />
                                        </div>
                                    </section>

                                    <SchoolSnapshotCard schoolSnapshot={schoolSnapshot} />

                                    <section className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                                        <p className="text-sm font-black text-[#1f6f63]">
                                            About this listing
                                        </p>
                                        <h2 className="mt-2 text-2xl font-black text-[#102426]">
                                            About {property.name}
                                        </h2>
                                        <div className="mt-3 space-y-3 text-sm font-semibold leading-7 text-[#526260]">
                                            {compactSeoSummary.map((paragraph) => (
                                                <p key={paragraph}>{paragraph}</p>
                                            ))}
                                        </div>
                                    </section>
                                </div>


                            </div>

                            <div
                                className="mt-8 flex flex-col gap-4 md:mt-0 md:min-h-full md:self-stretch"
                            >
                                <div id="request-info" className={`order-1 flex scroll-mt-[7rem] flex-col overflow-hidden rounded-2xl border border-[#d7e6df] bg-white shadow-sm md:sticky md:top-[7rem] md:max-h-[calc(100vh-7rem)] md:overflow-y-auto ${intakeCardHeightClass}`}>
                                    <div className="h-1.5 bg-[#f2b84b]" />

                                    <div className={`${intakePanelPaddingClass} flex flex-1 flex-col ${intakePanelLayoutClass}`}>
                                        <p className="text-[11px] font-black uppercase tracking-wide text-[#1f6f63]">
                                            Free locator help
                                        </p>

                                        <h2 className="mt-1 text-lg font-black leading-tight text-[#102426] xl:text-xl">
                                            Get verified pricing
                                        </h2>

                                        <p className="mt-1.5 text-xs font-semibold leading-5 text-[#526260] xl:text-sm">
                                            Confirm specials, fees, and availability before touring.
                                        </p>

                                        <div className={`mt-2.5 truncate rounded-xl px-3 py-2 text-xs font-black ${
                                                hasPropertySpecial
                                                    ? "bg-[#fff8e6] text-[#8a5b0a] ring-1 ring-[#f2d08a]"
                                                    : "bg-[#f5f8f1] text-[#526260] ring-1 ring-[#d7e6df]"
                                            }`}>
                                            {hasPropertySpecial
                                                ? `Listed special: ${propertySpecialLabel}`
                                                : "Ask us to confirm current pricing and availability."}
                                        </div>

                                        <div className={intakeSectionSpacingClass}>
                                            <p className="text-xs font-black uppercase tracking-wide text-[#102426]">
                                                Contact
                                            </p>

                                            <div className={`grid md:grid-cols-2 ${intakeGridSpacingClass}`}>
                                                <input
                                                    type="text"
                                                    placeholder="Your name *"
                                                    value={leadForm.name}
                                                    onChange={(e) =>
                                                        setLeadForm({
                                                            ...leadForm,
                                                            name: e.target.value,
                                                        })
                                                    }
                                                    className={`w-full rounded-xl border border-[#d7e6df] bg-[#fbfdfb] px-3 py-2 text-sm font-semibold outline-none placeholder:text-[#78908a] focus:border-[#2d7dd2] ${intakeFieldSizeClass}`}
                                                />

                                                <input
                                                    type="tel"
                                                    placeholder="Phone number *"
                                                    value={leadForm.phone}
                                                    onChange={(e) =>
                                                        setLeadForm({
                                                            ...leadForm,
                                                            phone: e.target.value,
                                                        })
                                                    }
                                                    className={`w-full rounded-xl border border-[#d7e6df] bg-[#fbfdfb] px-3 py-2 text-sm font-semibold outline-none placeholder:text-[#78908a] focus:border-[#2d7dd2] ${intakeFieldSizeClass}`}
                                                />

                                                <input
                                                    type="email"
                                                    placeholder="Email address *"
                                                    value={leadForm.email}
                                                    onChange={(e) =>
                                                        setLeadForm({
                                                            ...leadForm,
                                                            email: e.target.value,
                                                        })
                                                    }
                                                    className={`w-full rounded-xl border border-[#d7e6df] bg-[#fbfdfb] px-3 py-2 text-sm font-semibold outline-none placeholder:text-[#78908a] focus:border-[#2d7dd2] md:col-span-2 ${intakeFieldSizeClass}`}
                                                />
                                            </div>
                                        </div>

                                        <div className={intakeSectionSpacingClass}>
                                            <p className="text-xs font-black uppercase tracking-wide text-[#102426]">
                                                Search details
                                            </p>

                                            <div className={`grid grid-cols-2 ${intakeGridSpacingClass}`}>
                                                <select
                                                    value={leadForm.moveInDate}
                                                    onChange={(e) =>
                                                        setLeadForm({
                                                            ...leadForm,
                                                            moveInDate: e.target.value,
                                                        })
                                                    }
                                                    className={`w-full rounded-xl border border-[#d7e6df] bg-[#fbfdfb] px-3 py-2 text-sm font-semibold text-[#102426] outline-none focus:border-[#2d7dd2] ${intakeFieldSizeClass}`}
                                                >
                                                    <option value="">Move-in *</option>
                                                    <option value="Immediately">Immediately</option>
                                                    <option value="Within 30 Days">Within 30 Days</option>
                                                    <option value="Within 60 Days">Within 60 Days</option>
                                                    <option value="Within 90 Days">Within 90 Days</option>
                                                    <option value="Just Browsing">Just Browsing</option>
                                                </select>

                                                <select
                                                    value={leadForm.bedroomsNeeded}
                                                    onChange={(e) =>
                                                        setLeadForm({
                                                            ...leadForm,
                                                            bedroomsNeeded: e.target.value,
                                                        })
                                                    }
                                                    className={`w-full rounded-xl border border-[#d7e6df] bg-[#fbfdfb] px-3 py-2 text-sm font-semibold text-[#102426] outline-none focus:border-[#2d7dd2] ${intakeFieldSizeClass}`}
                                                >
                                                    <option value="">Beds *</option>
                                                    <option value="Studio">Studio</option>
                                                    <option value="1 Bed">1 Bed</option>
                                                    <option value="2 Bed">2 Bed</option>
                                                    <option value="3 Bed">3 Bed</option>
                                                </select>

                                                <input
                                                    type="text"
                                                    placeholder="Budget *"
                                                    value={leadForm.budget}
                                                    onChange={(e) =>
                                                        setLeadForm({
                                                            ...leadForm,
                                                            budget: e.target.value,
                                                        })
                                                    }
                                                    className={`w-full rounded-xl border border-[#d7e6df] bg-[#fbfdfb] px-3 py-2 text-sm font-semibold outline-none placeholder:text-[#78908a] focus:border-[#2d7dd2] ${intakeFieldSizeClass}`}
                                                />

                                                <select
                                                    value={leadForm.contactMethod}
                                                    onChange={(e) =>
                                                        setLeadForm({
                                                            ...leadForm,
                                                            contactMethod: e.target.value,
                                                        })
                                                    }
                                                    className={`w-full rounded-xl border border-[#d7e6df] bg-[#fbfdfb] px-3 py-2 text-sm font-semibold text-[#102426] outline-none focus:border-[#2d7dd2] ${intakeFieldSizeClass}`}
                                                >
                                                    <option value="">Contact</option>
                                                    <option value="Text">Text me</option>
                                                    <option value="Call">Call me</option>
                                                    <option value="Email">Email me</option>
                                                </select>
                                            </div>
                                        </div>

                                        <label className={`flex gap-2 rounded-xl bg-[#f5f8f1] font-semibold text-[#526260] ring-1 ring-[#d7e6df] ${intakeConsentClass}`}>
                                            <input
                                                type="checkbox"
                                                checked={leadForm.smsConsent}
                                                onChange={(e) =>
                                                    setLeadForm({
                                                        ...leadForm,
                                                        smsConsent: e.target.checked,
                                                    })
                                                }
                                                className="mt-0.5 h-4 w-4 shrink-0 accent-[#173f3f]"
                                            />
                                            <span>
                                                I agree to receive texts about this property. Reply STOP to opt out.
                                            </span>
                                        </label>

                                        {showSidebarError && (
                                            <p className="mt-2 text-xs font-semibold text-[#e4572e]">
                                                {leadFormError || "Add the required info so we can send the answer."}
                                            </p>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handleFloorPlanLeadSubmit}
                                            disabled={isSubmittingLead || leadSubmitted}
                                            className={`w-full rounded-xl px-4 font-black ${intakeSubmitClass} ${leadSubmitted
                                                ? "cursor-not-allowed bg-[#d7e6df] text-[#526260]"
                                                : "bg-[#f2b84b] !text-[#102426] hover:bg-[#dca33c] hover:!text-[#102426]"
                                                }`}
                                        >
                                            {isSubmittingLead
                                                ? "Sending..."
                                                : leadSubmitted
                                                    ? "Request Sent"
                                                    : "Text me verified details"}
                                        </button>

                                        <p className={`font-semibold text-[#7b8b88] ${intakeFinePrintClass}`}>
                                            No cost to renters. We only follow up about this property and nearby options.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
            </div>
            {showGallery && hasPropertyGalleryImages && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 md:p-6">
                    <div className="mx-auto my-6 max-w-6xl rounded-3xl bg-white p-4 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-[#102426]">
                                    Property Photos
                                </h2>

                                <p className="mt-1 text-sm text-[#526260]">
                                    Showing {filteredGalleryImages.length} of {propertyGalleryImages.length} photos
                                </p>
                            </div>

                            <button
                                onClick={() => setShowGallery(false)}
                                className="rounded-2xl bg-[#f5f8f1] px-4 py-2 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
                            >
                                Close
                            </button>
                        </div>

                        <div className="sticky top-0 z-10 mt-5 flex flex-wrap gap-2 py-4">                            {photoCategories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActivePhotoCategory(category)}
                                className={`rounded-full px-4 py-2 text-sm font-bold shadow-md ${activePhotoCategory === category
                                    ? "bg-[#173f3f] !text-white hover:!text-white"
                                    : "bg-white text-[#173f3f]"
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                        </div>

                        <div className="mt-6 overflow-hidden rounded-3xl bg-[#f5f8f1]">
                            <img
                                src={selectedGalleryPhoto.url}
                                alt={`${selectedGalleryPhoto.category} selected`}
                                decoding="async"
                                className="h-[420px] w-full object-cover"
                            />

                            <div className="p-4">
                                <p className="font-bold text-[#102426]">
                                    {selectedGalleryPhoto.category}
                                </p>
                            </div>
                        </div>




                        <div className="mt-6 grid max-h-[70vh] gap-4 overflow-y-auto md:grid-cols-2">
                            {filteredGalleryImages.map((image) => (
                                <button
                                    key={image.url}
                                    type="button"
                                    onClick={() => setSelectedPhoto(image)}
                                    className="overflow-hidden rounded-2xl bg-[#f5f8f1] text-left"
                                >
                                    <img
                                        src={image.url}
                                        alt={`${image.category} photo`}
                                        loading="lazy"
                                        decoding="async"
                                        className="h-72 w-full object-cover"
                                    />

                                    <div className="p-3">
                                        <p className="font-bold text-[#102426]">
                                            {image.category}
                                        </p>
                                    </div>
                                </button>
                            ))}

                        </div>
                    </div>
                </div>
            )}

            {selectedFloorPlan && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
                    <div className="mx-auto my-8 w-full max-w-5xl rounded-3xl bg-white p-6 shadow-xl">                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-bold text-[#526260]">
                                Floor Plan Details
                            </p>

                            <h2 className="mt-1 text-3xl font-black text-[#102426]">
                                {selectedFloorPlan.name}
                            </h2>

                            <p className="mt-2 text-[#526260]">
                                {formatBedroomLabel(selectedFloorPlan.beds)} • {selectedFloorPlan.baths} • {selectedFloorPlan.sqft}
                            </p>


                        </div>


                        <button
                            onClick={() => setSelectedFloorPlan(null)}
                            className="rounded-2xl bg-[#f5f8f1] px-4 py-2 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
                        >
                            Close
                        </button>
                    </div>
                        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
                            <div>

                                {selectedFloorPlan.image && (
                                    <img
                                        src={selectedFloorPlan.image}
                                        alt={`${selectedFloorPlan.name} floor plan`}
                                        loading="lazy"
                                        decoding="async"
                                        className="mt-5 h-64 w-full rounded-3xl object-cover"
                                    />
                                )}


                                <div className="mt-6 grid gap-4 md:grid-cols-3">

                                    <div className="rounded-2xl bg-[#f5f8f1] p-4">
                                        <p className="text-sm font-bold text-[#526260]">
                                            Starting Rent
                                        </p>

                                        <p className="mt-1 text-2xl font-black text-[#102426]">
                                            {selectedFloorPlan.rent}
                                        </p>
                                    </div>
                                    {hasCalculableSelectedSpecial && (
                                        <div className="rounded-2xl bg-[#fff8e6] p-4 ring-1 ring-[#f2d08a]">
                                            <p className="text-sm font-bold text-[#8a5b0a]">
                                                Estimated Rent After Special                                            </p>

                                            <p className="mt-1 text-2xl font-black text-[#102426]">
                                                ${Math.round(effectiveRent).toLocaleString()}
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-[#7a432e]">
                                                Save about ${Math.round(monthlySavings)}/mo
                                            </p>
                                        </div>

                                    )}

                                    {hasCalculableSelectedSpecial && (
                                        <p className="mt-3 text-sm font-semibold text-[#526260]">
                                            Rent after special is estimated using a {leaseMonths}-month lease term.
                                        </p>
                                    )}

                                    {selectedFloorPlan.marketRent && (
                                        <div className="rounded-2xl bg-[#f5f8f1] p-4">
                                            <p className="text-sm font-bold text-[#526260]">
                                                {getMarketRentCopy(selectedFloorPlan).title}
                                            </p>

                                            <p className="mt-1 text-2xl font-black text-[#102426]">
                                                {selectedFloorPlan.marketRent}
                                            </p>

                                            {selectedFloorPlan.marketRentSource && (
                                                <p className="mt-1 text-sm font-semibold text-[#526260]">
                                                    {getMarketRentCopy(selectedFloorPlan).detailNote}
                                                </p>
                                            )}
                                        </div>
                                    )}


                                </div>
                                <div className="mt-6 rounded-3xl border border-[#d7e6df] bg-white p-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black text-[#102426]">
                                            Available Units
                                        </h3>

                                        <div className="flex flex-wrap gap-2">
                                            {selectedFloorPlan.availableUnits?.length > 2 ? (
                                                <span className="rounded-full bg-[#d8efe6] px-3 py-1 text-xs font-bold text-[#1f6f63]">
                                                    Multiple Units Available
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-bold text-[#8a5b0a]">
                                                    Low Availability
                                                </span>
                                            )}

                                            <span className="rounded-full bg-[#f5f8f1] px-3 py-1 text-xs font-bold text-[#173f3f]">
                                                {selectedFloorPlan.availableUnits?.length || 0} Units
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {selectedFloorPlan.availableUnits?.length > 0 ? (
                                            sortedUnits.map((unit) => (
                                                <div
                                                    key={unit.unit}
                                                    className={`flex items-center justify-between rounded-2xl p-4 ${leadForm.selectedUnit === unit.unit
                                                        ? "border border-[#a9cfc2] bg-[#e7f3ee]"
                                                        : "bg-[#f5f8f1]"
                                                        }`}                                                >
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-bold text-[#102426]">
                                                                Unit {unit.unit}
                                                            </p>

                                                            {isRenovatedUnit(unit) && (
                                                                <span className="rounded-full bg-[#fff8e6] px-2 py-1 text-xs font-black text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                                                                    Renovated
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {unit.requestCount > 0 &&
                                                                unit.requestCount === highestRequestCount && (
                                                                    <span className="rounded-full bg-[#eef5ff] px-2 py-1 text-xs font-bold text-[#174a7c]">
                                                                        Most Requested
                                                                    </span>
                                                                )}

                                                            {Number(unit.rent.replace(/[^0-9]/g, "")) === lowestUnitRent && (
                                                                <span className="rounded-full bg-[#e7f3ee] px-2 py-1 text-xs font-bold text-[#1f6f63]">
                                                                    Best Value
                                                                </span>
                                                            )}

                                                            {unit.available === "Available Now" && (
                                                                <span className="rounded-full bg-[#d8efe6] px-2 py-1 text-xs font-bold text-[#1f6f63]">
                                                                    Available Now
                                                                </span>
                                                            )}

                                                            {unit.status && (
                                                                <span className={`rounded-full px-2 py-1 text-xs font-bold ${unit.status === "available"
                                                                    ? "bg-[#d8efe6] text-[#1f6f63]"
                                                                    : unit.status === "pending"
                                                                        ? "bg-[#fff8e6] text-[#8a5b0a]"
                                                                        : "bg-[#d7e6df] text-[#173f3f]"
                                                                    }`}>
                                                                    {unit.status}
                                                                </span>
                                                            )}

                                                            {unit.currentSpecial && (
                                                                <span className="rounded-full bg-[#fff8e6] px-2 py-1 text-xs font-bold text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                                                                    {cleanUnitSpecialLabel(unit.currentSpecial)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {unit.available !== "Available Now" && (
                                                            <p className="mt-2 text-sm text-[#526260]">
                                                                {unit.available}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">


                                                        <p className="text-2xl font-black text-[#102426]">
                                                            {unit.rent}
                                                        </p>

                                                        <button
                                                            onClick={() => {
                                                                setLeadSubmitted(false);
                                                                setLeadForm(getEmptyLeadForm(unit.unit));

                                                                document
                                                                    .getElementById("floor-plan-lead-form")
                                                                    ?.scrollIntoView({
                                                                        behavior: "smooth",
                                                                        block: "start",
                                                                    });
                                                            }}
                                                            className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold !text-white hover:!text-white ${leadForm.selectedUnit === unit.unit
                                                                ? "bg-[#1f6f63]"
                                                                : "bg-[#173f3f] hover:bg-[#102426]"
                                                                }`}
                                                        >
                                                            {leadForm.selectedUnit === unit.unit
                                                                ? "✓ Selected"
                                                                : "Check Unit"}                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl bg-[#f5f8f1] p-4 text-sm font-semibold text-[#526260]">
                                                Contact us for the latest available units.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {hasSelectedFloorPlanSpecial && (
                                    <div className="mt-5 rounded-2xl bg-[#fff8e6] p-4 ring-1 ring-[#f2d08a]">
                                        <p className="text-sm font-bold text-[#8a5b0a]">
                                            Special Offer
                                        </p>
                                        <p className="mt-1 font-black text-[#102426]">
                                            {selectedFloorPlan.special.label}
                                        </p>
                                        {hasCalculableSelectedSpecial ? (
                                            <>
                                                <p className="mt-2 text-sm font-semibold text-[#7a432e]">
                                                    Estimated concession value: ${Math.round(concessionValue).toLocaleString()}
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-[#7a432e]">
                                                    Based on listed rent specials spread across a {leaseMonths}-month lease.
                                                </p>
                                            </>
                                        ) : (
                                            <p className="mt-2 text-sm font-semibold text-[#7a432e]">
                                                Contact us to confirm exactly how this special is applied.
                                            </p>
                                        )}


                                    </div>
                                )}

                            </div>

                            <div className="rounded-3xl border border-[#d7e6df] bg-[#f5f8f1] p-5">
                                <h3 className="text-xl font-black text-[#102426]">
                                    {leadForm.selectedUnit
                                        ? `Check Unit ${leadForm.selectedUnit} availability`
                                        : "Check availability for this layout"}
                                </h3>

                                <p className="mt-2 text-sm text-[#526260]">
                                    {leadForm.selectedUnit
                                        ? `Get current pricing, availability, and special details for Unit ${leadForm.selectedUnit}.`
                                        : `Get current pricing, availability, and special details for ${selectedFloorPlan.name}.`}
                                </p>


                                <div className="mt-4 rounded-2xl bg-white p-4">
                                    <p className="text-sm font-bold text-[#102426]">
                                        Local Apartment Locator
                                    </p>

                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#173f3f] text-sm font-black text-white">
                                            JM
                                        </div>

                                        <div>
                                            <p className="font-bold text-[#102426]">
                                                Jalen McNeal
                                            </p>


                                            <p className="text-sm text-[#526260]">
                                                Dallas apartment specialist
                                            </p>
                                            <a
                                                href="tel:9452693768"
                                                onClick={() => handleCallTextClick("floor_plan_modal")}
                                                className="mt-3 block text-center text-sm font-bold text-[#526260] hover:text-[#102426]"
                                            >
                                                📞 Call or Text Jalen (945) 269-3768
                                            </a>
                                        </div>
                                    </div>


                                    <p className="mt-3 text-sm leading-6 text-[#526260]">
                                        I’ll help confirm current pricing, specials, and similar options that may fit your move-in timeline.
                                    </p>
                                </div>

                                {leadForm.selectedUnit && (
                                    <div className="mt-4 rounded-2xl border border-[#a9cfc2] bg-[#e7f3ee] p-3">

                                        <p className="text-sm font-bold text-[#1f6f63]">
                                            ✓ Selected Unit
                                        </p>

                                        <p className="mt-1 font-black text-[#102426]">
                                            Unit {leadForm.selectedUnit}
                                        </p>
                                        {selectedUnitDetails && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {selectedUnitDetails.requestCount > 0 &&
                                                    selectedUnitDetails.requestCount === highestRequestCount && (
                                                        <span className="rounded-full bg-[#eef5ff] px-2 py-1 text-xs font-bold text-[#174a7c]">
                                                            Most Requested
                                                        </span>
                                                    )}

                                                {Number(selectedUnitDetails.rent.replace(/[^0-9]/g, "")) === lowestUnitRent && (
                                                    <span className="rounded-full bg-[#d8efe6] px-2 py-1 text-xs font-bold text-[#1f6f63]">
                                                        Best Value
                                                    </span>
                                                )}

                                                {selectedUnitDetails.available === "Available Now" && (
                                                    <span className="rounded-full bg-[#d8efe6] px-2 py-1 text-xs font-bold text-[#1f6f63]">
                                                        Available Now
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {selectedUnitDetails && (
                                            <p className="mt-1 text-sm font-semibold text-[#526260]">
                                                {selectedUnitDetails.rent}
                                                {selectedUnitDetails.available !== "Available Now" &&
                                                    ` • ${selectedUnitDetails.available}`}                                            </p>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLeadSubmitted(false);

                                                setLeadForm({
                                                    ...leadForm,
                                                    selectedUnit: "",
                                                });
                                            }}
                                            className="mt-3 text-xs font-bold text-[#526260] underline hover:text-[#102426]"
                                        >
                                            Check entire floor plan instead
                                        </button>
                                    </div>
                                )}

                                <div
                                    id="floor-plan-lead-form"
                                    className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-[#d7e6df]"
                                >
                                    <p className="text-sm font-black text-[#102426]">
                                        Your contact info
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-[#526260]">
                                        Name, phone, email, budget, and move-in timing are required so this request appears correctly in admin.
                                    </p>

                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        <input
                                            name="Your name"
                                            type="text"
                                            placeholder="Your name *"
                                            value={leadForm.name}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    name: e.target.value,
                                                })
                                            }
                                            className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        />

                                        <input
                                            name="phone"
                                            type="tel"
                                            placeholder="Phone number *"
                                            value={leadForm.phone}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    phone: e.target.value,
                                                })
                                            }
                                            className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        />
                                        <input
                                            name="email"
                                            type="email"
                                            placeholder="Email address *"
                                            value={leadForm.email}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    email: e.target.value,
                                                })
                                            }
                                            className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2] md:col-span-2"
                                        />

                                        <input
                                            name="budget"
                                            type="text"
                                            placeholder="Budget *"
                                            value={leadForm.budget}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    budget: e.target.value,
                                                })
                                            }
                                            className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        />

                                        <select
                                            name="moveInDate"
                                            value={leadForm.moveInDate}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    moveInDate: e.target.value,
                                                })
                                            }
                                            className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        >
                                            <option value="">Move-in timeline *</option>
                                            <option value="Immediately">Immediately</option>
                                            <option value="Within 30 Days">Within 30 Days</option>
                                            <option value="Within 60 Days">Within 60 Days</option>
                                            <option value="Within 90 Days">Within 90 Days</option>
                                            <option value="More Than 90 Days">More Than 90 Days</option>
                                        </select>

                                        <select
                                            name="bedroomsNeeded"
                                            value={leadForm.bedroomsNeeded}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    bedroomsNeeded: e.target.value,
                                                })
                                            }
                                            className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        >
                                            <option value="">
                                                {selectedFloorPlan
                                                    ? `Use ${formatBedroomLabel(selectedFloorPlan.beds, selectedFloorPlan.name)}`
                                                    : "Bedrooms *"}
                                            </option>
                                            <option value="Studio">Studio</option>
                                            <option value="1 Bed">1 Bed</option>
                                            <option value="2 Bed">2 Bed</option>
                                            <option value="3 Bed">3 Bed</option>
                                        </select>

                                        <select
                                            name="contactMethod"
                                            value={leadForm.contactMethod}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    contactMethod: e.target.value,
                                                })
                                            }
                                            className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        >
                                            <option value="">Preferred contact (optional)</option>
                                            <option value="Text">Text me</option>
                                            <option value="Call">Call me</option>
                                            <option value="Email">Email me</option>
                                        </select>
                                    </div>

                                    <label className="mt-4 flex gap-3 rounded-2xl bg-[#f5f8f1] p-4 text-xs font-semibold leading-5 text-[#526260] ring-1 ring-[#d7e6df]">
                                        <input
                                            type="checkbox"
                                            checked={leadForm.smsConsent}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    smsConsent: e.target.checked,
                                                })
                                            }
                                            className="mt-1 h-4 w-4 shrink-0 accent-[#173f3f]"
                                        />
                                        <span>
                                            I agree to receive recurring text messages from Below Market Apartments about apartment search help, property recommendations, tour coordination, and follow-up. Reply HELP for help or STOP to opt out.
                                        </span>
                                    </label>

                                    {showSidebarError && (
                                        <p className="mt-3 text-sm font-semibold text-[#e4572e]">
                                            {leadFormError || "Add the required info so we can check availability."}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-4 rounded-2xl bg-[#f5f8f1] p-4">
                                    <p className="text-sm font-semibold text-[#173f3f]">
                                        ✓ No cost to renters
                                    </p>

                                    <p className="mt-2 text-sm font-semibold text-[#173f3f]">
                                        ✓ Access to active leasing specials
                                    </p>

                                    <p className="mt-2 text-sm font-semibold text-[#173f3f]">
                                        ✓ Fast response from a local apartment locator
                                    </p>
                                </div>

                                {leadSubmitted && (
                                    <div className="mt-4 rounded-2xl p-4 text-sm font-bold text-[#1f6f63]">
                                        {leadForm.selectedUnit
                                            ? `✅ Request received for Unit ${leadForm.selectedUnit}. We'll follow up with current pricing and availability.`
                                            : `✅ Request received for ${selectedFloorPlan.name}. We'll follow up with current pricing and availability.`}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleFloorPlanLeadSubmit}
                                    disabled={isSubmittingLead || leadSubmitted}
                                    className={`mt-6 w-full rounded-2xl px-5 py-3 text-sm font-black ${leadSubmitted
                                        ? "cursor-not-allowed bg-[#d7e6df] text-[#526260]"
                                        : "bg-[#f2b84b] text-[#102426] hover:bg-[#f9d783]"
                                        }`}
                                >
                                    {isSubmittingLead
                                        ? "Sending..."
                                        : leadSubmitted
                                            ? "Availability Request Sent"
                                            : leadForm.selectedUnit
                                                ? `Check Unit ${leadForm.selectedUnit} Availability`
                                                : `Check ${selectedFloorPlan.name} Availability`}
                                </button>


                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isCompareBoardOpen && shouldShowCompareList && (
                <CompareChartModal
                    compareItemCount={compareItemCount}
                    onClearCompare={handleClearCompareBoard}
                    onClose={() => setIsCompareBoardOpen(false)}
                >
                    {compareMessage && (
                        <p className="mb-4 rounded-2xl bg-[#fff8e6] px-4 py-3 text-sm font-bold text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                            {compareMessage}
                        </p>
                    )}

                    {renderCompareTabs()}
                </CompareChartModal>
            )}

            {shouldShowCompareList && (
                <PropertyCompareDock
                    compareItemCount={compareItemCount}
                    compareMessage={compareMessage}
                    onClearCompare={handleClearCompareBoard}
                    onViewCompare={handleViewCompareDock}
                />
            )}

        </main>
    );
}

function CompareChartModal({
    children,
    compareItemCount,
    onClearCompare,
    onClose,
}) {
    return (
        <div
            className="fixed inset-0 z-[70] bg-[#102426]/60 px-3 py-4 backdrop-blur-sm sm:px-5"
            role="dialog"
            aria-modal="true"
            aria-label="Comparison chart"
        >
            <div className="mx-auto flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#d7e6df]">
                <div className="flex flex-col gap-3 border-b border-[#d7e6df] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-[#1f6f63]">
                            Comparison chart
                        </p>
                        <h2 className="mt-1 text-xl font-black text-[#102426]">
                            Compare {compareItemCount} selected option
                            {compareItemCount === 1 ? "" : "s"}
                        </h2>
                    </div>

                    <div className="grid grid-cols-[1fr_1fr] gap-2 sm:flex sm:shrink-0">
                        <button
                            type="button"
                            onClick={onClearCompare}
                            className="rounded-xl bg-[#b42318] px-4 py-2.5 text-sm font-black !text-white hover:bg-[#8f1d15] hover:!text-white"
                        >
                            Clear all
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-[#f5f8f1] px-4 py-2.5 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
                        >
                            Close
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                    {children}
                </div>
            </div>
        </div>
    );
}

function PropertyCompareDock({
    compareItemCount,
    compareMessage,
    onClearCompare,
    onViewCompare,
}) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d7e6df] bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(16,36,38,0.12)] backdrop-blur">
            <div className="mx-auto flex w-[min(1180px,calc(100vw-24px))] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-black text-[#102426]">
                        Compare list ready
                    </p>
                    <p className="mt-0.5 truncate text-xs font-bold text-[#526260]">
                        {compareMessage ||
                            `${compareItemCount} option${compareItemCount === 1 ? "" : "s"} selected. View them side by side before you tour.`}
                    </p>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:shrink-0 sm:items-center">
                    <button
                        type="button"
                        onClick={onViewCompare}
                        className="rounded-lg bg-[#173f3f] px-4 py-3 text-sm font-black !text-white shadow-sm transition hover:bg-[#102426] hover:!text-white"
                    >
                        View comparison ({compareItemCount})
                    </button>
                    <button
                        type="button"
                        onClick={onClearCompare}
                        className="rounded-lg bg-[#c9341c] px-4 py-3 text-sm font-black !text-white transition hover:bg-[#a92a18] hover:!text-white"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}

function getCleanNearbyPlaceLabel(place) {
    if (place?.label) return place.label;

    return String(place?.label || "")
        .replace(/^Nearby\s+/i, "")
        .trim() || "Nearby place";
}

function SchoolSnapshotCard({ schoolSnapshot }) {
    return (
        <div id="schools" className="scroll-mt-32 rounded-3xl border border-[#d7e6df] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-black text-[#1f6f63]">
                        School District
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black leading-tight text-[#102426]">
                            {schoolSnapshot.district}
                        </h2>
                        <span className={`rounded-2xl px-3 py-2 text-sm font-black ${getSchoolGradeClass(schoolSnapshot.districtGrade)}`}>
                            {schoolSnapshot.districtGrade}
                        </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#526260]">
                        Location-based school guidance. Verify attendance zones before applying.
                    </p>
                </div>

                <p className="rounded-2xl bg-[#f5f8f1] px-4 py-3 text-xs font-bold leading-5 text-[#526260] ring-1 ring-[#d7e6df] lg:max-w-sm">
                    {schoolSnapshot.note}
                </p>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {schoolSnapshot.schools.map((school) => (
                    <SchoolGradeItem key={`${school.level}-${school.name}`} school={school} />
                ))}
            </div>
        </div>
    );
}

function SchoolGradeItem({ school }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-[#1f6f63]">
                        {school.level}
                    </p>
                    <p className="mt-1 truncate font-black text-[#102426]">
                        {school.name}
                    </p>
                </div>

                <span className={`shrink-0 rounded-xl px-3 py-1 text-sm font-black ${getSchoolGradeClass(school.grade)}`}>
                    {school.grade}
                </span>
            </div>

            <p className="mt-2 text-xs font-semibold leading-5 text-[#526260]">
                Confirm with district
            </p>
        </div>
    );
}

function getPropertySchoolSnapshot(property) {
    const zipCode = String(property?.zipcode || property?.zip || "").trim();
    const cityKey = String(property?.city || "").trim().toLowerCase();
    const locationSnapshot =
        SCHOOL_DISTRICT_BY_ZIP[zipCode] || SCHOOL_DISTRICT_BY_CITY[cityKey] || null;
    const district = property?.schoolDistrict || locationSnapshot?.district || "School district not listed";
    const districtGrade =
        property?.schoolGrade || property?.districtGrade || locationSnapshot?.districtGrade || "Verify";
    const hasExactAddress = hasPreciseStreetAddress(property);
    const schools = normalizeSchoolList(property?.schools, district);
    const shouldVerify = districtGrade === "Verify" || !hasExactAddress;
    const note =
        property?.schoolNote ||
        (shouldVerify
            ? "School information is location-based guidance. Add or confirm the full street address and verify attendance zones with the district before a renter applies."
            : "School information is tied to this property location. Attendance zones and ratings can change, so renters should verify directly with the school district.");

    return {
        district,
        districtGrade,
        schools,
        note,
    };
}

function normalizeSchoolList(schools, district) {
    const sourceSchools = Array.isArray(schools) && schools.length > 0
        ? schools
        : DEFAULT_SCHOOL_LEVELS;

    return sourceSchools.map((school) => ({
        level: school.level || "School",
        name: school.name || `${school.level || "School"} zone`,
        grade: school.grade || "Verify",
        note:
            school.note ||
            `Location-based estimate. Confirm attendance zone with ${district}.`,
    }));
}

function getSchoolGradeClass(grade) {
    const gradeLabel = String(grade || "").trim().toUpperCase();

    if (!gradeLabel || gradeLabel === "VERIFY") {
        return "bg-[#f5f8f1] text-[#526260] ring-1 ring-[#d7e6df]";
    }

    if (gradeLabel.startsWith("A")) {
        return "bg-[#d8efe6] text-[#1f6f63] ring-1 ring-[#a9cfc2]";
    }

    if (gradeLabel.startsWith("B")) {
        return "bg-[#eef5ff] text-[#174a7c] ring-1 ring-[#b8d9f0]";
    }

    if (gradeLabel.startsWith("C")) {
        return "bg-[#fff8e6] text-[#8a5b0a] ring-1 ring-[#f2d08a]";
    }

    return "bg-[#fff0ea] text-[#7a432e] ring-1 ring-[#f4c8b8]";
}

function PropertyLocationMap({
    property,
    addressLabel,
    nearbyPlaces,
    onNearbyPlacesChange,
}) {
    const mapSectionRef = useRef(null);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const [shouldLoadMap, setShouldLoadMap] = useState(false);
    const [mapboxGl, setMapboxGl] = useState(null);
    const [mapError, setMapError] = useState(
        MAPBOX_TOKEN ? "" : "Map token is missing."
    );
    const [propertyCoordinates, setPropertyCoordinates] = useState(null);

    useEffect(() => {
        const mapSection = mapSectionRef.current;
        if (!mapSection) return undefined;

        if (!("IntersectionObserver" in window)) {
            setShouldLoadMap(true);
            return undefined;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldLoadMap(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "900px 0px" }
        );

        observer.observe(mapSection);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let isMounted = true;

        if (!MAPBOX_TOKEN || !shouldLoadMap) return undefined;

        loadMapboxGl()
            .then((loadedMapboxGl) => {
                if (isMounted) {
                    loadedMapboxGl.accessToken = MAPBOX_TOKEN;
                    setMapboxGl(loadedMapboxGl);
                }
            })
            .catch((error) => {
                console.error(error);
                if (isMounted) {
                    setMapError("Could not load the live map.");
                }
            });

        return () => {
            isMounted = false;
        };
    }, [shouldLoadMap]);

    useEffect(() => {
        let isMounted = true;

        if (!shouldLoadMap) return undefined;

        resolvePropertyCoordinates(property)
            .then((coordinates) => {
                if (isMounted) {
                    setPropertyCoordinates(coordinates || DALLAS_CENTER);
                }
            })
            .catch((error) => {
                console.error(error);
                if (isMounted) {
                    setPropertyCoordinates(DALLAS_CENTER);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [property, shouldLoadMap]);

    useEffect(() => {
        let isMounted = true;

        if (!shouldLoadMap || !propertyCoordinates) return undefined;

        onNearbyPlacesChange([]);

        const nearbyPlacesTimer = window.setTimeout(() => {
            resolveNearbyPlaces(propertyCoordinates)
                .then((places) => {
                    if (isMounted) {
                        onNearbyPlacesChange(places);
                    }
                })
                .catch((error) => {
                    console.error(error);
                    if (isMounted) {
                        onNearbyPlacesChange([]);
                    }
                });
        }, 900);

        return () => {
            isMounted = false;
            window.clearTimeout(nearbyPlacesTimer);
        };
    }, [onNearbyPlacesChange, propertyCoordinates, shouldLoadMap]);

    useEffect(() => {
        if (!mapboxGl || !propertyCoordinates || !mapContainerRef.current) return;

        if (!mapRef.current) {
            mapRef.current = new mapboxGl.Map({
                container: mapContainerRef.current,
                style: "mapbox://styles/mapbox/streets-v12",
                center: [propertyCoordinates.longitude, propertyCoordinates.latitude],
                zoom: 14,
                attributionControl: false,
            });

            mapRef.current.addControl(
                new mapboxGl.NavigationControl({ showCompass: false }),
                "bottom-right"
            );
        } else {
            mapRef.current.flyTo({
                center: [propertyCoordinates.longitude, propertyCoordinates.latitude],
                zoom: 14,
                duration: 500,
            });
        }

        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        const hoverPopupBindings = [];

        const isApproximatePin = propertyCoordinates.mapAccuracy === "approximate";
        const propertyPopup = new mapboxGl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 28,
        }).setHTML(
            `<strong>${escapeMapText(property?.name || "Property")}</strong><br>${escapeMapText(
                addressLabel
            )}${
                isApproximatePin
                    ? "<br><em>Approximate location until a full street address is added.</em>"
                    : ""
            }`
        );
        const propertyMarker = new mapboxGl.Marker({
            element: createPropertyMapMarker(
                property?.name || "Property",
                isApproximatePin,
                addressLabel
            ),
            anchor: "bottom",
        })
            .setLngLat([propertyCoordinates.longitude, propertyCoordinates.latitude])
            .addTo(mapRef.current);

        bindMapMarkerHoverPopup(propertyMarker, propertyPopup, mapRef.current);
        hoverPopupBindings.push({ marker: propertyMarker, popup: propertyPopup });
        markersRef.current.push(propertyMarker);

        nearbyPlaces.forEach((place) => {
            const nearbyPopup = new mapboxGl.Popup({
                closeButton: false,
                closeOnClick: false,
                offset: 20,
            }).setHTML(
                `<strong>${escapeMapText(getCleanNearbyPlaceLabel(place))}</strong><br>${escapeMapText(
                    place.detail
                )}<br>${escapeMapText(place.distanceMiles.toFixed(1))} miles away`
            );
            const marker = new mapboxGl.Marker({
                element: createNearbyMapMarker(place),
                anchor: "bottom",
            })
                .setLngLat([place.longitude, place.latitude])
                .addTo(mapRef.current);

            bindMapMarkerHoverPopup(marker, nearbyPopup, mapRef.current);
            hoverPopupBindings.push({ marker, popup: nearbyPopup });
            markersRef.current.push(marker);
        });

        const unbindHoverPopups = bindMapMarkerHoverPopups(
            mapRef.current,
            hoverPopupBindings
        );

        return () => {
            unbindHoverPopups();
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current = [];
        };
    }, [addressLabel, mapboxGl, nearbyPlaces, property, propertyCoordinates]);

    useEffect(
        () => () => {
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current = [];
            mapRef.current?.remove();
            mapRef.current = null;
        },
        []
    );

    if (mapError) {
        return (
            <div className="flex h-80 items-center justify-center rounded-2xl border border-[#d7e6df] bg-[#d7e6df]">
                <div className="px-6 text-center">
                    <p className="text-lg font-black text-[#173f3f]">
                        Map could not load
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#526260]">
                        {addressLabel}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div ref={mapSectionRef} className="overflow-hidden rounded-2xl border border-[#d7e6df] bg-[#dcebe4]">
            {shouldLoadMap ? (
                <div ref={mapContainerRef} className="h-[420px] w-full md:h-[480px]" />
            ) : (
                <div className="flex h-[420px] w-full items-center justify-center bg-[#dcebe4] md:h-[480px]">
                    <p className="rounded-full bg-white px-5 py-3 text-sm font-black text-[#173f3f] shadow-sm">
                        Map loading as you scroll
                    </p>
                </div>
            )}
            <div className="grid max-h-32 gap-2 overflow-y-auto border-t border-[#d7e6df] bg-white p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <MapLegendItem
                    color="bg-[#f2b84b]"
                    label="Property"
                />
                <MapLegendItem
                    color="bg-[#2d7dd2]"
                    label="Walmart"
                    distance={getNearbyLegendDistance(nearbyPlaces, "walmart")}
                />
                <MapLegendItem
                    color="bg-[#e4572e]"
                    label="Target"
                    distance={getNearbyLegendDistance(nearbyPlaces, "target")}
                />
                <MapLegendItem
                    color="bg-[#173f3f]"
                    label="LA Fitness"
                    distance={getNearbyLegendDistance(nearbyPlaces, "laFitness")}
                />
                <MapLegendItem
                    color="bg-[#8a5b0a]"
                    label="Planet Fitness"
                    distance={getNearbyLegendDistance(nearbyPlaces, "planetFitness")}
                />
                <MapLegendItem
                    color="bg-[#1f6f63]"
                    label="Kroger"
                    distance={getNearbyLegendDistance(nearbyPlaces, "kroger")}
                />
            </div>
        </div>
    );
}

function MapLegendItem({ color, label, distance }) {
    return (
        <div className="flex min-w-0 items-center gap-2 rounded-xl bg-[#f5f8f1] px-3 py-2 text-xs font-black text-[#102426]">
            <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {distance && (
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#526260]">
                    {distance}
                </span>
            )}
        </div>
    );
}

function getNearbyLegendDistance(nearbyPlaces, type) {
    const matchedPlace = nearbyPlaces.find((place) => place.type === type);

    if (!matchedPlace || !Number.isFinite(matchedPlace.distanceMiles)) return "";

    return `${matchedPlace.distanceMiles.toFixed(1)} mi`;
}

function loadMapboxGl() {
    if (window.mapboxgl) {
        return Promise.resolve(window.mapboxgl);
    }

    if (!document.querySelector("link[data-mapbox-gl='true']")) {
        const mapboxStyles = document.createElement("link");
        mapboxStyles.rel = "stylesheet";
        mapboxStyles.href = "https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.css";
        mapboxStyles.dataset.mapboxGl = "true";
        document.head.appendChild(mapboxStyles);
    }

    const existingScript = document.querySelector("script[data-mapbox-gl='true']");
    if (existingScript) {
        return new Promise((resolve, reject) => {
            existingScript.addEventListener("load", () => resolve(window.mapboxgl), {
                once: true,
            });
            existingScript.addEventListener("error", reject, { once: true });
        });
    }

    return new Promise((resolve, reject) => {
        const mapboxScript = document.createElement("script");
        mapboxScript.src = "https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.js";
        mapboxScript.async = true;
        mapboxScript.dataset.mapboxGl = "true";
        mapboxScript.addEventListener("load", () => resolve(window.mapboxgl), {
            once: true,
        });
        mapboxScript.addEventListener("error", reject, { once: true });
        document.head.appendChild(mapboxScript);
    });
}

async function resolvePropertyCoordinates(property) {
    try {
        const existingCoordinates = getPropertyCoordinates(property);
        if (existingCoordinates) return existingCoordinates;

        if (hasPreciseStreetAddress(property)) {
            const geocodedCoordinates = await geocodeListingAddress(property);
            if (geocodedCoordinates) return geocodedCoordinates;
        }

        const approximateCoordinates = await geocodeListingArea(property);
        if (approximateCoordinates) {
            return {
                ...approximateCoordinates,
                mapAccuracy: "approximate",
            };
        }
    } catch (error) {
        console.error(`Could not map ${property?.name || "property"}.`, error);
    }

    return null;
}

function getPropertyCoordinates(property) {
    const latitude = Number(property?.latitude || property?.lat);
    const longitude = Number(property?.longitude || property?.lng);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return {
            latitude,
            longitude,
            mapAccuracy: property.mapAccuracy || "exact",
        };
    }

    if (Array.isArray(property?.coordinates) && property.coordinates.length >= 2) {
        const [coordinateLongitude, coordinateLatitude] =
            property.coordinates.map(Number);

        if (
            Number.isFinite(coordinateLatitude) &&
            Number.isFinite(coordinateLongitude)
        ) {
            return {
                latitude: coordinateLatitude,
                longitude: coordinateLongitude,
                mapAccuracy: property.mapAccuracy || "exact",
            };
        }
    }

    return null;
}

async function geocodeListingAddress(property) {
    if (!property || !MAPBOX_TOKEN) return null;
    if (!hasPreciseStreetAddress(property)) return null;

    const addressLabel = getPropertyAddressLabel(property);
    if (!addressLabel || addressLabel === "Dallas, TX") return null;

    return geocodeMapboxQuery(addressLabel, {
        cacheKey: `bma-mapbox-geocode:${addressLabel.toLowerCase()}`,
        requireReliableAddress: true,
    });
}

async function geocodeListingArea(property) {
    if (!property || !MAPBOX_TOKEN) return null;

    const areaLabel = [property.city, property.state, property.zipcode]
        .filter(Boolean)
        .join(", ");

    if (!areaLabel) return null;

    return geocodeMapboxQuery(areaLabel, {
        cacheKey: `bma-mapbox-area-geocode:${areaLabel.toLowerCase()}`,
        requireReliableAddress: false,
    });
}

async function geocodeMapboxQuery(query, options = {}) {
    const cachedCoordinates = getCachedCoordinates(options.cacheKey);
    if (cachedCoordinates) return cachedCoordinates;

    if (options.cacheKey && mapboxGeocodeRequests.has(options.cacheKey)) {
        return mapboxGeocodeRequests.get(options.cacheKey);
    }

    const geocodeRequest = fetchMapboxGeocode(query, options);

    if (options.cacheKey) {
        mapboxGeocodeRequests.set(options.cacheKey, geocodeRequest);
    }

    return geocodeRequest;
}

async function fetchMapboxGeocode(query, options = {}) {
    const geocodingUrl = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
    );
    geocodingUrl.searchParams.set("access_token", MAPBOX_TOKEN);
    geocodingUrl.searchParams.set("country", "US");
    geocodingUrl.searchParams.set("limit", "1");

    const response = await fetch(geocodingUrl);
    if (!response.ok) return null;

    const geocodingResult = await response.json();
    const firstFeature = geocodingResult.features?.[0];
    if (options.requireReliableAddress && !isReliableGeocodeResult(firstFeature)) return null;

    const [longitude, latitude] = firstFeature?.center || [];

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    const coordinates = { latitude, longitude };
    setCachedCoordinates(options.cacheKey, coordinates);

    return coordinates;
}

function getCachedCoordinates(cacheKey) {
    try {
        const cachedValue = localStorage.getItem(cacheKey);
        if (!cachedValue) return null;

        const coordinates = JSON.parse(cachedValue);
        const latitude = Number(coordinates.latitude);
        const longitude = Number(coordinates.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }

        return { latitude, longitude };
    } catch {
        return null;
    }
}

function setCachedCoordinates(cacheKey, coordinates) {
    if (!cacheKey) return;

    try {
        localStorage.setItem(cacheKey, JSON.stringify(coordinates));
    } catch (error) {
        console.warn("Could not cache map coordinates.", error);
    }
}

function getNearbyPlacesCacheKey(center) {
    return `bma-nearby:${NEARBY_PLACE_CACHE_VERSION}:${Math.round(center.latitude * 10000)}:${Math.round(
        center.longitude * 10000
    )}`;
}

function getCachedNearbyPlaces(cacheKey) {
    try {
        const cachedValue = localStorage.getItem(cacheKey);
        if (!cachedValue) return null;

        const places = JSON.parse(cachedValue);
        if (!Array.isArray(places)) return null;

        return places.filter(
            (place) =>
                place &&
                Number.isFinite(Number(place.latitude)) &&
                Number.isFinite(Number(place.longitude))
        );
    } catch {
        return null;
    }
}

function setCachedNearbyPlaces(cacheKey, places) {
    if (!cacheKey) return;

    try {
        localStorage.setItem(cacheKey, JSON.stringify(places));
    } catch (error) {
        console.warn("Could not cache nearby map places.", error);
    }
}

async function resolveNearbyPlaces(center) {
    if (!center) return [];

    if (!MAPBOX_TOKEN) return [];

    const cacheKey = getNearbyPlacesCacheKey(center);
    const cachedPlaces = getCachedNearbyPlaces(cacheKey);
    if (cachedPlaces) return cachedPlaces;

    if (mapboxNearbyPlaceRequests.has(cacheKey)) {
        return mapboxNearbyPlaceRequests.get(cacheKey);
    }

    const nearbyPlacesRequest = fetchNearbyPlaces(center, cacheKey);
    mapboxNearbyPlaceRequests.set(cacheKey, nearbyPlacesRequest);

    return nearbyPlacesRequest;
}

async function fetchNearbyPlaces(center, cacheKey) {
    const sessionToken = cacheKey;
    const resolvedPlaces = await Promise.all(
        NEARBY_PLACE_QUERIES.map(async (placeQuery) => {
            const queryVariants = placeQuery.queryVariants || [placeQuery.query];
            const matchingPlaces = [];
            const retrievedPlaceIds = new Set();

            for (const query of queryVariants) {
                const matchingSuggestions = await fetchNearbyPlaceSuggestions({
                    center,
                    placeQuery,
                    query,
                    sessionToken,
                });

                for (const suggestion of matchingSuggestions) {
                    if (retrievedPlaceIds.has(suggestion.mapbox_id)) continue;

                    retrievedPlaceIds.add(suggestion.mapbox_id);

                    const placeResult = await retrieveSearchBoxPlace(
                        suggestion.mapbox_id,
                        sessionToken
                    );
                    const place = getNearbyPlaceResult(placeResult, placeQuery, center);

                    if (place) {
                        matchingPlaces.push(place);
                    }
                }
            }

            return getClosestNearbyPlace(matchingPlaces);
        })
    );

    const places = resolvedPlaces.filter(Boolean);
    setCachedNearbyPlaces(cacheKey, places);

    return places;
}

async function fetchNearbyPlaceSuggestions({
    center,
    placeQuery,
    query,
    sessionToken,
}) {
    const searchUrl = new URL(
        "https://api.mapbox.com/search/searchbox/v1/suggest"
    );
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("access_token", MAPBOX_TOKEN);
    searchUrl.searchParams.set(
        "proximity",
        `${center.longitude},${center.latitude}`
    );
    searchUrl.searchParams.set("session_token", sessionToken);
    searchUrl.searchParams.set("types", "poi");
    searchUrl.searchParams.set("country", "US");
    searchUrl.searchParams.set("limit", String(NEARBY_PLACE_SUGGESTION_LIMIT));

    const response = await fetch(searchUrl);
    if (!response.ok) return [];

    const searchResult = await response.json();

    return (searchResult.suggestions || []).filter((suggestion) =>
        isNearbySuggestionResult(suggestion, placeQuery)
    );
}

function getClosestNearbyPlace(places) {
    if (places.length === 0) return null;

    return [...places].sort(
        (firstPlace, secondPlace) => firstPlace.distanceMiles - secondPlace.distanceMiles
    )[0];
}

async function retrieveSearchBoxPlace(mapboxId, sessionToken) {
    if (!mapboxId) return null;

    const retrieveUrl = new URL(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(mapboxId)}`
    );
    retrieveUrl.searchParams.set("access_token", MAPBOX_TOKEN);
    retrieveUrl.searchParams.set("session_token", sessionToken);

    const response = await fetch(retrieveUrl);
    if (!response.ok) return null;

    const retrieveResult = await response.json();

    return retrieveResult.features?.[0] || null;
}

function getNearbyPlaceResult(feature, placeQuery, center) {
    if (!feature) return null;

    const properties = feature.properties || {};
    const coordinates = getSearchBoxCoordinates(feature);

    if (!coordinates) return null;

    const distanceMiles = getDistanceInMiles(center, coordinates);
    if (distanceMiles > NEARBY_PLACE_RADIUS_MILES) return null;

    return {
        ...placeQuery,
        label: placeQuery.label,
        mapboxName: properties.name || "",
        detail:
            properties.full_address ||
            properties.place_formatted ||
            placeQuery.detail,
        placeId: properties.mapbox_id || feature.id,
        distanceMiles,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
    };
}

function getSearchBoxCoordinates(feature) {
    const propertyCoordinates = feature?.properties?.coordinates;
    const longitude = Number(
        propertyCoordinates?.longitude || feature?.geometry?.coordinates?.[0]
    );
    const latitude = Number(
        propertyCoordinates?.latitude || feature?.geometry?.coordinates?.[1]
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return { latitude, longitude };
}

function isNearbySuggestionResult(suggestion, placeQuery) {
    if (!suggestion?.mapbox_id || suggestion.feature_type !== "poi") {
        return false;
    }

    return hasNearbyPlaceKeyword(suggestion, placeQuery);
}

function hasNearbyPlaceKeyword(place, placeQuery) {
    const text = [
        place.name,
        place.name_preferred,
        place.full_address,
        place.place_formatted,
        ...(place.brand || []),
        ...(place.brand_id || []),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    const compactText = text.replace(/[^a-z0-9]/g, "");

    return placeQuery.keywords.some((keyword) => {
        const normalizedKeyword = keyword.toLowerCase();
        const compactKeyword = normalizedKeyword.replace(/[^a-z0-9]/g, "");

        return text.includes(normalizedKeyword) || compactText.includes(compactKeyword);
    });
}

function getDistanceInMiles(firstPoint, secondPoint) {
    const earthRadiusMiles = 3958.8;
    const firstLatitude = degreesToRadians(firstPoint.latitude);
    const secondLatitude = degreesToRadians(secondPoint.latitude);
    const latitudeDistance = degreesToRadians(secondPoint.latitude - firstPoint.latitude);
    const longitudeDistance = degreesToRadians(secondPoint.longitude - firstPoint.longitude);
    const haversine =
        Math.sin(latitudeDistance / 2) ** 2 +
        Math.cos(firstLatitude) *
            Math.cos(secondLatitude) *
            Math.sin(longitudeDistance / 2) ** 2;

    return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function createPropertyMapMarker(propertyName, isApproximatePin = false, addressLabel = "") {
    const markerElement = document.createElement("div");
    markerElement.className =
        "group relative flex -translate-y-1 flex-col items-center outline-none";
    markerElement.title = `${propertyName}${
        isApproximatePin ? " - approximate location" : ""
    }`;
    markerElement.tabIndex = 0;
    markerElement.setAttribute("role", "button");
    markerElement.setAttribute("aria-label", markerElement.title);
    const markerBackground = isApproximatePin ? "bg-[#8a5b0a]" : "bg-[#f2b84b]";
    const markerText = isApproximatePin ? "text-white" : "text-[#102426]";
    markerElement.innerHTML = `
        ${getMapMarkerTooltipHtml(
            propertyName,
            [
                addressLabel,
                isApproximatePin
                    ? "Approximate location until a full street address is added."
                    : "",
            ]
        )}
        <div class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white ${markerBackground} text-[10px] font-black ${markerText} shadow-lg ring-1 ring-[#8a5b0a]/25">BMA</div>
        <div class="-mt-1.5 h-3 w-3 rotate-45 border-b-2 border-r-2 border-white ${markerBackground} shadow-sm"></div>
    `;
    attachMapMarkerTooltipEvents(markerElement);

    return markerElement;
}

function createNearbyMapMarker(place) {
    const markerElement = document.createElement("div");
    const colors = {
        walmart: "bg-[#2d7dd2]",
        target: "bg-[#e4572e]",
        laFitness: "bg-[#173f3f]",
        planetFitness: "bg-[#8a5b0a]",
        kroger: "bg-[#1f6f63]",
    };
    const abbreviations = {
        walmart: "W",
        target: "T",
        laFitness: "LA",
        planetFitness: "PF",
        kroger: "K",
    };

    markerElement.className = "group relative flex flex-col items-center outline-none";
    markerElement.title = `${getCleanNearbyPlaceLabel(place)} - ${place.distanceMiles.toFixed(1)} miles away`;
    markerElement.tabIndex = 0;
    markerElement.setAttribute("role", "button");
    markerElement.setAttribute("aria-label", markerElement.title);
    markerElement.innerHTML = `
        ${getMapMarkerTooltipHtml(getCleanNearbyPlaceLabel(place), [
            place.detail,
            `${place.distanceMiles.toFixed(1)} miles away`,
        ])}
        <div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white ${colors[place.type]} text-[10px] font-black text-white shadow-md">${abbreviations[place.type]}</div>
    `;
    attachMapMarkerTooltipEvents(markerElement);

    return markerElement;
}

function attachMapMarkerTooltipEvents(markerElement) {
    const tooltipElement = markerElement.querySelector("[data-map-marker-tooltip='true']");
    if (!tooltipElement) return;

    const showTooltip = () => {
        tooltipElement.classList.remove("hidden");
        tooltipElement.classList.add("block");
    };
    const hideTooltip = () => {
        tooltipElement.classList.add("hidden");
        tooltipElement.classList.remove("block");
    };

    markerElement.addEventListener("pointerenter", showTooltip);
    markerElement.addEventListener("pointerleave", hideTooltip);
    markerElement.addEventListener("mouseenter", showTooltip);
    markerElement.addEventListener("mouseleave", hideTooltip);
    markerElement.addEventListener("focus", showTooltip);
    markerElement.addEventListener("blur", hideTooltip);
}

function bindMapMarkerHoverPopup(marker, popup, map) {
    const markerElement = marker.getElement();
    let closePopupTimer = null;

    const openPopup = () => {
        window.clearTimeout(closePopupTimer);
        popup.setLngLat(marker.getLngLat()).addTo(map);
    };
    const closePopup = (event) => {
        if (event?.relatedTarget && markerElement.contains(event.relatedTarget)) {
            return;
        }

        closePopupTimer = window.setTimeout(() => {
            popup.remove();
        }, 80);
    };

    markerElement.addEventListener("pointerenter", openPopup, true);
    markerElement.addEventListener("pointerleave", closePopup, true);
    markerElement.addEventListener("mouseenter", openPopup, true);
    markerElement.addEventListener("mouseleave", closePopup, true);
    markerElement.addEventListener("focus", openPopup, true);
    markerElement.addEventListener("blur", closePopup, true);
}

function bindMapMarkerHoverPopups(map, hoverPopupBindings) {
    const mapContainer = map.getContainer();
    const popupByMarkerElement = new Map(
        hoverPopupBindings.map(({ marker, popup }) => [
            marker.getElement(),
            { marker, popup },
        ])
    );
    let activeBinding = null;
    let closePopupTimer = null;

    const openPopup = (binding) => {
        window.clearTimeout(closePopupTimer);
        activeBinding = binding;
        binding.popup.setLngLat(binding.marker.getLngLat()).addTo(map);
    };
    const closePopup = () => {
        closePopupTimer = window.setTimeout(() => {
            activeBinding?.popup.remove();
            activeBinding = null;
        }, 80);
    };
    const getHoveredBinding = (event) => {
        const hoveredElement = document.elementFromPoint(event.clientX, event.clientY);
        const markerElement = hoveredElement?.closest?.(".mapboxgl-marker");

        return markerElement ? popupByMarkerElement.get(markerElement) : null;
    };
    const handlePointerMove = (event) => {
        const hoveredBinding = getHoveredBinding(event);

        if (hoveredBinding) {
            if (hoveredBinding !== activeBinding) {
                activeBinding?.popup.remove();
            }
            openPopup(hoveredBinding);
            return;
        }

        if (activeBinding) {
            closePopup();
        }
    };
    const handlePointerLeave = () => {
        if (activeBinding) {
            closePopup();
        }
    };

    mapContainer.addEventListener("pointermove", handlePointerMove, true);
    mapContainer.addEventListener("mousemove", handlePointerMove, true);
    mapContainer.addEventListener("pointerleave", handlePointerLeave, true);
    mapContainer.addEventListener("mouseleave", handlePointerLeave, true);

    return () => {
        window.clearTimeout(closePopupTimer);
        mapContainer.removeEventListener("pointermove", handlePointerMove, true);
        mapContainer.removeEventListener("mousemove", handlePointerMove, true);
        mapContainer.removeEventListener("pointerleave", handlePointerLeave, true);
        mapContainer.removeEventListener("mouseleave", handlePointerLeave, true);
    };
}

function getMapMarkerTooltipHtml(title, details = []) {
    const detailRows = details.filter(Boolean);

    return `
        <div data-map-marker-tooltip="true" class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-2xl bg-white p-3 text-left text-xs leading-5 text-[#526260] shadow-xl ring-1 ring-[#d7e6df] group-hover:block group-focus:block">
            <p class="text-sm font-black text-[#102426]">${escapeMapText(title)}</p>
            ${detailRows
                .map(
                    (detail) =>
                        `<p class="mt-1 font-semibold">${escapeMapText(detail)}</p>`
                )
                .join("")}
        </div>
    `;
}

function escapeMapText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getFloorPlanCompareItem(property, plan) {
    const floorPlanId = plan.id || getFloorPlanCompareId(plan.name);
    const specialLabel = plan.special?.label || plan.currentSpecial || "";

    return {
        propertyId: property?.id || "",
        propertyName: property?.name || "Apartment",
        floorPlanId,
        floorPlanName: plan.name || "Floor plan",
        beds: plan.beds,
        baths: plan.baths,
        sqft: plan.sqft,
        rent: plan.rent,
        effectiveRent: plan.effectiveRent,
        special: specialLabel,
        available: plan.available,
        image: plan.image || getPropertyPrimaryImage(property),
    };
}

function getFloorPlanCompareId(name) {
    return String(name || "floor-plan")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function ComparedFloorPlanCard({
    item,
    currentPropertyId,
    fallbackImage,
    onRemove,
}) {
    const isCurrentProperty = item.propertyId === currentPropertyId;

    return (
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#d7e6df]">
            <div className="flex gap-3">
                <img
                    src={item.image || fallbackImage || DEFAULT_PROPERTY_IMAGE}
                    alt={`${item.floorPlanName} floor plan`}
                    loading="lazy"
                    decoding="async"
                    className="h-20 w-24 shrink-0 rounded-xl bg-[#f5f8f1] object-cover"
                />

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#e7f3ee] px-2 py-0.5 text-[10px] font-black uppercase text-[#173f3f]">
                            Floor plan
                        </span>
                        {isCurrentProperty && (
                            <span className="rounded-full bg-[#f2b84b] px-2 py-0.5 text-[10px] font-black uppercase text-[#102426]">
                                Current page
                            </span>
                        )}
                    </div>

                    <p className="mt-2 truncate text-sm font-black text-[#102426]">
                        {item.floorPlanName}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-[#526260]">
                        at {item.propertyName}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-[#526260]">
                        {formatBedroomLabel(item.beds, item.floorPlanName)} • {formatBathroomLabel(item.baths)} •{" "}
                        {item.sqft || "Sq ft not listed"} sq ft
                    </p>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
                <FloorPlanMetric label="Starting" value={item.rent || "Contact"} />
                <FloorPlanMetric
                    label="Effective"
                    value={item.effectiveRent || item.rent || "Contact"}
                    highlight
                />
            </div>

            <p className="mt-3 truncate text-xs font-black text-[#8a5b0a]">
                {item.special || "No special listed"}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#526260]">
                {formatAvailabilityLabel(item.available) || "Availability not listed"}
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Link
                    to={`/properties/${item.propertyId}`}
                    className="rounded-xl bg-[#173f3f] px-3 py-2 text-center text-xs font-black !text-white hover:bg-[#102426] hover:!text-white"
                >
                    View property
                </Link>

                <button
                    type="button"
                    onClick={onRemove}
                    className="rounded-xl bg-[#fff0ea] px-3 py-2 text-xs font-black text-[#e4572e] hover:bg-[#fde8df]"
                >
                    Remove
                </button>
            </div>
        </div>
    );
}

function CompareSummaryPanel({ items }) {
    return (
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item, index) => (
                <div
                    key={item.label}
                    className="min-w-0 rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-[#d7e6df]"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-[10px] font-black uppercase text-[#1f6f63]">
                                {item.label}
                            </p>
                            <p className="mt-1 truncate text-base font-black text-[#102426]">
                                {item.value}
                            </p>
                        </div>
                        <span
                            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                index === 0
                                    ? "bg-[#1f6f63]"
                                    : index === 1
                                        ? "bg-[#f2b84b]"
                                        : index === 2
                                            ? "bg-[#e4572e]"
                                            : "bg-[#173f3f]"
                            }`}
                            aria-hidden="true"
                        />
                    </div>
                    <p className="mt-2 truncate text-[11px] font-semibold text-[#526260]">
                        {item.detail}
                    </p>
                </div>
            ))}
        </div>
    );
}

function CompareEmptyState({ text }) {
    return (
        <p className="mt-4 rounded-2xl bg-[#f5f8f1] p-4 text-sm font-semibold text-[#526260] ring-1 ring-[#d7e6df]">
            {text}
        </p>
    );
}

function CompareDetailsTable({ rows, onRequestFloorPlan }) {
    return (
        <div className="mt-5 rounded-3xl border border-[#d7e6df] bg-[#f5f8f1] p-4">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                    <p className="text-xs font-black uppercase text-[#1f6f63]">
                        Compare details
                    </p>
                    <h3 className="mt-1 text-lg font-black text-[#102426]">
                        Side-by-side shortlist
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#526260]">
                        Compare rent, size, specials, and availability before deciding what to tour.
                    </p>
                </div>

                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df]">
                    {rows.length} option{rows.length === 1 ? "" : "s"}
                </span>
            </div>

            <div className="mt-4 grid gap-3 lg:hidden">
                {rows.map((row) => (
                    <div key={row.id} className="rounded-2xl bg-white p-4 ring-1 ring-[#d7e6df]">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 gap-3">
                                {row.image && (
                                    <img
                                        src={row.image}
                                        alt={`${row.title} floor plan`}
                                        loading="lazy"
                                        decoding="async"
                                        className="h-16 w-16 shrink-0 rounded-xl bg-[#f5f8f1] object-cover ring-1 ring-[#d7e6df]"
                                    />
                                )}

                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase text-[#1f6f63]">
                                        {row.type}
                                    </p>
                                    <p className="mt-1 truncate text-base font-black text-[#102426]">
                                        {row.title}
                                    </p>
                                    <p className="mt-1 truncate text-xs font-bold text-[#526260]">
                                        {row.subtitle}
                                    </p>
                                </div>
                            </div>
                            <CompareDetailsAction row={row} onRequestFloorPlan={onRequestFloorPlan} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <CompareDetailMetric label="Beds" value={row.beds} />
                            <CompareDetailMetric label="Baths" value={row.baths} />
                            <CompareDetailMetric label="Sq ft" value={row.sqft} />
                            <CompareDetailMetric label="Normal" value={row.normalRent} />
                            <CompareDetailMetric label="Effective" value={row.effectiveRent} highlight />
                            <CompareDetailMetric label="Savings" value={row.savings} highlight />
                        </div>

                        <p className="mt-3 truncate text-xs font-black text-[#8a5b0a]">
                            {row.special}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#526260]">
                            {row.availability}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-4 hidden overflow-x-auto rounded-2xl bg-white ring-1 ring-[#d7e6df] lg:block">
                <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                    <thead className="bg-[#173f3f] text-white">
                        <tr>
                            {[
                                "Option",
                                "Beds / Baths",
                                "Sq ft",
                                "Normal",
                                "Effective",
                                "Special",
                                "Availability",
                                "Savings",
                                "Action",
                            ].map((heading) => (
                                <th key={heading} className="px-4 py-3 text-xs font-black uppercase">
                                    {heading}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr
                                key={row.id}
                                className={index % 2 === 0 ? "bg-white" : "bg-[#f5f8f1]"}
                            >
                                <td className="px-4 py-4 align-top">
                                    <div className="flex min-w-[220px] gap-3">
                                        {row.image && (
                                            <img
                                                src={row.image}
                                                alt={`${row.title} floor plan`}
                                                loading="lazy"
                                                decoding="async"
                                                className="h-14 w-14 shrink-0 rounded-xl bg-[#f5f8f1] object-cover ring-1 ring-[#d7e6df]"
                                            />
                                        )}

                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase text-[#1f6f63]">
                                                {row.type}
                                            </p>
                                            <p className="mt-1 max-w-[180px] font-black text-[#102426]">
                                                {row.title}
                                            </p>
                                            <p className="mt-1 max-w-[180px] text-xs font-bold text-[#526260]">
                                                {row.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 align-top font-bold text-[#102426]">
                                    {row.beds}
                                    <span className="block text-xs font-semibold text-[#526260]">
                                        {row.baths}
                                    </span>
                                </td>
                                <td className="px-4 py-4 align-top font-bold text-[#102426]">
                                    {row.sqft}
                                </td>
                                <td className="px-4 py-4 align-top font-bold text-[#102426]">
                                    {row.normalRent}
                                </td>
                                <td className="px-4 py-4 align-top font-black text-[#1f6f63]">
                                    {row.effectiveRent}
                                </td>
                                <td className="max-w-[190px] px-4 py-4 align-top text-xs font-bold text-[#8a5b0a]">
                                    {row.special}
                                </td>
                                <td className="max-w-[160px] px-4 py-4 align-top text-xs font-semibold text-[#526260]">
                                    {row.availability}
                                </td>
                                <td className="px-4 py-4 align-top font-black text-[#1f6f63]">
                                    {row.savings}
                                </td>
                                <td className="px-4 py-4 align-top">
                                    <CompareDetailsAction row={row} onRequestFloorPlan={onRequestFloorPlan} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CompareDetailsAction({ row, onRequestFloorPlan }) {
    if (row.floorPlan) {
        return (
            <button
                type="button"
                onClick={() => onRequestFloorPlan(row.floorPlan)}
                className="shrink-0 rounded-xl bg-[#173f3f] px-3 py-2 text-xs font-black !text-white hover:bg-[#102426] hover:!text-white"
            >
                Request tour
            </button>
        );
    }

    return (
        <Link
            to={`/properties/${row.propertyId}`}
            className="inline-flex shrink-0 rounded-xl bg-[#e7f3ee] px-3 py-2 text-xs font-black text-[#173f3f] hover:bg-[#d7e6df]"
        >
            View property
        </Link>
    );
}

function CompareDetailMetric({ label, value, highlight = false }) {
    return (
        <div
            className={`rounded-xl p-3 ${
                highlight
                    ? "bg-[#e7f3ee] text-[#1f6f63]"
                    : "bg-[#f5f8f1] text-[#173f3f]"
            }`}
        >
            <p className="text-[10px] font-black uppercase">{label}</p>
            <p className="mt-1 truncate text-xs font-black">{value}</p>
        </div>
    );
}

function FloorPlanCard({
    name,
    beds,
    baths,
    sqft,
    rent,
    effectiveRent,
    savings,
    available,
    availableUnits = [],
    image,
    status,
    special,
    isCompared,
    onToggleCompare,
    onCheckAvailability,
}) {
    const [hasImageError, setHasImageError] = useState(false);
    const hasSpecial = Boolean(special?.label);
    const specialLabel = hasSpecial ? cleanUnitSpecialLabel(special.label) : "No special listed";
    const sortedAvailableUnits = [...(availableUnits || [])]
        .filter((unit) => unit?.status !== "leased")
        .sort((a, b) => parseCurrency(a.rent) - parseCurrency(b.rent));
    const availableUnitCount = sortedAvailableUnits.length || getFloorPlanAvailableUnitCount({
        available,
        availableUnits,
        status,
    }) || 0;
    const displayRent = formatFloorPlanMetricValue(rent);
    const displayEffectiveRent = formatFloorPlanMetricValue(effectiveRent);
    const displayRentValue = displayRent || "Contact";
    const displayEffectiveValue = displayEffectiveRent || displayRentValue;
    const normalRentNumber = parseCurrency(displayRentValue);
    const effectiveRentNumber = parseCurrency(displayEffectiveValue);
    const displaySavingsValue =
        formatFloorPlanMetricValue(savings) ||
        (hasSpecial && normalRentNumber > effectiveRentNumber
            ? `${formatCurrency(normalRentNumber - effectiveRentNumber)}/mo`
            : hasSpecial
                ? "Verify"
                : "None listed");
    const hasAvailableFloorPlanUnits =
        availableUnitCount > 0 || isFloorPlanAvailable({ available, availableUnits, status });
    const availabilityBadgeLabel = getFloorPlanAvailabilityBadgeLabel({
        available,
        availableUnitCount,
        hasAvailableFloorPlanUnits,
    });
    const shouldShowFloorPlanImage = Boolean(image && !hasImageError);
    const imageAlt = shouldShowFloorPlanImage ? `${name} floor plan` : "Floor plan image not listed";

    return (
        <div className="grid gap-3 rounded-2xl border border-[#d7e6df] bg-white p-3 transition hover:border-[#f2d08a] lg:grid-cols-[122px_minmax(0,1fr)_178px] lg:items-center">
            <div className="flex h-28 items-center justify-center overflow-hidden rounded-xl bg-[#f5f8f1] ring-1 ring-[#d7e6df] lg:h-[92px]">
                {shouldShowFloorPlanImage ? (
                    <img
                        src={image}
                        alt={imageAlt}
                        loading="lazy"
                        decoding="async"
                        onError={() => setHasImageError(true)}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span className="px-2 text-center text-[10px] font-black uppercase leading-4 text-[#526260]">
                        Image pending
                    </span>
                )}
            </div>

            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-black text-[#102426]">
                        {name}
                    </h3>

                    {hasSpecial && (
                        <span className="inline-flex max-w-full rounded-full bg-[#fff8e6] px-2.5 py-1 text-[11px] font-black text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                            <span className="truncate">{specialLabel}</span>
                        </span>
                    )}
                </div>

                <p className="mt-1 text-sm font-semibold text-[#526260]">
                    {formatBedroomLabel(beds, name)} • {formatBathroomLabel(baths)} • {sqft || "Sq ft not listed"} sq ft
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-[#526260]">
                            Listed
                        </p>
                        <p className="mt-0.5 truncate text-sm font-black text-[#102426]">
                            {displayRentValue}
                        </p>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-[#526260]">
                            Effective
                        </p>
                        <p className={`mt-0.5 truncate text-sm font-black ${hasSpecial ? "text-[#1f6f63]" : "text-[#102426]"}`}>
                            {displayEffectiveValue}
                        </p>
                    </div>

                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase text-[#526260]">
                            {hasSpecial ? "Savings" : "Special"}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-black text-[#102426]">
                            {displaySavingsValue}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-2 lg:text-right">
                <p className={`text-xs font-black ${hasAvailableFloorPlanUnits ? "text-[#1f6f63]" : "text-[#e4572e]"}`}>
                    {availabilityBadgeLabel}
                </p>

                <button
                    type="button"
                    onClick={onCheckAvailability}
                    className="rounded-xl bg-[#173f3f] px-4 py-3 text-sm font-black !text-white hover:bg-[#102426] hover:!text-white"
                >
                    Check availability
                </button>

                <button
                    type="button"
                    onClick={onToggleCompare}
                    className={`rounded-xl px-4 py-2.5 text-sm font-black ${
                        isCompared
                            ? "bg-[#f2b84b] text-[#102426]"
                            : "bg-white text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#f5f8f1]"
                    }`}
                >
                    {isCompared ? "Added" : "Compare"}
                </button>

                {isCompared && (
                    <p className="mt-1.5 text-xs font-bold leading-4 text-[#526260]">
                        Tap View comparison below to open the chart.
                    </p>
                )}
            </div>
        </div>
    );
}

function isRenovatedUnit(unit = {}) {
    return Boolean(unit.isRenovated || unit.renovated || unit.renovationStatus === "renovated");
}

function cleanUnitSpecialLabel(label = "") {
    return String(label)
        .replace(/Certain exclusions may apply\.?/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

function getFloorPlanAvailabilityBadgeLabel({
    available,
    availableUnitCount,
    hasAvailableFloorPlanUnits,
}) {
    if (availableUnitCount > 0) {
        return formatAvailabilityLabel(availableUnitCount);
    }

    const availableText = formatAvailabilityLabel(available);

    if (hasAvailableFloorPlanUnits && /^available$/i.test(availableText)) {
        return "Available";
    }

    return availableText || "Availability not listed";
}

function formatFloorPlanMetricValue(value) {
    if (value === null || value === undefined || value === "") return value;

    const textValue = String(value).trim();
    if (!textValue) return textValue;
    if (/[$%]/.test(textValue) || /contact|verify|call|ask/i.test(textValue)) {
        return textValue;
    }

    const currencyValue = parseCurrency(textValue);
    if (currencyValue > 0) {
        const suffix = /\/\s*mo|monthly/i.test(textValue) ? "/mo" : "";
        return `${formatCurrency(currencyValue)}${suffix}`;
    }

    return textValue;
}

function FloorPlanMetric({ label, value, highlight = false }) {
    return (
        <div
            className={`rounded-xl px-3 py-2 ${
                highlight
                    ? "bg-[#e7f3ee] text-[#1f6f63]"
                    : "bg-[#f5f8f1] text-[#173f3f]"
            }`}
        >
            <p className="text-[11px] font-black uppercase">{label}</p>
            <p className="mt-0.5 truncate text-sm font-black">{value}</p>
        </div>
    );
}

function getAvailabilitySortValue(plan) {
    if (!isFloorPlanAvailable(plan)) return 0;
    if (plan?.status === "available") return 2;
    if (plan?.status === "limited") return 1;

    return 2;
}

function isFloorPlanAvailable(plan) {
    const status = String(plan?.status || "").toLowerCase();
    if (status === "available" || status === "limited") return true;
    if (
        status === "unavailable" ||
        status === "not available" ||
        status === "not currently available"
    ) {
        return false;
    }

    const availableUnitCount = getFloorPlanAvailableUnitCount(plan);
    if (availableUnitCount > 0) return true;
    if (availableUnitCount === 0) return false;

    const availabilityText = String(plan?.available || plan?.availability || "").toLowerCase();
    if (
        availabilityText.includes("not currently") ||
        availabilityText.includes("unavailable") ||
        availabilityText.includes("0 available")
    ) {
        return false;
    }

    return availabilityText.includes("available");
}

function getFloorPlanAvailableUnitCount(plan) {
    if (Array.isArray(plan?.availableUnits) && plan.availableUnits.length > 0) {
        return plan.availableUnits.filter((unit) => {
            const unitStatus = String(unit?.status || "available").toLowerCase();
            return unitStatus === "available" || unitStatus === "";
        }).length;
    }

    const availabilityText = String(plan?.available || plan?.availability || "");
    const match = availabilityText.match(/^\s*(\d+)(?:\s+available)?(?:\s+units?)?\s*$/i);
    if (match) return Number(match[1]);

    return null;
}

function formatBedroomLabel(value, fallbackName = "") {
    const normalizedValue = String(value ?? "").trim();
    const normalizedFallback = String(fallbackName || "").trim();
    if (normalizedValue === "All") return "All";
    if (
        /studio/i.test(normalizedValue) ||
        normalizedValue === "0" ||
        /studio/i.test(normalizedFallback) ||
        /^s\d*[a-z]?$/i.test(normalizedFallback)
    ) {
        return "Studio";
    }
    if (!normalizedValue || normalizedValue === "Not set") return "Beds not listed";
    if (/\bbd\b/i.test(normalizedValue)) return normalizedValue;

    const bedMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*beds?$/i);
    if (bedMatch) return `${bedMatch[1]} bd`;

    const numberMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)$/);
    if (numberMatch) return `${numberMatch[1]} bd`;

    return normalizedValue;
}

function formatBathroomLabel(value) {
    const normalizedValue = String(value ?? "").trim();

    if (!normalizedValue || normalizedValue === "Not set") return "Baths not listed";
    if (/bath|ba/i.test(normalizedValue)) return normalizedValue;

    return `${normalizedValue} ba`;
}

function getCompareSummaryItems({ floorPlanCount, propertyOnlyCount, rows }) {
    const rowsWithEffectiveRent = rows
        .map((row) => ({
            ...row,
            effectiveRentNumber: parseCurrency(row.effectiveRent),
        }))
        .filter((row) => row.effectiveRentNumber > 0);
    const lowestEffectiveRentRow = [...rowsWithEffectiveRent].sort(
        (firstRow, secondRow) => firstRow.effectiveRentNumber - secondRow.effectiveRentNumber
    )[0];
    const rowsWithSquareFeet = rows
        .map((row) => ({
            ...row,
            squareFeetNumber: getLargestNumberFromText(row.sqft),
        }))
        .filter((row) => row.squareFeetNumber > 0);
    const largestLayoutRow = [...rowsWithSquareFeet].sort(
        (firstRow, secondRow) => secondRow.squareFeetNumber - firstRow.squareFeetNumber
    )[0];
    const bestSpecialRow = rows.find(
        (row) => row.special && row.special !== "No special listed"
    );

    return [
        {
            label: "Lowest effective",
            value: lowestEffectiveRentRow?.effectiveRent || "Verify",
            detail: lowestEffectiveRentRow
                ? lowestEffectiveRentRow.title
                : "Add floor plans with pricing to compare lowest rent.",
        },
        {
            label: "Largest layout",
            value: largestLayoutRow?.sqft || "Varies",
            detail: largestLayoutRow
                ? largestLayoutRow.title
                : "Choose exact floor plans to compare size.",
        },
        {
            label: "Best special",
            value: bestSpecialRow?.special || "Verify",
            detail: bestSpecialRow
                ? bestSpecialRow.title
                : "Specials may vary by floor plan and lease term.",
        },
        {
            label: propertyOnlyCount > 0 ? "Choose plans" : "Exact plans",
            value:
                propertyOnlyCount > 0
                    ? `${propertyOnlyCount} waiting`
                    : `${floorPlanCount} selected`,
            detail:
                propertyOnlyCount > 0
                    ? "Select layouts for a cleaner comparison."
                    : "Specific layouts selected.",
        },
    ];
}

function getLargestNumberFromText(value) {
    const values = String(value || "")
        .replace(/,/g, "")
        .match(/\d+(\.\d+)?/g);

    if (!values?.length) return 0;

    return Math.max(...values.map(Number).filter(Number.isFinite));
}

function getPropertyBedroomCompareLabel(property) {
    if (Array.isArray(property?.bedrooms) && property.bedrooms.length > 0) {
        return property.bedrooms.map((bedroom) => formatBedroomLabel(bedroom)).join(" / ");
    }

    return formatBedroomLabel(property?.bedrooms || property?.beds || "");
}

function parseCurrency(value) {
    const firstCurrencyValue = String(value || "").replace(/,/g, "").match(/\d+(\.\d+)?/);
    const parsedValue = Number(firstCurrencyValue?.[0] || 0);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getCompareSavingsLabel(normalRent, effectiveRent) {
    const normalRentNumber = parseCurrency(normalRent);
    const effectiveRentNumber = parseCurrency(effectiveRent);
    const savingsNumber = normalRentNumber - effectiveRentNumber;

    if (normalRentNumber > 0 && effectiveRentNumber > 0 && savingsNumber > 0) {
        return `${formatCurrency(savingsNumber)}/mo`;
    }

    return "Verify";
}

function formatCurrency(value) {
    return `$${Math.round(value).toLocaleString()}`;
}

function formatRentRange(values, fallback = "Contact for pricing") {
    const cleanValues = values.filter((value) => Number(value) > 0);

    if (cleanValues.length === 0) return fallback;

    const minValue = Math.min(...cleanValues);
    const maxValue = Math.max(...cleanValues);

    if (minValue === maxValue) return formatCurrency(minValue);

    return `${formatCurrency(minValue)} - ${formatCurrency(maxValue)}`;
}

function AmenityItem({ label }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4 font-bold text-[#102426]">
            {label}
        </div>
    );
}

function HighlightCard({ title, text }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-5">
            <p className="font-black text-[#102426]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#526260]">{text}</p>
        </div>
    );
}

function getCompactPropertySeoSummary({
    addressLabel,
    listingFloorPlans,
    property,
    propertySpecialLabel,
}) {
    const propertyName = property?.name || "This apartment community";
    const cityState = [property?.city || "Dallas", property?.state || "TX"]
        .filter(Boolean)
        .join(", ");
    const bedroomLabel = getPropertySeoBedroomLabel(property, listingFloorPlans);
    const rentSummary = getPropertyLevelRentSummary({
        effectiveRentLabel: property?.effectiveRent || "",
        hasPropertySpecial: Boolean(
            propertySpecialLabel && propertySpecialLabel !== "No active special listed"
        ),
        listingFloorPlans,
        propertySpecialLabel,
        startingRentLabel: property?.startingRent || property?.rent || "Contact for pricing",
    });
    const locationLabel = addressLabel || cityState;
    const hasSpecial =
        propertySpecialLabel && propertySpecialLabel !== "No active special listed";

    return [
        `${propertyName} lists ${bedroomLabel} near ${locationLabel}. Renters can compare floor plans, photos, normal rent ${rentSummary.normalRentLabel}, and estimated effective rent ${rentSummary.effectiveRentLabel} before deciding whether to tour.`,
        hasSpecial
            ? `The current listed special is ${propertySpecialLabel}. Confirm the offer, lease term, move-in date, fees, and exact unit availability before applying.`
            : `Use this page to compare available layouts, fees, and nearby location details. Ask the property to confirm current specials, lease terms, and exact unit availability before applying.`,
    ].filter(Boolean);
}

function getRenterValueToolkit({
    effectiveRentLabel,
    hasPropertySpecial,
    listingFloorPlans,
    marketRentLabel,
    property,
    propertySpecialLabel,
    savingsLabel,
    startingRentLabel,
}) {
    const propertySummary = getPropertyLevelRentSummary({
        effectiveRentLabel,
        hasPropertySpecial,
        listingFloorPlans,
        propertySpecialLabel,
        startingRentLabel,
    });
    const normalRentNumber = parseCurrency(propertySummary.normalRentLabel);
    const effectiveRentNumber = parseCurrency(propertySummary.effectiveRentLabel);
    const savingsNumber =
        parseCurrency(savingsLabel) ||
        (normalRentNumber && effectiveRentNumber
            ? Math.max(normalRentNumber - effectiveRentNumber, 0)
            : 0);
    const savingsPercent = normalRentNumber ? savingsNumber / normalRentNumber : 0;
    const hasFloorPlans = listingFloorPlans.length > 0;
    const hasFees = Boolean(property?.requiredMonthlyFees || property?.monthlyFees);
    const hasPhotos = Boolean(property?.photos?.length);
    const hasMarketRent = Boolean(marketRentLabel);
    const feeLabel = property?.requiredMonthlyFees || property?.monthlyFees || "Confirm";

    let dealScore = 58;
    if (hasPropertySpecial) dealScore += 18;
    if (savingsPercent >= 0.08) dealScore += 8;
    if (savingsPercent >= 0.14) dealScore += 6;
    if (hasFees) dealScore += 4;
    if (hasFloorPlans) dealScore += 4;
    if (hasPhotos) dealScore += 3;
    if (hasMarketRent) dealScore += 3;

    return {
        dealScore: Math.max(40, Math.min(98, Math.round(dealScore))),
        snapshotMetrics: [
            {
                label: "Effective value",
                value: propertySummary.effectiveRentLabel,
            },
            {
                label: "Normal rent",
                value: propertySummary.normalRentLabel,
            },
            {
                label: "Special",
                value: propertySummary.specialLabel,
            },
            {
                label: "Availability",
                value: propertySummary.availabilityLabel,
            },
            {
                label: "Fees",
                value: feeLabel,
            },
        ],
    };
}

function getPropertyLevelRentSummary({
    effectiveRentLabel,
    hasPropertySpecial,
    listingFloorPlans,
    propertySpecialLabel,
    startingRentLabel,
}) {
    const activeFloorPlans = listingFloorPlans.filter((floorPlan) => floorPlan.status !== "leased");
    const summaryRows = activeFloorPlans.flatMap((floorPlan) => {
        const availableUnits =
            floorPlan.availableUnits?.filter((unit) => unit.status !== "leased") || [];

        if (availableUnits.length === 0) {
            return [
                createPropertySummaryRow({
                    floorPlan,
                    rentLabel: floorPlan.rent || startingRentLabel,
                    specialFallbackLabel: propertySpecialLabel,
                }),
            ];
        }

        return availableUnits.map((unit) =>
            createPropertySummaryRow({
                floorPlan,
                rentLabel: unit.rent || floorPlan.rent || startingRentLabel,
                unit,
                specialFallbackLabel: propertySpecialLabel,
            })
        );
    });
    const normalRentValues = summaryRows.map((row) => row.normalRent).filter(Boolean);
    const effectiveRentValues = summaryRows.map((row) => row.effectiveRent).filter(Boolean);
    const specialLabels = [
        ...new Set(
            summaryRows
                .map((row) => row.specialLabel)
                .filter((label) => label && label !== "No active special listed")
        ),
    ];
    const availableUnitCount = activeFloorPlans.reduce(
        (unitCount, floorPlan) =>
            unitCount +
            (floorPlan.availableUnits?.filter((unit) => unit.status !== "leased").length || 0),
        0
    );
    const floorPlanCount = activeFloorPlans.length || listingFloorPlans.length;

    return {
        effectiveRentLabel:
            formatRentRange(effectiveRentValues, effectiveRentLabel || startingRentLabel),
        normalRentLabel: formatRentRange(normalRentValues, startingRentLabel),
        specialLabel:
            specialLabels.length === 0
                ? hasPropertySpecial
                    ? propertySpecialLabel
                    : "No active special"
                : formatSpecialSummary(specialLabels),
        availabilityLabel:
            availableUnitCount > 0
                ? `${floorPlanCount} layout${floorPlanCount === 1 ? "" : "s"} / ${availableUnitCount} unit${availableUnitCount === 1 ? "" : "s"}`
                : `${floorPlanCount} layout${floorPlanCount === 1 ? "" : "s"}`,
    };
}

function createPropertySummaryRow({
    floorPlan,
    rentLabel,
    specialFallbackLabel,
    unit,
}) {
    const normalRent = parseCurrency(rentLabel || floorPlan.rent);
    const specialLabel =
        unit?.currentSpecial ||
        unit?.special?.label ||
        floorPlan.special?.label ||
        floorPlan.currentSpecial ||
        specialFallbackLabel ||
        "";
    const freeWeeks =
        Number(unit?.freeWeeks || unit?.special?.freeWeeks || floorPlan.special?.freeWeeks || 0) ||
        getFreeWeeksFromSpecialLabel(specialLabel);
    const rentCreditSpecialNumber =
        parseCurrency(
            unit?.rentCreditSpecial ||
            unit?.special?.rentCreditSpecial ||
            floorPlan.rentCreditSpecial ||
            floorPlan.special?.rentCreditSpecial ||
            getRentCreditSpecialFromLabel(specialLabel)
        );
    const leaseMonths = Number(floorPlan.leaseTermMonths || floorPlan.special?.leaseTermMonths || 12);
    const enteredEffectiveRent = parseCurrency(floorPlan.effectiveRent);
    const effectiveRent =
        normalRent && (freeWeeks || rentCreditSpecialNumber) && leaseMonths
            ? Math.max(
                normalRent -
                    (normalRent * (freeWeeks / 4) + rentCreditSpecialNumber) / leaseMonths,
                0
            )
            : enteredEffectiveRent || normalRent;

    return {
        normalRent,
        effectiveRent,
        specialLabel,
    };
}

function getFreeWeeksFromSpecialLabel(label) {
    const match = String(label || "").match(/(\d+(?:\.\d+)?)\s*weeks?\s*free/i);
    return match ? Number(match[1]) : 0;
}

function getRentCreditSpecialFromLabel(label) {
    const match = String(label || "").match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(?:off|rent credit|credit)/i);
    return match ? formatCurrency(Number(match[1].replace(/,/g, ""))) : "";
}

function formatSpecialSummary(specialLabels) {
    if (specialLabels.length <= 2) return specialLabels.join(", ");

    return `${specialLabels.slice(0, 2).join(", ")} +${specialLabels.length - 2} more`;
}
