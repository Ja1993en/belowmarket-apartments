import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BedDouble, Building2, CalendarDays, MapPin, PiggyBank } from "lucide-react";
import { getSupabaseLeadByToken } from "../data/supabaseLeadStorage";
import {
  getSupabaseTourRequestsForLead,
  saveSupabaseTourRequest,
} from "../data/supabaseTourStorage";
import { saveLeadEventInBackground } from "../data/supabaseLeadEvents";
import { isLocalFallbackEnabled } from "../data/supabaseClient";

import {
  getAnyLeadByToken,
  getTourRequestsForLead,
  saveTourRequest,
} from "../data/leadStorage";

import { getAllProperties } from "../data/propertyStorage";
import {
  getFloorPlanCardImage,
  getPropertyAddressLabel,
  getPropertyPrimaryImage,
  hasPreciseStreetAddress,
  isReliableGeocodeResult,
} from "../data/propertySearchData";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const DALLAS_CENTER = [-96.797, 32.7767];
const EMPTY_ARRAY = [];
const NEARBY_PLACE_RADIUS_MILES = 12;
const mapboxGeocodeRequests = new Map();

const NEARBY_PLACE_TYPES = [
  { label: "Walmart", type: "walmart", color: "bg-[#2d7dd2]" },
  { label: "Target", type: "target", color: "bg-[#e4572e]" },
  { label: "LA Fitness", type: "laFitness", color: "bg-[#173f3f]" },
  { label: "Planet Fitness", type: "planetFitness", color: "bg-[#8a5b0a]" },
  { label: "Kroger", type: "kroger", color: "bg-[#1f6f63]" },
];

