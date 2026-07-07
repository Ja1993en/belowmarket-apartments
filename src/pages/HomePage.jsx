import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { getPublicPropertySummaries } from "../data/propertyStorage";
import {
    getPropertyPrimaryImage,
    getPropertySearchSuggestions,
    getPublicSearchProperties,
} from "../data/propertySearchData";

const LEASING_WEEKS_PER_MONTH = 4;
const FEATURED_DALLAS_DEAL_LIMIT = 4;
const HOME_RENTER_FAQS = [
    {
        question: "What does net effective rent mean?",
        answer:
            "Net effective rent estimates the value of a special across the lease term. Your actual monthly payment may still be based on normal rent plus required monthly fees.",
    },
    {
        question: "Why does Below Market Apartments show normal rent too?",
        answer:
            "Normal rent helps renters understand the likely payment basis before concessions. Showing both normal rent and effective value keeps the deal transparent.",
    },
    {
        question: "Do apartment specials apply to every floor plan?",
        answer:
            "Not always. Some properties run a special on every available unit, while others only apply it to certain floor plans, lease terms, or move-in dates.",
    },
    {
        question: "What should renters confirm before touring?",
        answer:
            "Confirm the special is still active, how the credit is applied, required monthly add-ons, parking, utilities, deposits, admin fees, and the exact unit availability.",
    },
];
const HOME_SEO_LINKS = [
    { label: "Dallas apartments", to: "/apartments/dallas-tx" },
    { label: "Specials", to: "/apartments/dallas-tx/specials" },
    { label: "8 weeks free", to: "/apartments/dallas-tx/8-weeks-free" },
    { label: "Uptown", to: "/apartments/dallas-tx/uptown" },
    { label: "Oak Lawn", to: "/apartments/dallas-tx/oak-lawn" },
    { label: "Bishop Arts", to: "/apartments/dallas-tx/bishop-arts" },
    { label: "Victory Park", to: "/apartments/dallas-tx/victory-park" },
    { label: "Downtown", to: "/apartments/dallas-tx/downtown" },
];
const HOME_MISSION_POINTS = [
    {
        title: "Renters",
        text: "Compare specials, normal rent, effective value, and local context before requesting help.",
    },
    {
        title: "Locators",
        text: "Use cleaner property data to send better recommendations faster.",
    },
    {
        title: "Managers",
        text: "Put active floor plans and specials in front of renters already looking for value.",
    },
];

