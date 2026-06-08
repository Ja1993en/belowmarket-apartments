import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { leads } from "../data/mockData";
import { getAnyPropertyById, updateStoredProperty } from "../data/propertyStorage";
const floorPlans = [
    {
        name: "A1",
        beds: "1 Bed",
        baths: "1 Bath",
        sqft: "715 sqft",
        rent: "$1,425",
        available: "4 units",
    },
    {
        name: "B2",
        beds: "2 Bed",
        baths: "2 Bath",
        sqft: "1,095 sqft",
        rent: "$1,995",
        available: "2 units",
    },
    {
        name: "S1",
        beds: "Studio",
        baths: "1 Bath",
        sqft: "585 sqft",
        rent: "$1,299",
        available: "6 units",
    },
];

const specials = [
    {
        title: "6 Weeks Free",
        type: "Rent Concession",
        status: "Active",
    },
    {
        title: "$99 App Fee",
        type: "Application Fee",
        status: "Active",
    },
    {
        title: "Waived Admin Fee",
        type: "Admin Fee",
        status: "Active",
    },
];

const photos = [
    {
        label: "Exterior",
        image:
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
    },
    {
        label: "Pool",
        image:
            "https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=900&q=80",
    },
    {
        label: "Kitchen",
        image:
            "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=900&q=80",
    },
];

const propertyLeads = [
    {
        name: "Ashley Brown",
        status: "Tour Scheduled",
        locator: "Jalen McNeal",
    },
    {
        name: "Marcus Hill",
        status: "Recommendation Sent",
        locator: "Sarah Smith",
    },
    {
        name: "Tierra Lane",
        status: "New Lead",
        locator: "Jalen McNeal",
    },
];

const propertyActivity = [
    {
        title: "Property updated",
        description: "Starting rent changed to $1,425+.",
        time: "Today",
    },
    {
        title: "Special added",
        description: "6 Weeks Free was added as an active special.",
        time: "Yesterday",
    },
    {
        title: "Photo uploaded",
        description: "Exterior photo was added to the gallery.",
        time: "3 days ago",
    },
];

const propertyNotes = [
    {
        note: "Confirmed 6 weeks free special with leasing office.",
        author: "Admin",
        time: "Today",
    },
    {
        note: "Need to verify updated A1 pricing before publishing.",
        author: "Jalen",
        time: "Yesterday",
    },
    {
        note: "Property manager requested new photos be uploaded.",
        author: "Admin",
        time: "3 days ago",
    },
];

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

    const propertyLeadCount = leads.filter((lead) =>
        lead.recommendedPropertyIds.includes(propertyId)
    ).length;

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
                <DetailCard title="Floor Plans" value={property.floorPlans.length} />
                <DetailCard title="Available Units" value="12" />
                <DetailCard title="Active Specials" value={property.special ? 1 : 0} />
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

                        <div className="space-y-3">
                            {floorPlans.map((plan) => (
                                <FloorPlanRow
                                    key={plan.name}
                                    name={plan.name}
                                    beds={plan.beds}
                                    baths={plan.baths}
                                    sqft={plan.sqft}
                                    rent={plan.rent}
                                    available={plan.available}
                                />
                            ))}
                        </div>
                    </div>
                )}


                {activeTab === "leads" && (
                    <div className="mt-6">
                        <div className="mb-4 flex justify-end">
                            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                                View All Property Leads
                            </button>
                        </div>

                        <div className="space-y-3">
                            {propertyLeads.map((lead) => (
                                <PropertyLeadRow
                                    key={lead.name}
                                    name={lead.name}
                                    status={lead.status}
                                    locator={lead.locator}
                                />
                            ))}
                        </div>
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
                            <InfoBox label="Property Website" value="https://themonroe.com" />
                            <InfoBox label="Leasing Phone" value="(214) 555-1234" />
                            <InfoBox label="Leasing Email" value="leasing@themonroe.com" />
                            <InfoBox
                                label="Management Company"
                                value={property.managementCompany || property.manager}
                            />
                            <InfoBox label="Property Status" value={property.status} />
                            <InfoBox label="Pet Policy" value="Cats and Dogs Allowed" />
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

                        <div className="grid gap-4 md:grid-cols-3">
                            {specials.map((special) => (
                                <SpecialCard
                                    key={special.title}
                                    title={special.title}
                                    type={special.type}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "photos" && (
                    <div className="mt-6">
                        <div className="mb-4 flex justify-end">
                            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                                + Upload Photo
                            </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {photos.map((photo) => (
                                <PhotoCard
                                    key={photo.label}
                                    label={photo.label}
                                    image={photo.image}
                                />
                            ))}
                        </div>
                    </div>
                )}


                {activeTab === "activity" && (
                    <div className="mt-6 space-y-3">
                        {propertyActivity.map((activity) => (
                            <ActivityRow
                                key={activity.title}
                                title={activity.title}
                                description={activity.description}
                                time={activity.time}
                            />
                        ))}

                    </div>

                )}

                {activeTab === "notes" && (
                    <div className="mt-6">
                        <div className="mb-4 flex justify-end">
                            <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                                + Add Note
                            </button>
                        </div>

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

function FloorPlanRow({ name, beds, baths, sqft, rent, available }) {
    return (
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center">
            <div>
                <p className="text-lg font-black text-slate-900">{name}</p>
                <p className="mt-1 text-sm text-slate-500">
                    {beds} • {baths} • {sqft}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {rent}
                </span>

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
