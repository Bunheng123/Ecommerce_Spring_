import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F6FA] text-neutral-900 font-sans antialiased">
      <Sidebar />
      <div className="flex h-screen flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Topbar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
        <footer className="border-t border-neutral-200/80 bg-white px-8 py-4 text-xs font-extrabold uppercase tracking-wider text-neutral-400 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Inventory Management System &bull; Admin Suite</span>
          <span className="font-mono text-[11px] font-bold bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full border border-neutral-200">
            PROD v2.6.4
          </span>
        </footer>
      </div>
    </div>
  );
}
