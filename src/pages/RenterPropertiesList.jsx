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

import { getAnyPropertyById } from "../data/propertyStorage";

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

  const allRecommendedProperties = recommendedPropertyIds
    .map((propertyId) => getAnyPropertyById(propertyId))
    .filter(Boolean);

  const recommendedProperties = allRecommendedProperties.filter(
    (property) => property.status === "Live"
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
      <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-slate-900">
            Loading recommendations...
          </h1>

          <p className="mt-2 text-slate-500">
            Checking your apartment recommendation link.
          </p>
        </div>
      </main>
    );
  }

  if (!lead) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-slate-900">
            Recommendation list not found
          </h1>

          <p className="mt-2 text-slate-500">
            This link does not match an active renter recommendation list.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <div className="p-6 md:p-8">
              <p className="text-sm font-bold text-slate-300">
                Below Market Apartments
              </p>

              <h1 className="mt-3 text-4xl font-black md:text-5xl">
                {lead.name}, your apartment matches are ready.
              </h1>

              <p className="mt-4 max-w-2xl text-slate-300">
                These properties were selected around your search for {lead.preference}.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <HeroMetric
                  icon={BedDouble}
                  label="Bedrooms"
                  value={lead.bedrooms}
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
              <h2 className="text-3xl font-black text-slate-900">
                Recommended Apartments
              </h2>

              <p className="mt-2 text-slate-500">
                Showing {recommendedProperties.length} below-market options selected by your locator.
              </p>
            </div>

            <div className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm">
              Token: {token}
            </div>
          </div>

          {recommendedProperties.length > 0 ? (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {recommendedProperties.map((property) => (
                <RecommendedPropertyCard
                  key={property.id}
                  property={property}
                  requestedPropertyIds={requestedPropertyIds}
                  selectedTourPropertyId={selectedTourProperty?.id}
                  onRequestTour={openTourForm}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <h3 className="text-2xl font-black text-slate-900">
                No available properties yet
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-slate-500">
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
            className="mt-8 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
              Request Tour
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {selectedTourProperty.name}
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Add your preferred tour time and any notes for your locator.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">
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
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-slate-400"
                />
              </label>

              <label className="text-sm font-bold text-slate-700">
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
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-slate-400"
                >
                  <option value="">Select a time</option>
                  <option>Morning</option>
                  <option>Afternoon</option>
                  <option>Evening</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block text-sm font-bold text-slate-700">
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
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-slate-400"
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
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmittingTour ? "Submitting..." : "Submit Tour Request"}
              </button>

              <button
                type="button"
                onClick={() => setSelectedTourProperty(null)}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </section>
        )}
        {tourSuccessMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {tourSuccessMessage}
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                Ready to tour?
              </h2>

              <p className="mt-1 text-slate-500">
                Reply to your locator with the properties you like best.
              </p>
            </div>

            <a
              href={`tel:${lead.phone}`}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
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
    <div className="rounded-2xl bg-white/10 p-4">
      <Icon className="h-5 w-5 text-slate-300" />
      <p className="mt-3 text-xs font-bold uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function RecommendedPropertyCard({
  property,
  requestedPropertyIds,
  selectedTourPropertyId,
  onRequestTour,
}) {
  const isTourRequested = requestedPropertyIds.includes(property.id);
  const isTourSelected = selectedTourPropertyId === property.id;
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <img
        src={property.image}
        alt={property.name}
        className="h-56 w-full object-cover"
      />

      <div className="p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              {property.name}
            </h3>

            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <MapPin className="h-4 w-4" />
              {property.area}
            </p>
          </div>

          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
            {property.belowMarketPercent} below market
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DealStat label="Effective Rent" value={property.effectiveRent} />
          <DealStat label="Market Rent" value={property.marketRent} />
          <DealStat label="Savings" value={property.savings} />
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-500">Current Special</p>
          <p className="mt-1 font-black text-slate-900">{property.special}</p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            to={`/properties/${property.id}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Building2 className="h-4 w-4" />
            View Property
          </Link>

          <button
            onClick={() => onRequestTour(property)}
            disabled={isTourRequested}
            className={`flex-1 rounded-2xl px-5 py-3 text-sm font-bold ${isTourRequested
              ? "bg-emerald-100 text-emerald-700"
              : isTourSelected
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}
