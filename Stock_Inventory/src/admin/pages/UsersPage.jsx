import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserForm from '../components/UserForm';
import { Toast, ConfirmDialog, AlertDialog } from '../utils/swalConfig';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  uploadUserProfilePicture,
} from '../../api/users';

const PAGE_SIZE = 10;
const ROLE_FILTERS = ['ALL', 'ADMIN', 'STOCK', 'USER'];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Single shared modal state for Create, Edit, and View
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit' | 'view'
    user: null,
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to fetch users';
      AlertDialog.fire({ title: 'Load Failed', text: typeof msg === 'string' ? msg.replace(/^Error\s*:\s*/i, '') : 'Failed to fetch users' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Open modal helpers
  const handleOpenCreate = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
      user: null,
    });
  };

  const handleOpenEdit = (user) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      user,
    });
  };

  const handleOpenView = (user) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      user,
    });
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setModalState({
      isOpen: false,
      mode: 'create',
      user: null,
    });
  };

  // Submit handler for Create and Edit using UserForm payload
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (modalState.mode === 'create') {
        const created = await createUser(formData);
        let finalUser = created;
        if (formData.profileFile && created?.id) {
          try {
            const uploadResult = await uploadUserProfilePicture(created.id, formData.profileFile);
            if (uploadResult) finalUser = uploadResult;
          } catch (uploadErr) {
            console.warn('Profile picture upload failed after user creation:', uploadErr);
            Toast.fire({ title: 'User created, but photo upload failed' });
          }
        }
        // Update local state immediately so avatar shows without full reload
        if (finalUser) {
          setUsers((prev) => [finalUser, ...prev]);
        }
        Toast.fire({ title: 'User created successfully' });
      } else if (modalState.mode === 'edit') {
        const updated = await updateUser(modalState.user.id, formData);
        let finalUser = updated;

        if (formData.profileFile) {
          try {
            const uploadResult = await uploadUserProfilePicture(modalState.user.id, formData.profileFile);
            if (uploadResult) finalUser = uploadResult;
            Toast.fire({ title: 'Profile photo updated successfully' });
          } catch (uploadErr) {
            console.warn('Profile picture upload failed:', uploadErr);
            const uploadMsg =
              uploadErr.response?.data?.message || uploadErr.message || 'Photo upload failed';
            Toast.fire({ title: `User updated, but photo upload failed: ${uploadMsg}` });
          }
        }

        // Update local state immediately with latest data (including new profileImageUrl)
        if (finalUser) {
          setUsers((prev) =>
            prev.map((u) => (u.id === modalState.user.id ? { ...u, ...finalUser } : u))
          );
        }
        Toast.fire({ title: 'User updated successfully' });
      }
      handleCloseModal();
      // Also do a full reload to make sure we are in sync with the server
      await loadUsers();
    } catch (err) {
      console.error(`Failed to ${modalState.mode} user:`, err);
      const msg = err.response?.data?.message || err.message || `Failed to ${modalState.mode} user`;
      AlertDialog.fire({
        title: `${modalState.mode === 'create' ? 'Creation' : 'Update'} Failed`,
        text: typeof msg === 'string' ? msg.replace(/^Error\s*:\s*/i, '') : 'Operation failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // SweetAlert2 Delete Confirmation
  const handleDeleteUser = async (targetUser) => {
    const isSelf =
      currentUser &&
      (Number(currentUser.id) === Number(targetUser.id) ||
        currentUser.username === targetUser.username);

    if (isSelf) {
      AlertDialog.fire({
        title: 'Action Prohibited',
        text: 'You cannot delete your own account.',
      });
      return;
    }

    const result = await ConfirmDialog.fire({
      title: 'Delete User?',
      text: `Permanently delete "${targetUser.fullName || targetUser.username}" (${targetUser.email})? This action cannot be reversed.`,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        await deleteUser(targetUser.id);
        Toast.fire({ title: 'User deleted successfully' });
        await loadUsers();
      } catch (err) {
        console.error('Failed to delete user:', err);
        const statusCode = err.response?.status;
        if (statusCode === 401) {
          AlertDialog.fire({
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
          });
        } else {
          const msg = err.response?.data?.message || err.message || 'Failed to delete user';
          AlertDialog.fire({
            title: 'Delete Failed',
            text: typeof msg === 'string' ? msg.replace(/^Error\s*:\s*/i, '') : 'Failed to delete user',
          });
        }
      }
    }
  };

  // Search & Filter changes reset pagination to page 1
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (role) => {
    setSelectedRole(role);
    setCurrentPage(1);
  };

  // Combined Filtering: Role Filter + Search Query
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Role match
      const userRole = String(u.role || 'USER').toUpperCase();
      const matchesRole =
        selectedRole === 'ALL' || userRole === selectedRole.toUpperCase();

      // 2. Search match
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && String(u.id).includes(q));

      return matchesRole && matchesSearch;
    });
  }, [users, selectedRole, searchQuery]);

  // Client-Side Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            ACCESS &amp; IDENTITIES
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
            User Management
          </h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Manage administrative staff, warehouse controllers, and customer accounts.
          </p>
        </div>

        {/* Action Button: Add User */}
        <div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="h-10 px-5 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            <span className="text-base leading-none">+</span>
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-surface overflow-hidden flex flex-col">
        {/* Table Controls: Role Filter Buttons + Search Bar */}
        <div className="p-5 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 mr-1.5 hidden sm:inline">
              Role:
            </span>
            {ROLE_FILTERS.map((role) => {
              const isActive = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleFilterChange(role)}
                  className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  {role}
                  {role === 'ALL'
                    ? ` (${users.length})`
                    : ` (${users.filter((u) => String(u.role || 'USER').toUpperCase() === role).length})`}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <svg
              className="absolute left-3.5 top-2.5 w-4 h-4 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name, email, ID..."
              className="w-full bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 placeholder:text-neutral-400 rounded-xl pl-10 pr-8 py-2 outline-none focus:border-neutral-900 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2 text-xs font-bold text-neutral-400 hover:text-neutral-800"
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Table Body with Sticky Header */}
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto relative">
          <table className="w-full min-w-[760px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#FAFBFD] z-10 border-b border-neutral-200 shadow-xs">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  ID
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Avatar
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  User Details
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Email
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Role
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-neutral-400 font-mono text-xs uppercase tracking-wider">
                    Loading users directory...
                  </td>
                </tr>
              ) : paginatedUsers.length > 0 ? (
                paginatedUsers.map((row) => {
                  const role = String(row.role || 'USER').toUpperCase();
                  const isUserRole = role === 'USER';
                  const isSelf =
                    currentUser &&
                    (Number(currentUser.id) === Number(row.id) ||
                      currentUser.username === row.username);

                  const displayName = row.fullName || row.username || 'User';
                  const initials = displayName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#F9FAFC] transition-colors font-medium text-neutral-800"
                    >
                      {/* ID */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-neutral-400">
                          #{row.id}
                        </span>
                      </td>

                      {/* Avatar */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {row.profileImageUrl ? (
                          <img
                            src={row.profileImageUrl}
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover border border-neutral-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-black text-[11px] font-mono tracking-tight">
                            {initials}
                          </div>
                        )}
                      </td>

                      {/* Username / Name */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-neutral-900 text-xs">
                              {displayName}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] font-black uppercase tracking-wider bg-neutral-900 text-white px-2 py-0.5 rounded-full">
                                YOU
                              </span>
                            )}
                          </div>
                          {row.fullName && row.fullName !== row.username && (
                            <span className="text-[11px] text-neutral-400 font-mono">
                              @{row.username}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="text-neutral-600 text-xs font-medium">
                          {row.email}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider border ${
                            role === 'ADMIN'
                              ? 'bg-neutral-900 text-white border-neutral-900'
                              : role === 'STOCK'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}
                        >
                          {role}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {/* VIEW Action: Always available for all rows */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(row)}
                            title="View user details"
                            className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-neutral-600 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View</span>
                          </button>

                          {/* EDIT Action: Available for all users */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(row)}
                            title="Edit user"
                            className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-neutral-700 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            <span>Edit</span>
                          </button>

                          {/* DELETE Action: Any user except current logged-in admin's own row */}
                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(row)}
                              title="Delete user"
                              className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-12 w-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center font-black text-lg">
                        ∅
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                        No users match the selected filters.
                      </span>
                      {(selectedRole !== 'ALL' || searchQuery) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRole('ALL');
                            setSearchQuery('');
                            setCurrentPage(1);
                          }}
                          className="mt-2 text-xs font-black uppercase tracking-wider text-neutral-900 underline cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination & Record Count */}
        <div className="px-6 py-4 bg-[#FAFBFD] border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-bold text-neutral-500">
            {filteredUsers.length > 0 ? (
              <span>
                Showing{' '}
                <strong className="text-neutral-900 font-black">
                  {startIndex + 1} &ndash;{' '}
                  {Math.min(startIndex + PAGE_SIZE, filteredUsers.length)}
                </strong>{' '}
                of <strong className="text-neutral-900 font-black">{filteredUsers.length}</strong> users
                {filteredUsers.length !== users.length && (
                  <span className="text-neutral-400 ml-1">
                    (filtered from {users.length} total)
                  </span>
                )}
              </span>
            ) : (
              <span>0 users found</span>
            )}
          </div>

          {/* Flat Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {/* Previous Button */}
              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Previous
              </button>

              {/* Page Number Buttons */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                const isCurrent = pageNum === activePage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center text-xs font-mono font-black rounded-xl transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                type="button"
                disabled={activePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SINGLE SHARED MODAL: Renders UserForm with mode="create" | "edit" | "view" */}
      {modalState.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-lg my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <UserForm
              mode={modalState.mode}
              initialData={modalState.user}
              onSubmit={handleFormSubmit}
              onCancel={handleCloseModal}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
