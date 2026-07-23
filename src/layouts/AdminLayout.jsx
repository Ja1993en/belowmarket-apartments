import { useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Building2,
  X,
  LayoutDashboard,
  Users,
  History,
  Menu,
  LogOut,
} from "lucide-react";
import { hasAdminAccess, logoutAdmin } from "../data/adminAuth";

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      const accessAllowed = await hasAdminAccess();

      if (isMounted) {
        setIsAllowed(accessAllowed);
        setIsCheckingAccess(false);
      }
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f8f1] p-6 text-center text-[#102426]">
        <div className="bma-panel p-6">
          <p className="text-sm font-black uppercase text-[#1f6f63]">
            Admin Portal
          </p>
          <p className="mt-2 text-lg font-black">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return <Navigate to="/admin-login" replace state={{ from: location }} />;
  }

  const handleLogout = async () => {
    await logoutAdmin();
    navigate("/admin-login", { replace: true });
  };

  const pageTitle = getAdminPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-[#f5f8f1] text-[#102426]">
      <div className="flex">
        <aside className="bma-brand-panel hidden min-h-screen w-64 shrink-0 p-6 text-white lg:block xl:w-72">
          <AdminNavigation />
        </aside>

        <main className="min-h-screen flex-1">
          <header className="bma-topbar sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e7f3ee] text-[#173f3f] ring-1 ring-[#d7e6df] lg:hidden"
                aria-label="Open admin navigation"
                aria-expanded={isMobileMenuOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-[#1f6f63] sm:text-xs">
                  Admin portal
                </p>
                <h2 className="truncate text-lg font-black text-[#102426] sm:text-xl">
                  {pageTitle}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#173f3f] px-3 py-2 text-xs font-black text-white hover:bg-[#102426] sm:px-4 sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </header>

          <section className="mx-auto max-w-7xl p-4 md:p-6 xl:p-8">
            <Outlet />
          </section>
        </main>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#102426]/55 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="bma-brand-panel relative h-full w-[min(84vw,310px)] overflow-y-auto p-5 text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15"
              aria-label="Close admin navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <AdminNavigation onNavigate={() => setIsMobileMenuOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}

function AdminNavigation({ onNavigate }) {
  return (
    <>
      <div className="flex items-center gap-3 pr-10">
        <div className="rounded-lg bg-[#f2b84b] p-3 text-[#102426]">
          <Building2 className="h-6 w-6" />
        </div>

        <div className="min-w-0">
          <h1 className="text-lg font-black leading-tight">
            Below Market Apartments
          </h1>
          <p className="mt-1 text-xs font-bold text-[#d7ece6]">Admin Portal</p>
        </div>
      </div>

      <nav className="mt-10 space-y-2">
        <NavItem to="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={onNavigate} />
        <NavItem to="/admin/properties" icon={Building2} label="Properties" onClick={onNavigate} />
        <NavItem to="/admin/leads" icon={Users} label="Leads" onClick={onNavigate} />
        <NavItem to="/admin/data-history" icon={History} label="Data History" onClick={onNavigate} />
      </nav>
    </>
  );
}

function getAdminPageTitle(pathname) {
  if (pathname.includes("/properties/new")) return "Add Property";
  if (pathname.includes("/properties")) return "Properties";
  if (pathname.includes("/leads/")) return "Lead Details";
  if (pathname.includes("/leads")) return "Leads";
  if (pathname.includes("/data-history")) return "Data History";
  return "Dashboard";
}

function NavItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition ${
          isActive
            ? "bg-[#f2b84b] text-[#102426]"
            : "text-[#d7ece6] hover:bg-white/10 hover:text-white"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
