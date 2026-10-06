import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard, { ProductCardSkeleton } from '../../components/customer/ProductCard';
import { fetchProducts } from '../../api/products';
import { PREVIEW_RECOMMENDATIONS } from '../../data/previewProducts';
import { useCart } from '../../context/CartContext';

const COPY = {
  heroTitle: 'RADICAL SIMPLICITY',
  heroSub:
    'Purified functional artifacts engineered without ornament, transient trends, or visual noise. An uncompromising monochromatic design language for daily living.',
  metrics: [
    ['100%', 'MONOCHROMATIC PURITY'],
    ['0.00', 'CENTRALIZED LOGISTICS'],
    ['GRADE 5', 'TITANIUM & VIRGIN WOOL'],
    ['LIFETIME', 'FUNCTIONAL GUARANTEE'],
  ],
  philosophy: [
    [
      'CRITERION 01',
      'ZERO RGB DEVIATION',
      'Every pigment, surface finish, and stitch adheres to strict grayscale norms. We reject chromatic distractions to highlight form, texture and pure tactile weight.',
    ],
    [
      'CRITERION 02',
      'STRUCTURAL HARDWARE',
      'Mil-spec aerospace aluminum, unpolished ceramics, cold steam-cured rubber. Materials chosen for longevity and authentic chemical resistance over seasonal novelty.',
    ],
    [
      'CRITERION 03',
      'REDUCED RUN PRODUCTION',
      'Manufactured in controlled micro-batches across specialized ateliers in Kyoto, Solingen, and Biella. Numbered sequence seals on all shipments.',
    ],
  ],
  newsletter: {
    badge: 'DISPATCH NETWORK',
    title: 'JOIN THE SYNDICATE',
    body: 'Curated drops, material research, and architectural previews. Zero marketing fluff. Strictly once per week.',
    fine: 'ENCRYPTED TRANSMISSION • UNSUBSCRIBE WITH A DUTY-FREE CLICK',
  },
};

const toCard = (p) => {
  const stock = p.stock ?? p.quantity ?? null;
  const category = p.category?.name ?? p.categoryName ?? 'HARDWARE';
  const low = p.reorderLevel != null && stock != null && stock > 0 && stock <= p.reorderLevel;
  return {
    ...p,
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    imageUrl: p.imageUrl,
    stock: p.stock,
    costPrice: p.costPrice,
    reorderLevel: p.reorderLevel,
    categoryId: p.categoryId,
    categoryName: category,
    galleryImageUrls: p.galleryImageUrls,
    label: p.label || `${category.toUpperCase()} / ${String(p.id).padStart(2, '0')}`,
    badge: p.badge || (stock === 0 ? 'Sold out' : low ? 'Low stock' : null),
    rating: p.rating ?? 5,
    reviews: p.reviews ?? 50,
  };
};

const eyebrow = 'text-[10px] font-bold uppercase leading-3 tracking-[0.12em]';
const h2 = 'text-2xl font-bold uppercase leading-7 tracking-[-0.025em] text-ink';
const wrap = 'mx-auto w-full max-w-[1280px] px-6 md:px-12';