const NEARBY_PLACE_CATALOG = [
  {
    type: "walmart",
    name: "Walmart Supercenter",
    detail: "Retail Road, Dallas",
    latitude: 32.8613,
    longitude: -96.7614,
  },
  {
    type: "walmart",
    name: "Walmart Supercenter",
    detail: "North Cockrell Hill Road, Dallas",
    latitude: 32.7538,
    longitude: -96.8906,
  },
  {
    type: "walmart",
    name: "Walmart Supercenter",
    detail: "Webb Chapel Road, Dallas",
    latitude: 32.8674,
    longitude: -96.8712,
  },
  {
    type: "walmart",
    name: "Walmart Supercenter",
    detail: "Market Place Boulevard, Irving",
    latitude: 32.8369,
    longitude: -96.9632,
  },
  {
    type: "walmart",
    name: "Walmart Supercenter",
    detail: "North Garland Avenue, Garland",
    latitude: 32.9613,
    longitude: -96.6462,
  },
  {
    type: "target",
    name: "Target",
    detail: "Cityplace Market, Dallas",
    latitude: 32.8058,
    longitude: -96.7857,
  },
  {
    type: "target",
    name: "Target",
    detail: "Medallion Center, Dallas",
    latitude: 32.8647,
    longitude: -96.7522,
  },
  {
    type: "target",
    name: "Target",
    detail: "Belt Line Road, Addison",
    latitude: 32.9534,
    longitude: -96.8531,
  },
  {
    type: "target",
    name: "Target",
    detail: "West Airport Freeway, Irving",
    latitude: 32.8364,
    longitude: -96.9947,
  },
  {
    type: "target",
    name: "Target",
    detail: "North Garland Avenue, Garland",
    latitude: 32.9618,
    longitude: -96.6478,
  },
  {
    type: "laFitness",
    name: "LA Fitness",
    detail: "East Mockingbird Lane, Dallas",
    latitude: 32.8374,
    longitude: -96.7705,
  },
  {
    type: "laFitness",
    name: "LA Fitness",
    detail: "Marsh Lane, Dallas",
    latitude: 32.9142,
    longitude: -96.8568,
  },
  {
    type: "laFitness",
    name: "LA Fitness",
    detail: "North MacArthur Boulevard, Irving",
    latitude: 32.8737,
    longitude: -96.9598,
  },
  {
    type: "laFitness",
    name: "LA Fitness",
    detail: "West Campbell Road, Richardson",
    latitude: 32.9759,
    longitude: -96.7686,
  },
  {
    type: "planetFitness",
    name: "Planet Fitness",
    detail: "Ross Avenue, Dallas",
    latitude: 32.8137,
    longitude: -96.7714,
  },
  {
    type: "planetFitness",
    name: "Planet Fitness",
    detail: "Buckner Boulevard, Dallas",
    latitude: 32.7937,
    longitude: -96.6865,
  },
  {
    type: "planetFitness",
    name: "Planet Fitness",
    detail: "Frankford Road, Dallas",
    latitude: 32.9991,
    longitude: -96.8296,
  },
  {
    type: "planetFitness",
    name: "Planet Fitness",
    detail: "North Belt Line Road, Irving",
    latitude: 32.8559,
    longitude: -96.9924,
  },
  {
    type: "kroger",
    name: "Kroger",
    detail: "Cedar Springs Road, Dallas",
    latitude: 32.8137,
    longitude: -96.8079,
  },
  {
    type: "kroger",
    name: "Kroger",
    detail: "East Mockingbird Lane, Dallas",
    latitude: 32.8365,
    longitude: -96.7703,
  },
  {
    type: "kroger",
    name: "Kroger",
    detail: "Maple Avenue, Dallas",
    latitude: 32.8182,
    longitude: -96.8244,
  },
  {
    type: "kroger",
    name: "Kroger",
    detail: "Preston Road, Dallas",
    latitude: 32.9855,
    longitude: -96.8048,
  },
  {
    type: "kroger",
    name: "Kroger",
    detail: "North Garland Avenue, Garland",
    latitude: 32.9631,
    longitude: -96.6485,
  },
];

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
  const [hoveredPropertyId, setHoveredPropertyId] = useState("");
  const [mappableRecommendedProperties, setMappableRecommendedProperties] =
    useState([]);
  const loggedRenterLinkOpenRef = useRef(false);
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

          if (!loggedRenterLinkOpenRef.current) {
            loggedRenterLinkOpenRef.current = true;
            saveLeadEventInBackground({
              leadId: supabaseLead.id,
              eventType: "recommendation_page_viewed",
              metadata: {
                token,
                viewedAt: new Date().toISOString(),
                pageUrl: window.location.href,
                referrer: document.referrer || "",
                recommendedPropertyIds: supabaseLead.recommendedPropertyIds || [],
                recommendedPropertyCount:
                  supabaseLead.recommendedPropertyIds?.length || 0,
                recommendedFloorPlanCount:
                  supabaseLead.recommendedFloorPlanItems?.length || 0,
              },
            });
          }

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

  const recommendedPropertyIds = useMemo(
    () => lead?.recommendedPropertyIds || lead?.recommended_property_ids || EMPTY_ARRAY,
    [lead]
  );
  const recommendedFloorPlanItems = useMemo(
    () => lead?.recommendedFloorPlanItems || lead?.recommended_floor_plan_items || EMPTY_ARRAY,
    [lead]
  );

  const allRecommendedProperties = useMemo(
    () =>
      recommendedPropertyIds
        .map((propertyId) => properties.find((property) => property.id === String(propertyId)))
        .filter(Boolean),
    [properties, recommendedPropertyIds]
  );

  const recommendedProperties = useMemo(
    () =>
      allRecommendedProperties.filter((property) => property.status === "Live"),
    [allRecommendedProperties]
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

  useEffect(() => {
    let isMounted = true;

    Promise.all(
      recommendedProperties.map(async (property) => {
        const directCoordinates = getPropertyCoordinates(property);

        if (directCoordinates) {
          return {
            ...property,
            ...directCoordinates,
          };
        }

        const geocodedCoordinates =
          (await geocodePropertyAddress(property)) ||
          (await geocodePropertyArea(property));

        if (!geocodedCoordinates) return null;

        return {
          ...property,
          ...geocodedCoordinates,
          mapAccuracy: "geocoded",
        };
      })
    )
      .then((mappedProperties) => {
        if (isMounted) {
          setMappableRecommendedProperties(mappedProperties.filter(Boolean));
        }
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) setMappableRecommendedProperties([]);
      });

    return () => {
      isMounted = false;
    };
  }, [recommendedProperties]);

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
        saveLeadEventInBackground({
          leadId: lead.id,
          eventType: "tour_requested",
          propertyId: selectedTourProperty.id,
          propertyName: selectedTourProperty.name,
          metadata: {
            preferredDate: tourForm.preferredDate,
            preferredTime: tourForm.preferredTime,
            hasMessage: Boolean(tourForm.message.trim()),
            token,
          },
        });
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
            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,36vw)] md:items-start lg:grid-cols-[minmax(0,1fr)_minmax(340px,36vw)] xl:grid-cols-[minmax(0,1fr)_minmax(420px,38vw)]">
              <div className="order-2 min-w-0 md:order-1">
                <div className="rounded-xl border border-[#d7e6df] bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-[#102426]">
                        Showing {recommendedProperties.length} recommended {recommendedProperties.length === 1 ? "listing" : "listings"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#526260]">
                        Selected by your apartment locator for this renter link.
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-[#f5f8f1] px-3 py-1.5 text-xs font-black text-[#526260] ring-1 ring-[#d7e6df]">
                      {mappableRecommendedProperties.length} map {mappableRecommendedProperties.length === 1 ? "pin" : "pins"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  {recommendedProperties.map((property) => (
                    <RecommendedPropertyCard
                      key={property.id}
                      property={property}
                      recommendedFloorPlans={recommendedFloorPlansByPropertyId[property.id] || []}
                      requestedPropertyIds={requestedPropertyIds}
                      selectedTourPropertyId={selectedTourProperty?.id}
                      isHighlighted={hoveredPropertyId === property.id}
                      onHover={setHoveredPropertyId}
                      onRequestTour={openTourForm}
                    />
                  ))}
                </div>
              </div>

              <aside className="order-1 md:sticky md:top-24 md:order-2">
                <RecommendationMapPanel
                  properties={mappableRecommendedProperties}
                  hoveredPropertyId={hoveredPropertyId}
                  onPropertyHover={setHoveredPropertyId}
                />
              </aside>
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
  isHighlighted = false,
  onHover,
  onRequestTour,
}) {
  const isTourRequested = requestedPropertyIds.includes(property.id);
  const isTourSelected = selectedTourPropertyId === property.id;
  const primaryImage = getPropertyPrimaryImage(property);
  const addressLabel = getPropertyAddressLabel(property);

  return (
    <article
      id={`recommendation-${property.id}`}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.("")}
      onFocus={() => onHover?.(property.id)}
      onBlur={() => onHover?.("")}
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
        isHighlighted
          ? "border-[#f2b84b] ring-2 ring-[#f2b84b]"
          : "border-[#d7e6df]"
      }`}
    >
      <div className="grid min-h-[260px] md:grid-cols-[minmax(220px,34%)_minmax(0,1fr)]">
        <div className="relative min-h-[220px] overflow-hidden md:min-h-full">
          <img
            src={primaryImage}
            alt={property.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />

          {property.belowMarketPercent && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-[#1f6f63] shadow-sm ring-1 ring-[#d7e6df]">
              {property.belowMarketPercent} value
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-black text-[#102426]">
                {property.name}
              </h3>

              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#526260]">
                <MapPin className="h-4 w-4 shrink-0 text-[#2d7dd2]" />
                <span className="truncate">
                  {addressLabel || property.area || "Dallas area"}
                </span>
              </p>
            </div>

            <div className="shrink-0 rounded-xl bg-[#fff8e6] px-3 py-2 text-left ring-1 ring-[#f2d08a] lg:max-w-[220px]">
              <p className="text-[10px] font-black uppercase text-[#8a5b0a]">
                Current special
              </p>
              <p className="mt-1 line-clamp-2 text-xs font-black leading-4 text-[#102426]">
                {property.special || "Ask about current specials"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <DealStat label="Effective" value={property.effectiveRent || "Contact"} />
            <DealStat label="Listed" value={property.rent || property.startingRent || "Contact"} />
            <DealStat label="Savings" value={property.savings || "Verify"} />
          </div>

          {recommendedFloorPlans.length > 0 && (
            <div className="mt-4 rounded-2xl bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#1f6f63]">
                    Locator floor plan picks
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[#526260]">
                    Specific layouts highlighted for this recommendation.
                  </p>
                </div>

                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#526260] ring-1 ring-[#d7e6df]">
                  {recommendedFloorPlans.length} {recommendedFloorPlans.length === 1 ? "plan" : "plans"}
                </span>
              </div>

              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {recommendedFloorPlans.slice(0, 4).map((floorPlanItem) => (
                  <div
                    key={`${floorPlanItem.propertyId}-${floorPlanItem.floorPlanId}`}
                    className="min-w-0 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-[#d7e6df]"
                  >
                    <div className="flex min-w-0 gap-3">
                      <img
                        src={getFloorPlanCardImage(floorPlanItem, primaryImage)}
                        alt={`${floorPlanItem.floorPlanName} floor plan`}
                        loading="lazy"
                        decoding="async"
                        className="h-14 w-16 shrink-0 rounded-lg bg-[#f5f8f1] object-cover"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#102426]">
                          {floorPlanItem.floorPlanName}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#526260]">
                          {formatFloorPlanMeta(floorPlanItem)}
                        </p>
                        <p className="mt-0.5 truncate text-xs font-black text-[#8a5b0a]">
                          {floorPlanItem.effectiveRent || floorPlanItem.rent || "Contact for pricing"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
            <Link
              to={`/properties/${property.id}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#173f3f] px-4 py-3 text-sm font-black !text-white hover:bg-[#102426] hover:!text-white"
            >
              <Building2 className="h-4 w-4" />
              View Property
            </Link>

            <button
              onClick={() => onRequestTour(property)}
              disabled={isTourRequested}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-black ${
                isTourRequested
                  ? "bg-[#d8efe6] text-[#1f6f63]"
                  : isTourSelected
                    ? "bg-[#173f3f] !text-white"
                    : "bg-[#f2b84b] text-[#102426] hover:bg-[#f9d783]"
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
      </div>
    </article>
  );
}

