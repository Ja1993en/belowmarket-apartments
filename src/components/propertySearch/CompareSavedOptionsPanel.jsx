import { Link } from "react-router-dom";
import { getPropertyPrimaryImage } from "../../data/propertySearchData";
import { formatAvailability as formatAvailabilityLabel } from "../../utils/displayFormatters";

const COMPARE_TABS = [
  {
    label: "Properties",
    helper: "Saved communities",
    emptyText: "Start here",
  },
  {
    label: "Floor Plans",
    helper: "Exact layouts",
    emptyText: "Add layouts",
  },
  {
    label: "Details",
    helper: "Full table",
    emptyText: "Review",
  },
];

const FLOOR_PLAN_SCROLL_TARGET_KEY = "bma-scroll-target";

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

export default function CompareSavedOptionsPanel({
  activeTab,
  compareDetailMode,
  compareDetailRows,
  compareFloorPlanRows,
  formatBedroomLabel,
  getSearchDealScore,
  isCompact = false,
  isMobileModal = false,
  onClearCompare,
  onRemoveFloorPlan,
  onRemoveProperty,
  propertyCompareRows,
  setActiveTab,
}) {
  return (
    <div
      className={
        isCompact
          ? "rounded-none bg-transparent"
          : "mt-6 rounded-3xl border border-[#d7e6df] bg-white p-3 shadow-sm sm:p-5"
      }
    >
      {!isCompact && (
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black text-[#1f6f63]">
              Your compare list
            </p>
            <h2 className="mt-1 text-xl font-black text-[#102426] sm:text-2xl">
              Compare apartments side by side
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#526260]">
              This is where every property you tap Compare will land. Review rent, specials, and floor plans before you tour.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearCompare}
            className="w-fit rounded-lg border border-[#f2b84b] bg-[#b42318] px-2.5 py-1.5 text-[11px] font-black !text-white hover:bg-[#8f1d15] hover:!text-white"
          >
            Clear compare
          </button>
        </div>
      )}

      <div className={`${isCompact ? "grid grid-cols-3 gap-1.5" : "mt-4 grid grid-cols-3 gap-1.5 sm:gap-2"}`}>
        {COMPARE_TABS.map((tab) => {
          const count =
            tab.label === "Floor Plans"
              ? compareFloorPlanRows.length
              : tab.label === "Properties"
                ? propertyCompareRows.length
                : compareDetailRows.length;

          return (
            <button
              key={tab.label}
              type="button"
              aria-pressed={activeTab === tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`min-w-0 text-left font-black ring-1 transition ${
                isCompact
                  ? "rounded-xl px-2 py-2 text-[11px]"
                  : "rounded-2xl px-2.5 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm"
              } ${
                activeTab === tab.label
                  ? "bg-[#173f3f] text-white"
                  : "bg-[#f5f8f1] text-[#173f3f] ring-[#d7e6df] hover:bg-[#d7e6df]"
              }`}
            >
              <span className="flex min-w-0 items-start justify-between gap-1 sm:items-center sm:gap-2">
                <span className="min-w-0 whitespace-normal leading-tight sm:truncate">
                  {tab.label}
                </span>
                <span className="shrink-0 rounded-full bg-white/75 px-1.5 py-0.5 text-[9px] text-[#173f3f] sm:px-2 sm:text-[10px]">
                  {count || tab.emptyText}
                </span>
              </span>
              <span
                className={`mt-1 block truncate font-bold ${
                  isCompact ? "text-[9px]" : "text-[10px] sm:text-xs"
                } ${
                  activeTab === tab.label ? "text-white/80" : "text-[#526260]"
                }`}
              >
                {tab.helper}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "Floor Plans" && (
        <CompareFloorPlanTab
          rows={compareFloorPlanRows}
          formatBedroomLabel={formatBedroomLabel}
          isCompact={isCompact}
          onRemove={onRemoveFloorPlan}
        />
      )}

      {activeTab === "Properties" && (
        <ComparePropertiesTab
          rows={propertyCompareRows}
          getSearchDealScore={getSearchDealScore}
          isCompact={isCompact}
          isMobileModal={isMobileModal}
          onRemove={onRemoveProperty}
        />
      )}

      {activeTab === "Details" && (
        <CompareDetailsTab
          rows={compareDetailRows}
          mode={compareDetailMode}
          isCompact={isCompact}
        />
      )}
    </div>
  );
}

function CompareMetric({ label, value }) {
  return (
    <div className="mt-2 border-t border-[#d7e6df] pt-2 sm:mt-3 sm:pt-3">
      <p className="text-[10px] font-black uppercase text-[#526260]">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-[#102426] sm:text-sm">{value}</p>
    </div>
  );
}

function CompareFloorPlanTab({ rows, formatBedroomLabel, isCompact, onRemove }) {
  if (rows.length === 0) {
    return (
      <CompareEmptyState text="No floor plans selected yet. Open a property and tap Compare Floor Plan on the layouts you want to compare." />
    );
  }

  return (
    <div className={isCompact ? "mt-3 grid gap-2" : "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"}>
      {rows.map((row) => (
        <div
          key={row.compareKey}
          className={
            isCompact
              ? "rounded-xl bg-white p-3 ring-1 ring-[#d7e6df]"
              : "rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]"
          }
        >
          <div className={isCompact ? "flex gap-2.5" : "flex gap-3"}>
            <img
              src={row.image || getPropertyPrimaryImage(row.property || {})}
              alt={`${row.floorPlanName} floor plan`}
              className={`${isCompact ? "h-16 w-20" : "h-20 w-24"} shrink-0 rounded-xl bg-white object-cover ring-1 ring-[#d7e6df]`}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`${isCompact ? "text-sm" : "text-sm"} truncate font-black text-[#102426]`}>
                    {row.floorPlanName}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-[#526260]">
                    {row.propertyName}
                  </p>
                </div>

                {!isCompact && (
                  <button
                    type="button"
                    onClick={() => onRemove(row)}
                    className="shrink-0 rounded-full border border-[#f2b84b] bg-[#b42318] px-3 py-1 text-xs font-black !text-white hover:bg-[#8f1d15] hover:!text-white"
                  >
                    Remove
                  </button>
                )}
              </div>

              <p className={`${isCompact ? "mt-1 line-clamp-2 leading-4" : "mt-2"} text-xs font-semibold text-[#526260]`}>
                {formatBedroomLabel(row.beds, row.floorPlanName)} • {row.baths || "Baths not listed"} ba •{" "}
                {row.sqft || "Sq ft not listed"} sq ft
              </p>
            </div>
          </div>

          <div className={`${isCompact ? "mt-2" : "mt-3"} grid grid-cols-2 gap-2`}>
            <CompareTile label="Starting" value={row.rent || "Contact"} isCompact={isCompact} />
            <CompareTile
              label="Effective"
              value={row.effectiveRent || row.rent || "Contact"}
              highlight
              isCompact={isCompact}
            />
          </div>

          <div className={`${isCompact ? "mt-2 rounded-lg bg-[#fff8e6] px-2.5 py-2 ring-1 ring-[#f2d08a]" : ""}`}>
            <p className={`${isCompact ? "line-clamp-2 leading-4" : "truncate"} text-xs font-black text-[#8a5b0a]`}>
              {row.special || "No special listed"}
            </p>
            {isCompact && (
              <p className="mt-0.5 truncate text-[11px] font-bold text-[#526260]">
                {formatAvailabilityLabel(row.available) || "Availability not listed"}
              </p>
            )}
          </div>

          <div className={`${isCompact ? "mt-2 grid grid-cols-2 gap-2" : "mt-3 grid gap-2 sm:grid-cols-2"}`}>
            <Link
              to={`/properties/${row.propertyId}`}
              className="rounded-xl bg-[#173f3f] px-3 py-2 text-center text-xs font-black text-white hover:bg-[#102426]"
            >
              View property
            </Link>
            {isCompact ? (
              <button
                type="button"
                onClick={() => onRemove(row)}
                className="rounded-xl border border-[#f2b84b] bg-[#b42318] px-3 py-2 text-center text-xs font-black !text-white hover:bg-[#8f1d15] hover:!text-white"
              >
                Remove
              </button>
            ) : (
              <span className="rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df]">
                {formatAvailabilityLabel(row.available) || "Availability not listed"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComparePropertiesTab({
  rows,
  getSearchDealScore,
  isCompact,
  isMobileModal,
  onRemove,
}) {
  if (rows.length === 0) {
    return <CompareEmptyState text="No properties selected yet. Tap Compare on properties you want to save side by side." />;
  }

  if (isMobileModal) {
    return (
      <div className="mt-4 grid gap-2">
        {rows.map(({ property, priceSummary }) => (
          <div
            key={property.id}
            className="rounded-2xl bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df]"
          >
            <Link
              to={`/properties/${property.id}`}
              className="flex min-w-0 gap-3 hover:opacity-90"
            >
              <img
                alt={property.name}
                loading="lazy"
                decoding="async"
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
                src={getPropertyPrimaryImage(property)}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-[#102426]">
                  {property.name}
                </span>
                <span className="mt-1 block truncate text-xs font-semibold text-[#526260]">
                  {property.area || property.neighborhood || property.city || "Dallas"}
                </span>
                <span className="mt-1 block truncate text-xs font-bold text-[#8a5b0a]">
                  {priceSummary.specialLabel || "No special listed"}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => onRemove(property.id)}
              className="mt-3 w-full rounded-xl border border-[#f2b84b] bg-[#b42318] px-3 py-2 text-xs font-black !text-white hover:bg-[#8f1d15] hover:!text-white"
            >
              Remove from compare
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className={isCompact ? "grid gap-2" : "grid gap-2 sm:grid-cols-2 lg:grid-cols-4"}>
        {rows.map(({ property, priceSummary }) => (
          <div
            key={property.id}
            className={
              isCompact
                ? "min-w-0 rounded-xl bg-white p-3 ring-1 ring-[#d7e6df]"
                : "min-w-0 rounded-2xl bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df] sm:p-4"
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="min-w-0 truncate text-sm font-black text-[#102426]">
                  {property.name}
                </p>
                {isCompact && (
                  <p className="mt-0.5 text-[11px] font-black text-[#1f6f63]">
                    Deal score {getSearchDealScore(property, priceSummary)}/100
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(property.id)}
                className="shrink-0 rounded-full border border-[#f2b84b] bg-[#b42318] px-2 py-1 text-[10px] font-black !text-white hover:bg-[#8f1d15] hover:!text-white sm:px-3 sm:text-xs"
              >
                Remove
              </button>
            </div>
            {!isCompact && (
              <CompareMetric
                label="Deal score"
                value={`${getSearchDealScore(property, priceSummary)}/100`}
              />
            )}
            <div className={isCompact ? "mt-2 grid grid-cols-2 gap-2" : ""}>
              {isCompact ? (
                <>
                  <CompareTile label="Effective" value={priceSummary.effectiveRentLabel} highlight isCompact />
                  <CompareTile label="Normal" value={priceSummary.normalRentLabel} isCompact />
                </>
              ) : (
                <>
                  <CompareMetric label="Effective" value={priceSummary.effectiveRentLabel} />
                  <CompareMetric label="Normal" value={priceSummary.normalRentLabel} />
                  <CompareMetric
                    label="Special"
                    value={priceSummary.specialLabel || "None listed"}
                  />
                </>
              )}
            </div>
            {isCompact && (
              <p className="mt-2 line-clamp-2 rounded-lg bg-[#fff8e6] px-2.5 py-2 text-xs font-black leading-4 text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                {priceSummary.specialLabel || "No special listed"}
              </p>
            )}
            <Link
              to={getFloorPlansRoute(property.id)}
              onClick={rememberFloorPlanSectionTarget}
              className="mt-3 block rounded-xl bg-[#173f3f] px-3 py-2 text-center text-xs font-black text-white hover:bg-[#102426] sm:mt-4 sm:py-2.5"
            >
              View floor plans
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareDetailsTab({ rows, mode, isCompact }) {
  if (rows.length === 0) {
    return <CompareEmptyState text="Choose floor plans or properties to compare exact details." />;
  }

  return (
    <>
      <p
        className={
          isCompact
            ? "mt-3 rounded-xl bg-[#fff8e6] px-3 py-2 text-xs font-bold leading-5 text-[#8a5b0a] ring-1 ring-[#f2d08a]"
            : "mt-4 rounded-2xl bg-[#fff8e6] px-4 py-3 text-sm font-bold leading-6 text-[#8a5b0a] ring-1 ring-[#f2d08a]"
        }
      >
        {mode === "floorPlans"
          ? "Details is comparing exact floor plans for the clearest rent, size, and special comparison."
          : "For the most accurate comparison, choose floor plans from each property. Until then, Details compares the selected properties."}
      </p>

      {isCompact && (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl bg-white p-3 ring-1 ring-[#d7e6df]">
              <div className="flex gap-2.5">
                <img
                  src={row.image}
                  alt={`${row.title} ${row.type.toLowerCase()} preview`}
                  className="h-16 w-20 shrink-0 rounded-xl bg-[#f5f8f1] object-cover ring-1 ring-[#d7e6df]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#102426]">
                    {row.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-[#526260]">
                    {row.propertyName}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-[#526260]">
                    {row.beds} • {row.baths} • {row.sqft}
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <CompareTile label="Normal" value={row.normalRent} isCompact />
                <CompareTile label="Effective" value={row.effectiveRent} highlight isCompact />
              </div>

              <p className="mt-2 line-clamp-2 rounded-lg bg-[#fff8e6] px-2.5 py-2 text-xs font-black leading-4 text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                {row.special}
              </p>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <p className="rounded-xl bg-[#f5f8f1] px-3 py-2 text-center text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df]">
                  {formatAvailabilityLabel(row.availability) || "Availability not listed"}
                </p>
                <Link
                  to={row.linkTo}
                  onClick={rememberFloorPlanSectionTarget}
                  className="rounded-xl bg-[#173f3f] px-3 py-2 text-center text-xs font-black text-white hover:bg-[#102426]"
                >
                  {row.actionLabel || "View"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isCompact && (
      <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-[#d7e6df]">
        <table className="min-w-[960px] w-full border-collapse bg-white text-left text-sm">
          <thead className="bg-[#173f3f] text-white">
            <tr>
              {[
                "Option",
                "Type",
                "Beds",
                "Sq ft",
                "Normal",
                "Effective",
                "Special",
                "Availability",
                "Action",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 text-xs font-black uppercase">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-[#f5f8f1]"}>
                <td className="px-4 py-4 align-top">
                  <div className="flex min-w-[240px] items-center gap-3">
                    <img
                      src={row.image}
                      alt={`${row.title} ${row.type.toLowerCase()} preview`}
                      className="h-16 w-20 shrink-0 rounded-xl bg-[#f5f8f1] object-cover ring-1 ring-[#d7e6df]"
                    />
                    <div className="min-w-0">
                      <p className="max-w-[160px] truncate font-black text-[#102426]">
                        {row.title}
                      </p>
                      <p className="mt-1 max-w-[160px] truncate text-xs font-bold text-[#526260]">
                        {row.propertyName}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-xs font-black uppercase text-[#1f6f63]">
                  {row.type}
                </td>
                <td className="px-4 py-4 align-top font-bold text-[#102426]">
                  {row.beds}
                  <span className="block text-xs font-semibold text-[#526260]">
                    {row.baths}
                  </span>
                </td>
                <td className="px-4 py-4 align-top font-bold text-[#102426]">{row.sqft}</td>
                <td className="px-4 py-4 align-top font-bold text-[#102426]">{row.normalRent}</td>
                <td className="px-4 py-4 align-top font-black text-[#1f6f63]">{row.effectiveRent}</td>
                <td className="max-w-[210px] px-4 py-4 align-top text-xs font-bold text-[#8a5b0a]">
                  {row.special}
                </td>
                <td className="max-w-[160px] px-4 py-4 align-top text-xs font-semibold text-[#526260]">
                  {row.availabilityLink ? (
                    <Link
                      to={row.availabilityLink}
                      onClick={rememberFloorPlanSectionTarget}
                      className="font-black text-[#173f3f] underline decoration-[#f2b84b] decoration-2 underline-offset-4 hover:text-[#1f6f63]"
                    >
                      {formatAvailabilityLabel(row.availability) || "Availability not listed"}
                    </Link>
                  ) : (
                    formatAvailabilityLabel(row.availability) || "Availability not listed"
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  <Link
                    to={row.linkTo}
                    onClick={rememberFloorPlanSectionTarget}
                    className="inline-flex rounded-xl bg-[#173f3f] px-3 py-2 text-xs font-black text-white hover:bg-[#102426]"
                  >
                    {row.actionLabel || "View"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </>
  );
}

function CompareTile({ label, value, highlight = false, isCompact = false }) {
  return (
    <div
      className={`rounded-xl ${isCompact ? "px-2.5 py-2" : "px-3 py-2"} ${
        highlight
          ? "bg-[#e7f3ee] text-[#1f6f63]"
          : "bg-white text-[#173f3f] ring-1 ring-[#d7e6df]"
      }`}
    >
      <p className="text-[10px] font-black uppercase">{label}</p>
      <p className={`${isCompact ? "mt-0.5 text-xs" : "mt-1 text-sm"} truncate font-black`}>{value}</p>
    </div>
  );
}

function CompareEmptyState({ text }) {
  return (
    <p className="mt-4 rounded-2xl bg-[#f5f8f1] p-4 text-sm font-semibold text-[#526260] ring-1 ring-[#d7e6df]">
      {text}
    </p>
  );
}
