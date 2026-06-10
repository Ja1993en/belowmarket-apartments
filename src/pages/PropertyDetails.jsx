import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { getAllLeads } from "../data/leadStorage";
import { getPhotoImageUrl } from "../data/propertySearchData";
import { getAnyPropertyById, updateStoredProperty } from "../data/propertyStorage";

export default function PropertyDetails() {
    const { propertyId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const startsInEditMode = searchParams.get("edit") === "true";
const [activeTab, setActiveTab] = useState("overview");
const [property, setProperty] = useState(() => getAnyPropertyById(propertyId));
const [isEditing, setIsEditing] = useState(startsInEditMode);
    const [propertyDraft, setPropertyDraft] = useState({
        name: property?.name || "",
        area: property?.area || "",
        rent: property?.rent || "",
        status: property?.status || "Draft",
    });

    const [saveMessage, setSaveMessage] = useState("");

    const hasUnsavedChanges =
        propertyDraft.name !== property?.name ||
        propertyDraft.area !== property?.area ||
        propertyDraft.rent !== property?.rent ||
        propertyDraft.status !== property?.status;

    const propertyLeads = getAllLeads().filter((lead) =>
        lead.recommendedPropertyIds?.includes(propertyId)
    );
    const propertyLeadCount = propertyLeads.length;

    const savePropertyChanges = () => {
        const updatedProperty = updateStoredProperty(property.id, propertyDraft);

        setProperty(updatedProperty);
        setPropertyDraft({
            name: updatedProperty.name || "",
            area: updatedProperty.area || "",
            rent: updatedProperty.rent || "",
            status: updatedProperty.status || "Draft",
        });
        setSaveMessage("Property changes saved.");
        setIsEditing(false);
        setSearchParams({}, { replace: true });
    };

    if (!property) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="text-3xl font-black text-slate-900">
                    Property not found
                </h1>

                <p className="mt-2 text-slate-500">
                    This property ID does not match any property in your current data.
                </p>

                <Link
                    to="/admin/properties"
                    className="mt-6 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                    Back to Properties
                </Link>
            </div>
        );
    }

    const propertyFloorPlans = normalizePropertyFloorPlans(property);
    const propertySpecials = getPropertySpecials(property);
    const propertyPhotos = getPropertyPhotos(property);
    const propertyActivity = [];
    const propertyNotes = [];

    return (
        <div>
            <Link
                to="/admin/properties"
                className="inline-block rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
                ← Back to Properties
            </Link>

            <div className="mt-6 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
                <p className="text-sm font-bold text-slate-300">
                    Property Portal
                </p>

                <h1 className="mt-2 text-4xl font-black">
                    {isEditing ? propertyDraft.name : property.name}
                </h1>

                <p className="mt-2 text-slate-300">
                    Manage this property's overview, floor plans, specials, photos, and leads.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link
                        to={`/properties/${property.id}`}
                        className="inline-block rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
                    >
                        {(isEditing ? propertyDraft.status : property.status) === "Live"
                            ? "Preview Public Listing"
                            : "Preview Unavailable Page"}
                    </Link>




                    <button
                        type="button"
                        onClick={() => {
                            setIsEditing((current) => {
                                const nextEditing = !current;

                                if (nextEditing) {
                                    setSearchParams({ edit: "true" }, { replace: true });
                                } else {
                                    setPropertyDraft({
                                        name: property?.name || "",
                                        area: property?.area || "",
                                        rent: property?.rent || "",
                                        status: property?.status || "Draft",
                                    });
                                    setSearchParams({}, { replace: true });
                                }

                                return nextEditing;
                            });
                        }} className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
                    >
                        {isEditing ? "Cancel Editing" : "Edit Property"}
                    </button>

                    {(isEditing ? propertyDraft.status : property.status) !== "Live" && (
                        <span className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-300">
                            Not visible to renters until status is Live
                        </span>
                    )}
                </div>

                {saveMessage && (
                    <p className="mt-4 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-700">
                        {saveMessage}
                    </p>
                )}
            </div>

            {isEditing && (
                <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-700">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                            <p>
                                Editing {propertyDraft.name || "this property"}. Review your changes before saving.
                            </p>
                            {hasUnsavedChanges && (
                                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700">
                                    Unsaved changes
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={savePropertyChanges}
                                disabled={!hasUnsavedChanges}
                                className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                Save Changes
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPropertyDraft({
                                        name: property?.name || "",
                                        area: property?.area || "",
                                        rent: property?.rent || "",
                                        status: property?.status || "Draft",
                                    });
                                    setIsEditing(false);
                                    setSearchParams({}, { replace: true });
                                }}
                                className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-4">
                <DetailCard title="Floor Plans" value={propertyFloorPlans.length} />
                <DetailCard title="Available Units" value={getAvailableUnitCount(propertyFloorPlans)} />
                <DetailCard title="Active Specials" value={propertySpecials.length} />
                <DetailCard title="Leads Sent" value={propertyLeadCount} />
            </div>


            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

                <div className="mt-8 flex gap-2 overflow-x-auto rounded-3xl bg-white p-2 shadow-sm">
                    <PropertyTab label="Overview" value="overview" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <PropertyTab label="Floor Plans" value="floorPlans" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <PropertyTab label="Specials" value="specials" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <PropertyTab label="Photos" value="photos" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <PropertyTab label="Leads" value="leads" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <PropertyTab label="Settings" value="settings" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <PropertyTab label="Activity" value="activity" activeTab={activeTab} setActiveTab={setActiveTab} />
                    <PropertyTab label="Notes" value="notes" activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>

                <h2 className="text-2xl font-black text-slate-900">
                    Property Workspace
                </h2>

                {activeTab === "overview" && (
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {isEditing ? (
                            <label className="rounded-2xl bg-slate-50 p-4">
                                <span className="text-sm font-semibold text-slate-500">
                                    Property Name
                                </span>

                                <input
                                    type="text"
                                    value={propertyDraft.name}
                                    onChange={(event) =>
                                        setPropertyDraft({
                                            ...propertyDraft,
                                            name: event.target.value,
                                        })
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
                                />
                            </label>
                        ) : (
                            <InfoBox label="Property Name" value={property.name} />
                        )}
                        {isEditing ? (
                            <label className="rounded-2xl bg-slate-50 p-4">
                                <span className="text-sm font-semibold text-slate-500">
                                    Market Area
                                </span>

                                <input
                                    type="text"
                                    value={propertyDraft.area}
                                    onChange={(event) =>
                                        setPropertyDraft({
                                            ...propertyDraft,
                                            area: event.target.value,
                                        })
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
                                />
                            </label>
                        ) : (
                            <InfoBox label="Market Area" value={property.area} />
                        )}                        <InfoBox label="Property Manager" value={property.manager} />
                        <InfoBox label="Year Built" value={property.yearBuilt || "Not set"} />
                        {isEditing ? (
                            <label className="rounded-2xl bg-slate-50 p-4">
                                <span className="text-sm font-semibold text-slate-500">
                                    Listing Status
                                </span>

                                <select
                                    value={propertyDraft.status}
                                    onChange={(event) =>
                                        setPropertyDraft({
                                            ...propertyDraft,
                                            status: event.target.value,
                                        })
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
                                >
                                    <option>Live</option>
                                    <option>Pending Review</option>
                                    <option>Draft</option>
                                </select>
                            </label>
                        ) : (
                            <InfoBox label="Listing Status" value={property.status} />
                        )}                        {isEditing ? (
                            <label className="rounded-2xl bg-slate-50 p-4">
                                <span className="text-sm font-semibold text-slate-500">
                                    Starting Rent
                                </span>

                                <input
                                    type="text"
                                    value={propertyDraft.rent}
                                    onChange={(event) =>
                                        setPropertyDraft({
                                            ...propertyDraft,
                                            rent: event.target.value,
                                        })
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 outline-none focus:border-slate-400"
                                />
                            </label>
                        ) : (
                            <InfoBox label="Starting Rent" value={property.rent} />
                        )}                        <InfoBox label="Last Updated" value={property.updated} />
                    </div>
                )}

                {activeTab === "floorPlans" && (
                    <div className="mt-6">
                        <div className="mb-4 flex justify-end">
                            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                                + Add Floor Plan
                            </button>
                        </div>

                        {propertyFloorPlans.length > 0 ? (
                            <div className="space-y-3">
                                {propertyFloorPlans.map((plan) => (
                                <FloorPlanRow
                                    key={plan.name}
                                    name={plan.name}
                                    beds={plan.beds}
                                    baths={plan.baths}
                                    sqft={plan.sqft}
                                    rent={plan.rent}
                                    effectiveRent={plan.effectiveRent}
                                    marketRent={plan.marketRent}
                                    savings={plan.savings}
                                    belowMarketPercent={plan.belowMarketPercent}
                                    currentSpecial={plan.currentSpecial}
                                    available={plan.available}
                                />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="No floor plans have been added for this property yet." />
                        )}
                    </div>
                )}


                {activeTab === "leads" && (
                    <div className="mt-6">
                        <div className="mb-4 flex justify-end">
                            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                                View All Property Leads
                            </button>
                        </div>

                        {propertyLeads.length > 0 ? (
                            <div className="space-y-3">
                                {propertyLeads.map((lead) => (
                                <PropertyLeadRow
                                    key={lead.id || lead.name}
                                    name={lead.name}
                                    status={lead.status}
                                    locator={lead.assignedTo || "Not assigned"}
                                />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="No renter leads have been connected to this property yet." />
                        )}
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="mt-6">
                        <div className="mb-4 flex justify-end">
                            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                                Edit Settings
                            </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <InfoBox label="Property Website" value={property.website || "Not set"} />
                            <InfoBox label="Leasing Phone" value={property.leasingPhone || property.phone || "Not set"} />
                            <InfoBox label="Leasing Email" value={property.leasingEmail || property.email || "Not set"} />
                            <InfoBox
                                label="Management Company"
                                value={property.managementCompany || property.manager}
                            />
                            <InfoBox label="Property Status" value={property.status} />
                            <InfoBox label="Pet Policy" value={property.petPolicy || "Not set"} />
                        </div>
                    </div>
                )}


                {activeTab === "specials" && (
                    <div className="mt-6">
                        <div className="mb-4 flex justify-end">
                            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                                + Add Special
                            </button>
                        </div>

                        {propertySpecials.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-3">
                                {propertySpecials.map((special) => (
                                <SpecialCard
                                    key={special.title}
                                    title={special.title}
                                    type={special.type}
                                />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="No specials have been added for this property yet." />
                        )}
                    </div>
                )}

                {activeTab === "photos" && (
                    <div className="mt-6">
                        <div className="mb-4 flex justify-end">
                            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                                + Upload Photo
                            </button>
                        </div>

                        {propertyPhotos.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-3">
                                {propertyPhotos.map((photo) => (
                                <PhotoCard
                                    key={photo.label}
                                    label={photo.label}
                                    image={photo.image}
                                />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="No photos have been uploaded for this property yet." />
                        )}
                    </div>
                )}


                {activeTab === "activity" && (
                    <div className="mt-6 space-y-3">
                        {propertyActivity.length > 0 ? (
                            propertyActivity.map((activity) => (
                                <ActivityRow
                                    key={activity.title}
                                    title={activity.title}
                                    description={activity.description}
                                    time={activity.time}
                                />
                            ))
                        ) : (
                            <EmptyTabState message="No activity has been logged for this property yet." />
                        )}

                    </div>

                )}

                {activeTab === "notes" && (
                    <div className="mt-6">
                        <div className="mb-4 flex justify-end">
                            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                                + Add Note
                            </button>
                        </div>

                        {propertyNotes.length > 0 ? (
                            <div className="space-y-3">
                                {propertyNotes.map((item) => (
                                <NoteRow
                                    key={item.note}
                                    note={item.note}
                                    author={item.author}
                                    time={item.time}
                                />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="No notes have been added for this property yet." />
                        )}
                    </div>
                )}


            </div>
        </div>
    );
}

function DetailCard({ title, value }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
                {title}
            </p>

            <h2 className="mt-3 text-4xl font-black text-slate-900">
                {value}
            </h2>
        </div>
    );
}

function PropertyTab({ label, value, activeTab, setActiveTab }) {
    const isActive = activeTab === value;

    return (
        <button
            onClick={() => setActiveTab(value)}
            className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold ${isActive
                ? "bg-slate-950 text-white"
                : "text-slate-500 hover:bg-slate-100"
                }`}
        >
            {label}
        </button>
    );
}

function InfoBox({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">
                {label}
            </p>

            <p className="mt-2 font-black text-slate-900">
                {value}
            </p>
        </div>
    );
}

function EmptyTabState({ message }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-bold text-slate-500">{message}</p>
        </div>
    );
}

function FloorPlanRow({
    name,
    beds,
    baths,
    sqft,
    rent,
    effectiveRent,
    marketRent,
    savings,
    belowMarketPercent,
    currentSpecial,
    available,
}) {
    return (
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center">
            <div>
                <p className="text-lg font-black text-slate-900">{name}</p>
                <p className="mt-1 text-sm text-slate-500">
                    {beds} • {baths} • {sqft}
                </p>
                {currentSpecial && (
                    <p className="mt-2 text-sm font-bold text-emerald-700">
                        {currentSpecial}
                    </p>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    Starting {rent}
                </span>

                {effectiveRent && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                        Effective {effectiveRent}
                    </span>
                )}

                {marketRent && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                        Market {marketRent}
                    </span>
                )}

                {savings && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        Save {savings}
                    </span>
                )}

                {belowMarketPercent && (
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                        {belowMarketPercent} below
                    </span>
                )}

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    {available}
                </span>

                <div className="flex gap-2">
                    <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                        Edit
                    </button>

                    <button className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200">
                        Delete
                    </button>
                </div>

            </div>
        </div>
    );
}

function normalizePropertyFloorPlans(property) {
    if (!property?.floorPlans?.length) {
        return [];
    }

    return property.floorPlans.map((plan, index) => {
        if (typeof plan === "string") {
            return {
                name: plan,
                beds: property.bedrooms?.[0] || "Not set",
                baths: "Not set",
                sqft: "Not set",
                rent: property.rent || "Contact for pricing",
                effectiveRent: property.effectiveRent || "",
                marketRent: property.marketRent || "",
                savings: property.savings || "",
                belowMarketPercent: property.belowMarketPercent || "",
                currentSpecial: property.special || "",
                available: "Not set",
            };
        }

        return {
            name: plan.name || `Floor Plan ${index + 1}`,
            beds: plan.bedrooms || plan.beds || "Not set",
            baths: plan.bathrooms || plan.baths || "Not set",
            sqft: plan.squareFeet || plan.sqft || "Not set",
            rent: plan.startingRent || plan.rent || "Contact for pricing",
            effectiveRent: plan.effectiveRent || "",
            marketRent: plan.marketRent || "",
            savings: plan.savings || "",
            belowMarketPercent: plan.belowMarketPercent || "",
            currentSpecial: plan.currentSpecial || plan.special?.label || "",
            available: plan.availability || plan.available || "Not set",
        };
    });
}

function getPropertySpecials(property) {
    const specialLabels = new Set();

    if (hasVisibleSpecial(property?.special)) {
        specialLabels.add(property.special);
    }

    (property?.floorPlans || []).forEach((plan) => {
        if (typeof plan === "string") return;

        [
            plan.currentSpecial,
            plan.special?.label,
            plan.special2?.label,
            plan.specialLabel,
        ].forEach((specialLabel) => {
            if (hasVisibleSpecial(specialLabel)) {
                specialLabels.add(specialLabel);
            }
        });
    });

    return [...specialLabels].map((specialLabel) => ({
        title: specialLabel,
        type: "Current Special",
    }));
}

function hasVisibleSpecial(value) {
    const normalizedValue = String(value || "").trim().toLowerCase();

    return Boolean(
        normalizedValue &&
            normalizedValue !== "special not listed" &&
            normalizedValue !== "none"
    );
}

function getPropertyPhotos(property) {
    return (property?.photos || [])
        .map((photo, index) => ({
            label: photo.label || photo.name || `Photo ${index + 1}`,
            image: getPhotoImageUrl(photo),
        }))
        .filter((photo) => photo.image);
}

function getAvailableUnitCount(floorPlans) {
    const availableCount = floorPlans.reduce((count, plan) => {
        const availableNumber = Number(String(plan.available || "").match(/\d+/)?.[0] || 0);

        return count + availableNumber;
    }, 0);

    return availableCount || 0;
}

function SpecialCard({ title, type }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-lg font-black text-slate-900">{title}</p>

            <p className="mt-1 text-sm text-slate-500">{type}</p>

            <div className="mt-5 flex gap-2">
                <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                    Edit
                </button>

                <button className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200">
                    Delete
                </button>
            </div>

        </div>
    );
}

function PhotoCard({ label, image }) {
    return (
        <div className="overflow-hidden rounded-2xl bg-slate-50">
            <img
                src={image}
                alt={label}
                className="h-48 w-full object-cover"
            />

            <div className="p-4">
                <p className="font-bold text-slate-900">{label}</p>

                <div className="mt-4 flex gap-2">
                    <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                        Set Cover
                    </button>

                    <button className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function PropertyLeadRow({ name, status, locator }) {
    return (
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center">
            <div>
                <p className="font-bold text-slate-900">{name}</p>
                <p className="mt-1 text-sm text-slate-500">
                    Sent by {locator}
                </p>
            </div>

            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                {status}
            </span>
        </div>
    );
}

function ActivityRow({ title, description, time }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                    <p className="font-bold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>

                <span className="text-xs font-bold text-slate-400">{time}</span>
            </div>
        </div>
    );
}

function NoteRow({ note, author, time }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                    <p className="font-semibold text-slate-900">{note}</p>

                    <p className="mt-2 text-sm text-slate-500">
                        {author} • {time}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                        Edit
                    </button>

                    <button className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
