import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin, Search } from "lucide-react";

import { getAllProperties } from "../data/propertyStorage";

const LEASING_WEEKS_PER_MONTH = 4;

export default function HomePage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [areaFilter, setAreaFilter] = useState("All");
    const [bedroomFilter, setBedroomFilter] = useState("All");
    const [yearBuiltFilter, setYearBuiltFilter] = useState("Any year");
    const [maxStartingRentFilter, setMaxStartingRentFilter] = useState("Any starting rent");
    const [maxEffectiveRentFilter, setMaxEffectiveRentFilter] = useState("Any effective rent");
    const [moveInDateFilter, setMoveInDateFilter] = useState("");
    const [specialFilter, setSpecialFilter] = useState("Any special");
    const [sortOption, setSortOption] = useState("Lowest effective rent");

    const properties = getAllProperties();

    const publicProperties = properties.filter(
        (property) => property.status === "Live"
    );

    const floorPlanFilters = {
        bedroomFilter,
        maxStartingRentFilter,
        maxEffectiveRentFilter,
        moveInDateFilter,
        specialFilter,
    };

    const filteredProperties = publicProperties.map((property) => {
        const propertyFloorPlans = getSearchFloorPlans(property);
        const searchableText = [
            property.name,
            property.area,
            property.special,
            property.manager,
            property.managementCompany,
            property.address,
            property.city,
            property.state,
            property.zipcode,
            property.yearBuilt,
            ...propertyFloorPlans.flatMap((floorPlan) => [
                floorPlan.name,
                floorPlan.bedrooms,
                floorPlan.startingRent,
                floorPlan.effectiveRent,
                floorPlan.savings,
                floorPlan.currentSpecial,
                floorPlan.availableUnits.map((unit) => unit.availableDate).join(" "),
            ]),
        ].filter(Boolean).join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
        const matchesArea = areaFilter === "All" || property.area === areaFilter;
        const builtYear = Number(property.yearBuilt);
        const matchesYearBuilt =
            yearBuiltFilter === "Any year" ||
            (yearBuiltFilter === "2020 or newer" && builtYear >= 2020) ||
            (yearBuiltFilter === "2015 or newer" && builtYear >= 2015) ||
            (yearBuiltFilter === "2010 or newer" && builtYear >= 2010) ||
            (yearBuiltFilter === "Before 2010" && builtYear > 0 && builtYear < 2010);
        const matchingFloorPlans = getMatchingFloorPlans(
            propertyFloorPlans,
            floorPlanFilters,
            searchTerm
        );
        const matchesFloorPlanFilters = matchingFloorPlans.length > 0;

        if (!matchesSearch || !matchesArea || !matchesYearBuilt || !matchesFloorPlanFilters) {
            return null;
        }

        return {
            ...property,
            matchedFloorPlan: getBestFloorPlanDeal(matchingFloorPlans),
        };
    }).filter(Boolean);
    const sortedProperties = sortPropertiesByDeal(filteredProperties, sortOption);

    const areas = ["All", ...new Set(publicProperties.map((property) => property.area))];
    const bedroomSortOrder = ["Studio", "1 Bed", "2 Bed", "3 Bed"];
    const bedrooms = [
        "All",
        ...new Set(
            publicProperties.flatMap((property) =>
                getSearchFloorPlans(property).map((floorPlan) => floorPlan.bedrooms)
            ).filter(Boolean)
        ),
    ].sort((firstBedroom, secondBedroom) => {
        if (firstBedroom === "All") return -1;
        if (secondBedroom === "All") return 1;

        const firstIndex = bedroomSortOrder.indexOf(firstBedroom);
        const secondIndex = bedroomSortOrder.indexOf(secondBedroom);

        return normalizeSortIndex(firstIndex) - normalizeSortIndex(secondIndex);
    });
    const yearBuiltOptions = [
        "Any year",
        "2020 or newer",
        "2015 or newer",
        "2010 or newer",
        "Before 2010",
    ];
    const rentOptions = [
        "Any starting rent",
        "$1,400 or less",
        "$1,600 or less",
        "$1,800 or less",
        "$2,000 or less",
        "$2,500 or less",
    ];
    const effectiveRentOptions = [
        "Any effective rent",
        "$1,400 or less",
        "$1,600 or less",
        "$1,800 or less",
        "$2,000 or less",
        "$2,500 or less",
    ];
    const specialOptions = [
        "Any special",
        "Has special",
        "2+ weeks free",
        "4+ weeks free",
        "6+ weeks free",
        "8+ weeks free",
    ];
    const sortOptions = [
        "Lowest effective rent",
        "Highest savings",
        "Newest property",
        "Most weeks free",
    ];

    return (
        <main className="min-h-screen bg-slate-100 text-slate-950">
            <section className="bg-slate-950 px-6 py-10 text-white">
                <div className="mx-auto max-w-6xl">
                    <p className="text-sm font-bold text-slate-300">
                        Below Market Apartments
                    </p>

                    <h1 className="mt-3 max-w-3xl text-4xl font-black md:text-5xl">
                        Find apartments with verified specials and below-market pricing.
                    </h1>

                    <p className="mt-4 max-w-2xl text-slate-300">
                        Browse apartment deals, compare effective rent, and request help from a locator.
                    </p>
                    <Link
                        to="/start"
                        className="mt-6 inline-block rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
                    >
                        Start Apartment Search
                    </Link>

                    <div className="mt-8 max-w-6xl rounded-3xl bg-white p-2 shadow-sm">
                        <div className="grid gap-3 md:grid-cols-[1fr_160px_150px_170px_auto]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search property, special, floor plan, or manager..."
                                    className="w-full rounded-2xl border-0 py-4 pl-12 pr-4 text-slate-900 outline-none"
                                />
                            </div>

                            <select
                                aria-label="Area"
                                value={areaFilter}
                                onChange={(event) => setAreaFilter(event.target.value)}
                                className="rounded-2xl border-0 bg-slate-100 px-4 py-4 font-bold text-slate-700 outline-none"
                            >
                                {areas.map((area) => (
                                    <option key={area}>{area}</option>
                                ))}
                            </select>

                            <select
                                aria-label="Bedrooms"
                                value={bedroomFilter}
                                onChange={(event) => setBedroomFilter(event.target.value)}
                                className="rounded-2xl border-0 bg-slate-100 px-4 py-4 font-bold text-slate-700 outline-none"
                            >
                                {bedrooms.map((bedroom) => (
                                    <option key={bedroom}>{bedroom}</option>
                                ))}
                            </select>

                            <select
                                aria-label="Year built"
                                value={yearBuiltFilter}
                                onChange={(event) => setYearBuiltFilter(event.target.value)}
                                className="rounded-2xl border-0 bg-slate-100 px-4 py-4 font-bold text-slate-700 outline-none"
                            >
                                {yearBuiltOptions.map((yearOption) => (
                                    <option key={yearOption}>{yearOption}</option>
                                ))}
                            </select>

                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setAreaFilter("All");
                                    setBedroomFilter("All");
                                    setYearBuiltFilter("Any year");
                                    setMaxStartingRentFilter("Any starting rent");
                                    setMaxEffectiveRentFilter("Any effective rent");
                                    setMoveInDateFilter("");
                                    setSpecialFilter("Any special");
                                    setSortOption("Lowest effective rent");
                                }}
                                className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white hover:bg-slate-800"
                            >
                                Clear
                            </button>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr]">
                            <select
                                aria-label="Maximum starting rent"
                                value={maxStartingRentFilter}
                                onChange={(event) => setMaxStartingRentFilter(event.target.value)}
                                className="rounded-2xl border-0 bg-slate-100 px-4 py-4 font-bold text-slate-700 outline-none"
                            >
                                {rentOptions.map((rentOption) => (
                                    <option key={rentOption}>{rentOption}</option>
                                ))}
                            </select>

                            <select
                                aria-label="Maximum effective rent"
                                value={maxEffectiveRentFilter}
                                onChange={(event) => setMaxEffectiveRentFilter(event.target.value)}
                                className="rounded-2xl border-0 bg-slate-100 px-4 py-4 font-bold text-slate-700 outline-none"
                            >
                                {effectiveRentOptions.map((rentOption) => (
                                    <option key={rentOption}>{rentOption}</option>
                                ))}
                            </select>

                            <input
                                aria-label="Move-in date"
                                type="date"
                                value={moveInDateFilter}
                                onChange={(event) => setMoveInDateFilter(event.target.value)}
                                className="rounded-2xl border-0 bg-slate-100 px-4 py-4 font-bold text-slate-700 outline-none"
                            />

                            <select
                                aria-label="Current special"
                                value={specialFilter}
                                onChange={(event) => setSpecialFilter(event.target.value)}
                                className="rounded-2xl border-0 bg-slate-100 px-4 py-4 font-bold text-slate-700 outline-none"
                            >
                                {specialOptions.map((specialOption) => (
                                    <option key={specialOption}>{specialOption}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-8">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900">
                            Available Deals
                        </h2>

                        <p className="mt-2 text-slate-500">
                            Showing {filteredProperties.length} of {publicProperties.length} properties.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <select
                            aria-label="Sort properties"
                            value={sortOption}
                            onChange={(event) => setSortOption(event.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                        >
                            {sortOptions.map((option) => (
                                <option key={option}>{option}</option>
                            ))}
                        </select>

                        <Link
                            to="/admin/dashboard"
                            className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Admin Portal
                        </Link>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    {sortedProperties.map((property) => (
                        <PropertyCard
                            key={property.id}
                            property={property}
                            matchedFloorPlan={property.matchedFloorPlan}
                        />
                    ))}
                </div>

                {filteredProperties.length === 0 && (
                    <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                        <h3 className="text-2xl font-black text-slate-900">
                            No properties found
                        </h3>

                        <p className="mt-2 text-slate-500">
                            Try searching by area, rent, availability, special, floor plan, or management company.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}

function getSearchFloorPlans(property) {
    if (!property.floorPlans?.length) {
        const freeWeeks = getWeeksFromSpecialLabel(property.special);
        const pricing = calculateFloorPlanPricing({
            startingRent: property.rent || "",
            effectiveRent: property.effectiveRent || "",
            marketRent: property.marketRent || "",
            savings: property.savings || "",
            belowMarketPercent: property.belowMarketPercent || "",
            freeWeeks,
            leaseTermMonths: 12,
        });

        return [
            {
                name: property.name,
                bedrooms: property.bedrooms?.[0] || "",
                startingRent: property.rent || "",
                marketRent: property.marketRent || "",
                ...pricing,
                currentSpecial: property.special || "",
                freeWeeks,
                leaseTermMonths: 12,
                availableUnits: [],
            },
        ];
    }

    return property.floorPlans.map((floorPlan, index) => {
        if (typeof floorPlan === "string") {
            const freeWeeks = getWeeksFromSpecialLabel(property.special);
            const pricing = calculateFloorPlanPricing({
                startingRent: property.rent || "",
                effectiveRent: property.effectiveRent || "",
                marketRent: property.marketRent || "",
                savings: property.savings || "",
                belowMarketPercent: property.belowMarketPercent || "",
                freeWeeks,
                leaseTermMonths: 12,
            });

            return {
                name: floorPlan,
                bedrooms: property.bedrooms?.[index] || property.bedrooms?.[0] || "",
                startingRent: property.rent || "",
                marketRent: property.marketRent || "",
                ...pricing,
                currentSpecial: property.special || "",
                freeWeeks,
                leaseTermMonths: 12,
                availableUnits: [],
            };
        }

        const specialLabel =
            floorPlan.currentSpecial || floorPlan.special?.label || property.special || "";
        const freeWeeks = Number(
            floorPlan.freeWeeks ?? floorPlan.special?.freeWeeks ?? getWeeksFromSpecialLabel(specialLabel)
        );
        const leaseTermMonths = Number(floorPlan.leaseTermMonths || floorPlan.special?.leaseTermMonths || 12);
        const startingRent = floorPlan.startingRent || floorPlan.rent || property.rent || "";
        const marketRent = floorPlan.marketRent || property.marketRent || "";
        const pricing = calculateFloorPlanPricing({
            startingRent,
            effectiveRent: floorPlan.effectiveRent || property.effectiveRent || "",
            marketRent,
            savings: floorPlan.savings || property.savings || "",
            belowMarketPercent: floorPlan.belowMarketPercent || property.belowMarketPercent || "",
            freeWeeks,
            leaseTermMonths,
        });

        return {
            name: floorPlan.name || `Floor Plan ${index + 1}`,
            bedrooms: floorPlan.bedrooms || floorPlan.beds || "",
            startingRent,
            marketRent,
            ...pricing,
            currentSpecial: specialLabel,
            freeWeeks,
            leaseTermMonths,
            availableUnits: floorPlan.availableUnits || [],
        };
    });
}

function calculateFloorPlanPricing(floorPlan) {
    const startingRentNumber = parseCurrency(floorPlan.startingRent);
    const marketRentNumber = parseCurrency(floorPlan.marketRent);
    const freeWeeks = Number(floorPlan.freeWeeks || 0);
    const leaseTermMonths = Number(floorPlan.leaseTermMonths || 12);

    if (!startingRentNumber || !freeWeeks || !leaseTermMonths) {
        return {
            effectiveRent: floorPlan.effectiveRent || floorPlan.startingRent || "",
            savings: floorPlan.savings || "",
            belowMarketPercent: floorPlan.belowMarketPercent || "",
        };
    }

    const freeMonths = freeWeeks / LEASING_WEEKS_PER_MONTH;
    const monthlyConcession = (startingRentNumber * freeMonths) / leaseTermMonths;
    const effectiveRentNumber = Math.max(startingRentNumber - monthlyConcession, 0);
    const savingsNumber = Math.max(startingRentNumber - effectiveRentNumber, 0);
    const comparisonRent = marketRentNumber || startingRentNumber;
    const belowMarketSavingsNumber = Math.max(comparisonRent - effectiveRentNumber, 0);
    const belowMarketPercentNumber = comparisonRent
        ? Math.round((belowMarketSavingsNumber / comparisonRent) * 100)
        : 0;

    return {
        effectiveRent: formatCurrency(effectiveRentNumber),
        savings: savingsNumber ? `${formatCurrency(savingsNumber)}/mo` : "$0/mo",
        belowMarketPercent: `${belowMarketPercentNumber}%`,
    };
}

function getMatchingFloorPlans(floorPlans, filters, searchTerm) {
    const matchingFloorPlans = floorPlans.filter((floorPlan) =>
        floorPlanMatchesFilters(floorPlan, filters)
    );
    const trimmedSearchTerm = searchTerm.trim().toLowerCase();

    if (!trimmedSearchTerm) return matchingFloorPlans;

    const searchMatchedFloorPlans = matchingFloorPlans.filter((floorPlan) =>
        getFloorPlanSearchText(floorPlan).includes(trimmedSearchTerm)
    );

    return searchMatchedFloorPlans.length > 0
        ? searchMatchedFloorPlans
        : matchingFloorPlans;
}

function floorPlanMatchesFilters(floorPlan, filters) {
    const startingRent = parseCurrency(floorPlan.startingRent);
    const effectiveRent = parseCurrency(floorPlan.effectiveRent);
    const maxStartingRent = parseCurrency(filters.maxStartingRentFilter);
    const maxEffectiveRent = parseCurrency(filters.maxEffectiveRentFilter);
    const freeWeeks = Number(floorPlan.freeWeeks || 0);
    const hasSpecial = freeWeeks > 0 || Boolean(floorPlan.currentSpecial);
    const specialWeeksThreshold = getWeeksFromSpecialLabel(filters.specialFilter);

    const matchesBedroom =
        filters.bedroomFilter === "All" || floorPlan.bedrooms === filters.bedroomFilter;
    const matchesStartingRent =
        filters.maxStartingRentFilter === "Any starting rent" ||
        (startingRent > 0 && startingRent <= maxStartingRent);
    const matchesEffectiveRent =
        filters.maxEffectiveRentFilter === "Any effective rent" ||
        (effectiveRent > 0 && effectiveRent <= maxEffectiveRent);
    const matchesMoveInDate = matchesRequestedMoveInDate(
        floorPlan.availableUnits,
        filters.moveInDateFilter
    );
    const matchesSpecial =
        filters.specialFilter === "Any special" ||
        (filters.specialFilter === "Has special" && hasSpecial) ||
        (specialWeeksThreshold > 0 && freeWeeks >= specialWeeksThreshold);

    return (
        matchesBedroom &&
        matchesStartingRent &&
        matchesEffectiveRent &&
        matchesMoveInDate &&
        matchesSpecial
    );
}

function getBestFloorPlanDeal(floorPlans) {
    return [...floorPlans].sort((firstFloorPlan, secondFloorPlan) => {
        const firstRent = parseCurrency(firstFloorPlan.effectiveRent || firstFloorPlan.startingRent);
        const secondRent = parseCurrency(secondFloorPlan.effectiveRent || secondFloorPlan.startingRent);

        return normalizeRentSortValue(firstRent) - normalizeRentSortValue(secondRent);
    })[0];
}

function sortPropertiesByDeal(properties, sortOption) {
    return [...properties].sort((firstProperty, secondProperty) => {
        const firstDeal = firstProperty.matchedFloorPlan || {};
        const secondDeal = secondProperty.matchedFloorPlan || {};

        if (sortOption === "Highest savings") {
            return parseCurrency(secondDeal.savings) - parseCurrency(firstDeal.savings);
        }

        if (sortOption === "Newest property") {
            return normalizeYearBuilt(secondProperty.yearBuilt) - normalizeYearBuilt(firstProperty.yearBuilt);
        }

        if (sortOption === "Most weeks free") {
            return Number(secondDeal.freeWeeks || 0) - Number(firstDeal.freeWeeks || 0);
        }

        const firstRent = parseCurrency(firstDeal.effectiveRent || firstDeal.startingRent);
        const secondRent = parseCurrency(secondDeal.effectiveRent || secondDeal.startingRent);

        return normalizeRentSortValue(firstRent) - normalizeRentSortValue(secondRent);
    });
}

function getFloorPlanSearchText(floorPlan) {
    return [
        floorPlan.name,
        floorPlan.bedrooms,
        floorPlan.startingRent,
        floorPlan.effectiveRent,
        floorPlan.marketRent,
        floorPlan.savings,
        floorPlan.belowMarketPercent,
        floorPlan.currentSpecial,
        floorPlan.availableUnits.map((unit) => unit.availableDate).join(" "),
    ].filter(Boolean).join(" ").toLowerCase();
}

function matchesRequestedMoveInDate(availableUnits, moveInDateFilter) {
    if (!moveInDateFilter) return true;
    if (!availableUnits?.length) return false;

    return availableUnits.some((unit) => {
        if (unit.status === "leased") return false;
        if (!unit.availableDate) return true;

        return unit.availableDate <= moveInDateFilter;
    });
}

function parseCurrency(value) {
    const parsedValue = Number(String(value || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatCurrency(value) {
    return `$${Math.round(value).toLocaleString()}`;
}

function normalizeSortIndex(index) {
    return index === -1 ? 999 : index;
}

function normalizeRentSortValue(value) {
    return value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function normalizeYearBuilt(value) {
    const year = Number(value);
    return Number.isFinite(year) ? year : 0;
}

function getWeeksFromSpecialLabel(label) {
    const match = String(label || "").match(/(\d+(?:\.\d+)?)\s*\+?\s*weeks?/i);
    return match ? Number(match[1]) : 0;
}

function PropertyCard({ property, matchedFloorPlan }) {
    const primaryImage = property.photos?.[0]?.url || property.image;
    const cardDeal = matchedFloorPlan || {
        name: property.name,
        bedrooms: property.bedrooms?.[0],
        startingRent: property.rent,
        effectiveRent: property.effectiveRent,
        savings: property.savings,
        currentSpecial: property.special,
    };
    const specialLabel = cardDeal.currentSpecial || property.special || "Contact for current specials";
    const startingRent = cardDeal.startingRent || property.rent || "Contact for pricing";
    const effectiveRent = cardDeal.effectiveRent || property.effectiveRent || property.rent || "Contact for pricing";
    const savings = cardDeal.savings || property.savings || "$0/mo";
    const hasMatchedDeal = Boolean(cardDeal.currentSpecial || cardDeal.savings || property.special);

    return (
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <img
                src={primaryImage}
                alt={property.name}
                className="h-52 w-full object-cover"
            />

            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">
                            {property.name}
                        </h3>

                        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                            <MapPin className="h-4 w-4" />
                            {property.area}
                            {property.yearBuilt ? ` • Built ${property.yearBuilt}` : ""}
                        </p>
                    </div>

                    {hasMatchedDeal && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            Matched Deal
                        </span>
                    )}
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-500">Matched Floor Plan</p>
                    <p className="mt-1 font-black text-slate-900">
                        {cardDeal.name}
                        {cardDeal.bedrooms ? ` • ${cardDeal.bedrooms}` : ""}
                    </p>

                    <p className="mt-2 text-sm font-semibold text-slate-500">
                        {specialLabel}
                    </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <DealStat label="Starting Rent" value={startingRent} />
                    <DealStat label="Effective Rent" value={effectiveRent} />
                    <DealStat label="Savings" value={savings} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Link
                        to={`/properties/${property.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        <Building2 className="h-4 w-4" />
                        View
                    </Link>

                    <Link
                        to={`/start?property=${property.id}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                        Start Search
                    </Link>
                </div>
            </div>
        </article>
    );
}

function DealStat({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="mt-2 font-black text-slate-900">{value}</p>
        </div>
    );
}