function RecommendationMapPanel({
  properties,
  hoveredPropertyId,
  onPropertyHover,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapboxGl, setMapboxGl] = useState(null);
  const [mapError, setMapError] = useState("");
  const nearbyPlaces = useMemo(
    () => resolveNearbyPlacesForRecommendations(properties),
    [properties]
  );

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      setMapError("Map is unavailable right now.");
      return undefined;
    }

    let isMounted = true;

    loadMapboxGl()
      .then((loadedMapboxGl) => {
        if (isMounted) {
          loadedMapboxGl.accessToken = MAPBOX_TOKEN;
          setMapboxGl(loadedMapboxGl);
        }
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) {
          setMapError("Could not load the recommendation map.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!mapboxGl || !mapContainerRef.current || mapRef.current) return;

    mapRef.current = new mapboxGl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DALLAS_CENTER,
      zoom: 10.5,
      attributionControl: false,
    });

    mapRef.current.addControl(
      new mapboxGl.NavigationControl({ showCompass: false }),
      "bottom-right"
    );

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapboxGl]);

  useEffect(() => {
    if (!mapboxGl || !mapRef.current) return;

    const map = mapRef.current;
    const bounds = new mapboxGl.LngLatBounds();

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    properties.forEach((property) => {
      const markerElement = createRecommendationMapPinElement(property);

      markerElement.addEventListener("mouseenter", () => {
        onPropertyHover?.(property.id);
      });
      markerElement.addEventListener("mouseleave", () => {
        onPropertyHover?.("");
      });
      markerElement.addEventListener("click", () => {
        onPropertyHover?.(property.id);
        document
          .getElementById(`recommendation-${property.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      const marker = new mapboxGl.Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat([property.longitude, property.latitude])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([property.longitude, property.latitude]);
    });

    nearbyPlaces.forEach((place) => {
      const marker = new mapboxGl.Marker({
        element: createNearbyMapMarker(place),
        anchor: "bottom",
      })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);

      markersRef.current.push(marker);
      bounds.extend([place.longitude, place.latitude]);
    });

    if (properties.length + nearbyPlaces.length > 1) {
      map.fitBounds(bounds, {
        padding: window.innerWidth < 640 ? 48 : 70,
        maxZoom: 12.8,
        duration: 500,
      });
    } else if (properties.length === 1) {
      map.flyTo({
        center: [properties[0].longitude, properties[0].latitude],
        zoom: 13,
        duration: 500,
      });
    }
  }, [mapboxGl, nearbyPlaces, onPropertyHover, properties]);

  useEffect(() => {
    markersRef.current.forEach((marker) => {
      const markerElement = marker.getElement?.();
      if (!markerElement) return;

      setRecommendationMapPinHighlight(
        markerElement,
        markerElement.dataset.propertyId === hoveredPropertyId
      );
    });
  }, [hoveredPropertyId]);

  return (
    <div className="overflow-hidden rounded-xl border border-[#d7e6df] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#d7e6df] px-4 py-3">
        <div>
          <p className="text-sm font-black text-[#102426]">Map view</p>
          <p className="text-xs font-bold text-[#526260]">
            Tap a pin to jump to that recommendation.
          </p>
        </div>

        <span className="rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-black text-[#1f6f63]">
          {properties.length} {properties.length === 1 ? "pin" : "pins"}
        </span>
      </div>

      <div className="relative overflow-hidden">
        {mapError ? (
          <div className="flex h-[420px] items-center justify-center bg-[#f5f8f1] p-6 text-center text-sm font-bold text-[#526260] md:h-[480px] lg:h-[min(520px,calc(100vh-220px))] lg:min-h-[380px]">
            {mapError}
          </div>
        ) : (
          <div
            ref={mapContainerRef}
            className="h-[420px] w-full bg-[#dcebe4] md:h-[480px] lg:h-[min(520px,calc(100vh-220px))] lg:min-h-[380px]"
          />
        )}
      </div>

      <div className="flex max-h-32 flex-wrap items-center gap-2 overflow-y-auto overscroll-contain border-t border-[#d7e6df] bg-white p-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MapLegendItem color="bg-[#f2b84b]" label="Apartments" />

        {NEARBY_PLACE_TYPES.map((placeType) => (
          <MapLegendItem
            key={placeType.type}
            color={placeType.color}
            label={placeType.label}
            distance={getNearbyLegendDistance(nearbyPlaces, placeType.type)}
          />
        ))}
      </div>
    </div>
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

function getPropertyCoordinates(property) {
  const latitude = Number(property.latitude || property.lat);
  const longitude = Number(property.longitude || property.lng);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return {
      latitude,
      longitude,
      mapAccuracy: property.mapAccuracy || "exact",
    };
  }

  if (Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
    const [coordinateLongitude, coordinateLatitude] = property.coordinates.map(Number);

    if (Number.isFinite(coordinateLatitude) && Number.isFinite(coordinateLongitude)) {
      return {
        latitude: coordinateLatitude,
        longitude: coordinateLongitude,
        mapAccuracy: property.mapAccuracy || "exact",
      };
    }
  }

  return null;
}

async function geocodePropertyAddress(property) {
  if (!MAPBOX_TOKEN) return null;
  if (!hasPreciseStreetAddress(property)) return null;

  const addressLabel = getPropertyAddressLabel(property);
  if (!addressLabel || addressLabel === "Dallas, TX") return null;

  return geocodeMapboxQuery(addressLabel, {
    cacheKey: `bma-recommendation-mapbox-geocode:${addressLabel.toLowerCase()}`,
    requireReliableAddress: true,
  });
}

async function geocodePropertyArea(property) {
  if (!MAPBOX_TOKEN) return null;

  const areaLabel = [property?.city, property?.state, property?.zipcode]
    .filter(Boolean)
    .join(", ");

  if (!areaLabel) return null;

  return geocodeMapboxQuery(areaLabel, {
    cacheKey: `bma-recommendation-mapbox-area-geocode:${areaLabel.toLowerCase()}`,
    requireReliableAddress: false,
  });
}

async function geocodeMapboxQuery(query, options = {}) {
  const cachedCoordinates = getCachedCoordinates(options.cacheKey);
  if (cachedCoordinates) return cachedCoordinates;

  if (options.cacheKey && mapboxGeocodeRequests.has(options.cacheKey)) {
    return mapboxGeocodeRequests.get(options.cacheKey);
  }

  const geocodeRequest = fetchMapboxGeocode(query, options);

  if (options.cacheKey) {
    mapboxGeocodeRequests.set(options.cacheKey, geocodeRequest);
  }

  return geocodeRequest;
}

async function fetchMapboxGeocode(query, options = {}) {
  const geocodingUrl = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  geocodingUrl.searchParams.set("access_token", MAPBOX_TOKEN);
  geocodingUrl.searchParams.set("country", "US");
  geocodingUrl.searchParams.set("limit", "1");

  const response = await fetch(geocodingUrl);
  if (!response.ok) return null;

  const geocodingResult = await response.json();
  const firstFeature = geocodingResult.features?.[0];
  if (options.requireReliableAddress && !isReliableGeocodeResult(firstFeature)) {
    return null;
  }

  const [longitude, latitude] = firstFeature?.center || [];

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const coordinates = { latitude, longitude };
  setCachedCoordinates(options.cacheKey, coordinates);

  return coordinates;
}

function getCachedCoordinates(cacheKey) {
  if (!cacheKey) return null;

  try {
    const cachedValue = localStorage.getItem(cacheKey);
    if (!cachedValue) return null;

    const coordinates = JSON.parse(cachedValue);
    const latitude = Number(coordinates.latitude);
    const longitude = Number(coordinates.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
}

function setCachedCoordinates(cacheKey, coordinates) {
  if (!cacheKey) return;

  try {
    localStorage.setItem(cacheKey, JSON.stringify(coordinates));
  } catch (error) {
    console.warn("Could not cache recommendation map coordinates.", error);
  }
}

function loadMapboxGl() {
  if (window.mapboxgl) {
    return Promise.resolve(window.mapboxgl);
  }

  if (!document.querySelector("link[data-mapbox-gl='true']")) {
    const mapboxStyles = document.createElement("link");
    mapboxStyles.rel = "stylesheet";
    mapboxStyles.href = "https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.css";
    mapboxStyles.dataset.mapboxGl = "true";
    document.head.appendChild(mapboxStyles);
  }

  const existingScript = document.querySelector("script[data-mapbox-gl='true']");
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(window.mapboxgl), {
        once: true,
      });
      existingScript.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const mapboxScript = document.createElement("script");
    mapboxScript.src = "https://api.mapbox.com/mapbox-gl-js/v3.10.0/mapbox-gl.js";
    mapboxScript.async = true;
    mapboxScript.dataset.mapboxGl = "true";
    mapboxScript.addEventListener("load", () => resolve(window.mapboxgl), {
      once: true,
    });
    mapboxScript.addEventListener("error", reject, { once: true });
    document.head.appendChild(mapboxScript);
  });
}

function createRecommendationMapPinElement(property) {
  const markerElement = document.createElement("button");
  markerElement.type = "button";
  markerElement.dataset.propertyId = property.id;
  markerElement.className =
    "group relative flex -translate-y-1 flex-col items-center focus:outline-none";
  markerElement.title = property.name;
  markerElement.setAttribute("aria-label", `${property.name} map pin. Preview recommendation.`);
  markerElement.innerHTML = `
    ${getMapMarkerTooltipHtml(property.name, [
      getPropertyAddressLabel(property) || property.area || "Recommended apartment",
      property.special || "",
    ])}
    <span
      data-recommendation-map-pin-dot="true"
      class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#f2b84b] text-[10px] font-black text-[#102426] shadow-lg ring-1 ring-[#8a5b0a]/25 transition group-hover:scale-110 group-focus:scale-110"
    >BMA</span>
    <span class="-mt-1.5 h-3 w-3 rotate-45 border-b-2 border-r-2 border-white bg-[#f2b84b] shadow-sm"></span>
  `;

  return markerElement;
}

function createNearbyMapMarker(place) {
  const colors = {
    walmart: "bg-[#2d7dd2]",
    target: "bg-[#e4572e]",
    laFitness: "bg-[#173f3f]",
    planetFitness: "bg-[#8a5b0a]",
    kroger: "bg-[#1f6f63]",
  };
  const abbreviations = {
    walmart: "W",
    target: "T",
    laFitness: "LA",
    planetFitness: "PF",
    kroger: "K",
  };
  const markerElement = document.createElement("div");
  const label = getCleanNearbyPlaceLabel(place);

  markerElement.className = "group relative flex flex-col items-center outline-none";
  markerElement.title = `${label} - ${place.distanceMiles.toFixed(1)} miles away`;
  markerElement.tabIndex = 0;
  markerElement.setAttribute("role", "button");
  markerElement.setAttribute("aria-label", markerElement.title);
  markerElement.innerHTML = `
    ${getMapMarkerTooltipHtml(label, [
      place.detail,
      `${place.distanceMiles.toFixed(1)} miles from the closest recommendation`,
    ])}
    <div class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white ${colors[place.type]} text-[10px] font-black text-white shadow-md">${abbreviations[place.type]}</div>
  `;

  return markerElement;
}

function setRecommendationMapPinHighlight(markerElement, isHighlighted) {
  const pinDotElement = markerElement.querySelector("[data-recommendation-map-pin-dot='true']");
  if (!pinDotElement) return;

  pinDotElement.classList.toggle("scale-110", isHighlighted);
  pinDotElement.classList.toggle("ring-4", isHighlighted);
}

function MapLegendItem({ color, label, distance }) {
  return (
    <div className="flex w-fit max-w-full flex-none items-center gap-2 rounded-xl bg-[#f5f8f1] px-3 py-2 text-xs font-black text-[#102426] sm:w-auto xl:min-w-[150px]">
      <span className={`h-3 w-3 shrink-0 rounded-full ${color}`} />
      <span className="min-w-0 max-w-[7.5rem] truncate sm:max-w-none sm:flex-1">
        {label}
      </span>
      {distance && (
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-[#526260]">
          {distance}
        </span>
      )}
    </div>
  );
}

function resolveNearbyPlacesForRecommendations(properties) {
  const mappedProperties = properties.filter(
    (property) =>
      Number.isFinite(property?.latitude) && Number.isFinite(property?.longitude)
  );

  if (mappedProperties.length === 0) return [];

  return NEARBY_PLACE_TYPES.map((placeType) => {
    const matchingPlaces = NEARBY_PLACE_CATALOG.filter(
      (place) => place.type === placeType.type
    ).map((place) => {
      const distanceMiles = Math.min(
        ...mappedProperties.map((property) => getDistanceInMiles(property, place))
      );

      return {
        ...placeType,
        ...place,
        distanceMiles,
      };
    });

    return getClosestNearbyPlace(matchingPlaces);
  }).filter(
    (place) => place && place.distanceMiles <= NEARBY_PLACE_RADIUS_MILES
  );
}

function getClosestNearbyPlace(places) {
  if (places.length === 0) return null;

  return [...places].sort(
    (firstPlace, secondPlace) => firstPlace.distanceMiles - secondPlace.distanceMiles
  )[0];
}

function getNearbyLegendDistance(nearbyPlaces, type) {
  const matchedPlace = nearbyPlaces.find((place) => place.type === type);

  if (!matchedPlace || !Number.isFinite(matchedPlace.distanceMiles)) return "";

  return `${matchedPlace.distanceMiles.toFixed(1)} mi`;
}

function getCleanNearbyPlaceLabel(place) {
  return place?.label || place?.name || "Nearby place";
}

function getDistanceInMiles(firstPoint, secondPoint) {
  const earthRadiusMiles = 3958.8;
  const firstLatitude = degreesToRadians(firstPoint.latitude);
  const secondLatitude = degreesToRadians(secondPoint.latitude);
  const latitudeDistance = degreesToRadians(secondPoint.latitude - firstPoint.latitude);
  const longitudeDistance = degreesToRadians(secondPoint.longitude - firstPoint.longitude);
  const haversine =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDistance / 2) ** 2;

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function getMapMarkerTooltipHtml(title, details = []) {
  const detailRows = details.filter(Boolean);

  return `
    <div data-map-marker-tooltip="true" class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-2xl bg-white p-3 text-left text-xs leading-5 text-[#526260] shadow-xl ring-1 ring-[#d7e6df] group-hover:block group-focus:block">
      <p class="text-sm font-black text-[#102426]">${escapeMapText(title)}</p>
      ${detailRows
        .map((detail) => `<p class="mt-1 font-semibold">${escapeMapText(detail)}</p>`)
        .join("")}
    </div>
  `;
}

function escapeMapText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
