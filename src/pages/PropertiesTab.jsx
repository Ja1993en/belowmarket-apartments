import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

import {
    Building2,
    CheckCircle2,
    Clock3,
    BadgeDollarSign,
    Plus,
} from "lucide-react";

import { deleteStoredProperty, getAllProperties } from "../data/propertyStorage";




export default function PropertiesTab() {
    const [properties, setProperties] = useState([]);
    const [notice, setNotice] = useState("");
    const [loadError, setLoadError] = useState("");
    const [isLoadingProperties, setIsLoadingProperties] = useState(true);
    const refreshProperties = async () => {
        try {
            setIsLoadingProperties(true);
            const savedProperties = await getAllProperties();
            setProperties(savedProperties);
            setLoadError("");
        } catch (error) {
            console.error(error);
            setProperties([]);
            setLoadError("Could not load properties from Supabase.");
        } finally {
            setIsLoadingProperties(false);
        }
    };

    useEffect(() => {
        const loadTimer = window.setTimeout(() => {
            refreshProperties();
        }, 0);

        return () => window.clearTimeout(loadTimer);
    }, []);

    const deleteProperty = async (property) => {
        const confirmed = window.confirm(
            `Delete ${property.name}? This removes it from the admin list and public search.`
        );

        if (!confirmed) return;

        try {
            await deleteStoredProperty(property.id);
            await refreshProperties();
            setNotice(`${property.name} was deleted.`);
        } catch (error) {
            console.error(error);
            setNotice(`Could not delete ${property.name}. Check Supabase.`);
        }
    };
    
    const propertyStats = [
        {
          icon: Building2,
          title: "Total Properties",
          value: properties.length,
          subtitle: "All properties",
        },
        {
          icon: CheckCircle2,
          title: "Public Listings",
          value: properties.filter((property) => property.status === "Live").length,
          subtitle: "Visible to renters",
        },
        {
          icon: Clock3,
          title: "Hidden Listings",
          value: properties.filter((property) => property.status !== "Live").length,
          subtitle: "Draft or pending",
        },
        {
          icon: BadgeDollarSign,
          title: "Active Specials",
          value: properties.filter((property) => hasVisibleSpecial(property.special)).length,
          subtitle: "Current concessions",
        },
      ];

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [visibilityFilter, setVisibilityFilter] = useState("All");

    

    const filteredProperties = properties.filter((property) => {
        const text = [
            property.name,
            property.area,
            property.manager,
            property.managementCompany,
            property.status,
            property.special,
            property.address,
            property.city,
            property.state,
            property.zipcode,
            property.zip,
            property.yearBuilt,
        ].filter(Boolean).join(" ").toLowerCase();

        const matchesSearch = text.includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === "All" || property.status === statusFilter;

        const visibility = property.status === "Live" ? "Public" : "Hidden";
        const matchesVisibility =
            visibilityFilter === "All" || visibility === visibilityFilter;

        return matchesSearch && matchesStatus && matchesVisibility;
    });

    return (
        <div className="text-left">
            <h1 className="text-4xl font-black text-[#102426]">
                Properties
            </h1>

            <p className="mt-2 font-semibold text-[#526260]">
                Manage apartment properties, specials, pricing, and availability.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {propertyStats.map((stat) => (
                    <PropertyStatCard
                        key={stat.title}
                        icon={stat.icon}
                        title={stat.title}
                        value={stat.value}
                        subtitle={stat.subtitle}
                    />
                ))}
            </div>

            {loadError && (
                <div className="mt-6 rounded-2xl bg-[#fde8df] p-4 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
                    {loadError}
                </div>
            )}

            <div className="mt-8 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-[#102426]">
                            Property List
                        </h2>

                        <p className="mt-1 font-semibold text-[#526260]">
                            {isLoadingProperties
                                ? "Loading properties from Supabase..."
                                : `Showing ${filteredProperties.length} of ${properties.length} properties.`}
                        </p>
                    </div>

                    <Link
                        to="/admin/properties/new"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Property
                    </Link>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-[1fr_200px_200px_auto]">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search properties..."
                        className="w-full rounded-2xl border border-[#b8d9d0] bg-white px-4 py-3 font-semibold text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                    />


                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-2xl border border-[#b8d9d0] bg-white px-4 py-3 font-semibold text-[#173f3f] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                    >
                        <option>All</option>
                        <option>Live</option>
                        <option>Pending Review</option>
                        <option>Draft</option>
                    </select>

                    <select
                        value={visibilityFilter}
                        onChange={(event) => setVisibilityFilter(event.target.value)}
                        className="rounded-2xl border border-[#b8d9d0] bg-white px-4 py-3 font-semibold text-[#173f3f] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                    >
                        <option>All</option>
                        <option>Public</option>
                        <option>Hidden</option>
                    </select>


                    <button
                        onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("All");
                            setVisibilityFilter("All");
                            setNotice("");
                        }}
                        className="rounded-2xl bg-[#e7f3ee] px-4 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
                    >
                        Clear
                    </button>
                </div>

                {notice && (
                    <p className="mt-4 rounded-2xl bg-[#d8efe6] px-4 py-3 text-sm font-bold text-[#1f6f63] ring-1 ring-[#a9cfc2]">
                        {notice}
                    </p>
                )}

                <div className="mt-6 rounded-2xl border border-dashed border-[#a9cfc2] bg-[#f5f8f1] p-4 text-center md:p-6">
                    <div className="mt-6 min-h-[260px] space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filteredProperties.length > 0 ? (
                                filteredProperties.map((property) => (
                                    <motion.div
                                        key={property.id}
                                        layout
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <PropertyRow
                                            id={property.id}
                                            name={property.name}
                                            area={property.area}
                                            city={property.city}
                                            state={property.state}
                                            zipcode={property.zipcode || property.zip}
                                            yearBuilt={property.yearBuilt}
                                            manager={property.manager}
                                            managementCompany={property.managementCompany}
                                            rent={property.rent}
                                            status={property.status}
                                            special={property.special}
                                            updated={property.updated}
                                            onDelete={() => deleteProperty(property)}
                                        />
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div
                                    key="no-results"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-[#a9cfc2] bg-white p-8 text-center"
                                >
                                    <div>
                                        <h3 className="text-xl font-bold text-[#102426]">
                                            No properties found
                                        </h3>

                                        <p className="mt-2 font-semibold text-[#526260]">
                                            Try searching by property name, area, status, or special.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PropertyStatCard({ icon: Icon, title, value, subtitle }) {
    return (
        <div className="min-h-[170px] rounded-3xl border border-[#d7e6df] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#f2b84b] hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f3ee]">
                <Icon className="h-5 w-5 text-[#1f6f63]" />
            </div>

            <p className="mt-4 text-sm font-semibold text-[#526260]">
                {title}
            </p>

            <h2 className="mt-2 text-3xl font-black leading-none text-[#102426]">
                {value}
            </h2>

            <p className="mt-2 text-sm font-semibold text-[#526260]">
                {subtitle}
            </p>
        </div>
    );
}

function getStatusClasses(status) {
    if (status === "Live") {
        return "bg-[#d8efe6] text-[#1f6f63]";
    }

    if (status === "Pending Review") {
        return "bg-[#fff8e6] text-[#8a5b0a]";
    }

    if (status === "Draft") {
        return "bg-[#e7f3ee] text-[#526260]";
    }

    return "bg-[#f5f8f1] text-[#526260]";
}

function getSpecialClasses(special) {
    const normalizedSpecial = String(special || "").toLowerCase();

    if (normalizedSpecial.includes("free")) {
        return "bg-[#d8efe6] text-[#1f6f63]";
    }

    if (normalizedSpecial.includes("$")) {
        return "bg-[#eef5ff] text-[#174a7c]";
    }

    if (normalizedSpecial.includes("reduced")) {
        return "bg-[#fff8e6] text-[#8a5b0a]";
    }

    return "bg-[#f5f8f1] text-[#526260]";
}

function hasVisibleSpecial(special) {
    return Boolean(special && special !== "Special not listed");
}

function PropertyRow({
    id,
    name,
    area,
    city,
    state,
    zipcode,
    yearBuilt,
    manager,
    managementCompany,
    rent,
    status,
    special,
    updated,
    onDelete,
}) {
    const initials = name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2);
    const location = [city, state, zipcode].filter(Boolean).join(", ") || area;

    return (
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-4 text-left ring-1 ring-[#d7e6df] transition hover:ring-[#f2b84b] md:flex-row md:items-center">
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173f3f] text-sm font-black text-[#f2b84b]">
                    {initials}
                </div>

                <div>
                    <p className="font-bold text-[#102426]">{name}</p>
                    <p className="mt-1 text-sm font-semibold text-[#526260]">
                        {location} • Managed by {managementCompany || manager}
                    </p>
                    {yearBuilt && (
                        <p className="mt-1 text-xs font-semibold text-[#78908a]">
                            Built {yearBuilt}
                        </p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-[#78908a]">
                        Updated {updated}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#f5f8f1] px-3 py-1 text-xs font-bold text-[#173f3f] ring-1 ring-[#d7e6df]">
                    {rent}
                </span>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(
                        status
                    )}`}
                >
                    {status}
                </span>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${status === "Live"
                        ? "bg-[#d8efe6] text-[#1f6f63]"
                        : "bg-[#e7f3ee] text-[#526260]"
                        }`}
                >
                    {status === "Live" ? "Public" : "Hidden"}
                </span>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getSpecialClasses(
                        special
                    )}`}
                >
                    {hasVisibleSpecial(special) ? special : "No special"}
                </span>

                <div className="flex gap-2">
                    <Link
                        to={`/admin/properties/${id}`}
                        className="rounded-xl bg-[#173f3f] px-4 py-2 text-sm font-bold text-white hover:bg-[#102426]"
                    >
                        View
                    </Link>

                    <Link
                        to={`/admin/properties/${id}/edit`} className="rounded-xl bg-[#e7f3ee] px-4 py-2 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
                    >
                        Edit
                    </Link>

                    <button
                        type="button"
                        onClick={onDelete}
                        className="rounded-xl bg-[#fde8df] px-4 py-2 text-sm font-bold text-[#b33818] hover:bg-[#f9d4c6]"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
