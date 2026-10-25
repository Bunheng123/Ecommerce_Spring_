import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard, {
  ProductCardSkeleton,
} from "../../components/customer/ProductCard";
import { fetchProducts } from "../../api/products";
import { PREVIEW_RECOMMENDATIONS } from "../../data/previewProducts";
import { useCart } from "../../context/CartContext";

// Helper to convert clean SVG markup to a data URI for fast, transparent rendering
const toSvgDataUri = (svg) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

// ─── HIGH-DEFINITION VECTOR GARMENT CUTOUT ARTWORK ───────────────────────────
const KNIT_SWEATER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 360" fill="none">
  <defs>
    <linearGradient id="knitBody" x1="140" y1="20" x2="140" y2="340" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#383633" />
      <stop offset="45%" stop-color="#2a2927" />
      <stop offset="100%" stop-color="#1c1b1a" />
    </linearGradient>
    <linearGradient id="knitHighlight" x1="80" y1="40" x2="200" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4a4744" />
      <stop offset="50%" stop-color="#5a5652" />
      <stop offset="100%" stop-color="#4a4744" />
    </linearGradient>
  </defs>
  <!-- Main Sweater Body & Relaxed Dropped Sleeves -->
  <path d="M 96 26 C 112 34 168 34 184 26 L 272 88 L 244 154 L 210 126 L 210 324 C 210 332 204 338 196 338 L 84 338 C 76 338 70 332 70 324 L 70 126 L 36 154 L 8 88 Z" fill="url(#knitBody)" stroke="#161514" stroke-width="1.5" />
  <!-- Ribbed Crewneck Collar -->
  <path d="M 96 26 C 112 38 168 38 184 26 C 174 44 106 44 96 26 Z" fill="#201f1e" stroke="url(#knitHighlight)" stroke-width="1.2" />
  <!-- Knitted Texture Ribs & Shadow Creases -->
  <path d="M 108 50 L 108 318" stroke="#3d3b38" stroke-width="1" stroke-dasharray="2 3" opacity="0.6" />
  <path d="M 124 54 L 124 318" stroke="#3d3b38" stroke-width="1" stroke-dasharray="2 3" opacity="0.6" />
  <path d="M 140 56 L 140 318" stroke="#3d3b38" stroke-width="1" stroke-dasharray="2 3" opacity="0.7" />
  <path d="M 156 54 L 156 318" stroke="#3d3b38" stroke-width="1" stroke-dasharray="2 3" opacity="0.6" />
  <path d="M 172 50 L 172 318" stroke="#3d3b38" stroke-width="1" stroke-dasharray="2 3" opacity="0.6" />
  <!-- Sleeve Knitted Seams -->
  <path d="M 70 126 L 94 65" stroke="#161514" stroke-width="1.2" />
  <path d="M 210 126 L 186 65" stroke="#161514" stroke-width="1.2" />
  <!-- Ribbed Hem Band with Subtle Fray Notches -->
  <rect x="70" y="322" width="140" height="16" fill="#1e1d1c" stroke="#383633" stroke-width="1" />
  <path d="M 115 338 L 118 332 L 122 338" stroke="#100f0e" stroke-width="1.5" fill="none" />
  <path d="M 162 338 L 165 331 L 169 338" stroke="#100f0e" stroke-width="1.5" fill="none" />
