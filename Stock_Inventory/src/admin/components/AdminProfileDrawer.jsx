import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser, updateProfile, uploadProfilePicture } from '../../api/auth';

export default function AdminProfileDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, token, updateUser, logout } = useAuth();
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const fullNameInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap / move focus to close button when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Sync state when user changes or drawer opens
  useEffect(() => {
    if (isOpen) {
      setIsEditing(false);
      setSuccessMsg('');
      setErrorMsg('');
      setPhotoError('');

      if (user) {
        setFullName(user.fullName || '');
        setPhone(user.phone || '');
        setProfileImageUrl(user.profileImageUrl || '');
      }

      if (token) {
        getCurrentUser()
          .then((freshUser) => {
            if (freshUser) {
              setFullName(freshUser.fullName || '');
              setPhone(freshUser.phone || '');
              setProfileImageUrl(freshUser.profileImageUrl || '');
              updateUser(freshUser);
            }
          })
          .catch((err) => {
            console.warn('Failed to refresh admin user in drawer:', err);
          });
      }
    } else {
      setIsEditing(false);
      setSuccessMsg('');
      setErrorMsg('');
      setPhotoError('');
    }
  }, [isOpen]);

  // Also sync fields if user updates externally while not actively editing
  useEffect(() => {
    if (!isEditing && user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setProfileImageUrl(user.profileImageUrl || '');
    }
  }, [user, isEditing]);

  if (!isOpen) return null;

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setSuccessMsg('');
    setErrorMsg('');
    setPhotoError('');
    setTimeout(() => {
      fullNameInputRef.current?.focus();
    }, 60);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFullName(user?.fullName || '');
    setPhone(user?.phone || '');
    setProfileImageUrl(user?.profileImageUrl || '');
    setErrorMsg('');
    setPhotoError('');
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so user can pick the same file again if desired
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
      setSuccessMsg('Profile picture updated successfully.');
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
    if (!isEditing) return;

    setSuccessMsg('');
    setErrorMsg('');
    setIsSaving(true);

    try {
      const updated = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });

      updateUser(updated);
      setSuccessMsg('Profile updated successfully.');
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update admin profile:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save changes.';
      setErrorMsg(msg.replace(/^Error\s*:\s*/i, ''));
    } finally {
      setIsSaving(false);
    }
  };

  const currentAvatar = profileImageUrl || user?.profileImageUrl;
  const displayName = (isEditing ? fullName : (user?.fullName || fullName)) || user?.username || 'Admin User';
  const username = user?.username || 'admin';
  const email = user?.email || 'N/A';
  const role = user?.role || 'ADMIN';

  return (
    <div className="relative z-[9999]" role="dialog" aria-modal="true" aria-label="Admin Profile">
      {/* Semi-transparent Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <aside
        ref={drawerRef}
        tabIndex="-1"
        className="fixed inset-y-0 right-0 w-full max-w-[380px] bg-white border-l border-neutral-200 flex flex-col z-[10000] shadow-2xl animate-slideLeft outline-none"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-800">
              ADMIN PROFILE
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close admin profile drawer"
            className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-all text-sm leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center p-5 bg-neutral-50 border border-neutral-200/80 rounded-2xl relative shadow-surface">
            <div className="relative mb-3 group">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-neutral-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-neutral-900 text-white font-black text-xl flex items-center justify-center shadow-sm">
                  {getInitials(displayName)}
                </div>
              )}

              {/* Photo Upload Trigger - Visible when editing */}
              {isEditing && (
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload new photo"
                  className="absolute bottom-0 right-0 p-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full shadow-md border-2 border-white transition-all cursor-pointer disabled:opacity-50"
                  aria-label="Upload new photo"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>

            <h2 className="text-sm font-black text-neutral-900 uppercase tracking-tight">
              {displayName}
            </h2>
            <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
              @{username}
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
              id="admin-profile-picture-input"
            />

            {/* Change photo button in edit mode */}
            {isEditing && (
              <div className="mt-3">
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 bg-white hover:bg-neutral-100 border border-neutral-300 text-[10px] font-bold uppercase tracking-wider text-neutral-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                </button>
              </div>
            )}

            {photoError && (
              <p className="text-[11px] text-red-600 font-semibold mt-2">
                {photoError}
              </p>
            )}
          </div>

          {/* Account Info List (Read-only System Info) */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-400 block">
              SYSTEM CREDENTIALS
            </span>

            <div className="border border-neutral-200/80 rounded-xl divide-y divide-neutral-100 bg-white overflow-hidden text-xs shadow-surface">
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-neutral-500 font-medium">Username</span>
                <span className="font-mono font-bold text-neutral-900">@{username}</span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-neutral-500 font-medium">Email</span>
                <span className="font-mono font-bold text-neutral-900 truncate max-w-[180px]" title={email}>
                  {email}
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-neutral-500 font-medium">Access Role</span>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-neutral-900 text-white uppercase tracking-wider">
                  {role}
                </span>
              </div>
            </div>
          </div>

          {/* Profile Details Form (Disabled in View Mode, Editable in Edit Mode) */}
          <form onSubmit={handleProfileSubmit} className="space-y-4 pt-1" noValidate>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-400">
                PROFILE DETAILS
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isEditing
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-neutral-100 text-neutral-500 border border-neutral-200/60'
                }`}
              >
                {isEditing ? 'Editing Mode' : 'Read-Only'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Full Name
              </label>
              <input
                ref={fullNameInputRef}
                type="text"
                disabled={!isEditing}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isEditing ? 'e.g. John Doe' : 'Not set'}
                className={`w-full rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  !isEditing
                    ? 'bg-neutral-100/70 border border-neutral-200 text-neutral-600 cursor-not-allowed select-none'
                    : 'bg-[#F5F6FA] border border-neutral-300 text-neutral-900 outline-none focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 placeholder:text-neutral-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                disabled={!isEditing}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isEditing ? 'e.g. +855 12 345 678' : 'Not set'}
                className={`w-full rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  !isEditing
                    ? 'bg-neutral-100/70 border border-neutral-200 text-neutral-600 cursor-not-allowed select-none'
                    : 'bg-[#F5F6FA] border border-neutral-300 text-neutral-900 outline-none focus:border-neutral-900 focus:bg-white focus:ring-1 focus:ring-neutral-900 placeholder:text-neutral-400'
                }`}
              />
            </div>

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <span>✓</span>
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <span>⚠</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons: Edit Profile OR Save/Cancel */}
            <div className="pt-1">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="w-full h-10 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex-1 h-10 border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 h-10 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.99]"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Spacer to push logout to bottom */}
          <div className="flex-1 min-h-2" />

          {/* Logout Button Pinned to Bottom */}
          <div className="pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-11 border border-red-200 bg-red-50/50 hover:bg-red-100/70 hover:border-red-300 text-xs font-black uppercase tracking-[0.14em] text-red-700 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
