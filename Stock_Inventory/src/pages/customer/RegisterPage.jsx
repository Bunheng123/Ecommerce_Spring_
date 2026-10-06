import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerApi } from '../../api/auth';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errors = {};
    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      errors.fullName = 'Full Name is required';
    }

    if (!trimmedUsername) {
      errors.username = 'Username is required';
    } else if (trimmedUsername.length < 2 || trimmedUsername.length > 50) {
      errors.username = 'Username must be between 2 and 50 characters';
    }

    if (!trimmedEmail) {
      errors.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm Password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = email.trim();
      const cleanUsername = username.trim();
      const cleanFullName = fullName.trim();

      // 1. Call backend register API
      const registerRes = await registerApi({
        fullName: cleanFullName,
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      const message = registerRes?.message || 'User registered successfully';

      // 2. Redirect to /login and show the success status from the backend
      navigate('/login', {
        state: {
          successMessage: message,
          initialUsername: cleanUsername,
        },
      });
    } catch (err) {
      console.error('Registration failed:', err);
      const rawMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Registration failed';
      // Clean up backend prefix like "Error : " if present for cleaner display
      const displayMsg = rawMsg.replace(/^Error\s*:\s*/i, '');
      setServerError(displayMsg || 'Registration failed. Please check your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface min-h-[calc(100vh-160px)] py-16 px-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border border-line p-8 shadow-surface">
        <div className="text-center mb-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-1">
            CLIENT REGISTRATION
          </span>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">
            CREATE ACCOUNT
          </h1>
          <p className="text-xs text-muted mt-1">
            Register to track orders, save shipping details, and access atelier specifications.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) {
                  setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                }
              }}
              placeholder="e.g. Alexander Wright"
              className={`w-full border px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none transition-colors ${
                fieldErrors.fullName ? 'border-red-500 bg-red-50/20' : 'border-line bg-[#FAFAFA] focus:border-ink focus:bg-white'
              }`}
            />
            {fieldErrors.fullName && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({ ...prev, username: '' }));
                }
              }}
              placeholder="e.g. alexander"
              className={`w-full border px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none transition-colors ${
                fieldErrors.username ? 'border-red-500 bg-red-50/20' : 'border-line bg-[#FAFAFA] focus:border-ink focus:bg-white'
              }`}
            />
            {fieldErrors.username && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {fieldErrors.username}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              placeholder="e.g. alexander@example.com"
              className={`w-full border px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none transition-colors ${
                fieldErrors.email ? 'border-red-500 bg-red-50/20' : 'border-line bg-[#FAFAFA] focus:border-ink focus:bg-white'
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: '' }));
                }
              }}
              placeholder="Minimum 4 characters"
              className={`w-full border px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none transition-colors ${
                fieldErrors.password ? 'border-red-500 bg-red-50/20' : 'border-line bg-[#FAFAFA] focus:border-ink focus:bg-white'
              }`}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
              }}
              placeholder="Repeat your password"
              className={`w-full border px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none transition-colors ${
                fieldErrors.confirmPassword ? 'border-red-500 bg-red-50/20' : 'border-line bg-[#FAFAFA] focus:border-ink focus:bg-white'
              }`}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600 font-medium">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Server error message near submit button */}
          {serverError && (
            <div className="pt-1">
              <p className="text-xs text-red-600 font-semibold">
                {serverError}
              </p>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-ink text-white text-xs font-bold uppercase tracking-[0.12em] hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Creating Account...' : 'Register'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-line text-center text-xs text-muted">
          <span>Already have an account? </span>
          <Link to="/login" className="text-ink font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
