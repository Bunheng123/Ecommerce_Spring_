import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchProductById, fetchProducts, fetchProductImages } from "../../api/products";
import ProductCard from "../../components/customer/ProductCard";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

function normalizeImageUrl(url) {
  if (!url) return null;
  if (typeof url === "string" && url.startsWith("http://res.cloudinary.com")) {
    return url.replace("http://res.cloudinary.com", "https://res.cloudinary.com");
  }
  return url;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allLoadedImages, setAllLoadedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [addedToast, setAddedToast] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { addItem } = useCart();
  const inWishlist = isInWishlist(product?.id);

  useEffect(() => {
    let isMounted = true;
    window.scrollTo({ top: 0, behavior: 'instant' });

    Promise.all([
      fetchProductById(id),
      fetchProductImages(id).catch((err) => {
        console.warn("fetchProductImages optional fetch error:", err);
        return [];
      }),
      fetchProducts().catch((err) => {
        console.warn("fetchProducts optional fetch error:", err);
        return [];
      }),
    ])
      .then(([data, extraImages, catalog]) => {
        if (isMounted) {
          setQuantity(1);
          if (Array.isArray(catalog) && catalog.length > 0) {
            const customerCatalog = catalog.filter((p) => {
              if (p.active === false) return false;
              const s = Number(p.stock ?? 0);
              return s > 0 || Boolean(p.comingSoon);
            });
            setAllProducts(customerCatalog);
          }
          if (data && data.id) {
            setProduct(data);
            const primary = normalizeImageUrl(data.imageUrl);
            const galleryFromDto = (
              Array.isArray(data.galleryImageUrls) ? data.galleryImageUrls : []
            )
              .map(normalizeImageUrl)
              .filter(Boolean);

            const galleryFromApi = (Array.isArray(extraImages) ? extraImages : [])
              .map((img) => normalizeImageUrl(img?.imageUrl || img))
              .filter(Boolean);

            const allImagesList = Array.from(
              new Set([primary, ...galleryFromDto, ...galleryFromApi].filter(Boolean))
            );

            setAllLoadedImages(allImagesList);
            setSelectedImage(allImagesList[0] || null);
          } else {
            setProduct(null);
            setAllLoadedImages([]);
            setSelectedImage(null);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("fetchProductById error:", err);
          setProduct(null);
          setAllLoadedImages([]);
          setSelectedImage(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Derived properties from Spring Boot ProductResponseDto
  const {
    id: prodId = id,
    name = "Artifact",
    brand,
    description = "",
    price = 0,
    imageUrl,
    stock = 0,
    reorderLevel = 0,
    categoryId,
    categoryName = "GENERAL",
    galleryImageUrls = [],
    publicId,
  } = product || {};

  // Consolidate all normalized images (primary + gallery + api images)
  const primaryImg = normalizeImageUrl(imageUrl);
  const galleryImgs = (Array.isArray(galleryImageUrls) ? galleryImageUrls : [])
    .map(normalizeImageUrl)
    .filter(Boolean);
  const allImages = allLoadedImages.length > 0
    ? allLoadedImages
    : Array.from(new Set([primaryImg, ...galleryImgs].filter(Boolean)));

  const currentImageIndex = Math.max(0, allImages.indexOf(selectedImage));

  // Dynamic Related Products ("You may also like")
  // 1. Same category active products, strictly excluding currently viewed product
  // 2. Fallback: up to 4 other in-stock products from catalog (excluding current product)
  // 3. Cleanly hide section if 0 matches
  const relatedProducts = useMemo(() => {
    if (!product || !allProducts.length) return [];

    const currentId = Number(prodId || id);
    const currentCatId = categoryId != null ? Number(categoryId) : null;
    const currentCatName = categoryName ? String(categoryName).toLowerCase().trim() : '';

    const sameCategory = allProducts.filter((p) => {
      if (Number(p.id) === currentId) return false;
      if (p.active === false) return false;

      const pCatId = p.categoryId != null ? Number(p.categoryId) : null;
      const pCatName = p.categoryName ? String(p.categoryName).toLowerCase().trim() : '';

      const matchCatId = currentCatId !== null && pCatId !== null && currentCatId === pCatId;
      const matchCatName = currentCatName && pCatName && currentCatName === pCatName;

      return matchCatId || matchCatName;
    });

    if (sameCategory.length > 0) {
      return sameCategory.slice(0, 4);
    }

    // Fallback: up to 4 other in-stock active products from catalog
    const fallbackInStock = allProducts.filter((p) => {
      if (Number(p.id) === currentId) return false;
      if (p.active === false) return false;
      return Number(p.stock) > 0;
    });

    return fallbackInStock.slice(0, 4);
  }, [product, prodId, id, categoryId, categoryName, allProducts]);

  const isLoading = loading || (product && String(product.id) !== String(id));

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="bg-surface min-h-screen py-10">
        <div className="mx-auto max-w-[1280px] px-6 md:px-12 animate-pulse">
          <div className="mb-8 h-4 w-48 bg-line/60 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 border border-line bg-white p-6 md:p-10">
            <div className="lg:col-span-7 aspect-square bg-[#F5F5F5] border border-line" />
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-4 w-24 bg-line/60 rounded" />
                <div className="h-8 w-3/4 bg-line/80 rounded" />
                <div className="h-6 w-32 bg-line/60 rounded" />
                <div className="h-16 w-full bg-line/40 rounded" />
              </div>
              <div className="h-12 w-full bg-line/50 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!product) {
    return (
      <div className="bg-surface min-h-screen py-20">
        <div className="mx-auto max-w-md bg-white border border-line p-8 text-center shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted block mb-2">
            Catalog Notice
          </span>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink mb-3">
            Artifact Not Found
          </h1>
          <p className="text-xs text-muted mb-6 leading-relaxed">
            The requested inventory item (#{id}) could not be located in the current database.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/shop"
              className="w-full h-11 bg-ink text-white text-xs font-bold uppercase tracking-[0.12em] hover:bg-neutral-800 transition-colors flex items-center justify-center"
            >
              Browse Catalog &rarr;
            </Link>
            <Link
              to="/"
              className="text-xs font-bold uppercase tracking-wider text-muted hover:text-ink pt-1"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handlePrevImage = () => {
    if (allImages.length <= 1) return;
    const prevIdx = (currentImageIndex - 1 + allImages.length) % allImages.length;
    setSelectedImage(allImages[prevIdx]);
  };

  const handleNextImage = () => {
    if (allImages.length <= 1) return;
    const nextIdx = (currentImageIndex + 1) % allImages.length;
    setSelectedImage(allImages[nextIdx]);
  };

  const numStock = Number(stock || 0);
  const threshold = (reorderLevel != null && reorderLevel > 0) ? reorderLevel : 5;
  const isComingSoon = (stock <= 0 || numStock <= 0) && Boolean(product?.comingSoon);
  const isUnavailable = (stock <= 0 || numStock <= 0) && !isComingSoon;
  const isSoldOut = stock <= 0 || numStock <= 0;
  const isLowStock = !isSoldOut && (numStock <= threshold || numStock <= 5);

  const handleAddToCart = async () => {
    setErrorMessage('');
    setIsAdding(true);
    try {
      await addItem(product, quantity);
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 2500);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to add item to cart');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-surface min-h-screen py-10">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        {/* Breadcrumb Navigation */}
        <nav className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-muted">
          <Link to="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-ink transition-colors">
            Catalog
          </Link>
          <span>/</span>
          <span className="text-muted">{categoryName}</span>
          <span>/</span>
          <span className="text-ink truncate max-w-[200px]">{name}</span>
        </nav>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 border border-line bg-white p-6 md:p-10 shadow-surface">
          {/* Left Column: Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative aspect-square w-full border border-line bg-[#FAFAFA] flex items-center justify-center p-8 overflow-hidden group shadow-surface">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={`${name} image ${currentImageIndex + 1}`}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.parentElement?.querySelector(".img-fallback");
                    if (fallback) fallback.classList.remove("hidden");
                  }}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : null}

              <div className={`img-fallback ${selectedImage ? "hidden" : "flex"} flex-col items-center justify-center text-center p-4`}>
                <span className="text-xs uppercase font-bold tracking-widest text-subtle">
                  No Image Available
                </span>
              </div>

              {/* Status Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                {isComingSoon ? (
                  <span className="border border-ink bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink shadow-2xs">
                    COMING SOON
                  </span>
                ) : isUnavailable ? (
                  <span className="border border-line bg-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                    Currently Unavailable
                  </span>
                ) : isLowStock ? (
                  <span className="border border-ink bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink shadow-2xs">
                    Only {stock} left in stock
                  </span>
                ) : (
                  <span className="bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                    In Stock
                  </span>
                )}
              </div>

              {/* Multiple Images Navigation Controls & Counter */}
              {allImages.length > 1 && (
                <>
                  <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-xs border border-line px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-ink shadow-2xs">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>

                  <button
                    type="button"
                    onClick={handlePrevImage}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-line text-ink text-lg font-bold flex items-center justify-center shadow-md transition-all cursor-pointer opacity-80 hover:opacity-100 hover:scale-105 z-10"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-line text-ink text-lg font-bold flex items-center justify-center shadow-md transition-all cursor-pointer opacity-80 hover:opacity-100 hover:scale-105 z-10"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`relative h-20 w-20 flex-shrink-0 border p-1.5 bg-[#FAFAFA] transition-all cursor-pointer ${
                      selectedImage === img
                        ? "border-ink ring-2 ring-ink ring-offset-1"
                        : "border-line opacity-70 hover:opacity-100 hover:border-ink/50"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${name} thumbnail ${idx + 1}`}
                      className="h-full w-full object-contain"
                    />
                    <span className="absolute bottom-1 right-1 text-[8px] font-mono font-bold bg-white/80 px-1 border border-line/40">
                      {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              {/* Category & Identifier */}
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  {brand && (
                    <span className="border border-line bg-surface px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-ink">
                      {brand}
                    </span>
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
                    {categoryName} • ID #{String(prodId).padStart(4, "0")}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-subtle">
                  {publicId || `SKU-PRD-${prodId}`}
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl leading-tight">
                {name}
              </h1>

              {/* Unavailable Direct Visit Banner */}
              {isUnavailable && (
                <div className="p-3 border border-line bg-neutral-100 text-xs text-ink font-medium">
                  <span className="font-bold uppercase tracking-wider block mb-0.5">Notice</span>
                  This item is currently out of stock and unavailable for ordering.
                </div>
              )}

              {/* Price */}
              <div className="py-2 border-y border-line">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold tracking-tight text-ink">
                    ${Number(price).toFixed(2)}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-muted">
                    USD / Tax Included
                  </span>
                </div>
              </div>

              {/* Short Description */}
              <p className="text-sm leading-relaxed text-body">
                {description ||
                  "Crafted with precision engineering and intentional functional aesthetics for daily living."}
              </p>

              {/* Availability Indicator */}
              <div className="p-3 border border-line bg-surface text-xs flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-muted text-[11px]">
                  Availability
                </span>
                <span
                  className={`font-bold uppercase text-[11px] tracking-wider ${
                    isComingSoon
                      ? "text-ink font-black"
                      : isUnavailable
                        ? "text-neutral-500 font-bold"
                        : isLowStock
                          ? "text-ink font-black"
                          : "text-ink"
                  }`}
                >
                  {isComingSoon
                    ? "COMING SOON • RESTOCK ON THE WAY"
                    : isUnavailable
                      ? "Currently Unavailable"
                      : isLowStock
                        ? `Only ${stock} left in stock`
                        : "In Stock"}
                </span>
              </div>

              {/* Quantity Selector & CTAs */}
              <div className="mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-ink">
                    <button
                      type="button"
                      disabled={quantity <= 1 || isSoldOut}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-sm font-bold text-ink hover:bg-neutral-100 disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="px-4 py-1.5 text-xs font-bold tracking-wider text-ink min-w-[36px] text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={quantity >= stock || isSoldOut}
                      onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                      className="px-3 py-1.5 text-sm font-bold text-ink hover:bg-neutral-100 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  {isComingSoon ? (
                    <button
                      type="button"
                      disabled
                      className="flex-1 h-12 border border-line bg-chip text-[11px] font-bold uppercase tracking-[0.1em] text-muted cursor-not-allowed flex items-center justify-center px-4"
                    >
                      COMING SOON — AWAITING SUPPLIER DELIVERY
                    </button>
                  ) : isUnavailable ? (
                    <button
                      type="button"
                      disabled
                      className="flex-1 h-12 border border-line bg-chip text-[11px] font-bold uppercase tracking-[0.12em] text-muted cursor-not-allowed flex items-center justify-center px-4"
                    >
                      Currently Unavailable
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSoldOut || isAdding}
                      onClick={handleAddToCart}
                      className="flex-1 h-12 border border-ink bg-ink text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-neutral-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
                    >
                      {isAdding ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Adding to Cart...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <span>Add to Cart</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleWishlist(product, navigate)}
                    aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                    title={inWishlist ? "In Wishlist (click to remove)" : "Save to Wishlist"}
                    className={`w-12 h-12 border border-ink flex items-center justify-center transition-colors cursor-pointer shadow-sm active:scale-[0.99] shrink-0 ${
                      inWishlist ? "bg-ink text-white" : "bg-white text-ink hover:bg-neutral-100"
                    }`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill={inWishlist ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                </div>

                {errorMessage && (
                  <p className="mt-2 text-xs text-red-600 font-medium">
                    {errorMessage}
                  </p>
                )}

                {addedToast && (
                  <div className="p-2 border border-emerald-600 bg-emerald-50 text-emerald-800 text-xs font-bold text-center uppercase tracking-wider animate-fadeIn">
                    ✓ Added {quantity} item(s) to cart
                  </div>
                )}
              </div>
            </div>

            {/* Quick Micro-guarantees */}
            <div className="grid grid-cols-2 gap-4 border-t border-line pt-6 mt-6 text-[11px] text-muted uppercase font-bold tracking-wider">
              <div className="flex items-center gap-2">
                <span>✦</span>
                <span>Direct Atelier Dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✦</span>
                <span>Lifetime Guarantee</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs (Description, Specifications, Shipping) */}
        <section className="mt-12 border border-line bg-white p-6 md:p-8 shadow-surface">
          <div className="flex gap-6 border-b border-line pb-4">
            <button
              type="button"
              onClick={() => setActiveTab("description")}
              className={`text-xs font-bold uppercase tracking-[0.12em] pb-1 transition-colors cursor-pointer ${
                activeTab === "description"
                  ? "border-b-2 border-ink text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              Description &amp; Craft
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              className={`text-xs font-bold uppercase tracking-[0.12em] pb-1 transition-colors cursor-pointer ${
                activeTab === "specs"
                  ? "border-b-2 border-ink text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              Details &amp; Specs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("shipping")}
              className={`text-xs font-bold uppercase tracking-[0.12em] pb-1 transition-colors cursor-pointer ${
                activeTab === "shipping"
                  ? "border-b-2 border-ink text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              Logistics &amp; Delivery
            </button>
          </div>

          <div className="py-6 text-sm text-body leading-relaxed">
            {activeTab === "description" && (
              <div className="space-y-4 max-w-3xl">
                <p>{description || "No extended product description provided."}</p>
                <p>
                  Every artifact undergoes strict inspection before packaging.
                  Serialized registration tags are applied during manufacturing
                  in controlled micro-batches to guarantee standard compliance.
                </p>
              </div>
            )}

            {activeTab === "specs" && (
              <div className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="border border-line p-3.5 bg-surface">
                    <span className="text-muted block text-[10px] font-bold uppercase tracking-wider">Brand</span>
                    <span className="font-bold text-ink mt-0.5 block">{brand || "Essential Hardware"}</span>
                  </div>
                  <div className="border border-line p-3.5 bg-surface">
                    <span className="text-muted block text-[10px] font-bold uppercase tracking-wider">Category</span>
                    <span className="font-bold text-ink mt-0.5 block">{categoryName || "Hardware"}</span>
                  </div>
                  <div className="border border-line p-3.5 bg-surface">
                    <span className="text-muted block text-[10px] font-bold uppercase tracking-wider">Catalog Reference</span>
                    <span className="font-mono font-bold text-ink mt-0.5 block">ART-{String(prodId || id || 0).padStart(4, '0')}</span>
                  </div>
                  <div className="border border-line p-3.5 bg-surface">
                    <span className="text-muted block text-[10px] font-bold uppercase tracking-wider">Availability</span>
                    <span className="font-bold text-ink mt-0.5 block">
                      {isSoldOut ? "Out of Stock" : (isLowStock ? `Only ${stock} left in stock` : "In Stock")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "shipping" && (
              <div className="space-y-3 max-w-2xl text-xs text-muted">
                <p>
                  Orders placed before 14:00 UTC dispatch on the same business
                  day in shockproof custom packaging.
                </p>
                <p>
                  Standard transit: 2–4 business days worldwide via expedited
                  air courier.
                </p>
                <p>
                  30-day inspection period: Return unopened artifacts for an
                  immediate full refund.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Dynamic Related Products ("You may also like") */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between border-b border-line pb-3 mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted block mb-1">
                  Complementary Pieces
                </span>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-ink">
                  You May Also Like
                </h2>
              </div>
              <Link
                to="/shop"
                className="text-xs font-bold uppercase tracking-wider text-ink hover:underline"
              >
                View Full Catalog &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} variant="grid" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
