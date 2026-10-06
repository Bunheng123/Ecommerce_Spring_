import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SAMPLE_PRODUCTS } from '../../data/previewProducts';
import { useCart } from '../../context/CartContext';

// Default fallback sample item matching Spring Boot ProductResponseDto
const DEFAULT_SAMPLE_CARD = SAMPLE_PRODUCTS[0];

// variant "grid"    -> CART (white) + BUY NOW (black) buttons (storefront grid)
// variant "compact" -> single full-width ADD TO CART button (recommendations carousel)
export default function ProductCard({
  product = DEFAULT_SAMPLE_CARD,
  variant = 'grid',
  onAdd,
  onBuy,
}) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const item = product || DEFAULT_SAMPLE_CARD;

  const {
    id = 1,
    name = 'Unnamed Product',
    price = 0,
    imageUrl,
    stock,
    reorderLevel,
    active = true,
    categoryName,
    label = categoryName ? `${categoryName.toUpperCase()} / ${String(id).padStart(2, '0')}` : 'GENERAL / 01',
    badgeType = 'black',
    rating = 5,
    reviews = 50,
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
        <Link
          to={`/product/${id}`}
          className="relative block aspect-square border-b border-line bg-[#FAFAFA] overflow-hidden group"
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

        <div className="flex flex-col gap-1.5 p-4">
          <p className="text-[10px] font-bold uppercase leading-3 tracking-[0.1em] text-muted">
            {label}
          </p>
          <Link to={`/product/${id}`}>
            <h3 className="text-base font-bold leading-snug tracking-[-0.02em] text-ink line-clamp-1 hover:underline">
              {name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1.5 text-xs text-ink">
            <span className="tracking-[0.15em] text-[11px]">★★★★★</span>
            {reviews != null && (
              <span className="text-[11px] text-muted">({reviews})</span>
            )}
          </div>

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
          <div className="h-3 w-16 bg-line/50 rounded-xs" />
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
