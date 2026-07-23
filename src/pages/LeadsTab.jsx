import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  CalendarClock,
  ChevronRight,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
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
  const [qualityFilter, setQualityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [recommendationFilter, setRecommendationFilter] = useState("All");
  const [tourFilter, setTourFilter] = useState(initialTourFilter);
  const [activityFilter, setActivityFilter] = useState("All Activity");
  const [dataTypeFilter, setDataTypeFilter] = useState("All Data");
  const [queueFilter, setQueueFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
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
    const queueType = getLeadQueueType(lead, getLeadTourRequests(lead));
    const matchesQueue =
      queueFilter === "All" ||
      queueType === queueFilter ||
      (queueFilter === "Needs Action" && queueType !== "Up to date");

    const matchesStatus =
      statusFilter === "All" ||
      lead.status === statusFilter ||
      (statusFilter === "Needs Action" && matchesNeedsAction);

    const matchesSource = sourceFilter === "All" || lead.source === sourceFilter;
    const leadQuality = lead.quality || "New";
    const matchesQuality =
      qualityFilter === "All" ||
      leadQuality === qualityFilter ||
      (qualityFilter === "Not Qualified" && leadQuality === "Bad Fit");
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
      matchesQuality &&
      matchesDataType &&
      matchesPriority &&
      matchesRecommendations &&
      matchesTours &&
      matchesActivity &&
      matchesQueue
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
  const qualifiedLeadCount = activeLeads.filter(
    (lead) => lead.quality === "Qualified"
  ).length;
  const notQualifiedLeadCount = activeLeads.filter(
    (lead) => lead.quality === "Not Qualified" || lead.quality === "Bad Fit"
  ).length;
  const convertedLeadCount = activeLeads.filter(
    (lead) => lead.quality === "Converted"
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

  const queueCounts = activeLeads.reduce(
    (counts, lead) => {
      const queueType = getLeadQueueType(lead, getLeadTourRequests(lead));
      counts[queueType] = (counts[queueType] || 0) + 1;
      return counts;
    },
    {
      "Tour follow-up": 0,
      Overdue: 0,
      "Needs recommendation": 0,
      New: 0,
      "Up to date": 0,
    }
  );

  const selectQueue = (nextQueue) => {
    setQueueFilter(queueFilter === nextQueue ? "All" : nextQueue);
    setSearchTerm("");
    setStatusFilter("All");
    setSourceFilter("All");
    setPriorityFilter("All");
    setQualityFilter("All");
    setRecommendationFilter("All");
    setTourFilter("All");
    setActivityFilter("All Activity");
    setDataTypeFilter("All Data");
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    statusFilter !== "All" ||
    sourceFilter !== "All" ||
    priorityFilter !== "All" ||
    qualityFilter !== "All" ||
    sortBy !== "newest" ||
    recommendationFilter !== "All" ||
    tourFilter !== "All" ||
    activityFilter !== "All Activity" ||
    dataTypeFilter !== "All Data" ||
    queueFilter !== "All";

  return (
    <div className="text-left">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#1f6f63]">
            Renter pipeline
          </p>
          <h1 className="mt-1 text-3xl font-black text-[#102426]">Leads</h1>
          <p className="mt-1 text-sm font-semibold text-[#526260]">
            Work the next renter action without losing the full history.
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

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadLeads}
            disabled={isLoadingLeads}
            className="inline-flex items-center gap-2 rounded-xl bg-[#e7f3ee] px-4 py-2.5 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df] disabled:cursor-not-allowed disabled:text-[#78908a]"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingLeads ? "animate-spin" : ""}`} />
            {isLoadingLeads ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={createTestLead}
            disabled={isCreatingTestLead}
            className="rounded-xl bg-[#d8efe6] px-4 py-2.5 text-center text-sm font-bold text-[#1f6f63] hover:bg-[#c5e5d8] disabled:cursor-not-allowed disabled:text-[#78908a]"
          >
            {isCreatingTestLead ? "Creating..." : "Create Test Lead"}
          </button>

          {activeTestLeadCount > 0 && (
            <button
              type="button"
              onClick={archiveTestLeads}
              disabled={isArchivingTestLeads}
              className="rounded-xl bg-[#fff8e6] px-4 py-2.5 text-center text-sm font-bold text-[#8a5b0a] hover:bg-[#f9edc8] disabled:cursor-not-allowed disabled:text-[#78908a]"
            >
              {isArchivingTestLeads ? "Archiving..." : "Archive Test Leads"}
            </button>
          )}

          <Link
            to="/start"
            className="rounded-xl bg-[#f2b84b] px-4 py-2.5 text-center text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            + Add Lead
          </Link>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#d7e6df] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-[#d7e6df] px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-black text-[#102426]">Follow-up queue</h2>
            <p className="mt-0.5 text-xs font-semibold text-[#526260]">
              Start with tours and overdue renters, then build missing recommendations.
            </p>
          </div>
          <span className="w-fit rounded-full bg-[#102426] px-3 py-1 text-xs font-black text-white">
            {needsActionCount} need action
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#d7e6df] sm:grid-cols-3 xl:grid-cols-6">
          <QueueButton
            icon={Users}
            label="All active"
            value={activeLeads.length}
            isActive={queueFilter === "All"}
            onClick={() => selectQueue("All")}
          />
          <QueueButton
            icon={CalendarClock}
            label="Tour follow-up"
            value={queueCounts["Tour follow-up"]}
            isActive={queueFilter === "Tour follow-up"}
            onClick={() => selectQueue("Tour follow-up")}
            tone="urgent"
          />
          <QueueButton
            icon={Clock3}
            label="Overdue"
            value={queueCounts.Overdue}
            isActive={queueFilter === "Overdue"}
            onClick={() => selectQueue("Overdue")}
            tone="urgent"
          />
          <QueueButton
            icon={Send}
            label="Needs match"
            value={queueCounts["Needs recommendation"]}
            isActive={queueFilter === "Needs recommendation"}
            onClick={() => selectQueue("Needs recommendation")}
            tone="warning"
          />
          <QueueButton
            icon={BadgeCheck}
            label="New"
            value={queueCounts.New}
            isActive={queueFilter === "New"}
            onClick={() => selectQueue("New")}
          />
          <QueueButton
            icon={ShieldCheck}
            label="Up to date"
            value={queueCounts["Up to date"]}
            isActive={queueFilter === "Up to date"}
            onClick={() => selectQueue("Up to date")}
            tone="success"
          />
        </div>
      </section>

      <div className="hidden">
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
            setQualityFilter("All");
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
            qualityFilter === "All" &&
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
            setQualityFilter("All");
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
            setQualityFilter("All");
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
            setQualityFilter("All");
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
            setQualityFilter("All");
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
            setQualityFilter("All");
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
            setQualityFilter("All");
            setSortBy("newest");
            setRecommendationFilter("All");
            setTourFilter("All");
            setActivityFilter(nextActivity);
            setDataTypeFilter("All Data");
            setSearchParams({}, { replace: true });
          }}
          isActive={activityFilter === "Has Activity"}
        />

        <LeadStatCard
          icon={BadgeCheck}
          title="Qualified Leads"
          value={qualifiedLeadCount}
          subtitle={
            qualityFilter === "Qualified"
              ? "Click to show all leads"
              : "Good renter fit"
          }
          onClick={() => {
            const nextQuality = qualityFilter === "Qualified" ? "All" : "Qualified";

            setSearchTerm("");
            setStatusFilter("All");
            setSourceFilter("All");
            setPriorityFilter("All");
            setQualityFilter(nextQuality);
            setSortBy("newest");
            setRecommendationFilter("All");
            setTourFilter("All");
            setActivityFilter("All Activity");
            setDataTypeFilter("All Data");
            setSearchParams({}, { replace: true });
          }}
          isActive={qualityFilter === "Qualified"}
        />

        <LeadStatCard
          icon={XCircle}
          title="Not Qualified"
          value={notQualifiedLeadCount}
          subtitle={
            qualityFilter === "Not Qualified"
              ? "Click to show all leads"
              : "Not worth ad spend"
          }
          onClick={() => {
            const nextQuality = qualityFilter === "Not Qualified" ? "All" : "Not Qualified";

            setSearchTerm("");
            setStatusFilter("All");
            setSourceFilter("All");
            setPriorityFilter("All");
            setQualityFilter(nextQuality);
            setSortBy("newest");
            setRecommendationFilter("All");
            setTourFilter("All");
            setActivityFilter("All Activity");
            setDataTypeFilter("All Data");
            setSearchParams({}, { replace: true });
          }}
          isActive={qualityFilter === "Not Qualified"}
        />

        <LeadStatCard
          icon={Trophy}
          title="Converted"
          value={convertedLeadCount}
          subtitle={
            qualityFilter === "Converted"
              ? "Click to show all leads"
              : "Best outcome"
          }
          onClick={() => {
            const nextQuality = qualityFilter === "Converted" ? "All" : "Converted";

            setSearchTerm("");
            setStatusFilter("All");
            setSourceFilter("All");
            setPriorityFilter("All");
            setQualityFilter(nextQuality);
            setSortBy("newest");
            setRecommendationFilter("All");
            setTourFilter("All");
            setActivityFilter("All Activity");
            setDataTypeFilter("All Data");
            setSearchParams({}, { replace: true });
          }}
          isActive={qualityFilter === "Converted"}
        />

      </div>

      <div className="mt-6 rounded-2xl border border-[#d7e6df] bg-white p-3 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-[#102426]">
              Lead Pipeline
            </h2>
            <p className="mt-1 font-semibold text-[#526260]">
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
              setQualityFilter("All");
              setSortBy("newest");
              setRecommendationFilter("All");
              setTourFilter("All");
              setActivityFilter("All Activity");
              setDataTypeFilter("All Data");
              setSearchParams({}, { replace: true });
            }}
            className={`rounded-full px-4 py-2 text-sm font-bold ${priorityFilter === "High"
              ? "bg-[#b33818] text-white"
              : "bg-[#fde8df] text-[#b33818] hover:bg-[#f9d4c6]"
              }`}
          >
            {priorityFilter === "High"
              ? "Showing high priority"
              : `${highPriorityCount} high priority`}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
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
                className={`rounded-xl px-3 py-2.5 text-left ${statusFilter === status
                  ? "bg-[#102426] text-white"
                  : "bg-[#f5f8f1] text-[#173f3f] hover:bg-[#e7f3ee]"
                  }`}
              >
                <p className="text-sm font-bold">{status}</p>
                <p className="mt-1 text-2xl font-black">{count}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#78908a]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search leads..."
                className="w-full rounded-xl border border-[#d7e6df] bg-white py-3 pl-12 pr-4 font-semibold text-[#102426] placeholder:text-[#78908a] outline-none focus:border-[#1f6f63]"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className="rounded-xl bg-[#e7f3ee] px-3 text-xs font-black text-[#173f3f] md:hidden"
            >
              {showFilters ? "Hide filters" : "Filters"}
            </button>
          </div>

          <div className={`${showFilters ? "grid" : "hidden"} gap-2 sm:grid-cols-2 md:grid lg:grid-cols-3 xl:grid-cols-7`}>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 font-semibold text-[#173f3f] outline-none focus:border-[#1f6f63]"
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
              className="rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 font-semibold text-[#173f3f] outline-none focus:border-[#1f6f63]"
            >
              {leadSources.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 font-semibold text-[#173f3f] outline-none focus:border-[#1f6f63]"
            >
              {leadPriorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 font-semibold text-[#173f3f] outline-none focus:border-[#1f6f63]"
            >
              <option value="newest">Newest First</option>
              <option value="priority">Highest Priority</option>
              <option value="status">Status</option>
              <option value="name">Name A-Z</option>
            </select>

            <select
              value={recommendationFilter}
              onChange={(event) => setRecommendationFilter(event.target.value)}
              className="rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 font-semibold text-[#173f3f] outline-none focus:border-[#1f6f63]"
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
              className="rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 font-semibold text-[#173f3f] outline-none focus:border-[#1f6f63]"
            >
              <option>All</option>
              <option>Has Tour Requests</option>
              <option>Not Followed Up</option>
              <option>No Tour Requests</option>
            </select>

            <select
              value={dataTypeFilter}
              onChange={(event) => setDataTypeFilter(event.target.value)}
              className="rounded-2xl border border-[#d7e6df] bg-white px-4 py-3 font-semibold text-[#173f3f] outline-none focus:border-[#1f6f63]"
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
                  setQualityFilter("All");
                  setSortBy("newest");
                  setRecommendationFilter("All");
                  setTourFilter("All");
                  setActivityFilter("All Activity");
                  setDataTypeFilter("All Data");
                  setQueueFilter("All");
                  setSearchParams({}, { replace: true });
                }}
                className="rounded-2xl bg-[#e7f3ee] px-4 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {queueFilter !== "All" && (
              <FilterChip
                label={`Queue: ${queueFilter}`}
                onRemove={() => setQueueFilter("All")}
              />
            )}
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
            {qualityFilter !== "All" && (
              <FilterChip
                label={`Quality: ${qualityFilter}`}
                onRemove={() => setQualityFilter("All")}
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
            <div className="rounded-2xl border border-dashed border-[#a9cfc2] bg-[#f5f8f1] p-10 text-center">
              <h3 className="text-xl font-black text-[#102426]">
                {hasActiveFilters ? "No leads match these filters" : "No leads yet"}
              </h3>

              <p className="mt-2 font-semibold text-[#526260]">
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
                    className="rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426] disabled:cursor-not-allowed disabled:bg-[#d7e6df]"
                  >
                    {isCreatingTestLead ? "Creating..." : "Create Test Lead"}
                  </button>

                  <Link
                    to="/start"
                    className="rounded-2xl bg-[#e7f3ee] px-5 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
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
      className="rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-bold text-[#173f3f] hover:bg-[#d7e6df]"
    >
      {label} ×
    </button>
  );
}

function QueueButton({ icon: Icon, label, value, isActive, onClick, tone = "default" }) {
  const toneClasses = {
    default: "text-[#173f3f]",
    urgent: "text-[#b42318]",
    warning: "text-[#8a5b0a]",
    success: "text-[#1f6f63]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 bg-white px-3 py-3 text-left transition hover:bg-[#f5f8f1] sm:px-4 ${
        isActive ? "relative z-10 ring-2 ring-inset ring-[#173f3f]" : ""
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${toneClasses[tone]}`} />
        <span className="text-xl font-black text-[#102426]">{value}</span>
      </span>
      <span className="mt-1 block truncate text-[11px] font-black text-[#526260] sm:text-xs">
        {label}
      </span>
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
  const savedActivityEvents = getLeadActivitiesForLead(lead.id);
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
  const hasTourFollowUpNeeded = tourRequests.some(
    (request) => (request.status || "New") !== "Followed Up"
  );
  const leadHealth = getLeadHealth({
    lead,
    recommendationCount,
    hasTourFollowUpNeeded,
  });
  const nextAction = getNextActionText(leadHealth.label);
  const queueType = getLeadQueueType(lead, tourRequests);
  const followUpLabel = formatFollowUpLabel(lead.nextFollowUpAt);
  const phoneHref = `tel:${String(lead.phone || "").replace(/[^\d+]/g, "")}`;
  const emailHref = `mailto:${lead.email || ""}`;
  const smsAllowed = Boolean(lead.smsConsent);

  return (
    <article className="overflow-hidden rounded-2xl border border-[#d7e6df] bg-white shadow-sm">
      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${getQueueClasses(queueType)}`}>
                  {queueType}
                </span>
                <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${getPriorityClasses(lead.priority)}`}>
                  {lead.priority || "Normal"} priority
                </span>
                <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${getQualityClasses(lead.quality || "New")}`}>
                  {lead.quality || "New"}
                </span>
              </div>
              <div className="mt-2 flex min-w-0 items-center gap-2">
                <Link
                  to={`/admin/leads/${lead.id}`}
                  className="truncate text-lg font-black text-[#102426] hover:text-[#1f6f63]"
                >
                  {lead.name || "Unnamed renter"}
                </Link>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusClasses(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[#526260]">
                {lead.preference || `${lead.bedrooms || "Apartment"} · ${lead.budget || "Budget not provided"}`}
              </p>
            </div>

            <Link
              to={leadHealth.to}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-[#173f3f] hover:text-[#1f6f63]"
            >
              {nextAction}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <LeadFact
              label="Preferred contact"
              value={smsAllowed ? (lead.contactMethod || "Text allowed") : "Call or email"}
              detail={
                smsAllowed
                  ? "SMS consent saved"
                  : lead.contactMethod === "Text"
                    ? "Text requested, no consent"
                    : "No SMS consent"
              }
              icon={smsAllowed ? ShieldCheck : Mail}
              tone={smsAllowed ? "success" : "default"}
            />
            <LeadFact
              label="Recommendations"
              value={`${recommendationCount} ${recommendationCount === 1 ? "property" : "properties"}`}
              detail={recommendationCount > 0 ? "Renter list ready" : "Match needed"}
              icon={Send}
              tone={recommendationCount > 0 ? "success" : "warning"}
            />
            <LeadFact
              label="Follow-up"
              value={followUpLabel || (hasTourFollowUpNeeded ? "Tour waiting" : "Not scheduled")}
              detail={latestActivity ? `${latestActivity.title} · ${formatLeadActivityDate(latestActivity.createdAt)}` : "No recent activity"}
              icon={CalendarClock}
              tone={queueType === "Overdue" || hasTourFollowUpNeeded ? "urgent" : "default"}
            />
          </div>

          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#edf3ef] pt-3 text-xs font-semibold text-[#526260]">
            <a href={phoneHref} className="inline-flex items-center gap-1.5 hover:text-[#173f3f]">
              <Phone className="h-3.5 w-3.5" />
              {lead.phone || "No phone"}
            </a>
            <a href={emailHref} className="inline-flex min-w-0 items-center gap-1.5 hover:text-[#173f3f]">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{lead.email || "No email"}</span>
            </a>
            <span>{lead.source || "Unknown source"}</span>
            {lead.sourcePropertyName && (
              <span className="truncate font-bold text-[#1f6f63]">
                Interested in {lead.sourcePropertyName}
              </span>
            )}
          </div>

          {lead.notes && lead.notes !== "No notes added yet." && (
            <p className="mt-3 line-clamp-2 rounded-xl bg-[#f5f8f1] px-3 py-2 text-xs font-semibold leading-5 text-[#526260]">
              {lead.notes}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-[#d7e6df] bg-[#f5f8f1] p-3 lg:grid-cols-1 lg:border-l lg:border-t-0">
          <a
            href={phoneHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#173f3f] px-3 py-2.5 text-xs font-black text-white hover:bg-[#102426]"
          >
            <Phone className="h-4 w-4" />
            Call
          </a>
          <a
            href={emailHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
          <Link
            to={`/admin/leads/${lead.id}/message`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
          >
            <MessageSquare className="h-4 w-4" />
            Message
          </Link>
          <Link
            to={`/admin/leads/${lead.id}/send-properties`}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black ${
              recommendationCount === 0
                ? "bg-[#f2b84b] text-[#102426] hover:bg-[#dca33c]"
                : "bg-[#e7f3ee] text-[#173f3f] hover:bg-[#d7e6df]"
            }`}
          >
            <Send className="h-4 w-4" />
            {recommendationCount === 0 ? "Build matches" : "Edit matches"}
          </Link>
            <Link
              to={`/admin/leads/${lead.id}`}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee] lg:col-span-1"
            >
              Open lead
              <ChevronRight className="h-4 w-4" />
            </Link>
        </div>
      </div>
    </article>
  );
}

