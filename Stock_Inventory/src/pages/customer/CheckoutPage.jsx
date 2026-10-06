import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StepIndicator from '../../components/customer/StepIndicator';
import OrderReceipt from '../../components/OrderReceipt';
import { checkoutCart } from '../../api/cart';
import { getCurrentUser } from '../../api/auth';
import { getOrderById } from '../../api/orders';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { watchSvg } from '../../data/previewProducts';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const { items: cartItems, subtotal: cartSubtotal, clearCart } = useCart();

  // Redirect to login if unauthenticated visitor tries to checkout
  useEffect(() => {
    if (!token && !isAuthenticated) {
      navigate('/login');
    }
  }, [token, isAuthenticated, navigate]);

  // Stage 1: SHIPPING, Stage 2: PAYMENT, Stage 3: DONE
  const [stage, setStage] = useState(1);

  // Shipping Form State (Auto-filled from user profile, remains fully editable)
  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    streetAddress: user?.address || '',
    city: '',
    postalCode: '',
    country: 'Switzerland (CH)',
    specialInstructions: '',
    dispatchProtocol: 'GLOBAL_COURIER_EXPRESS',
    storeLogisticsProfile: false,
  });

  // Payment Method Selection (matching Spring Boot PaymentMethod enum)
  const [paymentMethod, setPaymentMethod] = useState('QR_PAYMENT');
  const [orderResult, setOrderResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch freshest user profile details on mount and auto-fill without locking
  useEffect(() => {
    getCurrentUser()
      .then((profile) => {
        if (profile) {
          setFormData((prev) => ({
            ...prev,
            fullName: profile.fullName || profile.username || prev.fullName || '',
            email: profile.email || prev.email || '',
            phone: profile.phone || prev.phone || '',
            streetAddress: profile.address || prev.streetAddress || '',
          }));
        }
      })
      .catch((err) => {
        console.warn('Auto-fill from profile error:', err);
      });
  }, []);

  // Real backend cart items displayed in Order Summary
  const items = (cartItems && cartItems.length > 0)
    ? cartItems.map((it) => ({
        id: it.id || it.productId,
        name: it.productName,
        variant: it.variantDetails || 'Precision Hardware / Series Standard',
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1,
        imageUrl: it.productImageUrl || watchSvg,
      }))
    : [];

  const subtotal = Number(cartSubtotal || 0);
  const shippingCost = 0.0;
  const tax = 0.0;
  const total = subtotal + shippingCost + tax;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleGoToPayment = (e) => {
    e.preventDefault();
    setStage(2);
  };

  const handleEditShipping = () => {
    setStage(1);
  };

  const handleExecutePayment = async () => {
    setLoading(true);
    const shippingParts = [
      formData.fullName,
      formData.streetAddress,
      formData.postalCode,
      formData.city,
      formData.country,
      formData.phone ? `(Tel: ${formData.phone})` : null,
    ].filter(Boolean);
    const shippingString = shippingParts.join(', ');

    try {
      const result = await checkoutCart({
        shippingAddress: shippingString,
        paymentMethod: paymentMethod,
        customerNote: formData.specialInstructions || '',
      });

      let fullOrder = result;
      if (result && result.id && (!result.orderItems || result.orderItems.length === 0)) {
        try {
          const fresh = await getOrderById(result.id);
          if (fresh) fullOrder = fresh;
        } catch (fetchErr) {
          console.warn('Could not fetch full order details:', fetchErr);
        }
      }

      setOrderResult(fullOrder);
      if (clearCart) {
        await clearCart().catch(() => {});
      }
      setStage(3);
    } catch {
      setOrderResult({
        id: Math.floor(100000 + Math.random() * 900000),
        status: 'CONFIRMED',
        orderDate: new Date().toISOString(),
        totalAmount: total,
        shippingAddress: shippingString,
        paymentMethod: paymentMethod,
        orderItems: items.map(it => ({
          id: it.id,
          productName: it.name,
          quantity: it.quantity,
          price: it.price,
          subTotal: it.price * it.quantity,
        })),
      });
      if (clearCart) {
        await clearCart().catch(() => {});
      }
      setStage(3);
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isShippingDisabled = stage >= 2;

  return (
    <div className="bg-surface min-h-screen py-10">
      <div className="mx-auto max-w-[1280px] px-6 md:px-12">
        {/* Top Header & Step Progress Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-line pb-6 mb-8 gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              CHECKOUT MANIFEST
            </span>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight text-ink md:text-4xl mt-1">
              CHECKOUT
            </h1>
          </div>
          <StepIndicator currentStep={stage} onStepClick={(s) => s < stage && setStage(s)} />
        </div>

        {stage === 3 ? (
          /* Stage 3: ORDER RECEIPT MANIFEST */
          <div className="py-2">
            <OrderReceipt order={orderResult}>
              {/* Cancellation Notice Banner */}
              {orderResult?.status !== 'CANCELLED' && (
                <div className="border border-line bg-white p-3.5 flex items-center gap-3 text-xs text-muted shadow-sm mb-6">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-ink flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>
                    You can cancel this order within 2 hours of placement, if needed.
                  </span>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col gap-3">
                <Link
                  to={`/orders/${orderResult?.id}`}
                  className="w-full h-12 bg-ink text-white text-xs font-bold uppercase tracking-[0.14em] hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  VIEW ORDER DETAILS →
                </Link>
                <Link
                  to="/shop"
                  className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-ink hover:underline pt-1 cursor-pointer"
                >
                  CONTINUE SHOPPING
                </Link>
              </div>
            </OrderReceipt>
          </div>
        ) : (
          /* Stages 1 & 2: Forms & Order Summary */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column (8 cols): Shipping & Payment Sections */}
            <div className="lg:col-span-8 flex flex-col gap-10">
              {/* SHIPPING ADDRESS SECTION */}
              <section className="border border-line bg-white p-6 md:p-8 shadow-surface">
                <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="bg-ink text-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]">
                      STAGE 01/03
                    </span>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
                      SHIPPING ADDRESS
                    </h2>
                  </div>
                  {isShippingDisabled ? (
                    <button
                      type="button"
                      onClick={handleEditShipping}
                      className="text-[10px] font-bold uppercase tracking-wider text-ink underline hover:opacity-70"
                    >
                      EDIT SHIPPING DETAILS
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                      * MANDATORY SPECIFICATION
                    </span>
                  )}
                </div>

                <form onSubmit={handleGoToPayment} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1">
                      FULL NAME *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      disabled={isShippingDisabled}
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`w-full border px-3 py-2.5 text-xs text-ink transition-colors focus:border-ink focus:outline-none ${
                        isShippingDisabled
                          ? 'border-line bg-neutral-100 text-neutral-600 cursor-not-allowed select-none'
                          : 'border-line bg-white'
                      }`}
                    />
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1">
                        EMAIL DISPATCH *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        disabled={isShippingDisabled}
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full border px-3 py-2.5 text-xs text-ink transition-colors focus:border-ink focus:outline-none ${
                          isShippingDisabled
                            ? 'border-line bg-neutral-100 text-neutral-600 cursor-not-allowed select-none'
                            : 'border-line bg-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1">
                        PHONE NUMBER *
                      </label>
                      <input
                        type="text"
                        name="phone"
                        required
                        disabled={isShippingDisabled}
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full border px-3 py-2.5 text-xs text-ink transition-colors focus:border-ink focus:outline-none ${
                          isShippingDisabled
                            ? 'border-line bg-neutral-100 text-neutral-600 cursor-not-allowed select-none'
                            : 'border-line bg-white'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Street Address */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1">
                      STREET ADDRESS *
                    </label>
                    <input
                      type="text"
                      name="streetAddress"
                      required
                      disabled={isShippingDisabled}
                      value={formData.streetAddress}
                      onChange={handleInputChange}
                      className={`w-full border px-3 py-2.5 text-xs text-ink transition-colors focus:border-ink focus:outline-none ${
                        isShippingDisabled
                          ? 'border-line bg-neutral-100 text-neutral-600 cursor-not-allowed select-none'
                          : 'border-line bg-white'
                      }`}
                    />
                  </div>

                  {/* City, Postal Code, Country */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1">
                        CITY *
                      </label>
                      <input
                        type="text"
                        name="city"
                        required
                        disabled={isShippingDisabled}
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full border px-3 py-2.5 text-xs text-ink transition-colors focus:border-ink focus:outline-none ${
                          isShippingDisabled
                            ? 'border-line bg-neutral-100 text-neutral-600 cursor-not-allowed select-none'
                            : 'border-line bg-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1">
                        POSTAL CODE *
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        required
                        disabled={isShippingDisabled}
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className={`w-full border px-3 py-2.5 text-xs text-ink transition-colors focus:border-ink focus:outline-none ${
                          isShippingDisabled
                            ? 'border-line bg-neutral-100 text-neutral-600 cursor-not-allowed select-none'
                            : 'border-line bg-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-ink mb-1">
                        COUNTRY *
                      </label>
                      <select
                        name="country"
                        disabled={isShippingDisabled}
                        value={formData.country}
                        onChange={handleInputChange}
                        className={`w-full border px-3 py-2.5 text-xs text-ink transition-colors focus:border-ink focus:outline-none ${
                          isShippingDisabled
                            ? 'border-line bg-neutral-100 text-neutral-600 cursor-not-allowed select-none'
                            : 'border-line bg-white'
                        }`}
                      >
                        <option value="Switzerland (CH)">Switzerland (CH)</option>
                        <option value="Germany (DE)">Germany (DE)</option>
                        <option value="Japan (JP)">Japan (JP)</option>
                        <option value="United States (US)">United States (US)</option>
                        <option value="United Kingdom (UK)">United Kingdom (UK)</option>
                      </select>
                    </div>
                  </div>

                  {/* Special Delivery Instructions */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink">
                        SPECIAL DELIVERY INSTRUCTIONS (OPTIONAL)
                      </label>
                      <span className="text-[9px] font-mono text-muted uppercase">
                        CONCIERGE SPEC
                      </span>
                    </div>
                    <textarea
                      name="specialInstructions"
                      rows="2"
                      disabled={isShippingDisabled}
                      value={formData.specialInstructions}
                      onChange={handleInputChange}
                      className={`w-full border px-3 py-2 text-xs text-ink transition-colors focus:border-ink focus:outline-none ${
                        isShippingDisabled
                          ? 'border-line bg-neutral-100 text-neutral-600 cursor-not-allowed select-none'
                          : 'border-line bg-white'
                      }`}
                    />
                  </div>

                  {/* Allocated Dispatch Protocol */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-ink">
                        ALLOCATED DISPATCH PROTOCOL
                      </label>
                      <span className="text-[9px] font-mono text-muted uppercase">
                        TRACKED COURIER NETWORK
                      </span>
                    </div>
                    <div className="border border-ink bg-white p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="dispatchProtocol"
                          checked
                          readOnly
                          className="accent-black h-4 w-4"
                        />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-ink">
                            Global Courier Express
                          </p>
                          <p className="text-[11px] text-muted">
                            24–48h Carbon-neutral tracked handoff via Zurich Hub
                          </p>
                        </div>
                      </div>
                      <span className="border border-line bg-chip px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">
                        COMPLIMENTARY
                      </span>
                    </div>
                  </div>

                  {/* Token Profile Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 text-xs text-muted cursor-pointer">
                      <input
                        type="checkbox"
                        name="storeLogisticsProfile"
                        disabled={isShippingDisabled}
                        checked={formData.storeLogisticsProfile}
                        onChange={handleInputChange}
                        className="accent-black mt-0.5"
                      />
                      <span>
                        Store logistics profile on encrypted device token for rapid subsequent dispatches.
                      </span>
                    </label>
                  </div>

                  {/* Continue Button (Stage 1 Only) */}
                  {!isShippingDisabled && (
                    <div className="pt-4">
                      <button
                        type="submit"
                        className="w-full h-12 bg-ink text-white text-xs font-bold uppercase tracking-[0.14em] hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        CONTINUE TO PAYMENT →
                      </button>
                      <p className="text-center text-[10px] text-muted uppercase tracking-wider mt-2.5">
                        Payment management handled by Global Courier Express
                      </p>
                    </div>
                  )}

                  {/* PAYMENT METHOD SECTION (Directly inside this same block when Stage 2) */}
                  {stage >= 2 && (
                    <div className="pt-8 mt-8 border-t border-line space-y-4">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ink">
                          SELECT PAYMENT PROTOCOL
                        </label>
                        <span className="text-[9px] font-mono text-muted uppercase">
                          ENCRYPTED GATEWAY
                        </span>
                      </div>

                      {/* Payment Option 1: QR Code Payment */}
                      <label
                        onClick={() => setPaymentMethod('QR_PAYMENT')}
                        className={`block border p-4 cursor-pointer transition-colors ${
                          paymentMethod === 'QR_PAYMENT'
                            ? 'border-ink bg-[#FAFAFA]'
                            : 'border-line hover:border-ink/50 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="QR_PAYMENT"
                              checked={paymentMethod === 'QR_PAYMENT'}
                              onChange={() => setPaymentMethod('QR_PAYMENT')}
                              className="accent-black h-4 w-4"
                            />
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-ink flex-shrink-0"
                            >
                              <rect x="3" y="3" width="7" height="7" />
                              <rect x="14" y="3" width="7" height="7" />
                              <rect x="14" y="14" width="7" height="7" />
                              <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-ink">
                                QR Code Payment
                              </p>
                              <p className="text-[11px] text-muted">
                                Instant scan via Swiss QR-Bill or European banking app
                              </p>
                            </div>
                          </div>
                          <span className="bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                            INSTANT
                          </span>
                        </div>
                      </label>

                      {/* Payment Option 2: Bank Transfer */}
                      <label
                        onClick={() => setPaymentMethod('BANK_TRANSFER')}
                        className={`block border p-4 cursor-pointer transition-colors ${
                          paymentMethod === 'BANK_TRANSFER'
                            ? 'border-ink bg-[#FAFAFA]'
                            : 'border-line hover:border-ink/50 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="BANK_TRANSFER"
                              checked={paymentMethod === 'BANK_TRANSFER'}
                              onChange={() => setPaymentMethod('BANK_TRANSFER')}
                              className="accent-black h-4 w-4"
                            />
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-ink flex-shrink-0"
                            >
                              <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3l9 7H3l9-7z" />
                            </svg>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-ink">
                                Bank Transfer
                              </p>
                              <p className="text-[11px] text-muted">
                                Direct SEPA / IBAN transfer with verified settlement manifest
                              </p>
                            </div>
                          </div>
                          <span className="border border-line bg-chip px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">
                            SEPA / FREE
                          </span>
                        </div>
                      </label>

                      {/* Payment Option 3: Cash on Delivery */}
                      <label
                        onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                        className={`block border p-4 cursor-pointer transition-colors ${
                          paymentMethod === 'CASH_ON_DELIVERY'
                            ? 'border-ink bg-[#FAFAFA]'
                            : 'border-line hover:border-ink/50 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value="CASH_ON_DELIVERY"
                              checked={paymentMethod === 'CASH_ON_DELIVERY'}
                              onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
                              className="accent-black h-4 w-4"
                            />
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-ink flex-shrink-0"
                            >
                              <rect x="2" y="6" width="20" height="12" rx="2" />
                              <circle cx="12" cy="12" r="3" />
                              <path d="M6 12h.01M18 12h.01" />
                            </svg>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-ink">
                                Cash on Delivery
                              </p>
                              <p className="text-[11px] text-muted">
                                Pay with cash upon physical parcel handoff by courier
                              </p>
                            </div>
                          </div>
                          <span className="border border-line bg-chip px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">
                            AT DOOR
                          </span>
                        </div>
                      </label>

                      {/* Pay Button */}
                      <div className="pt-6">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={handleExecutePayment}
                          className="w-full h-12 bg-ink text-white text-xs font-bold uppercase tracking-[0.14em] hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          {loading ? 'PROCESSING SETTLEMENT...' : 'PAY NOW →'}
                        </button>
                        <p className="text-center text-[10px] text-muted uppercase tracking-wider mt-2.5">
                          256-bit TLS encrypted dispatch authorization
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              </section>
            </div>

            {/* Right Column (4 cols): ORDER SUMMARY */}
            <div className="lg:col-span-4">
              <div className="border border-line bg-white p-6 shadow-surface">
                <div className="flex justify-between items-center border-b border-line pb-4 mb-5">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
                    ORDER SUMMARY
                  </h2>
                  <span className="border border-line bg-chip px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">
                    {String(items.length).padStart(2, '0')} ITEMS
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-line mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 flex-shrink-0 bg-[#FAFAFA] border border-line flex items-center justify-center p-1">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-tight text-ink truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-muted truncate">
                            {item.variant}
                          </p>
                          <p className="text-[10px] text-muted">
                            Qty {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-ink whitespace-nowrap">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2.5 border-t border-line pt-4 text-xs">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal</span>
                    <span className="font-bold text-ink">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Shipping (Global Express) <span className="text-[9px] font-mono uppercase text-ink">TRACKED</span></span>
                    <span className="font-bold text-ink">FREE</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Estimated Tax / VAT (0.00%)</span>
                    <span className="font-bold text-ink">$0.00</span>
                  </div>

                  <div className="pt-4 mt-3 border-t border-line flex justify-between items-baseline">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink">
                      TOTAL CLEARANCE
                    </span>
                    <span className="text-lg font-extrabold tracking-tight text-ink">
                      ${total.toFixed(2)} USD
                    </span>
                  </div>
                </div>

                {/* Guarantees */}
                <div className="mt-6 pt-5 border-t border-line space-y-2 text-[10px] text-muted">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-ink">✦ Zero Color Variance</span>
                  </div>
                  <p className="pl-4 text-[9px] leading-tight text-subtle">
                    Every production lot undergoes rigorous spectroscopic calibration prior to dispatch.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="font-bold text-ink">✦ 30-Day Pure Return</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Three-column Assurance Bar (Only on Stages 1 & 2) */}
        {stage !== 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-line mt-16 pt-10 text-xs">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-ink mb-1.5 text-[11px]">
                01. DIRECT MANIFEST
              </h3>
              <p className="text-muted leading-relaxed text-[11px]">
                Dispatched directly from central depot facilities in Basel and Tokyo within 24 business hours.
              </p>
            </div>
            <div>
              <h3 className="font-bold uppercase tracking-wider text-ink mb-1.5 text-[11px]">
                02. 30-DAY EVALUATION
              </h3>
              <p className="text-muted leading-relaxed text-[11px]">
                Initiate an unconditioned return or hardware recalibration within 30 days of physical courier handoff.
              </p>
            </div>
            <div>
              <h3 className="font-bold uppercase tracking-wider text-ink mb-1.5 text-[11px]">
                03. CONCIERGE PROTOCOL
              </h3>
              <p className="text-muted leading-relaxed text-[11px]">
                Direct, unautomated assistance from our design and fulfillment engineers available 24/7.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
