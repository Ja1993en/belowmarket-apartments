import { useEffect, useState } from "react";
import { dataHistory, leads } from "../data/mockData";
import { getAllProperties } from "../data/propertyStorage";
import { getAllLeads, getStoredTourRequests } from "../data/leadStorage";
import { getSupabaseLeads } from "../data/supabaseLeadStorage";
import { getSupabaseTourRequestsForLead } from "../data/supabaseTourStorage";
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
        to: "/admin/properties",
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
        to: "/admin/properties",
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
    const [dashboardLeads, setDashboardLeads] = useState(leads);
    const [dashboardTourRequests, setDashboardTourRequests] = useState(
        getStoredTourRequests()
    );
    const [dashboardLoadedAt, setDashboardLoadedAt] = useState(null);
    const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
    const [dashboardError, setDashboardError] = useState("");
    const [isUsingFallbackDashboardData, setIsUsingFallbackDashboardData] =
        useState(false);
    const loadDashboardData = async () => {
        setIsLoadingDashboard(true);
        setDashboardError("");

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
            setDashboardLeads(getAllLeads());
            setDashboardTourRequests(getStoredTourRequests());
            setIsUsingFallbackDashboardData(true);
            setDashboardError("Supabase could not be reached. Showing local fallback dashboard data.");
            setDashboardLoadedAt(new Date());
        } finally {
            setIsLoadingDashboard(false);
        }
    };
    useEffect(() => {
        loadDashboardData();
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


    return (
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
                <h1 className="text-4xl font-black text-slate-900">
                    Dashboard
                </h1>

                <p className="mt-2 text-slate-500">
                    Welcome back. Here's what's happening today.
                </p>

                {dashboardLoadedAt && (
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                        Dashboard refreshed {dashboardLoadedAt.toLocaleTimeString()}
                    </p>
                )}

                {isLoadingDashboard && (
                    <p className="mt-2 text-sm font-bold text-slate-500">
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

            </div>

            <button
                type="button"
                onClick={loadDashboardData}
                disabled={isLoadingDashboard}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
                {isLoadingDashboard ? "Refreshing..." : "Refresh Dashboard"}
            </button>



            <div className="mt-6 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <p className="text-sm font-bold text-slate-300">
                            Platform Status
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                            Your apartment platform is ready for setup.
                        </h2>

                        <p className="mt-2 text-sm text-slate-300">
                            Start by adding properties, creating leads, and sending recommendations.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">
                        Setup Mode
                    </div>
                </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">
                            Setup Checklist
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Complete these steps to get your apartment platform ready.
                        </p>
                    </div>

                    <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
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

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-5">
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

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-black text-slate-900">Recent Activity</h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Latest platform updates will appear here.
                    </p>

                    <div className="mt-6 space-y-4">
                        {recentActivities.map((activity) => (
                            <ActivityItem
                                key={activity.title}
                                title={activity.title}
                                description={activity.description}
                                time={activity.time}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                    <h2 className="text-2xl font-black text-slate-900">
                        No live data connected yet
                    </h2>

                    <p className="mx-auto mt-2 max-w-2xl text-slate-500">
                        Your dashboard is using placeholder numbers for now. Once Supabase is connected,
                        this section will automatically show real properties, leads, recommendations,
                        and update history.
                    </p>

                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                            to="/admin/properties"
                            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                        >
                            Add Property
                        </Link>

                        <Link
                            to="/admin/leads"
                            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200"
                        >
                            Create Lead
                        </Link>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-black text-slate-900">Quick Actions</h2>

                    <p className="mt-1 text-sm text-slate-500">
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

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">
                                Performance Overview
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
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


                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">
                                Recent Leads
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Latest renter leads submitted to your platform.
                            </p>
                        </div>

                        <Link
                            to="/admin/leads"
                            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
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

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">
                                Top Properties
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Properties getting the most lead interest.
                            </p>
                        </div>

                        <Link
                            to="/admin/properties"
                            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
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

                <div className="mt-8 rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-2xl font-black">
                                Dashboard foundation complete
                            </h2>

                            <p className="mt-2 text-sm text-slate-300">
                                The next step is building the Properties page, then connecting the dashboard cards to Supabase data.
                            </p>
                        </div>

                        <Link
                            to="/admin/properties"
                            className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
                        >
                            Build Properties Page
                        </Link>
                    </div>
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-2xl font-black text-slate-900">
                        System Overview
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <Icon className="h-6 w-6 text-slate-700" />
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                    {to ? "Open" : "Active"}
                </span>
            </div>

            <p className="mt-5 text-sm font-bold text-slate-500">{title}</p>
            <h2 className="mt-2 text-4xl font-black text-slate-900">{value}</h2>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </>
    );

    if (to) {
        return (
            <Link
                to={to}
                className="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 hover:shadow-md"
            >
                {cardContent}
            </Link>
        );
    }

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {cardContent}
        </div>
    );
}

function ActivityItem({ title, description, time }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-bold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>

                <span className="text-xs font-bold text-slate-400">{time}</span>
            </div>
        </div>
    );
}

function QuickAction({ icon: Icon, title, description, to }) {
    return (
        <Link
            to={to}
            className="flex w-full items-center gap-4 rounded-2xl bg-slate-50 p-4 text-left hover:bg-slate-100"
        >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
                <Icon className="h-5 w-5 text-slate-700" />
            </div>

            <div>
                <p className="font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
        </Link>
    );
}

function PerformanceStep({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-5">
            <p className="min-h-[40px] text-sm font-semibold leading-5 text-slate-500">
                {label}
            </p>

            <p className="mt-3 text-3xl font-black text-slate-900">
                {value}
            </p>
        </div>
    );
}

function RecentLead({ name, preference, status }) {
    return (
        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center">
            <div>
                <p className="font-bold text-slate-900">{name}</p>
                <p className="mt-1 text-sm text-slate-500">{preference}</p>
            </div>

            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                {status}
            </span>
        </div>
    );
}

function TopProperty({ name, area, leads, special }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-5">
            <p className="truncate text-lg font-black text-slate-900">
                {name}
            </p>

            <p className="mt-1 truncate text-sm text-slate-500">
                {area}
            </p>

            <div className="mt-5 flex flex-col gap-2">
                <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
                    {leads}
                </span>

                <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
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
            className="block rounded-2xl bg-slate-50 p-4 hover:bg-slate-100"
        >
            <div className="mb-3 h-4 w-4 rounded-full border-2 border-slate-300" />

            <p className="font-bold text-slate-900">{title}</p>

            <p className="mt-1 text-sm text-slate-500">
                Pending
            </p>
        </Link>
    );
}

function SystemStatusCard({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-500">
                {label}
            </p>

            <p className="mt-3 text-lg font-black text-slate-900">
                {value}
            </p>
        </div>
    );
}