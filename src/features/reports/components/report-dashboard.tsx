"use client";

import { useState, useTransition } from "react";
import { formatRupiah, formatDate } from "@/lib/format";
import {
  type ProfitLossReportData,
  getProfitLossReportAction,
} from "../actions";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Download,
  Printer,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

interface ReportDashboardProps {
  initialReport: ProfitLossReportData;
  storeName: string;
}

export function ReportDashboard({ initialReport, storeName }: ReportDashboardProps) {
  const [report, setReport] = useState<ProfitLossReportData>(initialReport);
  const [period, setPeriod] = useState<"today" | "7days" | "month" | "custom">("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: "today" | "7days" | "month" | "custom") => {
    setPeriod(newPeriod);
    if (newPeriod !== "custom") {
      startTransition(async () => {
        const res = await getProfitLossReportAction({ period: newPeriod });
        if (res.success && res.report) {
          setReport(res.report);
        }
      });
    }
  };

  const handleApplyCustomDate = () => {
    if (!customStart || !customEnd) return;
    startTransition(async () => {
      const res = await getProfitLossReportAction({
        period: "custom",
        startDate: customStart,
        endDate: customEnd,
      });
      if (res.success && res.report) {
        setReport(res.report);
      }
    });
  };

  const handleExportCSV = () => {
    const rows = [
      ["LAPORAN LABA RUGI ZENIPOS"],
      ["Nama Usaha", storeName],
      ["Periode", `${report.startDate} s/d ${report.endDate}`],
      ["Tanggal Ekspor", new Date().toLocaleString("id-ID")],
      [],
      ["RINGKASAN KEUANGAN", "NILAI (RP)"],
      ["Total Omzet (Penjualan)", report.totalSales],
      ["Harga Pokok Penjualan (HPP / Modal)", report.totalCost],
      ["Laba Kotor (Omzet - HPP)", report.grossProfit],
      ["Total Pengeluaran Operasional", report.totalExpenses],
      ["Laba Bersih (Laba Kotor - Pengeluaran)", report.netProfit],
      ["Total Transaksi Sukses", report.transactionCount],
      [],
      ["TOP 5 PRODUK TERLARIS"],
      ["Nama Produk", "Qty Terjual", "Total Omzet (Rp)"],
      ...report.topProducts.map((p) => [p.product_name, p.total_qty, p.total_revenue]),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      rows.map((e) => e.map((val) => `"${val}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-zenipos-${report.startDate}-sd-${report.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Max daily sale for relative bar chart height calculation
  const maxDailySale = Math.max(...report.dailySales.map((d) => d.total_sales), 1);

  return (
    <div className="space-y-6 print:p-0">
      {/* Top Filter and Export Bar */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        {/* Period Tabs */}
        <div className="flex rounded-xl bg-bg-muted p-1 text-xs font-semibold overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => handlePeriodChange("today")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              period === "today" ? "bg-white text-primary shadow-xs font-bold" : "text-text-muted hover:text-text"
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("7days")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              period === "7days" ? "bg-white text-primary shadow-xs font-bold" : "text-text-muted hover:text-text"
            }`}
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("month")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              period === "month" ? "bg-white text-primary shadow-xs font-bold" : "text-text-muted hover:text-text"
            }`}
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("custom")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              period === "custom" ? "bg-white text-primary shadow-xs font-bold" : "text-text-muted hover:text-text"
            }`}
          >
            Kustom
          </button>
        </div>

        {/* Custom Date Range Picker */}
        {period === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 bg-bg-muted/40 border border-border rounded-xl text-xs"
            />
            <span className="text-xs text-text-muted">s/d</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 bg-bg-muted/40 border border-border rounded-xl text-xs"
            />
            <button
              type="button"
              onClick={handleApplyCustomDate}
              disabled={isPending || !customStart || !customEnd}
              className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover disabled:opacity-50"
            >
              Terapkan
            </button>
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-border hover:bg-bg-muted text-text font-semibold text-xs rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors"
          >
            <Download className="w-4 h-4 text-text-muted" /> Ekspor CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 min-h-[44px] shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Cetak Laporan
          </button>
        </div>
      </div>

      {/* Printable Header Info */}
      <div className="hidden print:block border-b border-gray-300 pb-4 mb-4">
        <h2 className="text-xl font-bold">{storeName} - Laporan Keuangan ZeniPOS</h2>
        <p className="text-sm text-gray-600">
          Periode: {formatDate(report.startDate)} s/d {formatDate(report.endDate)}
        </p>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Omzet */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Total Omzet</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-text tabular-nums">
              {formatRupiah(report.totalSales)}
            </div>
            <span className="text-xs text-text-muted mt-1 block">
              {report.transactionCount} transaksi selesai
            </span>
          </div>
        </div>

        {/* HPP */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Total HPP / Modal</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-text tabular-nums">
              {formatRupiah(report.totalCost)}
            </div>
            <span className="text-xs text-text-muted mt-1 block">
              Modal pokok barang terjual
            </span>
          </div>
        </div>

        {/* Laba Kotor */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Laba Kotor</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">
              {formatRupiah(report.grossProfit)}
            </div>
            <span className="text-xs text-text-muted mt-1 block">
              Omzet dikurangi HPP
            </span>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted">Pengeluaran Toko</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-rose-600 tabular-nums">
              {formatRupiah(report.totalExpenses)}
            </div>
            <span className="text-xs text-text-muted mt-1 block">
              Biaya operasional, gaji, sewa, dll.
            </span>
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white rounded-2xl p-5 border border-primary/20 bg-primary/5 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Laba Bersih Akhir
              </span>
              <div className="text-3xl font-extrabold text-primary tabular-nums mt-1">
                {formatRupiah(report.netProfit)}
              </div>
            </div>
            <div className="p-3 bg-primary text-white rounded-2xl shadow-sm">
              <DollarSign className="w-7 h-7" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-primary/10 text-xs text-text-muted flex items-center justify-between">
            <span>Formula: Laba Kotor ({formatRupiah(report.grossProfit)}) - Pengeluaran ({formatRupiah(report.totalExpenses)})</span>
            <span className="font-semibold text-primary">Keuntungan Bersih Toko</span>
          </div>
        </div>
      </div>

      {/* Grid: Daily Sales Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-text flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Tren Penjualan Harian
            </h3>
            <span className="text-xs text-text-muted">
              {report.dailySales.length} hari
            </span>
          </div>

          {report.dailySales.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-text-muted text-xs">
              Belum ada data penjualan pada periode ini.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="flex items-end gap-2 h-48 pt-6 pb-2 overflow-x-auto">
                {report.dailySales.map((d, idx) => {
                  const heightPercent = Math.max(8, Math.round((d.total_sales / maxDailySale) * 100));
                  return (
                    <div
                      key={idx}
                      className="flex-1 min-w-[24px] max-w-[48px] flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-7 hidden group-hover:flex px-2 py-1 bg-text text-white text-[10px] rounded shadow-md whitespace-nowrap z-10">
                        {formatDate(d.date)}: {formatRupiah(d.total_sales)}
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-primary/80 group-hover:bg-primary rounded-t-md transition-all duration-300 min-h-[4px]"
                      />
                      <span className="text-[10px] text-text-muted truncate w-full text-center">
                        {d.date.split("-").slice(1).join("/")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Top 5 Selling Products */}
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Top 5 Terlaris
            </h3>
          </div>

          {report.topProducts.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-text-muted text-xs">
              Belum ada produk terjual.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {report.topProducts.map((p, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-sm text-text line-clamp-1">{p.product_name}</div>
                      <span className="text-xs text-text-muted">{p.total_qty} terjual</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-text tabular-nums">
                      {formatRupiah(p.total_revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
