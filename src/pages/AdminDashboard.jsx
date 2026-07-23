import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Clock3,
  History,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trophy,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { getAllProperties } from "../data/propertyStorage";
import { getAllLeads, getStoredTourRequests } from "../data/leadStorage";
import { getSupabaseLeads } from "../data/supabaseLeadStorage";
import { getSupabaseLeadEvents } from "../data/supabaseLeadEvents";
import { getSupabaseTourRequests } from "../data/supabaseTourStorage";
import {
  isLocalFallbackEnabled,
  localFallbackMessage,
} from "../data/supabaseClient";

const quickActions = [
  {
    icon: Plus,
    title: "Add property",
    description: "Publish a new apartment listing.",
    to: "/admin/properties/new",
  },
  {
    icon: Users,
    title: "Manage leads",
    description: "Open the renter work queue.",
    to: "/admin/leads",
  },
  {
    icon: History,
    title: "Data history",
    description: "Review recent listing changes.",
    to: "/admin/data-history",
  },
];

export default function AdminDashboard() {
  const [properties, setProperties] = useState([]);
  const [dashboardLeads, setDashboardLeads] = useState([]);
  const [tourRequests, setTourRequests] = useState([]);
  const [leadEvents, setLeadEvents] = useState([]);
  const [loadedAt, setLoadedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const loadDashboardData = async ({ showLoading = true } = {}) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage("");

    try {
      const [leads, propertyRecords, requests, events] = await Promise.all([
        getSupabaseLeads(),
        getAllProperties(),
        getSupabaseTourRequests(),
        getSupabaseLeadEvents({ limit: 50 }),
      ]);

      setDashboardLeads(leads);
      setProperties(propertyRecords);
      setTourRequests(requests);
      setLeadEvents(events);
      setIsUsingFallback(false);
    } catch (error) {
      console.error(error);

      if (isLocalFallbackEnabled) {
        setDashboardLeads(getAllLeads());
        setProperties(await getAllProperties().catch(() => []));
        setTourRequests(getStoredTourRequests());
        setLeadEvents([]);
        setIsUsingFallback(true);
        setErrorMessage(localFallbackMessage);
      } else {
        setDashboardLeads([]);
        setProperties([]);
        setTourRequests([]);
        setLeadEvents([]);
        setIsUsingFallback(false);
        setErrorMessage("Dashboard data could not be loaded from Supabase.");
      }
    } finally {
      setLoadedAt(new Date());
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(
      () => loadDashboardData({ showLoading: false }),
      0
    );

    return () => window.clearTimeout(timer);
  }, []);

  const activeLeads = useMemo(
    () =>
      dashboardLeads
        .filter((lead) => lead.status !== "Archived")
        .sort(sortNewestFirst),
    [dashboardLeads]
  );
  const newLeads = activeLeads.filter((lead) =>
    ["New", "New Lead", "", null, undefined].includes(lead.status)
  );
  const contactedLeads = activeLeads.filter((lead) =>
    ["Contacted", "Tour Needed", "Recommendation Sent"].includes(lead.status)
  );
  const convertedLeads = activeLeads.filter(
    (lead) => lead.quality === "Converted"
  );
  const unfollowedTours = tourRequests.filter(
    (request) => (request.status || "New") !== "Followed Up"
  );
  const leadsNeedingRecommendations = activeLeads.filter(
    (lead) =>
      lead.status !== "Recommendation Sent" &&
      (lead.recommendedPropertyIds?.length || 0) === 0
  );
  const olderNewLeads = newLeads.filter(
    (lead) => getHoursSince(lead.createdAt) >= 24
  );
  const liveProperties = properties.filter(
    (property) => property.status === "Live"
  );
  const recentLeads = activeLeads.slice(0, 6);
  const tourCountByLeadId = tourRequests.reduce((counts, request) => {
    const leadId = String(request.leadId || "");
    if (leadId) counts[leadId] = (counts[leadId] || 0) + 1;
    return counts;
  }, {});
  const sourceRows = getLeadSourcePerformanceRows(
    activeLeads,
    tourCountByLeadId
  );
  const propertyInterest = properties
    .map((property) => ({
      id: property.id,
      name: property.name,
      area: property.area,
      count: activeLeads.filter((lead) =>
        lead.recommendedPropertyIds?.includes(property.id)
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);
  const recentEvents = [...leadEvents]
    .sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    )
    .slice(0, 5);

  const stats = [
    {
      icon: Sparkles,
      label: "New leads",
      value: newLeads.length,
      detail: olderNewLeads.length
        ? `${olderNewLeads.length} waiting 24+ hours`
        : "No overdue new leads",
      tone: "gold",
      to: "/admin/leads",
    },
    {
      icon: UserRoundCheck,
      label: "In progress",
      value: contactedLeads.length,
      detail: "Contacted or actively helping",
      tone: "green",
      to: "/admin/leads",
    },
    {
      icon: CalendarClock,
      label: "Tour requests",
      value: tourRequests.length,
      detail: `${unfollowedTours.length} need follow-up`,
      tone: unfollowedTours.length ? "red" : "blue",
      to: "/admin/leads?tourFilter=Not%20Followed%20Up",
    },
    {
      icon: Trophy,
      label: "Converted",
      value: convertedLeads.length,
      detail: activeLeads.length
        ? `${Math.round((convertedLeads.length / activeLeads.length) * 100)}% of active leads`
        : "No active leads yet",
      tone: "blue",
      to: "/admin/leads",
    },
  ];

  const attentionItems = [
    {
      icon: Sparkles,
      title: "New leads to contact",
      count: newLeads.length,
      description: olderNewLeads.length
        ? `${olderNewLeads.length} have been waiting longer than 24 hours.`
        : "Fresh renter requests ready for a first response.",
      to: "/admin/leads",
      urgent: olderNewLeads.length > 0,
    },
    {
      icon: CalendarClock,
      title: "Tour follow-ups",
      count: unfollowedTours.length,
      description: "Confirm dates and next steps with these renters.",
      to: "/admin/leads?tourFilter=Not%20Followed%20Up",
      urgent: unfollowedTours.length > 0,
    },
    {
      icon: Send,
      title: "Recommendations needed",
      count: leadsNeedingRecommendations.length,
      description: "Leads without a saved property recommendation.",
      to: "/admin/leads",
      urgent: false,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 text-left">
      <section className="rounded-xl border border-[#d7e6df] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase text-[#1f6f63]">
                Operations dashboard
              </p>
              <span className="rounded-full bg-[#e7f3ee] px-2.5 py-1 text-[10px] font-black text-[#173f3f]">
                {liveProperties.length} live listings
              </span>
              {isUsingFallback && (
                <span className="rounded-full bg-[#fff8e6] px-2.5 py-1 text-[10px] font-black text-[#8a5b0a]">
                  Local data
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-black leading-tight text-[#102426] sm:text-3xl">
              What needs your attention today
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#526260]">
              Contact renters, send recommendations, and keep tours moving.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadDashboardData()}
              disabled={isLoading}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#f5f8f1] px-3 py-2 text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Refreshing" : "Refresh"}
            </button>
            <Link
              to="/admin/properties/new"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#f2b84b] px-4 py-2 text-xs font-black text-[#102426] hover:bg-[#dca33c]"
            >
              <Plus className="h-4 w-4" />
              Add property
            </Link>
          </div>
        </div>

        {loadedAt && (
          <p className="mt-3 text-[10px] font-bold text-[#78908a]">
            Updated {loadedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </section>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-[#f2d08a] bg-[#fff8e6] p-4 text-sm font-bold text-[#8a5b0a]">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.55fr)]">
        <Panel
          eyebrow="Work queue"
          title="Needs attention"
          actionLabel="Open all leads"
          actionTo="/admin/leads"
        >
          <div className="grid gap-2.5">
            {attentionItems.map((item) => (
              <AttentionItem key={item.title} item={item} />
            ))}
          </div>
        </Panel>

        <Panel
          eyebrow="Newest renters"
          title="Recent leads"
          actionLabel="View all"
          actionTo="/admin/leads"
        >
          {recentLeads.length ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-[#d7e6df]">
              <div className="hidden grid-cols-[minmax(140px,1fr)_minmax(160px,1.35fr)_100px_90px_28px] gap-3 bg-[#f5f8f1] px-4 py-2.5 text-[10px] font-black uppercase text-[#526260] md:grid">
                <span>Renter</span>
                <span>Search</span>
                <span>Status</span>
                <span>Received</span>
                <span />
              </div>
              <div className="divide-y divide-[#d7e6df] bg-white">
                {recentLeads.map((lead) => (
                  <RecentLeadRow key={lead.id} lead={lead} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="No active leads yet." />
          )}
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-12">
        <Panel
          eyebrow="Pipeline"
          title="Lead progress"
          description="A clean view of how renters are moving toward a tour."
          className="xl:col-span-5"
        >
          <Pipeline
            items={[
              { label: "Active leads", value: activeLeads.length },
              {
                label: "Recommendations sent",
                value: activeLeads.filter(
                  (lead) =>
                    lead.status === "Recommendation Sent" ||
                    (lead.recommendedPropertyIds?.length || 0) > 0
                ).length,
              },
              { label: "Tours requested", value: tourRequests.length },
              { label: "Converted", value: convertedLeads.length },
            ]}
          />
        </Panel>

        <Panel
          eyebrow="Channels"
          title="Lead source performance"
          description="See which sources are producing action, not just traffic."
          className="xl:col-span-7"
        >
          {sourceRows.length ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-[#d7e6df]">
              <div className="hidden grid-cols-[minmax(0,1fr)_repeat(4,78px)] gap-2 bg-[#102426] px-4 py-2.5 text-[10px] font-black uppercase text-[#fff7df] sm:grid">
                <span>Source</span>
                <span className="text-right">Leads</span>
                <span className="text-right">Qualified</span>
                <span className="text-right">Converted</span>
                <span className="text-right">Tours</span>
              </div>
              <div className="divide-y divide-[#d7e6df]">
                {sourceRows.map((source) => (
                  <SourceRow key={source.label} source={source} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState message="Lead source data will appear here." />
          )}
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-12">
        <Panel
          eyebrow="Properties"
          title="Most recommended"
          description="Ranked by current renter recommendation activity."
          actionLabel="Manage listings"
          actionTo="/admin/properties"
          className="xl:col-span-7"
        >
          {propertyInterest.length ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {propertyInterest.map((property, index) => (
                <PropertyInterestRow
                  key={property.id}
                  property={property}
                  rank={index + 1}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="Property interest will appear after recommendations are saved." />
          )}
        </Panel>

        <Panel
          eyebrow="Recent activity"
          title="Latest renter events"
          className="xl:col-span-5"
        >
          {recentEvents.length ? (
            <div className="grid gap-2.5">
              {recentEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState message="No tracked renter events yet." />
          )}
        </Panel>
      </section>

      <Panel eyebrow="Shortcuts" title="Quick actions">
        <div className="grid gap-3 md:grid-cols-3">
          {quickActions.map((action) => (
            <QuickAction key={action.title} {...action} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone, to }) {
  const tones = {
    gold: "bg-[#fff8e6] text-[#8a5b0a] ring-[#f2d08a]",
    green: "bg-[#e7f3ee] text-[#1f6f63] ring-[#a9cfc2]",
    red: "bg-[#fff0ea] text-[#b42318] ring-[#f4b6aa]",
    blue: "bg-[#eef5ff] text-[#174a7c] ring-[#b8d9f0]",
  };

  return (
    <Link
      to={to}
      className="group min-w-0 rounded-xl border border-[#d7e6df] bg-white p-3 shadow-sm hover:border-[#a9cfc2] hover:shadow-md sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-9 sm:w-9 ${tones[tone]}`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-[#a4b3af] transition group-hover:translate-x-0.5 group-hover:text-[#173f3f]" />
      </div>
      <p className="mt-3 text-[10px] font-black uppercase text-[#526260] sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-[#102426] sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-[10px] font-bold leading-4 text-[#78908a] sm:text-xs">
        {detail}
      </p>
    </Link>
  );
}

function Panel({
  eyebrow,
  title,
  description,
  actionLabel,
  actionTo,
  className = "",
  children,
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-[#d7e6df] bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-black uppercase text-[#1f6f63]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 text-lg font-black leading-tight text-[#102426] sm:text-xl">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs font-semibold leading-5 text-[#526260] sm:text-sm">
              {description}
            </p>
          )}
        </div>
        {actionLabel && actionTo && (
          <Link
            to={actionTo}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#e7f3ee] px-2.5 py-2 text-[10px] font-black text-[#173f3f] hover:bg-[#d7e6df] sm:px-3 sm:text-xs"
          >
            {actionLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function AttentionItem({ item }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-3 ring-1 transition hover:shadow-sm ${
        item.urgent
          ? "bg-[#fff8e6] ring-[#f2d08a]"
          : "bg-[#f5f8f1] ring-[#d7e6df] hover:bg-[#e7f3ee]"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          item.urgent
            ? "bg-[#f2b84b] text-[#102426]"
            : "bg-white text-[#1f6f63]"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-[#102426]">
          {item.title}
        </span>
        <span className="mt-0.5 block text-xs font-semibold leading-4 text-[#526260]">
          {item.description}
        </span>
      </span>
      <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-white px-2 text-sm font-black text-[#173f3f] ring-1 ring-[#d7e6df]">
        {item.count}
      </span>
    </Link>
  );
}

function RecentLeadRow({ lead }) {
  return (
    <Link
      to={`/admin/leads/${lead.id}`}
      className="grid gap-2 px-4 py-3 hover:bg-[#f5f8f1] md:grid-cols-[minmax(140px,1fr)_minmax(160px,1.35fr)_100px_90px_28px] md:items-center md:gap-3"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-[#102426]">
          {lead.name || "Unnamed renter"}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-bold text-[#78908a] md:hidden">
          {formatLeadSource(lead)}
        </span>
      </span>
      <span className="line-clamp-2 text-xs font-semibold leading-4 text-[#526260]">
        {lead.preference || getLeadSearchSummary(lead)}
      </span>
      <StatusBadge status={lead.status} />
      <span className="text-xs font-bold text-[#78908a]">
        {formatRelativeTime(lead.createdAt)}
      </span>
      <ChevronRight className="hidden h-4 w-4 text-[#78908a] md:block" />
    </Link>
  );
}

function StatusBadge({ status }) {
  const normalized = status || "New Lead";
  const isNew = ["New", "New Lead"].includes(normalized);
  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${
        isNew
          ? "bg-[#fff8e6] text-[#8a5b0a] ring-1 ring-[#f2d08a]"
          : "bg-[#e7f3ee] text-[#1f6f63]"
      }`}
    >
      {normalized}
    </span>
  );
}

function Pipeline({ items }) {
  const maxValue = Math.max(...items.map((item) => Number(item.value) || 0), 1);
  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-[#526260]">{item.label}</p>
            <p className="text-sm font-black text-[#102426]">{item.value}</p>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#edf3ef]">
            <div
              className="h-full rounded-full bg-[#1f6f63]"
              style={{
                width: `${Math.max(
                  item.value ? 7 : 0,
                  Math.round(((Number(item.value) || 0) / maxValue) * 100)
                )}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceRow({ source }) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_repeat(4,78px)] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#102426]">
          {source.label}
        </p>
        <p className="text-[10px] font-bold text-[#78908a]">
          {source.share}% of active leads
        </p>
      </div>
      <SourceMetric label="Leads" value={source.leadCount} />
      <SourceMetric label="Qualified" value={source.qualifiedCount} />
      <SourceMetric label="Converted" value={source.convertedCount} />
      <SourceMetric label="Tours" value={source.tourRequestCount} />
    </div>
  );
}

function SourceMetric({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[#f5f8f1] px-2.5 py-1.5 sm:block sm:bg-transparent sm:p-0 sm:text-right">
      <span className="text-[10px] font-bold text-[#78908a] sm:hidden">
        {label}
      </span>
      <span className="text-xs font-black text-[#102426]">{value}</span>
    </div>
  );
}

function PropertyInterestRow({ property, rank }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df]">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df]">
        {rank}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-[#102426]">
          {property.name}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-bold text-[#78908a]">
          {property.area || "Dallas area"}
        </span>
      </span>
      <span className="rounded-full bg-[#e7f3ee] px-2.5 py-1 text-[10px] font-black text-[#1f6f63]">
        {property.count} {property.count === 1 ? "lead" : "leads"}
      </span>
    </div>
  );
}

function EventRow({ event }) {
  const content = (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e7f3ee] text-[#1f6f63]">
        {getEventIcon(event.eventType)}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-black text-[#102426]">
          {getEventLabel(event.eventType)}
        </span>
        <span className="mt-0.5 block truncate text-[10px] font-semibold text-[#526260]">
          {event.propertyName || formatRelativeTime(event.createdAt)}
        </span>
      </span>
    </div>
  );

  return event.leadId ? (
    <Link
      to={`/admin/leads/${event.leadId}`}
      className="rounded-xl bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
    >
      {content}
    </Link>
  ) : (
    <div className="rounded-xl bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df]">
      {content}
    </div>
  );
}

function QuickAction({ icon: Icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-[#f5f8f1] p-3 ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#1f6f63]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-[#102426]">{title}</span>
        <span className="mt-0.5 block text-xs font-semibold text-[#526260]">
          {description}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-[#78908a] group-hover:text-[#173f3f]" />
    </Link>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-[#a9cfc2] bg-[#f5f8f1] p-4 text-sm font-bold text-[#526260]">
      {message}
    </div>
  );
}

function getLeadSourcePerformanceRows(leads, tourRequestsByLeadId) {
  const rows = leads.reduce((result, lead) => {
    const source = formatLeadSource(lead);
    if (!result[source]) {
      result[source] = {
        label: source,
        leadCount: 0,
        qualifiedCount: 0,
        convertedCount: 0,
        tourRequestCount: 0,
      };
    }
    result[source].leadCount += 1;
    if (lead.quality === "Qualified") result[source].qualifiedCount += 1;
    if (lead.quality === "Converted") result[source].convertedCount += 1;
    result[source].tourRequestCount +=
      tourRequestsByLeadId[String(lead.id)] || 0;
    return result;
  }, {});

  return Object.values(rows)
    .map((source) => ({
      ...source,
      share: leads.length
        ? Math.round((source.leadCount / leads.length) * 100)
        : 0,
    }))
    .sort((a, b) => b.leadCount - a.leadCount || a.label.localeCompare(b.label));
}

function formatLeadSource(lead) {
  if (lead.source === "Google Ads" || lead.utmSource === "google") {
    return "Google Ads";
  }
  return lead.source || "Unknown";
}

function getLeadSearchSummary(lead) {
  return [lead.bedrooms, lead.budget, lead.moveIn].filter(Boolean).join(" · ") ||
    "Search details not added";
}

function sortNewestFirst(a, b) {
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

function getHoursSince(value) {
  if (!value) return 0;
  return Math.max(0, (Date.now() - new Date(value).getTime()) / 3600000);
}

function formatRelativeTime(value) {
  if (!value) return "Recently";
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function getEventLabel(eventType) {
  return {
    lead_submitted: "Lead submitted",
    recommendation_sent: "Recommendation sent",
    renter_link_opened: "Recommendation viewed",
    recommendation_page_viewed: "Recommendation viewed",
    tour_requested: "Tour requested",
  }[eventType] || "Lead activity";
}

function getEventIcon(eventType) {
  const iconClass = "h-4 w-4";
  if (eventType === "tour_requested") return <CalendarClock className={iconClass} />;
  if (eventType === "recommendation_sent") return <Send className={iconClass} />;
  if (["renter_link_opened", "recommendation_page_viewed"].includes(eventType)) {
    return <BadgeCheck className={iconClass} />;
  }
  if (eventType === "lead_submitted") return <Megaphone className={iconClass} />;
  return <Clock3 className={iconClass} />;
}
