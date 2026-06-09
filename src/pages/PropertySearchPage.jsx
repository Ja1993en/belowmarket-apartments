import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Search, Tag } from "lucide-react";

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
      <header className="border-b border-[#d7e6df] bg-white px-4 py-4 shadow-sm">
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

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black text-[#1f6f63]">
              Property search
            </p>
            <h1 className="mt-1 text-4xl font-black text-[#102426]">
              Search apartment deals
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-[#526260]">
              Search by city, state, property address, property name, ZIP, or special.
            </p>
          </div>

          <p className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#1f6f63] ring-1 ring-[#d7e6df]">
            {filteredProperties.length} result{filteredProperties.length === 1 ? "" : "s"}
          </p>
        </div>

        <form
          onSubmit={submitSearch}
          className="relative mt-6 rounded-3xl border border-[#d7e6df] bg-white p-2 shadow-sm"
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
            <div className="absolute left-2 right-2 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-[#d7e6df] bg-white shadow-2xl">
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

        {searchFromUrl && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#526260] ring-1 ring-[#d7e6df]">
              Search: {searchFromUrl}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSearchParams({});
              }}
              className="rounded-full px-4 py-2 text-sm font-black text-[#e4572e] hover:bg-[#fff0ea]"
            >
              Clear
            </button>
          </div>
        )}

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

function getBedsLabel(property) {
  const bedrooms = property.bedrooms || [];
  if (bedrooms.length === 0) return "Beds";
  if (bedrooms.length === 1) return bedrooms[0];

  return `${bedrooms[0]}+`;
}
