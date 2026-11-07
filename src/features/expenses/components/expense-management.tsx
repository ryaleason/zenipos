"use client";

import { useState, useTransition } from "react";
import { formatRupiah, formatDate } from "@/lib/format";
import {
  type ExpenseRecord,
  createExpenseAction,
  deleteExpenseAction,
} from "../actions";
import { EXPENSE_CATEGORIES } from "../schemas";
import {
  ArrowDownCircle,
  Plus,
  Search,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";

interface ExpenseManagementProps {
  initialExpenses: ExpenseRecord[];
}

export function ExpenseManagement({ initialExpenses }: ExpenseManagementProps) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Modal create
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [formAmount, setFormAmount] = useState<string>("");
  const [formNote, setFormNote] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState("");

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCat = e.category.toLowerCase().includes(q);
      const matchNote = e.note.toLowerCase().includes(q);
      if (!matchCat && !matchNote) return false;
    }
    return true;
  });

  const handleOpenModal = () => {
    setFormCategory(EXPENSE_CATEGORIES[0]);
    setFormAmount("");
    setFormNote("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const parsedAmount = parseInt(formAmount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      setFormError("Nominal pengeluaran minimal Rp 100.");
      return;
    }

    if (!formNote.trim()) {
      setFormError("Keterangan pengeluaran wajib diisi.");
      return;
    }

    startTransition(async () => {
      const res = await createExpenseAction({
        category: formCategory,
        amount: parsedAmount,
        note: formNote,
        spent_at: formDate,
      });

      if (res.success && res.expense) {
        setExpenses((prev) => [res.expense!, ...prev]);
        setIsModalOpen(false);
      } else {
        setFormError(res.error || "Gagal mencatat pengeluaran.");
      }
    });
  };

  const handleDeleteExpense = (id: string) => {
    startTransition(async () => {
      const res = await deleteExpenseAction(id);
      if (res.success) {
        setExpenses((prev) => prev.filter((item) => item.id !== id));
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-text-muted">Total Pengeluaran Tercatat</span>
            <div className="text-2xl font-bold text-rose-600 tabular-nums mt-1">
              {formatRupiah(totalExpense)}
            </div>
            <span className="text-xs text-text-muted mt-0.5 block">{expenses.length} transaksi pengeluaran</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
            <ArrowDownCircle className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Top Filter and Actions */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Cari keterangan atau kategori pengeluaran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary min-h-[44px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-border rounded-xl text-xs font-medium text-text focus:outline-none focus:border-primary min-h-[44px]"
          >
            <option value="all">Semua Kategori</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOpenModal}
            className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[44px] shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Catat Pengeluaran
          </button>
        </div>
      </div>

      {/* Expense List Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-2">
            <ArrowDownCircle className="w-12 h-12 mx-auto text-border" />
            <p className="text-base font-medium text-text">Belum ada pengeluaran tercatat</p>
            <p className="text-sm">Catat biaya operasional toko Anda untuk menghitung Laba Bersih secara akurat.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-muted/50 border-b border-border text-xs text-text-muted uppercase">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-xs text-text-muted whitespace-nowrap">
                      {formatDate(e.spent_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bg-muted text-text border border-border">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-text">{e.note}</td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums text-rose-600">
                      {formatRupiah(e.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setDeletingId(e.id)}
                        className="p-2 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Pengeluaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl border border-border overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">Catat Pengeluaran Operasional</h3>
                <p className="text-xs text-text-muted">Biaya sewa, gaji, bahan baku, listrik, dll.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-text-muted hover:text-text rounded-full hover:bg-bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 text-sm">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Kategori Pengeluaran <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Nominal (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="100"
                  required
                  placeholder="Contoh: 150000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Tanggal Pengeluaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Keterangan / Keperluan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Contoh: Beli kemasan cup plastik 500 pcs dari supplier"
                  className="w-full p-3 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {isPending ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-text">Hapus Pengeluaran?</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Catatan pengeluaran ini akan dihapus secara permanen dari perhitungan Laba Bersih.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text rounded-xl min-h-[44px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteExpense(deletingId)}
                disabled={isPending}
                className="px-5 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-60 min-h-[44px]"
              >
                {isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