export default function HomePage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [properties, setProperties] = useState([]);
    const [propertyLoadError, setPropertyLoadError] = useState("");
    const [isMissionSideBySide, setIsMissionSideBySide] = useState(() =>
        typeof window === "undefined" ? false : window.innerWidth >= 768
    );
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;

        getPublicPropertySummaries()
            .then((savedProperties) => {
                if (!isMounted) return;

                setProperties(savedProperties);
                setPropertyLoadError("");
            })
            .catch((error) => {
                console.error(error);
                if (isMounted) {
                    setProperties([]);
                    setPropertyLoadError("Could not load live property summaries from Supabase.");
                }
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const updateMissionLayout = () => {
            setIsMissionSideBySide(window.innerWidth >= 768);
        };

        updateMissionLayout();
        window.addEventListener("resize", updateMissionLayout);
        window.addEventListener("orientationchange", updateMissionLayout);

        return () => {
            window.removeEventListener("resize", updateMissionLayout);
            window.removeEventListener("orientationchange", updateMissionLayout);
        };
    }, []);

    const searchableProperties = getPublicSearchProperties(properties);

    const publicProperties = properties.filter(
        (property) => property.status === "Live"
    );
    const featuredDallasDeals = getFeaturedDallasDeals(publicProperties);
    const searchSuggestions = useMemo(
        () => getPropertySearchSuggestions(searchableProperties, searchTerm),
        [searchableProperties, searchTerm]
    );
    const homepageFaqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: HOME_RENTER_FAQS.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    };

    const submitSearch = (event) => {
        event.preventDefault();

        const query = searchTerm.trim();
        navigate(query ? `/properties?search=${encodeURIComponent(query)}` : "/properties");
    };

    return (
        <main className="min-h-screen bg-[#f5f8f1] text-[#102426]">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqSchema) }}
            />
            <header className="bma-topbar sticky top-0 z-40 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="bma-shell">
                    <div className="mb-1.5 flex items-center justify-between gap-3 xl:hidden">
                        <Link to="/" className="flex min-w-0 items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#173f3f] text-[10px] font-black text-[#f2b84b]">
                                BMA
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-black text-[#102426]">
                                    Below Market Apartments
                                </span>
                                <span className="hidden text-xs font-bold text-[#526260] sm:block">
                                    Verified specials, ranked by deal value
                                </span>
                            </span>
                        </Link>

                        <Link
                            to="/start"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#f2b84b] px-3 py-2 text-xs font-black text-[#102426] hover:bg-[#f9d783]"
                        >
                            <Search className="h-3.5 w-3.5" aria-hidden="true" />
                            Ask a Locator
                        </Link>
                    </div>

                    <div className="hidden items-center justify-between gap-4 xl:flex">
                        <Link to="/" className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#173f3f] text-sm font-black text-[#f2b84b]">
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


                        <nav className="flex items-center gap-3">
                            <Link
                                to="/start"
                                className="bma-btn-gold"
                            >
                                Find Apartment Locator
                            </Link>

                            <Link
                                to="/admin/dashboard"
                                className="bma-btn-primary"
                            >
                                Admin Portal
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            <section className="bma-brand-panel border-b-[6px] border-[#f2b84b] px-3 py-8 text-white sm:px-4 sm:py-10 md:py-12">
                <div className="mx-auto max-w-5xl text-center">
                    <p className="mx-auto w-fit rounded-full bg-[#f2b84b]/15 px-3 py-1.5 text-xs font-black text-[#f9d783] sm:px-4 sm:py-2 sm:text-sm">
                        Below Market Apartments
                    </p>

                    <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-black leading-tight text-[#fff7df] sm:text-4xl md:mt-5 md:text-6xl">
                        Find below-market apartment deals.
                    </h1>

                    <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#d7ece6] sm:mt-4 sm:text-base">
                        Search by city, neighborhood, ZIP, property name, or special.
                    </p>

                    <form onSubmit={submitSearch} className="bma-panel relative mx-auto mt-6 max-w-3xl p-2 sm:mt-8">
                        <div className="bma-value-stripe mb-2 h-1.5 rounded-full sm:h-2" />
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2d7dd2] sm:left-5 sm:h-6 sm:w-6" />

                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="City, ZIP, property, or special"
                                    autoComplete="off"
                                    className="bma-focus-ring h-14 w-full rounded-lg border border-[#b8d9d0] bg-white pl-12 pr-4 text-left text-base font-bold text-[#102426] sm:h-16 sm:pl-14 sm:text-lg"
                                    style={{ color: "#000000", caretColor: "#000000" }}
                                />
                            </div>

                            <button
                                type="submit"
                                className="bma-btn-gold h-12 justify-center px-8 text-base sm:h-16"
                            >
                                Search
                            </button>
                        </div>

                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm("")}
                                className="mt-2 rounded-lg px-4 py-2 text-sm font-black text-[#e4572e] hover:bg-[#fff0ea]"
                            >
                                Clear search
                            </button>
                        )}

                        {searchSuggestions.length > 0 && (
                            <div className="absolute left-2 right-2 top-[calc(100%+8px)] z-30 overflow-hidden rounded-lg border border-[#d7e6df] bg-white text-left shadow-2xl">
                                {searchSuggestions.map((suggestion) => (
                                    <button
                                        key={`${suggestion.type}-${suggestion.value}`}
                                        type="button"
                                        onClick={() => setSearchTerm(suggestion.value)}
                                        className="flex w-full items-center justify-between gap-3 border-b border-[#edf4ef] px-4 py-3 text-left last:border-b-0 hover:bg-[#f5f8f1]"
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-black text-[#102426]">
                                                {suggestion.label}
                                            </span>
                                            {suggestion.detail && (
                                                <span className="block truncate text-xs font-bold text-[#526260]">
                                                    {suggestion.detail}
                                                </span>
                                            )}
                                        </span>
                                        <span className="shrink-0 rounded-full bg-[#e7f3ee] px-3 py-1 text-[11px] font-black uppercase text-[#1f6f63]">
                                            {suggestion.type}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </form>
                </div>
            </section>

            <section className="bma-shell px-0 py-5 sm:py-6">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm font-black text-[#1f6f63]">
                            Suggested rentals
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-[#102426] sm:text-3xl">
                            Best Deals in Dallas
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-[#526260]">
                            Ranked by estimated monthly value from current specials.
                        </p>
                    </div>

                    <Link
                        to="/start"
                        className="bma-btn-primary w-full justify-center sm:w-fit"
                    >
                        Get matched
                    </Link>
                </div>

                {propertyLoadError && (
                    <div className="mt-5 rounded-2xl bg-[#fde8df] p-4 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
                        {propertyLoadError}
                    </div>
                )}

                {featuredDallasDeals.length > 0 ? (
                    <div className="mt-5 grid auto-cols-[minmax(86vw,1fr)] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[minmax(270px,1fr)] xl:grid-flow-row xl:grid-cols-4 xl:overflow-visible xl:pb-0">
                        {featuredDallasDeals.map((property) => (
                            <SuggestedRentalCard
                                key={property.id}
                                property={property}
                                matchedFloorPlan={property.matchedFloorPlan}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bma-card mt-5 border-dashed p-8 text-center">
                        <p className="text-xl font-black text-[#102426]">
                            No live Dallas deals yet
                        </p>
                        <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#526260]">
                            Add a property in the admin dashboard and set it to Live to show it here.
                        </p>
                        <Link
                            to="/admin/properties/new"
                            className="bma-btn-primary mt-5"
                        >
                            Add Property
                        </Link>
                    </div>
                )}

                <section className="bma-panel mt-8 overflow-hidden">
                    <div
                        className="grid min-w-0"
                        style={{
                            gridTemplateColumns: isMissionSideBySide
                                ? "minmax(0, 1fr) minmax(0, 1fr)"
                                : "minmax(0, 1fr)",
                        }}
                    >
                        <div className="bma-brand-panel min-w-0 p-4 text-white sm:p-6 md:p-8">
                            <p className="text-sm font-black text-[#f2b84b]">
                                Our mission
                            </p>
                            <h2 className="mt-2 max-w-xl text-2xl font-black leading-tight text-[#fff7df] sm:text-3xl">
                                Make apartment deals easier to trust.
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#d7ece6]">
                                Below Market Apartments brings renters, locators, and property managers into one clearer search experience built around transparent specials, real pricing context, and better recommendations.
                            </p>
                            <div className="mt-5 flex min-w-0 flex-wrap gap-2">
                                {HOME_SEO_LINKS.map((link) => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white ring-1 ring-white/15 hover:bg-white/15"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <div className="grid min-w-0 content-start gap-3 p-4 sm:gap-4 sm:p-6 md:p-8">
                            <div className="grid min-w-0 gap-3 md:grid-cols-3">
                                {HOME_MISSION_POINTS.map((point) => (
                                    <MissionBenefit
                                        key={point.title}
                                        title={point.title}
                                        text={point.text}
                                    />
                                ))}
                            </div>

                            <div className="min-w-0 rounded-lg bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df] sm:p-4">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-sm font-black text-[#1f6f63]">
                                            Renter deal guide
                                        </p>
                                        <h3 className="text-xl font-black text-[#102426]">
                                            Quick answers before touring
                                        </h3>
                                    </div>
                                    <Link
                                        to="/start"
                                        className="bma-btn-gold w-fit"
                                    >
                                        Get matched
                                    </Link>
                                </div>

                                <div className="mt-4 grid min-w-0 gap-2 md:grid-cols-2">
                                    {HOME_RENTER_FAQS.map((faq) => (
                                        <SeoFaqCard
                                            key={faq.question}
                                            question={faq.question}
                                            answer={faq.answer}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </section>

            <footer className="border-t border-[#d7e6df] bg-white px-4 py-6">
                <div className="bma-shell flex flex-col gap-3 text-sm font-bold text-[#526260] md:flex-row md:items-center md:justify-between">
                    <p>Below Market Apartments</p>
                    <div className="flex flex-wrap gap-4">
                        <Link to="/about" className="hover:text-[#173f3f]">
                            About
                        </Link>
                        <Link to="/contact" className="hover:text-[#173f3f]">
                            Contact
                        </Link>
                        <Link to="/methodology" className="hover:text-[#173f3f]">
                            Methodology
                        </Link>
                        <Link to="/privacy-policy" className="hover:text-[#173f3f]">
                            Privacy Policy
                        </Link>
                        <Link to="/terms-and-conditions" className="hover:text-[#173f3f]">
                            Terms and Conditions
                        </Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}

function getSearchFloorPlans(property) {
    if (!property.floorPlans?.length) {
        const freeWeeks = getWeeksFromSpecialLabel(property.special);
        const pricing = calculateFloorPlanPricing({
            startingRent: property.rent || "",
            requiredMonthlyFees: property.requiredMonthlyFees || "",
            totalMonthlyRent: property.totalMonthlyRent || property.rent || "",
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
                requiredMonthlyFees: property.requiredMonthlyFees || "",
                totalMonthlyRent: property.totalMonthlyRent || property.rent || "",
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
                requiredMonthlyFees: property.requiredMonthlyFees || "",
                totalMonthlyRent: property.totalMonthlyRent || property.rent || "",
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
                requiredMonthlyFees: property.requiredMonthlyFees || "",
                totalMonthlyRent: property.totalMonthlyRent || property.rent || "",
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
        const rentCreditSpecial =
            floorPlan.rentCreditSpecial ||
            floorPlan.special?.rentCreditSpecial ||
            getRentCreditSpecialFromLabel(specialLabel);
        const leaseTermMonths = Number(floorPlan.leaseTermMonths || floorPlan.special?.leaseTermMonths || 12);
        const startingRent = floorPlan.startingRent || floorPlan.rent || property.rent || "";
        const requiredMonthlyFees = floorPlan.requiredMonthlyFees || property.requiredMonthlyFees || "";
        const totalMonthlyRent =
            floorPlan.totalMonthlyRent ||
            floorPlan.rent ||
            property.totalMonthlyRent ||
            property.rent ||
            "";
        const marketRent = floorPlan.marketRent || property.marketRent || "";
        const pricing = calculateFloorPlanPricing({
            startingRent,
            requiredMonthlyFees,
            totalMonthlyRent,
            effectiveRent: floorPlan.effectiveRent || property.effectiveRent || "",
            marketRent,
            savings: floorPlan.savings || property.savings || "",
            belowMarketPercent: floorPlan.belowMarketPercent || property.belowMarketPercent || "",
            freeWeeks,
            rentCreditSpecial,
            leaseTermMonths,
        });

        return {
            name: floorPlan.name || `Floor Plan ${index + 1}`,
            bedrooms: floorPlan.bedrooms || floorPlan.beds || "",
            startingRent,
            requiredMonthlyFees,
            totalMonthlyRent: pricing.totalMonthlyRent || totalMonthlyRent,
            marketRent,
            ...pricing,
            currentSpecial: specialLabel,
            freeWeeks,
            rentCreditSpecial,
            leaseTermMonths,
            availableUnits: floorPlan.availableUnits || [],
        };
    });
}

function calculateFloorPlanPricing(floorPlan) {
    const startingRentNumber = parseCurrency(floorPlan.startingRent);
    const requiredMonthlyFeesNumber = parseCurrency(floorPlan.requiredMonthlyFees);
    const enteredTotalMonthlyRentNumber = parseCurrency(floorPlan.totalMonthlyRent);
    const totalMonthlyRentNumber =
        enteredTotalMonthlyRentNumber || startingRentNumber + requiredMonthlyFeesNumber;
    const marketRentNumber = parseCurrency(floorPlan.marketRent);
    const freeWeeks = Number(floorPlan.freeWeeks || 0);
    const rentCreditSpecialNumber = parseCurrency(floorPlan.rentCreditSpecial);
    const leaseTermMonths = Number(floorPlan.leaseTermMonths || 12);

    if (!startingRentNumber || (!freeWeeks && !rentCreditSpecialNumber) || !leaseTermMonths) {
        return {
            totalMonthlyRent: totalMonthlyRentNumber ? formatCurrency(totalMonthlyRentNumber) : "",
            effectiveRent: floorPlan.effectiveRent || (totalMonthlyRentNumber ? formatCurrency(totalMonthlyRentNumber) : floorPlan.startingRent || ""),
            monthlyConcession: "",
            savings: floorPlan.savings || "",
            belowMarketPercent: floorPlan.belowMarketPercent || "",
        };
    }

    const freeMonths = freeWeeks / LEASING_WEEKS_PER_MONTH;
    const monthlyConcession =
        (startingRentNumber * freeMonths + rentCreditSpecialNumber) / leaseTermMonths;
    const effectiveRentNumber = Math.max(totalMonthlyRentNumber - monthlyConcession, 0);
    const savingsNumber = Math.max(totalMonthlyRentNumber - effectiveRentNumber, 0);
    const comparisonRent = marketRentNumber || totalMonthlyRentNumber;
    const belowMarketSavingsNumber = Math.max(comparisonRent - effectiveRentNumber, 0);
    const belowMarketPercentNumber = comparisonRent
        ? Math.round((belowMarketSavingsNumber / comparisonRent) * 100)
        : 0;

    return {
        totalMonthlyRent: formatCurrency(totalMonthlyRentNumber),
        effectiveRent: formatCurrency(effectiveRentNumber),
        monthlyConcession: monthlyConcession ? `${formatCurrency(monthlyConcession)}/mo` : "$0/mo",
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
        const dealSummary = getPropertyDealSummary(property, propertyFloorPlans);

        return {
            ...property,
            matchedFloorPlan,
            dealSummary,
        };
    }).filter(isDallasProperty);

    return sortPropertiesByDeal(liveDallasDeals, "Highest savings").slice(
        0,
        FEATURED_DALLAS_DEAL_LIMIT
    );
}

function getPropertyDealSummary(property, floorPlans = getSearchFloorPlans(property)) {
    const specialDealUnits = getSpecialDealUnits(floorPlans);
    const dealOptionCount = getDealOptionCount(floorPlans);
    const allSpecialLabels = [
        ...new Set(specialDealUnits.map((dealUnit) => dealUnit.specialLabel).filter(Boolean)),
    ];

    if (specialDealUnits.length === 0) {
        const normalRentRangeLabel = getNormalRentRangeLabel(property, floorPlans);

        return {
            hasSpecial: false,
            specialLabel: "",
            normalRentLabel: normalRentRangeLabel,
            effectiveRentLabel: normalRentRangeLabel,
            priceCaption: "Normal monthly rent",
            concessionValueLabel: "",
            badgeLabel: "",
            specialCountLabel: "",
        };
    }

    const effectiveRentValues = specialDealUnits
        .map((dealUnit) => dealUnit.effectiveRentNumber)
        .filter((value) => value > 0);
    const propertyEffectiveRentValues = parseCurrencyValues(property.effectiveRent);
    const displayEffectiveRentValues = propertyEffectiveRentValues.length > 0
        ? propertyEffectiveRentValues
        : effectiveRentValues;

    if (displayEffectiveRentValues.length === 0) {
        return {
            hasSpecial: true,
            specialLabel: allSpecialLabels[0] || "Special available",
            normalRentLabel: "Contact for pricing",
            effectiveRentLabel: "Contact for pricing",
            priceCaption: "Normal monthly rent with fees",
            concessionValueLabel: "",
            badgeLabel: "Special",
            specialCountLabel: getSpecialCountLabel(specialDealUnits.length, dealOptionCount),
        };
    }

    const normalRentValues = specialDealUnits
        .map((dealUnit) => dealUnit.startingRentNumber)
        .filter((value) => value > 0);
    const propertyNormalRentValues = parseCurrencyValues(property.rent || property.marketRent);
    const displayNormalRentValues = propertyNormalRentValues.length > 0
        ? propertyNormalRentValues
        : normalRentValues;
    const baseRentValues = specialDealUnits
        .map((dealUnit) => dealUnit.baseRentNumber)
        .filter((value) => value > 0);
    const requiredMonthlyFeeValues = specialDealUnits
        .map((dealUnit) => dealUnit.requiredMonthlyFeesNumber)
        .filter((value) => value > 0);
    const minEffectiveRent = Math.min(...displayEffectiveRentValues);
    const maxEffectiveRent = Math.max(...displayEffectiveRentValues);
    const concessionValueValues = specialDealUnits
        .map((dealUnit) => dealUnit.monthlyConcessionNumber)
        .filter((value) => value > 0);
    const normalRentLabel = displayNormalRentValues.length > 0
        ? formatRentRange(Math.min(...displayNormalRentValues), Math.max(...displayNormalRentValues))
        : getRentalPriceLabel(property, getBestFloorPlanDeal(floorPlans));
    const maxFreeWeeks = Math.max(
        ...specialDealUnits.map((dealUnit) => Number(dealUnit.freeWeeks || 0))
    );
    const specialCount = specialDealUnits.length;
    const specialLabel = formatSpecialSummary(allSpecialLabels);

    return {
        hasSpecial: true,
        specialLabel,
        normalRentLabel,
        effectiveRentLabel: formatRentRange(minEffectiveRent, maxEffectiveRent),
        priceCaption: "Normal monthly rent with fees",
        concessionValueLabel: concessionValueValues.length > 0
            ? `${formatRentRange(Math.min(...concessionValueValues), Math.max(...concessionValueValues))}/mo`
            : "",
        rentBreakdownLabel: getRentBreakdownLabel(baseRentValues, requiredMonthlyFeeValues),
        specialCalculationLabel: "Special usually applies as an account credit. Payment timing may vary by property.",
        badgeLabel: maxFreeWeeks > 0 ? `${maxFreeWeeks} weeks free` : "Special",
        specialCountLabel: getSpecialCountLabel(specialCount, dealOptionCount),
    };
}

function getDealOptionCount(floorPlans) {
    return floorPlans.reduce((total, floorPlan) => {
        const availableUnitCount =
            floorPlan.availableUnits?.filter((unit) => unit.status !== "leased").length || 0;

        return total + (availableUnitCount || 1);
    }, 0);
}

function getSpecialCountLabel(specialCount, totalCount) {
    if (!totalCount) {
        return `${specialCount} available ${specialCount === 1 ? "option" : "options"} with specials`;
    }

    if (specialCount === totalCount) {
        return `All ${totalCount} available ${totalCount === 1 ? "option has" : "options have"} specials`;
    }

    return `${specialCount} of ${totalCount} available options have specials`;
}

function formatSpecialSummary(specialLabels) {
    if (specialLabels.length === 0) return "Special listed";
    if (specialLabels.length <= 2) return specialLabels.join(", ");

    return `${specialLabels.slice(0, 2).join(", ")} +${specialLabels.length - 2} more`;
}

function getSpecialDealUnits(floorPlans) {
    return floorPlans.flatMap((floorPlan) => {
        const floorPlanSpecial = getFloorPlanSpecial(floorPlan);
        const availableUnits = floorPlan.availableUnits?.filter((unit) => unit.status !== "leased") || [];

        if (availableUnits.length === 0) {
            if (!floorPlanSpecial.hasSpecial) return [];

            return [
                createSpecialDealUnit({
                    floorPlan,
                    unitRent: floorPlan.startingRent,
                    specialLabel: floorPlanSpecial.label,
                    freeWeeks: floorPlanSpecial.freeWeeks,
                    rentCreditSpecial: floorPlanSpecial.rentCreditSpecial,
                }),
            ];
        }

        return availableUnits.flatMap((unit) => {
            const unitSpecial = getUnitSpecial(unit, floorPlanSpecial);

            if (!unitSpecial.hasSpecial) return [];

            return createSpecialDealUnit({
                floorPlan,
                unitRent: unit.rent || floorPlan.startingRent,
                specialLabel: unitSpecial.label,
                freeWeeks: unitSpecial.freeWeeks,
                rentCreditSpecial: unitSpecial.rentCreditSpecial,
            });
        });
    });
}

function createSpecialDealUnit({
    floorPlan,
    unitRent,
    specialLabel,
    freeWeeks,
    rentCreditSpecial,
}) {
    const pricing = calculateFloorPlanPricing({
        startingRent: unitRent,
        requiredMonthlyFees: floorPlan.requiredMonthlyFees,
        effectiveRent: floorPlan.effectiveRent,
        marketRent: floorPlan.marketRent,
        savings: floorPlan.savings,
        belowMarketPercent: floorPlan.belowMarketPercent,
        freeWeeks,
        rentCreditSpecial,
        leaseTermMonths: floorPlan.leaseTermMonths,
    });
    const effectiveRentNumber =
        parseCurrency(pricing.effectiveRent) || parseCurrency(unitRent);
    const monthlyConcessionNumber =
        parseCurrency(pricing.monthlyConcession) || parseCurrency(pricing.savings);

    return {
        specialLabel,
        freeWeeks,
        startingRentNumber: parseCurrency(pricing.totalMonthlyRent) || parseCurrency(unitRent),
        baseRentNumber: parseCurrency(unitRent),
        requiredMonthlyFeesNumber: parseCurrency(floorPlan.requiredMonthlyFees),
        effectiveRentNumber,
        monthlyConcessionNumber,
    };
}

function getRentBreakdownLabel(baseRentValues, requiredMonthlyFeeValues) {
    if (baseRentValues.length === 0 || requiredMonthlyFeeValues.length === 0) {
        return "";
    }

    const baseRentLabel = formatRentRange(
        Math.min(...baseRentValues),
        Math.max(...baseRentValues)
    );
    const feeLabel = formatRentRange(
        Math.min(...requiredMonthlyFeeValues),
        Math.max(...requiredMonthlyFeeValues)
    );

    return `${baseRentLabel} base rent + ${feeLabel} required fees`;
}

function getNormalRentRangeLabel(property, floorPlans) {
    if (property.isFallback && property.rent) {
        return property.rent;
    }

    const rentValues = floorPlans
        .flatMap((floorPlan) => {
            const floorPlanRentValues = parseCurrencyValues(
                floorPlan.totalMonthlyRent || floorPlan.rent || floorPlan.startingRent
            );
            const unitRents = floorPlan.availableUnits
                ?.filter((unit) => unit.status !== "leased")
                .flatMap((unit) => parseCurrencyValues(unit.rent || floorPlan.totalMonthlyRent || floorPlan.rent || floorPlan.startingRent))
                .filter(Boolean) || [];

            return [...floorPlanRentValues, ...unitRents].filter(Boolean);
        });

    if (rentValues.length > 0) {
        return formatRentRange(Math.min(...rentValues), Math.max(...rentValues));
    }

    return getRentalPriceLabel(property, getBestFloorPlanDeal(floorPlans));
}

function getFloorPlanSpecial(floorPlan) {
    const label = floorPlan.currentSpecial || floorPlan.special?.label || "";
    const freeWeeks =
        Number(floorPlan.freeWeeks || floorPlan.special?.freeWeeks || 0) ||
        getWeeksFromSpecialLabel(label);
    const rentCreditSpecial =
        floorPlan.rentCreditSpecial ||
        floorPlan.special?.rentCreditSpecial ||
        getRentCreditSpecialFromLabel(label);

    return {
        hasSpecial: freeWeeks > 0 || Boolean(rentCreditSpecial) || Boolean(label),
        freeWeeks,
        rentCreditSpecial,
        label:
            label ||
            getSpecialLabel(freeWeeks, rentCreditSpecial) ||
            (freeWeeks > 0 ? `${freeWeeks} weeks free` : ""),
    };
}

function getUnitSpecial(unit, floorPlanSpecial) {
    const adminFeeSpecial =
        unit.adminFeeSpecial ||
        unit.special?.adminFeeSpecial ||
        getAdminFeeSpecialFromLabel(unit.currentSpecial || unit.special?.label || "");
    const adminFeeSpecialType =
        unit.adminFeeSpecialType ||
        unit.special?.adminFeeSpecialType ||
        getAdminFeeSpecialTypeFromLabel(adminFeeSpecial || unit.currentSpecial || unit.special?.label || "");

    if (unit.specialMode === "none") {
        return {
            hasSpecial: false,
            freeWeeks: 0,
            rentCreditSpecial: "",
            label: "",
        };
    }

    const unitFreeWeeks = Number(unit.freeWeeks || unit.special?.freeWeeks || 0);
    const unitLabel = unit.currentSpecial || unit.special?.label || "";
    const unitRentCreditSpecial =
        unit.rentCreditSpecial ||
        unit.special?.rentCreditSpecial ||
        getRentCreditSpecialFromLabel(unitLabel);

    if (unit.specialMode === "custom" || unitFreeWeeks > 0 || unitRentCreditSpecial || unitLabel) {
        const label = getSpecialLabel(
            unitFreeWeeks,
            unitRentCreditSpecial,
            adminFeeSpecial || getAdminFeeSpecialFromLabel(unitLabel),
            adminFeeSpecialType
        );

        return {
            hasSpecial:
                unitFreeWeeks > 0 ||
                Boolean(unitRentCreditSpecial) ||
                Boolean(unitLabel) ||
                Boolean(adminFeeSpecial),
            freeWeeks: unitFreeWeeks,
            rentCreditSpecial: unitRentCreditSpecial,
            label: label || unitLabel || (unitFreeWeeks > 0 ? `${unitFreeWeeks} weeks free` : ""),
        };
    }

    if (adminFeeSpecial) {
        return {
            hasSpecial: floorPlanSpecial.hasSpecial || Boolean(adminFeeSpecial),
            freeWeeks: floorPlanSpecial.freeWeeks,
            rentCreditSpecial: floorPlanSpecial.rentCreditSpecial,
            label: getSpecialLabel(
                floorPlanSpecial.freeWeeks,
                floorPlanSpecial.rentCreditSpecial,
                adminFeeSpecial,
                adminFeeSpecialType
            ) || floorPlanSpecial.label,
        };
    }

    return floorPlanSpecial;
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
    const match = String(value || "").match(/\$?\s*([\d,]+(?:\.\d+)?)/);
    if (!match) return 0;

    const parsedValue = Number(match[1].replace(/,/g, ""));
    return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parseCurrencyValues(value) {
    return [...String(value || "").matchAll(/\$?\s*([\d,]+(?:\.\d+)?)/g)]
        .map((match) => Number(match[1].replace(/,/g, "")))
        .filter((parsedValue) => Number.isFinite(parsedValue) && parsedValue > 0);
}

function formatCurrency(value) {
    return `$${Math.round(value).toLocaleString()}`;
}

function formatRentRange(minRent, maxRent) {
    if (!minRent && !maxRent) {
        return "Contact for pricing";
    }

    if (minRent === maxRent) {
        return `${formatCurrency(minRent)}+`;
    }

    return `${formatCurrency(minRent)} - ${formatCurrency(maxRent)}`;
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

function getSpecialLabel(
    freeWeeks,
    rentCreditSpecial = "",
    adminFeeSpecial = "",
    adminFeeSpecialType = "admin"
) {
    const specialParts = [];

    if (freeWeeks) {
        specialParts.push(`${freeWeeks} ${freeWeeks === 1 ? "week" : "weeks"} free`);
    }

    const rentCreditLabel = getRentCreditSpecialLabel(rentCreditSpecial);
    if (rentCreditLabel) {
        specialParts.push(rentCreditLabel);
    }

    const feeSpecialLabel = getFeeSpecialLabel(adminFeeSpecial, adminFeeSpecialType);
    if (feeSpecialLabel) {
        specialParts.push(feeSpecialLabel);
    }

    return specialParts.join(" + ");
}

function getAdminFeeSpecialFromLabel(label) {
    const parts = String(label || "")
        .split("+")
        .map((part) => part.trim())
        .filter(Boolean);

    return parts.find((part) => !/weeks?\s+free/i.test(part) && !/(\$?\s*[\d,]+(?:\.\d+)?)\s*(?:off|rent credit|credit)/i.test(part)) || "";
}

function getAdminFeeSpecialTypeFromLabel(label) {
    return /application\s+fees?/i.test(String(label || "")) ? "application" : "admin";
}

function getFeeSpecialLabel(adminFeeSpecial, adminFeeSpecialType) {
    const trimmedSpecial = adminFeeSpecial.trim();
    if (!trimmedSpecial) return "";

    if (/(admin|application)\s+fees?|deposit|fee waived|waived fee/i.test(trimmedSpecial)) {
        return trimmedSpecial;
    }

    const feeLabel = adminFeeSpecialType === "application" ? "application fee" : "admin fee";
    return `${trimmedSpecial} ${feeLabel}`;
}

function getRentCreditSpecialFromLabel(label) {
    const match = String(label || "").match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(?:off|rent credit|credit)/i);
    return match ? formatCurrency(Number(match[1].replace(/,/g, ""))) : "";
}

function getRentCreditSpecialLabel(rentCreditSpecial) {
    const rentCreditNumber = parseCurrency(rentCreditSpecial);
    if (!rentCreditNumber) return "";

    return `${formatCurrency(rentCreditNumber)} off base rent`;
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

    const numericRentValues = rentValues.flatMap(parseCurrencyValues).filter(Boolean);

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
        return formatBedroomLabel(uniqueBeds[0]);
    }

    const firstBed = uniqueBeds[0];
    const lastBed = uniqueBeds[uniqueBeds.length - 1];
    const firstCount = getBedroomCount(firstBed);
    const lastCount = getBedroomCount(lastBed);

    if (firstCount === 0 && lastCount === 1) {
        return "Studio - 1 bd";
    }

    if (firstCount === 0 && lastCount > 1) {
        return `Studio - ${lastCount} bd`;
    }

    if (firstCount > 0 && lastCount > firstCount) {
        return `${firstCount}-${lastCount} bd`;
    }

    return `${formatBedroomLabel(firstBed)} - ${formatBedroomLabel(lastBed)}`;
}

function getBedroomCount(value) {
    if (String(value).toLowerCase().includes("studio")) {
        return 0;
    }

    const match = String(value).match(/\d+/);
    return match ? Number(match[0]) : 99;
}

function formatBedroomLabel(value) {
    const normalizedValue = String(value ?? "").trim();
    if (!normalizedValue) return "Bedrooms not listed";
    if (/studio/i.test(normalizedValue) || normalizedValue === "0") return "Studio";
    if (/\bbd\b/i.test(normalizedValue)) return normalizedValue;

    const bedMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*beds?$/i);
    if (bedMatch) return `${bedMatch[1]} bd`;

    const numberMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)$/);
    if (numberMatch) return `${numberMatch[1]} bd`;

    return normalizedValue;
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
    const primaryImage = getPropertyPrimaryImage(property);
    const dealSummary = property.dealSummary || getPropertyDealSummary(property);
    const normalRentLabel = dealSummary.normalRentLabel || getRentalPriceLabel(property, matchedFloorPlan);
    const effectiveRentLabel = dealSummary.effectiveRentLabel || normalRentLabel;
    const primaryRentLabel = dealSummary.hasSpecial ? effectiveRentLabel : normalRentLabel;
    const priceCaption = dealSummary.hasSpecial ? "After specials" : "Listed rent";
    const showBeforeSpecials = dealSummary.hasSpecial && normalRentLabel && normalRentLabel !== effectiveRentLabel;
    const bedsLabel = getBedsLabel(property, matchedFloorPlan);
    const addressLabel = getAddressLabel(property);
    const savingsLabel = dealSummary.concessionValueLabel || matchedFloorPlan?.savings || property.savings || "";
    const hasSavings = parseCurrency(savingsLabel) > 0;
    const cardHref = `/properties/${property.id}`;

    return (
        <Link
            to={cardHref}
            className="group overflow-hidden rounded-2xl border border-[#d7e6df] bg-white shadow-[0_12px_28px_rgba(16,36,38,0.12)] transition duration-200 ease-out hover:-translate-y-1.5 hover:border-[#f2b84b] hover:shadow-[0_20px_44px_rgba(16,36,38,0.18)] hover:ring-2 hover:ring-[#f2b84b]/45"
        >
            <div className="relative overflow-hidden bg-[#102426]">
                <img
                    src={primaryImage}
                    alt={property.name}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[16/10] w-full object-cover transition duration-300 group-hover:scale-105 sm:aspect-[4/3]"
                />
            </div>

            <div className="p-3.5 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-base font-black text-[#102426] group-hover:text-[#1f6f63]">
                            {property.name}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-[#526260]">
                            {addressLabel}
                        </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#eef5ff] px-2.5 py-1 text-[11px] font-black text-[#174a7c] ring-1 ring-[#b8d9f0]">
                        {bedsLabel}
                    </span>
                </div>

                <div className="mt-3 rounded-2xl border border-[#f2d08a] bg-[#fff8e6] p-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#8a5b0a]">
                        {priceCaption}
                    </p>
                    <p className="mt-1 text-3xl font-black leading-none text-[#102426]">
                        {primaryRentLabel}
                    </p>
                    {showBeforeSpecials && (
                        <p className="mt-2 text-xs font-bold leading-5 text-[#7a432e]">
                            Before specials:{" "}
                            <span className="font-black text-[#102426]">
                                {normalRentLabel}
                            </span>
                        </p>
                    )}
                    {hasSavings && (
                        <p className="mt-1 text-xs font-black text-[#1f6f63]">
                            Estimated savings: {savingsLabel}
                        </p>
                    )}
                </div>

                {dealSummary.hasSpecial && (
                    <div className="mt-3 border-t border-[#edf4ef] pt-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-[#1f6f63]">
                            Current special
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm font-black leading-5 text-[#102426]">
                            {dealSummary.specialLabel}
                        </p>
                    </div>
                )}

                <span className="mt-3 flex items-center justify-between rounded-2xl bg-[#173f3f] px-3 py-2.5 text-sm font-black text-white group-hover:bg-[#102426]">
                    View deal details
                    <span className="text-xs font-black text-[#f2b84b]">Floor plans</span>
                </span>
            </div>
        </Link>
    );
}

function MissionBenefit({ title, text }) {
    return (
        <div className="rounded-lg bg-white p-3 ring-1 ring-[#d7e6df] sm:p-4">
            <p className="text-sm font-black text-[#102426]">{title}</p>
            <p className="mt-1.5 text-xs font-semibold leading-5 text-[#526260] sm:mt-2">
                {text}
            </p>
        </div>
    );
}

function SeoFaqCard({ question, answer }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`rounded-lg bg-white p-3 ring-1 sm:p-4 ${isOpen ? "ring-[#f2b84b]" : "ring-[#d7e6df]"}`}>
            <button
                type="button"
                onClick={() => setIsOpen((currentValue) => !currentValue)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-3 text-left text-sm font-black leading-5 text-[#102426]"
            >
                <span className="min-w-0 flex-1">
                    {question}
                </span>
                <span className={`shrink-0 text-[#1f6f63] transition ${isOpen ? "rotate-45" : ""}`}>
                    +
                </span>
            </button>

            {isOpen && (
                <p className="mt-2 text-xs font-semibold leading-5 text-[#526260]">
                    {answer}
                </p>
            )}
        </div>
    );
}
