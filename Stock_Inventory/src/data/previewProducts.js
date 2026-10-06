const toDataUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const watchSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M78 50V22h44v28" />
  <line x1="84" y1="34" x2="116" y2="34" />
  <path d="M78 150v28h44v-28" />
  <line x1="84" y1="166" x2="116" y2="166" />
  <circle cx="100" cy="100" r="48" fill="#FFFFFF" />
  <circle cx="100" cy="100" r="43" stroke-width="1.2" />
  <rect x="148" y="96" width="6" height="8" rx="1" fill="#000000" />
  <path d="M72 65L78 50" />
  <path d="M128 65L122 50" />
  <path d="M72 135L78 150" />
  <path d="M128 135L122 150" />
  <line x1="100" y1="62" x2="100" y2="68" stroke-width="2" />
  <line x1="100" y1="138" x2="100" y2="132" stroke-width="1.5" />
  <line x1="62" y1="100" x2="68" y2="100" stroke-width="1.5" />
  <line x1="138" y1="100" x2="132" y2="100" stroke-width="1.5" />
  <circle cx="100" cy="100" r="3" fill="#000000" />
  <line x1="100" y1="100" x2="100" y2="76" stroke-width="2" />
  <line x1="100" y1="100" x2="122" y2="100" stroke-width="1.5" />
</svg>`);

export const watchAngleSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="100" cy="95" rx="52" ry="38" fill="#FFFFFF" />
  <ellipse cx="100" cy="95" rx="46" ry="32" stroke-width="1.2" />
  <path d="M48 95v14c0 21 23 38 52 38s52-17 52-38V95" />
  <path d="M68 62L60 28h80l-8 34" />
  <path d="M68 128l-8 34h80l-8-34" />
  <rect x="150" y="90" width="8" height="10" rx="2" fill="#000000" />
  <circle cx="100" cy="95" r="3" fill="#000000" />
  <line x1="100" y1="95" x2="118" y2="85" stroke-width="2" />
  <line x1="100" y1="95" x2="90" y2="75" stroke-width="1.5" />
</svg>`);

export const lampSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="65" y="160" width="70" height="8" fill="#000000" />
  <line x1="100" y1="160" x2="100" y2="85" stroke-width="3" />
  <circle cx="100" cy="85" r="4" fill="#000000" />
  <line x1="100" y1="85" x2="135" y2="105" stroke-width="2.5" />
  <circle cx="135" cy="105" r="3" fill="#000000" />
  <path d="M125 100L155 118L140 135L120 110Z" fill="#FFFFFF" />
  <line x1="125" y1="100" x2="120" y2="110" />
  <line x1="155" y1="118" x2="140" y2="135" />
  <line x1="140" y1="142" x2="146" y2="150" stroke-dasharray="2 2" stroke-width="1" />
  <line x1="148" y1="138" x2="156" y2="145" stroke-dasharray="2 2" stroke-width="1" />
</svg>`);

export const lampDetailSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="100" cy="100" r="55" fill="#FFFFFF" />
  <circle cx="100" cy="100" r="42" stroke-dasharray="4 2" />
  <circle cx="100" cy="100" r="14" fill="#000000" />
  <line x1="100" y1="30" x2="100" y2="45" stroke-width="2" />
  <line x1="100" y1="155" x2="100" y2="170" stroke-width="2" />
  <line x1="30" y1="100" x2="45" y2="100" stroke-width="2" />
  <line x1="155" y1="100" x2="170" y2="100" stroke-width="2" />
</svg>`);

export const blazerSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M60 65L35 125l20 5 18-50" />
  <path d="M140 65L165 125l-20 5-18-50" />
  <path d="M60 65h80l-10 100H70L60 65Z" fill="#FFFFFF" />
  <path d="M80 65L75 90l25 35L100 165" />
  <path d="M120 65L125 90l-25 35" />
  <path d="M80 65h40" />
  <circle cx="97" cy="135" r="2" fill="#000000" />
  <circle cx="97" cy="150" r="2" fill="#000000" />
  <line x1="75" y1="142" x2="90" y2="142" />
  <line x1="110" y1="142" x2="125" y2="142" />
  <line x1="75" y1="105" x2="88" y2="105" stroke-width="1.5" />
</svg>`);

export const penSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <g transform="rotate(-45 100 100)">
    <rect x="94" y="25" width="12" height="10" rx="1" fill="#000000" />
    <path d="M94 38v45h-3v-40h3" fill="#000000" />
    <rect x="93" y="35" width="14" height="60" fill="#FFFFFF" />
    <line x1="93" y1="95" x2="107" y2="95" stroke-width="1" />
    <rect x="93" y="95" width="14" height="45" fill="#FFFFFF" />
    <line x1="93" y1="110" x2="107" y2="110" stroke-width="1" />
    <line x1="93" y1="120" x2="107" y2="120" stroke-width="1" />
    <line x1="93" y1="130" x2="107" y2="130" stroke-width="1" />
    <path d="M93 140L98 165h4L107 140Z" fill="#FFFFFF" />
    <line x1="100" y1="165" x2="100" y2="173" stroke-width="2.5" />
  </g>
</svg>`);