</svg>`;

const GRAPHIC_HOODIE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 360" fill="none">
  <defs>
    <linearGradient id="hoodieBody" x1="140" y1="20" x2="140" y2="340" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2a2827" />
      <stop offset="55%" stop-color="#1f1e1d" />
      <stop offset="100%" stop-color="#141312" />
    </linearGradient>
  </defs>
  <!-- Draped Hood Collar behind shoulders -->
  <path d="M 98 22 C 114 10 166 10 182 22 C 196 34 196 58 182 66 C 162 74 118 74 98 66 C 84 58 84 34 98 22 Z" fill="#1b1a19" stroke="#383533" stroke-width="1.5" />
  <!-- Oversized Hoodie Body & Baggy Sleeves -->
  <path d="M 98 42 L 272 98 L 244 162 L 212 134 L 212 325 C 212 333 206 338 198 338 L 82 338 C 74 338 68 333 68 325 L 68 134 L 36 162 L 8 98 Z" fill="url(#hoodieBody)" stroke="#11100f" stroke-width="1.5" />
  <!-- Kangaroo Pouch Pocket with Stitch Lines -->
  <path d="M 90 225 L 190 225 L 206 305 L 74 305 Z" fill="#1a1817" stroke="#33302e" stroke-width="1.2" />
  <line x1="90" y1="225" x2="190" y2="225" stroke="#3d3a37" stroke-width="1" />
  <!-- Vintage Graphic Typography Print on Chest -->
  <text x="140" y="142" text-anchor="middle" fill="#d6d3d1" font-family="Space Grotesk, sans-serif" font-size="12" font-weight="900" letter-spacing="4" opacity="0.85">THE NEW ERA</text>
  <text x="140" y="157" text-anchor="middle" fill="#a8a29e" font-family="Space Grotesk, sans-serif" font-size="7.5" font-weight="700" letter-spacing="2" opacity="0.75">ARCHIVAL FLEECE / 026</text>
  <!-- Hanging Braided Drawstrings with Metal Aglets -->
  <path d="M 126 55 Q 124 95 128 126" stroke="#e5e5e5" stroke-width="2.4" stroke-linecap="round" fill="none" />
  <rect x="126" y="122" width="4.5" height="9" rx="1" fill="#9ca3af" stroke="#4b5563" stroke-width="0.6" />
  <path d="M 154 55 Q 156 90 152 118" stroke="#e5e5e5" stroke-width="2.4" stroke-linecap="round" fill="none" />
  <rect x="150" y="114" width="4.5" height="9" rx="1" fill="#9ca3af" stroke="#4b5563" stroke-width="0.6" />
  <!-- Ribbed Hem -->
  <rect x="68" y="322" width="144" height="16" fill="#171615" stroke="#2e2b29" stroke-width="1" />
</svg>`;

const WIDE_LEG_DENIM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 360" fill="none">
  <defs>
    <linearGradient id="denimBody" x1="140" y1="35" x2="140" y2="350" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#42505d" />
      <stop offset="40%" stop-color="#34404c" />
      <stop offset="100%" stop-color="#222a32" />
    </linearGradient>
  </defs>
  <!-- Wide-Leg Baggy Denim Jeans -->
  <path d="M 64 52 L 216 52 L 222 342 L 150 342 L 140 155 L 130 342 L 58 342 Z" fill="url(#denimBody)" stroke="#1a2027" stroke-width="1.5" />
  <!-- Folded Waistband clamped by clips -->
  <rect x="64" y="52" width="152" height="18" fill="#2d3640" stroke="#192027" stroke-width="1.2" />
  <!-- Reinforced Belt Loops -->
  <rect x="72" y="49" width="4" height="24" fill="#1c232a" />
  <rect x="114" y="49" width="4" height="24" fill="#1c232a" />
  <rect x="162" y="49" width="4" height="24" fill="#1c232a" />
  <rect x="204" y="49" width="4" height="24" fill="#1c232a" />
  <!-- Center Copper Button & Fly Stitching -->
  <circle cx="140" cy="61" r="2.8" fill="#d97706" stroke="#92400e" stroke-width="0.8" />
  <path d="M 140 70 L 140 134 C 140 148 148 152 148 152" stroke="#b45309" stroke-width="1.2" fill="none" stroke-dasharray="3 1.5" />
  <!-- Front Slash Pockets with Copper Rivets -->
  <path d="M 68 70 C 94 70 98 104 98 114" stroke="#b45309" stroke-width="1.2" fill="none" stroke-dasharray="3 1.5" />
  <circle cx="98" cy="114" r="1.5" fill="#d97706" />
  <path d="M 212 70 C 186 70 182 104 182 114" stroke="#b45309" stroke-width="1.2" fill="none" stroke-dasharray="3 1.5" />
  <circle cx="182" cy="114" r="1.5" fill="#d97706" />
  <!-- Whisker and Knee Fades -->
  <line x1="84" y1="120" x2="128" y2="136" stroke="#5b6c7d" stroke-width="1.2" opacity="0.65" />
  <line x1="196" y1="120" x2="152" y2="136" stroke="#5b6c7d" stroke-width="1.2" opacity="0.65" />
  <line x1="76" y1="210" x2="126" y2="216" stroke="#5b6c7d" stroke-width="1.5" opacity="0.55" />
  <line x1="204" y1="210" x2="154" y2="216" stroke="#5b6c7d" stroke-width="1.5" opacity="0.55" />
  <!-- Raw Folded Baggy Hem Cuffs -->
  <rect x="58" y="328" width="92" height="14" fill="#252d36" stroke="#192027" stroke-width="1" />
  <rect x="130" y="328" width="92" height="14" fill="#252d36" stroke="#192027" stroke-width="1" />
