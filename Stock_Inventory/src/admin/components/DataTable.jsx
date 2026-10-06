import { useState } from 'react';

export default function DataTable({
  title = 'Data Table',
  subtitle = '',
  columns = [],
  data = [],
  actionButton = null,
  searchPlaceholder = 'Filter records...',
  emptyMessage = 'No records found in current view.',
}) {
  const [query, setQuery] = useState('');

  const filtered = data.filter((row) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return Object.values(row).some((val) =>
      String(val ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-surface overflow-hidden">
      {/* Header with Title and Actions */}
      <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs font-bold text-neutral-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Rounded search bar */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-56 bg-[#F6F7FB] border border-neutral-200 text-xs font-bold text-neutral-800 placeholder:text-neutral-400 rounded-xl px-3.5 py-2 outline-none focus:border-neutral-900 focus:bg-white transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2 text-xs font-bold text-neutral-400 hover:text-neutral-800"
              >
                &times;
              </button>
            )}
          </div>

          {actionButton}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAFBFD] border-b border-neutral-100">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400 whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-xs">
            {filtered.length > 0 ? (
              filtered.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className="hover:bg-[#F9FAFC] transition-colors font-medium text-neutral-800"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-neutral-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center font-black text-lg">
                      ∅
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                      {emptyMessage}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Status */}
      <div className="px-6 py-4 bg-[#FAFBFD] border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-neutral-400">
        <span>Showing {filtered.length} of {data.length} records</span>
        <span className="font-mono text-[11px] uppercase text-neutral-500">
          Page 1 of 1
        </span>
      </div>
    </div>
  );
}