export const toteSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M78 95V45c0-8 6-12 12-12h20c6 0 12 4 12 12v50" stroke-width="2" />
  <path d="M60 95L68 170h64l8-75H60Z" fill="#FFFFFF" />
  <line x1="84" y1="95" x2="86" y2="170" stroke-width="1.5" />
  <line x1="116" y1="95" x2="114" y2="170" stroke-width="1.5" />
  <line x1="60" y1="105" x2="140" y2="105" stroke-width="1" />
</svg>`);

export const pourOverSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M65 45h70l-22 45H87L65 45Z" fill="#FFFFFF" />
  <line x1="78" y1="90" x2="122" y2="90" stroke-width="3" />
  <path d="M85 95h30l15 65H70l15-65Z" fill="#FFFFFF" />
  <path d="M125 105h15c5 0 8 4 8 10v25c0 6-3 10-8 10h-12" />
  <path d="M85 97L75 102" />
  <line x1="95" y1="125" x2="105" y2="125" stroke-width="1" />
  <line x1="95" y1="135" x2="105" y2="135" stroke-width="1" />
  <line x1="95" y1="145" x2="105" y2="145" stroke-width="1" />
</svg>`);

export const deskMatSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M35 140L65 75h100l-30 65H35Z" fill="#FFFFFF" />
  <path d="M42 136L68 81h90l-25 55H42Z" stroke-width="1" stroke-dasharray="3 2" />
  <circle cx="78" cy="90" r="2.5" fill="#000000" />
  <rect x="88" y="87" width="25" height="5" rx="1.5" />
</svg>`);

export const monolithSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M50 155l30-40h70l-30 40H50Z" fill="#FFFFFF" />
  <path d="M40 165l25-10h85l-25 10H40Z" fill="#000000" />
  <line x1="140" y1="90" x2="105" y2="135" stroke-width="1.5" />
  <circle cx="140" cy="90" r="1.5" fill="#000000" />
  <path d="M141 85c2-6-3-10 1-16s-2-8 2-14" stroke-width="1" stroke-dasharray="2 2" />
</svg>`);

export const keyWrapSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="75" y="55" width="50" height="90" rx="12" fill="#FFFFFF" />
  <rect x="79" y="59" width="42" height="82" rx="9" stroke-width="1" stroke-dasharray="2 2" />
  <circle cx="100" cy="72" r="4" fill="#000000" />
  <circle cx="100" cy="72" r="2" fill="#FFFFFF" />
  <circle cx="100" cy="128" r="4" fill="#000000" />
  <circle cx="100" cy="128" r="2" fill="#FFFFFF" />
  <circle cx="100" cy="100" r="2" fill="#000000" />
</svg>`);

export const capSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M45 140c5-35 25-50 65-50 25 0 45 15 50 45" fill="#FFFFFF" />
  <path d="M75 92v48" stroke-width="1.5" />
  <path d="M125 92v48" stroke-width="1.5" />
  <line x1="45" y1="140" x2="160" y2="140" stroke-width="2" />
  <circle cx="100" cy="115" r="2.5" stroke-width="1.5" />
  <path d="M150 140c15 1 28 3 35 8-10 2-25 2-35 0" fill="#FFFFFF" stroke-width="2" />
  <path d="M45 140c-6 2-10 5-10 8h15" stroke-width="1.5" />
</svg>`);

/**
 * EXACT match of Spring Boot ProductResponseDto:
 * - id: Long
 * - name: String
 * - description: String
 * - price: Double
 * - imageUrl: String
 * - publicId: String
 * - stock: int
 * - active: boolean
 * - costPrice: Double
 * - reorderLevel: int
 * - categoryId: Long
 * - categoryName: String
 * - galleryImageUrls: List<String>
 */
