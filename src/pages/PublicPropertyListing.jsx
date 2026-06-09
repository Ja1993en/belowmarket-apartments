import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    getPropertyAddressLabel,
    getPublicSearchProperties,
} from "../data/propertySearchData";
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
                image: property.photos?.[0]?.url || property.image,
            },
        ];
    }

    return property.floorPlans.map((plan, index) => {
        if (typeof plan === "string") {
            return {
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
            };
        }

        return {
            ...plan,
            name: plan.name || `Floor Plan ${index + 1}`,
            beds: plan.bedrooms || plan.beds || "Not set",
            baths: plan.bathrooms || plan.baths || "Not set",
            sqft: plan.squareFeet || plan.sqft || "Not set",
            rent: plan.startingRent || plan.rent || "Contact for pricing",
            effectiveRent: plan.effectiveRent || "",
            marketRent: plan.marketRent || "",
            savings: plan.savings || "",
            belowMarketPercent: plan.belowMarketPercent || "",
            available: plan.availability || plan.available || "Not set",
            status: plan.status || "available",
            special: plan.special || (plan.currentSpecial ? { label: plan.currentSpecial } : null),
            availableUnits: plan.availableUnits || [],
        };
    });
}

export default function PublicPropertyListing() {
    {/* Usestate start*/ }
    const { propertyId } = useParams();
    const property = getPublicSearchProperties().find(
        (listingProperty) => listingProperty.id === String(propertyId)
    );
    const addressLabel = property ? getPropertyAddressLabel(property) : "";
    const startingRentLabel = property?.startingRent || property?.rent || "Contact for pricing";
    const effectiveRentLabel = property?.effectiveRent || "";
    const marketRentLabel = property?.marketRent || "";
    const savingsLabel = property?.savings || "";
    const hasPropertySpecial = Boolean(
        property?.special && property.special !== "Special not listed"
    );
    const propertySpecialLabel = hasPropertySpecial
        ? property.special
        : "No active special listed";
    const managementLabel =
        property?.managementCompany || property?.manager || "Property management not listed";
    const propertyGalleryImages =
        property?.photos?.length > 0
            ? property.photos.map((photo, index) => ({
                category: photo.category || `Photo ${index + 1}`,
                url: photo.url,
            }))
            : galleryImages;
    const listingFloorPlans = normalizeListingFloorPlans(property);
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
                                        note={`Similar ${property.area || property.city || "nearby"} units`}
                                    />

                                    <PriceCompareCard
                                        label="Estimated Savings"
                                        price={savingsLabel || "$0/mo"}
                                        note="Based on available pricing"
                                    />

                                </div>



                                <div className="mt-6 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                                    <h2 className="text-xl font-black text-[#102426]">
                                        Why Renters Choose This Property
                                    </h2>

                                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                                        <ReasonCard
                                            icon="💰"
                                            title="Transparent Pricing"
                                            text={
                                                savingsLabel
                                                    ? `Estimated savings of ${savingsLabel} based on the current listing data.`
                                                    : "Compare starting rent, market rent, and specials before requesting a tour."
                                            }
                                        />
                                        <ReasonCard
                                            icon="📍"
                                            title="Location Context"
                                            text={`${property.name} is listed near ${property.area || property.city || "the Dallas area"} with address details shown up front.`}
                                        />
                                        <ReasonCard
                                            icon="🎁"
                                            title={hasPropertySpecial ? "Active Special" : "Special Status"}
                                            text={
                                                hasPropertySpecial
                                                    ? `${propertySpecialLabel} is currently listed for this property.`
                                                    : "No active special is listed, so pricing is shown as normal rent."
                                            }
                                        />

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

                                        <div className="mt-5 flex h-80 items-center justify-center rounded-3xl bg-[#d7e6df]">
                                            <div className="text-center">
                                                <p className="text-lg font-black text-[#173f3f]">
                                                    Map Preview
                                                </p>

                                                <p className="mt-2 text-sm text-[#526260]">
                                                    Google Maps or Mapbox will connect here later.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                                        <h2 className="text-2xl font-black text-[#102426]">
                                            Nearby
                                        </h2>

                                        <div className="mt-5 space-y-3">
                                            <NearbyItem label="Coffee" value="4 min walk" />
                                            <NearbyItem label="Grocery" value="7 min drive" />
                                            <NearbyItem label="Gym" value="5 min walk" />
                                            <NearbyItem label="Downtown Dallas" value="9 min drive" />
                                        </div>
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


function FloorPlanCard({
    name,
    beds,
    baths,
    sqft,
    rent,
    effectiveRent,
    marketRent,
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
function HighlightCard({ title, text }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-5">
            <p className="font-black text-[#102426]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#526260]">{text}</p>
        </div>
    );
}


function ReasonCard({ icon, title, text }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4">
            <div className="text-2xl">{icon}</div>
            <p className="mt-3 font-bold text-[#102426]">{title}</p>
            <p className="mt-2 text-sm text-[#526260]">{text}</p>
        </div>
    );
}
