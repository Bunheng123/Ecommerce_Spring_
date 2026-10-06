import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchProductById, fetchProducts, fetchProductImages } from "../../api/products";
import { SAMPLE_PRODUCTS } from "../../data/previewProducts";
import ProductCard from "../../components/customer/ProductCard";
import { useCart } from "../../context/CartContext";

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

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setQuantity(1);

    Promise.all([
      fetchProductById(id),
      fetchProductImages(id).catch((err) => {
        console.warn("fetchProductImages optional fetch error:", err);
        return [];
      }),
    ])
      .then(([data, extraImages]) => {
        if (isMounted) {
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
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("fetchProductById error:", err);
          setProduct(null);
          setAllLoadedImages([]);
          setSelectedImage(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    fetchProducts().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setAllProducts(data);
      }
    });
  }, []);

  const { addItem } = useCart();

  // Loading skeleton state
  if (loading) {
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

  // Derived properties from Spring Boot ProductResponseDto
  const {
    id: prodId = id,
    name = "Artifact",
    description = "",
    price = 0,
    imageUrl,
    publicId,
    stock = 0,
    active = true,
    costPrice,
    reorderLevel = 0,
    categoryId,
    categoryName = "GENERAL",
    galleryImageUrls = [],
    rating = 5,
    reviews = 50,
  } = product;

  // Consolidate all normalized images (primary + gallery + api images)
  const primaryImg = normalizeImageUrl(imageUrl);
  const galleryImgs = (Array.isArray(galleryImageUrls) ? galleryImageUrls : [])
    .map(normalizeImageUrl)
    .filter(Boolean);
  const allImages = allLoadedImages.length > 0
    ? allLoadedImages
    : Array.from(new Set([primaryImg, ...galleryImgs].filter(Boolean)));

  const currentImageIndex = Math.max(0, allImages.indexOf(selectedImage));

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

  const isSoldOut = stock <= 0;
  const isLowStock = stock > 0 && reorderLevel != null && stock <= reorderLevel;

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

  // Related products from backend catalog (excluding current item)
  const relatedProducts = allProducts
    .filter((p) => Number(p.id) !== Number(prodId))
    .slice(0, 4);

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
                {isSoldOut ? (
                  <span className="border border-line bg-chip px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                    Sold Out
                  </span>
                ) : isLowStock ? (
                  <span className="border border-ink bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink">
                    Low Stock: {stock} Left
                  </span>
                ) : (
                  <span className="bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                    In Stock ({stock})
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
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted">
                  {categoryName} • ID #{String(prodId).padStart(4, "0")}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-subtle">
                  {publicId || `SKU-PRD-${prodId}`}
                </span>
              </div>

              {/* Product Title */}
              <h1 className="text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl leading-tight">
                {name}
              </h1>

              {/* Rating & Reviews */}
              <div className="flex items-center gap-2 text-xs text-ink">
                <span className="tracking-[0.15em] text-sm">★★★★★</span>
                <span className="font-bold">{rating.toFixed(1)}</span>
                <span className="text-muted">({reviews} customer reviews)</span>
              </div>

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

              {/* Inventory Stock Indicator */}
              <div className="p-3 border border-line bg-surface text-xs flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase tracking-wider text-ink text-[11px]">
                    Warehouse Status:
                  </span>
                  <span
                    className={`font-bold uppercase text-[11px] tracking-wider ${
                      isSoldOut
                        ? "text-red-600"
                        : isLowStock
                          ? "text-amber-600"
                          : "text-emerald-700"
                    }`}
                  >
                    {isSoldOut
                      ? "Out of Stock"
                      : isLowStock
                        ? `Low Inventory (${stock} remaining)`
                        : `In Stock (${stock} available)`}
                  </span>
                </div>
                {reorderLevel > 0 && (
                  <p className="text-[10px] text-muted tracking-tight">
                    Automatic reorder threshold: {reorderLevel} units
                  </p>
                )}
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

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isSoldOut || isAdding}
                    onClick={handleAddToCart}
                    className="w-full h-12 border border-ink bg-ink text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-neutral-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
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

        {/* Specifications & API Structure Details Tabs */}
        <section className="mt-12 border border-line bg-white p-6 md:p-8 shadow-surface">
          <div className="flex gap-6 border-b border-line pb-4">
            <button
              type="button"
              onClick={() => setActiveTab("description")}
              className={`text-xs font-bold uppercase tracking-[0.12em] pb-1 transition-colors ${
                activeTab === "description"
                  ? "border-b-2 border-ink text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              Description &amp; Craft
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("apiData")}
              className={`text-xs font-bold uppercase tracking-[0.12em] pb-1 transition-colors ${
                activeTab === "apiData"
                  ? "border-b-2 border-ink text-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              Backend API Schema
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("shipping")}
              className={`text-xs font-bold uppercase tracking-[0.12em] pb-1 transition-colors ${
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

            {activeTab === "apiData" && (
              <div className="space-y-4">
                <p className="text-xs text-muted uppercase tracking-wider">
                  Direct mapping with Spring Boot{" "}
                  <code className="bg-neutral-100 px-1 py-0.5 font-mono text-ink">
                    ProductResponseDto
                  </code>
                  :
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="border border-line p-3 bg-surface">
                    <span className="text-muted block text-[10px]">id: Long</span>
                    <span className="font-bold text-ink">{prodId}</span>
                  </div>
                  <div className="border border-line p-3 bg-surface">
                    <span className="text-muted block text-[10px]">name: String</span>
                    <span className="font-bold text-ink">{name}</span>
                  </div>
                  <div className="border border-line p-3 bg-surface">
                    <span className="text-muted block text-[10px]">price: Double</span>
                    <span className="font-bold text-ink">
                      ${Number(price).toFixed(2)}
                    </span>
                  </div>
                  <div className="border border-line p-3 bg-surface">
                    <span className="text-muted block text-[10px]">stock: int</span>
                    <span className="font-bold text-ink">{stock} units</span>
                  </div>
                  <div className="border border-line p-3 bg-surface">
                    <span className="text-muted block text-[10px]">costPrice: Double</span>
                    <span className="font-bold text-ink">
                      ${Number(costPrice ?? price * 0.6).toFixed(2)}
                    </span>
                  </div>
                  <div className="border border-line p-3 bg-surface">
                    <span className="text-muted block text-[10px]">reorderLevel: int</span>
                    <span className="font-bold text-ink">
                      {reorderLevel} units
                    </span>
                  </div>
                  <div className="border border-line p-3 bg-surface">
                    <span className="text-muted block text-[10px]">active: boolean</span>
                    <span className="font-bold text-ink">{String(active)}</span>
                  </div>
                  <div className="border border-line p-3 bg-surface">
                    <span className="text-muted block text-[10px]">
                      categoryId / categoryName
                    </span>
                    <span className="font-bold text-ink">
                      {categoryId ?? "—"} / {categoryName}
                    </span>
                  </div>
                  <div className="border border-line p-3 bg-surface">
                    <span className="text-muted block text-[10px]">publicId: String</span>
                    <span className="font-bold text-ink truncate block">
                      {publicId || "null"}
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

        {/* Recommended Products Grid */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between border-b border-line pb-3 mb-6">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  Complementary Pieces
                </span>
                <h2 className="text-2xl font-bold uppercase tracking-tight text-ink">
                  Related Artifacts
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
