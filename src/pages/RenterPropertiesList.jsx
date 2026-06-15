import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BedDouble, Building2, CalendarDays, MapPin, PiggyBank } from "lucide-react";
import { getSupabaseLeadByToken } from "../data/supabaseLeadStorage";
import {
  getSupabaseTourRequestsForLead,
  saveSupabaseTourRequest,
} from "../data/supabaseTourStorage";
import { isLocalFallbackEnabled } from "../data/supabaseClient";

import {
  getAnyLeadByToken,
  getTourRequestsForLead,
  saveTourRequest,
} from "../data/leadStorage";

import { getAllProperties } from "../data/propertyStorage";
import { getPropertyPrimaryImage } from "../data/propertySearchData";

export default function RenterPropertiesList() {
  const { token } = useParams();
  const localFallbackLead = useMemo(
    () => (isLocalFallbackEnabled ? getAnyLeadByToken(token) : null),
    [token]
  );
  const [lead, setLead] = useState(null);
  const [isLoadingLead, setIsLoadingLead] = useState(true);
  const [isLocalFallbackLead, setIsLocalFallbackLead] = useState(false);
  const [existingTourRequests, setExistingTourRequests] = useState([]);
  const [properties, setProperties] = useState([]);

  const [requestedPropertyIds, setRequestedPropertyIds] = useState(
    existingTourRequests.map((request) => request.propertyId)
  );
  const [selectedTourProperty, setSelectedTourProperty] = useState(null);
  const [tourSuccessMessage, setTourSuccessMessage] = useState(
    existingTourRequests.length > 0
      ? `${existingTourRequests.length} tour request${existingTourRequests.length === 1 ? "" : "s"
      } submitted.`
      : ""
  );
  const [tourError, setTourError] = useState("");
  const [isSubmittingTour, setIsSubmittingTour] = useState(false);
  const [tourForm, setTourForm] = useState({
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  useEffect(() => {
    let isMounted = true;

    getAllProperties()
      .then((savedProperties) => {
        if (isMounted) setProperties(savedProperties);
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) setProperties([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const loadLead = async () => {
      try {
        setIsLoadingLead(true);

        const supabaseLead = await getSupabaseLeadByToken(token);

        if (supabaseLead) {
          setLead(supabaseLead);
          setIsLocalFallbackLead(false);

          const supabaseTourRequests = await getSupabaseTourRequestsForLead(
            supabaseLead.id
          );

          setExistingTourRequests(supabaseTourRequests);
          setRequestedPropertyIds(
            supabaseTourRequests.map((request) => request.propertyId)
          );

          if (supabaseTourRequests.length > 0) {
            setTourSuccessMessage(
              `${supabaseTourRequests.length} tour request${supabaseTourRequests.length === 1 ? "" : "s"
              } submitted.`
            );
          }

          setIsLoadingLead(false);
          return;
        }
      } catch (error) {
        console.error(error);
      }

      if (localFallbackLead) {
        const localTourRequests = getTourRequestsForLead(localFallbackLead.id);

        setLead(localFallbackLead);
        setIsLocalFallbackLead(true);
        setExistingTourRequests(localTourRequests);
        setRequestedPropertyIds(
          localTourRequests.map((request) => request.propertyId)
        );
      }

      setIsLoadingLead(false);
    };

    loadLead();
  }, [localFallbackLead, token]);

  const recommendedPropertyIds =
    lead?.recommendedPropertyIds || lead?.recommended_property_ids || [];
  const recommendedFloorPlanItems =
    lead?.recommendedFloorPlanItems || lead?.recommended_floor_plan_items || [];

  const allRecommendedProperties = recommendedPropertyIds
    .map((propertyId) => properties.find((property) => property.id === String(propertyId)))
    .filter(Boolean);

  const recommendedProperties = allRecommendedProperties.filter(
    (property) => property.status === "Live"
  );
  const recommendedFloorPlansByPropertyId = recommendedFloorPlanItems.reduce(
    (itemsByPropertyId, floorPlanItem) => {
      if (!floorPlanItem?.propertyId) return itemsByPropertyId;

      return {
        ...itemsByPropertyId,
        [floorPlanItem.propertyId]: [
          ...(itemsByPropertyId[floorPlanItem.propertyId] || []),
          floorPlanItem,
        ],
      };
    },
    {}
  );

  const openTourForm = (property) => {
    setSelectedTourProperty(property);
    setTourSuccessMessage("");
    setTourForm({
      preferredDate: "",
      preferredTime: "",
      message: "",
    });

    setTimeout(() => {
      document
        .getElementById("tour-request-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const submitTourRequest = async () => {
    if (!selectedTourProperty) return;

    if (
      !tourForm.preferredDate &&
      !tourForm.preferredTime &&
      !tourForm.message.trim()
    ) {
      setTourError("Please add a preferred date, time, or note before submitting.");
      return;
    }

    setTourError("");

    const tourRequest = {
      id: `${lead.id}-${selectedTourProperty.id}-${Date.now()}`,
      leadId: lead.id,
      leadName: lead.name,
      propertyId: selectedTourProperty.id,
      propertyName: selectedTourProperty.name,
      preferredDate: tourForm.preferredDate,
      preferredTime: tourForm.preferredTime,
      message: tourForm.message,
      status: "New",
      eventType: "tour_request",
      createdAt: new Date().toISOString(),
    };

    try {
      setIsSubmittingTour(true);

      if (isLocalFallbackLead) {
        saveTourRequest(tourRequest);
      } else {
        await saveSupabaseTourRequest(tourRequest);
      }

      setExistingTourRequests([tourRequest, ...existingTourRequests]);

      setRequestedPropertyIds((currentIds) => [
        ...new Set([...currentIds, selectedTourProperty.id]),
      ]);

      setTourSuccessMessage(`Tour request sent for ${selectedTourProperty.name}.`);
      setSelectedTourProperty(null);
      setTourForm({
        preferredDate: "",
        preferredTime: "",
        message: "",
      });
    } catch (error) {
      console.error(error);
      setTourError("Could not submit your tour request. Please try again.");
    } finally {
      setIsSubmittingTour(false);
    }
  };

  if (isLoadingLead) {
    return (
      <main className="min-h-screen bg-[#f5f8f1] p-6 text-[#102426]">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#d7e6df] bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-[#102426]">
            Loading recommendations...
          </h1>

          <p className="mt-2 text-[#526260]">
            Checking your apartment recommendation link.
          </p>
        </div>
      </main>
    );
  }

  if (!lead) {
    return (
      <main className="min-h-screen bg-[#f5f8f1] p-6 text-[#102426]">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#d7e6df] bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-[#102426]">
            Recommendation list not found
          </h1>

          <p className="mt-2 text-[#526260]">
            This link does not match an active renter recommendation list.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f8f1] p-6 text-[#102426]">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl bg-[#173f3f] text-white shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <div className="p-6 md:p-8">
              <p className="text-sm font-bold text-[#f2b84b]">
                Below Market Apartments
              </p>

              <h1 className="mt-3 text-4xl font-black md:text-5xl">
                {lead.name}, your apartment matches are ready.
              </h1>

              <p className="mt-4 max-w-2xl text-[#d7e6df]">
                These properties were selected around your search for {lead.preference}.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <HeroMetric
                  icon={BedDouble}
                  label="Bedrooms"
                  value={formatBedroomLabel(lead.bedrooms)}
                />
                <HeroMetric
                  icon={PiggyBank}
                  label="Budget"
                  value={lead.budget}
                />
                <HeroMetric
                  icon={CalendarDays}
                  label="Move-in"
                  value={lead.moveIn}
                />
              </div>
            </div>

            <img
              src={recommendedProperties[0]?.image}
              alt={recommendedProperties[0]?.name}
              className="h-72 w-full object-cover lg:h-full"
            />
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-black text-[#102426]">
                Recommended Apartments
              </h2>

              <p className="mt-2 text-[#526260]">
                Showing {recommendedProperties.length} deal-focused options selected by your locator.
              </p>
            </div>

            <div className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df]">
              Token: {token}
            </div>
          </div>

          {recommendedProperties.length > 0 ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {recommendedProperties.map((property) => (
                <RecommendedPropertyCard
                  key={property.id}
                  property={property}
                  recommendedFloorPlans={recommendedFloorPlansByPropertyId[property.id] || []}
                  requestedPropertyIds={requestedPropertyIds}
                  selectedTourPropertyId={selectedTourProperty?.id}
                  onRequestTour={openTourForm}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-[#b8d9d0] bg-white p-10 text-center shadow-sm">
              <h3 className="text-2xl font-black text-[#102426]">
                No available properties yet
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-[#526260]">
                {recommendedPropertyIds.length === 0
                  ? "Your locator has not selected recommended apartments for this link yet."
                  : "Your locator selected properties, but they are not marked Live yet."}
              </p>
            </div>
          )}
        </section>


        {selectedTourProperty && (
          <section
            id="tour-request-form"
            className="mt-8 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-bold uppercase tracking-wide text-[#1f6f63]">
              Request Tour
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#102426]">
              {selectedTourProperty.name}
            </h2>

            <p className="mt-1 text-sm font-semibold text-[#526260]">
              Add your preferred tour time and any notes for your locator.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-[#173f3f]">
                Preferred date
                <input
                  type="date"
                  value={tourForm.preferredDate}
                  onChange={(event) => {
                    setTourError("");
                    setTourForm({
                      ...tourForm,
                      preferredDate: event.target.value,
                    });
                  }}
                  className="mt-2 w-full rounded-2xl border border-[#d7e6df] px-4 py-3 font-semibold outline-none focus:border-[#2d7dd2]"
                />
              </label>

              <label className="text-sm font-bold text-[#173f3f]">
                Preferred time
                <select
                  value={tourForm.preferredTime}
                  onChange={(event) => {
                    setTourError("");
                    setTourForm({
                      ...tourForm,
                      preferredTime: event.target.value,
                    });
                  }}
                  className="mt-2 w-full rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 font-semibold outline-none focus:border-[#2d7dd2]"
                >
                  <option value="">Select a time</option>
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block text-sm font-bold text-[#173f3f]">
              Notes for your locator
              <textarea
                value={tourForm.message}
                onChange={(event) =>
                  setTourForm({
                    ...tourForm,
                    message: event.target.value,
                  })
                }
                rows={4}
                placeholder="Example: Saturday morning works best for me."
                className="mt-2 w-full resize-none rounded-2xl border border-[#d7e6df] px-4 py-3 font-semibold outline-none focus:border-[#2d7dd2]"
              />
            </label>

            {tourError && (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {tourError}
              </p>
            )}


            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={submitTourRequest}
                disabled={isSubmittingTour}
                className="rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#b8d9d0]"
              >
                {isSubmittingTour ? "Submitting..." : "Submit Tour Request"}
              </button>

              <button
                type="button"
                onClick={() => setSelectedTourProperty(null)}
                className="rounded-2xl bg-[#e7f3ee] px-5 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
              >
                Cancel
              </button>
            </div>
          </section>
        )}
        {tourSuccessMessage && (
          <div className="mt-6 rounded-2xl border border-[#d7e6df] bg-[#e7f3ee] px-5 py-4 text-sm font-bold text-[#1f6f63]">
            {tourSuccessMessage}
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black text-[#102426]">
                Ready to tour?
              </h2>

              <p className="mt-1 text-[#526260]">
                Reply to your locator with the properties you like best.
              </p>
            </div>

            <a
              href={`tel:${lead.phone}`}
              className="rounded-2xl bg-[#173f3f] px-5 py-3 text-center text-sm font-bold text-white hover:bg-[#102426]"
            >
              Call Locator
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
      <Icon className="h-5 w-5 text-[#f2b84b]" />
      <p className="mt-3 text-xs font-bold uppercase text-[#d7e6df]">
        {label}
      </p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function formatBedroomLabel(value, fallbackName = "") {
  const normalizedValue = String(value ?? "").trim();
  const normalizedFallback = String(fallbackName || "").trim();
  if (
    /studio/i.test(normalizedValue) ||
    normalizedValue === "0" ||
    /studio/i.test(normalizedFallback) ||
    /^s\d*[a-z]?$/i.test(normalizedFallback)
  ) {
    return "Studio";
  }
  if (!normalizedValue) return "Bedrooms not listed";
  if (/\bbd\b/i.test(normalizedValue)) return normalizedValue;

  const bedMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*beds?$/i);
  if (bedMatch) return `${bedMatch[1]} bd`;

  const numberMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)$/);
  if (numberMatch) return `${numberMatch[1]} bd`;

  return normalizedValue;
}

function formatFloorPlanMeta(floorPlanItem) {
  return [
    formatBedroomLabel(floorPlanItem.beds, floorPlanItem.floorPlanName),
    floorPlanItem.baths ? `${floorPlanItem.baths} ba` : "",
    floorPlanItem.sqft ? `${floorPlanItem.sqft} sq ft` : "",
    floorPlanItem.available,
  ]
    .filter(Boolean)
    .join(" • ");
}

function RecommendedPropertyCard({
  property,
  recommendedFloorPlans = [],
  requestedPropertyIds,
  selectedTourPropertyId,
  onRequestTour,
}) {
  const isTourRequested = requestedPropertyIds.includes(property.id);
  const isTourSelected = selectedTourPropertyId === property.id;
  const primaryImage = getPropertyPrimaryImage(property);

  return (
    <article className="overflow-hidden rounded-3xl border border-[#d7e6df] bg-white shadow-sm">
      <img
        src={primaryImage}
        alt={property.name}
        className="h-56 w-full object-cover"
      />

      <div className="p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-2xl font-black text-[#102426]">
              {property.name}
            </h3>

            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#526260]">
              <MapPin className="h-4 w-4" />
              {property.area}
            </p>
          </div>

          {property.belowMarketPercent && (
            <span className="rounded-full bg-[#d8efe6] px-3 py-1 text-xs font-bold text-[#1f6f63]">
              {property.belowMarketPercent} special value
            </span>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DealStat label="Effective Rent" value={property.effectiveRent} />
          <DealStat label="Normal Rent" value={property.rent || property.startingRent} />
          <DealStat label="Special Value" value={property.savings} />
        </div>

        <div className="mt-5 rounded-2xl bg-[#fff8e6] p-4 ring-1 ring-[#f2d08a]">
          <p className="text-sm font-bold text-[#8a5b0a]">Current Special</p>
          <p className="mt-1 font-black text-[#102426]">{property.special}</p>
        </div>

        {recommendedFloorPlans.length > 0 && (
          <div className="mt-5 rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]">
            <p className="text-sm font-black text-[#1f6f63]">
              Locator floor plan picks
            </p>
            <p className="mt-1 text-xs font-semibold text-[#526260]">
              These are the specific layouts your locator highlighted for you.
            </p>

            <div className="mt-3 grid gap-3">
              {recommendedFloorPlans.map((floorPlanItem) => (
                <div
                  key={`${floorPlanItem.propertyId}-${floorPlanItem.floorPlanId}`}
                  className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#d7e6df]"
                >
                  <div className="flex gap-3">
                    <img
                      src={floorPlanItem.image || primaryImage}
                      alt={`${floorPlanItem.floorPlanName} floor plan`}
                      className="h-16 w-20 shrink-0 rounded-xl object-cover"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#102426]">
                        {floorPlanItem.floorPlanName}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#526260]">
                        {formatFloorPlanMeta(floorPlanItem)}
                      </p>
                      <p className="mt-1 text-xs font-black text-[#8a5b0a]">
                        {floorPlanItem.effectiveRent || floorPlanItem.rent || "Contact for pricing"}
                      </p>
                    </div>
                  </div>

                  {floorPlanItem.special && (
                    <p className="mt-2 truncate text-xs font-bold text-[#8a5b0a]">
                      {floorPlanItem.special}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to={`/properties/${property.id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
          >
            <Building2 className="h-4 w-4" />
            View Property
          </Link>

          <button
            onClick={() => onRequestTour(property)}
            disabled={isTourRequested}
            className={`flex-1 rounded-2xl px-5 py-3 text-sm font-bold ${isTourRequested
              ? "bg-[#d8efe6] text-[#1f6f63]"
              : isTourSelected
                ? "bg-[#173f3f] text-white"
                : "bg-[#e7f3ee] text-[#173f3f] hover:bg-[#d7e6df]"
              }`}
          >
            {isTourRequested
              ? "Tour Requested"
              : isTourSelected
                ? "Selected"
                : "Request Tour"}
          </button>
        </div>
      </div>
    </article>
  );
}

function DealStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]">
      <p className="text-xs font-bold uppercase text-[#526260]">{label}</p>
      <p className="mt-2 text-lg font-black text-[#102426]">{value}</p>
    </div>
  );
}
