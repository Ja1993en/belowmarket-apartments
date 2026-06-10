import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    getPhotoImageUrl,
    getPropertyAddressLabel,
    getPropertyPrimaryImage,
    getPublicSearchProperties,
    hasPreciseStreetAddress,
    isReliableGeocodeResult,
} from "../data/propertySearchData";
import { getMarketRentBenchmark } from "../data/marketRentBenchmarks";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const DALLAS_CENTER = { latitude: 32.7767, longitude: -96.797 };
const NEARBY_PLACE_QUERIES = [
    {
        query: "grocery",
        label: "Nearby Grocery",
        detail: "Grocery options near this property",
        type: "grocery",
    },
    {
        query: "shopping",
        label: "Nearby Stores",
        detail: "Shopping and daily essentials nearby",
        type: "stores",
    },
    {
        query: "gym",
        label: "Nearby Gym",
        detail: "Fitness options near this property",
        type: "gym",
    },
];
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
const floorPlans = [
    {
        name: "A1",
        availableUnitCount: 3,
        beds: "1 Bed",
        baths: "1 Bath",
        sqft: "715 sqft",
        rent: "$1,425",
        available: "4 available",
        status: "available",
        special: {
            type: "free_weeks",
            freeWeeks: 6,
            appFee: 99,
            adminFee: 0,
            label: "6 Weeks Free + $99 App/Admin",
        },
        leaseTermMonths: 12,
        availableUnits: [
            {
                unit: "2203",
                rent: "$1,425",
                available: "Available Now",
                requestCount: 8,


            },
            {
                unit: "1407",
                rent: "$1,455",
                available: "Available in 30 Days",
                requestCount: 2,
            },
            {
                unit: "3410",
                rent: "$1,495",
                available: "Available July 15",
                requestCount: 2,
            },
        ],
        image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80",
    },
    {
        name: "B2",
        availableUnitCount: 2,
        beds: "2 Bed",
        baths: "2 Bath",
        sqft: "1,095 sqft",
        rent: "$1,995",
        available: "2 available",
        status: "limited",
        badge: "Limited Availability",
        availableUnits: [
            {
                unit: "5102",
                rent: "$1,995",
                available: "Available Now",
                requestCount: 2,
            },
            {
                unit: "4308",
                rent: "$2,045",
                available: "Available in 45 Days",
                requestCount: 6,
            },
        ],

    },
    {
        name: "S1",
        availableUnitCount: 6,
        beds: "Studio",
        baths: "1 Bath",
        sqft: "585 sqft",
        rent: "$1,299",
        available: "6 available",
        status: "available",
        badge: "Lowest Price",
        availableUnits: [
            {
                unit: "1205",
                rent: "$1,299",
                available: "Available Now",
                requestCount: 8,
            },
            {
                unit: "2309",
                rent: "$1,325",
                available: "Available in 30 Days",
                requestCount: 1
            },
        ],
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

const galleryImages = [
    {
        category: "Exterior",
        url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80",
    },
    {
        category: "Pool",
        url: "https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=1200&q=80",
    },
    {
        category: "Kitchen",
        url: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=1200&q=80",
    },
    {
        category: "Bedroom",
        url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    },
];

function normalizeListingFloorPlans(property) {
    const addMarketBenchmark = (plan) => enrichFloorPlanWithMarketBenchmark(property, plan);

    if (!property?.floorPlans?.length) {
        if (!property) return floorPlans;

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
            beds: plan.bedrooms || plan.beds || "Not set",
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
            special: plan.special || (plan.currentSpecial ? { label: plan.currentSpecial } : null),
            availableUnits: plan.availableUnits || [],
        });
    });
}

function enrichFloorPlanWithMarketBenchmark(property, plan) {
    const benchmark = getMarketRentBenchmark(property, plan);
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

    if (!benchmark) {
        return {
            ...plan,
            marketRent: "",
            marketRentSource: "",
        };
    }

    const shouldShowBenchmark =
        benchmark.marketRent > 0 &&
        effectiveRentNumber > 0 &&
        benchmark.marketRent > effectiveRentNumber;

    if (!shouldShowBenchmark) {
        return {
            ...plan,
            marketRent: "",
            marketRentSource: "",
            marketRentHiddenReason:
                "Class-adjusted benchmark did not show positive renter value.",
        };
    }

    const benchmarkSavingsNumber = Math.max(benchmark.marketRent - effectiveRentNumber, 0);
    const benchmarkPercentNumber = benchmark.marketRent
        ? Math.round((benchmarkSavingsNumber / benchmark.marketRent) * 100)
        : 0;

    return {
        ...plan,
        marketRent: formatCurrency(benchmark.marketRent),
        marketRentSource: benchmark.source,
        marketRentConfidence: benchmark.confidence,
        marketRentAreaName: benchmark.areaName,
        marketRentLastUpdated: benchmark.lastUpdated,
        marketRentPropertyClass: benchmark.propertyClassLabel,
        marketRentClassConfidence: benchmark.classConfidence,
        savings: plan.savings || (benchmarkSavingsNumber ? `${formatCurrency(benchmarkSavingsNumber)}/mo` : "$0/mo"),
        belowMarketPercent: plan.belowMarketPercent || `${benchmarkPercentNumber}%`,
    };
}

