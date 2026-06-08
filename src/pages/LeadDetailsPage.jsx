import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAnyPropertyById } from "../data/propertyStorage";
import {
    getSupabaseLeadById,
    updateSupabaseLead,
} from "../data/supabaseLeadStorage";
import {
    deleteSupabaseTourRequest,
    getSupabaseTourRequestsForLead,
    updateSupabaseTourRequestStatus,
} from "../data/supabaseTourStorage";
import {
    ArrowLeft,
    CalendarDays,
    Mail,
    MessageSquare,
    Phone,
    Send,
    User,
} from "lucide-react";

import {
    clearLeadActivities,
    deleteLocalLead,
    deleteTourRequest,
    getAnyLeadById,
    getLeadActivitiesForLead,
    getTourRequestsForLead,
    saveLeadActivity,
    updateLocalLead,
} from "../data/leadStorage";

export default function LeadDetailsPage() {
    const { leadId } = useParams();
    const navigate = useNavigate();
    const initialLead = useMemo(() => getAnyLeadById(leadId), [leadId]);
    const [lead, setLead] = useState(initialLead);
    const [isLoadingLead, setIsLoadingLead] = useState(!initialLead);
    const [notesDraft, setNotesDraft] = useState(initialLead?.notes || "");
    const [assignedToDraft, setAssignedToDraft] = useState(
        initialLead?.assignedTo || ""
    );
    const [activityFilter, setActivityFilter] = useState("All");
    const [tourRequests, setTourRequests] = useState(
        initialLead ? getTourRequestsForLead(initialLead.id) : []
    );
    const [isLocalLead, setIsLocalLead] = useState(Boolean(initialLead));

    const refreshLead = useCallback(async () => {
        if (isLocalLead) {
            const freshLead = getAnyLeadById(leadId);
            const freshTourRequests = freshLead
                ? getTourRequestsForLead(freshLead.id)
                : [];

            setLead(freshLead ? { ...freshLead } : null);
            setNotesDraft(freshLead?.notes || "");
            setAssignedToDraft(freshLead?.assignedTo || "");
            setTourRequests(freshTourRequests);
            return;
        }

        try {
            const supabaseLead = await getSupabaseLeadById(leadId);
            const supabaseTourRequests = await getSupabaseTourRequestsForLead(leadId);

            setLead(supabaseLead);
            setNotesDraft(supabaseLead?.notes || "");
            setAssignedToDraft(supabaseLead?.assignedTo || "");
            setTourRequests(supabaseTourRequests);
        } catch (error) {
            console.error(error);
        }
    }, [isLocalLead, leadId]);

    const loadSupabaseLead = useCallback(async () => {
        try {
            setIsLoadingLead(true);

            const supabaseLead = await getSupabaseLeadById(leadId);
            const supabaseTourRequests = await getSupabaseTourRequestsForLead(leadId);

            setLead(supabaseLead);
            setIsLocalLead(false);
            setNotesDraft(supabaseLead?.notes || "");
            setAssignedToDraft(supabaseLead?.assignedTo || "");
            setTourRequests(supabaseTourRequests);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingLead(false);
        }
    }, [leadId]);

    useEffect(() => {
        if (!initialLead) {
            const loadTimer = window.setTimeout(() => {
                loadSupabaseLead();
            }, 0);

            return () => window.clearTimeout(loadTimer);
        }
    }, [initialLead, loadSupabaseLead]);
    const recommendedProperties = lead
        ? lead.recommendedPropertyIds
            .map((propertyId) => getAnyPropertyById(propertyId))
            .filter(Boolean)
        : [];
    const recommendationCount = recommendedProperties.length;
    const sortedTourRequests = [...tourRequests].sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );

    const hasTourFollowUpNeeded = sortedTourRequests.some(
        (request) => (request.status || "New") !== "Followed Up"
    );

    const savedActivityEvents = lead ? getLeadActivitiesForLead(lead.id) : [];

    const activityEvents = lead
        ? [
            {
                id: `lead-created-${lead.id}`,
                title: "Lead created",
                description: `${lead.name} entered the lead pipeline.`,
                createdAt: lead.createdAt || lead.submittedAt || "",
                category: "Admin",
            },
            ...(recommendationCount > 0
                ? [
                    {
                        id: `recommendations-${lead.id}`,
                        title: "Recommendations sent",
                        description: `${recommendationCount} recommended ${recommendationCount === 1 ? "property" : "properties"} attached to this lead.`,
                        createdAt: lead.recommendationsSentAt || lead.createdAt || lead.submittedAt || "",
                        category: "Admin",
                    },
                ]
                : []),
            ...sortedTourRequests.map((request) => ({
                id: `tour-requested-${request.id}`,
                title: "Tour requested",
                description: `${request.propertyName} tour requested.`,
                createdAt: request.createdAt,
                category: "Tours",
            })),
            ...savedActivityEvents.map((event) => ({
                ...event,
                category: event.category || "Admin",
            })),
        ].sort((a, b) =>
            String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
        )
        : [];

    const filteredActivityEvents =
        activityFilter === "All"
            ? activityEvents
            : activityEvents.filter((event) => event.category === activityFilter);


    const updateStatus = async (status) => {
        if (!lead) return;

        const updates = {
            status,
            lastTouch: "Just now",
        };

        try {
            if (isLocalLead) {
                updateLocalLead(lead.id, updates);

                saveLeadActivity({
                    leadId: lead.id,
                    title: "Lead status updated",
                    description: `Status changed to ${status}.`,
                });
            } else {
                await updateSupabaseLead(lead.id, updates);
            }

            setLead({
                ...lead,
                ...updates,
            });
        } catch (error) {
            console.error(error);
            alert("Could not update lead status. Please try again.");
        }
    };

    const saveNotes = async () => {
        if (!lead) return;

        const updates = {
            notes: notesDraft,
            lastTouch: "Just now",
        };

        try {
            if (isLocalLead) {
                updateLocalLead(lead.id, updates);

                saveLeadActivity({
                    leadId: lead.id,
                    title: "Notes updated",
                    description: "Lead notes were updated.",
                });
            } else {
                await updateSupabaseLead(lead.id, updates);
            }

            setLead({
                ...lead,
                ...updates,
            });
        } catch (error) {
            console.error(error);
            alert("Could not save notes. Please try again.");
        }
    };

    const saveAssignment = async () => {
        if (!lead) return;

        const updates = {
            assignedTo: assignedToDraft || "Unassigned",
            lastTouch: "Just now",
        };

        try {
            if (isLocalLead) {
                updateLocalLead(lead.id, updates);

                saveLeadActivity({
                    leadId: lead.id,
                    title: "Assignment changed",
                    description: `Assigned to ${updates.assignedTo}.`,
                });
            } else {
                await updateSupabaseLead(lead.id, updates);
            }

            setLead({
                ...lead,
                ...updates,
            });
        } catch (error) {
            console.error(error);
            alert("Could not save assignment. Please try again.");
        }
    };

    const updatePriority = async (priority) => {
        if (!lead) return;

        const updates = {
            priority,
            lastTouch: "Just now",
        };

        try {
            if (isLocalLead) {
                updateLocalLead(lead.id, updates);

                saveLeadActivity({
                    leadId: lead.id,
                    title: "Priority updated",
                    description: `Priority changed to ${priority}.`,
                });
            } else {
                await updateSupabaseLead(lead.id, updates);
            }

            setLead({
                ...lead,
                ...updates,
            });
        } catch (error) {
            console.error(error);
            alert("Could not update priority. Please try again.");
        }
    };


    const deleteLead = () => {
        if (!isLocalLead || !lead) return;

        const confirmed = window.confirm(
            `Delete ${lead.name} from local test leads?`
        );

        if (!confirmed) return;

        deleteLocalLead(lead.id);
        navigate("/admin/leads");
    };

    const markTourFollowedUp = async (requestId) => {
        if (!lead) return;

        try {
            if (isLocalLead) {
                const updatedRequests = tourRequests.map((request) =>
                    request.id === requestId
                        ? {
                            ...request,
                            status: "Followed Up",
                            followedUpAt: new Date().toISOString(),
                        }
                        : request
                );

                localStorage.setItem(
                    "belowMarketTourRequests",
                    JSON.stringify(updatedRequests)
                );

                setTourRequests(updatedRequests);
            } else {
                await updateSupabaseTourRequestStatus(requestId, "Followed Up");
                const updatedRequests = await getSupabaseTourRequestsForLead(lead.id);
                setTourRequests(updatedRequests);
            }

            saveLeadActivity({
                leadId: lead.id,
                title: "Tour followed up",
                description: "Tour request was marked followed up.",
                category: "Tours",
            });
        } catch (error) {
            console.error(error);
            alert("Could not update this tour request. Please try again.");
        }
    };


    const cancelTourRequest = async (requestId) => {
        if (!lead) return;

        const requestToCancel = sortedTourRequests.find(
            (request) => request.id === requestId
        );

        const confirmed = window.confirm("Cancel this tour request?");

        if (!confirmed) return;

        try {
            if (isLocalLead) {
                deleteTourRequest(requestId);
                setTourRequests(getTourRequestsForLead(lead.id));
            } else {
                await deleteSupabaseTourRequest(requestId);
                const updatedRequests = await getSupabaseTourRequestsForLead(lead.id);
                setTourRequests(updatedRequests);
            }

            saveLeadActivity({
                leadId: lead.id,
                title: "Tour request canceled",
                description: `${requestToCancel?.propertyName || "A property"
                    } tour request was canceled.`,
                category: "Tours",
            });
        } catch (error) {
            console.error(error);
            alert("Could not cancel this tour request. Please try again.");
        }
    };

    const clearActivityTimeline = () => {
        if (!lead) return;

        const confirmed = window.confirm("Clear saved activity for this lead?");

        if (!confirmed) return;

        clearLeadActivities(lead.id);
        refreshLead();
    };

    if (isLoadingLead) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="text-3xl font-black text-slate-900">Loading lead...</h1>
                <p className="mt-2 text-slate-500">
                    Checking Supabase for this lead profile.
                </p>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="text-3xl font-black text-slate-900">Lead not found</h1>

                <p className="mt-2 text-slate-500">
                    This lead ID does not match any lead in your current data.
                </p>

                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <Link
                        to="/admin/leads"
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Leads
                    </Link>

                    <button
                        onClick={refreshLead}
                        className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                    >
                        Refresh Lead
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Link
                to="/admin/leads"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Leads
            </Link>

            <div className="mt-6 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
                <p className="text-sm font-bold text-slate-300">Lead Profile</p>

                <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <h1 className="text-4xl font-black">{lead.name}</h1>
                        <p className="mt-2 text-slate-300">{lead.preference}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-4 py-2 text-sm font-bold ${getStatusClasses(lead.status)}`}>
                            {lead.status}
                        </span>

                        <span className={`rounded-full px-4 py-2 text-sm font-bold ${getPriorityClasses(lead.priority)}`}>
                            {lead.priority} Priority
                        </span>

                        {hasTourFollowUpNeeded && (
                            <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                                Tour Follow-up Needed
                            </span>
                        )}

                        {sortedTourRequests.length > 0 && (
                            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200">
                                {sortedTourRequests.length} Tour {sortedTourRequests.length === 1 ? "Request" : "Requests"}
                            </span>
                        )}

                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200">
                            {recommendationCount} recommended{" "}
                            {recommendationCount === 1 ? "property" : "properties"}
                        </span>

                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-slate-200">
                            {activityEvents.length} {activityEvents.length === 1 ? "Activity" : "Activities"}
                        </span>

                        {/*Lead Recommendation*/}
                        {recommendationCount === 0 && (
                            <Link
                                to={`/admin/leads/${lead.id}/send-properties`}
                                className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-200"
                            >
                                Needs Recommendations
                            </Link>
                        )}
                    </div>


                </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
                <section className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900">
                            Search Preferences
                        </h2>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <InfoCard icon={User} label="Bedrooms" value={lead.bedrooms} />
                            <InfoCard icon={CalendarDays} label="Move-in" value={lead.moveIn} />
                            <InfoCard icon={Send} label="Budget" value={lead.budget} />
                            <InfoCard icon={MessageSquare} label="Contact Method" value={lead.contactMethod || "Not selected"} />
                            {lead.sourcePropertyName && (
                                <InfoCard
                                    icon={Send}
                                    label="Interested Property"
                                    value={lead.sourcePropertyName}
                                />
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900">
                            Recommended Properties
                        </h2>

                        <p className="mt-1 text-slate-500">
                            {recommendedProperties.length} properties currently attached to this lead.
                        </p>

                        <div className="mt-5 space-y-3">
                            {recommendedProperties.length > 0 ? (
                                recommendedProperties.map((property) => (
                                    <div
                                        key={property.id}
                                        className="flex flex-col justify-between gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center"
                                    >
                                        <div>
                                            <p className="font-black text-slate-900">
                                                {property.name}
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                {property.area} - {property.special}
                                            </p>
                                        </div>

                                        <Link
                                            to={`/properties/${property.id}`}
                                            className="rounded-xl bg-slate-950 px-4 py-2 text-center text-sm font-bold text-white hover:bg-slate-800"
                                        >
                                            View
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                    <p className="font-bold text-slate-900">
                                        No properties selected yet
                                    </p>

                                    <p className="mt-2 text-sm text-slate-500">
                                        Send properties to build this renter's recommendation list.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900">
                            Tour Requests
                        </h2>

                        <p className="mt-1 text-slate-500">
                            {sortedTourRequests.length} renter tour request
                            {sortedTourRequests.length === 1 ? "" : "s"} recorded.                        </p>

                        <div className="mt-5 space-y-3">
                            {sortedTourRequests.length > 0 ? (
                                sortedTourRequests.map((request) => (
                                    <div
                                        key={`${request.propertyId}-${request.createdAt}`}
                                        className="rounded-2xl bg-slate-50 p-4"
                                    >
                                        <p className="font-black text-slate-900">
                                            {request.propertyName}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Requested {new Date(request.createdAt).toLocaleString()}
                                        </p>

                                        <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                                            <p>
                                                <span className="font-bold text-slate-900">Preferred date:</span>{" "}
                                                {request.preferredDate || "Not provided"}
                                            </p>

                                            <p>
                                                <span className="font-bold text-slate-900">Preferred time:</span>{" "}
                                                {request.preferredTime || "Not provided"}
                                            </p>

                                            <div>
                                                <span className="font-bold text-slate-900">Status:</span>{" "}
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-bold ${(request.status || "New") !== "Followed Up"
                                                        ? "bg-slate-200 text-slate-700"
                                                        : "bg-emerald-100 text-emerald-700"
                                                        }`}
                                                >
                                                    {request.status || "New"}
                                                </span>
                                            </div>

                                            {request.followedUpAt && (
                                                <p>
                                                    <span className="font-bold text-slate-900">Followed up:</span>{" "}
                                                    {new Date(request.followedUpAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>

                                        {request.message && (
                                            <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-700">
                                                {request.message}
                                            </p>
                                        )}

                                        <Link
                                            to={`/admin/leads/${lead.id}/message`}
                                            className={`mt-4 inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-bold ${(request.status || "New") !== "Followed Up"
                                                ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                                                }`}
                                        >
                                            {(request.status || "New") !== "Followed Up"
                                                ? "View Follow-Up Message"
                                                : "Message About Tour"}
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() => markTourFollowedUp(request.id)}
                                            disabled={(request.status || "New") === "Followed Up"}
                                            className="mt-4 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                        >
                                            {(request.status || "New") === "Followed Up"
                                                ? "Tour Followed Up"
                                                : "Mark Tour Followed Up"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => cancelTourRequest(request.id)}
                                            className="ml-3 mt-4 inline-flex items-center justify-center rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
                                        >
                                            Cancel Request
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                    <p className="font-bold text-slate-900">
                                        No tour requests yet
                                    </p>

                                    <p className="mt-2 text-sm text-slate-500">
                                        Tour requests will appear here after a renter clicks Request Tour.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        id="activity-timeline"
                        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">
                                    Activity Timeline
                                </h2>

                                <p className="mt-1 text-slate-500">
                                    Recent lead activity, tour updates, and admin changes.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {["All", "Tours", "Admin"].map((filter) => (
                                    <button
                                        key={filter}
                                        type="button"
                                        onClick={() => setActivityFilter(filter)}
                                        className={`rounded-2xl px-4 py-2 text-sm font-bold ${activityFilter === filter
                                            ? "bg-slate-950 text-white"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                    >
                                        {filter}
                                    </button>
                                ))}

                                {savedActivityEvents.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearActivityTimeline}
                                        className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                                    >
                                        Clear Saved Activity
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 space-y-4">
                            {filteredActivityEvents.length > 0 ? (
                                filteredActivityEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className="border-l-4 border-slate-200 pl-4"
                                    >

                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-black text-slate-900">{event.title}</p>

                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-bold ${event.category === "Tours"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-slate-100 text-slate-600"
                                                    }`}
                                            >
                                                {event.category || "Admin"}
                                            </span>
                                        </div>

                                        <p className="mt-1 text-sm text-slate-600">
                                            {event.description}
                                        </p>

                                        <p className="mt-1 text-xs font-bold uppercase text-slate-400">
                                            {formatActivityDate(event.createdAt)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                    <p className="font-bold text-slate-900">No activity yet</p>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Activity will appear as this lead is updated.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Notes</h2>

                                <p className="mt-1 text-slate-500">
                                    Keep renter preferences, follow-up details, and tour notes here.
                                </p>
                            </div>


                        </div>

                        <>
                            <textarea
                                value={notesDraft}
                                onChange={(event) => setNotesDraft(event.target.value)}
                                rows={6}
                                className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700 outline-none focus:border-slate-400"
                            />

                            <button
                                onClick={saveNotes}
                                className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                            >
                                Save Notes
                            </button>
                        </>
                    </div>
                </section>

                <aside className="space-y-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900">
                            Contact Info
                        </h2>

                        <div className="mt-5 space-y-3">
                            <ContactRow icon={Phone} label="Phone" value={lead.phone} />
                            <ContactRow icon={Mail} label="Email" value={lead.email} />
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900">
                            Actions
                        </h2>

                        <div className="mt-5 flex flex-col gap-3">
                            <Link
                                to={`/admin/leads/${lead.id}/send-properties`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                            >
                                <Send className="h-4 w-4" />
                                Send Properties
                            </Link>

                            <Link
                                to={`/admin/leads/${lead.id}/message`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                            >
                                <MessageSquare className="h-4 w-4" />
                                Message Lead
                            </Link>

                            <Link
                                to={`/r/${lead.token}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-200"
                            >
                                Preview Renter Link
                            </Link>
                            {isLocalLead && (
                                <button
                                    onClick={deleteLead}
                                    className="inline-flex items-center justify-center rounded-2xl bg-red-100 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-200"
                                >
                                    Delete Local Lead
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900">
                            Lead Status
                        </h2>

                        <div className="mt-5 grid gap-3">
                            {["New Lead", "Tour Needed", "Recommendation Sent"].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => updateStatus(status)}
                                    className={`rounded-2xl px-4 py-3 text-sm font-bold ${lead.status === status
                                        ? "bg-slate-950 text-white"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-2xl font-black text-slate-900">
                            Assignment
                        </h2>

                        <div className="mt-5 space-y-3">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <label className="text-sm font-semibold text-slate-500">
                                    Assigned To
                                </label>

                                <input
                                    type="text"
                                    value={assignedToDraft}
                                    onChange={(event) => setAssignedToDraft(event.target.value)}
                                    placeholder="Jalen McNeal"
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-slate-400"
                                />

                                <button
                                    onClick={saveAssignment}
                                    className="mt-3 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                                >
                                    Save Assignment
                                </button>
                            </div>

                            <SimpleRow label="Source" value={lead.source} />
                            {lead.sourcePropertyName && (
                                <SimpleRow label="Source Property" value={lead.sourcePropertyName} />
                            )}
                            <SimpleRow label="Last Touch" value={lead.lastTouch} />
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-500">Priority</p>

                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    {["Low", "Medium", "High"].map((priority) => (
                                        <button
                                            key={priority}
                                            onClick={() => updatePriority(priority)}
                                            className={`rounded-xl px-3 py-2 text-sm font-bold ${lead.priority === priority
                                                ? "bg-slate-950 text-white"
                                                : "bg-white text-slate-700 hover:bg-slate-100"
                                                }`}
                                        >
                                            {priority}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function InfoCard({ icon: Icon, label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <Icon className="h-5 w-5 text-slate-700" />
            <p className="mt-3 text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-1 font-black text-slate-900">{value}</p>
        </div>
    );
}

function ContactRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Icon className="h-5 w-5 text-slate-700" />
            </div>

            <div>
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="font-black text-slate-900">{value}</p>
            </div>
        </div>
    );
}

function SimpleRow({ label, value }) {
    return (
        <div className="flex justify-between gap-4 rounded-2xl bg-slate-50 p-4">
            <span className="text-sm font-semibold text-slate-500">{label}</span>
            <span className="text-right text-sm font-black text-slate-900">
                {value}
            </span>
        </div>
    );
}

function getStatusClasses(status) {
    if (status === "New Lead") return "bg-emerald-100 text-emerald-700";
    if (status === "Tour Needed") return "bg-amber-100 text-amber-700";
    if (status === "Recommendation Sent") return "bg-indigo-100 text-indigo-700";

    return "bg-slate-200 text-slate-700";
}

function getPriorityClasses(priority) {
    if (priority === "High") return "bg-red-100 text-red-700";
    if (priority === "Medium") return "bg-amber-100 text-amber-700";
    if (priority === "Low") return "bg-slate-100 text-slate-700";

    return "bg-slate-200 text-slate-700";
}

function formatActivityDate(dateValue) {
    if (!dateValue) return "Recently";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleString();
}