</svg>`;

const TAILORED_BLAZER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 360" fill="none">
  <defs>
    <linearGradient id="blazerBody" x1="140" y1="20" x2="140" y2="340" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#242323" />
      <stop offset="50%" stop-color="#181717" />
      <stop offset="100%" stop-color="#0e0d0d" />
    </linearGradient>
  </defs>
  <!-- Architectural Blazer Body & Structured Sleeves -->
  <path d="M 98 28 L 272 74 L 246 182 L 216 148 L 216 332 C 216 337 210 342 202 342 L 78 342 C 70 342 64 337 64 332 L 64 148 L 34 182 L 8 74 Z" fill="url(#blazerBody)" stroke="#050505" stroke-width="1.5" />
  <!-- Sharp Peak Lapels -->
  <path d="M 98 28 L 78 122 L 116 178 L 138 232 L 140 38 Z" fill="#1c1b1b" stroke="#383838" stroke-width="1.2" />
  <path d="M 182 28 L 202 122 L 164 178 L 142 232 L 140 38 Z" fill="#171616" stroke="#383838" stroke-width="1.2" />
  <!-- Welt Chest Pocket with Minimal Pocket Square Edge -->
  <rect x="86" y="142" width="34" height="6" fill="#121111" stroke="#404040" stroke-width="0.8" />
  <line x1="92" y1="142" x2="108" y2="142" stroke="#f5f5f5" stroke-width="1.5" />
  <!-- Front Horn Fastening Buttons -->
  <circle cx="140" cy="246" r="3.2" fill="#2d2b28" stroke="#525252" stroke-width="1" />
  <circle cx="140" cy="278" r="3.2" fill="#2d2b28" stroke="#525252" stroke-width="1" />
  <!-- Flap Hip Pockets -->
  <rect x="74" y="270" width="46" height="12" rx="1" fill="#141313" stroke="#333333" stroke-width="1" />
  <rect x="160" y="270" width="46" height="12" rx="1" fill="#141313" stroke="#333333" stroke-width="1" />
  <!-- Raw Deconstructed Hem Finish -->
</svg>`;

export const FALLBACK_MAP = {
  1: toSvgDataUri(KNIT_SWEATER_SVG),
  2: toSvgDataUri(GRAPHIC_HOODIE_SVG),
  3: toSvgDataUri(WIDE_LEG_DENIM_SVG),
  4: toSvgDataUri(TAILORED_BLAZER_SVG),
};

// ─── HERO RAIL CONFIGURATION ────────────────────────────────────────────────
// Clean, isolated garment cutout images hanging from the interactive rail.
// Replace `imageUrl` with any transparent-cutout PNG or external CDN string anytime.
export const HERO_RAIL_ITEMS = [
  {
    id: 1,
    productId: 1,
    title: "DISTRESSED CTRL KNIT SWEATER",
    subtitle: "HEAVYWEIGHT KNIT",
    imageUrl: "/hero-rail/sweater.png",
    defaultZ: 10,
    swingDuration: "4.6s",
    swingDelay: "0s",
    overlapMargin: "0px",
  },
  {
    id: 2,
    productId: 2,
    title: "WASHED CTRL GRAPHIC HOODIE",
    subtitle: "VINTAGE FLEECE",
    imageUrl: "/hero-rail/hoodie.png",
    defaultZ: 20,
    swingDuration: "5.2s",
    swingDelay: "-1.3s",
    overlapMargin: "-36px",
  },
  {
    id: 3,
    productId: 3,
    title: "ARCENE WIDE LEG WASHED DENIM",
    subtitle: "BAGGY FIT",
    imageUrl: "/hero-rail/denim.png",
    defaultZ: 15,
    swingDuration: "4.9s",
    swingDelay: "-2.5s",
    overlapMargin: "-32px",
  },
  {
    id: 4,
    productId: 4,
    title: "CTRL RAW-HEM TAILORED BLAZER",
    subtitle: "RAW HEM",
    imageUrl: "/hero-rail/blazer.png",
    defaultZ: 25,
    swingDuration: "5.5s",
    swingDelay: "-0.8s",
    overlapMargin: "-36px",
  },
];