export default function PublicPropertyListing() {
    {/* Usestate start*/ }
    const { propertyId } = useParams();
    const publicProperties = useMemo(() => getPublicSearchProperties(), []);
    const property = publicProperties.find(
        (listingProperty) => listingProperty.id === String(propertyId)
    );
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
    const schoolSnapshot = getPropertySchoolSnapshot(property);
    const propertyGalleryImages =
        property?.photos?.length > 0
            ? property.photos.map((photo, index) => ({
                category: photo.category || `Photo ${index + 1}`,
                url: getPhotoImageUrl(photo),
            })).filter((photo) => photo.url)
            : galleryImages;
    const listingFloorPlans = normalizeListingFloorPlans(property);
    const benchmarkFloorPlan = listingFloorPlans.find(
        (plan) => plan.marketRent && plan.marketRentSource
    );
    const marketRentLabel = benchmarkFloorPlan?.marketRent || "";
    const marketRentSourceLabel =
        benchmarkFloorPlan?.marketRentConfidence ||
        benchmarkFloorPlan?.marketRentSource ||
        "";
    const savingsLabel = property?.savings || benchmarkFloorPlan?.savings || "";
    const renterDecisionFacts = getRenterDecisionFacts({
        effectiveRentLabel,
        hasPropertySpecial,
        listingFloorPlans,
        managementLabel,
        marketRentLabel,
        property,
        propertySpecialLabel,
        savingsLabel,
        schoolSnapshot,
        startingRentLabel,
    });
    const floorPlanFilters = [
        "All",
        ...new Set(listingFloorPlans.map((plan) => plan.beds).filter(Boolean)),
    ];
    const [showGallery, setShowGallery] = useState(false);
    const [activePhotoCategory, setActivePhotoCategory] = useState("All");
    const [selectedPhoto, setSelectedPhoto] = useState(propertyGalleryImages[0]);
    const [floorPlanSort, setFloorPlanSort] = useState("recommended");
    const [activeFloorPlanFilter, setActiveFloorPlanFilter] = useState("All");
    const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
    const [showSidebarError, setShowSidebarError] = useState(false);
    {/* Usestate end*/ }

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


    const filteredFloorPlans =
        activeFloorPlanFilter === "All"
            ? listingFloorPlans
            : listingFloorPlans.filter((plan) => plan.beds === activeFloorPlanFilter);

    const sortedFloorPlans = [...filteredFloorPlans].sort((a, b) => {
        const rentA = Number(String(a.rent || "").replace(/[^0-9]/g, ""));
        const rentB = Number(String(b.rent || "").replace(/[^0-9]/g, ""));

        const sqftA = Number(String(a.sqft || "").replace(/[^0-9]/g, ""));
        const sqftB = Number(String(b.sqft || "").replace(/[^0-9]/g, ""));

        if (floorPlanSort === "price-low") return rentA - rentB;
        if (floorPlanSort === "price-high") return rentB - rentA;
        if (floorPlanSort === "sqft") return sqftB - sqftA;

        return 0;
    });
    const [leadForm, setLeadForm] = useState({
        name: "",
        phone: "",
        email: "",
        moveInDate: "",
        contactMethod: "",
        bedroomsNeeded: "",
        tourPreference: "",
        selectedUnit: "",

    });

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

    const handleFloorPlanLeadSubmit = () => {
        if (!leadForm.name || !leadForm.phone || !leadForm.email) {
            setShowSidebarError(true);
            return;
        }

        setShowSidebarError(false);


        const leadData = {
            ...leadForm,
            propertyId,
            eventType: "lead_submit",
            eventCategory: "lead",
            pageSource: "public_property_listing",
            createdAt: new Date().toISOString(),
            status: "new",
            leadSource: leadForm.selectedUnit ? "unit_modal" : "floor_plan_modal",
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

        console.table(leadData);
        setLeadSubmitted(true);
    };

    const [leadSubmitted, setLeadSubmitted] = useState(false);

    if (!property || property.status !== "Live") {
        return (
            <main className="min-h-screen bg-[#f5f8f1] p-6 text-[#102426]">
                <div className="mx-auto max-w-4xl rounded-3xl border border-[#d7e6df] bg-white p-8 shadow-sm">
                    <h1 className="text-3xl font-black text-[#102426]">
                        Property not found
                    </h1>

                    <p className="mt-2 text-[#526260]">
                        This property listing is not currently available to renters.
                    </p>

                    <Link
                        to="/properties"
                        className="mt-6 inline-block rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
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
        selectedFloorPlan?.special?.freeWeeks || 0;
    const hasSelectedFloorPlanSpecial = Boolean(selectedFloorPlan?.special);
    const hasCalculableSelectedSpecial = freeWeeks > 0 && rentNumber > 0;

    const leaseMonths =
        selectedFloorPlan?.leaseTermMonths || 12;

    const effectiveRent =
        rentNumber -
        (rentNumber * (freeWeeks / 4)) / leaseMonths;

    const monthlySavings =
        rentNumber - effectiveRent;

    const concessionValue = rentNumber * (freeWeeks / 4);

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

    return (

        <main className="min-h-screen bg-[#f5f8f1] p-6 pb-32 text-[#102426] md:pb-32">
            <div className="mx-auto max-w-7xl space-y-8">
                <Link
                    to="/properties"
                    className="inline-block rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df] hover:bg-[#f5f8f1]"
                >
                    Back to Search
                </Link>
                <div className="rounded-3xl bg-white shadow-sm ring-1 ring-[#d7e6df]">                    <div className="grid gap-3 p-3 lg:grid-cols-[2fr_1fr]">
                    <div className="relative h-[280px] overflow-hidden rounded-2xl md:h-[340px]">
                        <img
                            src={propertyGalleryImages[0].url}
                            alt={property.name}
                            className="h-full w-full object-cover"
                        />

                        <button
                            onClick={() => setShowGallery(true)}
                            className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-sm font-black text-[#102426] shadow-md"
                        >
                            View {propertyGalleryImages.length} Photos
                        </button>
                    </div>

                    <div className="hidden h-[340px] grid-rows-3 gap-3 lg:grid">
                        {propertyGalleryImages.slice(1, 4).map((image, index) => (
                            <div key={image.url} className="relative overflow-hidden rounded-2xl">
                                <img
                                    src={image.url}
                                    alt={`${image.category} photo`}
                                    className="h-full w-full object-cover"
                                />

                                {index === 2 && (
                                    <button
                                        onClick={() => setShowGallery(true)}
                                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-black text-white"
                                    >
                                        View All Photos
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                    <div className="p-6">
                        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-[#526260]">
                                    {managementLabel}
                                </p>

                                <h1 className="mt-2 text-4xl font-black text-[#102426]">
                                    {property.name}
                                </h1>

                                <p className="mt-2 text-[#526260]">
                                    {addressLabel} • Starting at {startingRentLabel}
                                    {property.yearBuilt ? ` • Built ${property.yearBuilt}` : ""}
                                </p>


                                {hasPropertySpecial && (
                                    <div className="mt-5 rounded-2xl bg-[#fff8e6] p-4 ring-1 ring-[#f2d08a]">
                                        <p className="text-sm font-bold text-[#8a5b0a]">
                                            Current Special
                                        </p>

                                        <p className="mt-1 font-black text-[#102426]">
                                            {propertySpecialLabel}
                                        </p>

                                        <p className="mt-2 text-sm font-semibold text-[#7a432e]">
                                            Specials are shown separately so renters can compare the normal rent and the estimated effective rent.
                                        </p>
                                    </div>
                                )}


                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <PriceCompareCard
                                        label={effectiveRentLabel ? "Estimated Effective" : "Starting Rent"}
                                        price={effectiveRentLabel || startingRentLabel}
                                        note={effectiveRentLabel ? "After listed special" : "Before specials and fees"}
                                    />

                                    <PriceCompareCard
                                        label="Market Average"
                                        price={marketRentLabel || "Not listed"}
                                        note={marketRentSourceLabel || `Similar ${property.area || property.city || "nearby"} units`}
                                    />

                                    <PriceCompareCard
                                        label="Estimated Savings"
                                        price={savingsLabel || "$0/mo"}
                                        note="Based on available pricing"
                                    />

                                </div>



                                <div className="mt-6 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                                        <div>
                                            <p className="text-sm font-black text-[#1f6f63]">
                                                Renter decision snapshot
                                            </p>
                                            <h2 className="mt-1 text-2xl font-black text-[#102426]">
                                                What to know before you tour
                                            </h2>
                                        </div>

                                        <p className="max-w-md text-sm font-semibold leading-6 text-[#526260]">
                                            These facts are pulled from the listing data so renters can compare price, schools, availability, and fees faster.
                                        </p>
                                    </div>

                                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {renterDecisionFacts.map((fact) => (
                                            <RenterDecisionFactCard
                                                key={fact.label}
                                                label={fact.label}
                                                value={fact.value}
                                                detail={fact.detail}
                                                tone={fact.tone}
                                            />
                                        ))}
                                    </div>
                                </div>
                                {/*Floor Plans*/}
                                <div
                                    id="floor-plans"
                                    className="mt-8 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm"
                                >                                <h2 className="text-2xl font-black text-[#102426]">
                                        Floor Plans
                                    </h2>

                                    <p className="mt-2 text-[#526260]">
                                        View available layouts, pricing, and unit availability.
                                    </p>

                                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap gap-2">
                                            {floorPlanFilters.map((filter) => (
                                                <button
                                                    key={filter}
                                                    onClick={() => setActiveFloorPlanFilter(filter)}
                                                    className={`rounded-full px-4 py-2 text-sm font-bold ${activeFloorPlanFilter === filter
                                                        ? "bg-[#173f3f] text-white"
                                                        : "bg-[#f5f8f1] text-[#173f3f] hover:bg-[#d7e6df]"
                                                        }`}
                                                >
                                                    {filter}
                                                </button>
                                            ))}
                                        </div>

                                        <select
                                            value={floorPlanSort}
                                            onChange={(event) => setFloorPlanSort(event.target.value)}
                                            className="rounded-full border border-[#d7e6df] bg-white px-4 py-2 text-sm font-bold text-[#173f3f]"
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




                                    {filteredFloorPlans.length === 0 && (
                                        <div className="mt-6 rounded-2xl bg-[#f5f8f1] p-5 text-center">
                                            <p className="font-bold text-[#102426]">
                                                No floor plans found
                                            </p>


                                            <p className="mt-2 text-sm text-[#526260]">
                                                Try selecting a different bedroom type.
                                            </p>
                                        </div>
                                    )}


                                    <p className="mt-3 text-sm font-semibold text-[#526260]">
                                        Showing {filteredFloorPlans.length} floor plan
                                        {filteredFloorPlans.length === 1 ? "" : "s"}
                                    </p>

                                    <div className="mt-6 space-y-3">
                                        {sortedFloorPlans.map((plan) => (<FloorPlanCard
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
                                            image={plan.image}
                                            status={plan.status}
                                            special={plan.special}

                                            onViewDetails={() => {
                                                setSelectedFloorPlan(plan);
                                                setLeadSubmitted(false);
                                                setLeadForm({
                                                    name: "",
                                                    phone: "",
                                                    email: "",
                                                    moveInDate: "",
                                                    contactMethod: "",
                                                    selectedUnit: "",
                                                });
                                            }} />
                                        ))}
                                    </div>

                                </div>





                                {/*Amenities*/}
                                <div className="mt-8 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-black text-[#102426]">
                                        Amenities
                                    </h2>

                                    <p className="mt-2 text-[#526260]">
                                        Features and conveniences available at this property.
                                    </p>

                                    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        {amenities.map((amenity) => (
                                            <AmenityItem key={amenity} label={amenity} />
                                        ))}
                                    </div>
                                </div>

                                {/*Neighborhood*/}
                                <div className="mt-8 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-black text-[#102426]">
                                        Neighborhood Highlights
                                    </h2>

                                    <p className="mt-2 text-[#526260]">
                                        What renters may like about living near this property.
                                    </p>

                                    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                                        <HighlightCard
                                            title="Walkable Area"
                                            text="Close to coffee shops, restaurants, and daily essentials."
                                        />

                                        <HighlightCard
                                            title="Easy Commute"
                                            text="Quick access to Downtown Dallas, Uptown, and major highways."
                                        />

                                        <HighlightCard
                                            title="Lifestyle Value"
                                            text="Strong location with competitive pricing and active leasing specials."
                                        />
                                    </div>
                                </div>

                                {/*Location*/}
                                <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
                                    <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                                        <h2 className="text-2xl font-black text-[#102426]">
                                            Location
                                        </h2>

                                        <p className="mt-2 text-[#526260]">
                                            {addressLabel}
                                        </p>

                                        <PropertyLocationMap
                                            property={property}
                                            addressLabel={addressLabel}
                                        />
                                    </div>

                                    <div className="space-y-6">
                                        <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                                            <h2 className="text-2xl font-black text-[#102426]">
                                                Nearby
                                            </h2>

                                            <div className="mt-5 space-y-3">
                                                <NearbyItem label="Grocery" value="Pinned on map" />
                                                <NearbyItem label="Stores" value="Pinned on map" />
                                                <NearbyItem label="Gym" value="Pinned on map" />
                                                <NearbyItem label="Property" value="Gold BMA pin" />
                                            </div>
                                        </div>

                                        <SchoolSnapshotCard schoolSnapshot={schoolSnapshot} />
                                    </div>
                                </div>


                            </div>

                            <div
                                id="request-info"
                                className="mt-8 lg:mt-0"
                            >
                                <div className="sticky top-6 rounded-3xl border border-[#d7e6df] bg-white p-5 shadow-xl">
                                    <p className="text-sm font-bold text-[#526260]">
                                        Interested in this property?
                                    </p>

                                    <h2 className="mt-2 text-xl font-black text-[#102426]">
                                        Request tour or pricing
                                    </h2>

                                    <p className="mt-2 text-sm text-[#526260]">
                                        Call or text: 945-269-3768
                                    </p>
                                    <p className={`mt-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                                        hasPropertySpecial
                                            ? "bg-[#fff8e6] text-[#8a5b0a] ring-1 ring-[#f2d08a]"
                                            : "bg-[#f5f8f1] text-[#526260]"
                                    }`}>
                                        {hasPropertySpecial
                                            ? `Ask about ${propertySpecialLabel}.`
                                            : "Ask for current pricing, fees, and availability."}
                                    </p>

                                    <div className="mt-4 space-y-3">
                                        <input
                                            type="text"
                                            placeholder="Your name"
                                            value={leadForm.name}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    name: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        />

                                        <input
                                            type="tel"
                                            placeholder="Phone number"
                                            value={leadForm.phone}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    phone: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        />

                                        <input
                                            type="email"
                                            placeholder="Email address"
                                            value={leadForm.email}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    email: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        />

                                        <select
                                            value={leadForm.moveInDate}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    moveInDate: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        >
                                            <option value="">Desired move-in date</option>
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
                                            className="w-full rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        >
                                            <option value="">Bedrooms Needed</option>
                                            <option value="Studio">Studio</option>
                                            <option value="1 Bedroom">1 Bedroom</option>
                                            <option value="2 Bedroom">2 Bedroom</option>
                                            <option value="3 Bedroom">3 Bedroom</option>
                                        </select>

                                        <select
                                            value={leadForm.tourPreference}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    tourPreference: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        >
                                            <option value="">Tour Preference</option>
                                            <option value="In-person tour">In-person tour</option>
                                            <option value="Virtual tour">Virtual tour</option>
                                            <option value="Send pricing first">Send pricing first</option>
                                        </select>

                                        <select
                                            value={leadForm.contactMethod}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    contactMethod: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2]"
                                        >
                                            <option value="">Preferred Contact Method</option>
                                            <option value="Text">Text me</option>
                                            <option value="Call">Call me</option>
                                            <option value="Email">Email me</option>
                                        </select>
                                    </div>

                                    <div className="mt-4 rounded-2xl bg-[#f5f8f1] p-4">
                                        <p className="text-sm font-bold text-[#102426]">
                                            Helping Dallas renters find better deals
                                        </p>

                                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                                            <div>
                                                <p className="text-lg font-black text-[#102426]">500+</p>
                                                <p className="text-xs text-[#526260]">Renters Helped</p>
                                            </div>

                                            <div>
                                                <p className="text-lg font-black text-[#102426]">$250k+</p>
                                                <p className="text-xs text-[#526260]">Savings Found</p>
                                            </div>

                                            <div>
                                                <p className="text-lg font-black text-[#102426]">4.9★</p>
                                                <p className="text-xs text-[#526260]">Client Rating</p>
                                            </div>
                                        </div>
                                    </div>

                                    {showSidebarError && (
                                        <p className="mt-3 text-sm font-semibold text-[#e4572e]">
                                            * Required fields: Name, Phone, Email
                                        </p>
                                    )}
                                    <button
                                        onClick={handleFloorPlanLeadSubmit}
                                        disabled={leadSubmitted}
                                        className={`mt-5 w-full rounded-2xl px-5 py-3 text-sm font-black ${leadSubmitted
                                            ? "cursor-not-allowed bg-[#d7e6df] text-[#526260]"
                                            : "bg-[#f2b84b] text-[#102426] hover:bg-[#f9d783]"
                                            }`}
                                    >
                                        {leadSubmitted ? "Request Submitted" : "Check Availability"}
                                    </button>
                                    <div className="mt-4 space-y-2 text-sm font-semibold text-[#526260]">
                                        <p>✓ No cost to renters</p>
                                        <p>✓ Access to active leasing specials</p>
                                        <p>✓ Help comparing below-market options</p>
                                    </div>
                                    <p className="mt-4 text-xs leading-5 text-[#7b8b88]">
                                        By submitting, renters agree to be contacted about availability, pricing, and leasing specials.
                                    </p>
                                </div>
                            </div>





                        </div>

                    </div>
                </div>
            </div>
            {showGallery && (
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
                                    ? "bg-[#173f3f] text-white"
                                    : "bg-white text-[#173f3f]"
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                        </div>

                        <div className="mt-6 overflow-hidden rounded-3xl bg-[#f5f8f1]">
                            <img
                                src={selectedPhoto.url}
                                alt={`${selectedPhoto.category} selected`}
                                className="h-[420px] w-full object-cover"
                            />

                            <div className="p-4">
                                <p className="font-bold text-[#102426]">
                                    {selectedPhoto.category}
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
                                {selectedFloorPlan.beds} • {selectedFloorPlan.baths} • {selectedFloorPlan.sqft}
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
                                                Market Comparison
                                            </p>

                                            <p className="mt-1 text-2xl font-black text-[#102426]">
                                                {selectedFloorPlan.marketRent}
                                            </p>

                                            {selectedFloorPlan.marketRentSource && (
                                                <p className="mt-1 text-sm font-semibold text-[#526260]">
                                                    {selectedFloorPlan.marketRentConfidence || selectedFloorPlan.marketRentSource}
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
                                                        <p className="font-bold text-[#102426]">
                                                            Unit {unit.unit}
                                                        </p>

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

                                                                setLeadForm({
                                                                    name: "",
                                                                    phone: "",
                                                                    email: "",
                                                                    moveInDate: "",
                                                                    contactMethod: "",
                                                                    selectedUnit: unit.unit,
                                                                });

                                                                document
                                                                    .getElementById("floor-plan-lead-form")
                                                                    ?.scrollIntoView({
                                                                        behavior: "smooth",
                                                                        block: "start",
                                                                    });
                                                            }}
                                                            className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold text-white ${leadForm.selectedUnit === unit.unit
                                                                ? "bg-[#1f6f63]"
                                                                : "bg-[#173f3f] hover:bg-[#102426]"
                                                                }`}
                                                        >
                                                            {leadForm.selectedUnit === unit.unit
                                                                ? "✓ Selected"
                                                                : "Request Unit"}                                                        </button>
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
                                                    Based on {selectedFloorPlan.special.freeWeeks} free weeks applied across a {leaseMonths}-month lease.
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
                                        ? `Request Unit ${leadForm.selectedUnit}`
                                        : "Request this floor plan"}
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
                                            Request entire floor plan instead
                                        </button>
                                    </div>
                                )}

                                <p className="mt-4 text-xs font-semibold text-[#526260]">
                                    * Required fields
                                </p>
                                <div id="floor-plan-lead-form" className="mt-6 grid gap-3 md:grid-cols-2">                                    <input
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
                                        placeholder="Phone number"
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
                                        placeholder="Email address"
                                        value={leadForm.email}
                                        onChange={(e) =>
                                            setLeadForm({
                                                ...leadForm,
                                                email: e.target.value,
                                            })
                                        }
                                        className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2] md:col-span-2"
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
                                        className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2] md:col-span-2"
                                    >
                                        <option value="">Move-in timeline (optional)</option>                                        <option value="Immediately">Immediately</option>
                                        <option value="Within 30 Days">Within 30 Days</option>
                                        <option value="Within 60 Days">Within 60 Days</option>
                                        <option value="Within 90 Days">Within 90 Days</option>
                                        <option value="More Than 90 Days">More Than 90 Days</option>
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
                                        className="rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm outline-none focus:border-[#2d7dd2] md:col-span-2"
                                    >
                                        <option value="">Preferred contact (optional)</option>
                                        <option value="Text">Text me</option>
                                        <option value="Call">Call me</option>
                                        <option value="Email">Email me</option>
                                    </select>
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
                                    onClick={handleFloorPlanLeadSubmit}
                                    disabled={leadSubmitted}
                                    className={`mt-6 w-full rounded-2xl px-5 py-3 text-sm font-black ${leadSubmitted
                                        ? "cursor-not-allowed bg-[#d7e6df] text-[#526260]"
                                        : "bg-[#f2b84b] text-[#102426] hover:bg-[#f9d783]"
                                        }`}
                                >
                                    {leadSubmitted
                                        ? "Request Submitted"
                                        : leadForm.selectedUnit
                                            ? `Request Unit ${leadForm.selectedUnit}`
                                            : `Request ${selectedFloorPlan.name} Pricing & Availability`}
                                </button>


                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#d7e6df] bg-white p-3 shadow-lg xl:hidden">
                <div className="flex gap-3">
                    <button
                        onClick={() =>
                            document
                                .getElementById("request-info")
                                ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                })
                        }
                        className="flex-1 rounded-2xl bg-[#f2b84b] px-4 py-3 text-sm font-black text-[#102426]"
                    >
                        Request Information
                    </button>

                    <a
                        href="tel:9452693768"
                        onClick={() => handleCallTextClick("sticky_bottom_bar")}
                        className="flex-1 rounded-2xl bg-[#f5f8f1] px-4 py-3 text-center text-sm font-bold text-[#173f3f] ring-1 ring-[#d7e6df]"
                    >
                        Call / Text
                    </a>
                </div>
            </div>
        </main>
    );
}

function NearbyItem({ label, value }) {
    return (
        <div className="flex items-center justify-between rounded-2xl bg-[#f5f8f1] p-4">
            <p className="font-bold text-[#102426]">{label}</p>
            <p className="text-sm font-semibold text-[#526260]">{value}</p>
        </div>
    );
}

function SchoolSnapshotCard({ schoolSnapshot }) {
    return (
        <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-[#1f6f63]">
                        School District
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#102426]">
                        {schoolSnapshot.district}
                    </h2>
                </div>

                <span className={`shrink-0 rounded-2xl px-3 py-2 text-sm font-black ${getSchoolGradeClass(schoolSnapshot.districtGrade)}`}>
                    {schoolSnapshot.districtGrade}
                </span>
            </div>

            <div className="mt-5 space-y-3">
                {schoolSnapshot.schools.map((school) => (
                    <SchoolGradeItem key={`${school.level}-${school.name}`} school={school} />
                ))}
            </div>

            <p className="mt-4 rounded-2xl bg-[#f5f8f1] p-3 text-xs font-semibold leading-5 text-[#526260]">
                {schoolSnapshot.note}
            </p>
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

            {school.note && (
                <p className="mt-2 text-xs font-semibold leading-5 text-[#526260]">
                    {school.note}
                </p>
            )}
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

function PropertyLocationMap({ property, addressLabel }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef([]);
    const [mapboxGl, setMapboxGl] = useState(null);
    const [mapError, setMapError] = useState(
        MAPBOX_TOKEN ? "" : "Map token is missing."
    );
    const [propertyCoordinates, setPropertyCoordinates] = useState(null);
    const [nearbyPlaces, setNearbyPlaces] = useState([]);

    useEffect(() => {
        let isMounted = true;

        if (!MAPBOX_TOKEN) return undefined;

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
    }, []);

    useEffect(() => {
        let isMounted = true;

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
    }, [property]);

    useEffect(() => {
        let isMounted = true;

        resolveNearbyPlacePins(propertyCoordinates)
            .then((places) => {
                if (isMounted) {
                    setNearbyPlaces(places);
                }
            })
            .catch((error) => {
                console.error(error);
                if (isMounted) {
                    setNearbyPlaces(createNearbyPlacePins(propertyCoordinates));
                }
            });

        return () => {
            isMounted = false;
        };
    }, [propertyCoordinates]);

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

        const isApproximatePin = propertyCoordinates.mapAccuracy === "approximate";
        const propertyMarker = new mapboxGl.Marker({
            element: createPropertyMapMarker(
                property?.name || "Property",
                isApproximatePin
            ),
            anchor: "bottom",
        })
            .setLngLat([propertyCoordinates.longitude, propertyCoordinates.latitude])
            .setPopup(
                new mapboxGl.Popup({ offset: 28 }).setHTML(
                    `<strong>${escapeMapText(property?.name || "Property")}</strong><br>${escapeMapText(
                        addressLabel
                    )}${
                        isApproximatePin
                            ? "<br><em>Approximate location until a full street address is added.</em>"
                            : ""
                    }`
                )
            )
            .addTo(mapRef.current);

        markersRef.current.push(propertyMarker);

        nearbyPlaces.forEach((place) => {
            const marker = new mapboxGl.Marker({
                element: createNearbyMapMarker(place),
                anchor: "bottom",
            })
                .setLngLat([place.longitude, place.latitude])
                .setPopup(
                    new mapboxGl.Popup({ offset: 20 }).setHTML(
                        `<strong>${escapeMapText(place.label)}</strong><br>${escapeMapText(place.detail)}`
                    )
                )
                .addTo(mapRef.current);

            markersRef.current.push(marker);
        });

        return () => {
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
            <div className="mt-5 flex h-80 items-center justify-center rounded-3xl bg-[#d7e6df]">
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
        <div className="mt-5 overflow-hidden rounded-3xl border border-[#d7e6df] bg-[#dcebe4]">
            <div ref={mapContainerRef} className="h-80 w-full" />
            <div className="grid gap-2 border-t border-[#d7e6df] bg-white p-3 sm:grid-cols-4">
                <MapLegendItem color="bg-[#f2b84b]" label="Property" />
                <MapLegendItem color="bg-[#1f6f63]" label="Grocery" />
                <MapLegendItem color="bg-[#2d7dd2]" label="Stores" />
                <MapLegendItem color="bg-[#173f3f]" label="Gym" />
            </div>
        </div>
    );
}

function MapLegendItem({ color, label }) {
    return (
        <div className="flex items-center gap-2 rounded-xl bg-[#f5f8f1] px-3 py-2 text-xs font-black text-[#102426]">
            <span className={`h-3 w-3 rounded-full ${color}`} />
            {label}
        </div>
    );
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
    if (hasPreciseStreetAddress(property)) {
        const geocodedCoordinates = await geocodeListingAddress(property);
        if (geocodedCoordinates) return geocodedCoordinates;
    }

    const existingCoordinates = getPropertyCoordinates(property);
    if (existingCoordinates) return existingCoordinates;

    return geocodeListingAddress(property);
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

    const cacheKey = `bma-mapbox-geocode:${addressLabel.toLowerCase()}`;
    const cachedCoordinates = getCachedCoordinates(cacheKey);
    if (cachedCoordinates) return cachedCoordinates;

    const geocodingUrl = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressLabel)}.json`
    );
    geocodingUrl.searchParams.set("access_token", MAPBOX_TOKEN);
    geocodingUrl.searchParams.set("country", "US");
    geocodingUrl.searchParams.set("limit", "1");

    const response = await fetch(geocodingUrl);
    if (!response.ok) return null;

    const geocodingResult = await response.json();
    const firstFeature = geocodingResult.features?.[0];
    if (!isReliableGeocodeResult(firstFeature)) return null;

    const [longitude, latitude] = firstFeature?.center || [];

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    const coordinates = { latitude, longitude };
    localStorage.setItem(cacheKey, JSON.stringify(coordinates));

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

async function resolveNearbyPlacePins(center) {
    if (!center) return [];

    const fallbackPlaces = createNearbyPlacePins(center);
    if (!MAPBOX_TOKEN) return fallbackPlaces;

    const resolvedPlaces = await Promise.all(
        NEARBY_PLACE_QUERIES.map(async (placeQuery, index) => {
            const searchUrl = new URL(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeQuery.query)}.json`
            );
            searchUrl.searchParams.set("access_token", MAPBOX_TOKEN);
            searchUrl.searchParams.set(
                "proximity",
                `${center.longitude},${center.latitude}`
            );
            searchUrl.searchParams.set("types", "poi");
            searchUrl.searchParams.set("country", "US");
            searchUrl.searchParams.set("limit", "1");

            const response = await fetch(searchUrl);
            if (!response.ok) return fallbackPlaces[index];

            const searchResult = await response.json();
            const firstFeature = searchResult.features?.[0];
            const [longitude, latitude] = firstFeature?.center || [];

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                return fallbackPlaces[index];
            }

            return {
                ...placeQuery,
                label: firstFeature.text || placeQuery.label,
                detail: firstFeature.place_name || placeQuery.detail,
                latitude,
                longitude,
            };
        })
    );

    return resolvedPlaces;
}

function createNearbyPlacePins(center) {
    if (!center) return [];

    return [
        {
            label: "Nearby Grocery",
            detail: "Grocery options near this property",
            type: "grocery",
            latitude: center.latitude + 0.006,
            longitude: center.longitude - 0.004,
        },
        {
            label: "Nearby Stores",
            detail: "Shopping and daily essentials nearby",
            type: "stores",
            latitude: center.latitude - 0.004,
            longitude: center.longitude + 0.006,
        },
        {
            label: "Nearby Gym",
            detail: "Fitness options near this property",
            type: "gym",
            latitude: center.latitude + 0.003,
            longitude: center.longitude + 0.008,
        },
    ];
}

function createPropertyMapMarker(propertyName, isApproximatePin = false) {
    const markerElement = document.createElement("div");
    markerElement.className =
        "flex -translate-y-1 flex-col items-center gap-1";
    markerElement.title = `${propertyName}${
        isApproximatePin ? " - approximate location" : ""
    }`;
    const markerBackground = isApproximatePin ? "bg-[#8a5b0a]" : "bg-[#f2b84b]";
    const markerText = isApproximatePin ? "text-white" : "text-[#102426]";
    markerElement.innerHTML = `
        <div class="max-w-[150px] truncate rounded-full bg-[#102426] px-3 py-1 text-xs font-black text-white shadow-lg">${escapeMapText(propertyName)}</div>
        <div class="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white ${markerBackground} text-xs font-black ${markerText} shadow-xl ring-2 ring-[#8a5b0a]/25">BMA</div>
        <div class="-mt-2 h-4 w-4 rotate-45 border-b-4 border-r-4 border-white ${markerBackground} shadow-md"></div>
    `;

    return markerElement;
}

function createNearbyMapMarker(place) {
    const markerElement = document.createElement("div");
    const colors = {
        grocery: "bg-[#1f6f63]",
        stores: "bg-[#2d7dd2]",
        gym: "bg-[#173f3f]",
    };
    const abbreviations = {
        grocery: "G",
        stores: "S",
        gym: "GY",
    };

    markerElement.className = "flex flex-col items-center gap-1";
    markerElement.innerHTML = `
        <div class="rounded-full bg-white/95 px-2 py-1 text-[11px] font-black text-[#102426] shadow-sm">${escapeMapText(place.label.replace("Nearby ", ""))}</div>
        <div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white ${colors[place.type]} text-[11px] font-black text-white shadow-lg">${abbreviations[place.type]}</div>
    `;

    return markerElement;
}

function escapeMapText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function FloorPlanCard({
    name,
    beds,
    baths,
    sqft,
    rent,
    effectiveRent,
    marketRent,
    marketRentSource,
    marketRentConfidence,
    marketRentAreaName,
    marketRentLastUpdated,
    marketRentPropertyClass,
    marketRentClassConfidence,
    savings,
    belowMarketPercent,
    available,
    image,
    status,
    special,
    onViewDetails,
}) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]">
            <div className="flex gap-4">
                {image && (
                    <img
                        src={image}
                        alt={`${name} floor plan`}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
                    />
                )}

                <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            {special && (
                                <span className="mb-2 inline-flex max-w-full rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-bold text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                                    <span className="truncate">{special.label}</span>
                                </span>
                            )}

                            <p className="truncate text-lg font-black text-[#102426]">
                                {name}
                            </p>

                            <p className="mt-1 text-sm font-semibold text-[#526260]">
                                {beds} • {baths} • {sqft}
                            </p>
                        </div>

                        <span
                            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${status === "available"
                                ? "bg-[#d8efe6] text-[#1f6f63]"
                                : status === "limited"
                                    ? "bg-[#fff8e6] text-[#8a5b0a]"
                                    : "bg-[#fff0ea] text-[#e4572e]"
                                }`}
                        >
                            {available}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <FloorPlanMetric label="Starting" value={rent} />

                {effectiveRent && (
                    <FloorPlanMetric label="Effective" value={effectiveRent} highlight />
                )}

                {marketRent && (
                    <FloorPlanMetric label="Market" value={marketRent} />
                )}

                {savings && (
                    <FloorPlanMetric label="Savings" value={savings} highlight />
                )}
            </div>

            {marketRentSource && (
                <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-bold leading-5 text-[#526260] ring-1 ring-[#d7e6df]">
                    Market comparison: {marketRentConfidence || marketRentSource}
                    {marketRentAreaName ? ` for ${marketRentAreaName}` : ""}
                    {marketRentPropertyClass ? ` • ${marketRentPropertyClass}` : ""}
                    {marketRentClassConfidence ? ` (${marketRentClassConfidence})` : ""}
                    {marketRentLastUpdated ? ` • Updated ${marketRentLastUpdated}` : ""}
                </p>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-7">
                    {belowMarketPercent && (
                        <span className="inline-flex rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#174a7c]">
                            {belowMarketPercent} below
                        </span>
                    )}
                </div>

                <div className="grid gap-2 sm:flex sm:justify-end">
                    <button
                        onClick={onViewDetails}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#f5f8f1]"
                    >
                        View Details
                    </button>

                    <button
                        type="button"
                        onClick={onViewDetails}
                        className="rounded-xl bg-[#173f3f] px-4 py-2 text-sm font-bold text-white hover:bg-[#102426]"
                    >
                        Request Info
                    </button>
                </div>
            </div>
        </div>
    );
}

function FloorPlanMetric({ label, value, highlight = false }) {
    return (
        <div
            className={`rounded-xl px-3 py-2 ${
                highlight
                    ? "bg-[#e7f3ee] text-[#1f6f63]"
                    : "bg-white text-[#173f3f]"
            }`}
        >
            <p className="text-[11px] font-black uppercase">{label}</p>
            <p className="mt-0.5 truncate text-sm font-black">{value}</p>
        </div>
    );
}

function parseCurrency(value) {
    const firstCurrencyValue = String(value || "").replace(/,/g, "").match(/\d+(\.\d+)?/);
    const parsedValue = Number(firstCurrencyValue?.[0] || 0);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatCurrency(value) {
    return `$${Math.round(value).toLocaleString()}`;
}

function AmenityItem({ label }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4 font-bold text-[#102426]">
            {label}
        </div>
    );
}

function PriceCompareCard({ label, price, note }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4">
            <p className="text-sm font-semibold text-[#526260]">
                {label}
            </p>

            <p className="mt-2 text-2xl font-black text-[#102426]">
                {price}
            </p>

            <p className="mt-1 text-sm text-[#526260]">
                {note}
            </p>
        </div>
    );
}

function RenterDecisionFactCard({ label, value, detail, tone = "default" }) {
    const toneClass = {
        default: "bg-[#f5f8f1] text-[#102426] ring-[#d7e6df]",
        deal: "bg-[#fff8e6] text-[#102426] ring-[#f2d08a]",
        school: "bg-[#eef5ff] text-[#102426] ring-[#b8d9f0]",
        caution: "bg-[#fff0ea] text-[#102426] ring-[#f4c8b8]",
    }[tone] || "bg-[#f5f8f1] text-[#102426] ring-[#d7e6df]";

    return (
        <div className={`rounded-2xl p-4 ring-1 ${toneClass}`}>
            <p className="text-xs font-black uppercase text-[#526260]">
                {label}
            </p>

            <p className="mt-2 text-xl font-black leading-tight text-[#102426]">
                {value}
            </p>

            <p className="mt-2 text-sm font-semibold leading-6 text-[#526260]">
                {detail}
            </p>
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


function getRenterDecisionFacts({
    effectiveRentLabel,
    hasPropertySpecial,
    listingFloorPlans,
    managementLabel,
    marketRentLabel,
    property,
    propertySpecialLabel,
    savingsLabel,
    schoolSnapshot,
    startingRentLabel,
}) {
    const floorPlanCount = listingFloorPlans.length;
    const totalAvailableUnits = listingFloorPlans.reduce(
        (unitCount, floorPlan) => unitCount + (floorPlan.availableUnits?.length || 0),
        0
    );
    const bedLabels = [
        ...new Set(listingFloorPlans.map((floorPlan) => floorPlan.beds).filter(Boolean)),
    ];
    const bedSummary =
        bedLabels.length > 0
            ? bedLabels.join(", ")
            : property.bedrooms?.join(", ") || "Beds not listed";
    const feeLabel = property.requiredMonthlyFees || property.monthlyFees || "";
    const locationAccuracy =
        property.mapAccuracy === "approximate"
            ? "Approximate until the full street address is added"
            : "Address and map pin are available";
    const marketComparison = marketRentLabel && marketRentLabel !== "Not listed"
        ? `Market comparison listed at ${marketRentLabel}.`
        : "Market comparison is not listed yet.";

    return [
        {
            label: "Rent renter should compare",
            value: effectiveRentLabel || startingRentLabel,
            detail: effectiveRentLabel
                ? `Normal listed rent starts at ${startingRentLabel}. Effective rent reflects the listed special, not necessarily the monthly amount due.`
                : `No effective rent is listed, so renters should compare the normal rent of ${startingRentLabel}.`,
            tone: hasPropertySpecial ? "deal" : "default",
        },
        {
            label: "Special and savings",
            value: hasPropertySpecial ? propertySpecialLabel : "No active special",
            detail: hasPropertySpecial
                ? `${savingsLabel || "Savings not calculated"} shown from current listing data. Confirm whether the credit is applied upfront or across the lease.`
                : "This listing is currently shown without a concession, so the rent range is the main comparison point.",
            tone: hasPropertySpecial ? "deal" : "default",
        },
        {
            label: "Floor plans available",
            value: `${floorPlanCount} layout${floorPlanCount === 1 ? "" : "s"}`,
            detail:
                totalAvailableUnits > 0
                    ? `${totalAvailableUnits} listed unit${totalAvailableUnits === 1 ? "" : "s"} across ${bedSummary}.`
                    : `Available bedroom types: ${bedSummary}. Request current unit availability before touring.`,
        },
        {
            label: "Fees to ask about",
            value: feeLabel || "Confirm fees",
            detail: feeLabel
                ? `Listed required monthly fees are ${feeLabel}. Ask what is included, such as amenities, valet trash, pest control, or parking.`
                : "Ask for required monthly add-ons, one-time fees, deposit, parking, utilities, and whether specials apply to base rent only.",
            tone: feeLabel ? "deal" : "caution",
        },
        {
            label: "Schools",
            value: `${schoolSnapshot.district} (${schoolSnapshot.districtGrade})`,
            detail: "School grades and attendance zones should be verified with the district before applying.",
            tone: "school",
        },
        {
            label: "Property context",
            value: property.yearBuilt ? `Built ${property.yearBuilt}` : managementLabel,
            detail: `${managementLabel}. ${marketComparison} ${locationAccuracy}.`,
            tone: property.mapAccuracy === "approximate" ? "caution" : "default",
        },
    ];
}
