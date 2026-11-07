"use client";

import { useState, useEffect, useMemo, useSyncExternalStore, useCallback } from "react";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import type { ProductWithStock, CategoryItem } from "@/features/products/actions";
import { createSaleAction } from "@/features/pos/actions";
import { generateInvoiceNo, formatReceiptWhatsAppText } from "@/features/pos/utils";
import type { CreateSaleInput, SaleItemInput } from "@/features/pos/schemas";
import {
  cacheProductsToOffline,
  queueSaleToOutbox,
  getPendingOutboxCount,
  syncOutboxWithServer,
} from "@/lib/offline/sync";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Printer,
  Share2,
  CheckCircle2,
  Wifi,
  WifiOff,
  RefreshCw,
  QrCode,
  CreditCard,
  Banknote,
  X,
  AlertCircle,
  Package,
} from "lucide-react";

interface CartItem {
  product: ProductWithStock;
  qty: number;
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getServerOnlineSnapshot() {
  return true;
}

export function CashierTerminal({
  initialProducts,
  categories,
}: {
  initialProducts: ProductWithStock[];
  categories: CategoryItem[];
}) {
  const [products, setProducts] = useState<ProductWithStock[]>(initialProducts);
  const [prevInitial, setPrevInitial] = useState<ProductWithStock[]>(initialProducts);

  if (initialProducts !== prevInitial) {
    setPrevInitial(initialProducts);
    setProducts(initialProducts);
  }
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpenMobile, setIsCartOpenMobile] = useState<boolean>(false);

