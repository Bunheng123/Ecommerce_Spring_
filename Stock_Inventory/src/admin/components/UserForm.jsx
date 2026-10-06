import { useState, useEffect, useRef } from 'react';

/**
 * Shared UserForm component used across Create, Edit, and View flows.
 *
 * @param {'create' | 'edit' | 'view'} mode - Form mode
 * @param {Object|null} initialData - User data object for edit/view, or null for create
 * @param {(data: Object) => void} onSubmit - Callback when form is submitted (create/edit)
 * @param {() => void} onCancel - Callback when form is cancelled or closed
 * @param {boolean} [isSubmitting] - Optional loading/submitting state flag
 */
export default function UserForm({
  mode = 'create',
  initialData = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'USER',
  });

  const [profilePreview, setProfilePreview] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialData && (isEdit || isView)) {
      setFormData({
        fullName: initialData.fullName || initialData.username || '',
        username: initialData.username || '',
        email: initialData.email || '',
        password: '', // Blank by default on edit
        phone: initialData.phone || '', // Show phone if has, else blank
        role: initialData.role ? String(initialData.role).toUpperCase() : 'USER',
      });
      setProfilePreview(initialData.profileImageUrl || null);
      setProfileFile(null);
    } else {
      setFormData({
        fullName: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        role: 'USER',
      });
      setProfilePreview(null);
      setProfileFile(null);
    }
  }, [initialData, isEdit, isView]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isView) return;

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      role: formData.role,
      phone: formData.phone.trim(),
    };

    if (formData.username && formData.username.trim()) {
      payload.username = formData.username.trim();
    }

    // Password handling:
    // Required on create. Optional on edit (only sent if non-empty).
    if (isCreate) {
      payload.password = formData.password;
    } else if (isEdit && formData.password && formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    if (profileFile) {
      payload.profileFile = profileFile;
    }

    if (onSubmit) {
      onSubmit(payload);
    }
  };

  const title = isCreate
    ? 'Add User'
    : isEdit
    ? 'Edit User Account'
    : 'User Profile Specification';

  const subtitle = isCreate
    ? 'Create customer, warehouse, or administrative credentials'
    : isEdit
    ? `Update profile details and permissions for @${initialData?.username || 'user'}`
    : `Read-only identity inspection for User #${initialData?.id || '—'}`;

  const displayName = formData.fullName || formData.username || (isCreate ? 'New User' : 'User');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xl max-w-lg w-full overflow-hidden animate-scaleIn">
      {/* Form Header */}
      <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-[#FAFBFD]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-0.5">
            {isView ? 'IDENTITY SPECIFICATION' : 'USER MANAGEMENT'}
          </span>
          <h3 className="text-lg font-black uppercase tracking-tight text-neutral-900">
            {title}
          </h3>
          <p className="text-xs font-bold text-neutral-400 mt-0.5">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-neutral-400 hover:text-neutral-900 text-xl font-bold p-1 cursor-pointer transition-colors leading-none"
          title="Close dialog"
        >
          &times;
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Profile Avatar Card in All Modes */}
        <div className="flex items-center gap-4 p-3.5 bg-[#F8F9FC] border border-neutral-200/80 rounded-2xl">
          <div className="relative shrink-0">
            {profilePreview ? (
              <img
                src={profilePreview}
                alt={displayName}
                className="w-16 h-16 rounded-2xl object-cover border border-neutral-200 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-black text-xl font-mono tracking-tight shadow-xs">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-neutral-900 truncate">
                {displayName}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-white border border-neutral-200 text-neutral-700">
                {formData.role}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 font-mono truncate mt-0.5">
              {formData.email || (isCreate ? 'No email entered yet' : 'No email')}
            </p>

            {/* In Create & Edit mode: Ability to upload / change profile picture */}
            {!isView && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{profilePreview ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {profileFile && (
                  <span className="text-[10px] font-bold text-emerald-600">
                    Image selected
                  </span>
                )}
              </div>
            )}

            {isView && (
              <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mt-1">
                {profilePreview ? 'Profile Picture' : 'No profile image set (Using Text)'}
              </span>
            )}
          </div>
        </div>

        {/* 1. Full Name */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Full Name {isView ? '' : '*'}
          </label>
          <input
            type="text"
            required={!isView}
            disabled={isView}
            readOnly={isView}
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="e.g. Elena Vance"
            className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
            }`}
          />
        </div>

        {/* 2. Username */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Username {isView ? '' : '(Optional)'}
          </label>
          <input
            type="text"
            disabled={isView}
            readOnly={isView}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder={isCreate ? 'Auto-generated if left blank' : ''}
            className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none font-mono transition-all ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
            }`}
          />
        </div>

        {/* 3. Email Address */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Email Address {isView ? '' : '*'}
          </label>
          <input
            type="email"
            required={!isView}
            disabled={isView}
            readOnly={isView}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="e.g. elena@metropolis.design"
            className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
            }`}
          />
        </div>

        {/* 4. New PW Optional (Create: Password *) */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            {isCreate
              ? 'Password *'
              : isEdit
              ? 'New Password (Optional)'
              : 'Password'}
          </label>
          <input
            type="password"
            required={isCreate}
            disabled={isView}
            readOnly={isView}
            minLength={4}
            value={isView ? '••••••••' : formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder={
              isCreate
                ? 'Min 4 characters'
                : isEdit
                ? 'Leave blank to retain existing password'
                : 'Protected'
            }
            className={`w-full text-xs font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-500 cursor-not-allowed select-none font-mono tracking-widest'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
            }`}
          />
          {isEdit && (
            <p className="text-[10px] text-neutral-400 font-medium mt-1">
              Leave blank to keep the user&apos;s current password unchanged.
            </p>
          )}
        </div>

        {/* 5. Phone Number (if has show text, else blank) */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            disabled={isView}
            readOnly={isView}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder={isView ? '' : 'e.g. +1 555-0199'}
            className={`w-full text-xs font-mono font-bold rounded-xl px-3.5 py-2.5 outline-none transition-all ${
              isView
                ? 'bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none'
                : 'bg-[#F6F7FB] border border-neutral-200 text-neutral-800 focus:border-neutral-900 focus:bg-white placeholder:text-neutral-400'
            }`}
          />
        </div>

        {/* 6. Role */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-700 mb-1">
            Role
          </label>
          {isView ? (
            <input
              type="text"
              disabled
              readOnly
              value={formData.role}
              className="w-full text-xs font-mono font-bold rounded-xl px-3.5 py-2.5 bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-not-allowed select-none"
            />
          ) : (
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-neutral-900 focus:bg-white transition-all cursor-pointer"
            >
              <option value="USER">USER (Customer Store Access)</option>
              <option value="STOCK">STOCK (Warehouse &amp; Logistics)</option>
              <option value="ADMIN">ADMIN (Full System Privileges)</option>
            </select>
          )}
        </div>

        {/* Form Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
          {isView ? (
            <button
              type="button"
              onClick={onCancel}
              className="h-10 px-6 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onCancel}
                className="h-10 px-4 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold uppercase hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-6 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : isCreate ? (
                  <span>Create Account</span>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