export const SAMPLE_PRODUCTS = [
  {
    id: 1,
    name: 'Minimalist Watch No. 01',
    description: 'Precision engineered timepiece crafted with surgical-grade 316L stainless steel casing, scratch-resistant sapphire crystal glass, and a bespoke Japanese quartz movement. Water-resistant up to 5 ATM with interchangeable full-grain leather strap.',
    price: 280.00,
    imageUrl: watchSvg,
    publicId: 'products/watch-01',
    stock: 24,
    active: true,
    costPrice: 140.00,
    reorderLevel: 5,
    categoryId: 1,
    categoryName: 'TIMEPIECES',
    galleryImageUrls: [watchSvg, watchAngleSvg],
    // UI convenience properties
    badge: 'NEW',
    rating: 5.0,
    reviews: 128,
  },
  {
    id: 2,
    name: 'Bauhaus Desk Lamp',
    description: 'Sculptural architectural lighting with counterbalance brass joints, anti-glare diffuser lens, and tactile touch-dimming rotary dial. Finished in ultra-matte obsidian powder coat.',
    price: 220.00,
    imageUrl: lampSvg,
    publicId: 'products/lamp-02',
    stock: 12,
    active: true,
    costPrice: 110.00,
    reorderLevel: 4,
    categoryId: 2,
    categoryName: 'LIGHTING & DESK',
    galleryImageUrls: [lampSvg, lampDetailSvg],
    badge: 'ARCHIVE',
    badgeType: 'outline',
    rating: 5.0,
    reviews: 94,
  },
  {
    id: 3,
    name: 'Matte Wool Blazer',
    description: 'Unstructured tailoring crafted in Biella, Italy from 100% cold-milled virgin merino wool. Features horn buttons, interior passport pocket, and breathable silk-blend half lining.',
    price: 440.00,
    imageUrl: blazerSvg,
    publicId: 'products/blazer-03',
    stock: 18,
    active: true,
    costPrice: 210.00,
    reorderLevel: 5,
    categoryId: 3,
    categoryName: 'APPAREL & UNIFORM',
    galleryImageUrls: [blazerSvg],
    badge: null,
    rating: 4.9,
    reviews: 47,
  },
  {
    id: 4,
    name: 'Raw Titanium Pen',
    description: 'Machined from a solid billet of Grade 5 titanium with Schmidt easyFLOW 9000 pressurized cartridge. Balanced centroid with micro-grooved tactile grip and stonewashed matte exterior.',
    price: 95.00,
    imageUrl: penSvg,
    publicId: 'products/pen-04',
    stock: 8,
    active: true,
    costPrice: 42.00,
    reorderLevel: 10,
    categoryId: 4,
    categoryName: 'WRITING & DESK',
    galleryImageUrls: [penSvg],
    badge: 'RESTOCKED',
    badgeType: 'black',
    rating: 5.0,
    reviews: 312,
  },
  {
    id: 5,
    name: 'Heavy Canvas Tote',
    description: 'Indestructible 24oz organic cotton duck canvas with reinforced cross-box stitching, interior storm flap, zippered laptop sleeve, and vegetable-tanned bridle leather handles.',
    price: 140.00,
    imageUrl: toteSvg,
    publicId: 'products/tote-05',
    stock: 35,
    active: true,
    costPrice: 65.00,
    reorderLevel: 8,
    categoryId: 5,
    categoryName: 'LUGGAGE & CARRY',
    galleryImageUrls: [toteSvg],
    badge: null,
    rating: 4.8,
    reviews: 182,
  },
  {
    id: 6,
    name: 'Ceramic Pour-Over Set',
    description: 'Hand-thrown stoneware dripper and 600ml matching carafe fired at 1280°C in Hasami, Japan. Optimized internal spiral ribs facilitate even extraction and balanced thermal retention.',
    price: 85.00,
    imageUrl: pourOverSvg,
    publicId: 'products/pourover-06',
    stock: 3,
    active: true,
    costPrice: 38.00,
    reorderLevel: 5,
    categoryId: 6,
    categoryName: 'CERAMICS & KITCHENWARE',
    galleryImageUrls: [pourOverSvg],
    badge: 'LOW STOCK',
    rating: 5.0,
    reviews: 156,
  },
  {
    id: 7,
    name: 'Felt Precision Desk Mat',
    description: 'High-density 4mm natural wool felt with non-slip cork underside. Protects work surfaces, reduces acoustic reverberation, and provides effortless optical mouse tracking.',
    price: 62.00,
    imageUrl: deskMatSvg,
    publicId: 'products/deskmat-07',
    stock: 40,
    active: true,
    costPrice: 26.00,
    reorderLevel: 10,
    categoryId: 4,
    categoryName: 'DESK GEAR',
    galleryImageUrls: [deskMatSvg],
    badge: null,
    rating: 4.8,
    reviews: 89,
  },
  {
    id: 8,
    name: 'Cast Iron Monolith',
    description: 'Brutalist geometric paperweight and incense altar cast in sand molds using reclaimed iron. Each piece develops a unique natural patina through ambient oxygen exposure.',
    price: 115.00,
    imageUrl: monolithSvg,
    publicId: 'products/monolith-08',
    stock: 0,
    active: true,
    costPrice: 50.00,
    reorderLevel: 5,
    categoryId: 7,
    categoryName: 'SCULPTURE',
    galleryImageUrls: [monolithSvg],
    badge: 'Sold out',
    rating: 5.0,
    reviews: 23,
  },
];

