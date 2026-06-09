import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

import { getAllProperties } from "../data/propertyStorage";

const LEASING_WEEKS_PER_MONTH = 4;
const FEATURED_DALLAS_DEAL_LIMIT = 4;
const FALLBACK_DALLAS_DEALS = [
    {
        id: "junction-at-7760",
        name: "Junction at 7760",
        address: "7760 McCallum Blvd",
        city: "Dallas",
        state: "TX",
        zipcode: "75252",
        rent: "$883 - $1,116",
        bedrooms: ["Studio", "1 Bed"],
        savings: "$0/mo",
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
        image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    },
];

export default function HomePage() {
    const [searchTerm, setSearchTerm] = useState("");

    const properties = getAllProperties();

    const publicProperties = properties.filter(
        (property) => property.status === "Live"
    );
    const featuredDallasDeals = getFeaturedDallasDeals(publicProperties);

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

                <div className="mt-5 grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-2 xl:grid-flow-row xl:grid-cols-4 xl:overflow-visible xl:pb-0">
                    {featuredDallasDeals.map((property) => (
                        <SuggestedRentalCard
                            key={property.id}
                            property={property}
                            matchedFloorPlan={property.matchedFloorPlan}
                        />
                    ))}
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

function getBestFloorPlanDeal(floorPlans) {
    return [...floorPlans].sort((firstFloorPlan, secondFloorPlan) => {
        const firstRent = parseCurrency(firstFloorPlan.effectiveRent || firstFloorPlan.startingRent);
        const secondRent = parseCurrency(secondFloorPlan.effectiveRent || secondFloorPlan.startingRent);

        return normalizeRentSortValue(firstRent) - normalizeRentSortValue(secondRent);
    })[0];
}

function getFeaturedDallasDeals(properties) {
    const liveDallasDeals = properties.map((property) => {
        const propertyFloorPlans = getSearchFloorPlans(property);
        const matchedFloorPlan = getBestFloorPlanDeal(propertyFloorPlans);

        return {
            ...property,
            matchedFloorPlan,
        };
    }).filter(isDallasProperty);
    const fallbackDeals = FALLBACK_DALLAS_DEALS.map((property) => ({
        ...property,
        isFallback: true,
        matchedFloorPlan: {
            name: property.name,
            bedrooms: property.bedrooms?.[0] || "",
            startingRent: property.rent,
            effectiveRent: property.rent,
            savings: property.savings,
        },
    }));
    if (liveDallasDeals.length >= FEATURED_DALLAS_DEAL_LIMIT) {
        return sortPropertiesByDeal(liveDallasDeals, "Highest savings").slice(
            0,
            FEATURED_DALLAS_DEAL_LIMIT
        );
    }

    return fallbackDeals.slice(0, FEATURED_DALLAS_DEAL_LIMIT);
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

function getRentalPriceLabel(property, matchedFloorPlan) {
    if (property.isFallback && property.rent) {
        return property.rent;
    }

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
    const savingsValue = matchedFloorPlan?.savings || property.savings || "";
    const hasSavings = parseCurrency(savingsValue) > 0;
    const cardHref = property.isFallback ? "/start" : `/properties/${property.id}`;

    return (
        <Link
            to={cardHref}
            className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#d7e6df] transition hover:-translate-y-1 hover:ring-[#f2b84b] hover:shadow-md"
        >
            <div className="relative">
                <img
                    src={primaryImage}
                    alt={property.name}
                    className="aspect-[4/3] w-full object-cover"
                />
                {hasSavings && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#17623b] shadow-sm">
                        {savingsValue} savings
                    </span>
                )}
            </div>

            <div className="p-3">
                <p className="truncate text-base font-black text-[#102426] group-hover:text-[#1f6f63]">
                    {property.name}
                </p>
                <p className="mt-1 line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-[#526260]">
                    {addressLabel}
                </p>

                <p className="mt-3 text-lg font-black text-[#102426]">
                    {priceLabel}
                </p>
                <p className="mt-0.5 text-xs font-bold text-[#526260]">
                    Total Monthly Price
                </p>

                <p className="mt-3 text-sm font-black text-[#174a7c]">
                    {bedsLabel}
                </p>
            </div>
        </Link>
    );
}
