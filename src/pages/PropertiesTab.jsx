import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

import {
    Building2,
    CheckCircle2,
    Clock3,
    BadgeDollarSign,
    Plus,
} from "lucide-react";

import { getAllProperties } from "../data/propertyStorage";




export default function PropertiesTab() {
    const properties = getAllProperties();
    
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
          value: properties.filter(
            (property) => property.status === "Pending Review"
          ).length,
          subtitle: "Need admin approval",
        },
        {
          icon: BadgeDollarSign,
          title: "Active Specials",
          value: properties.filter((property) => property.special).length,
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
        <div>
            <h1 className="text-4xl font-black text-slate-900">
                Properties
            </h1>

            <p className="mt-2 text-slate-500">
                Manage apartment properties, specials, pricing, and availability.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-4">
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

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">
                            Property List
                        </h2>

                        <p className="mt-1 text-slate-500">
                            Showing {filteredProperties.length} of {properties.length} properties.
                        </p>
                    </div>

                    <Link
                        to="/admin/properties/new"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
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
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    />


                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
                    >
                        <option>All</option>
                        <option>Live</option>
                        <option>Pending Review</option>
                        <option>Draft</option>
                    </select>

                    <select
                        value={visibilityFilter}
                        onChange={(event) => setVisibilityFilter(event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
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
                        }}
                        className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                        Clear
                    </button>
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                    <div className="mt-6 min-h-[260px] space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filteredProperties.length > 0 ? (
                                filteredProperties.map((property) => (
                                    <motion.div
                                        key={property.name}
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
                                    className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-center"
                                >
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">
                                            No properties found
                                        </h3>

                                        <p className="mt-2 text-slate-500">
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
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <Icon className="h-5 w-5 text-slate-700" />
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-500">
                {title}
            </p>

            <h2 className="mt-3 text-4xl font-black text-slate-900">
                {value}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
                {subtitle}
            </p>
        </div>
    );
}

function getStatusClasses(status) {
    if (status === "Live") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (status === "Pending Review") {
        return "bg-amber-100 text-amber-700";
    }

    if (status === "Draft") {
        return "bg-slate-200 text-slate-700";
    }

    return "bg-slate-100 text-slate-700";
}

function getSpecialClasses(special) {
    if (special.toLowerCase().includes("free")) {
        return "bg-emerald-100 text-emerald-700";
    }

    if (special.toLowerCase().includes("$")) {
        return "bg-indigo-100 text-indigo-700";
    }

    if (special.toLowerCase().includes("reduced")) {
        return "bg-amber-100 text-amber-700";
    }

    return "bg-slate-100 text-slate-700";
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
}) {
    const initials = name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2);
    const location = [city, state, zipcode].filter(Boolean).join(", ") || area;

    return (
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                    {initials}
                </div>

                <div>
                    <p className="font-bold text-slate-900">{name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                        {location} • Managed by {managementCompany || manager}
                    </p>
                    {yearBuilt && (
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                            Built {yearBuilt}
                        </p>
                    )}
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                        Updated {updated}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
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
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-700"
                        }`}
                >
                    {status === "Live" ? "Public" : "Hidden"}
                </span>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${getSpecialClasses(
                        special
                    )}`}
                >
                    {special}
                </span>

                <div className="flex gap-2">
                    <Link
                        to={`/admin/properties/${id}`}
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        View
                    </Link>

                    <Link
                        to={`/admin/properties/${id}/edit`} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                        Edit
                    </Link>

                    <button className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
