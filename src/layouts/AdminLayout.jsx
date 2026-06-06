import { NavLink, Outlet } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  Users,
  History,
  Menu,
} from "lucide-react";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex">
        <aside className="hidden min-h-screen w-72 bg-slate-950 p-6 text-white md:block">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-xl font-black">Below Market Apartments</h1>
              <p className="text-xs text-slate-400">Admin Portal</p>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            <NavItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/admin/properties" icon={Building2} label="Properties" />
            <NavItem to="/admin/leads" icon={Users} label="Leads" />
            <NavItem to="/admin/data-history" icon={History} label="Data History" />
          </nav>
        </aside>

        <main className="min-h-screen flex-1">
          <header className="flex items-center justify-between border-b bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <Menu className="h-6 w-6 md:hidden" />
              <div>
                <p className="text-sm font-bold text-slate-500">
                  Admin Dashboard
                </p>
                <h2 className="text-xl font-black">Below Market Apartments</h2>
              </div>
            </div>
          </header>

          <section className="mx-auto max-w-7xl p-4 md:p-6 xl:p-8">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
          isActive
            ? "bg-white text-slate-950"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}