const COPY = {
  heroTitle: "RADICAL SIMPLICITY",
  heroSub:
    "Purified functional artifacts engineered without ornament, transient trends, or visual noise. An uncompromising monochromatic design language for daily living.",
  metrics: [
    ["100%", "MONOCHROMATIC PURITY"],
    ["0.00", "CENTRALIZED LOGISTICS"],
    ["GRADE 5", "TITANIUM & VIRGIN WOOL"],
    ["LIFETIME", "FUNCTIONAL GUARANTEE"],
  ],
  philosophy: [
    [
      "CRITERION 01",
      "ZERO RGB DEVIATION",
      "Every pigment, surface finish, and stitch adheres to strict grayscale norms. We reject chromatic distractions to highlight form, texture and pure tactile weight.",
    ],
    [
      "CRITERION 02",
      "STRUCTURAL HARDWARE",
      "Mil-spec aerospace aluminum, unpolished ceramics, cold steam-cured rubber. Materials chosen for longevity and authentic chemical resistance over seasonal novelty.",
    ],
    [
      "CRITERION 03",
      "REDUCED RUN PRODUCTION",
      "Manufactured in controlled micro-batches across specialized ateliers in Kyoto, Solingen, and Biella. Numbered sequence seals on all shipments.",
    ],
  ],
  newsletter: {
    badge: "DISPATCH NETWORK",
    title: "JOIN THE SYNDICATE",
    body: "Curated drops, material research, and architectural previews. Zero marketing fluff. Strictly once per week.",
    fine: "ENCRYPTED TRANSMISSION • UNSUBSCRIBE WITH A DUTY-FREE CLICK",
  },
};

const toCard = (p) => {
  const stock = p.stock ?? p.quantity ?? null;
  const category = p.category?.name ?? p.categoryName ?? "HARDWARE";
  const numStock = Number(stock ?? 0);
  const threshold =
    p.reorderLevel != null && p.reorderLevel > 0 ? p.reorderLevel : 5;
  const isComingSoon = (stock === 0 || numStock <= 0) && Boolean(p.comingSoon);
  const isSoldOut = !isComingSoon && (stock === 0 || numStock <= 0);
  const isLowStock =
    !isComingSoon && !isSoldOut && (numStock <= threshold || numStock <= 5);
  return {
    ...p,
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    imageUrl: p.imageUrl,
    stock: p.stock,
    comingSoon: p.comingSoon,
    costPrice: p.costPrice,
    reorderLevel: p.reorderLevel,
    categoryId: p.categoryId,
    categoryName: category,
    galleryImageUrls: p.galleryImageUrls,
    label:
      p.label || `${category.toUpperCase()} / ${String(p.id).padStart(2, "0")}`,
    badge:
      p.badge ||
      (isComingSoon
        ? "COMING SOON"
        : isSoldOut
          ? "Out of stock"
          : isLowStock
            ? `Only ${numStock} left`
            : null),
  };
};

const eyebrow = "text-[10px] font-bold uppercase leading-3 tracking-[0.12em]";
const h2 =
  "text-2xl font-bold uppercase leading-7 tracking-[-0.025em] text-ink";
const wrap = "mx-auto w-full max-w-[1280px] px-6 md:px-12";

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
    className={flip ? "rotate-180" : ""}
    aria-hidden="true"
  >
    <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// Note: Synthetic CoatHanger and TrouserHanger were removed because the 4 real
// cutout images (/hero-rail/*.png) already include their own high-res coat/trouser hangers and top hooks.