  // Online status via external store
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "qris">("cash");
  const [paidAmountInput, setPaidAmountInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success / Receipt modal
  const [completedSale, setCompletedSale] = useState<CreateSaleInput | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingOutboxCount();
    setPendingSyncCount(count);
  }, []);

  const handleAutoSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncOutboxWithServer(async (sale) => {
        const res = await createSaleAction(sale);
        return { success: res.success, error: res.error };
      });
      await refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  // Handle auto sync on network online event
  useEffect(() => {
    const onOnline = () => {
      void handleAutoSync();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [handleAutoSync]);

  // Initial cache to Dexie and fetch outbox count asynchronously
  useEffect(() => {
    let isMounted = true;
    if (initialProducts.length > 0) {
      void cacheProductsToOffline(
        initialProducts.map((p) => ({
          ...p,
          is_active: p.is_active,
        }))
      );
    }
    void getPendingOutboxCount().then((count) => {
      if (isMounted) setPendingSyncCount(count);
    });
    return () => {
      isMounted = false;
    };
  }, [initialProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_active) return false;
      const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart totals
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.sell_price * item.qty, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const addToCart = (product: ProductWithStock) => {
    if (product.track_stock && product.stock <= 0) {
      toast({
        title: "Stok Habis",
        description: `Produk "${product.name}" saat ini habis.`,
        variant: "destructive",
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (product.track_stock && existing.qty >= product.stock) {
          toast({
            title: "Batas Stok Tercapai",
            description: `Stok "${product.name}" hanya tersedia ${product.stock} pcs.`,
            variant: "destructive",
          });
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            if (delta > 0 && item.product.track_stock && item.qty >= item.product.stock) {
              toast({
                title: "Batas Stok Tercapai",
                description: `Stok "${item.product.name}" hanya tersedia ${item.product.stock} pcs.`,
                variant: "destructive",
              });
              return item;
            }
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => setCart([]);

  // Open checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;

    // Verify stock before opening checkout modal
    const overstockedItem = cart.find(
      (item) => item.product.track_stock && item.qty > item.product.stock
    );
    if (overstockedItem) {
      toast({
        title: "Stok Tidak Mencukupi",
        description: `Produk "${overstockedItem.product.name}" hanya memiliki stok ${overstockedItem.product.stock} pcs, namun dipesan ${overstockedItem.qty} pcs.`,
        variant: "destructive",
      });
      return;
    }

    setPaidAmountInput(String(totalAmount));
    setErrorMessage(null);
    setIsCheckoutOpen(true);
  };

  const paidAmount = Number(paidAmountInput.replace(/\D/g, "")) || 0;
  const changeAmount = Math.max(0, paidAmount - totalAmount);

  // Submit Sale
  const handleCompleteSale = async () => {
    const overstockedItem = cart.find(
      (item) => item.product.track_stock && item.qty > item.product.stock
    );
    if (overstockedItem) {
      setErrorMessage(
        `Stok untuk "${overstockedItem.product.name}" tidak mencukupi (sisa ${overstockedItem.product.stock} pcs). Kurangi jumlah pesanan.`
      );
      return;
    }

    if (paymentMethod === "cash" && paidAmount < totalAmount) {
      setErrorMessage("Uang tunai yang diterima kurang dari total belanja!");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const salePayload = {
      id: crypto.randomUUID(),
      invoice_no: generateInvoiceNo(),
      total: totalAmount,
      payment_method: paymentMethod,
      paid_amount: paymentMethod === "cash" ? paidAmount : totalAmount,
      sold_at: new Date().toISOString(),
      items: cart.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        qty: item.qty,
        sell_price: item.product.sell_price,
        cost_price: item.product.cost_price || 0,
        subtotal: item.product.sell_price * item.qty,
      })),
    };

    try {
      if (isOnline) {
        // Online: call server action directly
        const res = await createSaleAction(salePayload);
        if (!res.success) {
          throw new Error(res.error || "Gagal mencatat transaksi di server");
        }
      } else {
        // Offline: save to Dexie outbox
        await queueSaleToOutbox({
          ...salePayload,
          umkm_id: cart[0]?.product.umkm_id || "",
          status: "pending",
          retry_count: 0,
        });
        await refreshPendingCount();
      }

      // Update local product stock in state immediately
      setProducts((prev) =>
        prev.map((p) => {
          const sold = salePayload.items.find((item) => item.product_id === p.id);
          if (sold && p.track_stock) {
            return { ...p, stock: Math.max(0, p.stock - sold.qty) };
          }
          return p;
        })
      );

      // Success
      setCompletedSale(salePayload);
      setIsCheckoutOpen(false);
      clearCart();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!completedSale) return;
    const text = formatReceiptWhatsAppText(completedSale, "ZeniPOS");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
      {/* Left: Product Catalog & Search */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-border">
        {/* Top Control Bar */}
        <div className="p-3 sm:p-4 border-b border-border bg-bg-subtle shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-xl text-sm text-text placeholder-text-faint focus:outline-none focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Offline & Sync Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                  isOnline
                    ? "bg-green-50 text-accent-green border-green-200"
                    : "bg-amber-50 text-accent-amber border-amber-200"
                }`}
                title={isOnline ? "Online Terhubung" : "Mode Offline Aktif"}
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
              </div>

              {pendingSyncCount > 0 && (
                <button
                  onClick={handleAutoSync}
                  disabled={isSyncing || !isOnline}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary-soft text-primary border border-primary/20 hover:bg-primary/10 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Sinkronkan transaksi offline"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{pendingSyncCount} Tertunda</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-primary text-on-primary"
                  : "bg-bg border border-border text-text-muted hover:border-text-faint"
              }`}
            >
              Semua Kategori
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-primary text-on-primary"
                    : "bg-bg border border-border text-text-muted hover:border-text-faint"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid (Phone First, touch >= 44px) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-text-muted">
              <Package className="w-12 h-12 text-text-faint mb-3" />
              <p className="font-semibold text-sm">Tidak ada produk ditemukan</p>
              <p className="text-xs text-text-faint mt-1">
                {searchQuery ? "Coba gunakan kata kunci pencarian lain" : "Belum ada produk aktif dalam kategori ini"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find((item) => item.product.id === product.id);
                const inCartQty = inCart?.qty || 0;
                const isOutOfStock = product.track_stock && product.stock <= 0;
                const isMaxInCart = product.track_stock && inCartQty >= product.stock;

                return (
                  <button
                    key={product.id}
                    onClick={() => {
                      if (isOutOfStock) {
                        toast({
                          title: "Stok Habis",
                          description: `Produk "${product.name}" saat ini habis.`,
                          variant: "destructive",
                        });
                        return;
                      }
                      if (isMaxInCart) {
                        toast({
                          title: "Batas Stok Tercapai",
                          description: `Seluruh stok "${product.name}" (${product.stock} pcs) sudah ada di keranjang.`,
                          variant: "destructive",
                        });
                        return;
                      }
                      addToCart(product);
                    }}
                    disabled={isOutOfStock || isMaxInCart}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 cursor-pointer min-h-[105px] ${
                      isOutOfStock || isMaxInCart
                        ? "bg-bg-muted border-border opacity-60 cursor-not-allowed"
                        : "bg-bg hover:border-primary/40 hover:shadow-xs border-border"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-bold text-sm text-text line-clamp-2 leading-tight">
                          {product.name}
                        </h3>
                        {inCartQty > 0 && (
                          <span className="shrink-0 bg-primary text-on-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {inCartQty}
                          </span>
                        )}
                      </div>
                      {product.category_name && (
                        <span className="text-[10px] text-text-faint block mt-0.5">
                          {product.category_name}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-border/50">
                      <span className="font-bold text-sm text-primary font-mono tabular-nums">
                        {formatRupiah(product.sell_price)}
                      </span>
                      {product.track_stock && (
                        <span
                          className={`text-[10px] font-medium ${
                            product.stock <= 0
                              ? "text-danger font-semibold"
                              : isMaxInCart
                              ? "text-accent-amber font-semibold"
                              : product.stock <= product.min_stock
                              ? "text-danger"
                              : "text-text-faint"
                          }`}
                        >
                          {product.stock <= 0
                            ? "Habis"
                            : isMaxInCart
                            ? `Penuh (${product.stock})`
                            : `Sisa: ${product.stock - inCartQty}`}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Floating Cart Summary Bar */}
        <div className="md:hidden border-t border-border bg-bg-subtle p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-primary" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-primary text-on-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItemsCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] text-text-faint uppercase font-bold">Total Belanja</p>
              <p className="text-base font-bold text-text font-mono tabular-nums">
                {formatRupiah(totalAmount)}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpenMobile(true)}
            disabled={cart.length === 0}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold disabled:opacity-50 transition-colors shadow-xs active:scale-95 cursor-pointer"
          >
            Lihat Nota ({totalItemsCount})
          </button>
        </div>
      </div>

      {/* Right: Cart & Checkout Column (Desktop Sidebar / Mobile Drawer) */}
      <div
        className={`fixed inset-0 z-50 md:relative md:inset-auto md:w-96 flex flex-col bg-bg border-l border-border md:flex transition-transform duration-300 ${
          isCartOpenMobile ? "translate-y-0" : "translate-y-full md:translate-y-0"
        }`}
      >
        {/* Cart Header */}
        <div className="p-4 border-b border-border bg-bg-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base text-text">Keranjang Penjualan</h2>
            <span className="text-xs text-text-faint font-semibold">({totalItemsCount} item)</span>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-danger hover:underline p-1 cursor-pointer font-medium"
              >
                Kosongkan
              </button>
            )}
            <button
              onClick={() => setIsCartOpenMobile(false)}
              className="md:hidden p-1.5 text-text-muted hover:text-text rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-muted">
              <ShoppingCart className="w-10 h-10 text-text-faint mb-2" />
              <p className="font-semibold text-sm">Keranjang masih kosong</p>
              <p className="text-xs text-text-faint mt-1">
                Sentuh produk di sebelah kiri untuk menambah pesanan
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-3 rounded-xl border border-border bg-bg-subtle flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-text truncate">{item.product.name}</h4>
                  <p className="text-xs text-text-muted font-mono tabular-nums mt-0.5">
                    {formatRupiah(item.product.sell_price)} x {item.qty} ={" "}
                    <span className="font-bold text-text">
                      {formatRupiah(item.product.sell_price * item.qty)}
                    </span>
                  </p>
                </div>

                {/* Stepper Buttons (>= 44px hit area) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateCartQty(item.product.id, -1)}
                    className="w-8 h-8 rounded-lg border border-border bg-bg flex items-center justify-center text-text hover:bg-bg-muted transition-colors active:scale-95 cursor-pointer"
                    aria-label="Kurangi kuantitas"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm font-mono tabular-nums">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateCartQty(item.product.id, 1)}
                    disabled={item.product.track_stock && item.qty >= item.product.stock}
                    className="w-8 h-8 rounded-lg border border-border bg-bg flex items-center justify-center text-text hover:bg-bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95 cursor-pointer"
                    aria-label="Tambah kuantitas"
                    title={
                      item.product.track_stock && item.qty >= item.product.stock
                        ? `Stok maksimal (${item.product.stock}) telah tercapai`
                        : "Tambah kuantitas"
                    }
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary & Checkout Button */}
        <div className="p-4 border-t border-border bg-bg-subtle shrink-0 space-y-3">
          <div className="space-y-1.5 text-xs text-text-muted">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums font-semibold text-text">
                {formatRupiah(totalAmount)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-text pt-2 border-t border-border">
              <span>Total Tagihan:</span>
              <span className="text-primary font-mono tabular-nums">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-bold text-base transition-colors shadow-xs disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            Bayar ({formatRupiah(totalAmount)})
          </button>
        </div>
      </div>

      {/* Modal Checkout Pembayaran */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-text">Pilih Metode Pembayaran</h3>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-text-faint hover:text-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Display */}
            <div className="p-4 rounded-xl bg-primary-soft border border-primary/20 text-center">
              <p className="text-xs uppercase font-bold text-primary tracking-wider">Total Tagihan</p>
              <p className="text-3xl font-bold font-mono text-text tabular-nums mt-1">
                {formatRupiah(totalAmount)}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "cash", label: "Tunai", icon: Banknote },
                { id: "transfer", label: "Transfer", icon: CreditCard },
                { id: "qris", label: "QRIS", icon: QrCode },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as "cash" | "transfer" | "qris")}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary text-on-primary font-bold"
                        : "border-border bg-bg-subtle text-text-muted hover:border-text-faint"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Input & Presets */}
            {paymentMethod === "cash" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">
                    Uang Tunai Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-lg font-bold font-mono text-text focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Cash Quick Presets */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setPaidAmountInput(String(totalAmount))}
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-bg hover:bg-bg-muted text-text font-medium"
                  >
                    Uang Pas
                  </button>
                  {[20000, 50000, 100000].map((amt) => {
                    if (amt >= totalAmount) {
                      return (
                        <button
                          key={amt}
                          onClick={() => setPaidAmountInput(String(amt))}
                          className="px-2.5 py-1.5 rounded-lg border border-border bg-bg hover:bg-bg-muted text-text font-medium font-mono"
                        >
                          {formatRupiah(amt)}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>

                {/* Change preview */}
                <div className="p-3 rounded-xl bg-bg-subtle border border-border flex items-center justify-between text-sm">
                  <span className="text-text-muted">Kembalian:</span>
                  <span
                    className={`font-bold font-mono text-base ${
                      paidAmount < totalAmount ? "text-danger" : "text-accent-green"
                    }`}
                  >
                    {paidAmount < totalAmount
                      ? `Kurang ${formatRupiah(totalAmount - paidAmount)}`
                      : formatRupiah(changeAmount)}
                  </span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-danger text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 py-3 rounded-xl border border-border hover:bg-bg-subtle text-text text-sm font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={isSubmitting || (paymentMethod === "cash" && paidAmount < totalAmount)}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSubmitting ? "Menyimpan..." : "Selesaikan Bayar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Struk Selesai / Nota Digital */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg border border-border rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 text-accent-green flex items-center justify-center mx-auto border border-green-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-text">Transaksi Berhasil!</h3>
              <p className="text-xs text-text-muted mt-1 font-mono">
                No. {completedSale.invoice_no}
              </p>
            </div>

            {/* Printable Receipt Paper Container */}
            <div
              id="printable-receipt"
              className="p-4 rounded-xl border border-dashed border-border bg-bg-subtle text-left text-xs space-y-3 font-mono"
            >
              <div className="text-center pb-2 border-b border-border">
                <p className="font-bold text-sm">ZeniPOS UMKM</p>
                <p className="text-[10px] text-text-faint">{formatDateTime(completedSale.sold_at || new Date().toISOString())}</p>
              </div>

              <div className="space-y-1.5">
                {completedSale.items.map((item: SaleItemInput, idx: number) => (
                  <div key={idx} className="flex justify-between text-text">
                    <span className="truncate pr-2">
                      {item.product_name} x{item.qty}
                    </span>
                    <span className="font-bold tabular-nums shrink-0">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border space-y-1">
                <div className="flex justify-between font-bold text-text">
                  <span>TOTAL</span>
                  <span>{formatRupiah(completedSale.total)}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Metode</span>
                  <span>{completedSale.payment_method.toUpperCase()}</span>
                </div>
                {completedSale.payment_method === "cash" && (
                  <>
                    <div className="flex justify-between text-text-muted">
                      <span>Tunai Diterima</span>
                      <span>{formatRupiah(completedSale.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between text-accent-green font-bold">
                      <span>Kembalian</span>
                      <span>{formatRupiah(Math.max(0, completedSale.paid_amount - completedSale.total))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handlePrintReceipt}
                className="py-2.5 px-3 rounded-xl border border-border hover:bg-bg-subtle text-text text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk</span>
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kirim WA</span>
              </button>
            </div>

            <button
              onClick={() => setCompletedSale(null)}
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary-hover transition-colors cursor-pointer shadow-xs"
            >
              Transaksi Baru &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
