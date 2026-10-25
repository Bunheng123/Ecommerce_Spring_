export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400 block mb-1">
          SYSTEM CONFIGURATION
        </span>
        <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">
          Settings
        </h1>
        <p className="text-xs font-bold text-neutral-500 mt-1">
          Configure application preferences, store metadata, and operational defaults.
        </p>
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-8 shadow-surface">
        <p className="text-sm font-bold text-neutral-500">System settings are currently managed via application properties.</p>
      </div>
    </div>
  );
}
