import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Copy, ExternalLink, MessageSquare, Search, Send } from "lucide-react";
import { getAnyLeadById, updateLocalLead } from "../data/leadStorage";
import { getAllProperties } from "../data/propertyStorage";
import { getPropertyPrimaryImage } from "../data/propertySearchData";
import {
  getCompareFloorPlanItemKey,
  getCompareFloorPlanItems,
} from "../data/renterPreferenceStorage";
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
  const [properties, setProperties] = useState([]);
  const [propertyLoadError, setPropertyLoadError] = useState("");
  const [comparedFloorPlanItems] = useState(() => getCompareFloorPlanItems());
  const [selectedFloorPlanItems, setSelectedFloorPlanItems] = useState(
    lead?.recommendedFloorPlanItems || []
  );
  const [smsPin, setSmsPin] = useState(() =>
    sessionStorage.getItem("bmaSmsSendPin") || ""
  );
  const [smsMessage, setSmsMessage] = useState("");
  const [isSmsMessageEdited, setIsSmsMessageEdited] = useState(false);
  const [smsStatusMessage, setSmsStatusMessage] = useState("");
  const [smsError, setSmsError] = useState("");
  const [isSendingSms, setIsSendingSms] = useState(false);
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
    let isMounted = true;

    getAllProperties()
      .then((savedProperties) => {
        if (!isMounted) return;
        setProperties(savedProperties);
        setPropertyLoadError("");
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) setPropertyLoadError("Could not load properties from Supabase.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
      recommendedFloorPlanItems: selectedFloorPlanItems,
      lastTouch: "Just now",
      status: "Recommendation Sent",
    });
  }, [isLocalLead, lead, selectedFloorPlanItems, selectedPropertyIds]);

  const recommendationUrl = lead
    ? `${window.location.origin}/r/${lead.token}`
    : "";

  const selectedProperties = useMemo(() => {
    return properties.filter((property) =>
      selectedPropertyIds.includes(property.id)
    );
  }, [properties, selectedPropertyIds]);
  const selectedFloorPlanKeys = useMemo(
    () => new Set(selectedFloorPlanItems.map((item) => getCompareFloorPlanItemKey(item))),
    [selectedFloorPlanItems]
  );
  const floorPlanOptionsByPropertyId = useMemo(() => {
    const optionsByPropertyId = {};

    selectedProperties.forEach((property) => {
      optionsByPropertyId[property.id] = mergeFloorPlanRecommendationItems([
        ...comparedFloorPlanItems.filter((item) => item.propertyId === property.id),
        ...getPropertyFloorPlanRecommendationItems(property),
      ]);
    });

    return optionsByPropertyId;
  }, [comparedFloorPlanItems, selectedProperties]);
  const defaultSmsMessage = useMemo(() => {
    if (!lead) return "";

    return buildRecommendationText({
      lead,
      recommendationUrl,
      selectedFloorPlanItems,
      selectedProperties,
    });
  }, [lead, recommendationUrl, selectedFloorPlanItems, selectedProperties]);

  const displayedSmsMessage = isSmsMessageEdited ? smsMessage : defaultSmsMessage;

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

  useEffect(() => {
    setSelectedFloorPlanItems(lead?.recommendedFloorPlanItems || []);
  }, [lead?.id]);

  const toggleFloorPlanRecommendation = (floorPlanItem) => {
    const floorPlanKey = getCompareFloorPlanItemKey(floorPlanItem);
    const nextItems = selectedFloorPlanKeys.has(floorPlanKey)
      ? selectedFloorPlanItems.filter(
        (item) => getCompareFloorPlanItemKey(item) !== floorPlanKey
      )
      : [floorPlanItem, ...selectedFloorPlanItems];

    setSelectedFloorPlanItems(nextItems);
    setSaveMessage("");
    setSaveError("");
  };

  const toggleProperty = async (propertyId) => {
    if (!lead) return;

    const nextIds = selectedPropertyIds.includes(propertyId)
      ? selectedPropertyIds.filter((id) => id !== propertyId)
      : [...selectedPropertyIds, propertyId];
    const nextFloorPlanItems = selectedFloorPlanItems.filter((item) =>
      nextIds.includes(item.propertyId)
    );

    const updates = {
      recommendedPropertyIds: nextIds,
      recommendedFloorPlanItems: nextFloorPlanItems,
      lastTouch: "Just now",
      status: nextIds.length > 0 ? "Recommendation Sent" : "New Lead",
    };

    setSelectedPropertyIds(nextIds);
    setSelectedFloorPlanItems(nextFloorPlanItems);
    setSaveMessage("");
    setSaveError("");
    setIsSavingSelections(true);

    try {
      if (isLocalLead) {
        updateLocalLead(lead.id, updates);
      } else {
        await updateSupabaseLeadRecommendations(lead.id, nextIds, nextFloorPlanItems);
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

  const saveSelections = async (options = {}) => {
    if (!lead) return false;

    const updates = {
      recommendedPropertyIds: selectedPropertyIds,
      recommendedFloorPlanItems: selectedFloorPlanItems,
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
        await updateSupabaseLeadRecommendations(
          lead.id,
          selectedPropertyIds,
          selectedFloorPlanItems
        );
      }

      setLead({ ...lead, ...updates });
      setSaveMessage(
        options.successMessage || "Recommendations saved. You can preview the renter page now."
      );
      return true;
    } catch (error) {
      console.error(error);
      setSaveError("Could not save recommendations. Please try again.");
      return false;
    } finally {
      setIsSavingSelections(false);
    }
  };

  const copyRecommendationLink = async () => {
    if (!recommendationUrl) return;

    const wasSaved = await saveSelections({
      successMessage: "Recommendations saved. Link copied.",
    });

    if (!wasSaved) return;

    await navigator.clipboard.writeText(recommendationUrl);
    alert("Recommendation link copied.");
  };

  const textRecommendationsToRenter = async () => {
    if (!lead) return;

    if (selectedPropertyIds.length === 0) {
      setSaveError("Select at least one property before texting the renter.");
      return;
    }

    const wasSaved = await saveSelections({
      successMessage: "Recommendations saved. Opening your text message now.",
    });

    if (!wasSaved) return;

    window.location.href = getRecommendationSmsHref(
      lead.phone,
      buildRecommendationText({
        lead,
        recommendationUrl,
        selectedFloorPlanItems,
        selectedProperties,
      })
    );
  };

  const sendRecommendationsSms = async () => {
    if (!lead) return;

    if (selectedPropertyIds.length === 0) {
      setSmsError("Select at least one property before sending an SMS.");
      return;
    }

    if (!smsPin.trim()) {
      setSmsError("Enter your SMS send PIN first.");
      return;
    }

    if (!displayedSmsMessage.trim()) {
      setSmsError("Add a message before sending.");
      return;
    }

    setSmsError("");
    setSmsStatusMessage("");

    const wasSaved = await saveSelections({
      successMessage: "Recommendations saved. Sending SMS now.",
    });

    if (!wasSaved) return;

    try {
      setIsSendingSms(true);
      sessionStorage.setItem("bmaSmsSendPin", smsPin.trim());

      const response = await fetch("/api/send-recommendation-sms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-bma-sms-pin": smsPin.trim(),
        },
        body: JSON.stringify({
          to: lead.phone,
          body: ensureSmsOptOutLine(displayedSmsMessage),
          leadId: lead.id,
          propertyIds: selectedPropertyIds,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not send SMS.");
      }

      setSmsStatusMessage(`SMS sent to ${lead.phone}. Twilio status: ${result.status || "queued"}.`);
    } catch (error) {
      setSmsError(error?.message || "Could not send SMS. Check Twilio setup and try again.");
    } finally {
      setIsSendingSms(false);
    }
  };

  if (isLoadingLead) {
    return (
      <div className="rounded-3xl border border-[#d7e6df] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-[#102426]">Loading lead...</h1>
        <p className="mt-2 text-[#526260]">
          Checking Supabase for this lead.
        </p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="rounded-3xl border border-[#d7e6df] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-[#102426]">Lead not found</h1>
        <p className="mt-2 text-[#526260]">
          This lead ID does not match any lead in your current data.
        </p>

        <Link
          to="/admin/leads"
          className="mt-6 inline-block rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
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
        className="inline-block rounded-2xl bg-[#e7f3ee] px-4 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
      >
        Back to Leads
      </Link>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <section>
          <div className="rounded-3xl bg-[#173f3f] p-6 text-white shadow-sm">
            <p className="text-sm font-bold text-[#d7e6df]">
              Send Properties
            </p>

            <h1 className="mt-2 text-4xl font-black">
              {lead.name}
            </h1>

            <p className="mt-2 text-[#d7e6df]">
              {lead.preference}
            </p>

            {lead.sourcePropertyName && (
              <p className="mt-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-[#e7f3ee]">
                Started from {lead.sourcePropertyName}
              </p>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-[#1f6f63]">
                  Twilio SMS
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#102426]">
                  Send recommendation text
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold text-[#526260]">
                  This sends the selected properties and renter link directly through Twilio.
                  Select at least one property, enter your SMS PIN, then click Send SMS Now.
                </p>
              </div>

              <div className="rounded-2xl bg-[#fff8e6] px-4 py-3 text-sm font-black text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                {selectedPropertyIds.length} selected • {selectedFloorPlanItems.length} floor plans
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
              <label className="block text-sm font-bold text-[#173f3f]">
                SMS send PIN
                <input
                  type="password"
                  value={smsPin}
                  onChange={(event) => {
                    setSmsPin(event.target.value);
                    setSmsError("");
                  }}
                  placeholder="Enter PIN"
                  className="mt-2 w-full rounded-2xl border border-[#d7e6df] px-4 py-3 font-semibold text-[#102426] outline-none focus:border-[#2d7dd2]"
                />
              </label>

              <label className="block text-sm font-bold text-[#173f3f]">
                Message preview
                <textarea
                  value={displayedSmsMessage}
                  onChange={(event) => {
                    setIsSmsMessageEdited(true);
                    setSmsMessage(event.target.value);
                    setSmsError("");
                  }}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm font-semibold leading-6 text-[#102426] outline-none focus:border-[#2d7dd2]"
                />
              </label>
            </div>

            {smsError && (
              <p className="mt-4 rounded-2xl bg-[#fde8df] px-4 py-3 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
                {smsError}
              </p>
            )}

            {smsStatusMessage && (
              <p className="mt-4 rounded-2xl bg-[#e7f3ee] px-4 py-3 text-sm font-bold text-[#1f6f63] ring-1 ring-[#d7e6df]">
                {smsStatusMessage}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={sendRecommendationsSms}
                disabled={isSendingSms || isSavingSelections || selectedPropertyIds.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-6 py-4 text-sm font-black text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0]"
              >
                <Send className="h-4 w-4" />
                {isSendingSms ? "Sending SMS..." : "Send SMS Now"}
              </button>

              <button
                type="button"
                onClick={textRecommendationsToRenter}
                disabled={isSavingSelections || selectedPropertyIds.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#e7f3ee] px-6 py-4 text-sm font-black text-[#173f3f] hover:bg-[#d7e6df] disabled:cursor-not-allowed disabled:bg-[#f5f8f1] disabled:text-[#78908a]"
              >
                <MessageSquare className="h-4 w-4" />
                Open Phone Text App
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black text-[#102426]">
                  Choose Properties
                </h2>

                <p className="mt-1 text-[#526260]">
                  Select the apartments you want this renter to see.
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 md:items-end">
                <span className="rounded-full bg-[#e7f3ee] px-4 py-2 text-sm font-bold text-[#173f3f]">
                  {selectedPropertyIds.length} selected • {selectedFloorPlanItems.length} floor plans
                </span>

                <button
                  type="button"
                  onClick={textRecommendationsToRenter}
                  disabled={isSavingSelections || selectedPropertyIds.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0] md:w-auto"
                >
                  <MessageSquare className="h-4 w-4" />
                  Text Selected Properties
                </button>

                <p className="max-w-xs text-xs font-semibold text-[#526260] md:text-right">
                  Opens your text app with the renter link and selected property names.
                </p>

                {isSavingSelections && (
                  <p className="text-sm font-bold text-[#526260]">
                    Saving recommendations...
                  </p>
                )}

                {saveMessage && (
                  <p className="text-sm font-bold text-[#1f6f63]">
                    {saveMessage}
                  </p>
                )}

                {propertyLoadError && (
        <div className="mb-4 rounded-2xl bg-[#fde8df] p-4 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
          {propertyLoadError}
        </div>
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
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6c7a77]" />
                <input
                  type="search"
                  value={propertySearch}
                  onChange={(event) => setPropertySearch(event.target.value)}
                  placeholder="Search property name, ZIP, city, or state"
                  className="w-full rounded-2xl border border-[#d7e6df] bg-[#f5f8f1] py-3 pl-12 pr-4 text-sm font-bold text-[#102426] outline-none transition placeholder:text-[#6c7a77] focus:border-[#2d7dd2] focus:bg-white"
                />
              </label>

              <p className="text-sm font-bold text-[#526260] md:min-w-36 md:text-right">
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
                        ? "border-[#173f3f] bg-[#f5f8f1]"
                        : "border-[#d7e6df] bg-white hover:bg-[#f5f8f1]"
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
                            <h3 className="text-xl font-black text-[#102426]">
                              {property.name}
                            </h3>

                            {isSelected && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#d8efe6] px-3 py-1 text-xs font-bold text-[#1f6f63]">
                                <CheckCircle2 className="h-4 w-4" />
                                Selected
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-sm font-semibold text-[#526260]">
                            {locationLabel || property.area} - Managed by {managerName}
                          </p>
                          {property.yearBuilt && (
                            <p className="mt-1 text-xs font-bold text-[#6c7a77]">
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
                <div className="rounded-2xl border border-dashed border-[#b8d9d0] bg-[#f5f8f1] p-6 text-center">
                  <p className="text-sm font-bold text-[#173f3f]">
                    No properties match "{propertySearch.trim()}".
                  </p>
                </div>
              )}
            </div>

            {selectedProperties.length > 0 && (
              <div className="mt-6 rounded-3xl border border-[#d7e6df] bg-[#f5f8f1] p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                  <div>
                    <p className="text-xs font-black uppercase text-[#1f6f63]">
                      Optional floor plan picks
                    </p>
                    <h3 className="mt-1 text-xl font-black text-[#102426]">
                      Attach exact floor plans to the renter link
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#526260]">
                      Compared floor plans show first. Select the layouts you want the renter to focus on.
                    </p>
                  </div>

                  <span className="w-fit rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df]">
                    {selectedFloorPlanItems.length} attached
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {selectedProperties.map((property) => {
                    const floorPlanOptions = floorPlanOptionsByPropertyId[property.id] || [];

                    return (
                      <div
                        key={property.id}
                        className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#d7e6df]"
                      >
                        <p className="font-black text-[#102426]">
                          {property.name}
                        </p>

                        {floorPlanOptions.length > 0 ? (
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {floorPlanOptions.map((floorPlanItem) => {
                              const floorPlanKey = getCompareFloorPlanItemKey(floorPlanItem);
                              const isFloorPlanSelected = selectedFloorPlanKeys.has(floorPlanKey);

                              return (
                                <button
                                  type="button"
                                  key={floorPlanKey}
                                  onClick={() => toggleFloorPlanRecommendation(floorPlanItem)}
                                  className={`rounded-2xl border p-3 text-left transition ${
                                    isFloorPlanSelected
                                      ? "border-[#173f3f] bg-[#e7f3ee]"
                                      : "border-[#d7e6df] bg-white hover:bg-[#f5f8f1]"
                                  }`}
                                >
                                  <div className="flex gap-3">
                                    <img
                                      src={floorPlanItem.image || getPropertyPrimaryImage(property)}
                                      alt={`${floorPlanItem.floorPlanName} floor plan`}
                                      className="h-16 w-20 shrink-0 rounded-xl object-cover"
                                    />

                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-black text-[#102426]">
                                        {floorPlanItem.floorPlanName}
                                      </span>
                                      <span className="mt-1 block text-xs font-semibold text-[#526260]">
                                        {formatFloorPlanMeta(floorPlanItem)}
                                      </span>
                                      <span className="mt-1 block text-xs font-black text-[#8a5b0a]">
                                        {floorPlanItem.effectiveRent || floorPlanItem.rent || "Contact for pricing"}
                                      </span>
                                    </span>
                                  </div>

                                  {floorPlanItem.special && (
                                    <p className="mt-2 truncate text-xs font-bold text-[#8a5b0a]">
                                      {floorPlanItem.special}
                                    </p>
                                  )}

                                  <p className="mt-2 text-xs font-black text-[#173f3f]">
                                    {isFloorPlanSelected ? "Attached to renter link" : "Attach floor plan"}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 rounded-2xl bg-[#f5f8f1] p-4 text-sm font-semibold text-[#526260]">
                            No floor plans are listed for this property yet.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#102426]">
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

          <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#102426]">
              Recommendation Link
            </h2>
            {isLocalLead && (
              <p className="mt-2 rounded-2xl bg-[#e7f3ee] p-3 text-sm font-bold text-[#1f6f63]">
                Local lead selections save automatically.
              </p>
            )}

            <p className="mt-2 text-sm text-[#526260]">
              This is the renter-facing page for the selected properties.
            </p>

            <div className="mt-4 break-all rounded-2xl bg-[#e7f3ee] p-4 text-sm font-bold text-[#173f3f]">
              {recommendationUrl}
            </div>

            <button
              type="button"
              onClick={() => saveSelections()}
              disabled={isSavingSelections}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0]"
            >
              {isSavingSelections ? "Saving..." : "Save Recommendations"}
            </button>

            <div className="mt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={textRecommendationsToRenter}
                disabled={isSavingSelections || selectedPropertyIds.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0]"
              >
                <MessageSquare className="h-4 w-4" />
                Text Renter
              </button>

              <button
                onClick={copyRecommendationLink}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </button>

              <Link
                to={`/r/${lead.token}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#e7f3ee] px-5 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
              >
                <ExternalLink className="h-4 w-4" />
                Preview Renter Page
              </Link>

              <Link
                to={`/admin/leads/${lead.id}/message`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d8efe6] px-5 py-3 text-sm font-bold text-[#1f6f63] hover:bg-[#c6e6da]"
              >
                <Send className="h-4 w-4" />
                Write Message
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-[#1f6f63]">
              Embedded SMS
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#102426]">
              Send From Twilio
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#526260]">
              Sends directly from your Twilio trial number once Cloudflare secrets are set.
            </p>

            <label className="mt-5 block text-sm font-bold text-[#173f3f]">
              Renter phone
              <input
                type="text"
                value={lead.phone || ""}
                readOnly
                className="mt-2 w-full rounded-2xl border border-[#d7e6df] bg-[#f5f8f1] px-4 py-3 font-semibold text-[#102426]"
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-[#173f3f]">
              SMS send PIN
              <input
                type="password"
                value={smsPin}
                onChange={(event) => {
                  setSmsPin(event.target.value);
                  setSmsError("");
                }}
                placeholder="Enter Cloudflare SMS_SEND_PIN"
                className="mt-2 w-full rounded-2xl border border-[#d7e6df] px-4 py-3 font-semibold text-[#102426] outline-none focus:border-[#2d7dd2]"
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-[#173f3f]">
              Text message
              <textarea
                value={displayedSmsMessage}
                onChange={(event) => {
                  setIsSmsMessageEdited(true);
                  setSmsMessage(event.target.value);
                  setSmsError("");
                }}
                rows={7}
                className="mt-2 w-full resize-none rounded-2xl border border-[#d7e6df] px-4 py-3 text-sm font-semibold leading-6 text-[#102426] outline-none focus:border-[#2d7dd2]"
              />
            </label>

            {smsError && (
              <p className="mt-4 rounded-2xl bg-[#fde8df] px-4 py-3 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
                {smsError}
              </p>
            )}

            {smsStatusMessage && (
              <p className="mt-4 rounded-2xl bg-[#e7f3ee] px-4 py-3 text-sm font-bold text-[#1f6f63] ring-1 ring-[#d7e6df]">
                {smsStatusMessage}
              </p>
            )}

            <button
              type="button"
              onClick={sendRecommendationsSms}
              disabled={isSendingSms || isSavingSelections || selectedPropertyIds.length === 0}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0]"
            >
              <Send className="h-4 w-4" />
              {isSendingSms ? "Sending SMS..." : "Send SMS Now"}
            </button>

            <p className="mt-3 text-xs font-semibold text-[#526260]">
              Twilio trials can only send to phone numbers verified in Twilio.
            </p>
          </div>

          <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#102426]">
              Selected Summary
            </h2>

            <div className="mt-4 space-y-3">
              {selectedProperties.length > 0 ? (
                selectedProperties.map((property) => (
                  <div
                    key={property.id}
                    className="rounded-2xl bg-[#f5f8f1] p-4"
                  >
                    <p className="font-black text-[#102426]">
                      {property.name}
                    </p>
                    <p className="mt-1 text-sm text-[#526260]">
                      {property.effectiveRent}/mo effective - {property.savings} savings
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f5f8f1] p-4 text-sm text-[#526260]">
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
    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#173f3f] shadow-sm">
      {label}
    </span>
  );
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

function buildRecommendationText({
  lead,
  recommendationUrl,
  selectedFloorPlanItems = [],
  selectedProperties,
}) {
  const propertyNames = selectedProperties
    .map((property) => property.name)
    .filter(Boolean)
    .join(", ");
  const floorPlanNames = selectedFloorPlanItems
    .map((item) => `${item.floorPlanName} at ${item.propertyName}`)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const propertyPhrase = propertyNames
    ? `: ${propertyNames}`
    : "";
  const floorPlanPhrase = floorPlanNames
    ? ` I also highlighted these floor plans: ${floorPlanNames}.`
    : "";

  return ensureSmsOptOutLine(
    `Hi ${lead.name}, I put together ${selectedProperties.length} apartment option${selectedProperties.length === 1 ? "" : "s"} for you${propertyPhrase}.${floorPlanPhrase} View them here: ${recommendationUrl}. Reply with the ones you like and I can help schedule tours.`
  );
}

function getPropertyFloorPlanRecommendationItems(property) {
  if (!property?.floorPlans?.length) return [];

  return property.floorPlans.map((plan, index) => {
    if (typeof plan === "string") {
      return {
        propertyId: property.id,
        propertyName: property.name,
        floorPlanId: getFloorPlanRecommendationId(plan, index),
        floorPlanName: plan,
        beds: property.bedrooms?.[0] || "",
        baths: "",
        sqft: "",
        rent: property.rent || property.startingRent || "",
        effectiveRent: property.effectiveRent || "",
        special: property.special || "",
        available: "",
        image: getPropertyPrimaryImage(property),
      };
    }

    const floorPlanName = plan.name || `Floor Plan ${index + 1}`;
    const specialLabel = plan.special?.label || plan.currentSpecial || property.special || "";

    return {
      propertyId: property.id,
      propertyName: property.name,
      floorPlanId: String(plan.id || getFloorPlanRecommendationId(floorPlanName, index)),
      floorPlanName,
      beds: plan.bedrooms ?? plan.beds ?? "",
      baths: plan.bathrooms || plan.baths || "",
      sqft: plan.squareFeet || plan.sqft || "",
      rent: plan.startingRent || plan.rent || "",
      effectiveRent: plan.effectiveRent || "",
      special: specialLabel,
      available: plan.availability || plan.available || "",
      image: plan.image || getPropertyPrimaryImage(property),
    };
  });
}

function mergeFloorPlanRecommendationItems(items) {
  const itemMap = new Map();

  items
    .filter((item) => item?.propertyId && item?.floorPlanId)
    .forEach((item) => {
      const itemKey = getCompareFloorPlanItemKey(item);

      if (!itemMap.has(itemKey)) {
        itemMap.set(itemKey, item);
      }
    });

  return [...itemMap.values()];
}

function getFloorPlanRecommendationId(name, index) {
  return `${String(name || "floor-plan")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-${index}`;
}

function formatFloorPlanMeta(floorPlanItem) {
  return [
    formatBedroomLabel(floorPlanItem.beds),
    floorPlanItem.baths ? `${floorPlanItem.baths} ba` : "",
    floorPlanItem.sqft ? `${floorPlanItem.sqft} sq ft` : "",
    floorPlanItem.available,
  ]
    .filter(Boolean)
    .join(" • ");
}

function ensureSmsOptOutLine(message) {
  const trimmedMessage = String(message || "").trim();

  if (!trimmedMessage) return "";
  if (/reply\s+stop\s+to\s+opt\s+out/i.test(trimmedMessage)) {
    return trimmedMessage;
  }

  return `${trimmedMessage} Reply STOP to opt out.`;
}

function getRecommendationSmsHref(phone, message) {
  const cleanedPhone = String(phone || "").replace(/[^\d+]/g, "");

  return `sms:${cleanedPhone}?&body=${encodeURIComponent(message)}`;
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl bg-[#f5f8f1] p-4">
      <span className="text-sm font-semibold text-[#526260]">{label}</span>
      <span className="text-right text-sm font-black text-[#102426]">
        {value}
      </span>
    </div>
  );
}
