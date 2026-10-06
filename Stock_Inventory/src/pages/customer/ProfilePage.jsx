import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser, updateProfile, uploadProfilePicture } from '../../api/auth';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, token, updateUser, isAuthenticated } = useAuth();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Protect route: redirect to login if unauthenticated
  useEffect(() => {
    if (!isAuthenticated && !token) {
      navigate('/login');
    }
  }, [isAuthenticated, token, navigate]);

  // Sync state with user data and fetch fresh profile from API
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.username || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setProfileImageUrl(user.profileImageUrl || '');
    }

    if (token) {
      getCurrentUser()
        .then((freshUser) => {
          if (freshUser) {
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
  }, [token]);

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
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to upload photo';
      setPhotoError(msg.replace(/^Error\s*:\s*/i, ''));
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
    } catch (err) {
      console.error('Failed to update profile:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update profile.';
      setProfileErrorMsg(msg.replace(/^Error\s*:\s*/i, ''));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const displayName = fullName || user?.username || 'Client Profile';

  return (
    <div className="bg-surface min-h-[calc(100vh-160px)] py-16 px-6">
      <div className="max-w-2xl mx-auto bg-white border border-line p-8 md:p-10 shadow-surface">
        {/* Header */}
        <div className="pb-6 mb-8 border-b border-line flex items-center justify-between">
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
            className="text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition-colors"
          >
            Order History &rarr;
          </Link>
        </div>

        {/* Profile Picture Upload Section (Single Image Per User) */}
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
              <h2 className="text-sm font-extrabold uppercase tracking-tight text-ink">
                Profile Avatar
              </h2>
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
              className="w-full border border-line bg-neutral-100 px-3.5 py-2.5 text-xs text-muted cursor-not-allowed outline-none"
            />
            <p className="mt-1 text-[11px] text-muted">
              Email address is linked to your account authentication.
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
              placeholder="e.g. +1 555-0199"
              className="w-full border border-line bg-[#FAFAFA] px-3.5 py-2.5 text-xs text-ink placeholder:text-subtle outline-none focus:border-ink focus:bg-white"
            />
          </div>



          {profileSuccessMsg && (
            <p className="text-xs text-emerald-700 font-semibold pt-1">
              {profileSuccessMsg}
            </p>
          )}

          {profileErrorMsg && (
            <p className="text-xs text-red-600 font-semibold pt-1">
              {profileErrorMsg}
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
    </div>
  );
}
