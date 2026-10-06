import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import AccountDrawer from '../AccountDrawer';

export default function Navbar() {
  const navigate = useNavigate();
  const { openDrawer, itemCount } = useCart();
  const { user } = useAuth();
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);

  const handleAccountClick = () => {
    if (user) {
      setIsAccountDrawerOpen(true);
    } else {
      navigate('/login');
    }
  };

  const displayName = user?.fullName || user?.name || user?.username || 'User';

  return (
    <header className="border-b border-line bg-white sticky top-0 z-50">
      {/* Top Edition Banner */}
      <div className="bg-ink py-1.5 px-4 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white">
        EDITION 2026.01 — STRICT FUNCTION &amp; ESSENTIAL HARDWARE AVAILABLE WORLDWIDE
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12 h-16 flex items-center justify-between">
        {/* Left: Menu & Brand */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Open menu"
            className="flex flex-col gap-1 w-5 cursor-pointer py-1"
          >
            <span className="block h-[1.5px] w-5 bg-ink"></span>
            <span className="block h-[1.5px] w-3.5 bg-ink"></span>
          </button>
          <Link
            to="/"
            className="text-base font-extrabold uppercase tracking-[-0.03em] text-ink"
          >
            SHOP
          </Link>
        </div>

        {/* Center: Nav links */}
        <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
          <Link to="/" className="hover:opacity-60 transition-opacity">
            HOME
          </Link>
          <Link to="/shop" className="hover:opacity-60 transition-opacity">
            SHOP
          </Link>
          <Link to="/orders" className="hover:opacity-60 transition-opacity">
            ORDER HISTORY
          </Link>
        </nav>

        {/* Right: Icons */}
        <div className="flex items-center gap-5 text-ink">
          <Link to="/shop" aria-label="Search" className="hover:opacity-60 transition-opacity">
            <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" />
              <path d="M11 11L14.5 14.5" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={openDrawer}
            aria-label="Cart"
            className="relative hover:opacity-60 transition-opacity cursor-pointer p-0.5"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 4.5h10l-1 9H4l-1-9Z" />
              <path d="M6 4.5V3a2 2 0 0 1 4 0v1.5" />
            </svg>
            <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 rounded-full bg-ink text-[8px] font-bold text-white flex items-center justify-center">
              {itemCount}
            </span>
          </button>

          {/* Account Button: Icon + Text (Login or User's name) */}
          <button
            type="button"
            onClick={handleAccountClick}
            aria-label={user ? `Account: ${displayName}` : 'Login'}
            className="flex items-center gap-1.5 hover:opacity-60 transition-opacity cursor-pointer text-xs font-bold uppercase tracking-wider text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
              <circle cx="8" cy="5" r="3" />
              <path d="M2.5 14c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5" />
            </svg>
            <span className="truncate max-w-[120px] md:max-w-[160px]">
              {user ? displayName : 'Login'}
            </span>
          </button>
        </div>
      </div>

      {/* Account Drawer Component */}
      <AccountDrawer
        isOpen={isAccountDrawerOpen}
        onClose={() => setIsAccountDrawerOpen(false)}
      />
    </header>
  );
}
