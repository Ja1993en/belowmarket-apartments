import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ExternalLink, Pencil, Save, X } from "lucide-react";
import { getAllLeads } from "../data/leadStorage";
import { getPhotoImageUrl } from "../data/propertySearchData";
import { getAnyPropertyById, updateStoredProperty } from "../data/propertyStorage";

const PROPERTY_TABS = [
    { label: "Overview", value: "overview" },
    { label: "Floor Plans", value: "floorPlans" },
    { label: "Specials", value: "specials" },
    { label: "Photos", value: "photos" },
    { label: "Leads", value: "leads" },
    { label: "Settings", value: "settings" },
    { label: "Activity", value: "activity" },
    { label: "Notes", value: "notes" },
];

export default function PropertyDetails() {
    const { propertyId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const startsInEditMode = searchParams.get("edit") === "true";
    const [activeTab, setActiveTab] = useState("overview");
    const [property, setProperty] = useState(null);
    const [isLoadingProperty, setIsLoadingProperty] = useState(true);
    const [isEditing, setIsEditing] = useState(startsInEditMode);
    const [isSavingProperty, setIsSavingProperty] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");
    const [saveError, setSaveError] = useState("");
    const [propertyDraft, setPropertyDraft] = useState({
        name: "",
        area: "",
        rent: "",
        status: "Draft",
    });

    useEffect(() => {
        let isMounted = true;

        getAnyPropertyById(propertyId)
            .then((savedProperty) => {
                if (!isMounted) return;

                setProperty(savedProperty);
                setPropertyDraft({
                    name: savedProperty?.name || "",
                    area: savedProperty?.area || "",
                    rent: savedProperty?.rent || "",
                    status: savedProperty?.status || "Draft",
                });
                setSaveError("");
            })
            .catch((error) => {
                console.error(error);
                if (isMounted) {
                    setProperty(null);
                    setSaveError("Could not load this property from Supabase.");
                }
            })
            .finally(() => {
                if (isMounted) setIsLoadingProperty(false);
            });

        return () => {
            isMounted = false;
        };
    }, [propertyId]);

    const hasUnsavedChanges = Boolean(
        property &&
            (propertyDraft.name !== property.name ||
                propertyDraft.area !== property.area ||
                propertyDraft.rent !== property.rent ||
                propertyDraft.status !== property.status)
    );

    const propertyLeads = getAllLeads().filter((lead) =>
        lead.recommendedPropertyIds?.includes(propertyId)
    );
    const propertyLeadCount = propertyLeads.length;

    const resetDraft = () => {
        setPropertyDraft({
            name: property?.name || "",
            area: property?.area || "",
            rent: property?.rent || "",
            status: property?.status || "Draft",
        });
    };

    const savePropertyChanges = async () => {
        if (!property || !hasUnsavedChanges) return;

        try {
            setIsSavingProperty(true);
            setSaveError("");
            const updatedProperty = await updateStoredProperty(property.id, propertyDraft);

            setProperty(updatedProperty);
            setPropertyDraft({
                name: updatedProperty.name || "",
                area: updatedProperty.area || "",
                rent: updatedProperty.rent || "",
                status: updatedProperty.status || "Draft",
            });
            setSaveMessage("Property changes saved to Supabase.");
            setIsEditing(false);
            setSearchParams({}, { replace: true });
        } catch (error) {
            console.error(error);
            setSaveError("Could not save this property. Confirm the Supabase properties table exists.");
        } finally {
            setIsSavingProperty(false);
        }
    };

    const makePropertyLive = async () => {
        if (!property || property.status === "Live") return;

        try {
            setIsSavingProperty(true);
            setSaveError("");
            const updatedProperty = await updateStoredProperty(property.id, { status: "Live" });

            setProperty(updatedProperty);
            setPropertyDraft({
                name: updatedProperty.name || "",
                area: updatedProperty.area || "",
                rent: updatedProperty.rent || "",
                status: updatedProperty.status || "Live",
            });
            setSaveMessage(`${updatedProperty.name || "Property"} is now visible to renters.`);
            setIsEditing(false);
            setSearchParams({}, { replace: true });
        } catch (error) {
            console.error(error);
            setSaveError("Could not make this property live. Check Supabase.");
        } finally {
            setIsSavingProperty(false);
        }
    };

    if (isLoadingProperty) {
        return (
            <div className="rounded-3xl border border-[#d7e6df] bg-white p-8 text-left shadow-sm">
                <h1 className="text-3xl font-black text-[#102426]">Loading property...</h1>
                <p className="mt-2 font-semibold text-[#526260]">Checking Supabase for this property.</p>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="rounded-3xl border border-[#d7e6df] bg-white p-8 text-left shadow-sm">
                <h1 className="text-3xl font-black text-[#102426]">Property not found</h1>
                <p className="mt-2 font-semibold text-[#526260]">
                    This property ID does not match a property in Supabase.
                </p>
                {saveError && (
                    <p className="mt-4 rounded-2xl bg-[#fde8df] p-4 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
                        {saveError}
                    </p>
                )}
                <Link
                    to="/admin/properties"
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                >
                    <ArrowLeft className="h-4 w-4" />
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
    const activeTabLabel = PROPERTY_TABS.find((tab) => tab.value === activeTab)?.label || "Overview";
    const editPath = `/admin/properties/${property.id}/edit`;

    return (
        <div className="text-left text-[#102426]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                    to="/admin/properties"
                    className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Properties
                </Link>

                <div className="flex flex-col gap-2 sm:flex-row">
                    {property.status !== "Live" && (
                        <button
                            type="button"
                            onClick={makePropertyLive}
                            disabled={isSavingProperty}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783] disabled:cursor-not-allowed disabled:bg-[#d7c186]"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            {isSavingProperty ? "Publishing..." : "Make Live"}
                        </button>
                    )}

                    <Link
                        to={`/properties/${property.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Preview Public Listing
                    </Link>
                    <Link
                        to={editPath}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
                    >
                        <Pencil className="h-4 w-4" />
                        Full Edit Form
                    </Link>
                </div>
            </div>

            <section className="mt-6 overflow-hidden rounded-3xl border border-[#d7e6df] bg-[#102426] shadow-sm">
                <div className="bma-value-stripe h-2" />
                <div className="p-6 text-white md:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <p className="text-sm font-black uppercase tracking-wide text-[#f2b84b]">Property Portal</p>
                            <h1 className="mt-3 text-4xl font-black text-[#fff7df] md:text-5xl">
                                {isEditing ? propertyDraft.name || property.name : property.name}
                            </h1>
                            <p className="mt-3 max-w-2xl font-semibold leading-7 text-[#d7ece6]">
                                Manage pricing, floor plans, specials, photos, renter activity, and listing visibility.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-[#d7ece6] ring-1 ring-white/15">
                                {property.managementCompany || property.manager || "Management not set"}
                            </span>
                            <span className="rounded-full bg-[#f2b84b] px-4 py-2 text-sm font-black text-[#102426]">
                                {(isEditing ? propertyDraft.status : property.status) || "Draft"}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {(saveMessage || saveError) && (
                <div
                    className={`mt-5 rounded-2xl p-4 text-sm font-bold ring-1 ${
                        saveError
                            ? "bg-[#fde8df] text-[#b33818] ring-[#f4b39f]"
                            : "bg-[#d8efe6] text-[#1f6f63] ring-[#a9cfc2]"
                    }`}
                >
                    {saveError || saveMessage}
                </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <DetailCard title="Floor Plans" value={propertyFloorPlans.length} />
                <DetailCard title="Available Units" value={getAvailableUnitCount(propertyFloorPlans)} />
                <DetailCard title="Active Specials" value={propertySpecials.length} />
                <DetailCard title="Leads Sent" value={propertyLeadCount} />
            </div>

            <section className="mt-6 rounded-3xl border border-[#d7e6df] bg-white p-4 shadow-sm md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase text-[#1f6f63]">Property Workspace</p>
                        <h2 className="mt-1 text-3xl font-black text-[#102426]">{activeTabLabel}</h2>
                    </div>
                    <div className="flex gap-2 overflow-x-auto rounded-2xl bg-[#f5f8f1] p-2 ring-1 ring-[#d7e6df]">
                        {PROPERTY_TABS.map((tab) => (
                            <PropertyTab
                                key={tab.value}
                                label={tab.label}
                                value={tab.value}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                            />
                        ))}
                    </div>
                </div>

                {activeTab === "overview" && (
                    <div className="mt-6 space-y-5">
                        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df] md:flex-row md:items-center">
                            <div>
                                <p className="text-sm font-black text-[#1f6f63]">Quick overview edit</p>
                                <p className="mt-1 text-sm font-semibold text-[#526260]">
                                    Use this for basic listing details. Use the full edit form for floor plans, photos, specials, and units.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                {isEditing ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={savePropertyChanges}
                                            disabled={!hasUnsavedChanges || isSavingProperty}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0]"
                                        >
                                            <Save className="h-4 w-4" />
                                            {isSavingProperty ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                resetDraft();
                                                setIsEditing(false);
                                                setSearchParams({}, { replace: true });
                                            }}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
                                        >
                                            <X className="h-4 w-4" />
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(true);
                                            setSearchParams({ edit: "true" }, { replace: true });
                                        }}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        Quick Edit
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {isEditing ? (
                                <EditableField label="Property Name" value={propertyDraft.name} onChange={(value) => setPropertyDraft({ ...propertyDraft, name: value })} />
                            ) : (
                                <InfoBox label="Property Name" value={property.name} />
                            )}
                            {isEditing ? (
                                <EditableField label="Market Area" value={propertyDraft.area} onChange={(value) => setPropertyDraft({ ...propertyDraft, area: value })} />
                            ) : (
                                <InfoBox label="Market Area" value={property.area || "Not set"} />
                            )}
                            <InfoBox label="Property Manager" value={property.manager || "Not assigned"} />
                            <InfoBox label="Year Built" value={property.yearBuilt || "Not set"} />
                            {isEditing ? (
                                <label className="rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]">
                                    <span className="text-sm font-semibold text-[#526260]">Listing Status</span>
                                    <select
                                        value={propertyDraft.status}
                                        onChange={(event) => setPropertyDraft({ ...propertyDraft, status: event.target.value })}
                                        className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
                                    >
                                        <option>Live</option>
                                        <option>Pending Review</option>
                                        <option>Draft</option>
                                    </select>
                                </label>
                            ) : (
                                <InfoBox label="Listing Status" value={property.status || "Draft"} />
                            )}
                            {isEditing ? (
                                <EditableField label="Starting Rent" value={propertyDraft.rent} onChange={(value) => setPropertyDraft({ ...propertyDraft, rent: value })} />
                            ) : (
                                <InfoBox label="Starting Rent" value={property.rent || "Contact for pricing"} />
                            )}
                            <InfoBox label="Last Updated" value={property.updated || "Just now"} />
                        </div>
                    </div>
                )}

                {activeTab === "floorPlans" && (
                    <WorkspacePanel actionLabel="Manage Floor Plans" editPath={editPath}>
                        {propertyFloorPlans.length > 0 ? (
                            <div className="space-y-3">
                                {propertyFloorPlans.map((plan) => (
                                    <FloorPlanRow
                                        key={plan.name}
                                        propertyId={property.id}
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
                    </WorkspacePanel>
                )}

                {activeTab === "specials" && (
                    <WorkspacePanel actionLabel="Manage Specials" editPath={editPath}>
                        {propertySpecials.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-3">
                                {propertySpecials.map((special) => (
                                    <SpecialCard key={special.title} propertyId={property.id} title={special.title} type={special.type} />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="No specials have been added for this property yet." />
                        )}
                    </WorkspacePanel>
                )}

                {activeTab === "photos" && (
                    <WorkspacePanel actionLabel="Manage Photos" editPath={editPath}>
                        {propertyPhotos.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-3">
                                {propertyPhotos.map((photo) => (
                                    <PhotoCard key={photo.label} propertyId={property.id} label={photo.label} image={photo.image} />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="No photos have been uploaded for this property yet." />
                        )}
                    </WorkspacePanel>
                )}

                {activeTab === "leads" && (
                    <WorkspacePanel actionLabel="View All Leads" editPath="/admin/leads">
                        {propertyLeads.length > 0 ? (
                            <div className="space-y-3">
                                {propertyLeads.map((lead) => (
                                    <PropertyLeadRow key={lead.id || lead.name} name={lead.name} status={lead.status} locator={lead.assignedTo || "Not assigned"} />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="No renter leads have been connected to this property yet." />
                        )}
                    </WorkspacePanel>
                )}

                {activeTab === "settings" && (
                    <WorkspacePanel actionLabel="Edit Settings" editPath={editPath}>
                        <div className="grid gap-4 md:grid-cols-2">
                            <InfoBox label="Property Website" value={property.website || "Not set"} />
                            <InfoBox label="Leasing Phone" value={property.leasingPhone || property.phone || "Not set"} />
                            <InfoBox label="Leasing Email" value={property.leasingEmail || property.email || "Not set"} />
                            <InfoBox label="Management Company" value={property.managementCompany || property.manager || "Not set"} />
                            <InfoBox label="Property Status" value={property.status || "Draft"} />
                            <InfoBox label="Pet Policy" value={property.petPolicy || "Not set"} />
                        </div>
                    </WorkspacePanel>
                )}

                {activeTab === "activity" && (
                    <div className="mt-6 space-y-3">
                        {propertyActivity.length > 0 ? (
                            propertyActivity.map((activity) => (
                                <ActivityRow key={activity.title} title={activity.title} description={activity.description} time={activity.time} />
                            ))
                        ) : (
                            <EmptyTabState message="No activity has been logged for this property yet." />
                        )}
                    </div>
                )}

                {activeTab === "notes" && (
                    <WorkspacePanel actionLabel="Manage Notes" editPath={editPath}>
                        {propertyNotes.length > 0 ? (
                            <div className="space-y-3">
                                {propertyNotes.map((item) => (
                                    <NoteRow key={item.note} note={item.note} author={item.author} time={item.time} />
                                ))}
                            </div>
                        ) : (
                            <EmptyTabState message="No notes have been added for this property yet." />
                        )}
                    </WorkspacePanel>
                )}
            </section>
        </div>
    );
}

function EditableField({ label, value, onChange }) {
    return (
        <label className="rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]">
            <span className="text-sm font-semibold text-[#526260]">{label}</span>
            <input
                type="text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#b8d9d0] bg-white px-3 py-2 font-black text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
            />
        </label>
    );
}

function WorkspacePanel({ children, actionLabel, editPath }) {
    return (
        <div className="mt-6">
            <div className="mb-4 flex justify-end">
                <Link
                    to={editPath}
                    className="rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                >
                    {actionLabel}
                </Link>
            </div>
            {children}
        </div>
    );
}

function DetailCard({ title, value }) {
    return (
        <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#526260]">
                {title}
            </p>

            <h2 className="mt-3 text-4xl font-black text-[#102426]">
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
                ? "bg-[#173f3f] text-white"
                : "text-[#526260] hover:bg-[#e7f3ee]"
                }`}
        >
            {label}
        </button>
    );
}

function InfoBox({ label, value }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4">
            <p className="text-sm font-semibold text-[#526260]">
                {label}
            </p>

            <p className="mt-2 font-black text-[#102426]">
                {value}
            </p>
        </div>
    );
}

function EmptyTabState({ message }) {
    return (
        <div className="rounded-2xl border border-dashed border-[#d7e6df] bg-[#f5f8f1] p-6 text-center">
            <p className="text-sm font-bold text-[#526260]">{message}</p>
        </div>
    );
}

function FloorPlanRow({
    propertyId,
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
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-[#f5f8f1] p-4 md:flex-row md:items-center">
            <div>
                <p className="text-lg font-black text-[#102426]">{name}</p>
                <p className="mt-1 text-sm text-[#526260]">
                    {beds} • {baths} • {sqft}
                </p>
                {currentSpecial && (
                    <p className="mt-2 text-sm font-bold text-[#1f6f63]">
                        {currentSpecial}
                    </p>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#173f3f]">
                    Starting {rent}
                </span>

                {effectiveRent && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#173f3f]">
                        Effective {effectiveRent}
                    </span>
                )}

                {marketRent && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#173f3f]">
                        Market {marketRent}
                    </span>
                )}

                {savings && (
                    <span className="rounded-full bg-[#d8efe6] px-3 py-1 text-xs font-bold text-[#1f6f63]">
                        Save {savings}
                    </span>
                )}

                {belowMarketPercent && (
                    <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#174a7c]">
                        {belowMarketPercent} below
                    </span>
                )}

                <span className="rounded-full bg-[#d8efe6] px-3 py-1 text-xs font-bold text-[#1f6f63]">
                    {available}
                </span>

                <Link
                    to={`/admin/properties/${propertyId}/edit`}
                    className="rounded-xl bg-[#173f3f] px-4 py-2 text-sm font-bold text-white hover:bg-[#102426]"
                >
                    Manage
                </Link>

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

function SpecialCard({ propertyId, title, type }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-5">
            <p className="text-lg font-black text-[#102426]">{title}</p>

            <p className="mt-1 text-sm text-[#526260]">{type}</p>

            <Link
                to={`/admin/properties/${propertyId}/edit`}
                className="mt-5 inline-flex rounded-xl bg-[#173f3f] px-4 py-2 text-sm font-bold text-white hover:bg-[#102426]"
            >
                Manage special
            </Link>

        </div>
    );
}

function PhotoCard({ propertyId, label, image }) {
    return (
        <div className="overflow-hidden rounded-2xl bg-[#f5f8f1]">
            <img
                src={image}
                alt={label}
                className="h-48 w-full object-cover"
            />

            <div className="p-4">
                <p className="font-bold text-[#102426]">{label}</p>

                <Link
                    to={`/admin/properties/${propertyId}/edit`}
                    className="mt-4 inline-flex rounded-xl bg-[#173f3f] px-4 py-2 text-sm font-bold text-white hover:bg-[#102426]"
                >
                    Manage photos
                </Link>
            </div>
        </div>
    );
}

function PropertyLeadRow({ name, status, locator }) {
    return (
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-[#f5f8f1] p-4 md:flex-row md:items-center">
            <div>
                <p className="font-bold text-[#102426]">{name}</p>
                <p className="mt-1 text-sm text-[#526260]">
                    Sent by {locator}
                </p>
            </div>

            <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#174a7c]">
                {status}
            </span>
        </div>
    );
}

function ActivityRow({ title, description, time }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                    <p className="font-bold text-[#102426]">{title}</p>
                    <p className="mt-1 text-sm text-[#526260]">{description}</p>
                </div>

                <span className="text-xs font-bold text-[#6c7a77]">{time}</span>
            </div>
        </div>
    );
}

function NoteRow({ note, author, time }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                    <p className="font-semibold text-[#102426]">{note}</p>

                    <p className="mt-2 text-sm text-[#526260]">
                        {author} • {time}
                    </p>
                </div>

            </div>
        </div>
    );
}
