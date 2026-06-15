import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Clock3, Mail, Phone, Search, Send, Users } from "lucide-react";
import {
  archiveSupabaseTestLeads,
  getSupabaseLeads,
  saveSupabaseLead,
} from "../data/supabaseLeadStorage";
import { getSupabaseTourRequestsForLead } from "../data/supabaseTourStorage";
import {
  isLocalFallbackEnabled,
  localFallbackMessage,
} from "../data/supabaseClient";
import {
  archiveLocalTestLeads,
  getAllLeads,
  getLeadActivitiesForLead,
  getTourRequestsForLead,
  saveLocalLead,
} from "../data/leadStorage";

export default function LeadsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTourFilter = searchParams.get("tourFilter") || "All";
  const [savedLeads, setSavedLeads] = useState([]);
  const [supabaseTourRequestsByLeadId, setSupabaseTourRequestsByLeadId] =
    useState({});
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isUsingFallbackData, setIsUsingFallbackData] = useState(false);
  const [isCreatingTestLead, setIsCreatingTestLead] = useState(false);
  const [isArchivingTestLeads, setIsArchivingTestLeads] = useState(false);
  const [testLeadMessage, setTestLeadMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [recommendationFilter, setRecommendationFilter] = useState("All");
  const [tourFilter, setTourFilter] = useState(initialTourFilter);
  const [activityFilter, setActivityFilter] = useState("All Activity");
  const [dataTypeFilter, setDataTypeFilter] = useState("All Data");
  const loadLeads = async ({ prepareLoad = true } = {}) => {
    if (prepareLoad) {
      setIsLoadingLeads(true);
      setLoadError("");
    }

    try {
      const supabaseLeads = await getSupabaseLeads();

      const tourRequestPairs = await Promise.all(
        supabaseLeads.map(async (lead) => {
          const requests = await getSupabaseTourRequestsForLead(lead.id);
          return [lead.id, requests];
        })
      );

      setSavedLeads(supabaseLeads);
      setSupabaseTourRequestsByLeadId(Object.fromEntries(tourRequestPairs));
      setIsUsingFallbackData(false);
      setLastLoadedAt(new Date());
    } catch (error) {
      console.error(error);

      if (isLocalFallbackEnabled) {
        setSavedLeads(getAllLeads());
        setSupabaseTourRequestsByLeadId({});
        setIsUsingFallbackData(true);
        setLoadError(localFallbackMessage);
      } else {
        setSavedLeads([]);
        setSupabaseTourRequestsByLeadId({});
        setIsUsingFallbackData(false);
        setLoadError("Supabase could not be reached. Check the production connection.");
      }

      setLastLoadedAt(new Date());
    } finally {
      setIsLoadingLeads(false);
    }
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadLeads({ prepareLoad: false });
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, []);

  const createTestLead = async () => {
    const confirmed = window.confirm(
      "Create a test lead in this database? Use this only for workflow testing."
    );

    if (!confirmed) return;

    const createdAt = new Date().toISOString();
    const leadPayload = {
      id: `local-test-${Date.now()}`,
      name: "Test Renter",
      phone: "(214) 555-0100",
      email: "test-renter@example.com",
      preference: "1 Bed - Uptown Dallas - production test",
      bedrooms: "1 Bed",
      budget: "$1,600",
      moveIn: "Next 30 days",
      status: "New Lead",
      priority: "Medium",
      source: "Test Data",
      sourcePropertyId: null,
      sourcePropertyName: null,
      assignedTo: "Unassigned",
      lastTouch: "Just now",
      notes: "TEST DATA - Created from the admin test-data helper.",
      recommendedPropertyIds: [],
      token: `test-renter-${Date.now()}`,
      contactMethod: "Email",
      createdAt,
    };

    try {
      setIsCreatingTestLead(true);
      setTestLeadMessage("");

      await saveSupabaseLead(leadPayload);

      await loadLeads({ prepareLoad: false });
      setTestLeadMessage("Test lead created. Use it to verify recommendations and tour requests.");
    } catch (error) {
      console.error(error);

      if (isLocalFallbackEnabled) {
        saveLocalLead(leadPayload);
        await loadLeads({ prepareLoad: false });
        setTestLeadMessage("Test lead saved locally because Supabase could not be reached.");
        return;
      }

      setTestLeadMessage("Could not create the test lead. Check the Supabase connection.");
    } finally {
      setIsCreatingTestLead(false);
    }
  };

  const archiveTestLeads = async () => {
    const activeTestLeadCount = savedLeads.filter(
      (lead) => lead.source === "Test Data" && lead.status !== "Archived"
    ).length;
    const confirmed = window.confirm(
      `Archive ${activeTestLeadCount} active test lead${activeTestLeadCount === 1 ? "" : "s"}? Archived records stay in Supabase but are removed from active lead counts.`
    );

    if (!confirmed) return;

    try {
      setIsArchivingTestLeads(true);
      setTestLeadMessage("");

      await archiveSupabaseTestLeads();

      await loadLeads({ prepareLoad: false });
      setTestLeadMessage("Active test leads archived.");
    } catch (error) {
      console.error(error);

      if (isLocalFallbackEnabled) {
        archiveLocalTestLeads();
        await loadLeads({ prepareLoad: false });
        setTestLeadMessage("Local test leads archived because Supabase could not be reached.");
        return;
      }

      setTestLeadMessage("Could not archive test leads. Check the Supabase connection.");
    } finally {
      setIsArchivingTestLeads(false);
    }
  };
  
  const leads = savedLeads;
  const activeLeads = leads.filter((lead) => lead.status !== "Archived");
  const activeTestLeadCount = leads.filter(
    (lead) => lead.source === "Test Data" && lead.status !== "Archived"
  ).length;
  
  const getLeadTourRequests = (lead) => {
    return (
      supabaseTourRequestsByLeadId[lead.id] ||
      (isLocalFallbackEnabled ? getTourRequestsForLead(lead.id) : [])
    );
  };



  const filteredLeads = leads.filter((lead) => {
    const searchableText = `${lead.name} ${lead.email} ${lead.phone} ${lead.preference} ${lead.status} ${lead.quality || ""} ${lead.assignedTo}`.toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
    const hasTourFollowUpNeeded = getLeadTourRequests(lead).some(
      (request) => (request.status || "New") !== "Followed Up"
    );

    const matchesNeedsAction =
      (lead.recommendedPropertyIds?.length || 0) === 0 ||
      hasTourFollowUpNeeded ||
      lead.status === "New Lead";

    const matchesStatus =
      statusFilter === "All" ||
      lead.status === statusFilter ||
      (statusFilter === "Needs Action" && matchesNeedsAction);

    const matchesSource = sourceFilter === "All" || lead.source === sourceFilter;
    const matchesDataType =
      (dataTypeFilter === "All Data" && lead.status !== "Archived") ||
      (dataTypeFilter === "Test Data" && lead.source === "Test Data" && lead.status !== "Archived") ||
      (dataTypeFilter === "Live Data" && lead.source !== "Test Data" && lead.status !== "Archived") ||
      (dataTypeFilter === "Archived" && lead.status === "Archived");

    const matchesPriority =
      priorityFilter === "All" || lead.priority === priorityFilter;
    const recommendationCount = lead.recommendedPropertyIds?.length || 0;
    const matchesRecommendations =
      recommendationFilter === "All" ||
      (recommendationFilter === "Has Recommendations" && recommendationCount > 0) ||
      (recommendationFilter === "No Recommendations" && recommendationCount === 0);
    const tourRequests = getLeadTourRequests(lead);
    const tourRequestCount = tourRequests.length;
    const savedActivityCount = getLeadActivitiesForLead(lead.id).length;
    const matchesActivity =
      activityFilter === "All Activity" ||
      (activityFilter === "Has Activity" && savedActivityCount > 0) ||
      (activityFilter === "No Saved Activity" && savedActivityCount === 0);
    const hasUnfollowedTourRequest = tourRequests.some(
      (request) => (request.status || "New") !== "Followed Up");

    const matchesTours =
      tourFilter === "All" ||
      (tourFilter === "Has Tour Requests" && tourRequestCount > 0) ||
      (tourFilter === "Not Followed Up" && hasUnfollowedTourRequest) ||
      (tourFilter === "No Tour Requests" && tourRequestCount === 0);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSource &&
      matchesDataType &&
      matchesPriority &&
      matchesRecommendations &&
      matchesTours &&
      matchesActivity
    );
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityRank = {
        High: 3,
        Medium: 2,
        Low: 1,
      };

      return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
    }

    if (sortBy === "status") {
      return a.status.localeCompare(b.status);
    }

    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }


    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });

  const leadSources = ["All", ...new Set(leads.map((lead) => lead.source))];
  const leadPriorities = ["All", ...new Set(leads.map((lead) => lead.priority))];

  const sortLabels = {
    newest: "Newest First",
    priority: "Highest Priority",
    status: "Status",
    name: "Name A-Z",
  };
  const newLeadCount = activeLeads.filter((lead) => lead.status === "New Lead").length;
  const sentCount = activeLeads.filter(
    (lead) => lead.status === "Recommendation Sent"
  ).length;
  const highPriorityCount = activeLeads.filter(
    (lead) => lead.priority === "High"
  ).length;
  const needsRecommendationCount = activeLeads.filter(
    (lead) => (lead.recommendedPropertyIds?.length || 0) === 0
  ).length;
  const tourRequestLeadCount = activeLeads.filter((lead) =>
    getLeadTourRequests(lead).some(
      (request) => (request.status || "New") !== "Followed Up")
  ).length;

  const workedLeadCount = activeLeads.filter(
    (lead) => getLeadActivitiesForLead(lead.id).length > 0
  ).length;

  const needsActionCount = activeLeads.filter((lead) => {
    const recommendationCount = lead.recommendedPropertyIds?.length || 0;
    const hasTourFollowUpNeeded = getLeadTourRequests(lead).some(
      (request) => (request.status || "New") !== "Followed Up"
    );

    return (
      recommendationCount === 0 ||
      hasTourFollowUpNeeded ||
      lead.status === "New Lead"
    );
  }).length;

  const hasActiveFilters =
    searchTerm !== "" ||
    statusFilter !== "All" ||
    sourceFilter !== "All" ||
    priorityFilter !== "All" ||
    sortBy !== "newest" ||
    recommendationFilter !== "All" ||
    tourFilter !== "All" ||
    activityFilter !== "All Activity" ||
    dataTypeFilter !== "All Data";

  return (
    <div className="text-left">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-4xl font-black text-[#102426]">Leads</h1>
          <p className="mt-2 font-semibold text-[#526260]">
            Manage renter leads, messages, and property recommendations.
          </p>
          {searchParams.get("tourFilter") && (
            <p className="mt-3 inline-flex rounded-full bg-[#d8efe6] px-4 py-2 text-sm font-bold text-[#1f6f63]">
              Showing dashboard tour follow-ups
            </p>
          )}
          {lastLoadedAt && (
            <p className="mt-2 text-xs font-semibold text-[#78908a]">
              Last refreshed {lastLoadedAt.toLocaleTimeString()}
            </p>
          )}

          {isLoadingLeads && (
            <p className="mt-2 text-sm font-bold text-[#526260]">
              Loading leads...
            </p>
          )}

          {loadError && (
            <p className="mt-3 rounded-2xl bg-[#fff8e6] px-4 py-3 text-sm font-bold text-[#8a5b0a] ring-1 ring-[#f2d08a]">
              {loadError}
            </p>
          )}

          {isUsingFallbackData && (
            <p className="mt-2 text-xs font-semibold text-[#8a5b0a]">
              Local fallback mode is active.
            </p>
          )}

          {testLeadMessage && (
            <p className="mt-3 rounded-2xl bg-[#d8efe6] px-4 py-3 text-sm font-bold text-[#1f6f63] ring-1 ring-[#a9cfc2]">
              {testLeadMessage}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={loadLeads}
            disabled={isLoadingLeads}
            className="rounded-2xl bg-[#e7f3ee] px-5 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df] disabled:cursor-not-allowed disabled:bg-[#d7e6df] disabled:text-[#78908a]"
          >
            {isLoadingLeads ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={createTestLead}
            disabled={isCreatingTestLead}
            className="rounded-2xl bg-[#d8efe6] px-5 py-3 text-center text-sm font-bold text-[#1f6f63] hover:bg-[#c5e5d8] disabled:cursor-not-allowed disabled:bg-[#e7f3ee] disabled:text-[#78908a]"
          >
            {isCreatingTestLead ? "Creating..." : "Create Test Lead"}
          </button>

          {activeTestLeadCount > 0 && (
            <button
              type="button"
              onClick={archiveTestLeads}
              disabled={isArchivingTestLeads}
              className="rounded-2xl bg-[#fff8e6] px-5 py-3 text-center text-sm font-bold text-[#8a5b0a] hover:bg-[#f9edc8] disabled:cursor-not-allowed disabled:bg-[#e7f3ee] disabled:text-[#78908a]"
            >
              {isArchivingTestLeads ? "Archiving..." : "Archive Test Leads"}
            </button>
          )}

          <Link
            to="/start"
            className="rounded-2xl bg-[#f2b84b] px-5 py-3 text-center text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            + Add Lead
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LeadStatCard
          icon={Users}
          title="Total Leads"
          value={activeLeads.length}
          subtitle="All renter requests"
          onClick={() => {
            setSearchTerm("");
            setStatusFilter("All");
            setSourceFilter("All");
            setPriorityFilter("All");
            setSortBy("newest");
            setRecommendationFilter("All");
            setTourFilter("All");
            setActivityFilter("All Activity");
            setDataTypeFilter("All Data");
            setSearchParams({});
          }}
          isActive={
            searchTerm === "" &&
            statusFilter === "All" &&
            sourceFilter === "All" &&
            priorityFilter === "All" &&
            sortBy === "newest" &&
            recommendationFilter === "All" &&
            tourFilter === "All" &&
            activityFilter === "All Activity" &&
            dataTypeFilter === "All Data"
          }
        />
        <LeadStatCard
          icon={Clock3}
          title="Needs Action"
          value={needsActionCount}
          subtitle={
            statusFilter === "Needs Action"
              ? "Click to show all leads"
              : "Recommended next steps"
          }
          onClick={() => {
            const nextStatus = statusFilter === "Needs Action" ? "All" : "Needs Action";

            setSearchTerm("");
            setSourceFilter("All");
            setPriorityFilter("All");
            setSortBy("newest");
            setStatusFilter(nextStatus);
            setRecommendationFilter("All");
            setTourFilter("All");
            setActivityFilter("All Activity");
            setDataTypeFilter("All Data");
            setSearchParams({}, { replace: true });
          }}
          isActive={statusFilter === "Needs Action"}
        />

        <LeadStatCard
          icon={Clock3}
          title="New Leads"
          value={newLeadCount}
          subtitle={
            statusFilter === "New Lead"
              ? "Click to show all leads"
              : "Need first follow-up"
          }
          onClick={() => {
            const nextStatus = statusFilter === "New Lead" ? "All" : "New Lead";

            setSearchTerm("");
            setStatusFilter(nextStatus);
            setSourceFilter("All");
            setPriorityFilter("All");
            setSortBy("newest");
            setRecommendationFilter("All");
            setTourFilter("All");
            setActivityFilter("All Activity");
            setDataTypeFilter("All Data");
            setSearchParams({}, { replace: true });
          }}
          isActive={statusFilter === "New Lead"}
        />
        <LeadStatCard
          icon={Send}
          title="Recommendations Sent"
          value={sentCount}
          subtitle={
            recommendationFilter === "Has Recommendations"
              ? "Click to show all leads"
              : "Renter links delivered"
          }
          onClick={() => {
            const nextRecommendation =
              recommendationFilter === "Has Recommendations"
                ? "All"
                : "Has Recommendations";

            setSearchTerm("");
            setStatusFilter("All");
            setSourceFilter("All");
            setPriorityFilter("All");
            setSortBy("newest");
            setRecommendationFilter(nextRecommendation);
            setTourFilter("All");
            setActivityFilter("All Activity");
            setDataTypeFilter("All Data");
            setSearchParams({}, { replace: true });
          }}
          isActive={recommendationFilter === "Has Recommendations"}
        />
        <LeadStatCard
          icon={Clock3}
          title="Need Recommendations"
          value={needsRecommendationCount}
          subtitle={
            recommendationFilter === "No Recommendations"
              ? "Click to show all leads"
              : "No properties selected"
          }
          onClick={() => {
            const nextRecommendation =
              recommendationFilter === "No Recommendations"
                ? "All"
                : "No Recommendations";

            setSearchTerm("");
            setStatusFilter("All");
            setSourceFilter("All");
            setPriorityFilter("All");
            setSortBy("newest"); setRecommendationFilter(nextRecommendation);
            setTourFilter("All");
            setActivityFilter("All Activity");
            setDataTypeFilter("All Data");
            setSearchParams({}, { replace: true });
          }}
          isActive={recommendationFilter === "No Recommendations"}
        />
        <LeadStatCard
          icon={Clock3}
          title="Tour Requests"
          value={tourRequestLeadCount}
          subtitle={
            tourFilter === "Not Followed Up"
              ? "Click to show all leads"
              : "Need follow-up"
          }
          onClick={() => {
            const nextTour =
              tourFilter === "Not Followed Up" ? "All" : "Not Followed Up";

            setSearchTerm("");
            setStatusFilter("All");
            setSourceFilter("All");
            setPriorityFilter("All");
            setSortBy("newest"); setRecommendationFilter("All");
            setTourFilter(nextTour);
            setActivityFilter("All Activity");
            setDataTypeFilter("All Data");

            if (nextTour === "All") {
              setSearchParams({}, { replace: true });
            } else {
              setSearchParams({ tourFilter: nextTour }, { replace: true });
            }
          }}
          isActive={tourFilter === "Not Followed Up"}
        />
        <LeadStatCard
          icon={Clock3}
          title="Admin Activity"
          value={workedLeadCount}
          subtitle={
            activityFilter === "Has Activity"
              ? "Click to show all leads"
              : "Saved admin actions"
          }
          onClick={() => {
            const nextActivity =
              activityFilter === "Has Activity" ? "All Activity" : "Has Activity";

            setSearchTerm("");
            setStatusFilter("All");
            setSourceFilter("All");
            setPriorityFilter("All");
            setSortBy("newest");
            setRecommendationFilter("All");
            setTourFilter("All");
            setActivityFilter(nextActivity);
            setDataTypeFilter("All Data");
            setSearchParams({}, { replace: true });
          }}
          isActive={activityFilter === "Has Activity"}
        />


      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Lead Pipeline
            </h2>
            <p className="mt-1 text-slate-500">
              {dataTypeFilter === "Archived"
                ? `Showing ${filteredLeads.length} archived leads.`
                : `Showing ${filteredLeads.length} of ${activeLeads.length} active leads.`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextPriority = priorityFilter === "High" ? "All" : "High";

              setSearchTerm("");
              setStatusFilter("All");
              setSourceFilter("All");
              setPriorityFilter(nextPriority);
              setSortBy("newest");
              setRecommendationFilter("All");
              setTourFilter("All");
              setActivityFilter("All Activity");
              setDataTypeFilter("All Data");
              setSearchParams({}, { replace: true });
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold ${priorityFilter === "High"
              ? "bg-red-700 text-white"
              : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
          >
            {priorityFilter === "High"
              ? "Showing high priority"
              : `${highPriorityCount} high priority`}
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {["New Lead", "Contacted", "Tour Needed", "Recommendation Sent"].map((status) => {
            const count = leads.filter((lead) => lead.status === status).length;

            return (
              <button
                key={status}
                onClick={() => {
                  const nextStatus = statusFilter === status ? "All" : status;

                  setSearchTerm("");
                  setStatusFilter(nextStatus);
                  setSourceFilter("All");
                  setPriorityFilter("All");
                  setSortBy("newest");
                  setRecommendationFilter("All");
                  setTourFilter("All");
                  setActivityFilter("All Activity");
                  setSearchParams({}, { replace: true });
                }}
                className={`rounded-2xl px-4 py-3 text-left ${statusFilter === status
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
              >
                <p className="text-sm font-bold">{status}</p>
                <p className="mt-1 text-2xl font-black">{count}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search leads..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              <option>All</option>
              <option>New Lead</option>
              <option>Contacted</option>
              <option>Tour Needed</option>
              <option>Recommendation Sent</option>
              <option>Archived</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              {leadSources.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              {leadPriorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              <option value="newest">Newest First</option>
              <option value="priority">Highest Priority</option>
              <option value="status">Status</option>
              <option value="name">Name A-Z</option>
            </select>

            <select
              value={recommendationFilter}
              onChange={(event) => setRecommendationFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              <option>All</option>
              <option>Has Recommendations</option>
              <option>No Recommendations</option>
            </select>

            <select
              value={tourFilter}
              onChange={(event) => {
                const value = event.target.value;
                setTourFilter(value);

                if (value === "All") {
                  setSearchParams({}, { replace: true });
                } else {
                  setSearchParams({ tourFilter: value }, { replace: true });
                }
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              <option>All</option>
              <option>Has Tour Requests</option>
              <option>Not Followed Up</option>
              <option>No Tour Requests</option>
            </select>

            <select
              value={dataTypeFilter}
              onChange={(event) => setDataTypeFilter(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 outline-none focus:border-slate-400"
            >
              <option>All Data</option>
              <option>Live Data</option>
              <option>Test Data</option>
              <option>Archived</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setSourceFilter("All");
                  setPriorityFilter("All");
                  setSortBy("newest");
                  setRecommendationFilter("All");
                  setTourFilter("All");
                  setActivityFilter("All Activity");
                  setDataTypeFilter("All Data");
                  setSearchParams({}, { replace: true });
                }}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {searchTerm && (
              <FilterChip
                label={`Search: ${searchTerm}`}
                onRemove={() => setSearchTerm("")}
              />
            )}

            {statusFilter !== "All" && (
              <FilterChip
                label={statusFilter === "Needs Action" ? "Needs Action" : `Status: ${statusFilter}`}
                onRemove={() => setStatusFilter("All")}
              />
            )}

            {sourceFilter !== "All" && (
              <FilterChip
                label={`Source: ${sourceFilter}`}
                onRemove={() => setSourceFilter("All")}
              />
            )}

            {priorityFilter !== "All" && (
              <FilterChip
                label={`Priority: ${priorityFilter}`}
                onRemove={() => setPriorityFilter("All")}
              />
            )}
            {/* Recommendation Chip*/}
            {recommendationFilter !== "All" && (
              <FilterChip
                label={`Recommendations: ${recommendationFilter}`}
                onRemove={() => setRecommendationFilter("All")}
              />
            )}
            {/* Filter Chip*/}
            {tourFilter !== "All" && (
              <FilterChip
                label={`Tours: ${tourFilter}`}
                onRemove={() => {
                  setTourFilter("All");
                  setSearchParams({});
                }}
              />
            )}

            {activityFilter !== "All Activity" && (
              <FilterChip
                label="Admin Activity"
                onRemove={() => setActivityFilter("All Activity")}
              />
            )}

            {dataTypeFilter !== "All Data" && (
              <FilterChip
                label={dataTypeFilter}
                onRemove={() => setDataTypeFilter("All Data")}
              />
            )}

            {sortBy !== "newest" && (
              <FilterChip
                label={`Sort: ${sortLabels[sortBy]}`}
                onRemove={() => setSortBy("newest")}
              />
            )}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {sortedLeads.length > 0 ? (
            sortedLeads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                tourRequests={getLeadTourRequests(lead)}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <h3 className="text-xl font-black text-slate-900">
                {hasActiveFilters ? "No leads match these filters" : "No leads yet"}
              </h3>

              <p className="mt-2 text-slate-500">
                {hasActiveFilters
                  ? "Try clearing filters or changing your search."
                  : "Production leads now come from Supabase. Create a renter from the start page or use the test lead helper to verify the live workflow."}
              </p>

              {!hasActiveFilters && (
                <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={createTestLead}
                    disabled={isCreatingTestLead}
                    className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isCreatingTestLead ? "Creating..." : "Create Test Lead"}
                  </button>

                  <Link
                    to="/start"
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                  >
                    Open Start Page
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
    >
      {label} ×
    </button>
  );
}

function LeadStatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  onClick,
  isActive = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`min-h-[170px] rounded-3xl border p-5 text-left shadow-sm transition ${onClick ? "hover:-translate-y-1 hover:shadow-md" : ""
        } ${isActive
          ? "border-[#102426] bg-[#102426] text-white"
          : "border-[#d7e6df] bg-white text-[#102426] hover:border-[#f2b84b]"
        }`}
    >
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isActive ? "bg-[#f2b84b]" : "bg-[#e7f3ee]"
          }`}
      >
        <Icon
          className={`h-5 w-5 ${isActive ? "text-[#102426]" : "text-[#1f6f63]"
            }`}
        />
      </div>

      <p
        className={`mt-4 text-sm font-semibold ${isActive ? "text-[#d7ece6]" : "text-[#526260]"
          }`}
      >
        {title}
      </p>

      <h2
        className={`mt-2 text-3xl font-black leading-none ${isActive ? "text-[#fff7df]" : "text-[#102426]"
          }`}
      >
        {value}
      </h2>

      <p className={`mt-2 text-sm font-semibold leading-5 ${isActive ? "text-[#d7ece6]" : "text-[#526260]"}`}>
        {subtitle}
      </p>
    </button>
  );
}

function LeadRow({ lead, tourRequests }) {
  const recommendationCount = lead.recommendedPropertyIds?.length || 0;
  const tourRequestCount = tourRequests.length;

  const savedActivityEvents = getLeadActivitiesForLead(lead.id);
  const savedActivityCount = savedActivityEvents.length;
  const activityCount =
    savedActivityCount +
    1 +
    recommendationCount +
    tourRequestCount;

  const leadActivityEvents = [
    {
      title: "Lead created",
      createdAt: lead.createdAt || lead.submittedAt || "",
    },
    ...(recommendationCount > 0
      ? [
        {
          title: "Recommendations sent",
          createdAt: lead.recommendationsSentAt || lead.createdAt || lead.submittedAt || "",
        },
      ]
      : []),
    ...tourRequests.map((request) => ({
      title: "Tour requested",
      createdAt: request.createdAt,
    })),
    ...savedActivityEvents,
  ].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );

  const latestActivity = leadActivityEvents[0];

  const latestTourRequest = tourRequests[0];

  const hasTourFollowUpNeeded = tourRequests.some(
    (request) => (request.status || "New") !== "Followed Up"
  );

  const leadHealth = getLeadHealth({
    lead,
    recommendationCount,
    hasTourFollowUpNeeded,
  });

  const nextAction = getNextActionText(leadHealth.label);

  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/admin/leads/${lead.id}`}
              className="text-xl font-black text-slate-900 hover:text-slate-600"
            >
              {lead.name}
            </Link>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClasses(lead.status)}`}>
              {lead.status}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityClasses(lead.priority)}`}>
              {lead.priority} Priority
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${getQualityClasses(lead.quality || "New")}`}>
              {(lead.quality || "New")} Quality
            </span>

            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
              {lead.source}
            </span>

            <span className={`rounded-full px-3 py-1 text-xs font-bold ${leadHealth.classes}`}>
              {leadHealth.label}
            </span>

            {lead.sourcePropertyName && (
              <p className="mt-2 text-sm font-bold text-emerald-700">
                Interested in {lead.sourcePropertyName}
              </p>
            )}

          </div>

          <p className="mt-2 text-sm font-semibold text-slate-600">
            {lead.preference}
          </p>

          <Link
            to={leadHealth.to}
            className="mt-2 block w-fit text-sm font-bold text-slate-700 hover:text-slate-950"
          >
            Next action: {nextAction}
          </Link>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {lead.phone}
            </span>

            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {lead.email}
            </span>
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-sm font-bold text-slate-600">
              {recommendationCount} recommended{" "}
              {recommendationCount === 1 ? "property" : "properties"}
            </p>

            <Link
              to={`/admin/leads/${lead.id}#activity-timeline`}
              className="block w-fit text-sm font-bold text-slate-500 hover:text-slate-900 hover:underline"
            >
              View {activityCount} {activityCount === 1 ? "activity" : "activities"}
            </Link>

            {latestActivity && (
              <Link
                to={`/admin/leads/${lead.id}#activity-timeline`}
                className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:underline"
              >
                <Clock3 className="h-4 w-4" />
                Last activity: {latestActivity.title} · {formatLeadActivityDate(latestActivity.createdAt)}
              </Link>
            )}


            {tourRequestCount > 0 && (
              <p
                className={`text-sm font-bold ${hasTourFollowUpNeeded ? "text-emerald-700" : "text-slate-500"
                  }`}
              >
                {tourRequestCount} tour {tourRequestCount === 1 ? "request" : "requests"}

                {hasTourFollowUpNeeded ? (
                  <span className="text-slate-500"> need follow-up</span>
                ) : (
                  <span className="text-slate-500"> followed up</span>
                )}

                {latestTourRequest?.preferredDate && hasTourFollowUpNeeded && (
                  <span className="text-slate-500">
                    {" "}
                    · Latest: {latestTourRequest.preferredDate}
                    {latestTourRequest.preferredTime
                      ? ` at ${latestTourRequest.preferredTime}`
                      : ""}
                  </span>
                )}
              </p>
            )}


          </div>

          <p className="mt-3 text-sm text-slate-500">
            Assigned to {lead.assignedTo} • Last touch {lead.lastTouch}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end lg:min-w-[320px]">          <Link
          to={`/admin/leads/${lead.id}`}
          className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
        >
          Details
        </Link>

          <Link
            to={`/admin/leads/${lead.id}/send-properties`}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${recommendationCount === 0
              ? "bg-slate-950 text-white hover:bg-slate-800"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
          >
            Recommend
          </Link>

          {!hasTourFollowUpNeeded && (
            <Link
              to={`/admin/leads/${lead.id}/message`}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Message Lead
            </Link>
          )}

          {hasTourFollowUpNeeded && (
            <Link
              to={`/admin/leads/${lead.id}/message`}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Follow Up
            </Link>
          )}
        </div>
      </div>

      {lead.notes && lead.notes !== "No notes added yet." && (
        <div className="mt-4 rounded-2xl bg-white p-4">
          <p className="text-sm font-bold text-slate-500">Lead Notes</p>
          <p className="mt-1 text-sm text-slate-700">{lead.notes}</p>
        </div>
      )}
    </div>
  );
}

function getStatusClasses(status) {
  if (status === "New Lead") return "bg-emerald-100 text-emerald-700";
  if (status === "Contacted") return "bg-sky-100 text-sky-700";
  if (status === "Tour Needed") return "bg-amber-100 text-amber-700";
  if (status === "Recommendation Sent") return "bg-indigo-100 text-indigo-700";

  return "bg-slate-200 text-slate-700";
}

function getPriorityClasses(priority) {
  if (priority === "High") return "bg-red-100 text-red-700";
  if (priority === "Medium") return "bg-amber-100 text-amber-700";

  return "bg-slate-200 text-slate-700";
}

function getQualityClasses(quality) {
  if (quality === "Qualified") return "bg-emerald-100 text-emerald-700";
  if (quality === "Converted") return "bg-indigo-100 text-indigo-700";
  if (quality === "Bad Fit") return "bg-red-100 text-red-700";
  if (quality === "No Response") return "bg-amber-100 text-amber-700";
  if (quality === "Duplicate") return "bg-slate-200 text-slate-700";

  return "bg-sky-100 text-sky-700";
}


function getLeadHealth({ lead, recommendationCount, hasTourFollowUpNeeded }) {
  if (recommendationCount === 0) {
    return {
      label: "Needs Recommendations",
      classes: "bg-amber-100 text-amber-700",
      to: `/admin/leads/${lead.id}/send-properties`,
    };
  }

  if (hasTourFollowUpNeeded) {
    return {
      label: "Tour Follow-up",
      classes: "bg-emerald-100 text-emerald-700",
      to: `/admin/leads/${lead.id}/message`,
    };
  }

  if (lead.status === "New Lead") {
    return {
      label: "New Lead",
      classes: "bg-slate-100 text-slate-700",
      to: `/admin/leads/${lead.id}`,
    };
  }

  return {
    label: "No Action Needed",
    classes: "bg-indigo-100 text-indigo-700",
    to: `/admin/leads/${lead.id}`,
  };
}


function getNextActionText(healthLabel) {
  if (healthLabel === "Needs Recommendations") {
    return "Send recommendations";
  }

  if (healthLabel === "Tour Follow-up") {
    return "Follow up on tour request";
  }

  if (healthLabel === "New Lead") {
    return "Review new lead";
  }

  return "No action needed";
}

function formatLeadActivityDate(dateValue) {
  if (!dateValue) return "Recently";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
