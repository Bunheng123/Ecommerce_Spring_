import { useState, useEffect, useCallback, useMemo } from 'react';
import WholesaleBuyerForm from '../components/WholesaleBuyerForm';
import { Toast, ConfirmDialog, AlertDialog } from '../utils/swalConfig';
import {
  getAllWholesaleBuyers,
  createWholesaleBuyer,
  updateWholesaleBuyer,
  deleteWholesaleBuyer,
} from '../../api/wholesaleBuyers';

const PAGE_SIZE = 10;
const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE'];

function getBackendErrorMessage(err, fallback = 'Operation failed') {
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

export default function WholesaleBuyersPage() {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Single shared modal state for Create, Edit, and View
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create', // 'create' | 'edit' | 'view'
    buyer: null,
  });

  const loadBuyers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllWholesaleBuyers();
      setBuyers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load wholesale buyers:', err);
      const msg = getBackendErrorMessage(err, 'Failed to fetch wholesale buyers');
      AlertDialog.fire({ title: 'Load Failed', text: msg });
      setBuyers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getAllWholesaleBuyers()
      .then((data) => {
        if (isMounted) {
          setBuyers(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load wholesale buyers:', err);
          const msg = getBackendErrorMessage(err, 'Failed to fetch wholesale buyers');
          AlertDialog.fire({ title: 'Load Failed', text: msg });
          setBuyers([]);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Modal open handlers
  const handleOpenCreate = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
      buyer: null,
    });
  };

  const handleOpenEdit = (buyer) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      buyer,
    });
  };

  const handleOpenView = (buyer) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      buyer,
    });
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setModalState({
      isOpen: false,
      mode: 'create',
      buyer: null,
    });
  };

  // Submit handler for Create & Edit
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (modalState.mode === 'create') {
        await createWholesaleBuyer(formData);
        Toast.fire({ title: 'Wholesale buyer registered successfully' });
      } else if (modalState.mode === 'edit' && modalState.buyer?.id) {
        await updateWholesaleBuyer(modalState.buyer.id, formData);
        Toast.fire({ title: 'Wholesale buyer updated successfully' });
      }

      handleCloseModal();
      loadBuyers();
    } catch (err) {
      console.error('Wholesale buyer form submission failed:', err);
      const msg = getBackendErrorMessage(err, `Failed to ${modalState.mode} wholesale buyer`);
      AlertDialog.fire({ title: 'Operation Failed', text: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / Deactivate handler
  const handleDelete = async (buyer) => {
    const result = await ConfirmDialog.fire({
      title: 'Delete / Deactivate Buyer?',
      text: `Are you sure you want to delete "${buyer.name}"? Note: Buyers with existing wholesale orders will be deactivated rather than hard-deleted.`,
      confirmButtonText: 'Delete / Deactivate',
    });

    if (result.isConfirmed) {
      try {
        await deleteWholesaleBuyer(buyer.id);
        Toast.fire({ title: 'Buyer processed successfully' });
        loadBuyers();
      } catch (err) {
        console.error('Failed to delete wholesale buyer:', err);
        const msg = getBackendErrorMessage(err, 'Failed to delete wholesale buyer');
        AlertDialog.fire({ title: 'Action Failed', text: msg });
      }
    }
  };

  // Filtered & Paginated items
  const filteredBuyers = useMemo(() => {
    return buyers.filter((b) => {
      // Status filter
      if (selectedStatus === 'ACTIVE' && !b.active) return false;
      if (selectedStatus === 'INACTIVE' && b.active) return false;

      // Type filter
      if (selectedType !== 'ALL' && b.type !== selectedType) return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (b.name && b.name.toLowerCase().includes(q)) ||
        (b.contactPerson && b.contactPerson.toLowerCase().includes(q)) ||
        (b.email && b.email.toLowerCase().includes(q)) ||
        (b.phone && b.phone.toLowerCase().includes(q)) ||
        (b.address && b.address.toLowerCase().includes(q))
      );
    });
  }, [buyers, selectedStatus, selectedType, searchQuery]);

  const totalPages = Math.ceil(filteredBuyers.length / PAGE_SIZE) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const paginatedBuyers = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filteredBuyers.slice(start, start + PAGE_SIZE);
  }, [filteredBuyers, activePage]);

  // Statistics
  const totalCount = buyers.length;
  const activeCount = buyers.filter((b) => b.active).length;
  const orgCount = buyers.filter((b) => b.type === 'ORGANIZATION').length;
  const indCount = totalCount - orgCount;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
            COMMERCIAL DISTRIBUTION
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
            Wholesale Buyers
          </h1>
          <p className="text-xs font-bold text-neutral-500 mt-1">
            Manage volume institutional buyers, distribution networks, and partner accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="h-12 px-6 rounded-2xl bg-neutral-950 text-white text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-md shadow-neutral-900/10 flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <span>+</span>
          <span>Add Wholesale Buyer</span>
        </button>
      </div>

      {/* KPI Stat Cards (using shadow-surface) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Total Accounts
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {totalCount}
            </span>
            <span className="text-[10px] font-bold text-neutral-400 font-mono">
              REGISTERED
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Active Buyers
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {activeCount}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border border-neutral-300 text-neutral-800 bg-white">
              ACTIVE
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Corporate Entities
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {orgCount}
            </span>
            <span className="text-[10px] font-bold text-neutral-400 font-mono">
              ORGANIZATIONS
            </span>
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-surface flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
            Individual Clients
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-neutral-900 font-mono">
              {indCount}
            </span>
            <span className="text-[10px] font-bold text-neutral-400 font-mono">
              INDIVIDUALS
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card (using shadow-surface) */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-surface overflow-hidden flex flex-col">
        {/* Search & Filters Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-neutral-50/50">
          {/* Status & Type Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((status) => {
                const isSelected = selectedStatus === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(status);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>

            <div className="h-4 w-px bg-neutral-300 hidden sm:block mx-1" />

            <div className="flex items-center gap-1">
              {['ALL', 'ORGANIZATION', 'INDIVIDUAL'].map((type) => {
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSelectedType(type);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    {type === 'ALL' ? 'ALL TYPES' : type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by buyer, contact, email..."
              className="w-full text-xs font-bold rounded-xl px-3.5 py-2 pl-9 bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-900 outline-none transition-all"
            />
            <svg
              className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2 text-xs font-bold text-neutral-400 hover:text-neutral-800 cursor-pointer"
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Table Body */}
        <div className="overflow-x-auto max-h-[540px] overflow-y-auto relative">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#FAFBFD] z-10 border-b border-neutral-200 shadow-xs">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  ID
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Buyer Name
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Classification
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Contact Person
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Phone & Email
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500 whitespace-nowrap text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-neutral-400 font-mono text-xs uppercase tracking-wider"
                  >
                    Loading wholesale buyers directory...
                  </td>
                </tr>
              ) : paginatedBuyers.length > 0 ? (
                paginatedBuyers.map((buyer) => (
                  <tr
                    key={buyer.id}
                    className="hover:bg-[#F9FAFC] transition-colors font-medium text-neutral-800"
                  >
                    {/* ID */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-neutral-400">
                        #{buyer.id}
                      </span>
                    </td>

                    {/* Buyer Name & Address */}
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-black text-neutral-900 text-xs">
                          {buyer.name}
                        </span>
                        {buyer.address && (
                          <span className="text-[11px] text-neutral-400 line-clamp-1 max-w-[260px]">
                            {buyer.address}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Classification Type Pill */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border border-neutral-300 text-neutral-700 bg-white">
                        {buyer.type || 'ORGANIZATION'}
                      </span>
                    </td>

                    {/* Contact Person */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-neutral-700 text-xs font-bold">
                        {buyer.contactPerson || '—'}
                      </span>
                    </td>

                    {/* Phone & Email */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col font-mono text-[11px]">
                        <span className="text-neutral-800 font-bold">
                          {buyer.phone || '—'}
                        </span>
                        {buyer.email && (
                          <span className="text-neutral-400">
                            {buyer.email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Pill (Black-and-white plain outlined text pill) */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                          buyer.active
                            ? 'border-neutral-300 text-neutral-800 bg-white'
                            : 'border-neutral-200 text-neutral-400 bg-neutral-50'
                        }`}
                      >
                        {buyer.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>

                    {/* Actions (View, Edit, Delete) */}
                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenView(buyer)}
                          className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(buyer)}
                          className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(buyer)}
                          className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete or deactivate wholesale buyer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-neutral-400 font-mono text-xs uppercase tracking-wider"
                  >
                    No wholesale buyers found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination Controls */}
        <div className="p-4 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/30">
          <span className="text-xs font-mono text-neutral-500 font-bold">
            Showing{' '}
            {filteredBuyers.length === 0
              ? '0'
              : `${(activePage - 1) * PAGE_SIZE + 1}–${Math.min(
                  activePage * PAGE_SIZE,
                  filteredBuyers.length
                )}`}{' '}
            of {filteredBuyers.length} buyers
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Previous
              </button>

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

      {/* SINGLE SHARED MODAL: WholesaleBuyerForm (create | edit | view) */}
      {modalState.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={handleCloseModal}
        >
          <div
            className="w-full max-w-lg my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <WholesaleBuyerForm
              mode={modalState.mode}
              initialData={modalState.buyer}
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
