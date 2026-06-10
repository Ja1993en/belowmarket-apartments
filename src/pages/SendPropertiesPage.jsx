import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Copy, ExternalLink, Search, Send } from "lucide-react";
import { getAnyLeadById, updateLocalLead } from "../data/leadStorage";
import { getAllProperties } from "../data/propertyStorage";
import { getPropertyPrimaryImage } from "../data/propertySearchData";
import {
  getSupabaseLeadById,
  updateSupabaseLeadRecommendations,
} from "../data/supabaseLeadStorage";
import { isLocalFallbackEnabled } from "../data/supabaseClient";


export default function SendPropertiesPage() {
  const { leadId } = useParams();
  const initialLead = isLocalFallbackEnabled ? getAnyLeadById(leadId) : null;
  const [lead, setLead] = useState(initialLead);
  const [isLoadingLead, setIsLoadingLead] = useState(!initialLead);

  const [isSavingSelections, setIsSavingSelections] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const properties = useMemo(() => getAllProperties(), []);
  const recommendedPropertyIds = lead?.recommendedPropertyIds || [];

  const recommendedProperties = recommendedPropertyIds
    .map((propertyId) =>
      properties.find((property) => property.id === propertyId)
    )
    .filter(Boolean);

  const isLocalLead = Boolean(initialLead);
  const defaultSelectedPropertyIds =
    recommendedProperties.length > 0
      ? recommendedProperties.map((property) => property.id)
      : lead?.sourcePropertyId
        ? [lead.sourcePropertyId]
        : [];

  const [selectedPropertyIds, setSelectedPropertyIds] = useState(
    defaultSelectedPropertyIds
  );

  useEffect(() => {
    const loadSupabaseLead = async () => {
      if (initialLead) return;

      try {
        setIsLoadingLead(true);
        const supabaseLead = await getSupabaseLeadById(leadId);
        setLead(supabaseLead);
        setSelectedPropertyIds(
          supabaseLead.recommendedPropertyIds?.length > 0
            ? supabaseLead.recommendedPropertyIds
            : supabaseLead.sourcePropertyId
              ? [supabaseLead.sourcePropertyId]
              : []
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingLead(false);
      }
    };

    loadSupabaseLead();
  }, [leadId, initialLead]);

  useEffect(() => {
    if (!isLocalLead || !lead || selectedPropertyIds.length === 0) return;

    updateLocalLead(lead.id, {
      recommendedPropertyIds: selectedPropertyIds,
      lastTouch: "Just now",
      status: "Recommendation Sent",
    });
  }, [isLocalLead, lead, selectedPropertyIds]);

  const recommendationUrl = lead
    ? `${window.location.origin}/r/${lead.token}`
    : "";

  const selectedProperties = useMemo(() => {
    return properties.filter((property) =>
      selectedPropertyIds.includes(property.id)
    );
  }, [properties, selectedPropertyIds]);

  const normalizedPropertySearch = propertySearch.trim().toLowerCase();

  const filteredProperties = useMemo(() => {
    if (!normalizedPropertySearch) return properties;

    return properties.filter((property) => {
      const searchableFields = [
        property.name,
        property.zipcode,
        property.zip,
        property.city,
        property.state,
        property.address,
        property.area,
        property.managementCompany,
        property.manager,
        property.yearBuilt,
      ];

      return searchableFields
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedPropertySearch);
    });
  }, [properties, normalizedPropertySearch]);

  const toggleProperty = async (propertyId) => {
    if (!lead) return;

    const nextIds = selectedPropertyIds.includes(propertyId)
      ? selectedPropertyIds.filter((id) => id !== propertyId)
      : [...selectedPropertyIds, propertyId];

    const updates = {
      recommendedPropertyIds: nextIds,
      lastTouch: "Just now",
      status: nextIds.length > 0 ? "Recommendation Sent" : "New Lead",
    };

    setSelectedPropertyIds(nextIds);
    setSaveMessage("");
    setSaveError("");
    setIsSavingSelections(true);

    try {
      if (isLocalLead) {
        updateLocalLead(lead.id, updates);
      } else {
        await updateSupabaseLeadRecommendations(lead.id, nextIds);
      }

      setLead({ ...lead, ...updates });
      setSaveMessage("Recommendations saved.");
    } catch (error) {
      console.error(error);
      setSaveError("Could not save recommendations. Please try again.");
    } finally {
      setTimeout(() => {
        setIsSavingSelections(false);
      }, 400);
    }
  };

  const saveSelections = async () => {
    if (!lead) return;

    const updates = {
      recommendedPropertyIds: selectedPropertyIds,
      lastTouch: "Just now",
      status: selectedPropertyIds.length > 0 ? "Recommendation Sent" : "New Lead",
    };

    setSaveMessage("");
    setSaveError("");
    setIsSavingSelections(true);

    try {
      if (isLocalLead) {
        updateLocalLead(lead.id, updates);
      } else {
        await updateSupabaseLeadRecommendations(lead.id, selectedPropertyIds);
      }

      setLead({ ...lead, ...updates });
      setSaveMessage("Recommendations saved. You can preview the renter page now.");
    } catch (error) {
      console.error(error);
      setSaveError("Could not save recommendations. Please try again.");
    } finally {
      setIsSavingSelections(false);
    }
  };

  const copyRecommendationLink = async () => {
    if (!recommendationUrl) return;

    await navigator.clipboard.writeText(recommendationUrl);
    alert("Recommendation link copied.");
  };

  if (isLoadingLead) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">Loading lead...</h1>
        <p className="mt-2 text-slate-500">
          Checking Supabase for this lead.
        </p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900">Lead not found</h1>
        <p className="mt-2 text-slate-500">
          This lead ID does not match any lead in your current data.
        </p>

        <Link
          to="/admin/leads"
          className="mt-6 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
        >
          Back to Leads
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/admin/leads"
        className="inline-block rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
      >
        Back to Leads
      </Link>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <section>
          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-sm font-bold text-slate-300">
              Send Properties
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {lead.name}
            </h1>

            <p className="mt-2 text-slate-300">
              {lead.preference}
            </p>

            {lead.sourcePropertyName && (
              <p className="mt-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-slate-200">
                Started from {lead.sourcePropertyName}
              </p>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Choose Properties
                </h2>

                <p className="mt-1 text-slate-500">
                  Select the apartments you want this renter to see.
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 md:items-end">
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                  {selectedPropertyIds.length} selected
                </span>

                {isSavingSelections && (
                  <p className="text-sm font-bold text-slate-500">
                    Saving recommendations...
                  </p>
                )}

                {saveMessage && (
                  <p className="text-sm font-bold text-emerald-700">
                    {saveMessage}
                  </p>
                )}

                {saveError && (
                  <p className="text-sm font-bold text-red-700">
                    {saveError}
                  </p>
                )}


              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
              <label className="relative block flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={propertySearch}
                  onChange={(event) => setPropertySearch(event.target.value)}
                  placeholder="Search property name, ZIP, city, or state"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                />
              </label>

              <p className="text-sm font-bold text-slate-500 md:min-w-36 md:text-right">
                Showing {filteredProperties.length} of {properties.length}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {filteredProperties.length > 0 ? (
                filteredProperties.map((property) => {
                  const isSelected = selectedPropertyIds.includes(property.id);
                  const primaryImage = getPropertyPrimaryImage(property);
                  const managerName = property.managementCompany || property.manager;
                  const locationLabel = [
                    property.city,
                    property.state,
                    property.zipcode || property.zip,
                  ].filter(Boolean).join(", ");

                  return (
                    <button
                      type="button"
                      key={property.id}
                      onClick={() => toggleProperty(property.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${isSelected
                        ? "border-slate-950 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <img
                          src={primaryImage}
                          alt={property.name}
                          className="h-32 w-full rounded-2xl object-cover md:w-44"
                        />

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-black text-slate-900">
                              {property.name}
                            </h3>

                            {isSelected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                <CheckCircle2 className="h-4 w-4" />
                                Selected
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {locationLabel || property.area} - Managed by {managerName}
                          </p>
                          {property.yearBuilt && (
                            <p className="mt-1 text-xs font-bold text-slate-400">
                              Built {property.yearBuilt}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <PropertyBadge label={property.rent} />
                            <PropertyBadge label={property.special} />
                            <PropertyBadge label={`${property.belowMarketPercent} below market`} />
                            <PropertyBadge label={`Save ${property.savings}`} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-bold text-slate-700">
                    No properties match "{propertySearch.trim()}".
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Lead Snapshot
            </h2>

            <div className="mt-5 space-y-3">
              <InfoRow label="Phone" value={lead.phone} />
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Budget" value={lead.budget} />
              <InfoRow label="Move-in" value={lead.moveIn} />
              <InfoRow label="Assigned" value={lead.assignedTo} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Recommendation Link
            </h2>
            {isLocalLead && (
              <p className="mt-2 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                Local lead selections save automatically.
              </p>
            )}

            <p className="mt-2 text-sm text-slate-500">
              This is the renter-facing page for the selected properties.
            </p>

            <div className="mt-4 break-all rounded-2xl bg-slate-100 p-4 text-sm font-bold text-slate-700">
              {recommendationUrl}
            </div>

            <button
              type="button"
              onClick={saveSelections}
              disabled={isSavingSelections}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSavingSelections ? "Saving..." : "Save Recommendations"}
            </button>

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={copyRecommendationLink}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </button>

              <Link
                to={`/r/${lead.token}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                <ExternalLink className="h-4 w-4" />
                Preview Renter Page
              </Link>

              <Link
                to={`/admin/leads/${lead.id}/message`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-200"
              >
                <Send className="h-4 w-4" />
                Write Message
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900">
              Selected Summary
            </h2>

            <div className="mt-4 space-y-3">
              {selectedProperties.length > 0 ? (
                selectedProperties.map((property) => (
                  <div
                    key={property.id}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="font-black text-slate-900">
                      {property.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {property.effectiveRent}/mo effective - {property.savings} savings
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  Select at least one property to build a recommendation list.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PropertyBadge({ label }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
      {label}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 p-4">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className="text-right text-sm font-black text-slate-900">
        {value}
      </span>
    </div>
  );
}
