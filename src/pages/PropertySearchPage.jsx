import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, MapPin, Navigation, Search, Tag } from "lucide-react";

import {
  getPropertyAddressLabel,
  getPropertySearchSuggestions,
  getPublicSearchProperties,
  matchesPropertySearch,
} from "../data/propertySearchData";

export default function PropertySearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFromUrl = searchParams.get("search") || "";
  const [searchTerm, setSearchTerm] = useState(searchFromUrl);
  const properties = getPublicSearchProperties();
  const filteredProperties = useMemo(
    () =>
      properties.filter((property) =>
        matchesPropertySearch(property, searchFromUrl)
      ),
    [properties, searchFromUrl]
  );
  const suggestions = useMemo(
    () => getPropertySearchSuggestions(properties, searchTerm),
    [properties, searchTerm]
  );

  const submitSearch = (event) => {
    event.preventDefault();

    const query = searchTerm.trim();
    setSearchParams(query ? { search: query } : {});
  };

  const selectSuggestion = (suggestion) => {
    setSearchTerm(suggestion.value);
    setSearchParams({ search: suggestion.value });
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

      <section className="border-b border-[#d7e6df] bg-white">
        <div className="relative h-[380px] overflow-hidden lg:h-[430px]">
          <SearchMap properties={filteredProperties} />

          <div className="absolute inset-x-0 top-0 z-20 px-4 py-5">
            <div className="mx-auto max-w-6xl">
              <form
                onSubmit={submitSearch}
                className="relative rounded-3xl border border-[#d7e6df] bg-white p-2 shadow-xl shadow-[#102426]/15"
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2d7dd2]" />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="City, state, address, or special"
                      autoComplete="off"
                      className="h-14 w-full rounded-2xl border border-[#b8d9d0] bg-white pl-12 pr-4 text-base font-bold text-[#102426] outline-none focus:border-[#2d7dd2]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="h-14 rounded-2xl bg-[#173f3f] px-7 text-sm font-black text-white hover:bg-[#102426]"
                  >
                    Search
                  </button>
                </div>

                {suggestions.length > 0 && searchTerm.trim() !== searchFromUrl.trim() && (
                  <div className="absolute left-2 right-2 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-[#d7e6df] bg-white shadow-2xl">
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
                <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#1f6f63] shadow-sm ring-1 ring-[#d7e6df]">
                  {filteredProperties.length} result{filteredProperties.length === 1 ? "" : "s"}
                </span>
                {searchFromUrl && (
                  <>
                    <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#526260] shadow-sm ring-1 ring-[#d7e6df]">
                      Search: {searchFromUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setSearchParams({});
                      }}
                      className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#e4572e] shadow-sm ring-1 ring-[#f4c8b8] hover:bg-[#fff0ea]"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-10 hidden rounded-2xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-[#d7e6df] md:block">
            <p className="text-xs font-black uppercase text-[#1f6f63]">
              Map view
            </p>
            <p className="mt-1 text-sm font-bold text-[#526260]">
              Pins show visible search results
            </p>
          </div>
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

function SearchMap({ properties }) {
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
        const pinHref = property.isFallback ? "/start" : `/properties/${property.id}`;

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
  const cardHref = property.isFallback ? "/start" : `/properties/${property.id}`;

  return (
    <Link
      to={cardHref}
      className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#d7e6df] transition hover:-translate-y-1 hover:ring-[#f2b84b] hover:shadow-md"
    >
      <img
        src={property.photos?.[0]?.url || property.image}
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
