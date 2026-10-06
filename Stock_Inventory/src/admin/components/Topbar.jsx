import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AdminProfileDrawer from "./AdminProfileDrawer";

export default function Topbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);

  const segment =
    pathname.replace("/admin", "").replace("/", "") || "Dashboard";
  const cleanTitle = segment.replace(/-/g, " ").toUpperCase();

  const displayName = user?.fullName || user?.name || user?.username || "Admin User";
  const roleName = user?.role || "ADMIN";

  const getInitials = (name) => {
    if (!name) return "AD";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-20 border-b border-neutral-200/80 bg-white px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Breadcrumb section with thick font */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
          ADMIN PORTAL
        </span>
        <span className="text-neutral-300 font-bold">/</span>
        <h1 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900 bg-neutral-100 px-3 py-1 rounded-lg">
          {cleanTitle}
        </h1>
      </div>

      {/* Right controls with rounded buttons and bold badges */}
      <div className="flex items-center gap-4">
        {/* Search input with rounded-xl */}
        <div className="relative hidden md:block w-64">
          <input
            type="text"
            placeholder="Quick search (SKU, Name)..."
            className="w-full bg-[#F5F6FA] border border-neutral-200/80 text-xs font-bold text-neutral-800 placeholder:text-neutral-400 rounded-xl px-4 py-2.5 outline-none focus:border-neutral-900 focus:bg-white transition-all"
          />
        </div>

        {/* Admin profile pill button - opens Account Drawer */}
        <div className="flex items-center gap-3 pl-2 border-l border-neutral-200">
          <button
            type="button"
            onClick={() => setIsAccountDrawerOpen(true)}
            className="flex items-center gap-2.5 bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200/80 rounded-full pl-2 pr-3.5 py-1.5 cursor-pointer transition-all active:scale-95 text-left"
            title="Open Account & Profile Drawer"
          >
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover border border-neutral-300"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-neutral-900 text-white font-black text-xs flex items-center justify-center">
                {getInitials(displayName)}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-tight text-neutral-900 leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 leading-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {roleName}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Admin Profile Drawer */}
      <AdminProfileDrawer
        isOpen={isAccountDrawerOpen}
        onClose={() => setIsAccountDrawerOpen(false)}
      />
    </header>
  );
}
