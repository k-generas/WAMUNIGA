import { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, Minus, Plus, ShoppingBag, Truck, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductItem } from '../data/catalog';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatDisplayPhone, formatRwf, generateId, normalizePhoneKey } from '../utils/format';
import { ResilientImage } from '../components/ResilientImage';

interface CartEntry {
  product: ProductItem;
  variant: string;
  quantity: number;
}

export function ShopPage() {
  const { products, siteConfig } = useStore();
  const activeProducts = products.filter((p) => p.active !== false);
  const [category, setCategory] = useState<'All' | ProductItem['category']>('All');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [fulfillment, setFulfillment] = useState<'shop_pickup' | 'kigali_moto'>('shop_pickup');
  const [paymentMethod, setPaymentMethod] = useState<'mtn_momo' | 'airtel_money' | 'pay_on_pickup'>('mtn_momo');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    totalRwf: number;
    fulfillment: string;
  } | null>(null);

  const visibleProducts =
    category === 'All' ? activeProducts : activeProducts.filter((p) => p.category === category);

  const getVariant = (product: ProductItem) =>
    selectedVariants[product.id] || product.variants[0];

  const addToCart = (product: ProductItem) => {
    const variant = getVariant(product);
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.product.id === product.id && c.variant === variant);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
    setConfirmedOrder(null);
    setDrawerOpen(true);
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => (i === idx ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);
  const subtotalRwf = cart.reduce((sum, c) => sum + c.product.priceRwf * c.quantity, 0);
  const deliveryFeeRwf =
    fulfillment === 'kigali_moto' && cart.length > 0 ? siteConfig.motoDeliveryFeeRwf : 0;
  const totalRwf = subtotalRwf + deliveryFeeRwf;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');
    if (cart.length === 0) return;

    const cleanName = customerName.trim();
    const key = normalizePhoneKey(customerPhone);
    if (cleanName.length < 2 || key.length < 9) {
      setOrderError('Enter your name and a valid Rwandan phone number.');
      return;
    }
    if (fulfillment === 'kigali_moto' && deliveryAddress.trim().length < 4) {
      setOrderError('Enter your Kigali sector / street for moto delivery.');
      return;
    }

    setSubmitting(true);
    const orderId = generateId('ord');
    const itemsSummary = cart
      .map((c) => `${c.quantity}x ${c.product.name} (${c.variant})`)
      .join(', ')
      .slice(0, 500);

    try {
      const payload: Record<string, unknown> = {
        customerName: cleanName.slice(0, 80),
        customerPhone: formatDisplayPhone(customerPhone).slice(0, 24),
        itemsSummary,
        itemCount: totalItems,
        subtotalRwf,
        deliveryFeeRwf,
        totalRwf,
        fulfillment,
        paymentMethod,
        status: 'pending',
        createdAt: serverTimestamp(),
      };
      if (fulfillment === 'kigali_moto') {
        payload.deliveryAddress = deliveryAddress.trim().slice(0, 200);
      }

      await setDoc(doc(db, 'orders', orderId), payload);
      setConfirmedOrder({
        orderId,
        totalRwf,
        fulfillment: fulfillment === 'kigali_moto' ? 'Kigali Moto Delivery' : 'In-Shop Pickup (La Bonne Adresse)',
      });
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E1D8] pb-6">
        <div>
          <p className="text-xs font-semibold text-[#14532D] mb-2">Kigali Clipper Zone Official Store</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#18191B] tracking-tight">
            Grooming Essentials &amp; Streetwear
          </h1>
          <p className="text-sm text-[#5A5C63] mt-2">
            Pick up at your next haircut chair (Free) or order same-day Kigali moto delivery (+{formatRwf(siteConfig.motoDeliveryFeeRwf)}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#FFFFFF] border border-[#E5E1D8] rounded-lg">
            {(['All', 'Apparel', 'Grooming', 'Bundle'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCategory(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === tab
                    ? 'bg-[#14532D] text-white'
                    : 'text-[#5A5C63] hover:text-[#18191B]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#E5E1D8] hover:border-[#14532D] text-sm font-semibold text-[#18191B] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#14532D]" />
            <span className="font-mono tabular-nums">Bag ({totalItems})</span>
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {visibleProducts.map((product) => {
          const activeVariant = getVariant(product);
          return (
            <div
              key={product.id}
              className="group bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl overflow-hidden flex flex-col hover:border-[#14532D]/50 transition-colors"
            >
              <div className="aspect-[4/3] bg-[#F1EFE9] overflow-hidden">
                <ResilientImage
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#5A5C63] uppercase tracking-wider">{product.category}</span>
                    <span className="text-[#14532D] font-semibold">{product.stockNote}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-base font-bold text-[#18191B]">{product.name}</h2>
                    <span className="font-mono text-sm font-bold text-[#18191B] tabular-nums shrink-0">
                      {formatRwf(product.priceRwf)}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A5C63] leading-relaxed">{product.description}</p>
                </div>

                <div className="space-y-3 pt-2 border-t border-[#E5E1D8]">
                  {product.variants.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() =>
                            setSelectedVariants((prev) => ({ ...prev, [product.id]: v }))
                          }
                          className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                            activeVariant === v
                              ? 'bg-[#14532D] border-[#14532D] text-white font-semibold'
                              : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#5A5C63] hover:text-[#18191B]'
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="w-full py-2.5 px-4 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
                  >
                    Add to Bag · {formatRwf(product.priceRwf)}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-Over Cart & Kigali Checkout Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FFFFFF] border-l border-[#E5E1D8] h-full flex flex-col justify-between overflow-y-auto">
            <div className="p-6 border-b border-[#E5E1D8] flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold text-[#18191B]">Your KCZ Shopping Bag</h2>
                <p className="text-xs text-[#5A5C63]">Pickup at La Bonne Adresse or Kigali Moto</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-lg border border-[#E5E1D8] flex items-center justify-center text-[#5A5C63] hover:text-[#18191B] cursor-pointer"
                aria-label="Close bag"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex-1 space-y-6">
              {confirmedOrder ? (
                <div className="bg-[#F4F8F5] border border-[#14532D]/40 rounded-xl p-6 space-y-3">
                  <div className="flex items-center gap-2.5 text-[#14532D]">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-mono text-xs font-semibold">ORDER #{confirmedOrder.orderId}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-[#18191B]">
                    Order Confirmed — Preparing Items
                  </h3>
                  <p className="text-sm text-[#5A5C63]">
                    Total: <span className="font-mono font-semibold text-[#18191B]">{formatRwf(confirmedOrder.totalRwf)}</span>
                    <br />
                    Method: {confirmedOrder.fulfillment}
                    <br />
                    MoMo Merchant: <span className="font-mono font-semibold text-[#14532D]">{siteConfig.momoPayCode}</span>
                  </p>
                </div>
              ) : cart.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingBag className="w-8 h-8 text-[#9CA3AF] mx-auto" />
                  <p className="text-sm text-[#5A5C63]">Your bag is empty. Add durags, oils, or apparel.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((entry, idx) => (
                      <div
                        key={`${entry.product.id}_${entry.variant}`}
                        className="flex items-center justify-between gap-3 bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#18191B] truncate">{entry.product.name}</p>
                          <p className="text-xs text-[#5A5C63]">{entry.variant}</p>
                          <p className="font-mono text-xs font-semibold text-[#14532D] mt-1 tabular-nums">
                            {formatRwf(entry.product.priceRwf * entry.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQty(idx, -1)}
                            className="w-7 h-7 rounded border border-[#E5E1D8] bg-white flex items-center justify-center text-[#18191B] hover:border-[#14532D] cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono text-xs w-5 text-center tabular-nums">{entry.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(idx, 1)}
                            className="w-7 h-7 rounded border border-[#E5E1D8] bg-white flex items-center justify-center text-[#18191B] hover:border-[#14532D] cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-4 border-t border-[#E5E1D8] pt-5">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#18191B]">Fulfillment Option</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFulfillment('shop_pickup')}
                          className={`p-2.5 rounded-lg border text-xs text-left cursor-pointer ${
                            fulfillment === 'shop_pickup'
                              ? 'bg-[#F4F8F5] border-[#14532D] text-[#18191B]'
                              : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#5A5C63]'
                          }`}
                        >
                          <span className="font-semibold block">Shop Pickup</span>
                          <span className="text-[11px]">La Bonne Adresse · Free</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFulfillment('kigali_moto')}
                          className={`p-2.5 rounded-lg border text-xs text-left cursor-pointer ${
                            fulfillment === 'kigali_moto'
                              ? 'bg-[#F4F8F5] border-[#14532D] text-[#18191B]'
                              : 'bg-[#F9F8F5] border-[#E5E1D8] text-[#5A5C63]'
                          }`}
                        >
                          <span className="font-semibold flex items-center gap-1">
                            <Truck className="w-3 h-3 text-[#14532D]" />
                            Kigali Moto
                          </span>
                          <span className="text-[11px]">Same-day · +{formatRwf(siteConfig.motoDeliveryFeeRwf)}</span>
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
                    />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone (0787...)"
                      className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm font-mono text-[#18191B]"
                    />

                    {fulfillment === 'kigali_moto' && (
                      <input
                        type="text"
                        required
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Kigali Delivery Address (e.g. Kacyiru, KG 5 Ave)"
                        className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
                      />
                    )}

                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                      className="w-full bg-[#F9F8F5] border border-[#E5E1D8] rounded-lg px-3.5 py-2.5 text-sm text-[#18191B]"
                    >
                      <option value="mtn_momo">Pay with MTN MoMo</option>
                      <option value="airtel_money">Pay with Airtel Money</option>
                      <option value="pay_on_pickup">Pay Cash / MoMo on Pickup</option>
                    </select>

                    <div className="space-y-1.5 text-sm border-t border-[#E5E1D8] pt-3">
                      <div className="flex justify-between text-[#5A5C63]">
                        <span>Subtotal</span>
                        <span className="font-mono tabular-nums">{formatRwf(subtotalRwf)}</span>
                      </div>
                      <div className="flex justify-between text-[#5A5C63]">
                        <span>Delivery</span>
                        <span className="font-mono tabular-nums">{formatRwf(deliveryFeeRwf)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#18191B] text-base pt-1">
                        <span>Total</span>
                        <span className="font-mono text-[#14532D] tabular-nums">{formatRwf(totalRwf)}</span>
                      </div>
                    </div>

                    {orderError && <p className="text-xs text-red-700">{orderError}</p>}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-[#14532D] text-white text-sm font-semibold rounded-lg hover:bg-[#166534] transition-colors cursor-pointer"
                    >
                      {submitting ? 'Placing Order...' : `Place Order · ${formatRwf(totalRwf)}`}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
