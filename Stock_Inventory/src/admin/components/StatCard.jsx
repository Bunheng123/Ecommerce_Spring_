export default function StatCard({
  title = 'Metric',
  value = '0',
  subtext = '',
  icon,
  trend,
  trendUp = true,
  badge,
}) {
  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-surface flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neutral-400">
          {title}
        </span>
        {icon && (
          <div className="h-10 w-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-3xl font-black tracking-tight text-neutral-900">
            {value}
          </span>
          {badge && (
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
              {badge}
            </span>
          )}
        </div>

        {(subtext || trend) && (
          <div className="flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={`font-black text-xs px-2 py-0.5 rounded-md ${
                  trendUp
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {trendUp ? '↑' : '↓'} {trend}
              </span>
            )}
            {subtext && (
              <span className="text-neutral-500 font-bold text-xs truncate">
                {subtext}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
