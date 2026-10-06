import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-line bg-white mt-auto pt-16 pb-12">
      <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 pb-12 border-b border-line">
          {/* Brand & mission */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-extrabold uppercase tracking-[-0.02em] text-ink">
              SHOP
            </h4>
            <p className="text-xs leading-5 text-muted max-w-xs">
              Strict functionalist architecture for premium essentials.
            </p>
          </div>

          {/* About */}
          <div className="flex flex-col gap-2.5">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              ABOUT
            </h5>
            <div className="flex flex-col gap-2 text-xs text-ink/80">
              <Link to="/about" className="hover:text-ink transition-colors">Our Ethos</Link>
              <Link to="/stores" className="hover:text-ink transition-colors">Stores</Link>
              <Link to="/sustainability" className="hover:text-ink transition-colors">Sustainability</Link>
            </div>
          </div>

          {/* Support */}
          <div className="flex flex-col gap-2.5">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              SUPPORT
            </h5>
            <div className="flex flex-col gap-2 text-xs text-ink/80">
              <Link to="/shipping" className="hover:text-ink transition-colors">Shipping &amp; Returns</Link>
              <Link to="/sizing" className="hover:text-ink transition-colors">Size Guide</Link>
              <Link to="/contact" className="hover:text-ink transition-colors">Contact</Link>
            </div>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2.5">
            <h5 className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              LEGAL
            </h5>
            <div className="flex flex-col gap-2 text-xs text-ink/80">
              <Link to="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
              <Link to="/accessibility" className="hover:text-ink transition-colors">Accessibility</Link>
            </div>
          </div>
        </div>

        {/* Bottom copyright bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between text-[10px] font-bold uppercase tracking-[0.08em] text-muted gap-4">
          <p>&copy; {new Date().getFullYear()} SHOP. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-4 text-ink">
            <span className="cursor-pointer hover:opacity-60 transition-opacity">IG</span>
            <span className="cursor-pointer hover:opacity-60 transition-opacity">TW</span>
            <span className="cursor-pointer hover:opacity-60 transition-opacity">IN</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