export const PREVIEW_RECOMMENDATIONS = [
  {
    id: 9,
    name: 'Modular Key Wrap',
    description: 'Compact vegetable-tanned leather organizer holding up to 6 keys with silent neodymium magnetic closure and titanium D-ring attachment point.',
    price: 48.00,
    imageUrl: keyWrapSvg,
    publicId: 'products/keywrap-09',
    stock: 22,
    active: true,
    costPrice: 18.00,
    reorderLevel: 6,
    categoryId: 5,
    categoryName: 'LEATHER GOODS',
    galleryImageUrls: [keyWrapSvg],
    rating: 4.9,
    reviews: 110,
  },
  {
    id: 7,
    name: 'Felt Precision Desk Mat',
    description: 'High-density 4mm natural wool felt with non-slip cork underside. Protects work surfaces, reduces acoustic reverberation, and provides effortless optical mouse tracking.',
    price: 62.00,
    imageUrl: deskMatSvg,
    publicId: 'products/deskmat-07',
    stock: 40,
    active: true,
    costPrice: 26.00,
    reorderLevel: 10,
    categoryId: 4,
    categoryName: 'DESK GEAR',
    galleryImageUrls: [deskMatSvg],
    rating: 4.8,
    reviews: 89,
  },
  {
    id: 8,
    name: 'Cast Iron Monolith',
    description: 'Brutalist geometric paperweight and incense altar cast in sand molds using reclaimed iron.',
    price: 115.00,
    imageUrl: monolithSvg,
    publicId: 'products/monolith-08',
    stock: 0,
    active: true,
    costPrice: 50.00,
    reorderLevel: 5,
    categoryId: 7,
    categoryName: 'SCULPTURE',
    galleryImageUrls: [monolithSvg],
    rating: 5.0,
    reviews: 23,
  },
  {
    id: 10,
    name: 'Technical 5-Panel Cap',
    description: 'Water-repellent ripstop nylon cap with laser-perforated breathability panels and magnetic Fidlock rear adjuster strap.',
    price: 55.00,
    imageUrl: capSvg,
    publicId: 'products/cap-10',
    stock: 15,
    active: true,
    costPrice: 22.00,
    reorderLevel: 4,
    categoryId: 3,
    categoryName: 'HEADWEAR',
    galleryImageUrls: [capSvg],
    rating: 4.7,
    reviews: 64,
  },
];

export const folioSvg = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="62" y="44" width="76" height="112" rx="4" fill="#FFFFFF" />
  <line x1="78" y1="44" x2="78" y2="156" stroke-dasharray="3 3" stroke-width="1.5" />
  <path d="M124 90h22c2 0 4 2 4 4v12c0 2-2 4-4 4h-22" fill="#FFFFFF" />
  <line x1="140" y1="90" x2="140" y2="110" />
</svg>`);

/**
 * EXACT match of Spring Boot CartResponseDto & CartItemResponseDto:
 * - id: Long
 * - userId: Long
 * - totalAmount: double
 * - items: List<CartItemResponseDto> [
 *     id, productId, productName, productImageUrl, price, quantity, subtotal
 *   ]
 */
export const SAMPLE_CART = {
  id: 1,
  userId: 1,
  totalAmount: 605.00,
  items: [
    {
      id: 101,
      productId: 1,
      productName: 'CHRONO MINIMALIST REF. 01',
      productImageUrl: watchSvg,
      price: 380.00,
      quantity: 1,
      subtotal: 380.00,
      sku: 'CHRONO-REF-01',
      variantDetails: 'Matte Titanium / 40mm / Series Batch #04',
    },
    {
      id: 102,
      productId: 4,
      productName: 'DESK PEN NO. 2',
      productImageUrl: penSvg,
      price: 85.00,
      quantity: 1,
      subtotal: 85.00,
      sku: 'INST-PEN-02',
      variantDetails: 'Matte Black Anodized / 0.5mm Refill',
    },
    {
      id: 103,
      productId: 9,
      productName: 'LEATHER FOLIO 13',
      productImageUrl: folioSvg,
      price: 140.00,
      quantity: 1,
      subtotal: 140.00,
      sku: 'CARRY-FOL-13',
      variantDetails: 'Vegetable-Tanned Obsidian / 13-inch',
    },
  ],
};

// Backwards-compatibility alias
export const PREVIEW_PRODUCTS = SAMPLE_PRODUCTS;

export const SAMPLE_PRODUCT_DETAIL = SAMPLE_PRODUCTS[0];

export function getSampleProductById(id) {
  const numericId = Number(id);
  const found = SAMPLE_PRODUCTS.find((p) => p.id === numericId) ||
                PREVIEW_RECOMMENDATIONS.find((p) => p.id === numericId);
  return found || null;
}
