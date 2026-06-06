import { useState } from "react";
import { Activity, Building2, Clock3, Database, Send, Users } from "lucide-react";

import { dataHistory } from "../data/mockData";
import { clearStoredLeads, getStoredLeads } from "../data/leadStorage";

export default function DataHistory() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [localLeadCount, setLocalLeadCount] = useState(getStoredLeads().length);

  const clearLocalLeads = () => {
    const confirmed = window.confirm(
      "Clear local test leads saved in this browser?"
    );

    if (!confirmed) return;

    clearStoredLeads();
    setLocalLeadCount(0);
  };

  const filteredEvents = dataHistory.filter((event) => {
    return typeFilter === "All" || event.type === typeFilter;
  });

  const eventTypes = ["All", ...new Set(dataHistory.map((event) => event.type))];

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900">
            Data History
          </h1>

          <p className="mt-2 text-slate-500">
            Review recent property, lead, and recommendation updates.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200">
            Export History
          </button>

          <button
            onClick={clearLocalLeads}
            className="rounded-2xl bg-red-100 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-200"
          >
            Clear Local Leads ({localLeadCount})
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <HistoryStat
          icon={Database}
          title="Total Events"
          value={dataHistory.length}
          subtitle="Tracked changes"
        />
        <HistoryStat
          icon={Building2}
          title="Property Updates"
          value={dataHistory.filter((event) => event.type.includes("Property") || event.type.includes("Special")).length}
          subtitle="Pricing and specials"
        />
        <HistoryStat
          icon={Users}
          title="Lead Events"
          value={dataHistory.filter((event) => event.type.includes("Lead")).length}
          subtitle="Renter activity"
        />
        <HistoryStat
          icon={Send}
          title="Recommendations"
          value={dataHistory.filter((event) => event.type.includes("Recommendations")).length}
          subtitle="Lists sent"
        />
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Activity Timeline
            </h2>

            <p className="mt-1 text-slate-500">
              Showing {filteredEvents.length} of {dataHistory.length} events.
            </p>
          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
          >
            {eventTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="mt-6 space-y-4">
          {filteredEvents.map((event) => (
            <HistoryEvent key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryStat({ icon: Icon, title, value, subtitle }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-5 w-5 text-slate-700" />
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">{title}</p>
      <h2 className="mt-3 text-4xl font-black text-slate-900">{value}</h2>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function HistoryEvent({ event }) {
  const Icon = getEventIcon(event.type);

  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>

        <div className="flex-1">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-black text-slate-900">
                  {event.type}
                </h3>

                <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(event.status)}`}>
                  {event.status}
                </span>
              </div>

              <p className="mt-1 text-sm font-bold text-slate-600">
                {event.subject}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                {event.description}
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm font-bold text-slate-500">
                {event.time}
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                by {event.actor}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getEventIcon(type) {
  if (type.includes("Property") || type.includes("Special")) return Building2;
  if (type.includes("Lead")) return Users;
  if (type.includes("Recommendations")) return Send;
  if (type.includes("updated")) return Clock3;

  return Activity;
}

function getStatusClasses(status) {
  if (status === "Published") return "bg-emerald-100 text-emerald-700";
  if (status === "Queued") return "bg-amber-100 text-amber-700";
  if (status === "Sent") return "bg-indigo-100 text-indigo-700";
  if (status === "Needs Review") return "bg-red-100 text-red-700";

  return "bg-slate-200 text-slate-700";
}