import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin, Search } from "lucide-react";

import { getAllProperties } from "../data/propertyStorage";

const LEASING_WEEKS_PER_MONTH = 4;

export default function HomePage() {
    const [searchTerm, setSearchTerm] = useState("");

    const properties = getAllProperties();

    const publicProperties = properties.filter(
        (property) => property.status === "Live"
    );

    const floorPlanFilters = {
        bedroomFilter: "All",
        maxStartingRentFilter: "Any starting rent",
        maxEffectiveRentFilter: "Any effective rent",
        moveInDateFilter: "",
        specialFilter: "Any special",
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
        const matchingFloorPlans = getMatchingFloorPlans(
            propertyFloorPlans,
            floorPlanFilters,
            searchTerm
        );
        const matchesFloorPlanFilters = matchingFloorPlans.length > 0;

        if (!matchesSearch || !matchesFloorPlanFilters) {
            return null;
        }

        return {
            ...property,
            matchedFloorPlan: getBestFloorPlanDeal(matchingFloorPlans),
        };
    }).filter(Boolean);
    const sortedProperties = sortPropertiesByDeal(filteredProperties, "Lowest effective rent");
    const suggestedDallasDeals = getSuggestedDallasDeals(publicProperties);

    return (
        <main className="min-h-screen bg-[#f5f8f1] text-[#102426]">
            <header className="sticky top-0 z-40 border-b border-[#d7e6df] bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center justify-between gap-4">
                        <Link to="/" className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173f3f] text-sm font-black text-[#f2b84b]">
                                BMA
                            </span>
                            <span>
                                <span className="block text-lg font-black leading-5 text-[#102426]">
                                    Below Market Apartments
                                </span>
                                <span className="text-xs font-bold text-[#526260]">
                                    Verified specials, ranked by deal value
                                </span>
                            </span>
                        </Link>

                        <Link
                            to="/start"
                            className="rounded-2xl bg-[#f2b84b] px-4 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783] lg:hidden"
                        >
                            Start
                        </Link>
                    </div>

                    <nav className="hidden items-center gap-3 lg:flex">
                        <Link
                            to="/start"
                            className="rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
                        >
                            Start Apartment Search
                        </Link>

                        <Link
                            to="/admin/dashboard"
                            className="rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                        >
                            Admin Portal
                        </Link>
                    </nav>
                </div>
            </header>

            <section className="bma-brand-panel border-b-[6px] border-[#f2b84b] px-4 py-12 text-white">
                <div className="mx-auto max-w-5xl text-center">
                    <p className="mx-auto w-fit rounded-full bg-[#f2b84b]/15 px-4 py-2 text-sm font-black text-[#f9d783]">
                        Below Market Apartments
                    </p>

                    <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black text-[#fff7df] md:text-6xl">
                        Find below-market apartment deals.
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-[#d7ece6]">
                        Search by city, ZIP, property name, manager, or special.
                    </p>

                    <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/20 bg-white p-2 shadow-2xl shadow-[#102426]/25">
                        <div className="bma-value-stripe mb-2 h-2 rounded-full" />
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[#2d7dd2]" />

                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Enter city, ZIP, property, or special"
                                    className="bma-focus-ring h-16 w-full rounded-2xl border border-[#b8d9d0] bg-white pl-14 pr-4 text-left text-lg font-bold text-[#102426]"
                                />
                            </div>

                            <button
                                type="button"
                                className="h-16 rounded-2xl bg-[#f2b84b] px-8 text-base font-black text-[#102426] hover:bg-[#f9d783]"
                            >
                                Search
                            </button>
                        </div>

                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="mt-2 rounded-2xl px-4 py-2 text-sm font-black text-[#e4572e] hover:bg-[#fff0ea]"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-[1500px] px-4 py-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm font-black text-[#1f6f63]">
                            Suggested rentals
                        </p>
                        <h2 className="mt-1 text-3xl font-black text-[#102426]">
                            Best Deals in Dallas
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#526260]">
                            Ranked by monthly savings from current specials.
                        </p>
                    </div>

                    <Link
                        to="/start"
                        className="w-fit rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                    >
                        Get matched
                    </Link>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {suggestedDallasDeals.map((property) => (
                        <SuggestedRentalCard
                            key={property.id}
                            property={property}
                            matchedFloorPlan={property.matchedFloorPlan}
                        />
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-[1500px] px-4 py-5">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
                    <section className="min-w-0">
                        <div className="flex flex-col justify-between gap-3 rounded-3xl border border-[#d7e6df] bg-white p-5 shadow-sm md:flex-row md:items-end">
                            <div>
                                <p className="text-sm font-black text-[#1f6f63]">
                                    Below-market search
                                </p>
                                <h1 className="mt-1 text-3xl font-black text-[#102426]">
                                    {filteredProperties.length} verified deal
                                    {filteredProperties.length === 1 ? "" : "s"}
                                </h1>
                                <p className="mt-1 text-sm font-semibold text-[#526260]">
                                    Showing {filteredProperties.length} of {publicProperties.length} properties.
                                </p>
                            </div>

                            <Link
                                to="/start"
                                className="rounded-2xl bg-[#f2b84b] px-5 py-3 text-center text-sm font-black text-[#102426] hover:bg-[#f9d783]"
                            >
                                Start Apartment Search
                            </Link>
                        </div>

                        <div className="mt-5 grid gap-5 lg:grid-cols-2">
                            {sortedProperties.map((property) => (
                                <PropertyCard
                                    key={property.id}
                                    property={property}
                                    matchedFloorPlan={property.matchedFloorPlan}
                                />
                            ))}
                        </div>

                        {filteredProperties.length === 0 && (
                            <div className="mt-5 rounded-3xl border border-dashed border-[#b8d9d0] bg-white p-10 text-center shadow-sm">
                                <h3 className="text-2xl font-black text-[#102426]">
                                    No properties found
                                </h3>

                                <p className="mt-2 text-[#526260]">
                                    Try searching by city, ZIP, property name, special, or management company.
                                </p>
                            </div>
                        )}
                    </section>

                    <DealMapPanel properties={sortedProperties} />
                </div>
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

function getSuggestedDallasDeals(properties) {
    const dallasDeals = properties.map((property) => {
        const propertyFloorPlans = getSearchFloorPlans(property);
        const matchedFloorPlan = getBestFloorPlanDeal(propertyFloorPlans);

        return {
            ...property,
            matchedFloorPlan,
        };
    }).filter(isDallasProperty);

    return sortPropertiesByDeal(dallasDeals, "Highest savings").slice(0, 4);
}

function isDallasProperty(property) {
    const searchableLocation = [
        property.name,
        property.area,
        property.address,
        property.city,
        property.state,
        property.zipcode,
    ].filter(Boolean).join(" ").toLowerCase();

    return searchableLocation.includes("dallas") || searchableLocation.includes("752");
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

function DealMapPanel({ properties }) {
    const featuredProperties = properties.slice(0, 4);
    const topProperty = featuredProperties[0];

    return (
        <aside className="hidden xl:block">
            <div className="sticky top-[172px] overflow-hidden rounded-3xl border border-[#b8d9d0] bg-white shadow-sm">
                <div className="relative h-[640px] bg-[#dceee8]">
                    <div className="absolute inset-0 opacity-70">
                        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#b8d9d0]" />
                        <div className="absolute left-0 top-1/3 h-px w-full bg-[#b8d9d0]" />
                        <div className="absolute left-0 top-2/3 h-px w-full bg-[#b8d9d0]" />
                        <div className="absolute left-1/4 top-0 h-full w-px -translate-x-1/2 bg-white/70" />
                        <div className="absolute left-3/4 top-0 h-full w-px -translate-x-1/2 bg-white/70" />
                    </div>

                    <div className="absolute left-6 top-6 rounded-3xl bg-white/95 p-5 shadow-lg">
                        <p className="text-xs font-black uppercase text-[#1f6f63]">
                            Deal Map
                        </p>
                        <p className="mt-1 text-3xl font-black text-[#102426]">
                            {properties.length}
                        </p>
                        <p className="text-sm font-semibold text-[#526260]">
                            matching properties
                        </p>
                    </div>

                    {featuredProperties.map((property, index) => (
                        <MapMarker
                            key={property.id}
                            property={property}
                            index={index}
                        />
                    ))}

                    {topProperty && (
                        <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-[#d7e6df] bg-white p-4 shadow-xl">
                            <p className="text-xs font-black uppercase text-[#2d7dd2]">
                                Top match
                            </p>
                            <div className="mt-2 flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-lg font-black text-[#102426]">
                                        {topProperty.name}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-[#526260]">
                                        {topProperty.area}
                                    </p>
                                </div>
                                <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-sm font-black text-[#17623b]">
                                    {topProperty.matchedFloorPlan?.savings || "$0/mo"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

function MapMarker({ property, index }) {
    const positions = [
        "left-[54%] top-[28%]",
        "left-[35%] top-[46%]",
        "left-[68%] top-[54%]",
        "left-[45%] top-[68%]",
    ];

    return (
        <Link
            to={`/properties/${property.id}`}
            className={`absolute ${positions[index] || positions[0]} -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#173f3f] px-4 py-2 text-sm font-black text-white shadow-xl ring-4 ring-[#f2b84b]/35 hover:bg-[#102426]`}
        >
            {property.matchedFloorPlan?.effectiveRent || property.effectiveRent || property.rent}
        </Link>
    );
}

function getRentalPriceLabel(property, matchedFloorPlan) {
    const rentValues = [
        matchedFloorPlan?.effectiveRent,
        matchedFloorPlan?.startingRent,
        property.effectiveRent,
        property.rent,
    ].filter(Boolean);

    const numericRentValues = rentValues.map(parseCurrency).filter(Boolean);

    if (numericRentValues.length === 0) {
        return "Contact for pricing";
    }

    const lowestRent = Math.min(...numericRentValues);
    const highestRent = Math.max(...numericRentValues);

    if (lowestRent === highestRent) {
        return `${formatCurrency(lowestRent)}+`;
    }

    return `${formatCurrency(lowestRent)} - ${formatCurrency(highestRent)}`;
}

function getBedsLabel(property, matchedFloorPlan) {
    const beds = [
        matchedFloorPlan?.bedrooms,
        ...(property.bedrooms || []),
    ].filter(Boolean);

    const uniqueBeds = [...new Set(beds)].sort(
        (firstBed, secondBed) => getBedroomCount(firstBed) - getBedroomCount(secondBed)
    );

    if (uniqueBeds.length === 0) {
        return "Bedrooms not listed";
    }

    if (uniqueBeds.length === 1) {
        return uniqueBeds[0];
    }

    const firstBed = uniqueBeds[0];
    const lastBed = uniqueBeds[uniqueBeds.length - 1];
    const firstCount = getBedroomCount(firstBed);
    const lastCount = getBedroomCount(lastBed);

    if (firstCount === 0 && lastCount === 1) {
        return "Studio - 1 Bed";
    }

    if (firstCount === 0 && lastCount > 1) {
        return `Studio - ${lastCount} Beds`;
    }

    if (firstCount > 0 && lastCount > firstCount) {
        return `${firstCount}-${lastCount} Beds`;
    }

    return `${firstBed} - ${lastBed}`;
}

function getBedroomCount(value) {
    if (String(value).toLowerCase().includes("studio")) {
        return 0;
    }

    const match = String(value).match(/\d+/);
    return match ? Number(match[0]) : 99;
}

function getAddressLabel(property) {
    const cityLine = [
        property.city,
        property.state,
        property.zipcode,
    ].filter(Boolean).join(", ");
    const addressParts = [
        property.address,
        cityLine,
    ].filter(Boolean);

    if (addressParts.length > 0) {
        return addressParts.join(" ");
    }

    return property.area || "Dallas, TX";
}

function SuggestedRentalCard({ property, matchedFloorPlan }) {
    const primaryImage = property.photos?.[0]?.url || property.image;
    const priceLabel = getRentalPriceLabel(property, matchedFloorPlan);
    const bedsLabel = getBedsLabel(property, matchedFloorPlan);
    const addressLabel = getAddressLabel(property);

    return (
        <Link
            to={`/properties/${property.id}`}
            className="group overflow-hidden rounded-3xl border border-[#d7e6df] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#f2b84b] hover:shadow-md"
        >
            <div className="relative">
                <img
                    src={primaryImage}
                    alt={property.name}
                    className="h-44 w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#17623b] shadow-sm">
                    {matchedFloorPlan?.savings || property.savings || "$0/mo"} savings
                </span>
            </div>

            <div className="p-4">
                <p className="line-clamp-1 text-lg font-black text-[#102426] group-hover:text-[#1f6f63]">
                    {property.name}
                </p>
                <p className="mt-2 min-h-[40px] text-sm font-semibold leading-5 text-[#526260]">
                    {addressLabel}
                </p>

                <p className="mt-4 text-xl font-black text-[#102426]">
                    {priceLabel}
                </p>
                <p className="mt-1 text-sm font-bold text-[#526260]">
                    Total Monthly Price
                </p>

                <p className="mt-3 rounded-2xl bg-[#eaf2fb] px-3 py-2 text-sm font-black text-[#174a7c]">
                    {bedsLabel}
                </p>
            </div>
        </Link>
    );
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
        <article className="overflow-hidden rounded-3xl border border-[#d7e6df] bg-white shadow-sm transition hover:-translate-y-1 hover:border-[#f2b84b] hover:shadow-md">
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

                        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#526260]">
                            <MapPin className="h-4 w-4 text-[#2d7dd2]" />
                            {property.area}
                            {property.yearBuilt ? ` • Built ${property.yearBuilt}` : ""}
                        </p>
                    </div>

                    {hasMatchedDeal && (
                        <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-xs font-black text-[#17623b] ring-1 ring-[#bfe7cf]">
                            Matched Deal
                        </span>
                    )}
                </div>

                <div className="mt-5 rounded-2xl border-l-4 border-[#f2b84b] bg-[#fff8e6] p-4">
                    <p className="text-sm font-black text-[#8a5b0a]">Matched Floor Plan</p>
                    <p className="mt-1 font-black text-[#102426]">
                        {cardDeal.name}
                        {cardDeal.bedrooms ? ` • ${cardDeal.bedrooms}` : ""}
                    </p>

                    <p className="mt-2 text-sm font-bold text-[#7a432e]">
                        {specialLabel}
                    </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <DealStat label="Starting Rent" value={startingRent} tone="gold" />
                    <DealStat label="Effective Rent" value={effectiveRent} tone="blue" />
                    <DealStat label="Savings" value={savings} tone="green" />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Link
                        to={`/properties/${property.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                    >
                        <Building2 className="h-4 w-4" />
                        View
                    </Link>

                    <Link
                        to={`/start?property=${property.id}`}
                        className="inline-flex items-center justify-center rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
                    >
                        Start Search
                    </Link>
                </div>
            </div>
        </article>
    );
}

function DealStat({ label, value, tone }) {
    const toneClasses = {
        gold: "border-[#f2d08a] bg-[#fff8e6] text-[#8a5b0a]",
        blue: "border-[#b9d8f3] bg-[#eaf2fb] text-[#174a7c]",
        green: "border-[#bfe7cf] bg-[#eaf7ef] text-[#17623b]",
    };
    const selectedTone = toneClasses[tone] || toneClasses.gold;

    return (
        <div className={`rounded-2xl border p-4 ${selectedTone}`}>
            <p className="text-xs font-black uppercase">{label}</p>
            <p className="mt-2 font-black text-[#102426]">{value}</p>
        </div>
    );
}
