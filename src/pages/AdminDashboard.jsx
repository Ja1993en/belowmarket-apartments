import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dataHistory, leads } from "../data/mockData";
import { getAllProperties } from "../data/propertyStorage";
import { getAllLeads, getStoredTourRequests } from "../data/leadStorage";
import { getSupabaseLeads } from "../data/supabaseLeadStorage";
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

const setupChecklist = [
    {
        title: "Add your first property",
        to: "/admin/properties/new",
    },
    {
        title: "Create your first lead",
        to: "/admin/leads",
    },
    {
        title: "Send property recommendations",
        to: "/admin/leads/1/send-properties",
    },
    {
        title: "Connect database later",
        to: "/admin/data-history",
    },
];

export default function AdminDashboard() {
    const properties = getAllProperties();
    const [dashboardLeads, setDashboardLeads] = useState(
        isLocalFallbackEnabled ? leads : []
    );
    const [dashboardTourRequests, setDashboardTourRequests] = useState(
        isLocalFallbackEnabled ? getStoredTourRequests() : []
    );
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
            const supabaseLeads = await getSupabaseLeads();

            const tourRequestGroups = await Promise.all(
                supabaseLeads.map((lead) => getSupabaseTourRequestsForLead(lead.id))
            );

            setDashboardLeads(supabaseLeads);
            setDashboardTourRequests(tourRequestGroups.flat());
            setIsUsingFallbackDashboardData(false);
            setDashboardLoadedAt(new Date());
        } catch (error) {
            console.error(error);

            if (isLocalFallbackEnabled) {
                setDashboardLeads(getAllLeads());
                setDashboardTourRequests(getStoredTourRequests());
                setIsUsingFallbackDashboardData(true);
                setDashboardError(localFallbackMessage);
            } else {
                setDashboardLeads([]);
                setDashboardTourRequests([]);
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

    const dashboardStats = [
        {
            icon: Building2,
            title: "Properties",
            value: properties.length,
            subtitle: "Tracked properties",
        },
        {
            icon: Users,
            title: "Leads",
            value: dashboardLeads.length,
            subtitle: "Open renter leads",
        },
        {
            icon: Send,
            title: "Recommendations",
            value: dashboardLeads.filter(
                (lead) => (lead.recommendedPropertyIds?.length || 0) > 0
            ).length,
            subtitle: "Renter lists prepared",
        },
        {
            icon: Clock3,
            title: "Updates",
            value: dataHistory.length,
            subtitle: "Recent data events",
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

    const performanceSteps = [
        {
            label: "Recommendations Sent",
            value: dashboardLeads.filter(
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

    const recentLeads = dashboardLeads.slice(0, 5).map((lead) => ({
        name: lead.name,
        preference: lead.preference,
        status: lead.status,
    }));
    const hasNoSupabaseLeads =
        !isLoadingDashboard &&
        !dashboardError &&
        !isUsingFallbackDashboardData &&
        dashboardLeads.length === 0;


    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
                <h1 className="text-4xl font-black text-[#102426]">
                    Dashboard
                </h1>

                <p className="mt-2 font-semibold text-[#526260]">
                    Welcome back. Here's what's happening today.
                </p>

                {dashboardLoadedAt && (
                    <p className="mt-2 text-xs font-semibold text-[#78908a]">
                        Dashboard refreshed {dashboardLoadedAt.toLocaleTimeString()}
                    </p>
                )}

                {isLoadingDashboard && (
                    <p className="mt-2 text-sm font-bold text-[#526260]">
                        Loading dashboard data...
                    </p>
                )}

                {dashboardError && (
                    <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                        {dashboardError}
                    </p>
                )}

                {isUsingFallbackDashboardData && (
                    <p className="mt-2 text-xs font-semibold text-amber-600">
                        Local fallback dashboard mode is active.
                    </p>
                )}

                {hasNoSupabaseLeads && (
                    <div className="mt-4 rounded-2xl border border-dashed border-[#a9cfc2] bg-white px-5 py-4">
                        <p className="text-sm font-black text-[#102426]">
                            No Supabase leads yet.
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#526260]">
                            Create a test lead from the Leads page or submit the public start form to verify the production data loop.
                        </p>
                    </div>
                )}

            </div>

            <button
                type="button"
                onClick={loadDashboardData}
                disabled={isLoadingDashboard}
                className="rounded-2xl bg-[#e7f3ee] px-5 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df] disabled:cursor-not-allowed disabled:bg-[#d7e6df] disabled:text-[#78908a]"
            >
                {isLoadingDashboard ? "Refreshing..." : "Refresh Dashboard"}
            </button>
            </div>



            <div className="rounded-3xl bg-[#102426] p-6 text-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <p className="text-sm font-bold text-[#d7ece6]">
                            Platform Status
                        </p>

                        <h2 className="mt-2 text-2xl font-black text-[#fff7df]">
                            Your apartment platform is ready for setup.
                        </h2>

                        <p className="mt-2 text-sm font-semibold text-[#d7ece6]">
                            Start by adding properties, creating leads, and sending recommendations.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[#f2b84b] px-4 py-3 text-sm font-black text-[#102426]">
                        Setup Mode
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h2 className="text-2xl font-black text-[#102426]">
                            Setup Checklist
                        </h2>

                        <p className="mt-1 text-sm font-semibold text-[#526260]">
                            Complete these steps to get your apartment platform ready.
                        </p>
                    </div>

                    <span className="rounded-full bg-[#fff8e6] px-4 py-2 text-sm font-bold text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                        0 of 4 complete
                    </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                    {setupChecklist.map((item) => (
                        <ChecklistItem
                            key={item.title}
                            title={item.title}
                            to={item.to}
                        />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-5">
                {dashboardStatsWithTours.map((stat) => (<DashboardCard
                    key={stat.title}
                    icon={stat.icon}
                    title={stat.title}
                    value={stat.value}
                    subtitle={stat.subtitle}
                    to={stat.to}
                />
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-black text-[#102426]">Recent Activity</h2>

                    <p className="mt-1 text-sm font-semibold text-[#526260]">
                        Latest platform updates will appear here.
                    </p>

                    <div className="mt-6 space-y-4">
                        {recentActivities.map((activity, index) => (
                            <ActivityItem
                                key={`${activity.title}-${activity.time}-${index}`}
                                title={activity.title}
                                description={activity.description}
                                time={activity.time}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-dashed border-[#a9cfc2] bg-white p-8 text-center shadow-sm">
                    <h2 className="text-2xl font-black text-[#102426]">
                        No live data connected yet
                    </h2>

                    <p className="mx-auto mt-2 max-w-2xl font-semibold text-[#526260]">
                        Your dashboard is using placeholder numbers for now. Once Supabase is connected,
                        this section will automatically show real properties, leads, recommendations,
                        and update history.
                    </p>

                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                            to="/admin/properties/new"
                            className="rounded-2xl bg-[#173f3f] px-5 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                        >
                            Add Property
                        </Link>

                        <Link
                            to="/admin/leads"
                            className="rounded-2xl bg-[#e7f3ee] px-5 py-3 text-sm font-bold text-[#173f3f] hover:bg-[#d7e6df]"
                        >
                            Create Lead
                        </Link>
                    </div>
                </div>

                <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-black text-[#102426]">Quick Actions</h2>

                    <p className="mt-1 text-sm font-semibold text-[#526260]">
                        Common admin tasks.
                    </p>

                    <div className="mt-6 space-y-3">
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
                </div>

                <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-black text-[#102426]">
                                Performance Overview
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-[#526260]">
                                Track how leads move from recommendations to tours and move-ins.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4">
                        {performanceSteps.map((step) => (
                            <PerformanceStep
                                key={step.label}
                                label={step.label}
                                value={step.value}
                            />
                        ))}
                    </div>
                </div>


                <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-black text-[#102426]">
                                Recent Leads
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-[#526260]">
                                Latest renter leads submitted to your platform.
                            </p>
                        </div>

                        <Link
                            to="/admin/leads"
                            className="rounded-2xl bg-[#173f3f] px-4 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                        >
                            View All Leads
                        </Link>
                    </div>

                    <div className="mt-6 space-y-3">
                        {recentLeads.map((lead) => (
                            <RecentLead
                                key={lead.name}
                                name={lead.name}
                                preference={lead.preference}
                                status={lead.status}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm xl:col-span-2">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-black text-[#102426]">
                                Top Properties
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-[#526260]">
                                Properties getting the most lead interest.
                            </p>
                        </div>

                        <Link
                            to="/admin/properties"
                            className="rounded-2xl bg-[#173f3f] px-4 py-3 text-sm font-bold text-white hover:bg-[#102426]"
                        >
                            View All Properties
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        {topProperties.map((property) => (
                            <TopProperty
                                key={property.name}
                                name={property.name}
                                area={property.area}
                                leads={property.leads}
                                special={property.special}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl bg-[#102426] p-6 text-white shadow-sm xl:col-span-2">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-black text-[#fff7df]">
                                Keep listing data current
                            </h2>

                            <p className="mt-2 text-sm font-semibold text-[#d7ece6]">
                                Review property pricing, specials, photos, schools, and availability before renters see a listing.
                            </p>
                        </div>

                        <Link
                            to="/admin/properties"
                            className="rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
                        >
                            Review Properties
                        </Link>
                    </div>
                </div>

                <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm xl:col-span-2">
                    <h2 className="text-2xl font-black text-[#102426]">
                        System Overview
                    </h2>

                    <p className="mt-1 text-sm font-semibold text-[#526260]">
                        Current platform status.
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                        {systemStatus.map((item) => (
                            <SystemStatusCard
                                key={item.label}
                                label={item.label}
                                value={item.value}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardCard({ icon: Icon, title, value, subtitle, to }) {
    const cardContent = (
        <>
            <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f3ee]">
                    <Icon className="h-6 w-6 text-[#1f6f63]" />
                </div>

                <span className="rounded-full bg-[#f5f8f1] px-3 py-1 text-xs font-bold text-[#526260] ring-1 ring-[#d7e6df]">
                    {to ? "Open" : "Active"}
                </span>
            </div>

            <p className="mt-5 text-sm font-bold text-[#526260]">{title}</p>
            <h2 className="mt-2 text-4xl font-black text-[#102426]">{value}</h2>
            <p className="mt-2 text-sm font-semibold text-[#526260]">{subtitle}</p>
        </>
    );

    if (to) {
        return (
            <Link
                to={to}
                className="block rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm hover:border-[#f2b84b] hover:shadow-md"
            >
                {cardContent}
            </Link>
        );
    }

    return (
        <div className="rounded-3xl border border-[#d7e6df] bg-white p-6 shadow-sm">
            {cardContent}
        </div>
    );
}

function ActivityItem({ title, description, time }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-bold text-[#102426]">{title}</p>
                    <p className="mt-1 text-sm font-semibold text-[#526260]">{description}</p>
                </div>

                <span className="text-xs font-bold text-[#78908a]">{time}</span>
            </div>
        </div>
    );
}

function QuickAction({ icon: Icon, title, description, to }) {
    return (
        <Link
            to={to}
            className="flex w-full items-center gap-4 rounded-2xl bg-[#f5f8f1] p-4 text-left ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
        >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                <Icon className="h-5 w-5 text-[#1f6f63]" />
            </div>

            <div>
                <p className="font-bold text-[#102426]">{title}</p>
                <p className="mt-1 text-sm font-semibold text-[#526260]">{description}</p>
            </div>
        </Link>
    );
}

function PerformanceStep({ label, value }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-5 ring-1 ring-[#d7e6df]">
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
        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df] md:flex-row md:items-center">
            <div>
                <p className="font-bold text-[#102426]">{name}</p>
                <p className="mt-1 text-sm font-semibold text-[#526260]">{preference}</p>
            </div>

            <span className="rounded-full bg-[#eef5ff] px-3 py-1 text-xs font-bold text-[#174a7c]">
                {status}
            </span>
        </div>
    );
}

function TopProperty({ name, area, leads, special }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-5 ring-1 ring-[#d7e6df]">
            <p className="truncate text-lg font-black text-[#102426]">
                {name}
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-[#526260]">
                {area}
            </p>

            <div className="mt-5 flex flex-col gap-2">
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-[#173f3f] ring-1 ring-[#d7e6df]">
                    {leads}
                </span>

                <span className="w-fit rounded-full bg-[#d8efe6] px-3 py-1 text-xs font-bold text-[#1f6f63]">
                    {special}
                </span>
            </div>
        </div>
    );
}


function ChecklistItem({ title, to }) {
    return (
        <Link
            to={to}
            className="block rounded-2xl bg-[#f5f8f1] p-4 ring-1 ring-[#d7e6df] hover:bg-[#e7f3ee]"
        >
            <div className="mb-3 h-4 w-4 rounded-full border-2 border-[#a9cfc2]" />

            <p className="font-bold text-[#102426]">{title}</p>

            <p className="mt-1 text-sm font-semibold text-[#526260]">
                Pending
            </p>
        </Link>
    );
}

function SystemStatusCard({ label, value }) {
    return (
        <div className="rounded-2xl bg-[#f5f8f1] p-5 ring-1 ring-[#d7e6df]">
            <p className="text-sm font-semibold text-[#526260]">
                {label}
            </p>

            <p className="mt-3 text-lg font-black text-[#102426]">
                {value}
            </p>
        </div>
    );
}
