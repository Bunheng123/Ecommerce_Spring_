import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser, updateProfile, uploadProfilePicture, changePassword } from '../../api/auth';
import { Toast, AlertDialog } from '../../admin/utils/swalConfig';

/**
 * Extracts exact backend error message from rejected response.
 */
function extractErrorMessage(err, fallback = 'Operation failed') {
  if (err?.response?.data?.validationErrors) {
    const errors = Object.values(err.response.data.validationErrors);
    if (errors.length > 0) return errors[0];
  }
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;
  if (typeof msg === 'string') {
    return msg.replace(/^Error\s*:\s*/i, '').trim();
  }
  return fallback;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, updateUser, isAuthenticated } = useAuth();
  const fileInputRef = useRef(null);

  // Profile Information State initialized from current context user
  const [fullName, setFullName] = useState(() => user?.fullName || user?.username || '');
  const [email, setEmail] = useState(() => user?.email || '');
  const [phone, setPhone] = useState(() => user?.phone || '');
  const [profileImageUrl, setProfileImageUrl] = useState(() => user?.profileImageUrl || '');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  // Protect route: redirect to login if unauthenticated
  useEffect(() => {
    if (!isAuthenticated && !token) {
      navigate('/login');
    }
  }, [isAuthenticated, token, navigate]);

  // Fetch fresh profile from API on mount
  useEffect(() => {
    let isMounted = true;
    if (token) {
      getCurrentUser()
        .then((freshUser) => {
          if (isMounted && freshUser) {
            setFullName(freshUser.fullName || freshUser.username || '');
            setEmail(freshUser.email || '');
            setPhone(freshUser.phone || '');
            setProfileImageUrl(freshUser.profileImageUrl || '');
            updateUser(freshUser);
          }
        })
        .catch((err) => {
          console.warn('Failed to load fresh user profile:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [token, updateUser]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file could be selected again if needed
    e.target.value = '';

    setPhotoError('');
    setIsUploadingPhoto(true);

    try {
      const updated = await uploadProfilePicture(file);
      const newUrl = updated?.profileImageUrl;
      if (newUrl) {
        setProfileImageUrl(newUrl);
      }
      updateUser(updated);
      Toast.fire({ title: 'Profile photo updated' });
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      const msg = extractErrorMessage(err, 'Failed to upload photo');
      setPhotoError(msg);
      AlertDialog.fire({
        title: 'Upload Failed',
        text: msg,
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');
    setIsSavingProfile(true);

    try {
      const updated = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });

      updateUser(updated);
      setProfileSuccessMsg('Profile updated successfully.');
      Toast.fire({ title: 'Profile updated successfully' });
    } catch (err) {
      console.error('Failed to update profile:', err);
      const msg = extractErrorMessage(err, 'Failed to update profile.');
      setProfileErrorMsg(msg);
      AlertDialog.fire({
        title: 'Update Failed',
        text: msg,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (!currentPassword) {
      const msg = 'Please enter your current password.';
      setPasswordErrorMsg(msg);
      AlertDialog.fire({ title: 'Required Field', text: msg });
      return;
    }

    if (!newPassword) {
      const msg = 'Please enter a new password.';
      setPasswordErrorMsg(msg);
      AlertDialog.fire({ title: 'Required Field', text: msg });
      return;
    }

    if (newPassword.length < 4 || newPassword.length > 100) {
      const msg = 'New password must be between 4 and 100 characters.';
      setPasswordErrorMsg(msg);
      AlertDialog.fire({ title: 'Invalid Password', text: msg });
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirm password do not match.';
      setPasswordErrorMsg(msg);
      AlertDialog.fire({ title: 'Password Mismatch', text: msg });
      return;
    }

    if (newPassword === currentPassword) {
      const msg = 'New password cannot be the same as current password.';
      setPasswordErrorMsg(msg);
      AlertDialog.fire({ title: 'Invalid Password', text: msg });
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccessMsg('Password changed successfully.');
      Toast.fire({ title: 'Password changed successfully' });
    } catch (err) {
      console.error('Failed to change password:', err);
      const msg = extractErrorMessage(err, 'Failed to change password.');
      setPasswordErrorMsg(msg);
      AlertDialog.fire({
        title: 'Password Change Failed',
        text: msg,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const displayName = fullName || user?.username || 'Client Profile';

  return (
    <div className="bg-surface min-h-[calc(100vh-160px)] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Page Top Header */}
        <div className="pb-4 border-b border-line flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-1">
              ACCOUNT MANAGEMENT
            </span>
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">
              MY PROFILE
            </h1>
          </div>
          <Link
            to="/orders"
            className="text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors flex items-center gap-1"
          >
            <span>Order History</span>
            <span>&rarr;</span>
          </Link>
        </div>

        {/* CARD 1: Profile Information */}
        <div className="bg-white border border-line p-8 md:p-10 shadow-surface">
          <div className="pb-5 mb-8 border-b border-line">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-0.5">
              PERSONAL DETAILS
            </span>
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-ink">
              PROFILE INFORMATION
            </h2>
          </div>

          {/* Profile Picture Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 mb-8 border-b border-line">
            <div className="relative shrink-0">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover border border-line"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-ink text-white font-extrabold flex items-center justify-center text-2xl tracking-wider shrink-0">
                  {getInitials(displayName)}
                </div>
              )}
            </div>

            <div className="text-center sm:text-left space-y-2">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-tight text-ink">
                  Profile Avatar
                </h3>
                <p className="text-xs text-muted">
                  JPG, PNG or WEBP. Uploading a new photo replaces the existing one.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1 justify-center sm:justify-start">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                  id="profile-picture-input"
                />
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 border border-line bg-surface hover:bg-neutral-100 hover:border-ink text-xs font-bold uppercase tracking-wider text-ink transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                </button>
              </div>

              {photoError && (
                <p className="text-xs text-red-600 font-semibold pt-1">
                  {photoError}
                </p>
              )}
            </div>
          </div>

          {/* Profile Details Form */}
          <form onSubmit={handleProfileSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alexander Wright"
                className="w-full border border-line bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none focus:border-ink focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full border border-line bg-neutral-100 px-3.5 py-2.5 text-xs text-muted cursor-not-allowed outline-none select-none"
              />
              <p className="mt-1 text-[11px] text-muted">
                Email address is linked to your account authentication and cannot be changed here.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +855 12 345 678"
                className="w-full border border-line bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none focus:border-ink focus:bg-white"
              />
            </div>

            {profileSuccessMsg && (
              <p className="text-xs text-emerald-700 font-semibold pt-1">
                ✓ {profileSuccessMsg}
              </p>
            )}

            {profileErrorMsg && (
              <p className="text-xs text-red-600 font-semibold pt-1">
                ⚠ {profileErrorMsg}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full sm:w-auto px-8 h-11 bg-ink text-white text-xs font-bold uppercase tracking-[0.12em] hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: Change Password Card */}
        <div className="bg-white border border-line p-8 md:p-10 shadow-surface">
          <div className="pb-5 mb-8 border-b border-line">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-0.5">
              SECURITY & CREDENTIALS
            </span>
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-ink">
              CHANGE PASSWORD
            </h2>
            <p className="text-xs text-muted mt-1">
              Ensure your account is using a long, random password to stay secure.
            </p>
          </div>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  className="w-full border border-line bg-[#FAFAFA] px-3.5 py-2.5 pr-14 text-xs text-ink placeholder:text-subtle outline-none focus:border-ink focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors cursor-pointer select-none"
                >
                  {showCurrentPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (4–100 characters)"
                  autoComplete="new-password"
                  className="w-full border border-line bg-[#FAFAFA] px-3.5 py-2.5 pr-14 text-xs text-ink placeholder:text-subtle outline-none focus:border-ink focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors cursor-pointer select-none"
                >
                  {showNewPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Must be between 4 and 100 characters and different from your current password.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className="w-full border border-line bg-[#FAFAFA] px-3.5 py-2.5 pr-14 text-xs text-ink placeholder:text-subtle outline-none focus:border-ink focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 text-[10px] font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors cursor-pointer select-none"
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {passwordSuccessMsg && (
              <p className="text-xs text-emerald-700 font-semibold pt-1">
                ✓ {passwordSuccessMsg}
              </p>
            )}

            {passwordErrorMsg && (
              <p className="text-xs text-red-600 font-semibold pt-1">
                ⚠ {passwordErrorMsg}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full sm:w-auto px-8 h-11 bg-ink text-white text-xs font-bold uppercase tracking-[0.12em] hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
