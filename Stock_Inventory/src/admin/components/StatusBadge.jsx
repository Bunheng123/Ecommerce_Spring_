export default function StatusBadge({ status = 'ACTIVE' }) {
  const norm = String(status).toUpperCase();

  let styles = 'bg-neutral-100 text-neutral-800 border-neutral-200';
  let dotColor = 'bg-neutral-500';

  if (['ACTIVE', 'COMPLETED', 'PAID', 'DELIVERED', 'IN_STOCK'].includes(norm)) {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (['PENDING', 'PROCESSING', 'LOW_STOCK', 'UNPAID'].includes(norm)) {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (['CANCELLED', 'REFUNDED', 'OUT_OF_STOCK', 'INACTIVE', 'FAILED'].includes(norm)) {
    styles = 'bg-rose-50 text-rose-800 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (['ADMIN', 'STOCK', 'USER'].includes(norm)) {
    styles = 'bg-indigo-50 text-indigo-800 border-indigo-200';
    dotColor = 'bg-indigo-500';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-2xs ${styles}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
      <span>{norm.replace(/_/g, ' ')}</span>
    </span>
  );
}
