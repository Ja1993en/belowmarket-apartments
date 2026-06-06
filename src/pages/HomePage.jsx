import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin, Search } from "lucide-react";

import { getAllProperties } from "../data/propertyStorage";

export default function HomePage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [areaFilter, setAreaFilter] = useState("All");
    const [bedroomFilter, setBedroomFilter] = useState("All");

    const properties = getAllProperties();

    const publicProperties = properties.filter(
        (property) => property.status === "Live"
    );

    const filteredProperties = publicProperties.filter((property) => {
        const searchableText = `${property.name} ${property.area} ${property.special} ${property.manager}`.toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
        const matchesArea = areaFilter === "All" || property.area === areaFilter;
        const matchesBedroom =
            bedroomFilter === "All" || property.bedrooms?.includes(bedroomFilter);

        return matchesSearch && matchesArea && matchesBedroom;
    });

    const areas = ["All", ...new Set(publicProperties.map((property) => property.area))];
    const bedrooms = ["All", "Studio", "1 Bed", "2 Bed", "3 Bed"];

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

                    <div className="mt-8 grid max-w-5xl gap-3 rounded-3xl bg-white p-2 shadow-sm md:grid-cols-[1fr_170px_170px_auto]">                        <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search property, special, or manager..."
                            className="w-full rounded-2xl border-0 py-4 pl-12 pr-4 text-slate-900 outline-none"
                        />
                    </div>

                        <select
                            value={areaFilter}
                            onChange={(event) => setAreaFilter(event.target.value)}
                            className="rounded-2xl border-0 bg-slate-100 px-4 py-4 font-bold text-slate-700 outline-none"
                        >
                            {areas.map((area) => (
                                <option key={area}>{area}</option>
                            ))}
                        </select>

                        <select
                            value={bedroomFilter}
                            onChange={(event) => setBedroomFilter(event.target.value)}
                            className="rounded-2xl border-0 bg-slate-100 px-4 py-4 font-bold text-slate-700 outline-none"
                        >
                            {bedrooms.map((bedroom) => (
                                <option key={bedroom}>{bedroom}</option>
                            ))}
                        </select>


                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setAreaFilter("All");
                                setBedroomFilter("All");
                            }}
                            className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Clear
                        </button>
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

                    <Link
                        to="/admin/dashboard"
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
                    >
                        Admin Portal
                    </Link>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    {filteredProperties.map((property) => (
                        <PropertyCard key={property.id} property={property} />
                    ))}
                </div>

                {filteredProperties.length === 0 && (
                    <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                        <h3 className="text-2xl font-black text-slate-900">
                            No properties found
                        </h3>

                        <p className="mt-2 text-slate-500">
                            Try searching by area, special, property name, or management company.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}

function PropertyCard({ property }) {
    return (
        <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <img
                src={property.image}
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
                        </p>
                    </div>

                    {property.special && property.savings && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            Featured Deal
                        </span>
                    )}
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-500">Current Special</p>
                    <p className="mt-1 font-black text-slate-900">{property.special}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <DealStat label="Effective Rent" value={property.effectiveRent} />
                    <DealStat label="Savings" value={property.savings} />
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