// ─── MAIN HOMEPAGE COMPONENT ─────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const track = useRef(null);
  const { addItem } = useCart();

  // Rail State
  const [hoveredId, setHoveredId] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [clickedId, setClickedId] = useState(null);
  const [imgErrors, setImgErrors] = useState({});

  useEffect(() => {
    fetchProducts()
      .then((data) => {
        if (Array.isArray(data)) {
          const visible = data.filter((p) => {
            if (p.active === false) return false;
            const s = Number(p.stock ?? p.quantity ?? 0);
            return s > 0 || Boolean(p.comingSoon);
          });
          const sorted = [...visible].sort((a, b) => {
            if (a.createdAt && b.createdAt) {
              const diff =
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime();
              if (diff !== 0) return diff;
            }
            return Number(b.id || 0) - Number(a.id || 0);
          });
          setProducts(sorted.map(toCard));
        }
      })
      .catch((err) => {
        console.warn("Failed to load products:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const featured = products.slice(0, 8);
  const recs = PREVIEW_RECOMMENDATIONS;
  const scrollRecs = (dir) =>
    track.current?.scrollBy({ left: dir * 310, behavior: "smooth" });

  const onSearch = (e) => {
    e.preventDefault();
    navigate(
      `/shop${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`,
    );
  };

  const handleAddToCart = (item) => addItem(item, 1);

  const handleBuyNow = async (item) => {
    const res = await addItem(item, 1);
    if (!res?.redirected) {
      navigate("/checkout");
    }
  };

  // Fallback to first available active product ID if requested product does not exist
  const resolveTargetId = (preferredId) => {
    if (products.length > 0) {
      const match = products.find((p) => Number(p.id) === Number(preferredId));
      if (match) return match.id;
      return products[0].id;
    }
    return preferredId || 1;
  };

  // Smooth editorial redirect transition on garment click
  const handleGarmentClick = (item) => {
    if (isRedirecting) return;
    setIsRedirecting(true);
    setClickedId(item?.id ?? 1);
    const targetId = resolveTargetId(item?.productId || 1);

    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      navigate(`/product/${targetId}`);
    }, 350);
  };

  return (
    <main className="bg-surface relative">
      {/* Full-Screen Smooth Redirect Fade Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-[#d9dad5] pointer-events-none transition-opacity duration-400 ease-in-out ${
          isRedirecting ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* ─── THE NEW ERA: EDITORIAL SWINGING CLOTHING RAIL HERO ────────────── */}
      <section className="relative overflow-hidden select-none bg-gradient-to-b from-[#d9dad5] via-[#dfdfd9] to-[#cfcfc9] min-h-[88vh] flex flex-col justify-between pt-8 pb-12">
        {/* 4-Corner Pinned Metadata */}
        <div className="absolute top-6 left-6 md:top-10 md:left-10 z-30 pointer-events-none select-none">
          <div className="text-[11px] md:text-xs font-black tracking-[0.25em] text-neutral-950 leading-none">
            LIMITED
          </div>
          <div className="text-[11px] md:text-xs font-black tracking-[0.25em] text-neutral-500 leading-none mt-1">
            RELEASE
          </div>
        </div>

        <div className="absolute top-6 right-6 md:top-10 md:right-10 z-30 pointer-events-none select-none text-right">
          <div className="text-[11px] md:text-xs font-black tracking-[0.25em] text-neutral-950 leading-none">
            JUNE
          </div>
          <div className="text-[11px] md:text-xs font-black tracking-[0.25em] text-neutral-500 leading-none mt-1">
            2026
          </div>
        </div>

        <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 z-30 pointer-events-none select-none">
          <div className="text-[11px] md:text-xs font-black tracking-[0.25em] text-neutral-950 leading-none">
            NEVER
          </div>
          <div className="text-[11px] md:text-xs font-black tracking-[0.25em] text-neutral-500 leading-none mt-1">
            BASIC
          </div>
        </div>

        <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-30 text-right select-none">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("catalog-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
              } else {
                navigate("/shop");
              }
            }}
            className="group flex flex-col items-end text-[11px] md:text-xs font-black tracking-[0.25em] text-neutral-950 leading-none hover:text-neutral-600 transition-colors cursor-pointer"
            aria-label="Shop Now"
          >
            <span className="flex items-center gap-1">
              <span>SHOP</span>
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5">
                &rarr;
              </span>
            </span>
            <span className="text-neutral-500 mt-1">NOW</span>
          </button>
        </div>

        {/* Center Typography Above Rail */}
        <div className="relative z-20 text-center max-w-4xl mx-auto px-4 pt-4 md:pt-6">
          <div className="text-neutral-600 text-xs md:text-sm tracking-[0.45em] mb-2.5 select-none opacity-80">
            ✦ ✦ ✦
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight uppercase text-neutral-950 leading-none select-none">
            THE NEW ERA
          </h1>
          <p className="mt-3 md:mt-4 text-xs sm:text-sm md:text-base text-neutral-600 font-medium tracking-wide max-w-xl mx-auto">
            A new chapter of elevated essentials and statement silhouettes.
          </p>
        </div>

        {/* ─── CLOTHING RAIL ASSEMBLY & CONTINUOUS SWING PHYSICS ───────────── */}
        <div className="relative w-full my-auto pt-4 pb-2">
          {/* Full-Width Sleek Chrome Clothing Rail Bar */}
          <div className="absolute top-[35px] left-0 right-0 z-10 pointer-events-none">
            <div className="h-[6px] w-full bg-gradient-to-b from-white via-neutral-300 to-neutral-700 shadow-[0_4px_14px_rgba(0,0,0,0.18)]" />
            <div className="absolute -top-1.5 left-0 w-3 md:w-6 h-5 bg-gradient-to-r from-neutral-800 to-neutral-600 rounded-r-sm shadow-md" />
            <div className="absolute -top-1.5 right-0 w-3 md:w-6 h-5 bg-gradient-to-l from-neutral-800 to-neutral-600 rounded-l-sm shadow-md" />
          </div>

          {/* Hanging Garments Container */}
          <div className="relative w-full max-w-6xl mx-auto flex items-start justify-center overflow-x-auto md:overflow-visible px-4 pt-[16px] pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HERO_RAIL_ITEMS.map((item, idx) => {
              const isHovered = hoveredId === item.id;
              const isDimmed = hoveredId !== null && hoveredId !== item.id;
              const isClicked = clickedId === item.id && isRedirecting;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleGarmentClick(item)}
                  className="relative flex flex-col items-center cursor-pointer select-none"
                  style={{
                    marginLeft: idx === 0 ? "0px" : item.overlapMargin,
                    zIndex: isHovered ? 50 : item.defaultZ,
                    transformOrigin: "50% 6px",
                    animation:
                      isHovered || isClicked
                        ? "none"
                        : `hangerSwing ${item.swingDuration} ease-in-out infinite ${item.swingDelay}`,
                    transform: isClicked
                      ? "perspective(900px) rotate(0deg) scale(1.12) translateY(-10px)"
                      : isHovered
                        ? "perspective(900px) rotate(0deg) scale(1.07) translateY(-6px)"
                        : undefined,
                    opacity: isDimmed ? 0.75 : 1,
                    transition:
                      isHovered || isClicked
                        ? "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, z-index 0s"
                        : "transform 0.35s ease-out, opacity 0.3s ease",
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${item.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleGarmentClick(item);
                    }
                  }}
                >
                  {/* Garment Cutout Display with Built-In Hanger & Top Hook */}
                  <div className="w-[215px] sm:w-[245px] md:w-[275px] h-[330px] sm:h-[370px] md:h-[410px] relative flex items-start justify-center pointer-events-none">
                    <img
                      src={
                        imgErrors[item.id]
                          ? FALLBACK_MAP[item.id]
                          : item.imageUrl
                      }
                      alt={item.title}
                      onError={(e) => {
                        if (!imgErrors[item.id]) {
                          setImgErrors((prev) => ({
                            ...prev,
                            [item.id]: true,
                          }));
                          e.currentTarget.src = FALLBACK_MAP[item.id];
                        }
                      }}
                      className="w-full h-full object-contain object-top filter drop-shadow-2xl select-none transition-transform duration-300"
                    />
                  </div>

                  {/* Floating Monochrome Quick-Label Pill */}
                  <div
                    className={`absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none transition-all duration-300 ${
                      isHovered
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 translate-y-2 scale-95"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-950 text-white text-[11px] font-bold uppercase tracking-[0.14em] shadow-xl border border-neutral-800">
                      VIEW PIECE #{String(item.productId).padStart(2, "0")}{" "}
                      &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Synced Floor Shadows Directly Beneath Each Garment */}
          <div className="relative w-full max-w-6xl mx-auto flex items-center justify-center pt-3 pb-1 pointer-events-none overflow-x-auto md:overflow-visible px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HERO_RAIL_ITEMS.map((item, idx) => {
              const isHovered = hoveredId === item.id;
              const isClicked = clickedId === item.id && isRedirecting;

              return (
                <div
                  key={`floor-shadow-${item.id}`}
                  className="flex justify-center"
                  style={{
                    width: "240px",
                    marginLeft: idx === 0 ? "0px" : item.overlapMargin,
                  }}
                >
                  <div
                    className="w-32 sm:w-36 md:w-44 h-3 sm:h-3.5 md:h-4 rounded-full bg-neutral-950/25 blur-md transition-all duration-300"
                    style={{
                      animation:
                        isHovered || isClicked
                          ? "none"
                          : `shadowSway ${item.swingDuration} ease-in-out infinite ${item.swingDelay}`,
                      transform:
                        isHovered || isClicked
                          ? "translateX(0) scale(1.2)"
                          : undefined,
                      opacity: isHovered || isClicked ? 0.45 : undefined,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Interactive Prompt */}
        <div className="relative z-20 text-center px-4 pt-3">
          <button
            type="button"
            onClick={() => handleGarmentClick(HERO_RAIL_ITEMS[0])}
            className="group inline-flex items-center gap-2 text-xs md:text-sm font-medium tracking-wide text-neutral-700 hover:text-neutral-950 transition-colors cursor-pointer"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-400 group-hover:bg-neutral-950 transition-colors" />
            <span>
              Designed for those who never follow the crowd. Tap a piece on the
              rail to take it to checkout.
            </span>
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
              &rarr;
            </span>
          </button>
        </div>
      </section>

      {/* ─── CATALOG SEARCH & METRICS BAR (Preserved) ───────────────────────── */}
      <section className="border-b border-line bg-surface py-10 md:py-14">
        <div className={`${wrap} flex flex-col items-center text-center`}>
          <form
            onSubmit={onSearch}
            className="flex w-full max-w-2xl items-center gap-2 border border-line bg-white p-1.5 shadow-sm"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="ml-4 shrink-0 text-subtle"
              aria-hidden="true"
            >
              <circle
                cx="7"
                cy="7"
                r="5.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
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
          <dl className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-x-10 gap-y-6 border-t border-line pt-8 text-left md:grid-cols-4">
            {COPY.metrics.map(([value, label]) => (
              <div key={label} className="flex flex-col gap-1">
                <dd className="order-1 text-xl font-bold leading-6 tracking-[-0.01em] text-ink">
                  {value}
                </dd>
                <dt
                  className={`order-2 ${eyebrow} tracking-[0.06em] text-muted`}
                >
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── STOREFRONT GRID: ESSENTIAL ARTIFACTS ───────────────────────────── */}
      <section id="catalog-section" className="bg-white py-12">
        <div className={`${wrap} flex flex-col gap-6`}>
          <SectionHeader
            kicker="COLLECTION REFERENCE 02"
            title="ESSENTIAL ARTIFACTS"
            right={
              <span className={`${eyebrow} text-muted`}>
                {loading
                  ? "LOADING EDITIONS..."
                  : `${String(featured.length).padStart(2, "0")} CORE EDITIONS`}
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

      {/* ─── PHILOSOPHY BAND: 3 COLUMNS ─────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-12">
        <div className={`${wrap} grid gap-8 md:grid-cols-3`}>
          {COPY.philosophy.map(([kicker, title, body], i) => (
            <div
              key={title}
              className={`flex flex-col gap-1.5 ${
                i > 0 ? "md:border-l md:border-line md:pl-8" : ""
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

      {/* ─── NEWSLETTER: JOIN THE SYNDICATE ─────────────────────────────────── */}
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
              {subscribed ? "Done" : "Subscribe"}
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
