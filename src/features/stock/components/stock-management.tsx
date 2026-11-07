"use client";

import { useState, useTransition } from "react";
import { formatDateTime } from "@/lib/format";
import {
  type StockMovementRecord,
  adjustStockAction,
  getStockMovementsAction,
} from "../actions";
import type { ProductWithStock } from "@/features/products/actions";
import {
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  PlusCircle,
  History,
  Search,
  CheckCircle2,
  X,
  Package,
} from "lucide-react";

interface StockManagementProps {
  products: ProductWithStock[];
  initialMovements: StockMovementRecord[];
}

export function StockManagement({
  products: initialProducts,
  initialMovements,
}: StockManagementProps) {
  const [products, setProducts] = useState<ProductWithStock[]>(initialProducts);
  const [movements, setMovements] = useState<StockMovementRecord[]>(initialMovements);
  const [activeTab, setActiveTab] = useState<"inventory" | "ledger">("inventory");

  // Filter
  const [search, setSearch] = useState("");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedProductFilter, setSelectedProductFilter] = useState("all");

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"purchase" | "adjustment">("purchase");
  const [adjustQty, setAdjustQty] = useState<string>("1");
  const [adjustDirection, setAdjustDirection] = useState<"add" | "subtract">("add");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [isPending, startTransition] = useTransition();

  const trackableProducts = products.filter((p) => p.track_stock);

  const filteredProducts = trackableProducts.filter((p) => {
    if (showLowStockOnly && p.stock > p.min_stock) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredMovements = movements.filter((m) => {
    if (selectedProductFilter !== "all" && m.product_id !== selectedProductFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchProd = (m.product_name || "").toLowerCase().includes(q);
      const matchNote = (m.note || "").toLowerCase().includes(q);
      if (!matchProd && !matchNote) return false;
    }
    return true;
  });

  const handleOpenAdjustModal = (product?: ProductWithStock) => {
    setSelectedProductId(product?.id || trackableProducts[0]?.id || "");
    setAdjustType("purchase");
    setAdjustQty("10");
    setAdjustDirection("add");
    setAdjustNote("");
    setAdjustError("");
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError("");

    const parsedQty = parseInt(adjustQty, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setAdjustError("Jumlah stok harus angka bulat positif lebih dari 0.");
      return;
    }

    if (!adjustNote.trim()) {
      setAdjustError("Alasan / catatan penyesuaian stok wajib diisi.");
      return;
    }

    const finalQty = adjustDirection === "subtract" ? -parsedQty : parsedQty;

    startTransition(async () => {
      const res = await adjustStockAction({
        product_id: selectedProductId,
        type: adjustType,
        qty: finalQty,
        note: adjustNote,
      });

      if (res.success) {
        // Update local state
        setProducts((prev) =>
          prev.map((p) =>
            p.id === selectedProductId
              ? { ...p, stock: p.stock + finalQty }
              : p
          )
        );

        // Refresh movements
        const movRes = await getStockMovementsAction();
        if (movRes.success) {
          setMovements(movRes.movements);
        }

        setIsAdjustModalOpen(false);
      } else {
        setAdjustError(res.error || "Gagal memperbarui stok.");
      }
    });
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case "purchase":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">Barang Masuk</span>;
      case "sale":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Penjualan</span>;
      case "void_return":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Retur / Batal</span>;
      case "adjustment":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">Penyesuaian</span>;
      case "initial":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-bg-muted text-text-muted border border-border">Stok Awal</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-bg-muted text-text-muted">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Top Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex rounded-2xl bg-bg-muted p-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === "inventory"
                ? "bg-white text-primary shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            <Layers className="w-4 h-4" />
            Status Inventaris ({trackableProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === "ledger"
                ? "bg-white text-primary shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            <History className="w-4 h-4" />
            Buku Mutasi Stok
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAdjustModal()}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[44px] shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" /> Masuk / Sesuaikan Stok
        </button>
      </div>

      {/* Tab Content 1: Inventory Table */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cari nama produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary min-h-[44px]"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
              />
              Hanya stok menipis / kritis
            </label>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-text-muted space-y-2">
                <Package className="w-12 h-12 mx-auto text-border" />
                <p className="text-base font-medium text-text">Tidak ada produk ditemukan</p>
                <p className="text-sm">Semua stok aman atau produk belum diset untuk pemantauan stok.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-muted/50 border-b border-border text-xs text-text-muted uppercase">
                    <tr>
                      <th className="py-3 px-4">Nama Produk</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4 text-center">Batas Minimum</th>
                      <th className="py-3 px-4 text-center">Stok Saat Ini</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((p) => {
                      const isLow = p.stock <= p.min_stock;
                      const isNegative = p.stock < 0;
                      return (
                        <tr key={p.id} className="hover:bg-bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-text">{p.name}</td>
                          <td className="py-3 px-4 text-xs text-text-muted">{p.category_name || "-"}</td>
                          <td className="py-3 px-4 text-center tabular-nums text-text-muted">{p.min_stock}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-bold tabular-nums text-base ${
                                isNegative
                                  ? "text-rose-600 font-extrabold"
                                  : isLow
                                  ? "text-amber-600"
                                  : "text-text"
                              }`}
                            >
                              {p.stock}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isNegative ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" /> Negatif (Cek Offline)
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3" /> Menipis
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Aman
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(p)}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors"
                            >
                              Sesuaikan
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Ledger Table */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {/* Filter Ledger */}
          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cari produk atau alasan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary min-h-[44px]"
              />
            </div>

            <select
              value={selectedProductFilter}
              onChange={(e) => setSelectedProductFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-border rounded-xl text-xs font-medium text-text focus:outline-none focus:border-primary min-h-[44px]"
            >
              <option value="all">Semua Produk</option>
              {trackableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {filteredMovements.length === 0 ? (
              <div className="p-12 text-center text-text-muted space-y-2">
                <History className="w-12 h-12 mx-auto text-border" />
                <p className="text-base font-medium text-text">Belum ada riwayat mutasi stok</p>
                <p className="text-sm">Setiap transaksi atau penyesuaian akan tercatat rapi di sini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-bg-muted/50 border-b border-border text-xs text-text-muted uppercase">
                    <tr>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Produk</th>
                      <th className="py-3 px-4 text-center">Jenis Mutasi</th>
                      <th className="py-3 px-4 text-center">Perubahan (Qty)</th>
                      <th className="py-3 px-4">Catatan / Alasan</th>
                      <th className="py-3 px-4 text-right">Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-xs text-text-muted whitespace-nowrap">
                          {formatDateTime(m.created_at)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-text">{m.product_name}</td>
                        <td className="py-3 px-4 text-center">
                          {getMovementTypeBadge(m.type)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold tabular-nums text-sm ${
                              m.qty > 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {m.qty > 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {m.qty > 0 ? `+${m.qty}` : m.qty}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-text-muted max-w-xs truncate">
                          {m.note || "-"}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-text">
                          {m.created_by_name || "Sistem"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl border border-border overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">Penyesuaian Stok Produk</h3>
                <p className="text-xs text-text-muted">
                  Sesuai Golden Rule #5: Dicatat sebagai baris mutasi stok atomik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-2 text-text-muted hover:text-text rounded-full hover:bg-bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4 text-sm">
              {adjustError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {adjustError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Pilih Produk <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                >
                  {trackableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok Saat Ini: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Jenis Penyesuaian
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType("purchase");
                      setAdjustDirection("add");
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-colors ${
                      adjustType === "purchase"
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-text border-border hover:bg-bg-muted"
                    }`}
                  >
                    Barang Masuk (Kulakan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("adjustment")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-colors ${
                      adjustType === "adjustment"
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-text border-border hover:bg-bg-muted"
                    }`}
                  >
                    Stok Opname / Koreksi
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Arah</label>
                  <select
                    value={adjustDirection}
                    onChange={(e) => setAdjustDirection(e.target.value as "add" | "subtract")}
                    className="w-full px-3 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="add">+ Tambah Stok</option>
                    <option value="subtract">- Kurangi Stok</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Jumlah Qty <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full px-3 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Alasan / Keterangan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Contoh: Kulakan dari agen, produk rusak, atau hasil stok opname fisik mingguan"
                  className="w-full p-3 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text rounded-xl min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover disabled:opacity-60 min-h-[44px] flex items-center gap-2"
                >
                  {isPending ? "Menyimpan..." : "Simpan Mutasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
