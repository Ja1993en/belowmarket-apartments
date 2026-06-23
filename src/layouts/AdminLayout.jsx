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

  return (
    <div className="min-h-screen bg-[#f5f8f1] text-[#102426]">
      <div className="flex">
        <aside className="bma-brand-panel hidden min-h-screen w-72 p-6 text-white md:block">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#f2b84b] p-3 text-[#102426]">
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-xl font-black">Below Market Apartments</h1>
              <p className="text-xs font-bold text-[#d7ece6]">Admin Portal</p>
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
          <header className="bma-topbar flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Menu className="h-6 w-6 text-[#173f3f] md:hidden" />
              <div>
                <p className="text-sm font-bold text-[#526260]">
                  Admin Dashboard
                </p>
                <h2 className="text-xl font-black text-[#102426]">Below Market Apartments</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="bma-btn-primary"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
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
