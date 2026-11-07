import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { getSalesHistoryAction } from "@/features/sales/actions";
import { SalesHistory } from "@/features/sales/components/sales-history";
import { Receipt } from "lucide-react";

export const metadata: Metadata = {
  title: "Riwayat Penjualan | ZeniPOS",
  description: "Daftar riwayat transaksi penjualan ZeniPOS",
};

function SalesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-14 bg-bg-muted rounded-2xl" />
      <div className="h-96 bg-bg-muted rounded-2xl" />
    </div>
  );
}

async function SalesContent() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login");
  }

  const res = await getSalesHistoryAction();
  const sales = res.success ? res.sales : [];
  const isOwner = profile.role === "owner";
  const storeName = profile.umkmName;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Riwayat Penjualan
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Kelola dan pantau seluruh transaksi kasir yang tercatat di toko Anda.
          </p>
        </div>
      </div>

      <SalesHistory
        initialSales={sales}
        isOwner={isOwner}
        storeName={storeName}
      />
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<SalesSkeleton />}>
      <SalesContent />
    </Suspense>
  );
}
