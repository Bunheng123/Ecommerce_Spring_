import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SAMPLE_PRODUCTS } from '../../data/previewProducts';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

// Default fallback sample item matching Spring Boot ProductResponseDto
const DEFAULT_SAMPLE_CARD = SAMPLE_PRODUCTS[0];

// variant "grid"    -> CART (white) + BUY NOW (black) buttons (storefront grid)
// variant "compact" -> single full-width ADD TO CART button (recommendations carousel)
export default function ProductCard({
  product = DEFAULT_SAMPLE_CARD,
  onAdd,
}) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const item = product || DEFAULT_SAMPLE_CARD;

  const {
    id = 1,
    name = 'Unnamed Product',
    brand,
    price = 0,
    imageUrl,
    stock,
    reorderLevel,
    active = true,
    categoryName,
    label = categoryName ? `${categoryName.toUpperCase()} / ${String(id).padStart(2, '0')}` : 'GENERAL / 01',
    badgeType = 'black',
  } = item;

  // Auto-determine badge from Spring Boot fields if explicit badge is omitted
  const computedBadge =
    item.badge ||
    (stock === 0
      ? 'Sold out'
      : stock != null && reorderLevel != null && stock <= reorderLevel
      ? 'Low stock'
      : !active
      ? 'Archived'
      : null);

  const soldOut = computedBadge === 'Sold out' || stock === 0;
  const inWishlist = isInWishlist(id);
  const btn =
    'flex h-[38px] items-center justify-center text-xs font-bold uppercase tracking-[0.08em] transition-colors';

  const renderBadge = () => {
    if (!computedBadge) return null;
    if (computedBadge === 'ARCHIVE' || computedBadge === 'Archived' || badgeType === 'outline') {
      return (
        <span className="absolute left-3 top-3 border border-ink bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink">
          {computedBadge}
        </span>
      );
    }
    if (soldOut) {
      return (
        <span className="absolute left-3 top-3 border border-line bg-chip px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink">
          {computedBadge}
        </span>
      );
    }
    return (
      <span className="absolute left-3 top-3 bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
        {computedBadge}
      </span>
    );
  };

  return (
    <article className="flex h-full flex-col justify-between border border-line bg-white shadow-surface transition-shadow hover:shadow-md">
      <div>
        <div className="relative block aspect-square border-b border-line bg-[#FAFAFA] overflow-hidden group">
          <Link
            to={`/product/${id}`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="block h-full w-full"
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.1em] text-subtle">
                No image
              </div>
            )}
            {renderBadge()}
          </Link>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(item, navigate);
            }}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/95 hover:bg-white border border-line text-ink flex items-center justify-center shadow-xs transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={inWishlist ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={inWishlist ? 'text-ink' : 'text-neutral-600'}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-1.5 p-4">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] font-bold uppercase leading-3 tracking-[0.1em] text-muted truncate">
              {label}
            </p>
            {brand && (
              <span className="text-[9px] font-black uppercase tracking-wider text-neutral-600 bg-neutral-100 px-1.5 py-0.5 border border-line shrink-0">
                {brand}
              </span>
            )}
          </div>
          <Link
            to={`/product/${id}`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <h3 className="text-base font-bold leading-snug tracking-[-0.02em] text-ink line-clamp-1 hover:underline">
              {name}
            </h3>
          </Link>

          <div className="flex items-baseline justify-between pt-0.5">
            <p className="text-base font-bold leading-6 tracking-[-0.01em] text-ink">
              ${Number(price).toFixed(2)}
            </p>
            {stock != null && (
              <span className="text-[10px] uppercase tracking-wider text-muted">
                {soldOut ? 'Out of stock' : `${stock} in stock`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <button
          type="button"
          disabled={soldOut || isAdding}
          onClick={async () => {
            setErrorMessage('');
            setIsAdding(true);
            try {
              if (onAdd) await onAdd(item);
              else await addItem(item, 1);
            } catch (err) {
              setErrorMessage(err.message || 'Unable to add to cart');
            } finally {
              setIsAdding(false);
            }
          }}
          className={`${btn} w-full border border-ink bg-ink text-white hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
        >
          {isAdding ? 'Adding...' : 'Add to cart'}
        </button>

        {errorMessage && (
          <p className="mt-2 text-[11px] text-red-600 font-medium">
            {errorMessage}
          </p>
        )}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <article className="flex h-full flex-col justify-between border border-line bg-white shadow-surface animate-pulse">
      <div>
        <div className="aspect-square border-b border-line bg-[#EFEFEF]" />
        <div className="flex flex-col gap-2.5 p-4">
          <div className="h-2.5 w-20 bg-line/60 rounded-xs" />
          <div className="h-4 w-3/4 bg-line/80 rounded-xs" />
          <div className="flex items-baseline justify-between pt-1">
            <div className="h-4 w-14 bg-line/70 rounded-xs" />
            <div className="h-2.5 w-12 bg-line/40 rounded-xs" />
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <div className="h-[38px] w-full bg-line/50 rounded-xs" />
      </div>
    </article>
  );
}
