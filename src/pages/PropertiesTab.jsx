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
    const [autoMigrationAttempted, setAutoMigrationAttempted] = useState(false);
    const [bulkPropertyText, setBulkPropertyText] = useState("");
    const [isImportingProperties, setIsImportingProperties] = useState(false);
    const refreshProperties = async () => {
        try {
            setIsLoadingProperties(true);
            const savedProperties = await getAllProperties();
            const currentLegacyCount = getLegacyLocalPropertyCount({
                includeMigrated: true,
            });

            if (savedProperties.length === 0 && currentLegacyCount > 0 && !autoMigrationAttempted) {
                setAutoMigrationAttempted(true);
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
    };

    useEffect(() => {
        const loadTimer = window.setTimeout(() => {
            refreshProperties();
        }, 0);

        return () => window.clearTimeout(loadTimer);
    }, []);

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

        if (importedDrafts.length === 0) {
            setNotice("Paste at least one valid property row before importing.");
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

            <div className="mt-8 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                        <p className="text-sm font-black text-[#1f6f63]">
                            Bulk import
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-[#102426]">
                            Paste properties and floor plans
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#526260]">
                            Add multiple Dallas properties from a spreadsheet. Each row creates one floor plan; repeated property names are grouped into the same property. Use photos only when you have permission to publish them.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setBulkPropertyText(BULK_PROPERTY_IMPORT_SAMPLE)}
                        className="w-fit rounded-2xl bg-[#e7f3ee] px-4 py-3 text-sm font-black text-[#173f3f] hover:bg-[#d7e6df]"
                    >
                        Use Sample CSV
                    </button>
                </div>

                <textarea
                    value={bulkPropertyText}
                    onChange={(event) => setBulkPropertyText(event.target.value)}
                    rows={7}
                    placeholder="Property Name,Management Company,Address,City,State,ZIP,Year Built,Status,Floor Plan,Bedrooms,Bathrooms,Sqft,Starting Rent,Monthly Fees,Special,Free Weeks,Available Units,Available Date,Photo URLs"
                    className="mt-5 w-full rounded-2xl border border-[#b8d9d0] bg-[#f5f8f1] px-4 py-3 text-sm font-bold leading-6 text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                />

                <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs font-bold leading-5 text-[#526260]">
                        Columns: Property Name, Management Company, Address, City, State, ZIP, Year Built, Status, Floor Plan, Bedrooms, Bathrooms, Sqft, Starting Rent, Monthly Fees, Special, Free Weeks, Available Units, Available Date, Photo URLs.
                    </p>

                    <button
                        type="button"
                        onClick={importBulkProperties}
                        disabled={isImportingProperties}
                        className="inline-flex items-center justify-center rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-black text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0]"
                    >
                        {isImportingProperties ? "Importing..." : "Import Properties"}
                    </button>
                </div>
            </div>

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

const BULK_PROPERTY_IMPORT_SAMPLE = `Property Name,Management Company,Address,City,State,ZIP,Year Built,Status,Floor Plan,Bedrooms,Bathrooms,Sqft,Starting Rent,Monthly Fees,Special,Free Weeks,Available Units,Available Date,Photo URLs
Example Dallas Apartments,Example Management,123 Main St,Dallas,TX,75201,2020,Live,A1,1,1,720,1795,158,8 weeks free,8,6,07/15/2026,https://example.com/photo-1.jpg|https://example.com/photo-2.jpg
Example Dallas Apartments,Example Management,123 Main St,Dallas,TX,75201,2020,Live,B2,2,2,1040,2295,188,6 weeks free,6,3,08/01/2026,`;

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
        photos: createBulkPhotoList(columns[18]),
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
        photoUrls,
    ] = columns;
    const cleanStartingRent = formatBulkCurrency(startingRent);
    const unitCount = Math.max(Number(String(availableUnits || "").replace(/[^0-9]/g, "")) || 1, 1);
    const cleanFreeWeeks = String(freeWeeks || "").trim() || getWeeksFromSpecialLabel(special);

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
        photos: createBulkPhotoList(photoUrls, "Floor Plan"),
        availableUnits: Array.from({ length: unitCount }, (_, unitIndex) => ({
            id: `bulk-availability-${Date.now()}-${index}-${unitIndex}`,
            unit: unitCount === 1 ? "" : `Option ${unitIndex + 1}`,
            availableDate: normalizeBulkDate(availableDate),
            rent: cleanStartingRent,
            status: "available",
            specialMode: cleanFreeWeeks ? "custom" : "floorPlan",
            freeWeeks: cleanFreeWeeks,
            adminFeeSpecial: "",
            adminFeeSpecialType: "admin",
            notes: "",
        })),
        status: "available",
    };
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
    onMakeLive,
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
                    {status !== "Live" && (
                        <button
                            type="button"
                            onClick={onMakeLive}
                            className="rounded-xl bg-[#f2b84b] px-4 py-2 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
                        >
                            Make Live
                        </button>
                    )}

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
