import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login as loginApi, getCurrentUser, getLoginStatus } from '../../api/auth';
import { AlertDialog } from '../../admin/utils/swalConfig';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();

  const successMessage = location.state?.successMessage;
  const initialUsername = location.state?.initialUsername || '';

  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Check login-status for caller's IP
  const checkStatus = useCallback(async () => {
    try {
      const res = await getLoginStatus();
      if (res?.blocked) {
        setIsBlocked(true);
        const sec = res.retryAfterSeconds || 60;
        setCountdown(sec);
        setErrorMessage(`Too many attempts from your network. Try again in ${sec} seconds.`);
      } else {
        setIsBlocked(false);
        setCountdown(0);
      }
    } catch (err) {
      if (err.response?.status === 419 || err.response?.status === 429) {
        const sec = err.response?.data?.retryAfterSeconds || 60;
        setIsBlocked(true);
        setCountdown(sec);
        setErrorMessage(`Too many attempts from your network. Try again in ${sec} seconds.`);
      }
    }
  }, []);

  // Fetch status on page load
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Countdown timer for IP block
  useEffect(() => {
    if (countdown <= 0) {
      if (isBlocked) {
        setIsBlocked(false);
        checkStatus();
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsBlocked(false);
          checkStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isBlocked, checkStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBlocked || countdown > 0) return;
    setErrorMessage('');

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setErrorMessage('Invalid username or password');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Call login API. Backend LoginRequest expects username + password.
      const loginRes = await loginApi({
        username: cleanUsername,
        password,
      });

      const token = loginRes?.token;
      if (token) {
        localStorage.setItem('token', token);
      }

      // 2. Fetch full user profile details
      let userProfile = null;
      try {
        userProfile = await getCurrentUser();
      } catch (userErr) {
        console.warn('Failed to fetch full user profile:', userErr);
        userProfile = {
          username: loginRes?.username || cleanUsername,
          email: '',
        };
      }

      // 3. Update AuthContext with real data
      authLogin(userProfile, token);

      // 4. Navigate based on role: ADMIN → /admin, everyone else → /
      const role = (userProfile?.role || '').toString().toUpperCase();
      navigate(role === 'ADMIN' ? '/admin' : '/');
    } catch (err) {
      console.error('Login failed:', err);
      const status = err.response?.status;
      const data = err.response?.data;
      const backendMessage = data?.message || err.message;
      const cleanMessage = typeof backendMessage === 'string'
        ? backendMessage.replace(/^Error\s*:\s*/i, '')
        : '';

      if (status === 419 || status === 429 || data?.blocked) {
        const sec = data?.retryAfterSeconds || 60;
        setIsBlocked(true);
        setCountdown(sec);
        const msg = `Too many attempts from your network. Try again in ${sec} seconds.`;
        setErrorMessage(msg);
        AlertDialog.fire({
          title: status === 419 ? 'Request Limit Exceeded' : 'Network Blocked',
          text: msg,
        });
      } else if (cleanMessage && cleanMessage.toLowerCase().includes('deactivated')) {
        setErrorMessage(cleanMessage);
        AlertDialog.fire({
          title: 'Account Suspended',
          text: cleanMessage,
        });
      } else {
        const rem = data?.remainingAttempts;
        if (typeof rem === 'number') {
          setErrorMessage(`Invalid username or password. ${rem} attempt${rem === 1 ? '' : 's'} remaining before network block.`);
        } else {
          setErrorMessage(cleanMessage || 'Invalid username or password');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface min-h-[calc(100vh-160px)] py-16 px-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border border-line p-8 shadow-surface">
        <div className="text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-1">
            CLIENT ACCESS
          </span>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">
            SIGN IN
          </h1>
          <p className="text-xs text-muted mt-1">
            Access your order history and atelier specifications.
          </p>
        </div>

        {/* Backend registration success status */}
        {successMessage && (
          <div className="mb-6 p-3 border border-line bg-surface text-ink text-xs font-semibold text-center">
            {successMessage}
          </div>
        )}

        {/* IP Block countdown warning */}
        {(isBlocked || countdown > 0) && (
          <div className="mb-6 p-3 border border-red-300 bg-red-50 text-red-700 text-xs font-semibold text-center rounded">
            Too many attempts from your network. Try again in {countdown} seconds.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              disabled={isBlocked || countdown > 0}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="e.g. alexander"
              className="w-full border border-line bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none focus:border-ink focus:bg-white disabled:opacity-50 disabled:bg-neutral-100"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              disabled={isBlocked || countdown > 0}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Your password"
              className="w-full border border-line bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none focus:border-ink focus:bg-white disabled:opacity-50 disabled:bg-neutral-100"
            />
          </div>

          {/* Inline error message */}
          {errorMessage && !(isBlocked || countdown > 0) && (
            <div className="pt-1">
              <p className="text-xs text-red-600 font-semibold">
                {errorMessage}
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={isSubmitting || isBlocked || countdown > 0}
              className="w-full h-11 bg-ink text-white text-xs font-bold uppercase tracking-[0.12em] hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isBlocked || countdown > 0
                ? `Try again in ${countdown}s`
                : isSubmitting
                ? 'Signing In...'
                : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-line text-center text-xs text-muted space-y-2">
          <div>
            <span>Need an account? </span>
            <Link to="/register" className="text-ink font-bold hover:underline">
              Create an account
            </Link>
          </div>
          <div>
            <span>Return to </span>
            <Link to="/" className="text-ink font-bold hover:underline">
              Storefront
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
