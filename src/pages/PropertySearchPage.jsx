import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight, MapPin, Navigation, Search, X } from "lucide-react";
import CompareSavedOptionsPanel from "../components/propertySearch/CompareSavedOptionsPanel";
import { getPublicPropertySummaries } from "../data/propertyStorage";
import { saveLocalLead } from "../data/leadStorage";
import { saveSupabaseLead } from "../data/supabaseLeadStorage";
import { saveLeadEventInBackground } from "../data/supabaseLeadEvents";
import { isLocalFallbackEnabled } from "../data/supabaseClient";
import { isNonRentOnlySpecialText } from "../utils/rentSpecials";
import {
  DALLAS_BUDGET_GUIDE,
  getBudgetQualificationMessage,
} from "../utils/leadQualification";
import {
  clearCompareSelections,
  getCompareFloorPlanItemKey,
  getCompareFloorPlanItems,
  getComparePropertyIds,
  removeCompareFloorPlanItem,
  removeComparePropertyId,
  toggleComparePropertyId,
} from "../data/renterPreferenceStorage";

import {
  getPropertyAddressLabel,
  getPhotoImageUrl,
  getPropertyPrimaryImage,
  getPropertySearchSuggestions,
  getPublicSearchProperties,
  hasPreciseStreetAddress,
  isReliableGeocodeResult,
  matchesPropertySearch,
} from "../data/propertySearchData";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const DALLAS_CENTER = [-96.797, 32.7767];
const DEFAULT_AREA_RADIUS_MILES = 2;
const AREA_RADIUS_OPTIONS = [1, 2, 3, 5];
const SPECIAL_FILTER_OPTIONS = [
  { label: "4 weeks free", weeks: 4 },
  { label: "6 weeks free", weeks: 6 },
  { label: "8 weeks free", weeks: 8 },
];
const PRICE_FILTER_OPTIONS = createPriceFilterOptions();
const BED_FILTER_OPTIONS = [
  { label: "Studio", value: "studio" },
  { label: "1 bd", value: "1" },
  { label: "2 bd", value: "2" },
  { label: "3+ bd", value: "3plus" },
];
const mapboxGeocodeRequests = new Map();
const FLOOR_PLAN_SCROLL_TARGET_KEY = "bma-scroll-target";
const PROPERTY_RESULTS_PER_PAGE = 18;
const MAP_GEOCODE_BATCH_SIZE = 6;
const emptyRequestInfoForm = {
  name: "",
  phone: "",
  email: "",
  area: "",
  bedrooms: "",
  budget: "",
  moveIn: "",
  contactMethod: "",
  smsConsent: false,
  notes: "",
};

function getTrackingValue(searchParams, key) {
  return searchParams.get(key)?.trim() || "";
}

function getAdTracking(searchParams) {
  const utmSource = getTrackingValue(searchParams, "utm_source");
  const utmMedium = getTrackingValue(searchParams, "utm_medium");
  const utmCampaign = getTrackingValue(searchParams, "utm_campaign");
  const utmTerm = getTrackingValue(searchParams, "utm_term");
  const utmContent = getTrackingValue(searchParams, "utm_content");
  const gclid = getTrackingValue(searchParams, "gclid");

  return {
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    gclid,
    landingPage: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || "",
    hasPaidTracking:
      Boolean(gclid) ||
      utmSource.toLowerCase() === "google" ||
      utmMedium.toLowerCase().includes("paid") ||
      utmMedium.toLowerCase().includes("cpc"),
  };
}

async function sendLeadNotification(lead) {
  try {
    const response = await fetch("/api/send-lead-email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...lead,
        adminUrl: `${window.location.origin}/admin/leads/${lead.id}`,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.warn(body.error || "Lead email notification was not sent.");
    }
  } catch (error) {
    console.warn("Lead email notification was not sent.", error);
  }
}

function sendLeadNotificationInBackground(lead) {
  sendLeadNotification(lead).catch((error) => {
    console.warn("Lead email notification was not sent.", error);
  });
}

function getFloorPlansRoute(propertyId) {
  return `/properties/${propertyId}?section=floor-plans#floor-plans`;
}

function rememberFloorPlanSectionTarget() {
  try {
    window.sessionStorage?.setItem(FLOOR_PLAN_SCROLL_TARGET_KEY, "floor-plans");
  } catch {
    // Navigation still carries the query/hash target when session storage is unavailable.
  }
}

function createPriceFilterOptions() {
  const ranges = [{ label: "Under $800", min: 0, max: 800 }];

  for (let min = 800; min < 3000; min += 100) {
    ranges.push({
      label: `${formatCurrency(min)} - ${formatCurrency(min + 100)}`,
      min,
      max: min + 100,
    });
  }

  ranges.push({ label: "$3,000+", min: 3000, max: null });

  return ranges;
}

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pageSet = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const pages = [...pageSet]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((firstPage, secondPage) => firstPage - secondPage);
  const paginationItems = [];

  pages.forEach((page, index) => {
    const previousPage = pages[index - 1];

    if (previousPage && page - previousPage > 1) {
      paginationItems.push(`ellipsis-${previousPage}-${page}`);
    }

    paginationItems.push(page);
  });

  return paginationItems;
}