function LeadFact({ label, value, detail, icon: Icon, tone = "default" }) {
  const toneClasses = {
    default: "bg-[#f5f8f1] text-[#173f3f]",
    success: "bg-[#e7f3ee] text-[#1f6f63]",
    warning: "bg-[#fff8e6] text-[#8a5b0a]",
    urgent: "bg-[#fff0ea] text-[#b42318]",
  };

  return (
    <div className={`min-w-0 rounded-xl px-3 py-2.5 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <p className="truncate text-[9px] font-black uppercase">{label}</p>
      </div>
      <p className="mt-1 truncate text-sm font-black text-[#102426]">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-[#526260]">{detail}</p>
    </div>
  );
}

function getStatusClasses(status) {
  if (status === "New Lead") return "bg-[#d8efe6] text-[#1f6f63]";
  if (status === "Contacted") return "bg-[#e7f3ee] text-[#173f3f]";
  if (status === "Tour Needed") return "bg-[#fff8e6] text-[#8a5b0a]";
  if (status === "Recommendation Sent") return "bg-[#e7f3ee] text-[#173f3f]";

  return "bg-[#e7f3ee] text-[#526260]";
}

function getPriorityClasses(priority) {
  if (priority === "High") return "bg-[#fde8df] text-[#b33818]";
  if (priority === "Medium") return "bg-[#fff8e6] text-[#8a5b0a]";

  return "bg-[#e7f3ee] text-[#526260]";
}

function getQualityClasses(quality) {
  if (quality === "Qualified") return "bg-[#d8efe6] text-[#1f6f63]";
  if (quality === "Converted") return "bg-[#f2b84b] text-[#102426]";
  if (quality === "Not Qualified" || quality === "Bad Fit") return "bg-[#fde8df] text-[#b33818]";
  if (quality === "No Response") return "bg-[#fff8e6] text-[#8a5b0a]";

  return "bg-[#e7f3ee] text-[#173f3f]";
}


function getLeadHealth({ lead, recommendationCount, hasTourFollowUpNeeded }) {
  if (hasTourFollowUpNeeded) {
    return {
      label: "Tour Follow-up",
      classes: "bg-[#d8efe6] text-[#1f6f63]",
      to: `/admin/leads/${lead.id}/message`,
    };
  }

  if (recommendationCount === 0) {
    return {
      label: "Needs Recommendations",
      classes: "bg-[#fff8e6] text-[#8a5b0a]",
      to: `/admin/leads/${lead.id}/send-properties`,
    };
  }

  if (lead.status === "New Lead") {
    return {
      label: "New Lead",
      classes: "bg-[#e7f3ee] text-[#173f3f]",
      to: `/admin/leads/${lead.id}`,
    };
  }

  return {
    label: "No Action Needed",
    classes: "bg-[#e7f3ee] text-[#526260]",
    to: `/admin/leads/${lead.id}`,
  };
}

function getLeadQueueType(lead, tourRequests = []) {
  const hasTourFollowUpNeeded = tourRequests.some(
    (request) => (request.status || "New") !== "Followed Up"
  );

  if (hasTourFollowUpNeeded) return "Tour follow-up";
  if (isLeadOverdue(lead)) return "Overdue";
  if ((lead.recommendedPropertyIds?.length || 0) === 0) {
    return "Needs recommendation";
  }
  if (lead.status === "New Lead") return "New";
  return "Up to date";
}

function isLeadOverdue(lead) {
  if (lead.nextFollowUpAt) {
    const followUpTime = new Date(lead.nextFollowUpAt).getTime();
    return Number.isFinite(followUpTime) && followUpTime < Date.now();
  }

  if (lead.status !== "New Lead") return false;
  const createdTime = new Date(lead.createdAt || lead.submittedAt || "").getTime();
  return Number.isFinite(createdTime) && Date.now() - createdTime > 2 * 60 * 60 * 1000;
}

function getQueueClasses(queueType) {
  if (queueType === "Tour follow-up" || queueType === "Overdue") {
    return "bg-[#fff0ea] text-[#b42318]";
  }
  if (queueType === "Needs recommendation") {
    return "bg-[#fff8e6] text-[#8a5b0a]";
  }
  if (queueType === "Up to date") {
    return "bg-[#e7f3ee] text-[#1f6f63]";
  }
  return "bg-[#eef5ff] text-[#174a7c]";
}

function formatFollowUpLabel(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? `Today ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
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
