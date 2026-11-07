"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export interface SaleDetailItem {
  id: string;
  product_id?: string | null;
  product_name: string;
  qty: number;
  sell_price: number;
  cost_price: number;
  subtotal: number;
}

export interface SaleRecord {
  id: string;
  umkm_id: string;
  invoice_no: string;
  total: number;
  payment_method: "cash" | "transfer" | "qris";
  paid_amount: number;
  status: "completed" | "void";
  note?: string | null;
  sold_at: string;
  created_by_name?: string | null;
  items: SaleDetailItem[];
}

/**
 * Get sales history with filtering
 */
export async function getSalesHistoryAction(options?: {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  status?: string;
  search?: string;
}): Promise<{
  success: boolean;
  sales: SaleRecord[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, sales: [], error: "Sesi login tidak valid." };

    let query = supabase
      .from("sales")
      .select(`
        id,
        umkm_id,
        invoice_no,
        total,
        payment_method,
        paid_amount,
        status,
        note,
        sold_at,
        profiles(full_name),
        sale_items(id, product_id, product_name, qty, sell_price, cost_price, subtotal)
      `)
      .order("sold_at", { ascending: false })
      .limit(100);

    if (options?.paymentMethod && options.paymentMethod !== "all") {
      query = query.eq("payment_method", options.paymentMethod);
    }

    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }

    if (options?.startDate) {
      query = query.gte("sold_at", options.startDate);
    }

    if (options?.endDate) {
      query = query.lte("sold_at", options.endDate);
    }

    if (options?.search?.trim()) {
      query = query.ilike("invoice_no", `%${options.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    interface RawSaleItemRow {
      id: string;
      product_id?: string | null;
      product_name: string;
      qty: number;
      sell_price: number;
      cost_price?: number;
      subtotal: number;
    }
    interface RawSaleRow {
      id: string;
      umkm_id: string;
      invoice_no: string;
      total: number;
      payment_method: "cash" | "transfer" | "qris";
      paid_amount: number;
      status: "completed" | "void";
      note?: string | null;
      sold_at: string;
      profiles?: { full_name: string | null } | null;
      sale_items?: RawSaleItemRow[];
    }

    const sales: SaleRecord[] = ((data as unknown as RawSaleRow[]) || []).map((s) => ({
      id: s.id,
      umkm_id: s.umkm_id,
      invoice_no: s.invoice_no,
      total: Number(s.total),
      payment_method: s.payment_method,
      paid_amount: Number(s.paid_amount),
      status: s.status,
      note: s.note,
      sold_at: s.sold_at,
      created_by_name: s.profiles?.full_name || "Kasir",
      items: (s.sale_items || []).map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        qty: Number(item.qty),
        sell_price: Number(item.sell_price),
        cost_price: Number(item.cost_price || 0),
        subtotal: Number(item.subtotal),
      })),
    }));

    return { success: true, sales };
  } catch (err: unknown) {
    console.error("getSalesHistoryAction error:", err);
    return { success: false, sales: [], error: err instanceof Error ? err.message : "Gagal memuat riwayat penjualan" };
  }
}

/**
 * Void a sale transaction (Only owner allowed per PRD)
 * Golden Rule 6: Never hard-delete, mark as 'void' and compensate stock.
 */
export async function voidSaleAction(saleId: string, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Silakan login terlebih dahulu." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("umkm_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.umkm_id || profile.role !== "owner") {
      return { success: false, error: "Hanya pemilik UMKM yang berhak membatalkan transaksi." };
    }

    // 1. Fetch sale and items
    interface SaleWithItems {
      id: string;
      umkm_id: string;
      status: string;
      sale_items: Array<{ product_id: string | null; qty: number; product_name: string }>;
    }
    const { data: saleData, error: fetchErr } = await supabase
      .from("sales")
      .select(`
        id,
        umkm_id,
        status,
        sale_items(product_id, qty, product_name)
      `)
      .eq("id", saleId)
      .single();

    const sale = saleData as unknown as SaleWithItems | null;

    if (fetchErr || !sale) {
      return { success: false, error: "Transaksi tidak ditemukan." };
    }

    if (sale.status === "void") {
      return { success: false, error: "Transaksi ini sudah dibatalkan sebelumnya." };
    }

    // 2. Mark sale as void
    const { error: voidErr } = await supabase
      .from("sales")
      .update({
        status: "void",
        note: reason ? `[Dibatalkan]: ${reason}` : "[Dibatalkan oleh pemilik]",
      })
      .eq("id", saleId);

    if (voidErr) throw voidErr;

    // 3. Compensate stock back via stock_movements (type = 'sale_void')
    const voidMovements = (sale.sale_items || [])
      .filter((item): item is { product_id: string; qty: number; product_name: string } => Boolean(item.product_id))
      .map((item) => ({
        umkm_id: profile.umkm_id,
        product_id: item.product_id,
        type: "sale_void",
        qty: Math.abs(Number(item.qty)), // Positive value to restore stock
        sale_id: saleId,
        note: `Pengembalian stok dari pembatalan transaksi (${item.product_name})`,
        created_by: user.id,
      }));

    if (voidMovements.length > 0) {
      const { error: moveErr } = await supabase.from("stock_movements").insert(voidMovements);
      if (moveErr) throw moveErr;
    }

    revalidatePath("/penjualan");
    revalidatePath("/stok");
    revalidatePath("/laporan");
    return { success: true };
  } catch (err: unknown) {
    console.error("voidSaleAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Gagal membatalkan transaksi" };
  }
}
