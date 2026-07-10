import { ArrowRight, BadgeCheck, ChevronDown, ChevronUp, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getPropertyPrimaryImage } from "../../data/propertySearchData";
import { formatAvailability as formatAvailabilityLabel } from "../../utils/displayFormatters";

const COMPARE_TABS = [
  {
    label: "Properties",
    helper: "Communities saved",
    emptyText: "Start here",
  },
  {
    label: "Floor Plans",
    helper: "Exact picks",
    emptyText: "Add layouts",
  },
  {
    label: "Details",
    helper: "Decision chart",
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
  onBeforeFloorPlanNavigation,
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
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
            className="inline-flex min-w-max flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#f4b6aa] bg-[#fff0ea]/80 px-2.5 py-1.5 text-[11px] font-black !text-[#b42318] hover:bg-[#fde1d9] hover:!text-[#8f1d15]"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Clear all</span>
          </button>
        </div>
      )}

      <CompareDecisionSummary
        rows={compareDetailRows}
        floorPlanCount={compareFloorPlanRows.length}
        propertyCount={propertyCompareRows.length}
        isCompact={isCompact}
        onBeforeFloorPlanNavigation={onBeforeFloorPlanNavigation}
      />

      <div className={`${isCompact ? "grid grid-cols-3 gap-1" : "mt-4 grid grid-cols-3 gap-1.5 sm:gap-2"}`}>
        {COMPARE_TABS.map((tab) => {
          const count =
            tab.label === "Floor Plans"
              ? compareFloorPlanRows.length
              : tab.label === "Properties"
                ? propertyCompareRows.length
                : compareDetailRows.length;

          const helperText = count > 0 ? tab.helper : tab.emptyText;
          const mobileLabel = tab.label === "Floor Plans" ? "Plans" : tab.label;

          return (
            <button
              key={tab.label}
              type="button"
              aria-pressed={activeTab === tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`min-w-0 overflow-hidden text-center font-black ring-1 transition sm:text-left ${
                isCompact
                  ? "rounded-lg px-1 py-1.5"
                  : "rounded-2xl px-2.5 py-2 sm:px-3 sm:py-2.5"
              } ${
                activeTab === tab.label
                  ? "bg-[#173f3f] text-white"
                  : "bg-[#f5f8f1] text-[#173f3f] ring-[#d7e6df] hover:bg-[#d7e6df]"
              }`}
            >
              <span className={isCompact ? "grid min-w-0 justify-items-center gap-0.5" : "grid min-w-0 justify-items-center gap-0.5 sm:justify-items-stretch sm:gap-1"}>
                <span className={isCompact ? "grid min-w-0 justify-items-center gap-0.5" : "grid min-w-0 justify-items-center gap-0.5 sm:flex sm:items-center sm:justify-between sm:gap-1.5"}>
                  <span
                    className={`min-w-0 max-w-full truncate font-black leading-tight ${
                      isCompact ? "text-[10px]" : "text-[11px] sm:text-sm"
                    } ${activeTab === tab.label ? "text-white" : "text-[#173f3f]"}`}
                  >
                    {mobileLabel}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white/85 font-black text-[#173f3f] ${
                      isCompact ? "h-4 min-w-4 px-1 text-[8px]" : "h-4 min-w-4 px-1.5 text-[9px] sm:h-5 sm:min-w-5 sm:px-2 sm:text-[10px]"
                    }`}
                  >
                    {count}
                  </span>
                </span>
                <span
                  className={`block min-w-0 max-w-full truncate font-bold leading-tight ${
                    isCompact ? "text-[8px]" : "text-[9px] sm:text-[11px]"
                  } ${activeTab === tab.label ? "text-white/80" : "text-[#526260]"}`}
                >
                  {helperText}
                </span>
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
          onBeforeFloorPlanNavigation={onBeforeFloorPlanNavigation}
          onRemove={onRemoveProperty}
        />
      )}

      {activeTab === "Details" && (
        <CompareDetailsTab
          rows={compareDetailRows}
          mode={compareDetailMode}
          isCompact={isCompact}
          onBeforeFloorPlanNavigation={onBeforeFloorPlanNavigation}
        />
      )}
    </div>
  );
}

function CompareDecisionSummary({
  rows,
  floorPlanCount,
  propertyCount,
  isCompact,
  onBeforeFloorPlanNavigation,
}) {
  const [isLocatorPickExpanded, setIsLocatorPickExpanded] = useState(false);

  if (rows.length === 0) return null;

  const lowestRentRow = rows
    .map((row) => ({
      ...row,
      rentNumber: parseCompareMoney(row.effectiveRent || row.normalRent),
    }))
    .filter((row) => row.rentNumber > 0)
    .sort((firstRow, secondRow) => firstRow.rentNumber - secondRow.rentNumber)[0];
  const bestValueRow = rows
    .filter(isCompareFloorPlanRow)
    .map((row) => {
      const rentNumber = parseCompareMoney(row.effectiveRent || row.normalRent);
      const sqftNumber = parseCompareNumber(row.sqft);

      if (!(rentNumber > 0 && sqftNumber > 0)) return null;

      return {
        ...row,
        rentNumber,
        sqftNumber,
        rentPerSqft: rentNumber / sqftNumber,
      };
    })
    .filter(Boolean)
    .sort((firstRow, secondRow) => firstRow.rentPerSqft - secondRow.rentPerSqft)[0];
  const bestSpecialRow = rows.find((row) => isMeaningfulCompareSpecial(row.special));
  const selectedCount = floorPlanCount + propertyCount;
  const selectedSummary =
    floorPlanCount +
    " floor plan" +
    (floorPlanCount === 1 ? "" : "s") +
    " • " +
    propertyCount +
    " propert" +
    (propertyCount === 1 ? "y" : "ies");
  const hasLocatorPick = Boolean(bestValueRow);
  const locatorPickRow = bestValueRow || lowestRentRow || bestSpecialRow || rows[0];
  const locatorPickLink = locatorPickRow?.linkTo || "/properties";
  const locatorPickTitle = hasLocatorPick
    ? getCompareOptionTitle(locatorPickRow)
    : "Add floor plans to unlock locator pick";
  const locatorPickDescription = hasLocatorPick
    ? "Best first option based on after-special rent, value per square foot, and current special."
    : "Exact floor plans let BMA compare rent, size, and savings like a locator would.";
  const locatorPickChips = hasLocatorPick
    ? [
        {
          label: "After special",
          value: locatorPickRow.effectiveRent || locatorPickRow.normalRent || "Verify",
        },
        {
          label: "Value",
          value: "$" + locatorPickRow.rentPerSqft.toFixed(2) + "/sq ft",
        },
        {
          label: "Layout",
          value: [locatorPickRow.beds, locatorPickRow.sqft].filter(Boolean).join(" • "),
        },
        isMeaningfulCompareSpecial(locatorPickRow.special)
          ? {
              label: "Special",
              value: locatorPickRow.special,
            }
          : null,
      ].filter(Boolean)
    : [
        {
          label: "Selected",
          value: selectedSummary,
        },
        {
          label: "Next step",
          value: "Choose exact layouts",
        },
      ];
  const visibleLocatorPickChips = isLocatorPickExpanded
    ? locatorPickChips
    : locatorPickChips.slice(0, 3);
  const standOutItems = hasLocatorPick
    ? [
        {
          label: "Best value per sq ft",
          text: "$" + locatorPickRow.rentPerSqft.toFixed(2) + " per sq ft among selected plans.",
        },
        isMeaningfulCompareSpecial(locatorPickRow.special)
          ? {
              label: "Current special",
              text: locatorPickRow.special,
            }
          : bestSpecialRow
            ? {
                label: "Strongest special",
                text: bestSpecialRow.special,
              }
            : null,
        lowestRentRow
          ? {
              label: "Lowest after-special rent",
              text: lowestRentRow.effectiveRent || lowestRentRow.normalRent || "Verify pricing",
            }
          : null,
      ].filter(Boolean)
    : [
        {
          label: "Needs exact floor plans",
          text: "Pick a layout so BMA can compare real rent, size, and specials.",
        },
        bestSpecialRow
          ? {
              label: "Strongest special so far",
              text: bestSpecialRow.special,
            }
          : null,
      ].filter(Boolean);
  return (
    <section
      className={
        isCompact
          ? "mt-2 overflow-hidden rounded-xl bg-white ring-1 ring-[#d7e6df]"
          : "mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#d7e6df]"
      }
    >
      <div
        className={
          isCompact
            ? "flex items-center justify-between gap-2 bg-[#173f3f] px-3 py-2"
            : "flex items-center justify-between gap-3 bg-[#173f3f] px-4 py-3"
        }
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={isCompact ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f2b84b]" : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2b84b]"}>
            <Sparkles className={isCompact ? "h-3.5 w-3.5 text-[#102426]" : "h-4 w-4 text-[#102426]"} />
          </span>
          <div className="min-w-0">
            <p className={isCompact ? "text-sm font-black text-white" : "text-lg font-black text-white"}>
              Locator pick
            </p>
            <p className={isCompact ? "truncate text-[10px] font-bold text-white/75" : "truncate text-xs font-bold text-white/75"}>
              {selectedCount} selected • {selectedSummary}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!isCompact && (
            <span className="shrink-0 rounded-full bg-[#f2b84b] px-3 py-1.5 text-xs font-black text-[#102426]">
              Best first option
            </span>
          )}
          <button
            type="button"
            aria-expanded={isLocatorPickExpanded}
            onClick={() => setIsLocatorPickExpanded((isExpanded) => !isExpanded)}
            className={isCompact ? "inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black text-white ring-1 ring-white/20 hover:bg-white/15" : "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white ring-1 ring-white/20 hover:bg-white/15"}
          >
            <span>{isLocatorPickExpanded ? "Show less" : "Why this pick?"}</span>
            {isLocatorPickExpanded ? (
              <ChevronUp className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
            ) : (
              <ChevronDown className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
            )}
          </button>
        </div>
      </div>

      <div
        className={
          isCompact
            ? "grid gap-3 p-3"
            : isLocatorPickExpanded
              ? "grid gap-4 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]"
              : "p-4"
        }
      >
        <div className="min-w-0">
          <h3 className={isCompact ? "text-lg font-black leading-tight text-[#102426]" : "text-2xl font-black leading-tight text-[#102426]"}>
            {locatorPickTitle}
          </h3>
          {isLocatorPickExpanded && (
            <p className={isCompact ? "mt-2 text-xs font-semibold leading-5 text-[#526260]" : "mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#526260]"}>
              {locatorPickDescription}
            </p>
          )}

          <div className={isCompact ? "mt-3 flex flex-wrap gap-1.5" : "mt-4 flex flex-wrap gap-2"}>
            {visibleLocatorPickChips.map((chip) => (
              <div
                key={chip.label}
                className={isCompact ? "rounded-lg bg-[#f5f8f1] px-2 py-1.5 ring-1 ring-[#d7e6df]" : "rounded-xl bg-[#f5f8f1] px-3 py-2 ring-1 ring-[#d7e6df]"}
              >
                <p className={isCompact ? "text-[8px] font-black uppercase text-[#526260]" : "text-[9px] font-black uppercase text-[#526260]"}>
                  {chip.label}
                </p>
                <p className={isCompact ? "mt-0.5 max-w-[9rem] truncate text-[11px] font-black text-[#102426]" : "mt-0.5 max-w-[14rem] truncate text-sm font-black text-[#102426]"}>
                  {chip.value}
                </p>
              </div>
            ))}
          </div>

          {isLocatorPickExpanded && (
            <div className={isCompact ? "mt-3 grid grid-cols-2 gap-1.5" : "mt-4 flex flex-wrap gap-2"}>
              <Link
                to={locatorPickLink}
                onClick={() => {
                  if (locatorPickLink.includes("floor-plans")) {
                    rememberFloorPlanSectionTarget();
                  }
                  onBeforeFloorPlanNavigation?.();
                }}
                className={isCompact ? "inline-flex items-center justify-center gap-1 rounded-lg bg-[#173f3f] px-3 py-2 text-[11px] font-black !text-white hover:bg-[#102426] hover:!text-white" : "inline-flex items-center justify-center gap-2 rounded-xl bg-[#173f3f] px-4 py-2.5 text-sm font-black !text-white hover:bg-[#102426] hover:!text-white"}
              >
                <span>{hasLocatorPick ? "View floor plan" : "Add floor plan"}</span>
                <ArrowRight className={isCompact ? "h-3 w-3" : "h-4 w-4"} />
              </Link>
              <Link
                to="/start"
                className={isCompact ? "inline-flex items-center justify-center rounded-lg bg-[#f2b84b] px-3 py-2 text-[11px] font-black text-[#102426] hover:bg-[#dca33c]" : "inline-flex items-center justify-center rounded-xl bg-[#f2b84b] px-4 py-2.5 text-sm font-black text-[#102426] hover:bg-[#dca33c]"}
              >
                Request tour
              </Link>
            </div>
          )}
        </div>

        {isLocatorPickExpanded && (
          <div className={isCompact ? "rounded-xl bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df]" : "rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]"}>
            <p className={isCompact ? "text-xs font-black text-[#102426]" : "text-sm font-black text-[#102426]"}>
              Why this stands out
            </p>
            <div className={isCompact ? "mt-2 grid gap-2" : "mt-3 grid gap-3"}>
              {standOutItems.slice(0, 3).map((item) => (
                <div key={item.label} className="flex gap-2">
                  <BadgeCheck className={isCompact ? "mt-0.5 h-4 w-4 shrink-0 text-[#1f6f63]" : "mt-0.5 h-5 w-5 shrink-0 text-[#1f6f63]"} />
                  <div className="min-w-0">
                    <p className={isCompact ? "text-[11px] font-black text-[#173f3f]" : "text-sm font-black text-[#173f3f]"}>
                      {item.label}
                    </p>
                    <p className={isCompact ? "mt-0.5 line-clamp-2 text-[10px] font-semibold leading-4 text-[#526260]" : "mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#526260]"}>
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function getCompareOptionTitle(row) {
  if (!row) return "Selected option";

  return [row.title, row.propertyName ? "at " + row.propertyName : ""]
    .filter(Boolean)
    .join(" ");
}
function CompareFloorPlanTab({ rows, formatBedroomLabel, isCompact, onRemove }) {
  if (rows.length === 0) {
    return (
      <CompareEmptyState text="No floor plans selected yet. Open a property and tap Compare Floor Plan on the layouts you want to compare." />
    );
  }

  return (
    <div className={isCompact ? "mt-2.5 grid gap-1.5" : "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"}>
      {rows.map((row) => (
        <div
          key={row.compareKey}
          className={
            isCompact
              ? "rounded-xl bg-white p-2.5 ring-1 ring-[#d7e6df]"
              : "rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]"
          }
        >
          <div className={isCompact ? "flex gap-2" : "flex gap-3"}>
            <img
              src={row.image || getPropertyPrimaryImage(row.property || {})}
              alt={`${row.floorPlanName} floor plan`}
              className={`${isCompact ? "h-14 w-16 rounded-lg" : "h-20 w-24 rounded-xl"} shrink-0 bg-white object-cover ring-1 ring-[#d7e6df]`}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`${isCompact ? "text-xs" : "text-sm"} truncate font-black text-[#102426]`}>
                    {row.floorPlanName}
                  </p>
                  <p className={`${isCompact ? "text-[11px]" : "text-xs"} mt-0.5 truncate font-bold text-[#526260]`}>
                    {row.propertyName}
                  </p>
                </div>

                {!isCompact && (
                  <button
                    type="button"
                    onClick={() => onRemove(row)}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#f4b6aa] bg-[#fff0ea]/80 px-3 py-1 text-xs font-black !text-[#b42318] hover:bg-[#fde1d9] hover:!text-[#8f1d15]"
                  >
                    <Trash2 className="h-3 w-3 shrink-0" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              <p className={`${isCompact ? "mt-0.5 line-clamp-1 text-[11px] leading-4" : "mt-2 text-xs"} font-semibold text-[#526260]`}>
                {formatBedroomLabel(row.beds, row.floorPlanName)} • {row.baths || "Baths not listed"} ba •{" "}
                {row.sqft || "Sq ft not listed"} sq ft
              </p>
            </div>
          </div>

          <div className={`${isCompact ? "mt-1.5 gap-1.5" : "mt-3 gap-2"} grid grid-cols-2`}>
            <CompareTile label="Listed" value={row.rent || "Contact"} isCompact={isCompact} />
            <CompareTile
              label="Estimated"
              value={row.effectiveRent || row.rent || "Contact"}
              highlight
              isCompact={isCompact}
            />
          </div>

          <div className={`${isCompact ? "mt-1.5 rounded-lg bg-[#fff8e6] px-2 py-1.5 ring-1 ring-[#f2d08a]" : ""}`}>
            <p className={`${isCompact ? "line-clamp-1 text-[11px] leading-4" : "truncate text-xs"} font-black text-[#8a5b0a]`}>
              {row.special || "No special listed"}
            </p>
            {isCompact && (
              <p className="mt-0.5 truncate text-[10px] font-bold text-[#526260]">
                {formatAvailabilityLabel(row.available) || "Availability not listed"}
              </p>
            )}
          </div>

          <div className={`${isCompact ? "mt-1.5 grid grid-cols-2 gap-1.5" : "mt-3 grid gap-2 sm:grid-cols-2"}`}>
            <Link
              to={`/properties/${row.propertyId}`}
              className={`${isCompact ? "rounded-lg px-2 py-1.5 text-[11px]" : "rounded-xl px-3 py-2 text-xs"} bg-[#173f3f] text-center font-black text-white hover:bg-[#102426]`}
            >
              View property
            </Link>
            {isCompact ? (
              <button
                type="button"
                onClick={() => onRemove(row)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#f4b6aa] bg-[#fff0ea]/80 px-2 py-1.5 text-center text-[11px] font-black !text-[#b42318] hover:bg-[#fde1d9] hover:!text-[#8f1d15]"
              >
                <Trash2 className="h-3 w-3 shrink-0" />
                <span>Remove</span>
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
  onBeforeFloorPlanNavigation,
  onRemove,
}) {
  if (rows.length === 0) {
    return <CompareEmptyState text="No properties selected yet. Tap Compare on properties you want to save side by side." />;
  }

  const isSmallCard = isCompact || isMobileModal;

  return (
    <div className={isSmallCard ? "mt-2.5" : "mt-4"}>
      <div className={isSmallCard ? "grid gap-2" : "grid gap-3 md:grid-cols-2 xl:grid-cols-3"}>
        {rows.map(({ property, priceSummary }) => {
          const floorPlanCount = property.floorPlanCount || 0;
          const hasFloorPlans = floorPlanCount > 0;
          const propertyLocation =
            property.area || property.neighborhood || property.city || "Dallas area";
          const actionButtonClass = `${isSmallCard ? "rounded-lg px-2 py-1.5 text-[11px]" : "rounded-xl px-3 py-2 text-xs"} flex min-h-9 items-center justify-center whitespace-nowrap text-center font-black leading-none`;
          const floorPlanLabel = `${floorPlanCount} floor plan${floorPlanCount === 1 ? "" : "s"} added`;

          return (
            <div
              key={property.id}
              className={
                isSmallCard
                  ? "min-w-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-[#d7e6df]"
                  : "min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#d7e6df]"
              }
            >
              <div className={isSmallCard ? "grid grid-cols-[72px_minmax(0,1fr)] gap-2 p-2.5" : "grid grid-cols-[96px_minmax(0,1fr)] gap-3 p-3"}>
                <img
                  alt={property.name}
                  loading="lazy"
                  decoding="async"
                  className={`${isSmallCard ? "h-[72px] w-[72px] rounded-lg" : "h-24 w-24 rounded-xl"} bg-[#f5f8f1] object-cover ring-1 ring-[#d7e6df]`}
                  src={getPropertyPrimaryImage(property)}
                />

                <div className="grid min-w-0 grid-rows-[auto_1fr_auto]">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`${isSmallCard ? "text-xs" : "text-sm"} truncate font-black text-[#102426]`}>
                        {property.name}
                      </p>
                      <p className={`${isSmallCard ? "text-[11px]" : "text-xs"} mt-0.5 truncate font-bold text-[#526260]`}>
                        {propertyLocation}
                      </p>
                    </div>

                    {!hasFloorPlans && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="rounded-full bg-[#fff8e6] px-2 py-0.5 text-[9px] font-black text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                          Property only
                        </span>
                      </div>
                    )}
                  </div>

                  <p className={`${isSmallCard ? "mt-1 line-clamp-1 text-[11px]" : "mt-2 line-clamp-2 text-xs"} font-black leading-4 text-[#8a5b0a]`}>
                    {priceSummary.specialLabel || "No special listed"}
                  </p>
                </div>
              </div>

              <div className={`${isSmallCard ? "grid-cols-2 gap-1.5 px-2.5 pb-2.5" : "grid-cols-2 gap-2 px-3 pb-3"} grid`}>
                <CompareTile
                  label="After special"
                  value={priceSummary.effectiveRentLabel}
                  highlight
                  isCompact={isSmallCard}
                />
                <CompareTile
                  label="Listed"
                  value={priceSummary.normalRentLabel}
                  isCompact={isSmallCard}
                />
              </div>

              {hasFloorPlans ? (
                <div className={`${isSmallCard ? "mx-2.5 mb-2 rounded-lg px-2 py-1.5" : "mx-3 mb-3 rounded-xl px-3 py-2"} bg-[#e7f3ee] ring-1 ring-[#a9cfc2]`}>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1f6f63] text-[9px] font-black !text-white">
                      ✓
                    </span>
                    <span className="min-w-0">
                      <span className={`${isSmallCard ? "text-[11px]" : "text-xs"} block font-black text-[#1f6f63]`}>
                        {floorPlanLabel}
                      </span>
                      <span className={`${isSmallCard ? "text-[10px]" : "text-[11px]"} mt-0.5 block font-bold leading-4 text-[#526260]`}>
                        See exact layout in Floor Plans.
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <p className={`${isSmallCard ? "mx-2.5 mb-2 rounded-lg px-2 py-1.5 text-[10px] leading-4" : "mx-3 mb-3 rounded-xl px-3 py-2 text-xs leading-5"} bg-[#fff8e6] font-bold text-[#8a5b0a] ring-1 ring-[#f2d08a]`}>
                  Add a floor plan for exact rent, size, and savings.
                </p>
              )}
              <div className={`${isSmallCard ? "grid-cols-2 gap-1.5 px-2.5 py-2.5" : "grid-cols-2 gap-2 px-3 py-3"} grid border-t border-[#edf4ef] bg-[#f5f8f1]`}>
                <Link
                  to={getFloorPlansRoute(property.id)}
                  onClick={() => {
                    rememberFloorPlanSectionTarget();
                    onBeforeFloorPlanNavigation?.();
                  }}
                  className={`${actionButtonClass} border border-[#173f3f] bg-[#173f3f] !text-white hover:bg-[#102426] hover:!text-white`}
                >
                  {hasFloorPlans ? "Add another plan" : "Add floor plan"}
                </Link>
                <button
                  type="button"
                  onClick={() => onRemove(property.id)}
                  className={`${actionButtonClass} gap-1.5 border border-[#f4b6aa] bg-[#fff0ea]/80 !text-[#b42318] hover:bg-[#fde1d9] hover:!text-[#8f1d15]`}
                >
                  <Trash2 className="h-3 w-3 shrink-0" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareDetailsTab({ rows, mode, isCompact, onBeforeFloorPlanNavigation }) {
  if (rows.length === 0) {
    return <CompareEmptyState text="Choose floor plans or properties to compare exact details." />;
  }

  return (
    <>
      <div
        className={
          isCompact
            ? "mt-2 rounded-lg bg-[#fff8e6] px-2.5 py-2 ring-1 ring-[#f2d08a]"
            : "mt-4 flex flex-col justify-between gap-3 rounded-2xl bg-[#fff8e6] px-4 py-3 ring-1 ring-[#f2d08a] md:flex-row md:items-center"
        }
      >
        <div className="min-w-0">
          <p className={`${isCompact ? "text-[10px]" : "text-xs"} font-black uppercase text-[#8a5b0a]`}>
            Side-by-side decision chart
          </p>
          <p className={`${isCompact ? "mt-1 text-[11px] leading-4" : "mt-1 text-sm leading-6"} font-bold text-[#8a5b0a]`}>
            {mode === "floorPlans"
              ? "Exact floor plans are compared first so rent, size, and specials line up cleanly."
              : "Choose floor plans from each property for the sharpest comparison. Until then, this compares selected properties."}
          </p>
        </div>
        <Link
          to="/start"
          className={`${isCompact ? "mt-2 rounded-lg px-3 py-2 text-[11px]" : "rounded-xl px-4 py-2.5 text-sm"} shrink-0 bg-[#f2b84b] text-center font-black text-[#102426] hover:bg-[#dca33c]`}
        >
          Ask a locator to verify
        </Link>
      </div>

      {isCompact && (
        <div className="mt-2.5 grid gap-1.5">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl bg-white p-2.5 ring-1 ring-[#d7e6df]">
              <div className="flex gap-2">
                <img
                  src={row.image}
                  alt={`${row.title} ${row.type.toLowerCase()} preview`}
                  className="h-20 w-24 shrink-0 rounded-lg bg-[#f5f8f1] object-cover ring-1 ring-[#d7e6df]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-[#102426]">
                    {row.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-bold text-[#526260]">
                    {row.propertyName}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold leading-4 text-[#526260]">
                    {row.beds} • {row.baths} • {row.sqft}
                  </p>
                </div>
              </div>

              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <CompareTile label="Listed" value={row.normalRent} isCompact />
                <CompareTile label="Estimated" value={row.effectiveRent} highlight isCompact />
              </div>

              <p className="mt-1.5 line-clamp-1 rounded-lg bg-[#fff8e6] px-2 py-1.5 text-[11px] font-black leading-4 text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                {row.special}
              </p>

              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <p className="truncate rounded-lg bg-[#f5f8f1] px-2 py-1.5 text-center text-[11px] font-black text-[#173f3f] ring-1 ring-[#d7e6df]">
                  {formatAvailabilityLabel(row.availability) || "Availability not listed"}
                </p>
                <Link
                  to={row.linkTo}
                  onClick={() => {
                    rememberFloorPlanSectionTarget();
                    onBeforeFloorPlanNavigation?.();
                  }}
                  className="rounded-lg bg-[#173f3f] px-2 py-1.5 text-center text-[11px] font-black text-white hover:bg-[#102426]"
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
                "Listed",
                "Estimated",
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
                      className="h-20 w-28 shrink-0 rounded-xl bg-[#f5f8f1] object-cover ring-1 ring-[#d7e6df]"
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
                  {row.availabilityLink &&
                  formatAvailabilityLabel(row.availability) !== "Needs floor plan" ? (
                    <Link
                      to={row.availabilityLink}
                      onClick={() => {
                        rememberFloorPlanSectionTarget();
                        onBeforeFloorPlanNavigation?.();
                      }}
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
                    onClick={() => {
                      rememberFloorPlanSectionTarget();
                      onBeforeFloorPlanNavigation?.();
                    }}
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
      className={`${isCompact ? "rounded-lg px-2 py-1.5" : "rounded-xl px-3 py-2"} ${
        highlight
          ? "bg-[#e7f3ee] text-[#1f6f63]"
          : "bg-white text-[#173f3f] ring-1 ring-[#d7e6df]"
      }`}
    >
      <p className={`${isCompact ? "text-[8px]" : "text-[10px]"} font-black uppercase`}>{label}</p>
      <p className={`${isCompact ? "mt-0.5 text-[11px]" : "mt-1 text-sm"} font-black leading-tight`}>{value}</p>
    </div>
  );
}
function isCompareFloorPlanRow(row) {
  const rowType = String(row?.type || "").toLowerCase();

  return (
    rowType.includes("floor plan") ||
    Boolean(row?.floorPlanId || row?.floorPlanName)
  );
}

function parseCompareMoney(value) {
  const numericValue = String(value || "")
    .replace(/,/g, "")
    .match(/\$?\s*(\d+(?:\.\d+)?)/);

  return numericValue ? Number(numericValue[1]) : 0;
}

function parseCompareNumber(value) {
  const numericValue = String(value || "")
    .replace(/,/g, "")
    .match(/(\d+(?:\.\d+)?)/);

  return numericValue ? Number(numericValue[1]) : 0;
}

function isMeaningfulCompareSpecial(value) {
  const specialText = String(value || "").trim().toLowerCase();

  return Boolean(
    specialText &&
      specialText !== "no special listed" &&
      specialText !== "none listed" &&
      specialText !== "special not listed"
  );
}

function CompareEmptyState({ text }) {
  return (
    <p className="mt-4 rounded-2xl bg-[#f5f8f1] p-4 text-sm font-semibold text-[#526260] ring-1 ring-[#d7e6df]">
      {text}
    </p>
  );
}