function SectionHeader({ kicker, title, right }) {
  return (
    <div className="flex items-end justify-between border-b border-line pb-2.5">
      <div className="flex flex-col gap-1">
        <span className={`${eyebrow} text-muted`}>{kicker}</span>
        <h2 className={h2}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

const Chevron = ({ flip }) => (
  <svg
    width="6"
    height="10"
    viewBox="0 0 6 10"
    fill="none"
    className={flip ? 'rotate-180' : ''}
    aria-hidden="true"
  >
    <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export default function HomePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const track = useRef(null);
  const { addItem } = useCart();

  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data.map(toCard));
        }
      })
      .catch((err) => {
        console.warn('Failed to load products:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const featured = products.slice(0, 8);
  const recs = PREVIEW_RECOMMENDATIONS;
  const scrollRecs = (dir) =>
    track.current?.scrollBy({ left: dir * 310, behavior: 'smooth' });

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/shop${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
  };

  const handleAddToCart = (item) => addItem(item, 1);

  const handleBuyNow = async (item) => {
    const res = await addItem(item, 1);
    if (!res?.redirected) {
      navigate('/checkout');
    }
  };

  return (
    <main className="bg-surface">
      {/* Hero Section */}
      <section className="border-b border-line bg-surface py-16 md:py-24">
        <div className={`${wrap} flex flex-col items-center text-center`}>
          <h1 className="max-w-[1024px] text-5xl font-extrabold uppercase leading-[1.05] tracking-[-0.05em] text-ink md:text-[76px]">
            {COPY.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-[26px] text-muted">
            {COPY.heroSub}
          </p>

          <form
            onSubmit={onSearch}
            className="mt-10 flex w-full max-w-2xl items-center gap-2 border border-line bg-white p-1.5 shadow-sm"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="ml-4 shrink-0 text-subtle"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11L15 15" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalog: Titanium Pen, Ceramic Pour-Over, Wool Blazer..."
              className="min-w-0 flex-1 bg-transparent py-[11px] text-sm text-ink outline-none placeholder:text-subtle font-sans"
            />
            <button
              type="submit"
              className="flex h-[42px] shrink-0 items-center gap-1 border border-ink bg-ink px-6 text-xs font-semibold uppercase tracking-[0.1em] text-white hover:bg-white hover:text-ink md:px-8 transition-colors"
            >
              <span>Search</span>
              <span>&rarr;</span>
            </button>
          </form>

          {/* Metrics */}
          <dl className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-x-10 gap-y-6 border-t border-line pt-8 text-left md:grid-cols-4">
            {COPY.metrics.map(([value, label]) => (
              <div key={label} className="flex flex-col gap-1">
                <dd className="order-1 text-xl font-bold leading-6 tracking-[-0.01em] text-ink">
                  {value}
                </dd>
                <dt className={`order-2 ${eyebrow} tracking-[0.06em] text-muted`}>
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Storefront Grid: ESSENTIAL ARTIFACTS */}
      <section className="bg-white py-12">
        <div className={`${wrap} flex flex-col gap-6`}>
          <SectionHeader
            kicker="COLLECTION REFERENCE 02"
            title="ESSENTIAL ARTIFACTS"
            right={
              <span className={`${eyebrow} text-muted`}>
                {loading
                  ? 'LOADING EDITIONS...'
                  : `${String(featured.length).padStart(2, '0')} CORE EDITIONS`}
              </span>
            }
          />
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <ProductCardSkeleton key={`home-skeleton-${idx}`} />
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  variant="grid"
                  onAdd={handleAddToCart}
                  onBuy={handleBuyNow}
                />
              ))}
            </div>
          ) : (
            <div className="border border-line bg-white p-12 text-center shadow-surface">
              <p className="text-sm font-bold uppercase tracking-wider text-muted">
                No artifacts currently available in catalog.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Philosophy Band: 3 Columns */}
      <section className="border-y border-line bg-surface py-12">
        <div className={`${wrap} grid gap-8 md:grid-cols-3`}>
          {COPY.philosophy.map(([kicker, title, body], i) => (
            <div
              key={title}
              className={`flex flex-col gap-1.5 ${
                i > 0 ? 'md:border-l md:border-line md:pl-8' : ''
              }`}
            >
              <span className={`${eyebrow} text-subtle`}>{kicker}</span>
              <h4 className="pb-1 text-base font-bold uppercase leading-6 tracking-[-0.01em] text-ink">
                {title}
              </h4>
              <p className="text-[13px] leading-[22px] text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recommendations Carousel: EXPLORE OUR RECOMMENDATIONS */}
      <section className="bg-white py-12">
        <div className={`${wrap} flex flex-col gap-6`}>
          <SectionHeader
            kicker="CURATED EXTENSIONS"
            title="EXPLORE OUR RECOMMENDATIONS"
            right={
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Previous recommendation"
                  onClick={() => scrollRecs(-1)}
                  className="flex h-9 w-9 items-center justify-center border border-line bg-white text-ink hover:border-ink transition-colors"
                >
                  <Chevron flip />
                </button>
                <button
                  type="button"
                  aria-label="Next recommendation"
                  onClick={() => scrollRecs(1)}
                  className="flex h-9 w-9 items-center justify-center border border-ink bg-ink text-white hover:bg-neutral-800 transition-colors"
                >
                  <Chevron />
                </button>
              </div>
            }
          />
          <div
            ref={track}
            className="flex gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {recs.map((p) => (
              <div key={p.id} className="min-w-[270px] flex-1">
                <ProductCard
                  product={p}
                  variant="compact"
                  onAdd={handleAddToCart}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter: JOIN THE SYNDICATE */}
      <section className="bg-ink px-6 py-24 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center">
          <span className="border border-muted/60 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-fog">
            {COPY.newsletter.badge}
          </span>
          <h2 className="mt-5 text-4xl font-extrabold uppercase leading-none tracking-[-0.05em] text-white md:text-5xl">
            {COPY.newsletter.title}
          </h2>
          <p className="mt-3 max-w-xl pb-10 text-sm leading-6 text-fog">
            {COPY.newsletter.body}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email) setSubscribed(true);
            }}
            className="flex w-full max-w-lg flex-col gap-2 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address..."
              className="min-w-0 flex-1 border border-muted/50 bg-white/10 px-4 py-[14px] text-sm text-white outline-none placeholder:text-subtle font-sans"
            />
            <button
              type="submit"
              className="h-[48px] bg-white px-8 text-xs font-bold uppercase tracking-[0.1em] text-ink hover:bg-neutral-200 transition-colors"
            >
              {subscribed ? 'Done' : 'Subscribe'}
            </button>
          </form>
          <p className="pt-5 text-[10px] uppercase tracking-[0.08em] text-muted">
            {COPY.newsletter.fine}
          </p>
        </div>
      </section>
    </main>
  );
}
