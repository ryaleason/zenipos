import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { getProfitLossReportAction } from "@/features/reports/actions";
import { ReportDashboard } from "@/features/reports/components/report-dashboard";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Laporan Omzet & Laba | ZeniPOS",
  description: "Laporan performa penjualan, omzet, modal (HPP), dan laba bersih usaha",
};

function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-14 bg-bg-muted rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-bg-muted rounded-2xl" />
        <div className="h-32 bg-bg-muted rounded-2xl" />
        <div className="h-32 bg-bg-muted rounded-2xl" />
      </div>
      <div className="h-72 bg-bg-muted rounded-2xl" />
    </div>
  );
}

async function ReportContent() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  // Golden Rule 8: Cashier cannot view profit reports or cost prices
  if (profile.role !== "owner") {
    redirect("/kasir");
  }

  const storeName = profile.umkmName;

  const res = await getProfitLossReportAction({ period: "month" });
  const report = res.success && res.report
    ? res.report
    : {
        period: "month",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        totalSales: 0,
        totalCost: 0,
        grossProfit: 0,
        totalExpenses: 0,
        netProfit: 0,
        transactionCount: 0,
        topProducts: [],
        dailySales: [],
      };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Laporan Omzet & Laba Bersih
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Analisis akurat pendapatan, modal, pengeluaran operasional, dan keuntungan bersih toko.
          </p>
        </div>
      </div>

      <ReportDashboard initialReport={report} storeName={storeName} />
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportContent />
    </Suspense>
  );
}
