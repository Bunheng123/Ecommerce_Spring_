import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminRoute Guard Component
 * Protects the /admin/** route tree:
 * - While AuthContext is still resolving the initial session (e.g. restoring
 *   from localStorage on page load), shows a brief neutral loading state.
 * - Anonymous visitors: redirects to "/".
 * - Logged-in users whose role is not "ADMIN" (USER, STOCK): redirects to "/".
 * - Authenticated ADMIN users: renders requested admin route children or Outlet.
 */
export default function AdminRoute({ children }) {
  const { user, token, isLoading } = useAuth();

  // Check if session is still being restored from localStorage
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const isResolving = Boolean(isLoading) || (Boolean(storedToken) && !user);

  if (isResolving) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
            Verifying Authorization...
          </span>
        </div>
      </div>
    );
  }

  // 1. Anonymous visitor (no user and no token) -> redirect to "/"
  if (!user && !token) {
    return <Navigate to="/" replace />;
  }

  // 2. Check role on user object
  const role = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : null);
  const normalizedRole = typeof role === 'string' ? role.toUpperCase() : '';
  const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'ROLE_ADMIN';

  // If logged in but role is not ADMIN -> redirect to "/"
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // 3. User is ADMIN -> render normally
  return children ? children : <Outlet />;
}
