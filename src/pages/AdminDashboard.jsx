import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataHistory, leads } from "../data/mockData";
import { getAllProperties } from "../data/propertyStorage";
import { getAllLeads, getStoredTourRequests } from "../data/leadStorage";
import { getSupabaseLeads } from "../data/supabaseLeadStorage";
import { getSupabaseLeadEvents } from "../data/supabaseLeadEvents";
import { getSupabaseTourRequestsForLead } from "../data/supabaseTourStorage";
import {
    isLocalFallbackEnabled,
    localFallbackMessage,
} from "../data/supabaseClient";
import {
    Building2,
    Users,
    Send,
    Clock3,
    Plus,
    History,
    BadgeCheck,
    Megaphone,
    Trophy,
} from "lucide-react";



const quickActions = [
    {
        icon: Plus,
        title: "Add Property",
        description: "Create a new property listing.",
        to: "/admin/properties/new",
    },
    {
        icon: Users,
        title: "Add Lead",
        description: "Create a new renter lead.",
        to: "/admin/leads",
    },
    {
        icon: History,
        title: "View Data History",
        description: "Review recent database changes.",
        to: "/admin/data-history",
    },
];



const systemStatus = [
    {
        label: "Database",
        value: "Not Connected",
    },
    {
        label: "Cloudflare",
        value: "Ready",
    },
    {
        label: "Environment",
        value: "Development",
    },
    {
        label: "Version",
        value: "0.1.0",
    },
];

