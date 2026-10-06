import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { fetchAdminProducts } from '../../api/products';

const navSections = [
  {
    title: 'OVERVIEW',
    items: [
      {
        label: 'Dashboard',
        to: '/admin',
        end: true,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
        ),
      },
      {
        label: 'Low Stock Alerts',
        to: '/admin/low-stock',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'INVENTORY & SALES',
    items: [
      {
        label: 'Products',
        to: '/admin/products',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      },
      {
        label: 'Stock Movements',
        to: '/admin/stock-movements',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        ),
      },
      {
        label: 'Categories',
        to: '/admin/categories',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
      },
      {
        label: 'Customer Orders',
        to: '/admin/orders',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      {
        label: 'Users & Roles',
        to: '/admin/users',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
      },
      {
        label: 'Settings',
        to: '/admin/settings',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    fetchAdminProducts()
      .then((data) => {
        if (Array.isArray(data)) {
          const count = data.filter(
            (p) => (p.stock ?? 0) <= (p.reorderLevel ?? 10)
          ).length;
          setLowStockCount(count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside className="w-68 h-screen bg-[#0C0D0E] text-white flex flex-col justify-between border-r border-neutral-800/80 shrink-0 overflow-y-auto">
      <div>
        {/* Brand header with chunky radius */}
        <div className="p-6 pb-4 border-b border-neutral-800/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white text-black font-black text-sm flex items-center justify-center rounded-xl shadow-md tracking-tighter">
              SI
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-white leading-tight">
                INVENTORY OS
              </h2>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                ADMIN CONSOLE
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full border border-neutral-700">
            PRO
          </span>
        </div>

        {/* Navigation items with rounded-xl active pills and thick fonts */}
        <nav className="p-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isLowStockItem = item.to === '/admin/low-stock';
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 rounded-xl ${
                          isActive
                            ? 'bg-white text-neutral-950 font-black shadow-md shadow-white/5 translate-x-1'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                        }`
                      }
                    >
                      <span className="opacity-90">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                      {isLowStockItem && lowStockCount > 0 && (
                        <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white font-mono shadow-xs animate-pulse">
                          {lowStockCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer link to Customer Store */}
      <div className="p-4 border-t border-neutral-800/80">
        <NavLink
          to="/"
          className="flex items-center justify-between px-4 py-3 bg-neutral-900/90 border border-neutral-800 rounded-xl text-neutral-300 hover:text-white hover:border-neutral-700 hover:bg-neutral-800 transition-all font-extrabold text-xs uppercase tracking-wider group"
        >
          <div className="flex items-center gap-2">
            <span className="text-base group-hover:-translate-x-0.5 transition-transform">&larr;</span>
            <span>Customer Store</span>
          </div>
          <span className="text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
            ONLINE
          </span>
        </NavLink>
      </div>
    </aside>
  );
}
