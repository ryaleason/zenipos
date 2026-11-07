import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductsAction, getCategoriesAction } from "@/features/products/actions";
import { CashierTerminal } from "@/features/pos/components/cashier-terminal";

export const metadata: Metadata = {
  title: "Kasir Penjualan | ZeniPOS",
  description: "Pencatatan Penjualan Cepat & Struk Digital",
};

function KasirSkeleton() {
  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen flex flex-col items-center justify-center bg-bg p-8 text-text-muted animate-pulse">
      <div className="h-10 w-48 bg-bg-muted rounded-xl mb-4" />
      <div className="h-64 w-full max-w-2xl bg-bg-muted rounded-2xl" />
    </div>
  );
}

async function KasirContent() {
  const [productsRes, categoriesRes] = await Promise.all([
    getProductsAction(),
    getCategoriesAction(),
  ]);

  const initialProducts = productsRes.products || [];
  const categories = categoriesRes.categories || [];

  return (
    <div className="h-[calc(100vh-3.5rem)] md:h-screen flex flex-col overflow-hidden bg-bg">
      <CashierTerminal
        initialProducts={initialProducts}
        categories={categories}
      />
    </div>
  );
}

export default function KasirPage() {
  return (
    <Suspense fallback={<KasirSkeleton />}>
      <KasirContent />
    </Suspense>
  );
}