export default function AdminDashboard() {
    const [properties, setProperties] = useState([]);
    const [dashboardLeads, setDashboardLeads] = useState(
        isLocalFallbackEnabled ? leads : []
    );
    const [dashboardTourRequests, setDashboardTourRequests] = useState(
        isLocalFallbackEnabled ? getStoredTourRequests() : []
    );
    const [dashboardLeadEvents, setDashboardLeadEvents] = useState([]);
    const [dashboardLoadedAt, setDashboardLoadedAt] = useState(null);
    const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
    const [dashboardError, setDashboardError] = useState("");
    const [isUsingFallbackDashboardData, setIsUsingFallbackDashboardData] =
        useState(false);
    const loadDashboardData = async ({ prepareLoad = true } = {}) => {
        if (prepareLoad) {
            setIsLoadingDashboard(true);
            setDashboardError("");
        }

        try {
            const [supabaseLeads, supabaseProperties, supabaseLeadEvents] = await Promise.all([
                getSupabaseLeads(),
                getAllProperties(),
                getSupabaseLeadEvents({ limit: 50 }),
            ]);

            const tourRequestGroups = await Promise.all(
                supabaseLeads.map((lead) => getSupabaseTourRequestsForLead(lead.id))
            );

            setProperties(supabaseProperties);
            setDashboardLeads(supabaseLeads);
            setDashboardTourRequests(tourRequestGroups.flat());
            setDashboardLeadEvents(supabaseLeadEvents);
            setIsUsingFallbackDashboardData(false);
            setDashboardLoadedAt(new Date());
        } catch (error) {
            console.error(error);

            if (isLocalFallbackEnabled) {
                setProperties([]);
                setDashboardLeads(getAllLeads());
                setDashboardTourRequests(getStoredTourRequests());
                setDashboardLeadEvents([]);
                setIsUsingFallbackDashboardData(true);
                setDashboardError(localFallbackMessage);
            } else {
                setProperties([]);
                setDashboardLeads([]);
                setDashboardTourRequests([]);
                setDashboardLeadEvents([]);
                setIsUsingFallbackDashboardData(false);
                setDashboardError("Supabase could not be reached. Check the production connection.");
            }

            setDashboardLoadedAt(new Date());
        } finally {
            setIsLoadingDashboard(false);
        }
    };
    useEffect(() => {
        const loadTimer = window.setTimeout(() => {
            loadDashboardData({ prepareLoad: false });
        }, 0);

        return () => window.clearTimeout(loadTimer);
    }, []);

    const activeDashboardLeads = dashboardLeads.filter(
        (lead) => lead.status !== "Archived"
    );
    const recommendationCount = activeDashboardLeads.filter(
        (lead) => (lead.recommendedPropertyIds?.length || 0) > 0
    ).length;
    const googleAdsLeadCount = activeDashboardLeads.filter(
        (lead) => lead.source === "Google Ads"
    ).length;
    const qualifiedLeadCount = activeDashboardLeads.filter(
        (lead) => lead.quality === "Qualified"
    ).length;
    const convertedLeadCount = activeDashboardLeads.filter(
        (lead) => lead.quality === "Converted"
    ).length;
    const conversionRate = googleAdsLeadCount
        ? Math.round((convertedLeadCount / googleAdsLeadCount) * 100)
        : 0;
    const livePropertyCount = properties.filter(
        (property) => property.status === "Live"
    ).length;
    const leadSubmittedEventCount = dashboardLeadEvents.filter(
        (event) => event.eventType === "lead_submitted"
    ).length;
    const renterLinkOpenedEventCount = dashboardLeadEvents.filter(
        (event) => event.eventType === "renter_link_opened"
    ).length;
    const recommendationSentEventCount = dashboardLeadEvents.filter(
        (event) => event.eventType === "recommendation_sent"
    ).length;
    const tourRequestedEventCount = dashboardLeadEvents.filter(
        (event) => event.eventType === "tour_requested"
    ).length;
    const conversionStats = [
        {
            icon: Users,
            title: "Leads Submitted",
            value: leadSubmittedEventCount,
            subtitle: "Start form conversions",
        },
        {
            icon: Megaphone,
            title: "Renter Links Opened",
            value: renterLinkOpenedEventCount,
            subtitle: "Recommendation page visits",
        },
        {
            icon: Send,
            title: "Recommendations Sent",
            value: recommendationSentEventCount,
            subtitle: "Saved recommendation events",
        },
        {
            icon: Clock3,
            title: "Tours Requested",
            value: tourRequestedEventCount,
            subtitle: "Renter tour actions",
        },
    ];

    const dashboardStats = [
        {
            icon: Building2,
            title: "Properties",
            value: properties.length,
            subtitle: `${livePropertyCount} live listings`,
        },
        {
            icon: Users,
            title: "Leads",
            value: activeDashboardLeads.length,
            subtitle: "Active renter leads",
        },
        {
            icon: Send,
            title: "Recommendations",
            value: recommendationCount,
            subtitle: "Renter lists prepared",
        },
        {
            icon: Clock3,
            title: "Updates",
            value: dataHistory.length,
            subtitle: "Recent data events",
        },
        {
            icon: Megaphone,
            title: "Google Ads Leads",
            value: googleAdsLeadCount,
            subtitle: "Paid search requests",
        },
        {
            icon: BadgeCheck,
            title: "Qualified Leads",
            value: qualifiedLeadCount,
            subtitle: "Marked good fit",
        },
        {
            icon: Trophy,
            title: "Conversion Rate",
            value: `${conversionRate}%`,
            subtitle: "Converted / Google Ads",
        },
    ];

    const topProperties = properties.map((property) => ({
        name: property.name,
        area: property.area,
        leads: `${dashboardLeads.filter((lead) =>
            lead.recommendedPropertyIds?.includes(property.id)
        ).length} leads`,
        special: property.special,
    }));

    const tourFollowUpCount = dashboardTourRequests.filter(
        (request) => (request.status || "New") !== "Followed Up"
    ).length;

    const tourRequestCount = dashboardTourRequests.length;

    const recentTourActivities = [...dashboardTourRequests]
        .sort((a, b) =>
            String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
        )
        .slice(0, 3)
        .map((request) => ({
            title: "Tour requested",
            description: `${request.leadName} requested ${request.propertyName}`,
            time: request.createdAt
                ? new Date(request.createdAt).toLocaleString()
                : "Just now",
        }));

    const recentActivities = [
        ...recentTourActivities,
        ...dataHistory.slice(0, 3).map((event) => ({
            title: event.type,
            description: event.description,
            time: event.time,
        })),
    ].slice(0, 5);
    const recentConversionActivities = dashboardLeadEvents.slice(0, 5);

    const performanceSteps = [
        {
            label: "Recommendations Sent",
            value: activeDashboardLeads.filter(
                (lead) => lead.status === "Recommendation Sent"
            ).length,
        },
        {
            label: "Properties Viewed",
            value: "0",
        },
        {
            label: "Tours Requested",
            value: tourRequestCount,
        },
        {
            label: "Move-ins",
            value: "0",
        },
    ];


    const dashboardStatsWithTours = [
        ...dashboardStats,
        {
            icon: Clock3,
            title: "Tour Follow-ups",
            value: tourFollowUpCount,
            subtitle: "Click to review",
            to: "/admin/leads?tourFilter=Not%20Followed%20Up",
        },
    ];

    const recentLeads = activeDashboardLeads.slice(0, 5).map((lead) => ({
        name: lead.name,
        preference: lead.preference,
        status: lead.status,
    }));
    const hasNoSupabaseLeads =
        !isLoadingDashboard &&
        !dashboardError &&
        !isUsingFallbackDashboardData &&
        dashboardLeads.length === 0;
    const priorityItems = [
        {
            label: "Tour follow-ups",
            value: tourFollowUpCount,
            detail: tourFollowUpCount
                ? "Review renters waiting on tour follow-up."
                : "No tour follow-ups waiting right now.",
            to: "/admin/leads?tourFilter=Not%20Followed%20Up",
        },
        {
            label: "Active leads",
            value: activeDashboardLeads.length,
            detail: "Open renter conversations to manage.",
            to: "/admin/leads",
        },
        {
            label: "Live listings",
            value: livePropertyCount,
            detail: "Properties visible to renters.",
            to: "/admin/properties",
        },
    ];


    return (
        <div className="mx-auto w-full max-w-7xl space-y-5 text-left">
            <section className="overflow-hidden rounded-3xl bg-[#102426] text-white shadow-sm">
                <div className="grid gap-5 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                    <div className="min-w-0">
                        <p className="text-sm font-black text-[#f2b84b]">
                            Admin Dashboard
                        </p>
                        <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-[#fff7df] md:text-4xl">
                            Today's operating snapshot
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#d7ece6]">
                            Track renter activity, property readiness, tours, and recommendation flow from one focused workspace.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {dashboardLoadedAt && (
                                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#d7ece6]">
                                    Refreshed {dashboardLoadedAt.toLocaleTimeString()}
                                </span>
                            )}
                            {isUsingFallbackDashboardData && (
                                <span className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-bold text-[#8a5b0a]">
                                    Local fallback data
                                </span>
                            )}
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#d7ece6]">
                                {livePropertyCount} live listings
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:w-48 lg:grid-cols-1">
                        <button
                            type="button"
                            onClick={loadDashboardData}
                            disabled={isLoadingDashboard}
                            className="min-h-12 rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783] disabled:cursor-not-allowed disabled:bg-[#d7e6df] disabled:text-[#78908a]"
                        >
                            {isLoadingDashboard ? "Refreshing..." : "Refresh Dashboard"}
                        </button>
                        <Link
                            to="/admin/properties/new"
                            className="flex min-h-12 items-center justify-center rounded-2xl bg-white/10 px-5 py-3 text-center text-sm font-bold text-white hover:bg-white/15"
                        >
                            Add Property
                        </Link>
                    </div>
                </div>

                {dashboardError && (
                    <p className="mx-5 mb-5 rounded-2xl bg-[#fff8e6] px-4 py-3 text-sm font-bold text-[#8a5b0a] md:mx-6 md:mb-6">
                        {dashboardError}
                    </p>
                )}
            </section>

            {hasNoSupabaseLeads && (
                <section className="rounded-3xl border border-dashed border-[#a9cfc2] bg-white p-5 shadow-sm">
                    <p className="text-sm font-black text-[#102426]">
                        No Supabase leads yet.
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#526260]">
                        Create a test lead from the Leads page or submit the public start form to verify the production data loop.
                    </p>
                </section>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {dashboardStatsWithTours.map((stat) => (
                    <DashboardCard
                        key={stat.title}
                        icon={stat.icon}
                        title={stat.title}
                        value={stat.value}
                        subtitle={stat.subtitle}
                        to={stat.to}
                    />
                ))}
            </section>

            <DashboardPanel
                eyebrow="Conversions"
                title="Lead event tracking"
                description="See what renters do after they find you from ads, search, or shared recommendation links."
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {conversionStats.map((stat) => (
                            <ConversionStatCard
                                key={stat.title}
                                icon={stat.icon}
                                title={stat.title}
                                value={stat.value}
                                subtitle={stat.subtitle}
                            />
                        ))}
                    </div>

                    <div className="rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]">
                        <p className="text-sm font-black text-[#102426]">
                            Recent conversion activity
                        </p>

                        <div className="mt-3 grid gap-3">
                            {recentConversionActivities.length > 0 ? (
                                recentConversionActivities.map((event) => (
                                    <ConversionEventItem
                                        key={event.id}
                                        event={event}
                                    />
                                ))
                            ) : (
                                <p className="rounded-2xl border border-dashed border-[#a9cfc2] bg-white p-4 text-sm font-bold text-[#526260]">
                                    No tracked conversion events yet.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </DashboardPanel>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <DashboardPanel
                    eyebrow="Work Queue"
                    title="Today's priorities"
                    actionLabel="Open Leads"
                    actionTo="/admin/leads"
                    className="xl:col-span-5"
                >
                    <div className="grid gap-3">
                        {priorityItems.map((item) => (
                            <PriorityItem key={item.label} item={item} />
                        ))}
                    </div>
                </DashboardPanel>

                <DashboardPanel
                    eyebrow="Activity"
                    title="Latest updates"
                    actionLabel="Data History"
                    actionTo="/admin/data-history"
                    className="xl:col-span-7"
                >
                    <div className="grid gap-3">
                        {recentActivities.map((activity, index) => (
                            <ActivityItem
                                key={`${activity.title}-${activity.time}-${index}`}
                                title={activity.title}
                                description={activity.description}
                                time={activity.time}
                            />
                        ))}
                    </div>
                </DashboardPanel>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <DashboardPanel
                    eyebrow="Renters"
                    title="Recent active leads"
                    actionLabel="View All Leads"
                    actionTo="/admin/leads"
                    actionStyle="dark"
                    className="xl:col-span-5"
                >
                    <div className="grid gap-3">
                        {recentLeads.length > 0 ? (
                            recentLeads.map((lead) => (
                                <RecentLead
                                    key={`${lead.name}-${lead.preference}`}
                                    name={lead.name}
                                    preference={lead.preference}
                                    status={lead.status}
                                />
                            ))
                        ) : (
                            <EmptyPanel message="No active leads to show right now." />
                        )}
                    </div>
                </DashboardPanel>

                <DashboardPanel
                    eyebrow="Properties"
                    title="Lead interest by property"
                    actionLabel="View Properties"
                    actionTo="/admin/properties"
                    actionStyle="dark"
                    className="xl:col-span-7"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        {topProperties.slice(0, 4).map((property) => (
                            <TopProperty
                                key={property.name}
                                name={property.name}
                                area={property.area}
                                leads={property.leads}
                                special={property.special}
                            />
                        ))}
                    </div>
                </DashboardPanel>
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <DashboardPanel
                    title="Performance pipeline"
                    description="Track movement from recommendations to tours and move-ins."
                    className="xl:col-span-7"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        {performanceSteps.map((step) => (
                            <PerformanceStep
                                key={step.label}
                                label={step.label}
                                value={step.value}
                            />
                        ))}
                    </div>
                </DashboardPanel>

                <DashboardPanel
                    title="Quick actions"
                    description="Common admin tasks."
                    className="xl:col-span-5"
                >
                    <div className="grid gap-3">
                        {quickActions.map((action) => (
                            <QuickAction
                                key={action.title}
                                icon={action.icon}
                                title={action.title}
                                description={action.description}
                                to={action.to}
                            />
                        ))}
                    </div>
                </DashboardPanel>
            </section>

            <DashboardPanel
                title="System overview"
                description="Platform connection and deployment status."
                actionLabel="Review Listings"
                actionTo="/admin/properties"
                actionStyle="gold"
            >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {systemStatus.map((item) => (
                        <SystemStatusCard
                            key={item.label}
                            label={item.label}
                            value={item.value}
                        />
                    ))}
                </div>
            </DashboardPanel>
        </div>
    );
}

function ConversionStatCard({ icon: Icon, title, value, subtitle }) {
    return (
        <div className="min-h-[150px] min-w-0 rounded-2xl bg-white p-4 ring-1 ring-[#d7e6df]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e7f3ee]">
                <Icon className="h-5 w-5 text-[#1f6f63]" />
            </div>

            <p className="mt-4 text-sm font-bold leading-5 text-[#526260]">
                {title}
            </p>
            <p className="mt-2 text-3xl font-black text-[#102426]">
                {value}
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-[#78908a]">
                {subtitle}
            </p>
        </div>
    );
}

function ConversionEventItem({ event }) {
    return (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-[#d7e6df]">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                    <p className="text-sm font-black text-[#102426]">
                        {getLeadEventLabel(event.eventType)}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-[#526260]">
                        {getLeadEventDescription(event)}
                    </p>
                </div>

                <span className="text-xs font-bold text-[#78908a] sm:text-right">
                    {formatLeadEventTime(event.createdAt)}
                </span>
            </div>
        </div>
    );
}

function getLeadEventLabel(eventType) {
    const eventLabels = {
        lead_submitted: "Lead submitted",
        recommendation_sent: "Recommendation saved",
        renter_link_opened: "Renter link opened",
        tour_requested: "Tour requested",
    };

    return eventLabels[eventType] || "Lead activity";
}

function getLeadEventDescription(event) {
    if (event.eventType === "tour_requested") {
        return event.propertyName
            ? `Tour requested for ${event.propertyName}.`
            : "A renter requested a tour.";
    }

    if (event.eventType === "recommendation_sent") {
        const propertyCount = event.metadata?.propertyCount || 0;
        const floorPlanCount = event.metadata?.floorPlanCount || 0;

        return `${propertyCount} properties and ${floorPlanCount} floor plans saved.`;
    }

    if (event.eventType === "renter_link_opened") {
        const propertyCount = event.metadata?.recommendedPropertyCount || 0;

        return `${propertyCount} recommended properties viewed.`;
    }

    if (event.eventType === "lead_submitted") {
        return event.metadata?.utmCampaign
            ? `Lead came from ${event.metadata.utmCampaign}.`
            : "A renter submitted the start form.";
    }

    return event.propertyName || "A lead event was tracked.";
}

function formatLeadEventTime(createdAt) {
    if (!createdAt) return "Just now";

    return new Date(createdAt).toLocaleString();
}

function DashboardCard({ icon: Icon, title, value, subtitle, to }) {
    const cardContent = (
        <>
            <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7f3ee]">
                    <Icon className="h-6 w-6 text-[#1f6f63]" />
                </div>

                <span className="rounded-full bg-[#f5f8f1] px-3 py-1 text-xs font-bold text-[#526260] ring-1 ring-[#d7e6df]">
                    {to ? "Open" : "Active"}
                </span>
            </div>

            <p className="mt-5 text-sm font-bold text-[#526260]">{title}</p>
            <h2 className="mt-2 text-3xl font-black leading-none text-[#102426] md:text-4xl">{value}</h2>
            <p className="mt-2 text-sm font-semibold leading-5 text-[#526260]">{subtitle}</p>
        </>
    );

    if (to) {
        return (
            <Link
                to={to}
                className="block min-h-[180px] min-w-0 rounded-3xl border border-[#d7e6df] bg-white p-5 shadow-sm hover:border-[#f2b84b] hover:shadow-md"
            >
                {cardContent}
            </Link>
        );
    }

    return (
        <div className="min-h-[180px] min-w-0 rounded-3xl border border-[#d7e6df] bg-white p-5 shadow-sm">
            {cardContent}
        </div>
    );
}

function DashboardPanel({
    eyebrow,
    title,
    description,
    actionLabel,
    actionTo,
    actionStyle = "soft",
    className = "",
    children,
}) {
    const actionClasses = {
        soft: "bg-[#e7f3ee] text-[#173f3f] hover:bg-[#d7e6df]",
        dark: "bg-[#173f3f] text-white hover:bg-[#102426]",
        gold: "bg-[#f2b84b] text-[#102426] hover:bg-[#f9d783]",
    };

    return (
        <section className={`min-w-0 rounded-3xl border border-[#d7e6df] bg-white p-5 shadow-sm md:p-6 ${className}`}>
            <div className="mb-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                    {eyebrow && (
                        <p className="text-sm font-black text-[#1f6f63]">
                            {eyebrow}
                        </p>
                    )}
                    <h2 className="mt-1 text-2xl font-black leading-tight text-[#102426]">
                        {title}
                    </h2>
                    {description && (
                        <p className="mt-1 text-sm font-semibold leading-6 text-[#526260]">
                            {description}
                        </p>
                    )}
                </div>

                {actionLabel && actionTo && (
                    <Link
                        to={actionTo}
                        className={`flex min-h-11 w-fit items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold ${actionClasses[actionStyle]}`}
                    >
                        {actionLabel}
                    </Link>
                )}
            </div>

            {children}
        </section>
    );
}

function PriorityItem({ item }) {
    return (
        <Link
            to={item.to}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl bg-[#f5f8f1] p-4 text-left ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
        >
            <div className="min-w-0">
                <p className="text-sm font-black text-[#102426]">
                    {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold leading-5 text-[#526260]">
                    {item.detail}
                </p>
            </div>
            <span className="shrink-0 rounded-2xl bg-white px-4 py-2 text-xl font-black text-[#173f3f] ring-1 ring-[#d7e6df]">
                {item.value}
            </span>
        </Link>
    );
}

function EmptyPanel({ message }) {
    return (
        <div className="rounded-2xl border border-dashed border-[#a9cfc2] bg-[#f5f8f1] p-5 text-sm font-bold text-[#526260]">
            {message}
        </div>
    );
}

function ActivityItem({ title, description, time }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0">
                    <p className="font-bold text-[#102426]">{title}</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-[#526260]">{description}</p>
                </div>

                <span className="text-xs font-bold text-[#78908a] md:text-right">{time}</span>
            </div>
        </div>
    );
}

function QuickAction({ icon: Icon, title, description, to }) {
    return (
        <Link
            to={to}
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-2xl bg-[#f5f8f1] p-4 text-left ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
        >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                <Icon className="h-5 w-5 text-[#1f6f63]" />
            </div>

            <div className="min-w-0">
                <p className="font-bold text-[#102426]">{title}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-[#526260]">{description}</p>
            </div>
        </Link>
    );
}

function PerformanceStep({ label, value }) {
    return (
        <div className="min-h-[130px] rounded-2xl bg-[#f5f8f1] p-5 ring-1 ring-[#d7e6df]">
            <p className="min-h-[40px] text-sm font-semibold leading-5 text-[#526260]">
                {label}
            </p>

            <p className="mt-3 text-3xl font-black text-[#102426]">
                {value}
            </p>
        </div>
    );
}

function RecentLead({ name, preference, status }) {
    return (
        <div className="grid min-w-0 gap-3 rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
                <p className="font-bold text-[#102426]">{name}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-[#526260]">{preference}</p>
            </div>

            <span className="w-fit rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#174a7c]">
                {status}
            </span>
        </div>
    );
}

function TopProperty({ name, area, leads, special }) {
    return (
        <div className="min-h-[170px] min-w-0 rounded-2xl bg-[#f5f8f1] p-5 ring-1 ring-[#d7e6df]">
            <p className="truncate text-lg font-black leading-tight text-[#102426]">
                {name}
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-[#526260]">
                {area}
            </p>

            <div className="mt-5 flex flex-col gap-2">
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-[#173f3f] ring-1 ring-[#d7e6df]">
                    {leads}
                </span>

                <span className="max-w-full rounded-full bg-[#d8efe6] px-3 py-1 text-xs font-bold leading-5 text-[#1f6f63]">
                    {special}
                </span>
            </div>
        </div>
    );
}


function SystemStatusCard({ label, value }) {
    return (
        <div className="min-h-[110px] rounded-2xl bg-[#f5f8f1] p-5 ring-1 ring-[#d7e6df]">
            <p className="text-sm font-semibold text-[#526260]">
                {label}
            </p>

            <p className="mt-3 text-lg font-black text-[#102426]">
                {value}
            </p>
        </div>
    );
}
