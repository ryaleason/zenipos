import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { getProductsAction, getCategoriesAction } from "@/features/products/actions";
import { ProductManagement } from "@/features/products/components/product-management";
import { Package } from "lucide-react";

export const metadata: Metadata = {
  title: "Kelola Produk | ZeniPOS",
  description: "Manajemen katalog produk, harga, dan kategori UMKM",
};

function ProductSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-14 bg-bg-muted rounded-2xl" />
      <div className="h-96 bg-bg-muted rounded-2xl" />
    </div>
  );
}

async function ProductContent() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login");
  }

  const isOwner = profile.role === "owner";

  const [productsRes, categoriesRes] = await Promise.all([
    getProductsAction(),
    getCategoriesAction(),
  ]);

  const products = productsRes.success ? productsRes.products : [];
  const categories = categoriesRes.success ? categoriesRes.categories : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Katalog Produk
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Kelola daftar produk jualan, penetapan harga jual, dan status ketersediaan.
          </p>
        </div>
      </div>

      <ProductManagement
        initialProducts={products}
        initialCategories={categories}
        isOwner={isOwner}
      />
    </div>
  );
}

export default function ProductPage() {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent />
    </Suspense>
  );
}
