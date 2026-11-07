"use client";

import { useState, useTransition } from "react";
import { formatRupiah } from "@/lib/format";
import {
  type ProductWithStock,
  type CategoryItem,
  createProductAction,
  updateProductAction,
  toggleProductActiveAction,
  createCategoryAction,
} from "../actions";
import {
  Search,
  Plus,
  Package,
  FolderPlus,
  Edit2,
  AlertTriangle,
  X,
} from "lucide-react";

interface ProductManagementProps {
  initialProducts: ProductWithStock[];
  initialCategories: CategoryItem[];
  isOwner: boolean;
}

export function ProductManagement({
  initialProducts,
  initialCategories,
  isOwner,
}: ProductManagementProps) {
  const [products, setProducts] = useState<ProductWithStock[]>(initialProducts);
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Product modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithStock | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formSellPrice, setFormSellPrice] = useState<string>("0");
  const [formCostPrice, setFormCostPrice] = useState<string>("0");
  const [formMinStock, setFormMinStock] = useState<string>("5");
  const [formInitialStock, setFormInitialStock] = useState<string>("0");
  const [formTrackStock, setFormTrackStock] = useState<boolean>(true);
  const [formError, setFormError] = useState("");

  // Category modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

  const [isPending, startTransition] = useTransition();

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== "all" && p.category_id !== selectedCategory) return false;
    if (statusFilter === "active" && !p.is_active) return false;
    if (statusFilter === "inactive" && p.is_active) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCat = p.category_name?.toLowerCase().includes(q);
      if (!matchName && !matchCat) return false;
    }
    return true;
  });

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormCategoryId(categories[0]?.id || "");
    setFormSellPrice("0");
    setFormCostPrice("0");
    setFormMinStock("5");
    setFormInitialStock("0");
    setFormTrackStock(true);
    setFormError("");
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (prod: ProductWithStock) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormCategoryId(prod.category_id || "");
    setFormSellPrice(prod.sell_price.toString());
    setFormCostPrice(prod.cost_price.toString());
    setFormMinStock(prod.min_stock.toString());
    setFormInitialStock("0");
    setFormTrackStock(prod.track_stock);
    setFormError("");
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const sell = parseInt(formSellPrice, 10);
    const cost = parseInt(formCostPrice, 10);
    const minStk = parseInt(formMinStock, 10);
    const initStk = parseInt(formInitialStock, 10);

    if (isNaN(sell) || sell < 0) {
      setFormError("Harga jual harus bilangan bulat positif.");
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setFormError("Harga modal harus bilangan bulat positif.");
      return;
    }

    startTransition(async () => {
      if (editingProduct) {
        const res = await updateProductAction({
          id: editingProduct.id,
          name: formName,
          category_id: formCategoryId || null,
          sell_price: sell,
          cost_price: isOwner ? cost : editingProduct.cost_price,
          min_stock: isNaN(minStk) ? 0 : minStk,
          track_stock: formTrackStock,
          is_active: editingProduct.is_active,
        });

        if (res.success && res.product) {
          const categoryName = categories.find((c) => c.id === formCategoryId)?.name || null;
          setProducts((prev) =>
            prev.map((p) =>
              p.id === editingProduct.id
                ? {
                    ...p,
                    name: formName,
                    category_id: formCategoryId || null,
                    category_name: categoryName,
                    sell_price: sell,
                    cost_price: isOwner ? cost : p.cost_price,
                    min_stock: isNaN(minStk) ? 0 : minStk,
                    track_stock: formTrackStock,
                  }
                : p
            )
          );
          setIsProductModalOpen(false);
        } else {
          setFormError(res.error || "Gagal memperbarui produk.");
        }
      } else {
        const res = await createProductAction({
          name: formName,
          category_id: formCategoryId || null,
          sell_price: sell,
          cost_price: isOwner ? cost : 0,
          min_stock: isNaN(minStk) ? 0 : minStk,
          initial_stock: isNaN(initStk) ? 0 : initStk,
          track_stock: formTrackStock,
          is_active: true,
        });

        if (res.success && res.product) {
          const categoryName = categories.find((c) => c.id === formCategoryId)?.name || null;
          const newProd: ProductWithStock = {
            id: res.product.id,
            umkm_id: res.product.umkm_id,
            name: res.product.name,
            sell_price: res.product.sell_price,
            cost_price: res.product.cost_price,
            photo_url: res.product.photo_url,
            track_stock: res.product.track_stock,
            min_stock: res.product.min_stock,
            is_active: res.product.is_active,
            category_id: res.product.category_id,
            category_name: categoryName,
            stock: isNaN(initStk) ? 0 : initStk,
            created_at: new Date().toISOString(),
          };
          setProducts((prev) => [newProd, ...prev]);
          setIsProductModalOpen(false);
        } else {
          setFormError(res.error || "Gagal menambahkan produk.");
        }
      }
    });
  };

  const handleToggleActive = (prod: ProductWithStock) => {
    startTransition(async () => {
      const nextState = !prod.is_active;
      const res = await toggleProductActiveAction(prod.id, nextState);
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, is_active: nextState } : p))
        );
      }
    });
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError("");
    if (!newCategoryName.trim()) {
      setCategoryError("Nama kategori tidak boleh kosong.");
      return;
    }

    startTransition(async () => {
      const res = await createCategoryAction({ name: newCategoryName });
      if (res.success && res.category) {
        setCategories((prev) => [...prev, res.category!]);
        setNewCategoryName("");
      } else {
        setCategoryError(res.error || "Gagal menambah kategori.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Cari produk berdasarkan nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[44px]"
          />
        </div>

        {/* Category & Status Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-border rounded-xl text-xs font-medium text-text focus:outline-none focus:border-primary min-h-[44px]"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex rounded-xl bg-bg-muted p-1 text-xs font-medium shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "all" ? "bg-white text-primary shadow-xs font-bold" : "text-text-muted"
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "active" ? "bg-white text-emerald-600 shadow-xs font-bold" : "text-text-muted"
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "inactive" ? "bg-white text-rose-600 shadow-xs font-bold" : "text-text-muted"
              }`}
            >
              Nonaktif
            </button>
          </div>

          {/* Action buttons */}
          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3.5 py-2.5 bg-bg-muted hover:bg-border text-text font-semibold text-xs rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors whitespace-nowrap"
              >
                <FolderPlus className="w-4 h-4 text-text-muted" /> Kategori
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 min-h-[44px] shadow-sm transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Tambah Produk
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-text-muted space-y-3">
            <Package className="w-12 h-12 mx-auto text-border" />
            <p className="text-base font-medium text-text">Belum ada produk yang cocok</p>
            <p className="text-sm">Silakan ubah filter atau tambahkan produk baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-muted/50 border-b border-border text-xs text-text-muted uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  {isOwner && <th className="py-3 px-4 text-right">Harga Modal</th>}
                  <th className="py-3 px-4 text-center">Stok</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isOwner && <th className="py-3 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((prod) => {
                  const isLowStock = prod.track_stock && prod.stock <= prod.min_stock;
                  return (
                    <tr key={prod.id} className="hover:bg-bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-text">{prod.name}</div>
                        {!prod.track_stock && (
                          <span className="text-[10px] text-text-muted bg-bg-muted px-1.5 py-0.5 rounded">
                            Tanpa Stok
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-text-muted">
                        {prod.category_name || "Tanpa Kategori"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums text-text">
                        {formatRupiah(prod.sell_price)}
                      </td>
                      {isOwner && (
                        <td className="py-3 px-4 text-right tabular-nums text-text-muted text-xs">
                          {formatRupiah(prod.cost_price)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        {prod.track_stock ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`font-bold tabular-nums text-sm ${
                                prod.stock <= 0
                                  ? "text-rose-600"
                                  : isLowStock
                                  ? "text-amber-600"
                                  : "text-text"
                              }`}
                            >
                              {prod.stock}
                            </span>
                            {isLowStock && (
                              <span
                                title={`Stok menipis (min: ${prod.min_stock})`}
                                className="p-0.5 bg-amber-50 rounded text-amber-600"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted font-mono">∞</span >
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOwner ? (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(prod)}
                            disabled={isPending}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              prod.is_active
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                : "bg-bg-muted text-text-muted hover:bg-border border border-border"
                            }`}
                          >
                            {prod.is_active ? "Aktif" : "Nonaktif"}
                          </button>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              prod.is_active ? "text-emerald-700" : "text-text-muted"
                            }`}
                          >
                            {prod.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        )}
                      </td>
                      {isOwner && (
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit Produk"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-border overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">
                  {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
                </h3>
                <p className="text-xs text-text-muted">
                  Kelola nama, harga, dan pengaturan stok produk Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 text-text-muted hover:text-text rounded-full hover:bg-bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 text-sm">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Kopi Susu Aren"
                  className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Kategori
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Tanpa Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Harga Jual (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formSellPrice}
                    onChange={(e) => setFormSellPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:border-primary"
                  />
                </div>
                {isOwner && (
                  <div>
                    <label className="block text-xs font-semibold text-text mb-1">
                      Harga Modal (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>

              {/* Track stock toggle */}
              <div className="pt-2 border-t border-border space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTrackStock}
                    onChange={(e) => setFormTrackStock(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                  />
                  <div>
                    <div className="text-xs font-semibold text-text">Pantau Stok Produk</div>
                    <div className="text-[11px] text-text-muted">
                      Aktifkan jika produk memiliki stok terbatas yang berkurang tiap penjualan.
                    </div>
                  </div>
                </label>

                {formTrackStock && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-text mb-1">
                        Batas Minimum Stok
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formMinStock}
                        onChange={(e) => setFormMinStock(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:border-primary"
                      />
                    </div>
                    {!editingProduct && (
                      <div>
                        <label className="block text-xs font-semibold text-text mb-1">
                          Stok Awal
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formInitialStock}
                          onChange={(e) => setFormInitialStock(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
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
                  {isPending ? "Menyimpan..." : editingProduct ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl border border-border overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text">Kelola Kategori</h3>
                <p className="text-xs text-text-muted">Tambah dan kelola kategori produk usaha Anda</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 text-text-muted hover:text-text rounded-full hover:bg-bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <form onSubmit={handleCreateCategory} className="space-y-3">
                {categoryError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    {categoryError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Tambah Kategori Baru
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Makanan, Minuman, Snack"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary min-h-[44px]"
                    />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-4 py-2.5 bg-primary text-white font-semibold text-xs rounded-xl hover:bg-primary-hover disabled:opacity-60 min-h-[44px]"
                    >
                      Tambah
                    </button>
                  </div>
                </div>
              </form>

              <div className="border border-border rounded-2xl overflow-hidden mt-4">
                <div className="bg-bg-muted/50 px-4 py-2 border-b border-border text-xs font-semibold text-text-muted">
                  Daftar Kategori Saat Ini ({categories.length})
                </div>
                <div className="divide-y divide-border max-h-48 overflow-y-auto">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center text-xs text-text-muted">
                      Belum ada kategori yang dibuat.
                    </div>
                  ) : (
                    categories.map((c) => (
                      <div key={c.id} className="p-3 flex items-center justify-between text-sm">
                        <span className="font-medium text-text">{c.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-bg-muted/30 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold bg-white border border-border text-text rounded-xl hover:bg-bg-muted min-h-[44px]"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