export default function PropertySearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchFromUrl = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(searchFromUrl);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState("");
  const [selectedBedroomFilter, setSelectedBedroomFilter] = useState("");
  const [selectedSpecialWeeks, setSelectedSpecialWeeks] = useState("");
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [isBedsFilterOpen, setIsBedsFilterOpen] = useState(false);
  const [isSpecialFilterOpen, setIsSpecialFilterOpen] = useState(false);
  const [mappableSearchProperties, setMappableSearchProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [propertyLoadError, setPropertyLoadError] = useState("");
  const [comparePropertyIds, setComparePropertyIds] = useState(getComparePropertyIds);
  const [compareFloorPlanItems, setCompareFloorPlanItems] = useState(getCompareFloorPlanItems);
  const [activeCompareTab, setActiveCompareTab] = useState("Properties");
  const [hoveredMapPropertyId, setHoveredMapPropertyId] = useState("");
  const [selectedMapPropertyId, setSelectedMapPropertyId] = useState("");
  const [mobileMapSelectedPropertyId, setMobileMapSelectedPropertyId] = useState("");
  const [currentResultsPage, setCurrentResultsPage] = useState(1);
  const [compareNotice, setCompareNotice] = useState("");
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isMobileMapModalOpen, setIsMobileMapModalOpen] = useState(false);
  const [requestInfoProperty, setRequestInfoProperty] = useState(null);
  const resultCardRefs = useRef(new Map());
  const resultsTopRef = useRef(null);
  const searchFormRef = useRef(null);
  const properties = useMemo(() => getPublicSearchProperties(allProperties), [allProperties]);
  const searchMatchedProperties = useMemo(
    () =>
      properties.filter((property) =>
        matchesPropertySearch(property, searchFromUrl)
      ),
    [properties, searchFromUrl]
  );
  const specialMatchedProperties = useMemo(() => {
    if (!selectedSpecialWeeks) return searchMatchedProperties;

    return searchMatchedProperties.filter((property) =>
      propertyHasWeeksFreeSpecial(property, Number(selectedSpecialWeeks))
    );
  }, [searchMatchedProperties, selectedSpecialWeeks]);
  const filterMatchedProperties = useMemo(() => {
    return specialMatchedProperties.filter((property) => {
      return (
        propertyMatchesPriceFilter(
          property,
          selectedPriceRange,
          selectedBedroomFilter
        ) &&
        propertyMatchesBedroomFilter(property, selectedBedroomFilter)
      );
    });
  }, [selectedBedroomFilter, selectedPriceRange, specialMatchedProperties]);
  const filteredProperties = useMemo(() => {
    if (!selectedArea) return filterMatchedProperties;

    const mappablePropertiesById = new Map(
      mappableSearchProperties.map((property) => [property.id, property])
    );

    return filterMatchedProperties.filter((property) => {
      const mappableProperty = mappablePropertiesById.get(property.id);
      if (!mappableProperty) return false;

      const distanceFromCenter = getDistanceMiles(
        selectedArea.center,
        {
          latitude: mappableProperty.latitude,
          longitude: mappableProperty.longitude,
        }
      );

      return distanceFromCenter <= selectedArea.radiusMiles;
    });
  }, [filterMatchedProperties, mappableSearchProperties, selectedArea]);
  const mappableFilteredProperties = useMemo(() => {
    const filteredPropertyIds = new Set(
      filteredProperties.map((property) => property.id)
    );

    return mappableSearchProperties.filter((property) =>
      filteredPropertyIds.has(property.id)
    );
  }, [filteredProperties, mappableSearchProperties]);
  const selectedSpecialLabel = selectedSpecialWeeks
    ? `${selectedSpecialWeeks} weeks free`
    : "";
  const selectedPriceLabel = getSelectedPriceLabel(selectedPriceRange);
  const selectedBedroomLabel = getSelectedBedroomLabel(selectedBedroomFilter);
  const suggestions = useMemo(
    () => getPropertySearchSuggestions(properties, searchTerm),
    [properties, searchTerm]
  );
  const compareProperties = useMemo(
    () =>
      comparePropertyIds
        .map((propertyId) =>
          properties.find((property) => property.id === propertyId)
        )
        .filter(Boolean),
    [comparePropertyIds, properties]
  );
  const compareFloorPlanRows = useMemo(
    () =>
      compareFloorPlanItems.map((item) => ({
        ...item,
        compareKey: getCompareFloorPlanItemKey(item),
        property:
          properties.find((property) => property.id === item.propertyId) || null,
      })),
    [compareFloorPlanItems, properties]
  );
  const propertyCompareRows = useMemo(
    () =>
      compareProperties.map((property) => ({
        property,
        priceSummary: getPropertySearchPriceSummary(property),
      })),
    [compareProperties]
  );
  const floorPlanDetailRows = useMemo(
    () =>
      compareFloorPlanRows.map((row) => ({
        id: row.compareKey,
        type: "Floor Plan",
        title: row.floorPlanName,
        propertyName: row.propertyName,
        beds: formatBedroomLabel(row.beds, row.floorPlanName),
        baths: row.baths ? `${row.baths} ba` : "Baths not listed",
        sqft: row.sqft ? `${row.sqft} sq ft` : "Sq ft not listed",
        normalRent: row.rent || "Contact",
        effectiveRent: row.effectiveRent || row.rent || "Contact",
        special: row.special || "No special listed",
        availability: row.available || "Availability not listed",
        availabilityLink: "",
        linkTo: getFloorPlansRoute(row.propertyId),
        actionLabel: "View floor plans",
        image: row.image || getPropertyPrimaryImage(row.property || {}),
      })),
    [compareFloorPlanRows]
  );
  const propertyDetailRows = useMemo(
    () =>
      propertyCompareRows.map(({ property, priceSummary }) => ({
        id: property.id,
        type: "Property",
        title: property.name,
        propertyName: property.area || property.city || "Dallas area",
        beds: getBedsLabel(property),
        baths: "Varies",
        sqft: "Varies",
        normalRent: priceSummary.normalRentLabel,
        effectiveRent: priceSummary.effectiveRentLabel,
        special: priceSummary.specialLabel || property.special || "No special listed",
        availability: property.availability || "View floor plans",
        availabilityLink: getFloorPlansRoute(property.id),
        linkTo: getFloorPlansRoute(property.id),
        actionLabel: "View floor plans",
        image: getPropertyPrimaryImage(property),
      })),
    [propertyCompareRows]
  );
  const compareDetailRows =
    floorPlanDetailRows.length > 0 ? floorPlanDetailRows : propertyDetailRows;
  const compareDetailMode =
    floorPlanDetailRows.length > 0 ? "floorPlans" : "properties";
  const hasCompareItems =
    compareFloorPlanRows.length > 0 || propertyCompareRows.length > 0;
  const compareItemCount = compareFloorPlanRows.length + propertyCompareRows.length;
  const totalResultsPages = Math.max(
    1,
    Math.ceil(filteredProperties.length / PROPERTY_RESULTS_PER_PAGE)
  );
  const safeResultsPage = Math.min(currentResultsPage, totalResultsPages);
  const visibleResultStartIndex =
    filteredProperties.length > 0
      ? (safeResultsPage - 1) * PROPERTY_RESULTS_PER_PAGE
      : 0;
  const visibleFilteredProperties = useMemo(
    () =>
      filteredProperties.slice(
        visibleResultStartIndex,
        visibleResultStartIndex + PROPERTY_RESULTS_PER_PAGE
      ),
    [filteredProperties, visibleResultStartIndex]
  );
  const visibleResultCount = visibleFilteredProperties.length;
  const visibleResultEndIndex = visibleResultStartIndex + visibleResultCount;
  const hasMultipleResultsPages = totalResultsPages > 1;
  const selectedMapPropertyIsVisible =
    selectedMapPropertyId &&
    filteredProperties.some((property) => property.id === selectedMapPropertyId);
  const highlightedMapPropertyId =
    hoveredMapPropertyId || (selectedMapPropertyIsVisible ? selectedMapPropertyId : "");
  const mobileMapSelectedProperty = useMemo(
    () =>
      mappableFilteredProperties.find(
        (property) => property.id === mobileMapSelectedPropertyId
      ) ||
      filteredProperties.find((property) => property.id === mobileMapSelectedPropertyId) ||
      null,
    [filteredProperties, mappableFilteredProperties, mobileMapSelectedPropertyId]
  );
  const paginationPages = useMemo(
    () => getPaginationPages(safeResultsPage, totalResultsPages),
    [safeResultsPage, totalResultsPages]
  );

  const handleMapPropertySelect = useCallback((propertyId) => {
    setSelectedMapPropertyId(propertyId);
    setHoveredMapPropertyId(propertyId);

    window.setTimeout(() => {
      resultCardRefs.current.get(propertyId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  }, []);

  const handleMobileMapPropertySelect = useCallback((propertyId) => {
    setSelectedMapPropertyId(propertyId);
    setHoveredMapPropertyId(propertyId);
    setMobileMapSelectedPropertyId(propertyId);
  }, []);

  const closeMobileMapModal = useCallback(() => {
    setIsMobileMapModalOpen(false);
    setMobileMapSelectedPropertyId("");
  }, []);

  const handleMobileMapViewDetails = useCallback(
    (propertyId) => {
      closeMobileMapModal();
      navigate(`/properties/${propertyId}`);
    },
    [closeMobileMapModal, navigate]
  );

  const handleMobileMapRequestInfo = useCallback(
    (property) => {
      closeMobileMapModal();
      setRequestInfoProperty(property);
    },
    [closeMobileMapModal]
  );

  const handleResultsPageChange = useCallback(
    (nextPage) => {
      const pageNumber = Math.max(1, Math.min(nextPage, totalResultsPages));

      setCurrentResultsPage(pageNumber);
      window.setTimeout(() => {
        resultsTopRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    },
    [totalResultsPages]
  );

  useEffect(() => {
    let isMounted = true;

    getPublicPropertySummaries({ includeFloorPlans: true })
      .then((savedProperties) => {
        if (!isMounted) return;

        setAllProperties(savedProperties);
        setPropertyLoadError("");
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) {
          setAllProperties([]);
          setPropertyLoadError("Could not load live property summaries from Supabase.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentResultsPage(1);
  }, [
    searchFromUrl,
    selectedArea,
    selectedBedroomFilter,
    selectedPriceRange,
    selectedSpecialWeeks,
  ]);

  useEffect(() => {
    let isMounted = true;
    let resolveTimer = null;

    const propertiesWithCoordinates = filterMatchedProperties
      .map((property) => {
        const existingCoordinates = getPropertyCoordinates(property);

        return existingCoordinates
          ? {
              ...property,
              ...existingCoordinates,
            }
          : null;
      })
      .filter(Boolean);

    setMappableSearchProperties(propertiesWithCoordinates);

    const resolveMaps = () => {
      resolveMappableProperties(filterMatchedProperties)
        .then((resolvedProperties) => {
          if (isMounted) {
            setMappableSearchProperties(resolvedProperties);
          }
        })
        .catch((error) => {
          console.error(error);
          if (isMounted) {
            setMappableSearchProperties(propertiesWithCoordinates);
          }
        });
    };

    resolveTimer = window.setTimeout(
      resolveMaps,
      propertiesWithCoordinates.length > 0 ? 1200 : 250
    );

    return () => {
      isMounted = false;
      window.clearTimeout(resolveTimer);
    };
  }, [filterMatchedProperties]);

  const submitSearch = (event) => {
    event.preventDefault();

    const query = searchTerm.trim();
    setSelectedArea(null);
    setSearchParams(query ? { search: query } : {});
  };

  const selectSuggestion = (suggestion) => {
    setSearchTerm(suggestion.value);
    setSearchParams({ search: suggestion.value });
    setSelectedArea(null);
  };

  const handleClearCompare = useCallback(() => {
    const clearedSelections = clearCompareSelections();

    setComparePropertyIds(clearedSelections.propertyIds);
    setCompareFloorPlanItems(clearedSelections.floorPlanItems);
    setCompareNotice("Compare list cleared.");
    setIsCompareModalOpen(false);
  }, []);

  const handleViewCompare = useCallback(() => {
    setIsCompareModalOpen(true);
  }, []);

  const handleOpenRequestInfo = useCallback((property) => {
    setRequestInfoProperty(property);
  }, []);

  const handleCloseRequestInfo = useCallback(() => {
    setRequestInfoProperty(null);
  }, []);

  const handleRequestInfoSubmitted = useCallback(() => {
    navigate("/thank-you", { replace: true });
  }, [navigate]);

  const handleTogglePropertyCompare = useCallback(
    (property) => {
      const isAlreadyCompared = comparePropertyIds.includes(property.id);
      const updatedCompareIds = toggleComparePropertyId(property.id);

      setComparePropertyIds(updatedCompareIds);
      setActiveCompareTab("Properties");

      if (isAlreadyCompared) {
        setCompareNotice(`${property.name} removed from compare.`);
        return;
      }

      setCompareNotice(`${property.name} added. Open your compare list below.`);
    },
    [comparePropertyIds]
  );

  useEffect(() => {
    if (!compareNotice) return undefined;

    const noticeTimer = window.setTimeout(() => {
      setCompareNotice("");
    }, 4500);

    return () => window.clearTimeout(noticeTimer);
  }, [compareNotice]);

  useEffect(() => {
    if (!hasCompareItems) {
      setIsCompareModalOpen(false);
    }
  }, [hasCompareItems]);

  useEffect(() => {
    if (!isPriceFilterOpen && !isBedsFilterOpen && !isSpecialFilterOpen) {
      return undefined;
    }

    const handleOutsideFilterPointerDown = (event) => {
      if (searchFormRef.current?.contains(event.target)) return;

      setIsPriceFilterOpen(false);
      setIsBedsFilterOpen(false);
      setIsSpecialFilterOpen(false);
    };

    document.addEventListener("pointerdown", handleOutsideFilterPointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideFilterPointerDown);
    };
  }, [isBedsFilterOpen, isPriceFilterOpen, isSpecialFilterOpen]);

  const renderComparePanel = ({ isMobileModal = false } = {}) => (
    <CompareSavedOptionsPanel
      activeTab={activeCompareTab}
      compareDetailMode={compareDetailMode}
      compareDetailRows={compareDetailRows}
      compareFloorPlanRows={compareFloorPlanRows}
      formatBedroomLabel={formatBedroomLabel}
      getSearchDealScore={getSearchDealScore}
      isMobileModal={isMobileModal}
      onClearCompare={handleClearCompare}
      onRemoveFloorPlan={(row) =>
        setCompareFloorPlanItems(removeCompareFloorPlanItem(row))
      }
      onRemoveProperty={(propertyId) =>
        setComparePropertyIds(removeComparePropertyId(propertyId))
      }
      propertyCompareRows={propertyCompareRows}
      setActiveTab={setActiveCompareTab}
    />
  );

  return (
    <main className="min-h-screen bg-[#f5f8f1] pb-24 text-[#102426]">
      <section className="bma-topbar sticky top-0 z-40 px-3 py-2">
        <div className="bma-shell">
          <div className="mb-1.5 flex items-center justify-between gap-3 xl:hidden">
            <Link to="/" className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#173f3f] text-[10px] font-black text-[#f2b84b]">
                BMA
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-[#102426]">
                  Below Market Apartments
                </span>
                <span className="block text-xs font-bold text-[#526260]">
                  Verified specials, ranked by deal value
                </span>
              </span>
            </Link>

            <Link
              to="/start"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#f2b84b] px-3 py-2 text-xs font-black text-[#102426] hover:bg-[#f9d783]"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Ask a Locator
            </Link>
          </div>

          <form
            ref={searchFormRef}
            onSubmit={submitSearch}
            className="relative rounded-xl border border-[#d7e6df] bg-white p-1.5 shadow-sm sm:p-2"
          >
            <div className="grid gap-1.5 xl:flex xl:items-center xl:gap-2">
              <div className="hidden items-center gap-2 xl:flex xl:shrink-0">
                <Link to="/" className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#173f3f] text-xs font-black text-[#f2b84b] xl:h-10 xl:w-10">
                    BMA
                  </span>
                  <span className="hidden text-sm font-black text-[#102426] md:block">
                    Below Market Apartments
                  </span>
                </Link>

              </div>

              <div className="grid gap-1.5 xl:flex xl:min-w-0 xl:flex-1 xl:items-center xl:gap-2">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 lg:grid-cols-[minmax(0,1fr)_auto_auto] xl:min-w-0 xl:flex-1">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2d7dd2] sm:left-5 sm:h-5 sm:w-5" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="City, neighborhood, property, or special"
                    autoComplete="off"
                    className="bma-focus-ring h-10 w-full rounded-lg border border-[#b8d9d0] bg-[#f9fbf8] pl-9 pr-3 text-sm font-bold text-[#102426] outline-none sm:h-12 sm:pl-12 sm:pr-4 sm:text-base"
                  />
                </div>

                <button
                  type="submit"
                  className="bma-btn-primary h-10 px-4 text-sm !text-white hover:!text-white sm:h-12 sm:px-7"
                >
                  Search
                </button>

                <div className="col-span-2 flex min-w-0 flex-wrap gap-1.5 overflow-visible pb-0.5 lg:col-span-1 lg:pb-0 xl:gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPriceRange) {
                        setSelectedPriceRange("");
                        setIsPriceFilterOpen(false);
                        setSelectedArea(null);
                        return;
                      }

                      setIsPriceFilterOpen((currentValue) => !currentValue);
                      setIsBedsFilterOpen(false);
                      setIsSpecialFilterOpen(false);
                    }}
                    className={`h-7 shrink-0 rounded-md border px-2 text-[10px] font-black sm:h-8 sm:px-2.5 sm:text-xs ${
                      selectedPriceRange
                        ? "border-[#2d7dd2] bg-[#eef5ff] text-[#174a7c] hover:bg-[#dbeeff]"
                        : "border-[#d7e6df] bg-white text-[#102426] hover:bg-[#f5f8f1]"
                    }`}
                    title={selectedPriceRange ? "Remove price filter" : "Open price filter"}
                  >
                    {selectedPriceLabel || "Price"} {selectedPriceRange ? "x" : ""}
                  </button>

                  {isPriceFilterOpen && (
                    <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-lg border border-[#d7e6df] bg-white shadow-2xl">
                      <div className="border-b border-[#edf4ef] px-4 py-3">
                        <p className="text-xs font-black uppercase text-[#526260]">
                          Monthly budget
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#526260]">
                          Scroll to choose the range that fits.
                        </p>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                      {PRICE_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => {
                            setSelectedPriceRange(option.label);
                            setIsPriceFilterOpen(false);
                            setSelectedArea(null);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black hover:bg-[#f5f8f1] ${
                            selectedPriceRange === option.label
                              ? "bg-[#eef5ff] text-[#174a7c]"
                              : "text-[#102426]"
                          }`}
                        >
                          {option.label}
                          {selectedPriceRange === option.label && (
                            <span className="text-xs uppercase text-[#1f6f63]">Active</span>
                          )}
                        </button>
                      ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPriceRange("");
                          setIsPriceFilterOpen(false);
                          setSelectedArea(null);
                        }}
                        className="w-full border-t border-[#edf4ef] px-4 py-3 text-left text-sm font-black text-[#e4572e] hover:bg-[#fff0ea]"
                      >
                        Clear price filter
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBedroomFilter) {
                        setSelectedBedroomFilter("");
                        setIsBedsFilterOpen(false);
                        setSelectedArea(null);
                        return;
                      }

                      setIsBedsFilterOpen((currentValue) => !currentValue);
                      setIsPriceFilterOpen(false);
                      setIsSpecialFilterOpen(false);
                    }}
                    className={`h-7 shrink-0 rounded-md border px-2 text-[10px] font-black sm:h-8 sm:px-2.5 sm:text-xs ${
                      selectedBedroomFilter
                        ? "border-[#1f6f63] bg-[#e7f3ee] text-[#1f6f63] hover:bg-[#d8efe6]"
                        : "border-[#d7e6df] bg-white text-[#102426] hover:bg-[#f5f8f1]"
                    }`}
                    title={selectedBedroomFilter ? "Remove beds filter" : "Open beds filter"}
                  >
                    {selectedBedroomLabel || "Beds"} {selectedBedroomFilter ? "x" : ""}
                  </button>

                  {isBedsFilterOpen && (
                    <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-44 overflow-hidden rounded-lg border border-[#d7e6df] bg-white shadow-2xl">
                      {BED_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSelectedBedroomFilter(option.value);
                            setIsBedsFilterOpen(false);
                            setSelectedArea(null);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black hover:bg-[#f5f8f1] ${
                            selectedBedroomFilter === option.value
                              ? "bg-[#e7f3ee] text-[#1f6f63]"
                              : "text-[#102426]"
                          }`}
                        >
                          {option.label}
                          {selectedBedroomFilter === option.value && (
                            <span className="text-xs uppercase text-[#1f6f63]">Active</span>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBedroomFilter("");
                          setIsBedsFilterOpen(false);
                          setSelectedArea(null);
                        }}
                        className="w-full border-t border-[#edf4ef] px-4 py-3 text-left text-sm font-black text-[#e4572e] hover:bg-[#fff0ea]"
                      >
                        Clear beds filter
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSpecialWeeks) {
                        setSelectedSpecialWeeks("");
                        setIsSpecialFilterOpen(false);
                        setSelectedArea(null);
                        return;
                      }

                      setIsSpecialFilterOpen((currentValue) => !currentValue);
                      setIsPriceFilterOpen(false);
                      setIsBedsFilterOpen(false);
                    }}
                    className={`h-7 shrink-0 rounded-md border px-2 text-[10px] font-black sm:h-8 sm:px-2.5 sm:text-xs ${
                      selectedSpecialWeeks
                        ? "border-[#f2b84b] bg-[#fff8e6] text-[#8a5b0a] hover:bg-[#fff0c7]"
                        : "border-[#d7e6df] bg-white text-[#102426] hover:bg-[#f5f8f1]"
                    }`}
                    title={selectedSpecialWeeks ? "Remove special filter" : "Open specials filter"}
                  >
                    {selectedSpecialLabel || "Specials"} {selectedSpecialWeeks ? "x" : ""}
                  </button>

                  {isSpecialFilterOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-lg border border-[#d7e6df] bg-white shadow-2xl">
                      {SPECIAL_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.weeks}
                          type="button"
                          onClick={() => {
                            setSelectedSpecialWeeks(String(option.weeks));
                            setIsSpecialFilterOpen(false);
                            setSelectedArea(null);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black hover:bg-[#f5f8f1] ${
                            selectedSpecialWeeks === String(option.weeks)
                              ? "bg-[#fff8e6] text-[#8a5b0a]"
                              : "text-[#102426]"
                          }`}
                        >
                          {option.label}
                          {selectedSpecialWeeks === String(option.weeks) && (
                            <span className="text-xs uppercase text-[#1f6f63]">Active</span>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpecialWeeks("");
                          setIsSpecialFilterOpen(false);
                          setSelectedArea(null);
                        }}
                        className="w-full border-t border-[#edf4ef] px-4 py-3 text-left text-sm font-black text-[#e4572e] hover:bg-[#fff0ea]"
                      >
                        Clear special filter
                      </button>
                    </div>
                  )}
                </div>
              </div>
              </div>

              <Link
                to="/start"
                className="bma-btn-gold !hidden h-12 shrink-0 xl:!flex"
              >
                Find Apartment Locator
              </Link>
            </div>
          </div>

            {suggestions.length > 0 && searchTerm.trim() !== searchFromUrl.trim() && (
              <div className="absolute left-2 right-2 top-[calc(100%+8px)] z-50 overflow-hidden rounded-lg border border-[#d7e6df] bg-white shadow-2xl lg:right-auto lg:w-[min(560px,calc(100%-1rem))]">
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="flex w-full items-center justify-between gap-3 border-b border-[#edf4ef] px-4 py-3 text-left last:border-b-0 hover:bg-[#f5f8f1]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[#102426]">
                        {suggestion.label}
                      </span>
                      {suggestion.detail && (
                        <span className="block truncate text-xs font-bold text-[#526260]">
                          {suggestion.detail}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#e7f3ee] px-3 py-1 text-[11px] font-black uppercase text-[#1f6f63]">
                      {suggestion.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {propertyLoadError && (
            <div className="mt-3 rounded-2xl bg-[#fde8df] p-4 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
              {propertyLoadError}
            </div>
          )}

        </div>
      </section>

      <section className="bma-shell py-5 lg:py-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm font-black text-[#1f6f63]">
              <span>Apartment results</span>
              <span className="rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-black text-[#1f6f63]">
                {filteredProperties.length} result{filteredProperties.length === 1 ? "" : "s"}
              </span>
            </p>
            <h1 className="mt-1 text-3xl font-black leading-tight text-[#102426] lg:text-4xl">
              {searchFromUrl ? `${searchFromUrl} apartments` : "Apartments near you"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#526260]">
              Search by city, neighborhood, ZIP, property name, or active special. Compare normal rent, estimated effective rent, and specials before you tour.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMapModalOpen(true)}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#f2b84b] px-5 py-3.5 text-sm font-black !text-[#102426] shadow-[0_10px_24px_rgba(242,184,75,0.32)] ring-1 ring-[#d49a24] transition hover:bg-[#f9d783] hover:!text-[#102426] md:hidden"
            >
              <Navigation className="h-4 w-4" aria-hidden="true" />
              <span className="grid text-left leading-tight">
                <span>Map view available</span>
                <span className="text-xs font-bold">
                  See {mappableFilteredProperties.length} apartment{" "}
                  {mappableFilteredProperties.length === 1 ? "pin" : "pins"} nearby
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,36vw)] md:items-start lg:grid-cols-[minmax(0,1fr)_minmax(340px,36vw)] xl:grid-cols-[minmax(0,1fr)_minmax(420px,38vw)]">
          <div className="order-2 min-w-0 md:order-1">
            <div
              ref={resultsTopRef}
              className="rounded-xl border border-[#d7e6df] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-black text-[#102426]">
                    Showing{" "}
                    {filteredProperties.length > 0
                      ? `${visibleResultStartIndex + 1}-${visibleResultEndIndex}`
                      : "0"}{" "}
                    of {filteredProperties.length} listing
                    {filteredProperties.length === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#526260]">
                    Best deals and matching floor plans update when filters change.
                  </p>
                </div>
                {hasMultipleResultsPages && (
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#f5f8f1] px-3 py-1.5 text-xs font-black text-[#526260] ring-1 ring-[#d7e6df]">
                      Page {safeResultsPage} of {totalResultsPages}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {visibleFilteredProperties.map((property) => (
                <SearchResultCard
                  key={property.id}
                  property={property}
                  isCompared={comparePropertyIds.includes(property.id)}
                  isMapHighlighted={highlightedMapPropertyId === property.id}
                  selectedBedroomFilter={selectedBedroomFilter}
                  selectedPriceRange={selectedPriceRange}
                  cardRef={(node) => {
                    if (node) {
                      resultCardRefs.current.set(property.id, node);
                    } else {
                      resultCardRefs.current.delete(property.id);
                    }
                  }}
                  onToggleCompare={() => handleTogglePropertyCompare(property)}
                  onRequestInfo={() => handleOpenRequestInfo(property)}
                />
              ))}
            </div>

            {hasMultipleResultsPages && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResultsPageChange(safeResultsPage - 1)}
                  disabled={safeResultsPage === 1}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#f5f8f1] disabled:cursor-not-allowed disabled:text-[#9aa7a4] disabled:hover:bg-white"
                >
                  Previous
                </button>

                {paginationPages.map((pageItem) =>
                  String(pageItem).includes("ellipsis") ? (
                    <span
                      key={pageItem}
                      className="px-2 text-sm font-black text-[#526260]"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageItem}
                      type="button"
                      onClick={() => handleResultsPageChange(pageItem)}
                      aria-current={pageItem === safeResultsPage ? "page" : undefined}
                      className={`h-10 min-w-10 rounded-xl px-3 text-sm font-black ring-1 ${
                        pageItem === safeResultsPage
                          ? "bg-[#173f3f] text-white ring-[#173f3f]"
                          : "bg-white text-[#173f3f] ring-[#d7e6df] hover:bg-[#f5f8f1]"
                      }`}
                    >
                      {pageItem}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => handleResultsPageChange(safeResultsPage + 1)}
                  disabled={safeResultsPage === totalResultsPages}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#f5f8f1] disabled:cursor-not-allowed disabled:text-[#9aa7a4] disabled:hover:bg-white"
                >
                  Next
                </button>
              </div>
            )}

            {filteredProperties.length === 0 && (
              <div className="bma-card mt-6 p-8 text-center">
                <h2 className="text-2xl font-black text-[#102426]">
                  No matching properties yet
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-[#526260]">
                  Try a city, neighborhood, ZIP code, property name, or special like 6 weeks free.
                </p>
              </div>
            )}
          </div>

          <div className="hidden md:sticky md:top-28 md:order-2 md:block">
            <div className="overflow-hidden rounded-xl border border-[#d7e6df] bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-[#d7e6df] px-4 py-3">
                <div>
                  <p className="text-sm font-black text-[#102426]">Map view</p>
                  <p className="text-xs font-bold text-[#526260]">
                    Hover pins to preview deals.
                  </p>
                </div>
                <span className="rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-black text-[#1f6f63]">
                  {mappableFilteredProperties.length} pins
                </span>
              </div>
              <div className="bma-map-surface relative h-[360px] rounded-none border-0 shadow-none md:h-[calc(100vh-190px)] md:min-h-[360px] lg:min-h-[480px] xl:min-h-[520px]">
                <SearchMap
                  properties={filteredProperties}
                  mappableProperties={mappableFilteredProperties}
                  selectedArea={selectedArea}
                  selectedBedroomFilter={selectedBedroomFilter}
                  selectedPriceRange={selectedPriceRange}
                  onAreaChange={setSelectedArea}
                  onPropertyHover={setHoveredMapPropertyId}
                  onPropertySelect={handleMapPropertySelect}
                  hoveredPropertyId={hoveredMapPropertyId}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {isMobileMapModalOpen && (
        <div
          className="fixed inset-0 z-[65] bg-[#102426]/65 p-3 backdrop-blur-sm md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Apartment map"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMobileMapModal();
            }
          }}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/70">
            <div className="flex items-center justify-between gap-3 border-b border-[#d7e6df] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-[#102426]">Map view</p>
                <p className="mt-0.5 truncate text-xs font-bold text-[#526260]">
                  {mappableFilteredProperties.length} pin{mappableFilteredProperties.length === 1 ? "" : "s"} from current results
                </p>
              </div>
              <button
                type="button"
                onClick={closeMobileMapModal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f8f1] text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
                aria-label="Close map"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bma-map-surface relative min-h-0 flex-1 rounded-none border-0 shadow-none">
              <SearchMap
                properties={filteredProperties}
                mappableProperties={mappableFilteredProperties}
                selectedArea={selectedArea}
                selectedBedroomFilter={selectedBedroomFilter}
                selectedPriceRange={selectedPriceRange}
                onAreaChange={setSelectedArea}
                onPropertyHover={setHoveredMapPropertyId}
                onPropertySelect={handleMobileMapPropertySelect}
                hoveredPropertyId={highlightedMapPropertyId}
              />
              {mobileMapSelectedProperty && (
                <MobileMapPropertySheet
                  property={mobileMapSelectedProperty}
                  selectedBedroomFilter={selectedBedroomFilter}
                  selectedPriceRange={selectedPriceRange}
                  onClose={() => setMobileMapSelectedPropertyId("")}
                  onViewDetails={() =>
                    handleMobileMapViewDetails(mobileMapSelectedProperty.id)
                  }
                  onRequestInfo={() =>
                    handleMobileMapRequestInfo(mobileMapSelectedProperty)
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}

      {isCompareModalOpen && hasCompareItems && (
        <div
          className="fixed inset-0 z-[60] bg-[#102426]/55 p-3 backdrop-blur-sm md:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Compare selected apartments"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsCompareModalOpen(false);
            }
          }}
        >
          <div className="mx-auto flex h-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#f5f8f1] shadow-2xl md:max-w-5xl">
            <div className="flex items-center justify-between border-b border-[#d7e6df] bg-white px-4 py-3">
              <div>
                <p className="text-sm font-black text-[#102426]">
                  Compare selected options
                </p>
                <p className="mt-0.5 text-xs font-bold text-[#526260]">
                  {compareItemCount} option{compareItemCount === 1 ? "" : "s"} selected
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f8f1] text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
                aria-label="Close comparison modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-24">
              <div className="md:hidden">
                {renderComparePanel({ isMobileModal: true })}
              </div>
              <div className="hidden md:block">
                {renderComparePanel()}
              </div>
            </div>
          </div>
        </div>
      )}

      {hasCompareItems && (
        <CompareDock
          compareItemCount={compareItemCount}
          onClearCompare={handleClearCompare}
          onViewCompare={handleViewCompare}
        />
      )}

      {requestInfoProperty && (
        <RequestInfoModal
          property={requestInfoProperty}
          searchParams={searchParams}
          onClose={handleCloseRequestInfo}
          onSubmitted={handleRequestInfoSubmitted}
        />
      )}
    </main>
  );
}

function SearchMap({
  properties,
  mappableProperties,
  selectedArea,
  selectedBedroomFilter,
  selectedPriceRange,
  onAreaChange,
  onPropertyHover,
  onPropertySelect,
  hoveredPropertyId,
}) {
  if (!MAPBOX_TOKEN) {
    return <FallbackSearchMap properties={properties} />;
  }

  return (
    <MapboxSearchMap
      properties={properties}
      mappableProperties={mappableProperties}
      selectedArea={selectedArea}
      selectedBedroomFilter={selectedBedroomFilter}
      selectedPriceRange={selectedPriceRange}
      onAreaChange={onAreaChange}
      onPropertyHover={onPropertyHover}
      onPropertySelect={onPropertySelect}
      hoveredPropertyId={hoveredPropertyId}
    />
  );
}

function CompareDock({
  compareItemCount,
  onClearCompare,
  onViewCompare,
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d7e6df] bg-white/95 px-3 py-3 shadow-[0_-10px_30px_rgba(16,36,38,0.12)] backdrop-blur">
      <div className="mx-auto flex w-[min(1180px,calc(100vw-24px))] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-[#102426]">
            Compare list ready
          </p>
          <p className="mt-0.5 truncate text-xs font-bold text-[#526260]">
            {`${compareItemCount} option${compareItemCount === 1 ? "" : "s"} selected. View them side by side before you tour.`}
          </p>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:shrink-0 sm:items-center">
          <button
            type="button"
            onClick={onViewCompare}
            className="rounded-lg bg-[#173f3f] px-4 py-3 text-sm font-black !text-white shadow-sm transition hover:bg-[#102426] hover:!text-white"
          >
            View comparison ({compareItemCount})
          </button>
          <button
            type="button"
            onClick={onClearCompare}
            className="rounded-lg bg-[#c9341c] px-3 py-2 text-xs font-black !text-white transition hover:bg-[#a92a18] hover:!text-white sm:px-3.5 sm:py-2.5"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}


function MobileMapPropertySheet({
  property,
  selectedBedroomFilter,
  selectedPriceRange,
  onClose,
  onViewDetails,
  onRequestInfo,
}) {
  const displayFloorPlans = getSearchDisplayFloorPlans(
    property,
    selectedBedroomFilter,
    selectedPriceRange
  );
  const priceSummary = getPropertySearchPriceSummary(property, displayFloorPlans);
  const rentLabel = priceSummary.hasRentSpecial
    ? priceSummary.effectiveRentLabel
    : priceSummary.normalRentLabel;
  const rentEyebrow = priceSummary.hasRentSpecial
    ? isRentRangeLabel(rentLabel)
      ? "Estimated rent range"
      : "Estimated rent"
    : isRentRangeLabel(rentLabel)
      ? "Listed rent range"
      : "Listed rent";

  return (
    <div className="absolute inset-x-3 bottom-3 z-20 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[#d7e6df]">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df]"
        aria-label="Close property preview"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 p-3">
        <img
          src={getPropertyPrimaryImage(property)}
          alt={property.name}
          loading="lazy"
          decoding="async"
          className="h-24 w-24 rounded-xl object-cover"
        />

        <div className="min-w-0 pr-9">
          <p className="truncate text-base font-black text-[#102426]">
            {property.name}
          </p>
          <p className="mt-1 flex items-center gap-1 truncate text-xs font-bold text-[#526260]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1f6f63]" />
            <span className="truncate">{getPropertyAddressLabel(property)}</span>
          </p>
          {priceSummary.hasSpecial && (
            <p className="mt-2 line-clamp-1 rounded-full bg-[#fff8e6] px-2.5 py-1 text-[11px] font-black text-[#8a5b0a] ring-1 ring-[#f2d08a]">
              {priceSummary.specialLabel}
            </p>
          )}
          <div className="mt-2 rounded-xl bg-[#f5f8f1] px-3 py-2 ring-1 ring-[#d7e6df]">
            <p className="text-[10px] font-black uppercase text-[#526260]">
              {rentEyebrow}
            </p>
            <p className="mt-0.5 truncate text-sm font-black text-[#102426]">
              {rentLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[#d7e6df] bg-[#f5f8f1] p-3">
        <button
          type="button"
          onClick={onViewDetails}
          className="rounded-xl bg-[#173f3f] px-4 py-3 text-sm font-black !text-white hover:bg-[#102426] hover:!text-white"
        >
          View details
        </button>
        <button
          type="button"
          onClick={onRequestInfo}
          className="rounded-xl bg-[#f2b84b] px-4 py-3 text-sm font-black !text-[#102426] ring-1 ring-[#d49a24] hover:bg-[#f9d783] hover:!text-[#102426]"
        >
          Request info
        </button>
      </div>
    </div>
  );
}

function MapboxSearchMap({
  properties,
  mappableProperties,
  selectedArea,
  selectedBedroomFilter,
  selectedPriceRange,
  onAreaChange,
  onPropertyHover,
  onPropertySelect,
  hoveredPropertyId,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const isChoosingAreaRef = useRef(false);
  const hoverClearTimerRef = useRef(null);
  const [mapboxGl, setMapboxGl] = useState(null);
  const [mapError, setMapError] = useState("");
  const [isChoosingArea, setIsChoosingArea] = useState(false);
  const [areaRadiusMiles, setAreaRadiusMiles] = useState(DEFAULT_AREA_RADIUS_MILES);
  const hoveredProperty = useMemo(
    () =>
      properties.find((property) => property.id === hoveredPropertyId) ||
      mappableProperties.find((property) => property.id === hoveredPropertyId),
    [hoveredPropertyId, mappableProperties, properties]
  );

  useEffect(() => {
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
          setMapError("Could not load the live map.");
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

    mapRef.current.on("load", () => {
      if (!mapRef.current.getSource("search-area")) {
        mapRef.current.addSource("search-area", {
          type: "geojson",
          data: createAreaGeoJson(null),
        });
      }

      if (!mapRef.current.getLayer("search-area-fill")) {
        mapRef.current.addLayer({
          id: "search-area-fill",
          type: "fill",
          source: "search-area",
          paint: {
            "fill-color": "#2d7dd2",
            "fill-opacity": 0.18,
          },
        });
      }

      if (!mapRef.current.getLayer("search-area-line")) {
        mapRef.current.addLayer({
          id: "search-area-line",
          type: "line",
          source: "search-area",
          paint: {
            "line-color": "#174a7c",
            "line-width": 3,
            "line-dasharray": [2, 1],
          },
        });
      }

    });

    return () => {
      window.clearTimeout(hoverClearTimerRef.current);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapboxGl]);

  useEffect(() => {
    isChoosingAreaRef.current = isChoosingArea;

    if (!mapRef.current) return;

    const areaSource = mapRef.current.getSource("search-area");
    if (!areaSource) return;

    areaSource.setData(createAreaGeoJson(selectedArea));
  }, [isChoosingArea, selectedArea]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (isChoosingArea) {
      mapRef.current.dragPan.disable();
      mapRef.current.getCanvas().style.cursor = "crosshair";
      return;
    }

    mapRef.current.dragPan.enable();
    mapRef.current.getCanvas().style.cursor = "";
  }, [isChoosingArea]);

  const chooseAreaAtMapPoint = (event) => {
    if (!isChoosingArea || !mapRef.current) return;

    event.preventDefault();
    const areaCenter = getPointerMapPoint(mapRef.current, event);
    if (!areaCenter) return;

    onAreaChange({
      center: areaCenter,
      radiusMiles: areaRadiusMiles,
    });
    setIsChoosingArea(false);
  };

  const selectAreaRadius = (radiusMiles) => {
    setAreaRadiusMiles(radiusMiles);
    if (selectedArea) {
      onAreaChange({
        ...selectedArea,
        radiusMiles,
      });
    }
  };

  useEffect(() => {
    if (!mapboxGl || !mapRef.current) return;

    const map = mapRef.current;
    const bounds = new mapboxGl.LngLatBounds();
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    onPropertyHover?.("");

    mappableProperties.forEach((property) => {
      const markerElement = createSearchMapPinElement(property);

      markerElement.addEventListener("click", (event) => {
        event.preventDefault();

        if (isChoosingAreaRef.current) {
          event.stopPropagation();

          onAreaChange({
            center: {
              latitude: property.latitude,
              longitude: property.longitude,
            },
            radiusMiles: areaRadiusMiles,
          });
          setIsChoosingArea(false);
          return;
        }

        onPropertySelect?.(property.id);
      });
      markerElement.addEventListener("mouseenter", () => {
        window.clearTimeout(hoverClearTimerRef.current);
        onPropertyHover?.(property.id);
      });
      markerElement.addEventListener("mouseleave", () => {
        hoverClearTimerRef.current = window.setTimeout(() => {
          onPropertyHover?.("");
        }, 180);
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

    if (mappableProperties.length > 1) {
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 12.8,
        duration: 500,
      });
    } else if (mappableProperties.length === 1) {
      map.flyTo({
        center: [mappableProperties[0].longitude, mappableProperties[0].latitude],
        zoom: 13,
        duration: 500,
      });
    }
  }, [
    areaRadiusMiles,
    mapboxGl,
    mappableProperties,
    onAreaChange,
    onPropertyHover,
    onPropertySelect,
  ]);

  const keepHoveredPropertyPreview = () => {
    if (!hoveredProperty) return;

    window.clearTimeout(hoverClearTimerRef.current);
    onPropertyHover?.(hoveredProperty.id);
  };

  const hideHoveredPropertyPreview = () => {
    hoverClearTimerRef.current = window.setTimeout(() => {
      onPropertyHover?.("");
    }, 180);
  };

  if (mapError) {
    return <FallbackSearchMap properties={properties} />;
  }

  return (
    <div className="relative h-full bg-[#dcebe4]">
      <div ref={mapContainerRef} className="h-full w-full" />
      {isChoosingArea && (
        <button
          aria-label="Set search area here"
          className="absolute inset-0 z-[5] cursor-crosshair border-0 bg-[#2d7dd2]/5 p-0"
          type="button"
          onClick={chooseAreaAtMapPoint}
        />
      )}
      <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsChoosingArea((currentValue) => !currentValue)}
          className={`rounded-2xl px-4 py-3 text-sm font-black shadow-sm ring-1 ${
            isChoosingArea
              ? "bg-[#2d7dd2] text-white ring-[#2d7dd2]"
              : "bg-white/95 text-[#173f3f] ring-[#d7e6df] hover:bg-[#f5f8f1]"
          }`}
        >
          {isChoosingArea ? "Tap map" : "Choose area"}
        </button>
        {selectedArea && (
          <>
            <div className="flex overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-[#d7e6df]">
              {AREA_RADIUS_OPTIONS.map((radiusMiles) => (
                <button
                  key={radiusMiles}
                  type="button"
                  onClick={() => selectAreaRadius(radiusMiles)}
                  className={`px-3 py-3 text-sm font-black ${
                    areaRadiusMiles === radiusMiles
                      ? "bg-[#173f3f] !text-white hover:!text-white"
                      : "text-[#173f3f] hover:bg-[#f5f8f1]"
                  }`}
                >
                  {radiusMiles} mi
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                onAreaChange(null);
                setIsChoosingArea(false);
              }}
              className="rounded-2xl bg-white/95 px-4 py-3 text-sm font-black text-[#e4572e] shadow-sm ring-1 ring-[#f4c8b8] hover:bg-[#fff0ea]"
            >
              Clear area
            </button>
            <p className="w-full rounded-2xl bg-white/95 px-4 py-2 text-xs font-black text-[#174a7c] shadow-sm ring-1 ring-[#b8d9f0] sm:w-auto">
              Showing apartments within {selectedArea.radiusMiles} mi of your selected area
            </p>
          </>
        )}
      </div>

      {hoveredProperty && !isChoosingArea && (
        <MapPropertyHoverPreview
          property={hoveredProperty}
          selectedBedroomFilter={selectedBedroomFilter}
          selectedPriceRange={selectedPriceRange}
          onMouseEnter={keepHoveredPropertyPreview}
          onMouseLeave={hideHoveredPropertyPreview}
        />
      )}
      {isChoosingArea && (
        <p className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-2xl bg-white/95 px-4 py-3 text-sm font-black text-[#174a7c] shadow-lg ring-1 ring-[#b8d9f0]">
          Tap the map to search within {areaRadiusMiles} miles
        </p>
      )}
      {mappableProperties.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
          <div className="rounded-3xl bg-white/95 p-6 text-center shadow-xl ring-1 ring-[#d7e6df]">
            <Building2 className="mx-auto h-8 w-8 text-[#1f6f63]" />
            <p className="mt-2 text-lg font-black text-[#102426]">
              No map pins yet
            </p>
            <p className="mt-1 text-sm font-semibold text-[#526260]">
              Add coordinates or a complete property address for live map pins.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MapPropertyHoverPreview({
  property,
  selectedBedroomFilter,
  selectedPriceRange,
  onMouseEnter,
  onMouseLeave,
}) {
  const displayFloorPlans = getSearchDisplayFloorPlans(
    property,
    selectedBedroomFilter,
    selectedPriceRange
  );
  const priceSummary = getPropertySearchPriceSummary(property, displayFloorPlans);
  const hasGoldBar = propertyHasStrongMapDeal(property);
  const rentLabel = priceSummary.hasRentSpecial
    ? priceSummary.effectiveRentLabel
    : priceSummary.normalRentLabel;
  const rentEyebrow = priceSummary.hasRentSpecial ? "Net effective" : "Listed rent";

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-4 z-20 w-[min(20rem,calc(100%-2rem))] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-[#d7e6df]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {hasGoldBar && <div className="h-1.5 bg-[#f2b84b]" />}
      <div className="p-4">
        <p className="truncate text-base font-black text-[#102426]">
          {property.name || "Property"}
        </p>
        <p className="mt-1 truncate text-xs font-bold text-[#526260]">
          {getPropertyAddressLabel(property)}
        </p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-[#1f6f63]">
              {rentEyebrow}
            </p>
            <p className="mt-1 truncate text-lg font-black text-[#102426]">
              {rentLabel}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-black text-[#1f6f63]">
            {getBedsLabel(property, displayFloorPlans)}
          </span>
        </div>

        {priceSummary.hasSpecial && (
          <p className="mt-3 truncate rounded-xl bg-[#fff8e6] px-3 py-2 text-sm font-black text-[#684307] ring-1 ring-[#f2d08a]">
            {priceSummary.specialLabel}
          </p>
        )}

        <Link
          to={`/properties/${property.id}`}
          className="mt-3 inline-flex rounded-xl bg-[#173f3f] px-4 py-2 text-sm font-black text-white hover:bg-[#102426]"
        >
          View property
        </Link>
      </div>
    </div>
  );
}

function FallbackSearchMap({ properties }) {
  const visiblePins = properties.slice(0, 8);

  return (
    <div className="relative h-full bg-[#dcebe4]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,63,63,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(23,63,63,0.08)_1px,transparent_1px)] bg-[size:76px_76px]" />
      <div className="absolute left-[-8%] top-[54%] h-10 w-[120%] -rotate-6 bg-white/80 shadow-sm" />
      <div className="absolute left-[18%] top-[-8%] h-[120%] w-12 rotate-12 bg-white/75 shadow-sm" />
      <div className="absolute left-[56%] top-[-10%] h-[130%] w-8 -rotate-[24deg] bg-[#f6f0d8]/90 shadow-sm" />
      <div className="absolute left-[-12%] top-[26%] h-8 w-[125%] rotate-[18deg] bg-[#f6f0d8]/90 shadow-sm" />
      <div className="absolute left-[8%] top-[70%] h-7 w-[95%] -rotate-[18deg] bg-white/70 shadow-sm" />
      <div className="absolute left-[68%] top-[9%] h-28 w-40 rounded-[32px] border border-[#a9cfc2] bg-[#c4dfd6]/80" />
      <div className="absolute bottom-[10%] left-[6%] h-24 w-44 rounded-[32px] border border-[#cbbd79] bg-[#efe4a6]/70" />
      <div className="absolute bottom-[12%] right-[7%] h-32 w-56 rounded-[36px] border border-[#a9cfc2] bg-[#c4dfd6]/70" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-sm font-black text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df]">
        <Navigation className="h-4 w-4 text-[#2d7dd2]" />
        Dallas area
      </div>

      {visiblePins.map((property, index) => {
        const position = getMapPinPosition(index);
        const pinHref = `/properties/${property.id}`;

        return (
          <Link
            key={property.id}
            to={pinHref}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#173f3f] px-3 py-2 text-xs font-black text-white shadow-xl ring-2 ring-white transition hover:scale-105 hover:bg-[#102426]"
            style={{ left: position.left, top: position.top }}
          >
            {getPrimaryRentLabel(property)}
          </Link>
        );
      })}

      {visiblePins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="bma-panel bg-white/95 p-6 text-center">
            <Building2 className="mx-auto h-8 w-8 text-[#1f6f63]" />
            <p className="mt-2 text-lg font-black text-[#102426]">
              No properties on this map
            </p>
            <p className="mt-1 text-sm font-semibold text-[#526260]">
              Try a different city, address, or special.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestInfoModal({ property, searchParams, onClose, onSubmitted }) {
  const [form, setForm] = useState(() => ({
    ...emptyRequestInfoForm,
    area: property.area || property.city || "",
  }));
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.name ||
      !form.phone ||
      !form.email ||
      !form.area ||
      !form.bedrooms ||
      !form.budget ||
      !form.moveIn
    ) {
      setFormError("Please complete all required fields before submitting.");
      return;
    }

    if (!form.smsConsent) {
      setFormError("Please agree to receive text messages before submitting.");
      return;
    }

    const budgetQualificationMessage = getBudgetQualificationMessage(
      form.bedrooms,
      form.budget
    );

    if (budgetQualificationMessage) {
      setFormError(budgetQualificationMessage);
      return;
    }

    setFormError("");
    const adTracking = getAdTracking(searchParams);
    const leadPayload = {
      id: `local-${Date.now()}`,
      name: form.name,
      phone: form.phone,
      email: form.email,
      preference: `${form.bedrooms} - ${form.area} - ${form.budget} budget`,
      bedrooms: form.bedrooms,
      budget: form.budget,
      moveIn: form.moveIn,
      status: "New Lead",
      quality: "New",
      priority: "Medium",
      source: adTracking.hasPaidTracking ? "Google Ads" : "Property search modal",
      sourcePropertyId: property.id,
      sourcePropertyName: property.name,
      assignedTo: "Unassigned",
      lastTouch: "Just now",
      notes: form.notes || `Requested info for ${property.name}.`,
      recommendedPropertyIds: [],
      token: `lead-${Date.now()}`,
      contactMethod: form.contactMethod || "Not selected",
      createdAt: new Date().toISOString(),
      utmSource: adTracking.utmSource,
      utmMedium: adTracking.utmMedium,
      utmCampaign: adTracking.utmCampaign,
      utmTerm: adTracking.utmTerm,
      utmContent: adTracking.utmContent,
      gclid: adTracking.gclid,
      landingPage: adTracking.landingPage,
      referrer: adTracking.referrer,
    };

    try {
      setIsSubmitting(true);
      const savedLead = await saveSupabaseLead(leadPayload);

      saveLeadEventInBackground({
        leadId: savedLead.id,
        eventType: "lead_submitted",
        propertyId: savedLead.sourcePropertyId,
        propertyName: savedLead.sourcePropertyName,
        metadata: {
          source: savedLead.source,
          bedrooms: savedLead.bedrooms,
          budget: savedLead.budget,
          moveIn: savedLead.moveIn,
          contactMethod: savedLead.contactMethod,
          utmSource: savedLead.utmSource,
          utmMedium: savedLead.utmMedium,
          utmCampaign: savedLead.utmCampaign,
          utmTerm: savedLead.utmTerm,
          utmContent: savedLead.utmContent,
          gclid: savedLead.gclid,
          landingPage: savedLead.landingPage,
          referrer: savedLead.referrer,
        },
      });

      sendLeadNotificationInBackground({
        ...leadPayload,
        ...savedLead,
      });
      onSubmitted();
    } catch (error) {
      console.error(error);

      if (isLocalFallbackEnabled) {
        saveLocalLead(leadPayload);
        sendLeadNotificationInBackground(leadPayload);
        onSubmitted();
        return;
      }

      setFormError("Something went wrong while saving your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[#102426]/70 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-info-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-white/70">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#d7e6df] bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[#1f6f63]">
              Request apartment info
            </p>
            <h2
              id="request-info-title"
              className="mt-1 text-xl font-black leading-tight text-[#102426] sm:text-2xl"
            >
              Interested in {property.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f8f1] text-[#102426] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
            aria-label="Close request form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-5 sm:px-6">
          <div className="mb-5 rounded-2xl bg-[#d8efe6] p-4 text-sm font-bold text-[#1f6f63] ring-1 ring-[#a9cfc2]">
            We will include {property.name} with your request.
          </div>

          {formError && (
            <div className="mb-5 rounded-2xl bg-[#fde8df] p-4 text-sm font-bold text-[#b33818] ring-1 ring-[#f4b39f]">
              {formError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <RequestInfoField
              label="Full Name"
              value={form.name}
              onChange={(value) => handleChange("name", value)}
              placeholder="Ashley Brown"
              required
            />
            <RequestInfoField
              label="Phone"
              value={form.phone}
              onChange={(value) => handleChange("phone", value)}
              placeholder="(214) 555-0144"
              required
            />
            <RequestInfoField
              label="Email"
              value={form.email}
              onChange={(value) => handleChange("email", value)}
              placeholder="ashley@example.com"
              type="email"
              required
            />
            <RequestInfoField
              label="Preferred Area"
              value={form.area}
              onChange={(value) => handleChange("area", value)}
              placeholder="Uptown Dallas"
              required
            />
            <RequestInfoSelectField
              label="Bedrooms"
              value={form.bedrooms}
              onChange={(value) => handleChange("bedrooms", value)}
              options={["Studio", "1 Bed", "2 Bed", "3 Bed"]}
              required
            />
            <RequestInfoField
              label="Budget"
              value={form.budget}
              onChange={(value) => handleChange("budget", value)}
              placeholder="$1,600"
              helperText={DALLAS_BUDGET_GUIDE}
              required
            />
            <RequestInfoField
              label="Move-in Date"
              value={form.moveIn}
              onChange={(value) => handleChange("moveIn", value)}
              type="date"
              required
            />
            <RequestInfoSelectField
              label="Preferred Contact"
              value={form.contactMethod}
              onChange={(value) => handleChange("contactMethod", value)}
              options={["Text", "Call", "Email"]}
            />
          </div>

          <div className="mt-4">
            <label className="text-sm font-bold text-[#526260]">Notes</label>
            <textarea
              value={form.notes}
              onChange={(event) => handleChange("notes", event.target.value)}
              rows={4}
              placeholder="Tell us about must-haves, pets, parking, work location, or timing..."
              className="mt-2 w-full resize-none rounded-2xl border border-[#b8d9d0] bg-white p-4 font-semibold text-[#102426] outline-none placeholder:text-[#78908a] focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
            />
          </div>

          <label className="mt-4 flex gap-3 rounded-2xl bg-[#f5f8f1] p-4 text-xs font-semibold leading-5 text-[#526260] ring-1 ring-[#d7e6df]">
            <input
              type="checkbox"
              checked={form.smsConsent}
              onChange={(event) => handleChange("smsConsent", event.target.checked)}
              required
              className="mt-1 h-4 w-4 shrink-0 accent-[#173f3f]"
            />
            <span>
              <strong className="block text-[#102426]">
                Text Message Consent
              </strong>
              I agree to receive recurring text messages from Below Market
              Apartments about apartment search help, property recommendations,
              tour coordination, and follow-up at the phone number I provided.
              Message frequency varies. Message and data rates may apply. Reply{" "}
              <strong>HELP</strong> for help or <strong>STOP</strong> to opt
              out. Consent is not a condition of renting an apartment. View our{" "}
              <Link className="font-black text-[#173f3f] underline" to="/privacy-policy">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link className="font-black text-[#173f3f] underline" to="/terms-and-conditions">
                Terms and Conditions
              </Link>
              .
            </span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-2xl bg-[#f2b84b] px-5 py-4 text-sm font-black text-[#102426] hover:bg-[#f9d783] disabled:cursor-not-allowed disabled:bg-[#d7e6df] disabled:text-[#78908a]"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </section>
    </div>
  );
}

function RequestInfoField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  helperText = "",
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#526260]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-2xl border border-[#b8d9d0] bg-white px-4 py-3 font-semibold text-[#102426] outline-none placeholder:text-[#78908a] focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
      />
      {helperText && (
        <span className="mt-2 block text-xs font-bold leading-5 text-[#526260]">
          {helperText}
        </span>
      )}
    </label>
  );
}

function RequestInfoSelectField({ label, value, onChange, options, required = false }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#526260]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-2xl border border-[#b8d9d0] bg-white px-4 py-3 font-semibold text-[#102426] outline-none focus:border-[#f2b84b] focus:ring-4 focus:ring-[#f2b84b]/20"
      >
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function SearchResultCard({
  property,
  isCompared,
  isMapHighlighted,
  selectedBedroomFilter,
  selectedPriceRange,
  cardRef,
  onRequestInfo,
  onToggleCompare,
}) {
  const addressLabel = getPropertyAddressLabel(property);
  const displayFloorPlans = getSearchDisplayFloorPlans(
    property,
    selectedBedroomFilter,
    selectedPriceRange
  );
  const priceSummary = getPropertySearchPriceSummary(property, displayFloorPlans);
  const hasSpecial = priceSummary.hasSpecial;
  const showNetEffectiveRent = priceSummary.hasRentSpecial;
  const estimatedRentLabel = isRentRangeLabel(priceSummary.effectiveRentLabel)
    ? "Estimated rent range"
    : "Estimated rent";
  const listedRentLabel = isRentRangeLabel(priceSummary.normalRentLabel)
    ? "Listed rent range"
    : "Listed rent";
  const dealScore = getSearchDealScore(property, priceSummary);
  const transparencyBadges = getSearchTransparencyBadges(property, priceSummary);
  const cardHref = `/properties/${property.id}`;
  const showGoldHoverBar = isMapHighlighted && propertyHasStrongMapDeal(property);
  const floorPlanCount = displayFloorPlans.length;
  const galleryImages = useMemo(() => getSearchCardGalleryImages(property), [property]);
  const [galleryPhotoIndex, setGalleryPhotoIndex] = useState(0);
  const currentGalleryImage = galleryImages[galleryPhotoIndex] || getPropertyPrimaryImage(property);
  const hasGalleryControls = galleryImages.length > 1;
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  const didSwipeGalleryRef = useRef(false);

  useEffect(() => {
    setGalleryPhotoIndex(0);
  }, [property.id]);

  const showPreviousGalleryPhoto = () => {
    setGalleryPhotoIndex((currentIndex) =>
      currentIndex === 0 ? galleryImages.length - 1 : currentIndex - 1
    );
  };

  const showNextGalleryPhoto = () => {
    setGalleryPhotoIndex((currentIndex) =>
      currentIndex === galleryImages.length - 1 ? 0 : currentIndex + 1
    );
  };

  const handleGalleryTouchStart = (event) => {
    if (!hasGalleryControls) return;

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    didSwipeGalleryRef.current = false;
  };

  const handleGalleryTouchEnd = (event) => {
    if (
      !hasGalleryControls ||
      touchStartXRef.current === null ||
      touchStartYRef.current === null
    ) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(deltaX) < 42 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) {
      return;
    }

    didSwipeGalleryRef.current = true;

    if (deltaX > 0) {
      showPreviousGalleryPhoto();
    } else {
      showNextGalleryPhoto();
    }
  };

  const handleGalleryLinkClick = (event) => {
    if (!didSwipeGalleryRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    didSwipeGalleryRef.current = false;
  };

  return (
    <article
      ref={cardRef}
      className={`overflow-hidden rounded-xl bg-white shadow-sm ring-1 transition duration-200 ease-out hover:-translate-y-1.5 hover:ring-2 hover:ring-[#f2b84b] hover:shadow-[0_18px_42px_rgba(16,36,38,0.18)] md:grid md:grid-cols-[152px_minmax(0,1fr)] md:items-stretch lg:grid-cols-[196px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)] ${
        isMapHighlighted ? "ring-2 ring-[#f2b84b] shadow-[0_18px_42px_rgba(16,36,38,0.18)]" : "ring-[#d7e6df]"
      }`}
    >
      <div
        className="relative block h-[220px] overflow-hidden bg-[#dcebe4] md:h-full md:min-h-[164px] md:self-stretch lg:min-h-[184px] xl:min-h-[246px]"
        onTouchStart={handleGalleryTouchStart}
        onTouchEnd={handleGalleryTouchEnd}
      >
        <Link
          to={cardHref}
          onClickCapture={handleGalleryLinkClick}
          className="absolute inset-0 block overflow-hidden"
        >
        {showGoldHoverBar && (
          <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-[#f2b84b]" />
        )}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={currentGalleryImage}
            alt={property.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 !h-full w-full object-cover"
          />
          <div className="absolute left-2 right-2 top-2 z-10 flex min-w-0 items-start justify-between gap-2 sm:left-3 sm:right-3 sm:top-3">
            <div className="shrink-0 rounded-lg bg-white/95 px-2 py-1.5 text-[#102426] shadow-lg ring-1 ring-white/70 xl:px-2.5 xl:py-2">
              <p className="text-[9px] font-black uppercase leading-none text-[#1f6f63] xl:text-[10px]">
                Score
              </p>
              <p className="mt-0.5 text-base font-black leading-none xl:text-lg">{dealScore}</p>
            </div>
            {propertyHasStrongMapDeal(property) && (
              <div className="min-w-0 rounded-full bg-[#f2b84b] px-2 py-1 text-[10px] font-black leading-none text-[#102426] shadow-lg xl:px-3 xl:text-[11px]">
                <span className="block truncate">Top deal</span>
              </div>
            )}
          </div>
        </div>
        </Link>
        {hasGalleryControls && (
          <>
            <button
              type="button"
              onClick={showPreviousGalleryPhoto}
              className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-white drop-shadow-[0_2px_5px_rgba(16,36,38,0.75)]"
              aria-label={`Show previous photo for ${property.name}`}
            >
              <ChevronLeft className="h-7 w-7 text-white" />
            </button>
            <button
              type="button"
              onClick={showNextGalleryPhoto}
              className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-white drop-shadow-[0_2px_5px_rgba(16,36,38,0.75)]"
              aria-label={`Show next photo for ${property.name}`}
            >
              <ChevronRight className="h-7 w-7 text-white" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onRequestInfo}
          className="absolute inset-x-0 bottom-0 z-20 bg-[#f2b84b]/95 py-1.5 text-center text-[11px] font-black uppercase tracking-wide text-[#102426] shadow-[0_-6px_16px_rgba(16,36,38,0.14)] transition hover:bg-[#f9d783] md:hidden"
        >
          Request Info
        </button>
      </div>

      <div className="flex min-w-0 flex-col p-3 md:p-1.5 lg:p-2 xl:p-3.5">
        <div className="flex flex-col gap-1.5 xl:gap-2 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <Link to={cardHref} className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="min-w-0 truncate text-base font-black text-[#102426] md:text-[13px] lg:text-sm xl:text-lg">
                {property.name}
              </p>
              {hasSpecial && (
                <span className="max-w-full truncate rounded-full bg-[#fff8e6] px-2.5 py-1 text-[11px] font-black text-[#8a5b0a] ring-1 ring-[#f2d08a] md:px-1.5 md:py-0.5 md:text-[9px] lg:px-2 lg:text-[10px] xl:px-2.5 xl:py-1 xl:text-[11px]">
                  Special: {priceSummary.specialLabel}
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#526260] md:gap-1 md:text-[11px] lg:text-xs xl:gap-2 xl:text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-[#1f6f63] md:h-3.5 md:w-3.5 xl:h-4 xl:w-4" />
              <span className="truncate">{addressLabel}</span>
            </p>
          </Link>
          <span className="w-fit shrink-0 rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-black text-[#1f6f63] md:px-2 md:py-0.5 md:text-[10px] lg:px-2.5 lg:text-[11px] xl:px-3 xl:text-xs">
            {getBedsLabel(property, displayFloorPlans)}
          </span>
        </div>

        <div
          className={`mt-3 grid gap-2 md:mt-1.5 md:gap-1 xl:mt-3 xl:gap-2 ${
            showNetEffectiveRent ? "grid-cols-2" : ""
          }`}
        >
          {showNetEffectiveRent ? (
            <>
              <SearchRentMetric
                label={estimatedRentLabel}
                value={priceSummary.effectiveRentLabel}
                highlight
              />
              <SearchRentMetric
                label={listedRentLabel}
                value={priceSummary.normalRentLabel}
              />
            </>
          ) : (
            <SearchRentMetric
              label={listedRentLabel}
              value={priceSummary.normalRentLabel}
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-1.5 md:gap-1 xl:mt-3 xl:gap-2">
          <span className="rounded-full bg-[#f5f8f1] px-3 py-1 text-[11px] font-black text-[#526260] ring-1 ring-[#d7e6df] md:px-2 md:py-0.5 md:text-[9px] lg:px-2.5 lg:text-[10px] xl:px-3 xl:py-1 xl:text-[11px]">
            {floorPlanCount} matching floor plan{floorPlanCount === 1 ? "" : "s"}
          </span>
          {transparencyBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-[#e7f3ee] px-3 py-1 text-[11px] font-black text-[#1f6f63] md:px-2 md:py-0.5 md:text-[9px] lg:px-2.5 lg:text-[10px] xl:px-3 xl:py-1 xl:text-[11px]"
            >
              {badge}
            </span>
          ))}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-1 pt-3 md:grid-cols-3 md:pt-1.5 xl:gap-1.5 xl:pt-3">
          <Link
            to={cardHref}
            className="inline-flex items-center justify-center rounded-lg bg-[#173f3f] px-2 py-2 text-center text-[11px] font-black text-white transition hover:bg-[#102426] sm:text-xs md:px-2 md:py-2 md:text-[11px] lg:px-2.5 lg:text-xs xl:py-2.5"
          >
            View details
          </Link>
          <button
            type="button"
            onClick={onRequestInfo}
            className="hidden rounded-lg bg-[#f2b84b] px-2 py-2 text-center text-[11px] font-black text-[#102426] transition hover:bg-[#f9d783] md:inline-flex md:items-center md:justify-center md:px-2 md:py-2 md:text-[11px] lg:px-2.5 lg:text-xs xl:py-2.5"
          >
            Request Info
          </button>
          <button
            type="button"
            onClick={onToggleCompare}
            className={`rounded-lg px-2 py-2 text-center text-[11px] font-black transition sm:text-xs md:px-2 md:py-2 md:text-[11px] lg:px-2.5 lg:text-xs xl:py-2.5 ${
              isCompared
                ? "bg-[#f2b84b] text-[#102426]"
                : "bg-[#f5f8f1] text-[#173f3f] hover:bg-[#d7e6df]"
            }`}
          >
            {isCompared ? "Added" : "Compare"}
          </button>
        </div>
      </div>
    </article>
  );
}

function getSearchCardGalleryImages(property) {
  const imageUrls = [
    ...(property?.photos || []).map((photo) =>
      photo?.cardUrl || photo?.thumbnailUrl || getPhotoImageUrl(photo)
    ),
    getPropertyPrimaryImage(property),
  ].filter(Boolean);

  return [...new Set(imageUrls)];
}

function SearchRentMetric({ label, value, highlight = false }) {
  return (
    <div
      className={`min-w-0 rounded-lg px-2.5 py-2 ring-1 sm:px-3 sm:py-2.5 md:px-2 md:py-1.5 lg:px-2.5 lg:py-2 xl:px-3 xl:py-2.5 ${
        highlight
          ? "bg-[#fff8e6] text-[#8a5b0a] ring-[#f2d08a]"
          : "bg-[#f5f8f1] text-[#526260] ring-[#d7e6df]"
      }`}
    >
      <p className="text-[9px] font-black uppercase leading-none sm:text-[10px]">{label}</p>
      <p className="mt-1 whitespace-normal break-words text-[13px] font-black leading-tight text-[#102426] sm:text-base md:mt-0.5 md:text-xs lg:text-sm xl:mt-1 xl:text-base">
        {value}
      </p>
    </div>
  );
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

async function resolveMappableProperties(properties) {
  const resolvedProperties = [];

  for (let index = 0; index < properties.length; index += MAP_GEOCODE_BATCH_SIZE) {
    const propertyBatch = properties.slice(index, index + MAP_GEOCODE_BATCH_SIZE);
    const resolvedBatch = await Promise.all(
      propertyBatch.map(async (property) => resolveMappableProperty(property))
    );

    resolvedProperties.push(...resolvedBatch);
  }

  return resolvedProperties.filter(Boolean);
}

async function resolveMappableProperty(property) {
  try {
    const existingCoordinates = getPropertyCoordinates(property);

    if (existingCoordinates) {
      return {
        ...property,
        ...existingCoordinates,
      };
    }

    if (hasPreciseStreetAddress(property)) {
      const geocodedCoordinates = await geocodePropertyAddress(property);

      if (geocodedCoordinates) {
        return {
          ...property,
          ...geocodedCoordinates,
        };
      }
    }

    const approximateCoordinates = await geocodePropertyArea(property);

    if (approximateCoordinates) {
      return {
        ...property,
        ...approximateCoordinates,
        mapAccuracy: "approximate",
      };
    }

    return null;
  } catch (error) {
    console.error(`Could not map ${property?.name || "property"}.`, error);
    return null;
  }
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
    cacheKey: `bma-mapbox-geocode:${addressLabel.toLowerCase()}`,
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
    cacheKey: `bma-mapbox-area-geocode:${areaLabel.toLowerCase()}`,
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
    console.warn("Could not cache map coordinates.", error);
  }
}

function getPointerMapPoint(map, event) {
  const canvasBounds = map.getCanvas().getBoundingClientRect();
  const mapPoint = map.unproject([
    event.clientX - canvasBounds.left,
    event.clientY - canvasBounds.top,
  ]);

  const latitude = Number(mapPoint.lat);
  const longitude = Number(mapPoint.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function createSearchMapPinElement(property) {
  const isApproximatePin = property.mapAccuracy === "approximate";
  const hasStrongDeal = propertyHasStrongMapDeal(property);
  const markerElement = document.createElement("button");
  const pinDotElement = document.createElement("span");
  markerElement.type = "button";
  markerElement.className = [
    "group flex h-7 w-7 items-center justify-center rounded-full focus:outline-none",
  ].join(" ");
  pinDotElement.className = [
    "block h-3.5 w-3.5 rounded-full border-2 shadow-[0_2px_7px_rgba(16,36,38,0.28)] transition group-hover:scale-125 group-focus:scale-125",
    isApproximatePin
      ? "border-white bg-[#8a5b0a]"
      : "border-white bg-[#173f3f]",
    hasStrongDeal
      ? "ring-2 ring-[#f2b84b] ring-offset-1 ring-offset-white group-hover:ring-4"
      : "",
  ].join(" ");
  markerElement.title = property.name || "Preview property";
  markerElement.setAttribute(
    "aria-label",
    `${property.name || "Property"} map pin. Preview property and show result card.`
  );
  markerElement.appendChild(pinDotElement);

  return markerElement;
}

function propertyHasStrongMapDeal(property) {
  const maxFreeWeeks = Math.max(
    0,
    ...getPropertySpecialValues(property)
      .map((specialValue) => getWeeksFromSpecialText(specialValue))
      .filter((weeksFree) => Number.isFinite(weeksFree))
  );

  return maxFreeWeeks >= 8;
}

function createAreaGeoJson(area) {
  if (!area) {
    return {
      type: "FeatureCollection",
      features: [],
    };
  }

  const coordinates = [];
  const pointCount = 80;

  for (let index = 0; index <= pointCount; index += 1) {
    const bearing = (index / pointCount) * 360;
    const point = getDestinationPoint(area.center, area.radiusMiles, bearing);
    coordinates.push([point.longitude, point.latitude]);
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      },
    ],
  };
}

function getDestinationPoint(center, distanceMiles, bearingDegrees) {
  const earthRadiusMiles = 3958.8;
  const angularDistance = distanceMiles / earthRadiusMiles;
  const bearing = toRadians(bearingDegrees);
  const startLatitude = toRadians(center.latitude);
  const startLongitude = toRadians(center.longitude);
  const destinationLatitude = Math.asin(
    Math.sin(startLatitude) * Math.cos(angularDistance) +
    Math.cos(startLatitude) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const destinationLongitude =
    startLongitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(startLatitude),
      Math.cos(angularDistance) - Math.sin(startLatitude) * Math.sin(destinationLatitude)
    );

  return {
    latitude: toDegrees(destinationLatitude),
    longitude: toDegrees(destinationLongitude),
  };
}

function getDistanceMiles(firstPoint, secondPoint) {
  const earthRadiusMiles = 3958.8;
  const latitudeDistance = toRadians(secondPoint.latitude - firstPoint.latitude);
  const longitudeDistance = toRadians(secondPoint.longitude - firstPoint.longitude);
  const firstLatitude = toRadians(firstPoint.latitude);
  const secondLatitude = toRadians(secondPoint.latitude);
  const haversineValue =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(firstLatitude) *
    Math.cos(secondLatitude) *
    Math.sin(longitudeDistance / 2) ** 2;
  const centralAngle = 2 * Math.atan2(
    Math.sqrt(haversineValue),
    Math.sqrt(1 - haversineValue)
  );

  return earthRadiusMiles * centralAngle;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}

function propertyHasWeeksFreeSpecial(property, targetWeeks) {
  return getPropertySpecialValues(property).some((value) => {
    if (typeof value === "number") return value === targetWeeks;

    return getWeeksFromSpecialText(value) === targetWeeks;
  });
}

function propertyMatchesPriceFilter(
  property,
  selectedPriceRange,
  selectedBedroomFilter = ""
) {
  if (!selectedPriceRange) return true;

  const priceOption = PRICE_FILTER_OPTIONS.find(
    (option) => option.label === selectedPriceRange
  );
  if (!priceOption) return true;

  const bedroomFilteredFloorPlans = getBedroomFilteredSearchFloorPlans(
    property,
    selectedBedroomFilter
  );
  const rentValues = getPropertyFilterRentValues(
    property,
    bedroomFilteredFloorPlans
  );
  if (rentValues.length === 0) return false;

  return rentValues.some((rentValue) => {
    const meetsMinimum = rentValue >= priceOption.min;
    const meetsMaximum = !priceOption.max || rentValue <= priceOption.max;

    return meetsMinimum && meetsMaximum;
  });
}

function propertyMatchesBedroomFilter(property, selectedBedroomFilter) {
  if (!selectedBedroomFilter) return true;

  const bedroomCounts = getPropertyBedroomCounts(property);
  if (bedroomCounts.length === 0) return false;

  if (selectedBedroomFilter === "studio") {
    return bedroomCounts.includes(0);
  }

  if (selectedBedroomFilter === "3plus") {
    return bedroomCounts.some((bedroomCount) => bedroomCount >= 3);
  }

  return bedroomCounts.includes(Number(selectedBedroomFilter));
}

function getSelectedPriceLabel(selectedPriceRange) {
  return (
    PRICE_FILTER_OPTIONS.find((option) => option.label === selectedPriceRange)?.label || ""
  );
}

function getSelectedBedroomLabel(selectedBedroomFilter) {
  return (
    BED_FILTER_OPTIONS.find((option) => option.value === selectedBedroomFilter)?.label || ""
  );
}

function getSearchDisplayFloorPlans(
  property,
  selectedBedroomFilter = "",
  selectedPriceRange = ""
) {
  const bedroomFilteredFloorPlans = getBedroomFilteredSearchFloorPlans(
    property,
    selectedBedroomFilter
  );
  const priceOption = PRICE_FILTER_OPTIONS.find(
    (option) => option.label === selectedPriceRange
  );

  if (!priceOption) return bedroomFilteredFloorPlans;

  const priceFilteredFloorPlans = bedroomFilteredFloorPlans
    .map((floorPlan) =>
      getPriceFilteredSearchFloorPlan(property, floorPlan, priceOption)
    )
    .filter(Boolean);

  return priceFilteredFloorPlans.length > 0
    ? priceFilteredFloorPlans
    : bedroomFilteredFloorPlans;
}

function getBedroomFilteredSearchFloorPlans(property, selectedBedroomFilter = "") {
  const floorPlans = getSearchFloorPlans(property);

  if (!selectedBedroomFilter) return floorPlans;

  const filteredFloorPlans = floorPlans.filter((floorPlan) =>
    floorPlanMatchesBedroomFilter(floorPlan, selectedBedroomFilter)
  );

  return filteredFloorPlans.length > 0 ? filteredFloorPlans : floorPlans;
}

function floorPlanMatchesBedroomFilter(floorPlan, selectedBedroomFilter) {
  const bedroomCount = getBedroomCount(floorPlan.bedrooms || floorPlan.beds);

  if (!Number.isFinite(bedroomCount) || bedroomCount >= 99) return false;
  if (selectedBedroomFilter === "studio") return bedroomCount === 0;
  if (selectedBedroomFilter === "3plus") return bedroomCount >= 3;

  return bedroomCount === Number(selectedBedroomFilter);
}

function rentValueMatchesPriceOption(rentValue, priceOption) {
  const meetsMinimum = rentValue >= priceOption.min;
  const meetsMaximum = !priceOption.max || rentValue <= priceOption.max;

  return meetsMinimum && meetsMaximum;
}

function getPriceFilteredSearchFloorPlan(property, floorPlan, priceOption) {
  const availableUnits =
    floorPlan.availableUnits?.filter((unit) => unit.status !== "leased") || [];

  if (availableUnits.length > 0) {
    const priceMatchedUnits = availableUnits.filter((unit) =>
      getUnitFilterRentValues(property, floorPlan, unit).some((rentValue) =>
        rentValueMatchesPriceOption(rentValue, priceOption)
      )
    );

    return priceMatchedUnits.length > 0
      ? { ...floorPlan, availableUnits: priceMatchedUnits }
      : null;
  }

  return getFloorPlanFilterRentValues(property, floorPlan).some((rentValue) =>
    rentValueMatchesPriceOption(rentValue, priceOption)
  )
    ? floorPlan
    : null;
}

function getPropertyFilterRentValues(property, floorPlans = getSearchFloorPlans(property)) {
  const priceSummary = getPropertySearchPriceSummary(property, floorPlans);
  const specialDealUnits = getSearchSpecialDealUnits(property, floorPlans);
  const specialRentValues = specialDealUnits
    .filter((dealUnit) => dealUnit.hasRentSpecial)
    .map((dealUnit) => dealUnit.effectiveRentNumber)
    .filter((value) => value > 0);

  if (specialRentValues.length > 0) return specialRentValues;

  return [
    ...getNormalRentValues(property, floorPlans),
    parseFirstCurrency(priceSummary.effectiveRentLabel),
    parseFirstCurrency(priceSummary.normalRentLabel),
  ].filter(Boolean);
}

function getFloorPlanFilterRentValues(property, floorPlan) {
  const floorPlanSpecial = getFloorPlanSearchSpecial(floorPlan, property);
  const availableUnits =
    floorPlan.availableUnits?.filter((unit) => unit.status !== "leased") || [];

  if (availableUnits.length > 0) {
    return availableUnits
      .flatMap((unit) => getUnitFilterRentValues(property, floorPlan, unit))
      .filter(Boolean);
  }

  if (floorPlanSpecial.hasSpecial) {
    const specialDealUnit = createSearchSpecialDealUnit({
      floorPlan,
      unitRent: floorPlan.startingRent || floorPlan.rent || property?.rent,
      specialLabel: floorPlanSpecial.label,
      freeWeeks: floorPlanSpecial.freeWeeks,
      rentCreditSpecial: floorPlanSpecial.rentCreditSpecial,
    });

    if (specialDealUnit.hasRentSpecial) return [specialDealUnit.effectiveRentNumber];
  }

  return [
    ...parseCurrencyValues(
      floorPlan.totalMonthlyRent || floorPlan.rent || floorPlan.startingRent
    ),
  ].filter(Boolean);
}

function getUnitFilterRentValues(property, floorPlan, unit) {
  const floorPlanSpecial = getFloorPlanSearchSpecial(floorPlan, property);
  const unitSpecial = getUnitSearchSpecial(unit, floorPlanSpecial);
  const unitRent =
    unit.rent || floorPlan.totalMonthlyRent || floorPlan.rent || floorPlan.startingRent;

  if (unitSpecial.hasSpecial) {
    const specialDealUnit = createSearchSpecialDealUnit({
      floorPlan,
      unitRent,
      specialLabel: unitSpecial.label,
      freeWeeks: unitSpecial.freeWeeks,
      rentCreditSpecial: unitSpecial.rentCreditSpecial,
    });

    return specialDealUnit.hasRentSpecial
      ? [specialDealUnit.effectiveRentNumber]
      : parseCurrencyValues(unitRent);
  }

  return parseCurrencyValues(unitRent);
}

function getPropertyBedroomCounts(property) {
  const bedroomValues = [
    ...(property?.bedrooms || []),
    ...getSearchFloorPlans(property).map(
      (floorPlan) => floorPlan.bedrooms || floorPlan.beds
    ),
  ];

  return [
    ...new Set(
      bedroomValues
        .map((bedroomValue) => getBedroomCount(bedroomValue))
        .filter((bedroomCount) => Number.isFinite(bedroomCount) && bedroomCount < 99)
    ),
  ];
}

function getPropertySpecialValues(property) {
  const specialValues = [
    property?.special,
    property?.special?.label,
    property?.currentSpecial,
    property?.freeWeeks,
  ];

  (property?.floorPlans || []).forEach((floorPlan) => {
    specialValues.push(
      floorPlan?.special,
      floorPlan?.special?.label,
      floorPlan?.currentSpecial,
      floorPlan?.freeWeeks
    );

    (floorPlan?.availableUnits || []).forEach((availableUnit) => {
      specialValues.push(
        availableUnit?.special,
        availableUnit?.special?.label,
        availableUnit?.currentSpecial,
        availableUnit?.freeWeeks
      );
    });
  });

  return specialValues.filter(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function getPropertySearchPriceSummary(property, floorPlans = getSearchFloorPlans(property)) {
  const normalRentValues = getNormalRentValues(property, floorPlans);
  const specialDealUnits = getSearchSpecialDealUnits(property, floorPlans);
  const specialRentValues = specialDealUnits
    .filter((dealUnit) => dealUnit.hasRentSpecial)
    .flatMap((dealUnit) => dealUnit.effectiveRentNumbers || [dealUnit.effectiveRentNumber])
    .filter((value) => value > 0);
  const specialLabels = [
    ...new Set(specialDealUnits.map((dealUnit) => dealUnit.specialLabel).filter(Boolean)),
  ];
  const normalRentLabel =
    normalRentValues.length > 0
      ? formatRentRange(Math.min(...normalRentValues), Math.max(...normalRentValues))
      : property.rent || "Contact for pricing";

  if (specialRentValues.length === 0) {
    return {
      hasSpecial: specialDealUnits.length > 0,
      hasRentSpecial: false,
      normalRentLabel,
      effectiveRentLabel: normalRentLabel,
      specialLabel: formatSearchSpecialSummary(specialLabels),
    };
  }

  return {
    hasSpecial: true,
    hasRentSpecial: true,
    normalRentLabel,
    effectiveRentLabel: formatRentRange(
      Math.min(...specialRentValues),
      Math.max(...specialRentValues)
    ),
    specialLabel: formatSearchSpecialSummary(specialLabels),
  };
}

function getSearchDealScore(property, priceSummary) {
  const normalRent = parseFirstCurrency(priceSummary.normalRentLabel);
  const effectiveRent = parseFirstCurrency(priceSummary.effectiveRentLabel);
  const savings = normalRent && effectiveRent ? Math.max(normalRent - effectiveRent, 0) : 0;
  const savingsPercent = normalRent ? savings / normalRent : 0;
  const hasPhotos = Boolean(getPropertyPrimaryImage(property));
  const hasAddress = Boolean(getPropertyAddressLabel(property));
  const hasFloorPlans = property?.floorPlans?.length > 0;
  const hasFees = Boolean(property?.requiredMonthlyFees || property?.monthlyFees);

  let score = 58;
  if (priceSummary.hasRentSpecial) score += 18;
  if (savingsPercent >= 0.08) score += 10;
  if (savingsPercent >= 0.14) score += 6;
  if (hasFees) score += 4;
  if (hasFloorPlans) score += 4;
  if (hasPhotos) score += 3;
  if (hasAddress) score += 3;

  return Math.max(40, Math.min(98, Math.round(score)));
}

function getSearchTransparencyBadges(property, priceSummary) {
  const badges = [];

  if (property?.requiredMonthlyFees || property?.monthlyFees) badges.push("Fees listed");
  if (property?.floorPlans?.length > 0) badges.push("Floor plans");
  if (property?.yearBuilt) badges.push(`Built ${property.yearBuilt}`);

  return badges.slice(0, 3);
}

function getFirstPricedSearchFloorPlan(floorPlans) {
  return [...floorPlans]
    .sort((firstFloorPlan, secondFloorPlan) => {
      const firstAvailable = isAvailableSearchFloorPlan(firstFloorPlan) ? 0 : 1;
      const secondAvailable = isAvailableSearchFloorPlan(secondFloorPlan) ? 0 : 1;

      return firstAvailable - secondAvailable;
    })
    .find((floorPlan) =>
      parseCurrency(
        floorPlan.totalMonthlyRent || floorPlan.rent || floorPlan.startingRent
      )
    );
}

function isAvailableSearchFloorPlan(floorPlan) {
  const status = String(floorPlan.status || "").toLowerCase();
  const availability = String(
    floorPlan.available || floorPlan.availability || ""
  ).toLowerCase();

  if (/not[-\s]?available|unavailable|leased|sold/.test(status)) return false;
  if (/not currently available|unavailable|sold out|0\s+available/.test(availability)) {
    return false;
  }

  return true;
}

function getSearchFloorPlans(property) {
  if (property?.floorPlans?.length) return property.floorPlans;

  return [
    {
      name: property?.name || "Available floor plan",
      startingRent: property?.startingRent || property?.rent || "",
      rent: property?.rent || "",
      totalMonthlyRent: property?.rent || "",
      requiredMonthlyFees: property?.requiredMonthlyFees || "",
      effectiveRent: property?.effectiveRent || "",
      currentSpecial: property?.special || "",
      freeWeeks: getWeeksFromSpecialText(property?.special) || 0,
      leaseTermMonths: 12,
      availableUnits: [],
    },
  ];
}

function getNormalRentValues(property, floorPlans) {
  const floorPlanRentGroups = floorPlans.map((floorPlan) => {
    const floorPlanRentValues = parseCurrencyValues(
      floorPlan.totalMonthlyRent || floorPlan.rent || floorPlan.startingRent
    );
    const unitRents =
      floorPlan.availableUnits
        ?.filter((unit) => unit.status !== "leased")
        .flatMap((unit) =>
          parseCurrencyValues(
            unit.rent ||
              floorPlan.totalMonthlyRent ||
              floorPlan.rent ||
              floorPlan.startingRent
          )
        )
        .filter(Boolean) || [];

    return {
      isAvailable: isAvailableSearchFloorPlan(floorPlan),
      values: unitRents.length > 0 ? unitRents : floorPlanRentValues,
    };
  });
  const availableRentValues = floorPlanRentGroups
    .filter((rentGroup) => rentGroup.isAvailable)
    .flatMap((rentGroup) => rentGroup.values)
    .filter(Boolean);
  const rentValues =
    availableRentValues.length > 0
      ? availableRentValues
      : floorPlanRentGroups.flatMap((rentGroup) => rentGroup.values).filter(Boolean);
  const propertyRentValues = parseCurrencyValues(property?.rent);

  return rentValues.length > 0 ? rentValues : propertyRentValues;
}

function getSearchSpecialDealUnits(property, floorPlans) {
  const availableFloorPlans = floorPlans.filter(isAvailableSearchFloorPlan);
  const searchableFloorPlans =
    availableFloorPlans.length > 0 ? availableFloorPlans : floorPlans;

  return searchableFloorPlans.flatMap((floorPlan) => {
    const floorPlanSpecial = getFloorPlanSearchSpecial(floorPlan, property);
    const availableUnits =
      floorPlan.availableUnits?.filter((unit) => unit.status !== "leased") || [];

    if (availableUnits.length === 0) {
      if (!floorPlanSpecial.hasSpecial) return [];

      return [
        createSearchSpecialDealUnit({
          floorPlan,
          unitRent: floorPlan.startingRent || floorPlan.rent || property?.rent,
          specialLabel: floorPlanSpecial.label,
          freeWeeks: floorPlanSpecial.freeWeeks,
          rentCreditSpecial: floorPlanSpecial.rentCreditSpecial,
        }),
      ];
    }

    return availableUnits.flatMap((unit) => {
      const unitSpecial = getUnitSearchSpecial(unit, floorPlanSpecial);

      if (!unitSpecial.hasSpecial) return [];

      return createSearchSpecialDealUnit({
        floorPlan,
        unitRent: unit.rent || floorPlan.startingRent || floorPlan.rent || property?.rent,
        specialLabel: unitSpecial.label,
        freeWeeks: unitSpecial.freeWeeks,
        rentCreditSpecial: unitSpecial.rentCreditSpecial,
      });
    });
  });
}

function createSearchSpecialDealUnit({
  floorPlan,
  unitRent,
  specialLabel,
  freeWeeks,
  rentCreditSpecial,
}) {
  const baseRentValues = parseCurrencyValues(unitRent);
  const baseRentNumber = baseRentValues[0] || 0;
  const requiredMonthlyFeesNumber = parseCurrency(floorPlan.requiredMonthlyFees);
  const enteredTotalMonthlyRentValues = parseCurrencyValues(
    floorPlan.totalMonthlyRent || floorPlan.rent
  );
  const enteredEffectiveRentValues = parseCurrencyValues(floorPlan.effectiveRent);
  const leaseTermMonths = Number(floorPlan.leaseTermMonths || 12);
  const freeMonths = Number(freeWeeks || 0) / 4;
  const rentCreditSpecialNumber = parseCurrency(rentCreditSpecial);
  const rentValues = baseRentValues.length > 0 ? baseRentValues : enteredTotalMonthlyRentValues;
  const effectiveRentNumbers = rentValues
    .map((baseRentValue, index) => {
      const totalMonthlyRentNumber =
        enteredTotalMonthlyRentValues[index] ||
        enteredTotalMonthlyRentValues[0] ||
        baseRentValue + requiredMonthlyFeesNumber;
      const enteredEffectiveRentNumber =
        enteredEffectiveRentValues[index] || enteredEffectiveRentValues[0] || 0;
      const monthlyConcession =
        baseRentValue && leaseTermMonths
          ? (baseRentValue * freeMonths + rentCreditSpecialNumber) / leaseTermMonths
          : 0;
      const calculatedEffectiveRentNumber =
        totalMonthlyRentNumber && monthlyConcession
          ? Math.max(totalMonthlyRentNumber - monthlyConcession, 0)
          : 0;

      return calculatedEffectiveRentNumber || enteredEffectiveRentNumber || totalMonthlyRentNumber;
    })
    .filter((value) => value > 0);
  const totalMonthlyRentNumber =
    enteredTotalMonthlyRentValues[0] ||
    (baseRentNumber ? baseRentNumber + requiredMonthlyFeesNumber : 0);
  const enteredEffectiveRentNumber = enteredEffectiveRentValues[0] || 0;
  const hasEnteredEffectiveRentDeal = enteredEffectiveRentValues.some(
    (effectiveRentValue, index) =>
      effectiveRentValue > 0 &&
      (enteredTotalMonthlyRentValues[index] ||
        enteredTotalMonthlyRentValues[0] ||
        totalMonthlyRentNumber) > 0 &&
      effectiveRentValue <
        (enteredTotalMonthlyRentValues[index] ||
          enteredTotalMonthlyRentValues[0] ||
          totalMonthlyRentNumber)
  );
  const hasRentConcession =
    !isNonRentOnlySpecialText(specialLabel) &&
    (Number(freeWeeks || 0) > 0 ||
      rentCreditSpecialNumber > 0 ||
      hasEnteredEffectiveRentDeal);

  return {
    specialLabel,
    hasRentSpecial: hasRentConcession,
    effectiveRentNumber: effectiveRentNumbers[0] || enteredEffectiveRentNumber || totalMonthlyRentNumber,
    effectiveRentNumbers,
  };
}

function getFloorPlanSearchSpecial(floorPlan, property) {
  const label =
    floorPlan.currentSpecial ||
    floorPlan.special?.label ||
    property?.special ||
    "";
  const freeWeeks =
    Number(floorPlan.freeWeeks || floorPlan.special?.freeWeeks || 0) ||
    getWeeksFromSpecialText(label);
  const rentCreditSpecial =
    floorPlan.rentCreditSpecial ||
    floorPlan.special?.rentCreditSpecial ||
    getRentCreditSpecialFromText(label);

  return {
    hasSpecial: freeWeeks > 0 || Boolean(rentCreditSpecial) || Boolean(label),
    freeWeeks,
    rentCreditSpecial,
    label:
      label ||
      getSearchSpecialLabel(freeWeeks, rentCreditSpecial) ||
      (freeWeeks > 0 ? `${freeWeeks} weeks free` : ""),
  };
}

function getUnitSearchSpecial(unit, floorPlanSpecial) {
  if (unit.specialMode === "none") {
    return {
      hasSpecial: false,
      freeWeeks: 0,
      rentCreditSpecial: "",
      label: "",
    };
  }

  const label = unit.currentSpecial || unit.special?.label || "";
  const freeWeeks =
    Number(unit.freeWeeks || unit.special?.freeWeeks || 0) ||
    getWeeksFromSpecialText(label);
  const rentCreditSpecial =
    unit.rentCreditSpecial ||
    unit.special?.rentCreditSpecial ||
    getRentCreditSpecialFromText(label);

  if (unit.specialMode === "custom" || freeWeeks > 0 || rentCreditSpecial || label) {
    return {
      hasSpecial: freeWeeks > 0 || Boolean(rentCreditSpecial) || Boolean(label),
      freeWeeks,
      rentCreditSpecial,
      label:
        label ||
        getSearchSpecialLabel(freeWeeks, rentCreditSpecial) ||
        (freeWeeks > 0 ? `${freeWeeks} weeks free` : ""),
    };
  }

  return floorPlanSpecial;
}

function formatSearchSpecialSummary(specialLabels) {
  const cleanLabels = specialLabels.filter(
    (label) => label && label !== "Special not listed"
  );

  if (cleanLabels.length === 0) return "Special available";
  if (cleanLabels.length <= 2) return cleanLabels.join(", ");

  return `${cleanLabels.slice(0, 2).join(", ")} +${cleanLabels.length - 2} more`;
}

function getWeeksFromSpecialText(value) {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*weeks?\s*free/i);
  if (!match) return null;

  return Number(match[1]);
}

function getRentCreditSpecialFromText(value) {
  const match = String(value || "").match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(?:off|rent credit|credit)/i);
  if (!match) return "";

  return formatCurrency(Number(match[1].replace(/,/g, "")));
}

function getSearchSpecialLabel(freeWeeks, rentCreditSpecial = "") {
  const specialParts = [];
  const rentCreditNumber = parseCurrency(rentCreditSpecial);

  if (freeWeeks) {
    specialParts.push(`${freeWeeks} ${freeWeeks === 1 ? "week" : "weeks"} free`);
  }

  if (rentCreditNumber) {
    specialParts.push(`${formatCurrency(rentCreditNumber)} off base rent`);
  }

  return specialParts.join(" + ");
}

function getPrimaryRentLabel(property) {
  const priceSummary = getPropertySearchPriceSummary(property);

  return priceSummary.hasRentSpecial
    ? priceSummary.effectiveRentLabel
    : priceSummary.normalRentLabel;
}

function parseCurrency(value) {
  const match = String(value || "").match(/\$?\s*([\d,]+(?:\.\d+)?)/);
  if (!match) return 0;

  const parsedValue = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parseCurrencyValues(value) {
  return [...String(value || "").matchAll(/\$?\s*([\d,]+(?:\.\d+)?)/g)]
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((parsedValue) => Number.isFinite(parsedValue) && parsedValue > 0);
}

function parseFirstCurrency(value) {
  const match = String(value || "").match(/\$?\s*([\d,]+(?:\.\d+)?)/);
  if (!match) return 0;

  return Number(match[1].replace(/,/g, ""));
}

function formatCurrency(value) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatRentRange(minRent, maxRent) {
  if (!minRent && !maxRent) {
    return "Contact for pricing";
  }

  if (minRent === maxRent) {
    return `${formatCurrency(minRent)}+`;
  }

  return `${formatCurrency(minRent)} - ${formatCurrency(maxRent)}`;
}

function isRentRangeLabel(value) {
  return /\$\d[\d,]*\s*-\s*\$\d[\d,]*/.test(String(value || ""));
}

function getBedsLabel(property, floorPlans = null) {
  const bedroomsFromFloorPlans =
    floorPlans
      ?.map(getBedroomValueFromFloorPlan)
      .filter((bedroomValue) => bedroomValue !== undefined && bedroomValue !== null) ||
    [];
  const bedrooms = [
    ...new Set(bedroomsFromFloorPlans.length > 0 ? bedroomsFromFloorPlans : property.bedrooms || []),
  ].sort(
    (firstBedroom, secondBedroom) =>
      getBedroomCount(firstBedroom) - getBedroomCount(secondBedroom)
  );

  if (bedrooms.length === 0) return "Beds";
  if (bedrooms.length === 1) return formatBedroomLabel(bedrooms[0]);

  const firstBedroom = bedrooms[0];
  const lastBedroom = bedrooms[bedrooms.length - 1];
  const firstCount = getBedroomCount(firstBedroom);
  const lastCount = getBedroomCount(lastBedroom);

  if (firstCount === 0 && lastCount > 0) return `Studio - ${lastCount} bd`;
  if (firstCount > 0 && lastCount > firstCount) return `${firstCount}-${lastCount} bd`;

  return `${formatBedroomLabel(firstBedroom)} - ${formatBedroomLabel(lastBedroom)}`;
}

function getBedroomValueFromFloorPlan(floorPlan = {}) {
  const bedroomValue = floorPlan.bedrooms ?? floorPlan.beds;
  if (bedroomValue !== undefined && bedroomValue !== null && bedroomValue !== "") {
    return bedroomValue;
  }

  const floorPlanName = String(floorPlan.name || floorPlan.floorPlanName || "").trim();
  if (/studio/i.test(floorPlanName) || /^s\d*[a-z]?$/i.test(floorPlanName)) {
    return "Studio";
  }

  return bedroomValue;
}

function getBedroomCount(value) {
  if (String(value).toLowerCase().includes("studio")) return 0;

  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function formatBedroomLabel(value) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return "Beds";
  if (/studio/i.test(normalizedValue) || normalizedValue === "0") return "Studio";
  if (/\bbd\b/i.test(normalizedValue)) return normalizedValue;

  const bedMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*beds?$/i);
  if (bedMatch) return `${bedMatch[1]} bd`;

  const match = normalizedValue.match(/^(\d+(?:\.\d+)?)$/);
  if (match) return `${match[1]} bd`;

  return normalizedValue;
}

function getMapPinPosition(index) {
  const positions = [
    { left: "31%", top: "56%" },
    { left: "56%", top: "45%" },
    { left: "72%", top: "62%" },
    { left: "43%", top: "72%" },
    { left: "82%", top: "36%" },
    { left: "21%", top: "38%" },
    { left: "61%", top: "76%" },
    { left: "37%", top: "31%" },
  ];

  return positions[index % positions.length];
}
