import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { getProductsAction } from "@/features/products/actions";
import { getStockMovementsAction } from "@/features/stock/actions";
import { StockManagement } from "@/features/stock/components/stock-management";
import { Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Manajemen Stok & Mutasi | ZeniPOS",
  description: "Pantau ketersediaan stok, barang masuk, dan mutasi barang",
};

function StockSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-14 bg-bg-muted rounded-2xl" />
      <div className="h-96 bg-bg-muted rounded-2xl" />
    </div>
  );
}

async function StockContent() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  // Golden Rule 8: Cashier cannot access stock management/cost details
  if (profile.role !== "owner") {
    redirect("/kasir");
  }

  const [productsRes, movementsRes] = await Promise.all([
    getProductsAction(),
    getStockMovementsAction(),
  ]);

  const products = productsRes.success ? productsRes.products : [];
  const movements = movementsRes.success ? movementsRes.movements : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            Manajemen Stok & Mutasi
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Pantau ketersediaan produk, catat barang masuk (kulakan), dan buku mutasi stok.
          </p>
        </div>
      </div>

      <StockManagement
        products={products}
        initialMovements={movements}
      />
    </div>
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={<StockSkeleton />}>
      <StockContent />
    </Suspense>
  );
}
