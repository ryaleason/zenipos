"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";

export interface TopProductItem {
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

export interface DailySalesItem {
  date: string;
  total_sales: number;
}

export interface ProfitLossReportData {
  period: string;
  startDate: string;
  endDate: string;
  totalSales: number; // Omzet
  totalCost: number; // HPP / Modal
  grossProfit: number; // Laba Kotor = Omzet - HPP
  totalExpenses: number; // Pengeluaran
  netProfit: number; // Laba Bersih = Laba Kotor - Pengeluaran
  transactionCount: number;
  topProducts: TopProductItem[];
  dailySales: DailySalesItem[];
}

/**
 * Calculate comprehensive Profit & Loss report (Owner only per Golden Rule 8)
 */
export async function getProfitLossReportAction(options?: {
  period?: "today" | "7days" | "month" | "custom";
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  report?: ProfitLossReportData;
  error?: string;
}> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.umkmId || profile.role !== "owner") {
      return { success: false, error: "Akses ditolak: Hanya pemilik yang dapat melihat laporan laba rugi." };
    }

    const supabase = await createServerClient();

    const now = new Date();
    let startIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); // Default month start
    let endIso = now.toISOString();

    const period = options?.period || "month";

    if (period === "today") {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      startIso = todayStart.toISOString();
    } else if (period === "7days") {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      startIso = weekStart.toISOString();
    } else if (period === "custom" && options?.startDate && options?.endDate) {
      startIso = new Date(options.startDate).toISOString();
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      endIso = end.toISOString();
    }

    // 1. Fetch completed sales with items
    const { data: sales, error: salesErr } = await supabase
      .from("sales")
      .select(`
        id,
        total,
        sold_at,
        sale_items(product_name, qty, sell_price, cost_price, subtotal)
      `)
      .eq("status", "completed")
      .gte("sold_at", startIso)
      .lte("sold_at", endIso);

    if (salesErr) throw salesErr;

    interface RawReportSaleItem {
      product_name: string;
      qty: number;
      cost_price: number;
      subtotal: number;
    }
    interface RawReportSale {
      total: number;
      sold_at: string;
      sale_items: RawReportSaleItem[];
    }
    interface RawReportExpense {
      amount: number;
    }

    let totalSales = 0;
    let totalCost = 0;
    const productStats: Record<string, { total_qty: number; total_revenue: number }> = {};
    const dailyMap: Record<string, number> = {};

    ((sales as unknown as RawReportSale[]) || []).forEach((sale) => {
      totalSales += Number(sale.total);

      // Group daily
      const dayStr = sale.sold_at.split("T")[0];
      dailyMap[dayStr] = (dailyMap[dayStr] || 0) + Number(sale.total);

      // Calculate cost and product performance
      (sale.sale_items || []).forEach((item) => {
        const qty = Number(item.qty);
        const costPrice = Number(item.cost_price || 0);
        totalCost += costPrice * qty;

        if (!productStats[item.product_name]) {
          productStats[item.product_name] = { total_qty: 0, total_revenue: 0 };
        }
        productStats[item.product_name].total_qty += qty;
        productStats[item.product_name].total_revenue += Number(item.subtotal);
      });
    });

    // 2. Fetch expenses
    const { data: expenses, error: expErr } = await supabase
      .from("expenses")
      .select("amount")
      .gte("spent_at", startIso.split("T")[0])
      .lte("spent_at", endIso.split("T")[0]);

    if (expErr) throw expErr;

    const totalExpenses = ((expenses as unknown as RawReportExpense[]) || []).reduce(
      (acc: number, curr) => acc + Number(curr.amount),
      0
    );
    const grossProfit = totalSales - totalCost;
    const netProfit = grossProfit - totalExpenses;

    // Top products sorted by quantity
    const topProducts: TopProductItem[] = Object.entries(productStats)
      .map(([product_name, data]) => ({
        product_name,
        total_qty: data.total_qty,
        total_revenue: data.total_revenue,
      }))
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 5);

    const dailySales: DailySalesItem[] = Object.entries(dailyMap)
      .map(([date, total_sales]) => ({ date, total_sales }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      report: {
        period,
        startDate: startIso,
        endDate: endIso,
        totalSales,
        totalCost,
        grossProfit,
        totalExpenses,
        netProfit,
        transactionCount: (sales || []).length,
        topProducts,
        dailySales,
      },
    };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("getProfitLossReportAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Gagal menghitung laporan laba rugi" };
  }
}
