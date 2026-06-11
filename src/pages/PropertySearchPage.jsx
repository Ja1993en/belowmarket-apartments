import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, MapPin, Navigation, Search, Tag } from "lucide-react";

import {
  getPropertyAddressLabel,
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

export default function PropertySearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(searchFromUrl);
  const [selectedArea, setSelectedArea] = useState(null);
  const [mappableSearchProperties, setMappableSearchProperties] = useState([]);
  const properties = useMemo(() => getPublicSearchProperties(), []);
  const searchMatchedProperties = useMemo(
    () =>
      properties.filter((property) =>
        matchesPropertySearch(property, searchFromUrl)
      ),
    [properties, searchFromUrl]
  );
  const filteredProperties = useMemo(() => {
    if (!selectedArea) return searchMatchedProperties;

    const mappablePropertiesById = new Map(
      mappableSearchProperties.map((property) => [property.id, property])
    );

    return searchMatchedProperties.filter((property) => {
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
  }, [mappableSearchProperties, searchMatchedProperties, selectedArea]);
  const suggestions = useMemo(
    () => getPropertySearchSuggestions(properties, searchTerm),
    [properties, searchTerm]
  );

  useEffect(() => {
    let isMounted = true;

    resolveMappableProperties(searchMatchedProperties)
      .then((resolvedProperties) => {
        if (isMounted) {
          setMappableSearchProperties(resolvedProperties);
        }
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) {
          setMappableSearchProperties([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchMatchedProperties]);

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

  return (
    <main className="min-h-screen bg-[#f5f8f1] text-[#102426]">
      <header className="sticky top-0 z-40 border-b border-[#d7e6df] bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#173f3f] text-xs font-black text-[#f2b84b]">
              BMA
            </span>
            <span className="font-black text-[#102426]">
              Below Market Apartments
            </span>
          </Link>

          <Link
            to="/start"
            className="rounded-2xl bg-[#f2b84b] px-4 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            Find Apartment Locator
          </Link>
        </div>
      </header>

      <section className="border-b border-[#d7e6df] bg-white px-4 py-4">
        <div className="mx-auto max-w-6xl">
          <form
            onSubmit={submitSearch}
            className="relative rounded-2xl border border-[#d7e6df] bg-white p-2 shadow-sm"
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2d7dd2]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="City, state, address, or special"
                  autoComplete="off"
                  className="h-14 w-full rounded-xl border border-[#b8d9d0] bg-white pl-12 pr-4 text-base font-bold text-[#102426] outline-none focus:border-[#2d7dd2]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="h-11 rounded-xl border border-[#d7e6df] bg-white px-4 text-sm font-black text-[#102426] hover:bg-[#f5f8f1]"
                >
                  Price
                </button>
                <button
                  type="button"
                  className="h-11 rounded-xl border border-[#d7e6df] bg-white px-4 text-sm font-black text-[#102426] hover:bg-[#f5f8f1]"
                >
                  Beds
                </button>
                <button
                  type="button"
                  className="h-11 rounded-xl border border-[#d7e6df] bg-white px-4 text-sm font-black text-[#102426] hover:bg-[#f5f8f1]"
                >
                  Specials
                </button>
              </div>

              <button
                type="submit"
                className="h-14 rounded-xl bg-[#173f3f] px-7 text-sm font-black text-white hover:bg-[#102426]"
              >
                Search
              </button>
            </div>

            {suggestions.length > 0 && searchTerm.trim() !== searchFromUrl.trim() && (
              <div className="absolute left-2 right-2 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-[#d7e6df] bg-white shadow-2xl lg:right-auto lg:w-[min(560px,calc(100%-1rem))]">
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#e7f3ee] px-4 py-2 text-sm font-black text-[#1f6f63]">
              {filteredProperties.length} result{filteredProperties.length === 1 ? "" : "s"}
            </span>
            {searchFromUrl && (
              <>
                <span className="rounded-full bg-[#f5f8f1] px-4 py-2 text-sm font-bold text-[#526260] ring-1 ring-[#d7e6df]">
                  Search: {searchFromUrl}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setSearchParams({});
                    setSelectedArea(null);
                  }}
                  className="rounded-full px-4 py-2 text-sm font-black text-[#e4572e] hover:bg-[#fff0ea]"
                >
                  Clear
                </button>
              </>
            )}
            {selectedArea && (
              <span className="rounded-full bg-[#eef5ff] px-4 py-2 text-sm font-bold text-[#174a7c] ring-1 ring-[#b8d9f0]">
                Area: {selectedArea.radiusMiles.toFixed(1)} mi
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="border-b border-[#d7e6df] bg-white">
        <div className="relative h-[320px] overflow-hidden md:h-[380px] lg:h-[430px]">
          <SearchMap
            properties={filteredProperties}
            selectedArea={selectedArea}
            onAreaChange={setSelectedArea}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-[#1f6f63]">
              Apartment results
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#102426]">
              {searchFromUrl ? `${searchFromUrl} apartments` : "Apartments near you"}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#526260]">
              Search by city, state, property address, property name, ZIP, or special.
            </p>
          </div>
          <Link
            to="/start"
            className="w-fit rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            Get matched
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProperties.map((property) => (
            <SearchResultCard key={property.id} property={property} />
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="mt-6 rounded-3xl border border-[#d7e6df] bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-[#102426]">
              No matching properties yet
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-[#526260]">
              Try a city, ZIP code, property address, or special like 6 weeks free.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function SearchMap({ properties, selectedArea, onAreaChange }) {
  if (!MAPBOX_TOKEN) {
    return <FallbackSearchMap properties={properties} />;
  }

  return (
    <MapboxSearchMap
      properties={properties}
      selectedArea={selectedArea}
      onAreaChange={onAreaChange}
    />
  );
}

function MapboxSearchMap({ properties, selectedArea, onAreaChange }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const isChoosingAreaRef = useRef(false);
  const [mapboxGl, setMapboxGl] = useState(null);
  const [mapError, setMapError] = useState("");
  const [isChoosingArea, setIsChoosingArea] = useState(false);
  const [areaRadiusMiles, setAreaRadiusMiles] = useState(DEFAULT_AREA_RADIUS_MILES);
  const [mappableProperties, setMappableProperties] = useState([]);

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
    let isMounted = true;

    resolveMappableProperties(properties)
      .then((resolvedProperties) => {
        if (isMounted) {
          setMappableProperties(resolvedProperties);
        }
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) {
          setMappableProperties([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [properties]);

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
      setMapMarkerPointerEvents(mapRef.current, "none");
      return;
    }

    mapRef.current.dragPan.enable();
    mapRef.current.getCanvas().style.cursor = "";
    setMapMarkerPointerEvents(mapRef.current, "auto");
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

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new mapboxGl.LngLatBounds();

    mappableProperties.forEach((property) => {
      const isApproximatePin = property.mapAccuracy === "approximate";
      const markerElement = document.createElement("a");
      markerElement.href = `/properties/${property.id}`;
      markerElement.className =
        `rounded-full px-3 py-2 text-xs font-black text-white shadow-xl ring-2 ring-white transition hover:scale-105 ${
          isApproximatePin
            ? "bg-[#8a5b0a] hover:bg-[#684307]"
            : "bg-[#173f3f] hover:bg-[#102426]"
        }`;
      markerElement.textContent = getPrimaryRentLabel(property);
      markerElement.title = `${property.name}${
        isApproximatePin ? " - approximate location" : ""
      }`;
      markerElement.addEventListener("mousedown", (event) => {
        if (!isChoosingAreaRef.current) return;

        event.preventDefault();
        event.stopPropagation();
      });
      markerElement.addEventListener("click", (event) => {
        if (!isChoosingAreaRef.current) return;

        event.preventDefault();
        event.stopPropagation();
        onAreaChange({
          center: {
            latitude: property.latitude,
            longitude: property.longitude,
          },
          radiusMiles: areaRadiusMiles,
        });
        setIsChoosingArea(false);
      });

      const marker = new mapboxGl.Marker({ element: markerElement })
        .setLngLat([property.longitude, property.latitude])
        .setPopup(
          new mapboxGl.Popup({ offset: 18 }).setHTML(
            `<strong>${escapeMapText(property.name)}</strong><br>${escapeMapText(
              getPropertyAddressLabel(property)
            )}${
              isApproximatePin
                ? "<br><em>Approximate location until a full street address is added.</em>"
                : ""
            }`
          )
        )
        .addTo(mapRef.current);

      markersRef.current.push(marker);
      bounds.extend([property.longitude, property.latitude]);
    });

    if (mappableProperties.length > 1) {
      mapRef.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 12.8,
        duration: 500,
      });
    } else if (mappableProperties.length === 1) {
      mapRef.current.flyTo({
        center: [mappableProperties[0].longitude, mappableProperties[0].latitude],
        zoom: 13,
        duration: 500,
      });
    }
  }, [areaRadiusMiles, mapboxGl, mappableProperties, onAreaChange]);

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
        <div className="flex overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-[#d7e6df]">
          {AREA_RADIUS_OPTIONS.map((radiusMiles) => (
            <button
              key={radiusMiles}
              type="button"
              onClick={() => selectAreaRadius(radiusMiles)}
              className={`px-3 py-3 text-sm font-black ${
                areaRadiusMiles === radiusMiles
                  ? "bg-[#173f3f] text-white"
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
            if (!isChoosingArea && mapRef.current) {
              setMapMarkerPointerEvents(mapRef.current, "none");
            }
            setIsChoosingArea((currentValue) => !currentValue);
          }}
          className={`rounded-2xl px-4 py-3 text-sm font-black shadow-sm ring-1 ${
            isChoosingArea
              ? "bg-[#2d7dd2] text-white ring-[#2d7dd2]"
              : "bg-white/95 text-[#173f3f] ring-[#d7e6df] hover:bg-[#f5f8f1]"
          }`}
        >
          {isChoosingArea ? "Tap map" : "Choose area"}
        </button>
        {selectedArea && (
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
        )}
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-10 hidden items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-sm font-black text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df] sm:flex">
        <Navigation className="h-4 w-4 text-[#2d7dd2]" />
        Live map
      </div>
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
          <div className="rounded-3xl bg-white/95 p-6 text-center shadow-xl ring-1 ring-[#d7e6df]">
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

function SearchResultCard({ property }) {
  const addressLabel = getPropertyAddressLabel(property);
  const hasSpecial = Boolean(property.special && property.special !== "Special not listed");
  const cardHref = `/properties/${property.id}`;

  return (
    <Link
      to={cardHref}
      className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#d7e6df] transition hover:-translate-y-1 hover:ring-[#f2b84b] hover:shadow-md"
    >
      <img
        src={getPropertyPrimaryImage(property)}
        alt={property.name}
        className="aspect-[16/10] w-full object-cover"
      />

      <div className="p-4">
        <p className="truncate text-lg font-black text-[#102426]">
          {property.name}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#526260]">
          <MapPin className="h-4 w-4 shrink-0 text-[#1f6f63]" />
          <span className="truncate">{addressLabel}</span>
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase text-[#1f6f63]">
              {hasSpecial ? "Net Effective" : "Normal Rent"}
            </p>
            <p className="mt-1 text-2xl font-black text-[#102426]">
              {hasSpecial ? property.effectiveRent || property.rent : property.rent}
            </p>
          </div>

          <p className="rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-black text-[#1f6f63]">
            {getBedsLabel(property)}
          </p>
        </div>

        {hasSpecial && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#fff8e6] px-3 py-2 text-sm font-black text-[#102426] ring-1 ring-[#f2d08a]">
            <Tag className="h-4 w-4 shrink-0 text-[#8a5b0a]" />
            <span className="truncate">{property.special}</span>
          </p>
        )}
      </div>
    </Link>
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
  const resolvedProperties = await Promise.all(
    properties.map(async (property) => resolveMappableProperty(property))
  );

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

function setMapMarkerPointerEvents(map, pointerEventsValue) {
  map
    ?.getContainer()
    ?.querySelectorAll(".mapboxgl-marker")
    .forEach((markerElement) => {
      markerElement.style.pointerEvents = pointerEventsValue;
    });
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

function getPrimaryRentLabel(property) {
  const hasSpecial = Boolean(property.special && property.special !== "Special not listed");
  return hasSpecial ? property.effectiveRent || property.rent : property.rent;
}

function getBedsLabel(property) {
  const bedrooms = property.bedrooms || [];
  if (bedrooms.length === 0) return "Beds";
  if (bedrooms.length === 1) return bedrooms[0];

  return `${bedrooms[0]}+`;
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

function escapeMapText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
