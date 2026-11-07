"use client";

import { useState, useTransition } from "react";
import { formatRupiah, formatDateTime } from "@/lib/format";
import { voidSaleAction, type SaleRecord } from "../actions";
import {
  Search,
  Receipt,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  Printer,
  Share2,
  Calendar,
  X,
} from "lucide-react";
import { printReceipt, shareReceiptWhatsApp } from "@/features/pos/utils";

interface SalesHistoryProps {
  initialSales: SaleRecord[];
  isOwner: boolean;
  storeName: string;
}

export function SalesHistory({ initialSales, isOwner, storeName }: SalesHistoryProps) {
  const [sales, setSales] = useState<SaleRecord[]>(initialSales);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "void">("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  // Void modal state
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredSales = sales.filter((s) => {
    // Status filter
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    // Payment filter
    if (paymentFilter !== "all" && s.payment_method !== paymentFilter) return false;
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchInvoice = s.invoice_no.toLowerCase().includes(q);
      const matchNote = s.note?.toLowerCase().includes(q);
      const matchItem = s.items.some((item) => item.product_name.toLowerCase().includes(q));
      if (!matchInvoice && !matchNote && !matchItem) return false;
    }
    return true;
  });

  const handleOpenVoidModal = (sale: SaleRecord) => {
    setSelectedSale(sale);
    setVoidReason("");
    setVoidError("");
    setIsVoidModalOpen(true);
  };

  const handleConfirmVoid = () => {
    if (!selectedSale) return;
    if (!voidReason.trim()) {
      setVoidError("Alasan pembatalan wajib diisi (minimal 3 karakter)");
      return;
    }

    startTransition(async () => {
      const res = await voidSaleAction(selectedSale.id, voidReason);
      if (res.success) {
        setSales((prev) =>
          prev.map((s) =>
            s.id === selectedSale.id
              ? { ...s, status: "void" as const, note: `[VOID] ${voidReason}` }
              : s
          )
        );
        setIsVoidModalOpen(false);
        if (selectedSale.id === selectedSale?.id) {
          setSelectedSale((prev) => (prev ? { ...prev, status: "void", note: `[VOID] ${voidReason}` } : null));
        }
      } else {
        setVoidError(res.error || "Gagal membatalkan transaksi.");
      }
    });
  };

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case "cash":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Tunai</span>;
      case "qris":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-50 text-violet-700 border border-violet-200">QRIS</span>;
      case "transfer":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">Transfer</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-bg-muted text-text-muted">{method}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari no invoice, produk, atau catatan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Status Tabs */}
            <div className="flex rounded-xl bg-bg-muted p-1 text-xs font-medium shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === "all" ? "bg-white text-primary shadow-xs font-bold" : "text-text-muted hover:text-text"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === "completed" ? "bg-white text-emerald-600 shadow-xs font-bold" : "text-text-muted hover:text-text"
                }`}
              >
                Selesai
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("void")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === "void" ? "bg-white text-rose-600 shadow-xs font-bold" : "text-text-muted hover:text-text"
                }`}
              >
                Dibatalkan
              </button>
            </div>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-border rounded-xl text-xs font-medium text-text focus:outline-none focus:border-primary shrink-0 min-h-[44px]"
            >
              <option value="all">Semua Metode</option>
              <option value="cash">Tunai</option>
              <option value="qris">QRIS</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales List Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-3">
            <Receipt className="w-12 h-12 mx-auto text-border" />
            <p className="text-base font-medium text-text">Belum ada transaksi ditemukan</p>
            <p className="text-sm">Silakan ubah filter atau lakukan transaksi baru di menu Kasir.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-muted/50 border-b border-border text-xs text-text-muted uppercase">
                <tr>
                  <th className="py-3 px-4">Invoice / Waktu</th>
                  <th className="py-3 px-4">Kasir</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4 text-right">Total Transaksi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-text">{sale.invoice_no}</div>
                      <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(sale.sold_at)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text text-xs">
                      {sale.created_by_name || "Kasir"}
                    </td>
                    <td className="py-3 px-4">
                      {getPaymentBadge(sale.payment_method)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums text-text">
                      {formatRupiah(sale.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sale.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Dibatalkan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSale(sale)}
                          className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isOwner && sale.status === "completed" && (
                          <button
                            type="button"
                            onClick={() => handleOpenVoidModal(sale)}
                            className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Batalkan Transaksi (Void)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">Detail Transaksi</h3>
                <p className="text-xs text-text-muted">{selectedSale.invoice_no}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="p-2 text-text-muted hover:text-text rounded-full hover:bg-bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-bg-muted/40 p-4 rounded-2xl">
                <div>
                  <span className="text-xs text-text-muted block">Waktu Transaksi</span>
                  <span className="font-medium text-text">{formatDateTime(selectedSale.sold_at)}</span>
                </div>
                <div>
                  <span className="text-xs text-text-muted block">Metode Pembayaran</span>
                  <div className="mt-0.5">{getPaymentBadge(selectedSale.payment_method)}</div>
                </div>
                <div>
                  <span className="text-xs text-text-muted block">Kasir</span>
                  <span className="font-medium text-text">{selectedSale.created_by_name || "Kasir"}</span>
                </div>
                <div>
                  <span className="text-xs text-text-muted block">Status</span>
                  <span className={`font-semibold text-xs ${selectedSale.status === "completed" ? "text-emerald-600" : "text-rose-600"}`}>
                    {selectedSale.status === "completed" ? "Selesai" : "Dibatalkan (Void)"}
                  </span>
                </div>
              </div>

              {selectedSale.note && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <span className="font-bold">Catatan:</span> {selectedSale.note}
                </div>
              )}

              {/* Items List */}
              <div className="border border-border rounded-2xl overflow-hidden">
                <div className="bg-bg-muted/50 px-4 py-2 border-b border-border text-xs font-semibold text-text-muted">
                  Daftar Produk ({selectedSale.items.length})
                </div>
                <div className="divide-y divide-border">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-text">{item.product_name}</div>
                        <div className="text-xs text-text-muted tabular-nums">
                          {item.qty} × {formatRupiah(item.sell_price)}
                        </div>
                      </div>
                      <div className="font-semibold tabular-nums text-text">
                        {formatRupiah(item.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary calculation */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Total Belanja</span>
                  <span className="font-bold text-text tabular-nums text-base">{formatRupiah(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Nominal Diterima</span>
                  <span className="tabular-nums font-medium">{formatRupiah(selectedSale.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-xs text-text-muted">
                  <span>Kembalian</span>
                  <span className="tabular-nums font-medium">
                    {formatRupiah(Math.max(0, selectedSale.paid_amount - selectedSale.total))}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-bg-muted/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    printReceipt({
                      storeName,
                      invoiceNo: selectedSale.invoice_no,
                      date: selectedSale.sold_at,
                      cashierName: selectedSale.created_by_name || "Kasir",
                      items: selectedSale.items.map((it) => ({
                        name: it.product_name,
                        qty: it.qty,
                        price: it.sell_price,
                        subtotal: it.subtotal,
                      })),
                      total: selectedSale.total,
                      paidAmount: selectedSale.paid_amount,
                      change: Math.max(0, selectedSale.paid_amount - selectedSale.total),
                      paymentMethod: selectedSale.payment_method,
                    });
                  }}
                  className="px-3 py-2 bg-white border border-border text-text hover:bg-bg-muted font-medium text-xs rounded-xl flex items-center gap-1.5 min-h-[44px]"
                >
                  <Printer className="w-4 h-4" /> Cetak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    shareReceiptWhatsApp({
                      storeName,
                      invoiceNo: selectedSale.invoice_no,
                      date: selectedSale.sold_at,
                      cashierName: selectedSale.created_by_name || "Kasir",
                      items: selectedSale.items.map((it) => ({
                        name: it.product_name,
                        qty: it.qty,
                        price: it.sell_price,
                        subtotal: it.subtotal,
                      })),
                      total: selectedSale.total,
                      paidAmount: selectedSale.paid_amount,
                      change: Math.max(0, selectedSale.paid_amount - selectedSale.total),
                      paymentMethod: selectedSale.payment_method,
                    });
                  }}
                  className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-medium text-xs rounded-xl flex items-center gap-1.5 min-h-[44px]"
                >
                  <Share2 className="w-4 h-4" /> WhatsApp
                </button>
              </div>

              {isOwner && selectedSale.status === "completed" && (
                <button
                  type="button"
                  onClick={() => {
                    const s = selectedSale;
                    setSelectedSale(null);
                    handleOpenVoidModal(s);
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 font-medium text-xs rounded-xl flex items-center gap-1 min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Batalkan Transaksi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {isVoidModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-text">Batalkan Transaksi?</h3>
                <p className="text-xs text-text-muted">{selectedSale.invoice_no}</p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Sesuai <strong className="text-text">Aturan Emas #6</strong>, transaksi tidak dihapus dari sistem. Status diubah menjadi <strong className="text-rose-600">void</strong> dan semua stok produk yang terjual akan otomatis dikembalikan ke inventaris.
            </p>

            {voidError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {voidError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Alasan Pembatalan <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Contoh: Salah input pesanan pelanggan / barang dikembalikan"
                rows={3}
                className="w-full p-3 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsVoidModalOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text rounded-xl min-h-[44px]"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={isPending}
                className="px-5 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-60 min-h-[44px] flex items-center gap-2"
              >
                {isPending ? "Memproses..." : "Ya, Batalkan Transaksi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
