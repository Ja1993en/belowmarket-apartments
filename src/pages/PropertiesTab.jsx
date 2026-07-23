import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    FileUp,
    Image,
    Layers3,
    MapPin,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from "lucide-react";

import {
    createStoredProperty,
    deleteStoredProperty,
    getAllProperties,
    getLegacyLocalPropertyCount,
    migrateLegacyLocalPropertiesToSupabase,
    updateStoredProperty,
} from "../data/propertyStorage";




export default function PropertiesTab() {
    const [properties, setProperties] = useState([]);
    const [notice, setNotice] = useState("");
    const [loadError, setLoadError] = useState("");
    const [isLoadingProperties, setIsLoadingProperties] = useState(true);
    const [legacyPropertyCount, setLegacyPropertyCount] = useState(() =>
        getLegacyLocalPropertyCount({ includeMigrated: true })
    );
    const [isMigratingProperties, setIsMigratingProperties] = useState(false);
    const autoMigrationAttemptedRef = useRef(false);
    const [bulkPropertyText, setBulkPropertyText] = useState("");
    const [isImportingProperties, setIsImportingProperties] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [qualityFilter, setQualityFilter] = useState("All");
    const [sortBy, setSortBy] = useState("attention");
    const [currentPage, setCurrentPage] = useState(1);
    const refreshProperties = useCallback(async () => {
        try {
            setIsLoadingProperties(true);
            const savedProperties = await getAllProperties();
            const currentLegacyCount = getLegacyLocalPropertyCount({
                includeMigrated: true,
            });

            if (savedProperties.length === 0 && currentLegacyCount > 0 && !autoMigrationAttemptedRef.current) {
                autoMigrationAttemptedRef.current = true;
                setIsMigratingProperties(true);

                const migratedProperties = await migrateLegacyLocalPropertiesToSupabase({
                    includeMigrated: true,
                });
                const refreshedProperties = await getAllProperties();

                setProperties(refreshedProperties);
                setLegacyPropertyCount(getLegacyLocalPropertyCount({
                    includeMigrated: true,
                }));
                setNotice(`${migratedProperties.length} browser-saved propert${migratedProperties.length === 1 ? "y" : "ies"} recovered into Supabase.`);
                setLoadError("");
                return;
            }

            setProperties(savedProperties);
            setLegacyPropertyCount(currentLegacyCount);
            setLoadError("");
        } catch (error) {
            console.error(error);
            setProperties([]);
            setLoadError(`Could not load properties from Supabase. ${error?.message || "Check the database connection."}`);
        } finally {
            setIsLoadingProperties(false);
            setIsMigratingProperties(false);
        }
    }, []);

    useEffect(() => {
        const loadTimer = window.setTimeout(() => {
            refreshProperties();
        }, 0);

        return () => window.clearTimeout(loadTimer);
    }, [refreshProperties]);

    const migrateLegacyProperties = async () => {
        const confirmed = window.confirm(
            `Move ${legacyPropertyCount} browser-saved propert${legacyPropertyCount === 1 ? "y" : "ies"} into Supabase? Run this from the laptop/browser where you entered the properties.`
        );

        if (!confirmed) return;

        try {
            setIsMigratingProperties(true);
            setNotice("");

            const migratedProperties = await migrateLegacyLocalPropertiesToSupabase({
                includeMigrated: true,
            });

            await refreshProperties();
            setLegacyPropertyCount(getLegacyLocalPropertyCount({
                includeMigrated: true,
            }));
            setNotice(`${migratedProperties.length} browser-saved propert${migratedProperties.length === 1 ? "y" : "ies"} moved into Supabase. If photos are missing, create the property-photos bucket and re-upload them later.`);
        } catch (error) {
            console.error(error);
            setNotice("Could not migrate browser-saved properties. Confirm the Supabase properties table is available.");
        } finally {
            setIsMigratingProperties(false);
        }
    };

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

    const makePropertyLive = async (property) => {
        try {
            setNotice("");
            await updateStoredProperty(property.id, { status: "Live" });
            await refreshProperties();
            setNotice(`${property.name} is now visible to renters.`);
        } catch (error) {
            console.error(error);
            setNotice(`Could not make ${property.name} live. Check Supabase.`);
        }
    };

    const importBulkProperties = async () => {
        const importedDrafts = parseBulkPropertyImportRows(bulkPropertyText);
        const validationErrors = validateBulkPropertyDrafts(importedDrafts);

        if (importedDrafts.length === 0) {
            setNotice("Paste at least one valid property row before importing.");
            return;
        }

        if (validationErrors.length > 0) {
            setNotice(`Fix these import issues first: ${validationErrors.slice(0, 4).join(" ")}`);
            return;
        }

        try {
            setIsImportingProperties(true);
            setNotice("");

            for (const propertyDraft of importedDrafts) {
                await createStoredProperty(propertyDraft);
            }

            setBulkPropertyText("");
            await refreshProperties();
            setNotice(`${importedDrafts.length} propert${importedDrafts.length === 1 ? "y" : "ies"} imported to Supabase.`);
        } catch (error) {
            console.error(error);
            setNotice(`Could not import properties. ${error?.message || "Check the CSV rows and Supabase connection."}`);
        } finally {
            setIsImportingProperties(false);
        }
    };
    
    const propertyRecords = useMemo(
        () => properties.map((property) => ({
            property,
            health: getPropertyHealth(property),
        })),
        [properties]
    );
    const totalAvailableUnits = propertyRecords.reduce(
        (total, record) => total + record.health.availableUnits,
        0
    );
    const needsReviewCount = propertyRecords.filter(
        (record) => record.health.severity !== "ready"
    ).length;
    const missingDataCount = propertyRecords.filter(
        (record) => record.health.missingDataCount > 0
    ).length;
    const propertyStats = [
        {
            icon: Building2,
            title: "Properties",
            value: properties.length,
            subtitle: `${properties.filter((property) => property.status === "Live").length} live`,
            tone: "neutral",
        },
        {
            icon: AlertTriangle,
            title: "Needs review",
            value: needsReviewCount,
            subtitle: "Pricing or listing checks",
            tone: needsReviewCount ? "warning" : "success",
            filter: "Needs review",
        },
        {
            icon: Layers3,
            title: "Missing data",
            value: missingDataCount,
            subtitle: "Photos, plans, or details",
            tone: missingDataCount ? "danger" : "success",
            filter: "Missing data",
        },
        {
            icon: CheckCircle2,
            title: "Available units",
            value: totalAvailableUnits.toLocaleString(),
            subtitle: "Across active floor plans",
            tone: "success",
            filter: "Available",
        },
    ];
    const filteredProperties = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const filtered = propertyRecords.filter(({ property, health }) => {
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
            const matchesSearch = !normalizedSearch || text.includes(normalizedSearch);
            const matchesStatus = statusFilter === "All" || property.status === statusFilter;
            const matchesQuality =
                qualityFilter === "All" ||
                (qualityFilter === "Needs review" && health.severity !== "ready") ||
                (qualityFilter === "Missing data" && health.missingDataCount > 0) ||
                (qualityFilter === "Available" && health.availableUnits > 0);

            return matchesSearch && matchesStatus && matchesQuality;
        });

        return filtered.sort((first, second) => {
            if (sortBy === "name") {
                return String(first.property.name || "").localeCompare(String(second.property.name || ""));
            }

            if (sortBy === "recent") {
                return getUpdatedTimestamp(second.property) - getUpdatedTimestamp(first.property);
            }

            if (sortBy === "availability") {
                return second.health.availableUnits - first.health.availableUnits;
            }

            return second.health.priority - first.health.priority ||
                String(first.property.name || "").localeCompare(String(second.property.name || ""));
        });
    }, [propertyRecords, qualityFilter, searchTerm, sortBy, statusFilter]);
    const pageSize = 12;
    const pageCount = Math.max(1, Math.ceil(filteredProperties.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, pageCount);
    const paginatedProperties = filteredProperties.slice(
        (safeCurrentPage - 1) * pageSize,
        safeCurrentPage * pageSize
    );
    const activeFilterCount = [
        searchTerm.trim(),
        statusFilter !== "All",
        qualityFilter !== "All",
    ].filter(Boolean).length;

    return (
        <div className="text-left">
            <div className="flex flex-col gap-4 border-b border-[#d7e6df] pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[#1f6f63]">
                        Listing operations
                    </p>
                    <h1 className="mt-1 text-3xl font-black leading-tight text-[#102426] sm:text-4xl">
                        Properties
                    </h1>
                    <p className="mt-1.5 max-w-2xl text-sm font-semibold text-[#526260]">
                        Find listings that need attention, verify availability, and keep renter-facing details current.
                    </p>
                </div>

                <div className="grid grid-cols-[auto_1fr] gap-2 sm:flex sm:items-center">
                    <button
                        type="button"
                        onClick={refreshProperties}
                        disabled={isLoadingProperties}
                        className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-3 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#f5f8f1] disabled:opacity-60"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoadingProperties ? "animate-spin" : ""}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <Link
                        to="/admin/properties/new"
                        className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#f2b84b] px-4 text-sm font-black text-[#102426] hover:bg-[#dca33c]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Property
                    </Link>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
                {propertyStats.map((stat) => (
                    <PropertyStatCard
                        key={stat.title}
                        {...stat}
                        isActive={qualityFilter === stat.filter}
                        onClick={stat.filter ? () => {
                            setQualityFilter(qualityFilter === stat.filter ? "All" : stat.filter);
                            setCurrentPage(1);
                        } : undefined}
                    />
                ))}
            </div>

            {legacyPropertyCount > 0 && (
                <div className="mt-6 rounded-3xl border border-[#f2d08a] bg-[#fff8e6] p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-black text-[#102426]">Recover browser-saved properties to Supabase</h2>
                            <p className="mt-1 text-sm font-semibold text-[#526260]">
                                This browser has {legacyPropertyCount} old local propert{legacyPropertyCount === 1 ? "y" : "ies"}. Use this if Supabase is empty or a first migration happened before the database table existed.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={migrateLegacyProperties}
                            disabled={isMigratingProperties}
                            className="rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0]"
                        >
                            {isMigratingProperties ? "Recovering..." : "Recover to Supabase"}
                        </button>
                    </div>
                </div>
            )}

            {loadError && (
                <div className="mt-6 rounded-2xl bg-[#fde8df] p-4 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
                    {loadError}
                </div>
            )}

            <div className="mt-5 overflow-hidden rounded-2xl border border-[#d7e6df] bg-white shadow-sm">
                <div className="border-b border-[#d7e6df] p-3 sm:p-4">
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 min-[1400px]:grid-cols-[minmax(260px,1fr)_150px_170px_160px_auto]">
                        <label className="relative col-span-2 min-w-0 lg:col-span-4 min-[1400px]:col-span-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1f6f63]" />
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) => {
                                    setSearchTerm(event.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Search property, area, manager, or special"
                                className="h-10 w-full rounded-lg border border-[#b8d9d0] bg-[#fbfdfb] pl-9 pr-3 text-sm font-semibold text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-2 focus:ring-[#f2b84b]/20"
                            />
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-10 rounded-lg border border-[#d7e6df] bg-white px-3 text-sm font-bold text-[#173f3f] outline-none focus:border-[#f2b84b]"
                            aria-label="Filter by publishing status"
                        >
                            <option value="All">All statuses</option>
                            <option value="Live">Live</option>
                            <option value="Pending Review">Pending review</option>
                            <option value="Draft">Draft</option>
                        </select>
                        <select
                            value={qualityFilter}
                            onChange={(event) => {
                                setQualityFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-10 rounded-lg border border-[#d7e6df] bg-white px-3 text-sm font-bold text-[#173f3f] outline-none focus:border-[#f2b84b]"
                            aria-label="Filter by listing quality"
                        >
                            <option value="All">All listing quality</option>
                            <option value="Needs review">Needs review</option>
                            <option value="Missing data">Missing data</option>
                            <option value="Available">Has availability</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(event) => {
                                setSortBy(event.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-10 rounded-lg border border-[#d7e6df] bg-white px-3 text-sm font-bold text-[#173f3f] outline-none focus:border-[#f2b84b]"
                            aria-label="Sort properties"
                        >
                            <option value="attention">Attention first</option>
                            <option value="recent">Recently updated</option>
                            <option value="availability">Most availability</option>
                            <option value="name">Property name</option>
                        </select>
                        <div className="flex gap-2">
                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm("");
                                        setStatusFilter("All");
                                        setQualityFilter("All");
                                        setCurrentPage(1);
                                    }}
                                    className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#fff0ea] px-3 text-xs font-black text-[#b42318] hover:bg-[#fde1d9] lg:flex-none"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Clear {activeFilterCount}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsImportOpen((current) => !current)}
                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#e7f3ee] px-3 text-xs font-black text-[#173f3f] hover:bg-[#d7e6df] lg:flex-none"
                            >
                                <FileUp className="h-4 w-4" />
                                Import CSV
                                <ChevronDown className={`h-3.5 w-3.5 transition ${isImportOpen ? "rotate-180" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {isImportOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-b border-[#d7e6df] bg-[#f5f8f1]"
                        >
                            <div className="p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase text-[#1f6f63]">Bulk import</p>
                                        <h2 className="mt-1 text-lg font-black text-[#102426]">Paste property and floor-plan rows</h2>
                                        <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-[#526260]">
                                            Repeated property names are grouped together. Separate gallery and floor-plan photo URLs with a vertical bar.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setBulkPropertyText(BULK_PROPERTY_IMPORT_SAMPLE)}
                                        className="w-fit rounded-lg bg-white px-3 py-2 text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
                                    >
                                        Load sample
                                    </button>
                                </div>
                                <textarea
                                    value={bulkPropertyText}
                                    onChange={(event) => setBulkPropertyText(event.target.value)}
                                    rows={6}
                                    placeholder="Property Name, Management Company, Address, City, State, ZIP..."
                                    className="mt-3 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2.5 font-mono text-xs leading-5 text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-2 focus:ring-[#f2b84b]/20"
                                />
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-[11px] font-semibold leading-4 text-[#526260]">
                                        Required: property name, location, floor-plan name, and starting rent.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={importBulkProperties}
                                        disabled={isImportingProperties}
                                        className="inline-flex items-center justify-center rounded-lg bg-[#173f3f] px-4 py-2.5 text-xs font-black text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0]"
                                    >
                                        {isImportingProperties ? "Importing..." : "Import properties"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {notice && (
                    <p className="m-3 rounded-xl bg-[#d8efe6] px-4 py-3 text-sm font-bold text-[#1f6f63] ring-1 ring-[#a9cfc2]">
                        {notice}
                    </p>
                )}

                <div className="flex flex-col gap-2 border-b border-[#edf4ef] bg-[#fbfdfb] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                    <div>
                        <p className="text-sm font-black text-[#102426]">
                            {isLoadingProperties ? "Loading properties..." : `${filteredProperties.length} properties`}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-[#526260]">
                            {sortBy === "attention" ? "Listings needing attention appear first." : "Sorted by your selected view."}
                        </p>
                    </div>
                    {!isLoadingProperties && filteredProperties.length > 0 && (
                        <p className="text-xs font-bold text-[#526260]">
                            Showing {(safeCurrentPage - 1) * pageSize + 1}-{Math.min(safeCurrentPage * pageSize, filteredProperties.length)}
                        </p>
                    )}
                </div>

                <div className="min-h-[360px]">
                    <div className="divide-y divide-[#edf4ef]">
                        <AnimatePresence mode="popLayout">
                            {paginatedProperties.length > 0 ? (
                                paginatedProperties.map(({ property, health }) => (
                                    <motion.div
                                        key={property.id}
                                        layout
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <PropertyRow
                                            property={property}
                                            health={health}
                                            onMakeLive={() => makePropertyLive(property)}
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
                                    className="flex min-h-[360px] items-center justify-center p-8 text-center"
                                >
                                    <div>
                                        <Search className="mx-auto h-8 w-8 text-[#a9cfc2]" />
                                        <h3 className="mt-3 text-lg font-black text-[#102426]">
                                            No properties found
                                        </h3>
                                        <p className="mt-1 text-sm font-semibold text-[#526260]">
                                            Clear a filter or try another property name.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {pageCount > 1 && (
                    <div className="flex items-center justify-between border-t border-[#d7e6df] px-3 py-3 sm:px-4">
                        <p className="text-xs font-bold text-[#526260]">
                            Page {safeCurrentPage} of {pageCount}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={safeCurrentPage === 1}
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#f5f8f1] disabled:cursor-not-allowed disabled:opacity-35"
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                                disabled={safeCurrentPage === pageCount}
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#173f3f] text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:opacity-35"
                                aria-label="Next page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PropertyStatCard({
    icon: Icon,
    title,
    value,
    subtitle,
    tone = "neutral",
    isActive = false,
    onClick,
}) {
    const toneClasses = {
        neutral: "bg-[#f5f8f1] text-[#173f3f]",
        success: "bg-[#e7f3ee] text-[#1f6f63]",
        warning: "bg-[#fff8e6] text-[#8a5b0a]",
        danger: "bg-[#fff0ea] text-[#b42318]",
    };
    const Component = onClick ? "button" : "div";

    return (
        <Component
            type={onClick ? "button" : undefined}
            onClick={onClick}
            className={`grid min-h-[92px] grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2.5 rounded-xl border bg-white p-3 text-left shadow-sm transition sm:min-h-[100px] sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-3 sm:p-4 ${
                isActive
                    ? "border-[#f2b84b] ring-2 ring-[#f2b84b]/30"
                    : "border-[#d7e6df] hover:border-[#a9cfc2]"
            }`}
        >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${toneClasses[tone]}`}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black uppercase leading-3 text-[#526260] sm:text-[10px]">{title}</p>
                <p className="mt-1 text-xl font-black leading-none text-[#102426] sm:text-2xl">{value}</p>
                <p className="mt-1 line-clamp-1 text-[9px] font-semibold leading-3 text-[#526260] sm:text-[10px]">
                    {subtitle}
                </p>
            </div>
        </Component>
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

function hasVisibleSpecial(special) {
    return Boolean(special && special !== "Special not listed");
}

const BULK_PROPERTY_IMPORT_SAMPLE = `Property Name,Management Company,Address,City,State,ZIP,Year Built,Status,Floor Plan,Bedrooms,Bathrooms,Sqft,Starting Rent,Monthly Fees,Special,Free Weeks,Available Units,Available Date,Property Photo URLs,Floor Plan Photo URLs
Example Dallas Apartments,Example Management,123 Main St,Dallas,TX,75201,2020,Live,A1,1,1,720,1795,158,8 weeks free,8,6,07/15/2026,https://example.com/gallery-1.jpg|https://example.com/gallery-2.jpg,https://example.com/a1-plan.jpg
Example Dallas Apartments,Example Management,123 Main St,Dallas,TX,75201,2020,Live,B2,2,2,1040,2295,188,6 weeks free,6,0,,,https://example.com/b2-plan.jpg`;

function parseBulkPropertyImportRows(value) {
    const rows = String(value || "")
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);
    const dataRows = rows.filter((row, index) => !isBulkPropertyHeaderRow(row, index));
    const propertyMap = new Map();

    dataRows.forEach((row) => {
        const columns = splitCsvColumns(row);
        const propertyName = columns[0]?.trim();

        if (!propertyName) return;

        const propertyKey = propertyName.toLowerCase();
        const existingProperty =
            propertyMap.get(propertyKey) || createBulkPropertyDraft(columns);
        const floorPlan = createBulkFloorPlanDraft(columns, existingProperty.floorPlans.length);

        existingProperty.photos = mergeBulkPhotoLists(
            existingProperty.photos,
            createBulkPhotoList(getBulkPropertyPhotoUrls(columns))
        );
        existingProperty.floorPlans.push(floorPlan);
        propertyMap.set(propertyKey, existingProperty);
    });

    return [...propertyMap.values()].map((property) => {
        const primaryFloorPlan = property.floorPlans[0] || {};

        return {
            ...property,
            rent: primaryFloorPlan.startingRent || "",
            requiredMonthlyFees: primaryFloorPlan.requiredMonthlyFees || "",
            special: primaryFloorPlan.currentSpecial || "",
            bedrooms: [
                ...new Set(property.floorPlans.map((floorPlan) => floorPlan.bedrooms).filter(Boolean)),
            ],
        };
    });
}

function createBulkPropertyDraft(columns) {
    const [
        name,
        managementCompany,
        address,
        city,
        state,
        zipcode,
        yearBuilt,
        status,
    ] = columns;

    return {
        name: name?.trim() || "",
        managementCompany: managementCompany?.trim() || "",
        manager: managementCompany?.trim() || "",
        address: address?.trim() || "",
        city: city?.trim() || "Dallas",
        state: state?.trim() || "TX",
        zipcode: zipcode?.trim() || "",
        yearBuilt: yearBuilt?.trim() || "",
        status: normalizeBulkPropertyStatus(status),
        photos: createBulkPhotoList(getBulkPropertyPhotoUrls(columns)),
        floorPlans: [],
    };
}

function createBulkFloorPlanDraft(columns, index) {
    const [
        ,
        ,
        ,
        ,
        ,
        ,
        ,
        ,
        floorPlanName,
        bedrooms,
        bathrooms,
        squareFeet,
        startingRent,
        monthlyFees,
        special,
        freeWeeks,
        availableUnits,
        availableDate,
        propertyPhotoUrls,
        floorPlanPhotoUrls,
    ] = columns;
    const cleanStartingRent = formatBulkCurrency(startingRent);
    const unitCount = getBulkAvailableUnitCount(availableUnits);
    const isAvailable = unitCount > 0;
    const cleanFreeWeeks = String(freeWeeks || "").trim() || getWeeksFromSpecialLabel(special);
    const normalizedAvailableDate = normalizeBulkDate(availableDate);

    return {
        id: `bulk-floor-plan-${Date.now()}-${index}`,
        name: floorPlanName?.trim() || `Floor Plan ${index + 1}`,
        bedrooms: bedrooms?.trim() || "",
        beds: bedrooms?.trim() || "",
        bathrooms: bathrooms?.trim() || "",
        baths: bathrooms?.trim() || "",
        squareFeet: squareFeet?.trim() || "",
        sqft: squareFeet?.trim() || "",
        startingRent: cleanStartingRent,
        rent: cleanStartingRent,
        requiredMonthlyFees: formatBulkCurrency(monthlyFees),
        totalMonthlyRent: cleanStartingRent,
        currentSpecial: special?.trim() || "",
        freeWeeks: cleanFreeWeeks,
        leaseTermMonths: "12",
        photos: createBulkPhotoList(getBulkFloorPlanPhotoUrls({
            propertyPhotoUrls,
            floorPlanPhotoUrls,
        }), "Floor Plan"),
        available: isAvailable ? `${unitCount} Available` : "Not Currently Available",
        availability: isAvailable ? `${unitCount} Available` : "Not Currently Available",
        availableDate: isAvailable ? normalizedAvailableDate : "Not Currently Available",
        availableUnits: isAvailable ? Array.from({ length: unitCount }, (_, unitIndex) => ({
            id: `bulk-availability-${Date.now()}-${index}-${unitIndex}`,
            unit: unitCount === 1 ? "" : `Option ${unitIndex + 1}`,
            availableDate: normalizedAvailableDate,
            rent: cleanStartingRent,
            status: "available",
            specialMode: cleanFreeWeeks ? "custom" : "floorPlan",
            freeWeeks: cleanFreeWeeks,
            adminFeeSpecial: "",
            adminFeeSpecialType: "admin",
            notes: "",
        })) : [],
        status: isAvailable ? "available" : "unavailable",
    };
}

function validateBulkPropertyDrafts(properties) {
    const errors = [];

    properties.forEach((property) => {
        if (!property.name) {
            errors.push("Every property needs a property name.");
        }

        if (!property.address && !property.city) {
            errors.push(`${property.name || "A property"} needs at least an address or city.`);
        }

        if (!property.floorPlans.length) {
            errors.push(`${property.name || "A property"} needs at least one floor plan row.`);
        }

        property.floorPlans.forEach((floorPlan) => {
            const planLabel = `${property.name || "Property"} / ${floorPlan.name || "Floor plan"}`;

            if (!floorPlan.name) {
                errors.push(`${planLabel} needs a floor plan name.`);
            }

            if (!floorPlan.rent) {
                errors.push(`${planLabel} needs starting rent.`);
            }
        });
    });

    return [...new Set(errors)];
}

function getBulkPropertyPhotoUrls(columns) {
    return columns[18] || "";
}

function getBulkFloorPlanPhotoUrls({ propertyPhotoUrls, floorPlanPhotoUrls }) {
    return floorPlanPhotoUrls || propertyPhotoUrls || "";
}

function getBulkAvailableUnitCount(value) {
    const normalizedValue = String(value || "").trim().toLowerCase();

    if (
        !normalizedValue ||
        normalizedValue === "0" ||
        normalizedValue.includes("unavailable") ||
        normalizedValue.includes("not currently") ||
        normalizedValue.includes("none")
    ) {
        return 0;
    }

    const match = normalizedValue.match(/\d+/);
    return match ? Number(match[0]) : 0;
}

function mergeBulkPhotoLists(currentPhotos = [], nextPhotos = []) {
    const photosByUrl = new Map();

    [...currentPhotos, ...nextPhotos].forEach((photo) => {
        if (!photo?.url) return;
        photosByUrl.set(photo.url, photo);
    });

    return [...photosByUrl.values()];
}

function isBulkPropertyHeaderRow(row, index) {
    if (index !== 0) return false;

    return /property\s*name/i.test(row) && /floor\s*plan/i.test(row);
}

function splitCsvColumns(row) {
    const columns = [];
    let currentColumn = "";
    let isQuoted = false;

    for (const character of row) {
        if (character === '"') {
            isQuoted = !isQuoted;
            continue;
        }

        if (character === "," && !isQuoted) {
            columns.push(currentColumn.trim());
            currentColumn = "";
            continue;
        }

        currentColumn += character;
    }

    columns.push(currentColumn.trim());
    return columns;
}

function createBulkPhotoList(value, category = "Property") {
    return String(value || "")
        .split("|")
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url, index) => ({
            id: `bulk-photo-${Date.now()}-${index}`,
            name: `${category} photo ${index + 1}`,
            category,
            url,
        }));
}

function normalizeBulkPropertyStatus(value) {
    const status = String(value || "").trim();

    if (["Live", "Draft", "Pending Review"].includes(status)) return status;

    return "Draft";
}

function formatBulkCurrency(value) {
    const amount = Number(String(value || "").replace(/[^0-9.]/g, ""));

    if (!amount) return "";

    return `$${Math.round(amount).toLocaleString()}`;
}

function normalizeBulkDate(value) {
    const dateValue = String(value || "").trim();
    if (!dateValue) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;

    const match = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!match) return dateValue;

    const [, month, day, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;

    return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getWeeksFromSpecialLabel(value) {
    const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*weeks?\s*free/i);

    return match ? String(match[1]) : "";
}

function getPropertyFloorPlans(property) {
    const candidates = [
        property?.floorPlans,
        property?.floor_plans,
        property?.layouts,
    ];

    return candidates.find((value) => Array.isArray(value)) || [];
}

function getPropertyPhotoRecords(property) {
    const candidates = [
        property?.photos,
        property?.galleryPhotos,
        property?.gallery,
        property?.images,
    ];
    const photos = candidates.find((value) => Array.isArray(value)) || [];

    return photos.filter((photo) => {
        if (typeof photo === "string") return Boolean(photo.trim());
        return Boolean(photo?.url || photo?.src || photo?.imageUrl);
    });
}

function getPropertyPreviewPhoto(property) {
    const firstPhoto = getPropertyPhotoRecords(property)[0];

    if (typeof firstPhoto === "string") return firstPhoto;

    return firstPhoto?.url || firstPhoto?.src || firstPhoto?.imageUrl || "";
}

function getFloorPlanAvailableUnitCount(floorPlan) {
    if (Array.isArray(floorPlan?.availableUnits)) {
        return floorPlan.availableUnits.filter((unit) => {
            const status = String(unit?.status || "").toLowerCase();
            return !status || status === "available";
        }).length;
    }

    if (Number.isFinite(Number(floorPlan?.availableUnits))) {
        return Math.max(0, Number(floorPlan.availableUnits));
    }

    const availabilityText = [
        floorPlan?.availability,
        floorPlan?.available,
        floorPlan?.availableUnits,
    ].filter(Boolean).join(" ");
    const match = availabilityText.match(/\d+/);

    if (match) return Number(match[0]);
    if (/available/i.test(availabilityText) && !/unavailable|not currently/i.test(availabilityText)) return 1;

    return 0;
}

function getRentAmounts(value) {
    return (String(value || "").match(/\d[\d,]*(?:\.\d+)?/g) || [])
        .map((amount) => Number(amount.replace(/,/g, "")))
        .filter(Number.isFinite);
}

function getPropertyHealth(property) {
    const floorPlans = getPropertyFloorPlans(property);
    const photoCount = getPropertyPhotoRecords(property).length;
    const availableUnits = floorPlans.reduce(
        (total, floorPlan) => total + getFloorPlanAvailableUnitCount(floorPlan),
        0
    );
    const managerName = property?.managementCompany || property?.manager;
    const hasLocation = Boolean(property?.address || property?.city || property?.area);
    const rentAmounts = getRentAmounts(property?.rent);
    const minimumRent = rentAmounts.length ? Math.min(...rentAmounts) : 0;
    const maximumRent = rentAmounts.length ? Math.max(...rentAmounts) : 0;
    const suspiciousRent = maximumRent > 10000 ||
        (minimumRent > 0 && maximumRent / minimumRent > 4);
    const issues = [];
    let missingDataCount = 0;

    if (!hasLocation) {
        issues.push("Location missing");
        missingDataCount += 1;
    }
    if (!managerName) {
        issues.push("Management company missing");
        missingDataCount += 1;
    }
    if (!photoCount) {
        issues.push("Gallery photos missing");
        missingDataCount += 1;
    }
    if (!floorPlans.length) {
        issues.push("Floor plans missing");
        missingDataCount += 1;
    }
    if (!rentAmounts.length) {
        issues.push("Listed rent missing");
        missingDataCount += 1;
    }
    if (suspiciousRent) issues.push("Rent range needs verification");
    if (floorPlans.length && availableUnits === 0) issues.push("No available units");
    if (property?.status !== "Live") issues.push("Listing is not live");

    const severity =
        missingDataCount >= 2 || suspiciousRent
            ? "danger"
            : issues.length
                ? "warning"
                : "ready";
    const label =
        severity === "ready"
            ? "Ready"
            : suspiciousRent
                ? "Check pricing"
                : missingDataCount
                    ? `${missingDataCount} missing`
                    : availableUnits === 0
                        ? "No availability"
                        : "Review";

    return {
        availableUnits,
        floorPlanCount: floorPlans.length,
        issues,
        label,
        missingDataCount,
        photoCount,
        priority: severity === "danger" ? 3 : severity === "warning" ? 2 : 1,
        severity,
    };
}

function getUpdatedRawValue(property) {
    return property?.updatedAt ||
        property?.updated_at ||
        property?.lastVerifiedAt ||
        property?.lastVerified ||
        property?.updated ||
        "";
}

function getUpdatedTimestamp(property) {
    const value = getUpdatedRawValue(property);
    const timestamp = Date.parse(value);

    return Number.isFinite(timestamp) ? timestamp : 0;
}

function getUpdatedLabel(property) {
    const timestamp = getUpdatedTimestamp(property);

    if (!timestamp) return "Not recorded";

    const elapsedDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
    if (elapsedDays === 0) return "Today";
    if (elapsedDays === 1) return "Yesterday";
    if (elapsedDays < 30) return `${elapsedDays} days ago`;

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: new Date(timestamp).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    }).format(new Date(timestamp));
}

function formatAdminRent(value) {
    const rawValue = String(value || "").trim();

    if (!rawValue) return "Not listed";
    if (rawValue.includes("$")) return rawValue;

    const amounts = getRentAmounts(rawValue);
    if (!amounts.length) return rawValue;

    return amounts
        .map((amount) => `$${Math.round(amount).toLocaleString()}`)
        .join(amounts.length > 1 ? " - " : "");
}

function PropertyRow({ property, health, onMakeLive, onDelete }) {
    const {
        id,
        name,
        area,
        city,
        state,
        zipcode,
        zip,
        manager,
        managementCompany,
        rent,
        status,
        special,
    } = property;
    const initials = String(name || "Property")
        .split(" ")
        .map((word) => word[0])
        .join("")
        .slice(0, 2);
    const location = [city, state, zipcode || zip].filter(Boolean).join(", ") || area || "Location missing";
    const photoUrl = getPropertyPreviewPhoto(property);
    const managerName = managementCompany || manager;
    const updatedLabel = getUpdatedLabel(property);
    const readinessClasses = {
        ready: "bg-[#e7f3ee] text-[#1f6f63] ring-[#a9cfc2]",
        warning: "bg-[#fff8e6] text-[#8a5b0a] ring-[#f2d08a]",
        danger: "bg-[#fff0ea] text-[#b42318] ring-[#f4b6aa]",
    };

    return (
        <div className="grid gap-3 bg-white p-3 text-left transition hover:bg-[#fbfdfb] sm:p-4 xl:grid-cols-[minmax(210px,1.35fr)_95px_90px_100px_minmax(115px,0.85fr)_80px_100px] xl:items-center xl:gap-3">
            <div className="flex min-w-0 gap-3">
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[#173f3f] ring-1 ring-[#d7e6df]">
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-black text-[#f2b84b]">
                            {initials}
                        </span>
                    )}
                </div>
                <div className="min-w-0 py-0.5">
                    <p className="truncate text-sm font-black text-[#102426] sm:text-base" title={name}>{name}</p>
                    <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-semibold text-[#526260]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1f6f63]" />
                        <span className="truncate">{location}</span>
                        <span className={`ml-1 shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ${getStatusClasses(status)}`}>
                            {status || "Draft"}
                        </span>
                    </p>
                    <p className={`mt-1 truncate text-[11px] font-semibold ${managerName ? "text-[#78908a]" : "text-[#b42318]"}`}>
                        {managerName ? `Managed by ${managerName}` : "Management company missing"}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:contents">
                <PropertyRowMetric
                    label="Readiness"
                    value={health.label}
                    className={readinessClasses[health.severity]}
                    title={health.issues.join(", ") || "Listing data looks ready"}
                />
                <PropertyRowMetric
                    label="Listed rent"
                    value={formatAdminRent(rent)}
                    className="bg-[#f5f8f1] text-[#102426] ring-[#d7e6df]"
                />
                <PropertyRowMetric
                    label="Floor plans"
                    value={`${health.floorPlanCount} plan${health.floorPlanCount === 1 ? "" : "s"}`}
                    helper={`${health.availableUnits} unit${health.availableUnits === 1 ? "" : "s"} available`}
                    className="bg-white text-[#102426] ring-[#d7e6df]"
                />
                <PropertyRowMetric
                    label="Special"
                    value={hasVisibleSpecial(special) ? special : "None listed"}
                    className={hasVisibleSpecial(special)
                        ? "bg-[#fff8e6] text-[#8a5b0a] ring-[#f2d08a]"
                        : "bg-white text-[#526260] ring-[#d7e6df]"}
                />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#edf4ef] pt-3 xl:block xl:border-0 xl:pt-0">
                <div>
                    <p className="text-[9px] font-black uppercase text-[#78908a]">Last verified</p>
                    <p className="mt-1 text-xs font-bold text-[#526260]" title={getUpdatedRawValue(property)}>
                        {updatedLabel}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 xl:mt-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#78908a]">
                        <Image className="h-3 w-3" />
                        {health.photoCount}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#78908a]">
                        <Layers3 className="h-3 w-3" />
                        {health.floorPlanCount}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 xl:justify-end">
                <Link
                    to={`/admin/properties/${id}/edit`}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#173f3f] px-3 text-xs font-black text-white hover:bg-[#102426] xl:flex-none"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Manage
                </Link>
                <PropertyActions
                    id={id}
                    name={name}
                    status={status}
                    onMakeLive={onMakeLive}
                    onDelete={onDelete}
                />
            </div>
        </div>
    );
}

function PropertyRowMetric({ label, value, helper, className, title }) {
    return (
        <div className={`min-w-0 rounded-lg px-2.5 py-2 ring-1 xl:bg-transparent xl:px-0 xl:py-0 xl:ring-0 ${className}`} title={title}>
            <p className="text-[9px] font-black uppercase text-[#78908a]">{label}</p>
            <p className="mt-1 line-clamp-2 text-xs font-black leading-4">{value || "Not listed"}</p>
            {helper && <p className="mt-0.5 truncate text-[10px] font-semibold text-[#78908a]">{helper}</p>}
        </div>
    );
}

function PropertyActions({ id, name, status, onMakeLive, onDelete }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#f5f8f1]"
                aria-label={`More actions for ${name}`}
                aria-expanded={isOpen}
            >
                <MoreHorizontal className="h-4 w-4" />
            </button>
            {isOpen && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-30 cursor-default"
                        aria-label="Close property actions"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute bottom-11 right-0 z-40 w-44 overflow-hidden rounded-xl border border-[#d7e6df] bg-white p-1.5 shadow-xl xl:bottom-auto xl:top-11">
                        <Link
                            to={`/admin/properties/${id}`}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#173f3f] hover:bg-[#f5f8f1]"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            View listing
                        </Link>
                        {status !== "Live" && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    onMakeLive();
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-[#173f3f] hover:bg-[#f5f8f1]"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Make live
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                onDelete();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-[#b42318] hover:bg-[#fff0ea]"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete property
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
