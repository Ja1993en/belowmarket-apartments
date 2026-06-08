import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAnyPropertyById } from "../data/propertyStorage";
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

export default function PublicPropertyListing() {
    {/* Usestate start*/ }
    const { propertyId } = useParams();
    const property = getAnyPropertyById(propertyId);
    const propertyGalleryImages =
        property?.photos?.length > 0
            ? property.photos.map((photo, index) => ({
                category: photo.category || `Photo ${index + 1}`,
                url: photo.url,
            }))
            : galleryImages;
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
            ? floorPlans
            : floorPlans.filter((plan) => plan.beds === activeFloorPlanFilter);

    const sortedFloorPlans = [...filteredFloorPlans].sort((a, b) => {
        const rentA = Number(a.rent.replace(/[^0-9]/g, ""));
        const rentB = Number(b.rent.replace(/[^0-9]/g, ""));

        const sqftA = Number(a.sqft.replace(/[^0-9]/g, ""));
        const sqftB = Number(b.sqft.replace(/[^0-9]/g, ""));

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
            estimatedRentAfterSpecial: selectedFloorPlan?.special
                ? Math.round(effectiveRent)
                : null,
            monthlySavings: selectedFloorPlan?.special
                ? Math.round(monthlySavings)
                : null,
            concessionValue: selectedFloorPlan?.special
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
            <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
                <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <h1 className="text-3xl font-black text-slate-900">
                        Property not found
                    </h1>

                    <p className="mt-2 text-slate-500">
                        This property listing is not currently available to renters.
                    </p>

                    <Link
                        to="/admin/properties"
                        className="mt-6 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        Back to Properties
                    </Link>
                </div>
            </main>
        );
    }

    const rentNumber = selectedFloorPlan
        ? Number(selectedFloorPlan.rent.replace(/[^0-9]/g, ""))
        : 0;

    const freeWeeks =
        selectedFloorPlan?.special?.freeWeeks || 0;

    const leaseMonths =
        selectedFloorPlan?.leaseTermMonths || 12;

    const effectiveRent =
        rentNumber -
        (rentNumber * (freeWeeks / 4.345)) / leaseMonths;

    const monthlySavings =
        rentNumber - effectiveRent;

    const concessionValue = rentNumber * (freeWeeks / 4.345);

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

        <main className="min-h-screen bg-slate-100 p-6 pb-32 text-slate-950 md:pb-32">
            <div className="mx-auto max-w-7xl space-y-8">
                <Link
                    to="/"
                    className="inline-block rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                    Back to Search
                </Link>
                <div className="rounded-3xl bg-white shadow-sm">                    <div className="grid gap-3 p-3 lg:grid-cols-[2fr_1fr]">
                    <div className="relative h-[280px] overflow-hidden rounded-2xl md:h-[340px]">
                        <img
                            src={propertyGalleryImages[0].url}
                            alt={property.name}
                            className="h-full w-full object-cover"
                        />

                        <button
                            onClick={() => setShowGallery(true)}
                            className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-md"
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
                                <p className="text-sm font-bold text-slate-500">
                                    Public Property Listing
                                </p>

                                <h1 className="mt-2 text-4xl font-black text-slate-900">
                                    {property.name}
                                </h1>

                                <p className="mt-2 text-slate-500">
                                    {property.area} • Starting at {property.rent}
                                </p>


                                <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                                    <p className="text-sm font-bold text-emerald-700">
                                        Current Special
                                    </p>

                                    <p className="mt-1 font-black text-slate-900">
                                        {property.special}
                                    </p>
                                </div>


                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <PriceCompareCard
                                        label="This Property"
                                        price={`${property.effectiveRent}/mo`}
                                        note="Current effective rent"
                                    />

                                    <PriceCompareCard
                                        label="Market Average"
                                        price={`${property.marketRent}/mo`}
                                        note={`Similar ${property.area} units`}
                                    />

                                    <PriceCompareCard
                                        label="Estimated Savings"
                                        price={property.savings}
                                        note="Based on current pricing"
                                    />

                                </div>



                                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <h2 className="text-xl font-black text-slate-900">
                                        Why Renters Choose This Property
                                    </h2>

                                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                                        <ReasonCard icon="💰" title="Save Money" text="Estimated savings of about $225 per month compared to similar apartments nearby." />
                                        <ReasonCard icon="📍" title="Great Location" text="Close to restaurants, shopping, entertainment, and major Dallas employers." />
                                        <ReasonCard icon="🎁" title="Limited-Time Special" text="Current 6 weeks free special can significantly reduce your effective rent." />

                                    </div>
                                </div>
                                {/*Floor Plans*/}
                                <div
                                    id="floor-plans"
                                    className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                                >                                <h2 className="text-2xl font-black text-slate-900">
                                        Floor Plans
                                    </h2>

                                    <p className="mt-2 text-slate-500">
                                        View available layouts, pricing, and unit availability.
                                    </p>

                                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap gap-2">
                                            {["All", "Studio", "1 Bed", "2 Bed"].map((filter) => (
                                                <button
                                                    key={filter}
                                                    onClick={() => setActiveFloorPlanFilter(filter)}
                                                    className={`rounded-full px-4 py-2 text-sm font-bold ${activeFloorPlanFilter === filter
                                                        ? "bg-slate-950 text-white"
                                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                        }`}
                                                >
                                                    {filter}
                                                </button>
                                            ))}
                                        </div>

                                        <select
                                            value={floorPlanSort}
                                            onChange={(event) => setFloorPlanSort(event.target.value)}
                                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
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
                                        <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-center">
                                            <p className="font-bold text-slate-900">
                                                No floor plans found
                                            </p>


                                            <p className="mt-2 text-sm text-slate-500">
                                                Try selecting a different bedroom type.
                                            </p>
                                        </div>
                                    )}


                                    <p className="mt-3 text-sm font-semibold text-slate-500">
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
                                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-black text-slate-900">
                                        Amenities
                                    </h2>

                                    <p className="mt-2 text-slate-500">
                                        Features and conveniences available at this property.
                                    </p>

                                    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        {amenities.map((amenity) => (
                                            <AmenityItem key={amenity} label={amenity} />
                                        ))}
                                    </div>
                                </div>

                                {/*Neighborhood*/}
                                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <h2 className="text-2xl font-black text-slate-900">
                                        Neighborhood Highlights
                                    </h2>

                                    <p className="mt-2 text-slate-500">
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
                                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <h2 className="text-2xl font-black text-slate-900">
                                            Location
                                        </h2>

                                        <p className="mt-2 text-slate-500">
                                            2810 McKinney Ave, Dallas, TX 75204
                                        </p>

                                        <div className="mt-5 flex h-80 items-center justify-center rounded-3xl bg-slate-200">
                                            <div className="text-center">
                                                <p className="text-lg font-black text-slate-700">
                                                    Map Preview
                                                </p>

                                                <p className="mt-2 text-sm text-slate-500">
                                                    Google Maps or Mapbox will connect here later.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <h2 className="text-2xl font-black text-slate-900">
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
                                <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
                                    <p className="text-sm font-bold text-slate-500">
                                        Interested in this property?
                                    </p>

                                    <h2 className="mt-2 text-xl font-black text-slate-900">
                                        Request tour or pricing
                                    </h2>

                                    <p className="mt-2 text-sm text-slate-500">
                                        Call or text: 945-269-3768
                                    </p>
                                    <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                                        Ask about 6 weeks free before it expires.
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
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
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
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
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
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                        />

                                        <select
                                            value={leadForm.moveInDate}
                                            onChange={(e) =>
                                                setLeadForm({
                                                    ...leadForm,
                                                    moveInDate: e.target.value,
                                                })
                                            }
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
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
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
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
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
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
                                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                        >
                                            <option value="">Preferred Contact Method</option>
                                            <option value="Text">Text me</option>
                                            <option value="Call">Call me</option>
                                            <option value="Email">Email me</option>
                                        </select>
                                    </div>

                                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                        <p className="text-sm font-bold text-slate-900">
                                            Helping Dallas renters find better deals
                                        </p>

                                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                                            <div>
                                                <p className="text-lg font-black text-slate-900">500+</p>
                                                <p className="text-xs text-slate-500">Renters Helped</p>
                                            </div>

                                            <div>
                                                <p className="text-lg font-black text-slate-900">$250k+</p>
                                                <p className="text-xs text-slate-500">Savings Found</p>
                                            </div>

                                            <div>
                                                <p className="text-lg font-black text-slate-900">4.9★</p>
                                                <p className="text-xs text-slate-500">Client Rating</p>
                                            </div>
                                        </div>
                                    </div>

                                    {showSidebarError && (
                                        <p className="mt-3 text-sm font-semibold text-red-600">
                                            * Required fields: Name, Phone, Email
                                        </p>
                                    )}
                                    <button
                                        onClick={handleFloorPlanLeadSubmit}
                                        disabled={leadSubmitted}
                                        className={`mt-5 w-full rounded-2xl px-5 py-3 text-sm font-bold text-white ${leadSubmitted
                                            ? "cursor-not-allowed bg-slate-400"
                                            : "bg-slate-950 hover:bg-slate-800"
                                            }`}
                                    >
                                        {leadSubmitted ? "Request Submitted" : "Check Availability"}
                                    </button>
                                    <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
                                        <p>✓ No cost to renters</p>
                                        <p>✓ Access to active leasing specials</p>
                                        <p>✓ Help comparing below-market options</p>
                                    </div>
                                    <p className="mt-4 text-xs leading-5 text-slate-400">
                                        By submitting, renters agree to be contacted about availability, pricing, and leasing specials.
                                    </p>
                                </div>
                            </div>





                        </div>

                        <div className="mt-8">
                            <Link
                                to="/admin/properties"
                                className="inline-block rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                Back to Admin
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
            {showGallery && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 md:p-6">
                    <div className="mx-auto my-6 max-w-6xl rounded-3xl bg-white p-4 md:p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">
                                    Property Photos
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Showing {filteredGalleryImages.length} of {propertyGalleryImages.length} photos
                                </p>
                            </div>

                            <button
                                onClick={() => setShowGallery(false)}
                                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                            >
                                Close
                            </button>
                        </div>

                        <div className="sticky top-0 z-10 mt-5 flex flex-wrap gap-2 py-4">                            {photoCategories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActivePhotoCategory(category)}
                                className={`rounded-full px-4 py-2 text-sm font-bold shadow-md ${activePhotoCategory === category
                                    ? "bg-slate-950 text-white"
                                    : "bg-white text-slate-700"
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                        </div>

                        <div className="mt-6 overflow-hidden rounded-3xl bg-slate-100">
                            <img
                                src={selectedPhoto.url}
                                alt={`${selectedPhoto.category} selected`}
                                className="h-[420px] w-full object-cover"
                            />

                            <div className="p-4">
                                <p className="font-bold text-slate-900">
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
                                    className="overflow-hidden rounded-2xl bg-slate-50 text-left"
                                >
                                    <img
                                        src={image.url}
                                        alt={`${image.category} photo`}
                                        className="h-72 w-full object-cover"
                                    />

                                    <div className="p-3">
                                        <p className="font-bold text-slate-900">
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
                            <p className="text-sm font-bold text-slate-500">
                                Floor Plan Details
                            </p>

                            <h2 className="mt-1 text-3xl font-black text-slate-900">
                                {selectedFloorPlan.name}
                            </h2>

                            <p className="mt-2 text-slate-500">
                                {selectedFloorPlan.beds} • {selectedFloorPlan.baths} • {selectedFloorPlan.sqft}
                            </p>


                        </div>


                        <button
                            onClick={() => setSelectedFloorPlan(null)}
                            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
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

                                    <div className="rounded-2xl bg-slate-50 p-4">
                                        <p className="text-sm font-bold text-slate-500">
                                            Starting Rent
                                        </p>

                                        <p className="mt-1 text-2xl font-black text-slate-900">
                                            {selectedFloorPlan.rent}
                                        </p>
                                    </div>
                                    {selectedFloorPlan.special && (
                                        <div className="rounded-2xl bg-emerald-50 p-4">
                                            <p className="text-sm font-bold text-emerald-700">
                                                Estimated Rent After Special                                            </p>

                                            <p className="mt-1 text-2xl font-black text-slate-900">
                                                ${Math.round(effectiveRent).toLocaleString()}
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-emerald-700">
                                                Save about ${Math.round(monthlySavings)}/mo
                                            </p>
                                        </div>

                                    )}

                                    {selectedFloorPlan.special && (
                                        <p className="mt-3 text-sm font-semibold text-slate-500">
                                            Rent after special is estimated using a {leaseMonths}-month lease term.
                                        </p>
                                    )}


                                </div>
                                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black text-slate-900">
                                            Available Units
                                        </h3>

                                        <div className="flex flex-wrap gap-2">
                                            {selectedFloorPlan.availableUnits?.length > 2 ? (
                                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                                    Multiple Units Available
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                                    Low Availability
                                                </span>
                                            )}

                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
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
                                                        ? "border border-emerald-200 bg-emerald-50"
                                                        : "bg-slate-50"
                                                        }`}                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-900">
                                                            Unit {unit.unit}
                                                        </p>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {unit.requestCount > 0 &&
                                                                unit.requestCount === highestRequestCount && (
                                                                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                                                        Most Requested
                                                                    </span>
                                                                )}

                                                            {Number(unit.rent.replace(/[^0-9]/g, "")) === lowestUnitRent && (
                                                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                                                                    Best Value
                                                                </span>
                                                            )}

                                                            {unit.available === "Available Now" && (
                                                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                                                                    Available Now
                                                                </span>
                                                            )}
                                                        </div>

                                                        {unit.available !== "Available Now" && (
                                                            <p className="mt-2 text-sm text-slate-500">
                                                                {unit.available}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">


                                                        <p className="text-2xl font-black text-slate-900">
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
                                                                ? "bg-emerald-600"
                                                                : "bg-slate-950 hover:bg-slate-800"
                                                                }`}
                                                        >
                                                            {leadForm.selectedUnit === unit.unit
                                                                ? "✓ Selected"
                                                                : "Request Unit"}                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                                                Contact us for the latest available units.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedFloorPlan.special && (
                                    <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                                        <p className="text-sm font-bold text-emerald-700">
                                            Special Offer
                                        </p>
                                        <p className="mt-1 font-black text-slate-900">
                                            {selectedFloorPlan.special.label}
                                        </p>
                                        <p className="mt-2 text-sm font-semibold text-emerald-700">
                                            Estimated concession value: ${Math.round(concessionValue).toLocaleString()}
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-emerald-700">
                                            Based on {selectedFloorPlan.special.freeWeeks} free weeks applied across a {leaseMonths}-month lease.
                                        </p>


                                    </div>
                                )}

                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                <h3 className="text-xl font-black text-slate-900">
                                    {leadForm.selectedUnit
                                        ? `Request Unit ${leadForm.selectedUnit}`
                                        : "Request this floor plan"}
                                </h3>

                                <p className="mt-2 text-sm text-slate-500">
                                    {leadForm.selectedUnit
                                        ? `Get current pricing, availability, and special details for Unit ${leadForm.selectedUnit}.`
                                        : `Get current pricing, availability, and special details for ${selectedFloorPlan.name}.`}
                                </p>


                                <div className="mt-4 rounded-2xl bg-white p-4">
                                    <p className="text-sm font-bold text-slate-900">
                                        Local Apartment Locator
                                    </p>

                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                                            JM
                                        </div>

                                        <div>
                                            <p className="font-bold text-slate-900">
                                                Jalen McNeal
                                            </p>


                                            <p className="text-sm text-slate-500">
                                                Dallas apartment specialist
                                            </p>
                                            <a
                                                href="tel:9452693768"
                                                onClick={() => handleCallTextClick("floor_plan_modal")}
                                                className="mt-3 block text-center text-sm font-bold text-slate-600 hover:text-slate-900"
                                            >
                                                📞 Call or Text Jalen (945) 269-3768
                                            </a>
                                        </div>
                                    </div>


                                    <p className="mt-3 text-sm leading-6 text-slate-500">
                                        I’ll help confirm current pricing, specials, and similar options that may fit your move-in timeline.
                                    </p>
                                </div>

                                {leadForm.selectedUnit && (
                                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">

                                        <p className="text-sm font-bold text-emerald-700">
                                            ✓ Selected Unit
                                        </p>

                                        <p className="mt-1 font-black text-slate-900">
                                            Unit {leadForm.selectedUnit}
                                        </p>
                                        {selectedUnitDetails && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {selectedUnitDetails.requestCount > 0 &&
                                                    selectedUnitDetails.requestCount === highestRequestCount && (
                                                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                                            Most Requested
                                                        </span>
                                                    )}

                                                {Number(selectedUnitDetails.rent.replace(/[^0-9]/g, "")) === lowestUnitRent && (
                                                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                                                        Best Value
                                                    </span>
                                                )}

                                                {selectedUnitDetails.available === "Available Now" && (
                                                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                                                        Available Now
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {selectedUnitDetails && (
                                            <p className="mt-1 text-sm font-semibold text-slate-600">
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
                                            className="mt-3 text-xs font-bold text-slate-600 underline hover:text-slate-900"
                                        >
                                            Request entire floor plan instead
                                        </button>
                                    </div>
                                )}

                                <p className="mt-4 text-xs font-semibold text-slate-500">
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
                                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
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
                                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
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
                                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 md:col-span-2"
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
                                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 md:col-span-2"
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
                                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 md:col-span-2"
                                    >
                                        <option value="">Preferred contact (optional)</option>
                                        <option value="Text">Text me</option>
                                        <option value="Call">Call me</option>
                                        <option value="Email">Email me</option>
                                    </select>
                                </div>
                                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                    <p className="text-sm font-semibold text-slate-700">
                                        ✓ No cost to renters
                                    </p>

                                    <p className="mt-2 text-sm font-semibold text-slate-700">
                                        ✓ Access to active leasing specials
                                    </p>

                                    <p className="mt-2 text-sm font-semibold text-slate-700">
                                        ✓ Fast response from a local apartment locator
                                    </p>
                                </div>

                                {leadSubmitted && (
                                    <div className="mt-4 rounded-2xl p-4 text-sm font-bold text-emerald-700">
                                        {leadForm.selectedUnit
                                            ? `✅ Request received for Unit ${leadForm.selectedUnit}. We'll follow up with current pricing and availability.`
                                            : `✅ Request received for ${selectedFloorPlan.name}. We'll follow up with current pricing and availability.`}
                                    </div>
                                )}

                                <button
                                    onClick={handleFloorPlanLeadSubmit}
                                    disabled={leadSubmitted}
                                    className={`mt-6 w-full rounded-2xl px-5 py-3 text-sm font-bold text-white ${leadSubmitted
                                        ? "cursor-not-allowed bg-slate-400"
                                        : "bg-slate-950 hover:bg-slate-800"
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

            <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white p-3 shadow-lg xl:hidden">
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
                        className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
                    >
                        Request Information
                    </button>

                    <a
                        href="tel:9452693768"
                        onClick={() => handleCallTextClick("sticky_bottom_bar")}
                        className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-700"
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
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
            <p className="font-bold text-slate-900">{label}</p>
            <p className="text-sm font-semibold text-slate-500">{value}</p>
        </div>
    );
}


function FloorPlanCard({ name, beds, baths, sqft, rent, available, image, status, special, onViewDetails }) {
    return (
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center">

            <div className="flex items-center gap-4">

                {image && (
                    <img
                        src={image}
                        alt={`${name} floor plan`}
                        className="h-20 w-20 rounded-xl object-cover"
                    />
                )}

                <div>

                    {special && (
                        <span className="mb-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            {special.label}
                        </span>
                    )}

                    <p className="text-lg font-black text-slate-900">{name}</p>

                    <p className="mt-1 text-sm text-slate-500">
                        {beds} • {baths} • {sqft}
                    </p>
                </div>

            </div>

            <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {rent}
                </span>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${status === "available"
                        ? "bg-emerald-100 text-emerald-700"
                        : status === "limited"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}
                >
                    {available}
                </span>
                <button
                    onClick={onViewDetails}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                    View Details
                </button>

                <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                    Request Info
                </button>
            </div>
        </div>
    );
}

function AmenityItem({ label }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4 font-bold text-slate-900">
            {label}
        </div>
    );
}

function PriceCompareCard({ label, price, note }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">
                {label}
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
                {price}
            </p>

            <p className="mt-1 text-sm text-slate-500">
                {note}
            </p>
        </div>
    );
}
function HighlightCard({ title, text }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-5">
            <p className="font-black text-slate-900">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
        </div>
    );
}


function ReasonCard({ icon, title, text }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-2xl">{icon}</div>
            <p className="mt-3 font-bold text-slate-900">{title}</p>
            <p className="mt-2 text-sm text-slate-500">{text}</p>
        </div>
    );
}
