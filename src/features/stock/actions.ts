"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { stockAdjustmentSchema, type StockAdjustmentInput } from "./schemas";

export interface StockMovementRecord {
  id: string;
  umkm_id: string;
  product_id: string;
  product_name?: string;
  type: "initial" | "purchase" | "sale" | "sale_void" | "adjustment";
  qty: number;
  note?: string | null;
  created_by_name?: string | null;
  created_at: string;
}

/**
 * Record a manual stock adjustment or purchase
 */
export async function adjustStockAction(input: StockAdjustmentInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const validated = stockAdjustmentSchema.parse(input);
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
      return { success: false, error: "Hanya pemilik UMKM yang berhak melakukan penyesuaian stok." };
    }

    // Verify product exists and has track_stock enabled
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("track_stock")
      .eq("id", validated.product_id)
      .single();

    if (prodErr || !product) {
      return { success: false, error: "Produk tidak ditemukan." };
    }

    if (!product.track_stock) {
      return { success: false, error: "Pelacakan stok dinonaktifkan untuk produk ini." };
    }

    const { error: insertErr } = await supabase.from("stock_movements").insert({
      umkm_id: profile.umkm_id,
      product_id: validated.product_id,
      type: validated.type,
      qty: validated.qty,
      note: validated.note,
      created_by: user.id,
    });

    if (insertErr) throw insertErr;

    revalidatePath("/stok");
    revalidatePath("/produk");
    revalidatePath("/kasir");
    return { success: true };
  } catch (err: unknown) {
    console.error("adjustStockAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Gagal mencatat perubahan stok" };
  }
}

/**
 * Get recent stock movement history
 */
export async function getStockMovementsAction(productId?: string): Promise<{
  success: boolean;
  movements: StockMovementRecord[];
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    let query = supabase
      .from("stock_movements")
      .select(`
        id,
        umkm_id,
        product_id,
        type,
        qty,
        note,
        created_at,
        products(name),
        profiles(full_name)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;
    if (error) throw error;

    interface RawStockMovementRow {
      id: string;
      umkm_id: string;
      product_id: string;
      type: "initial" | "purchase" | "adjustment" | "sale" | "sale_void";
      qty: number;
      note?: string | null;
      created_at: string;
      products?: { name: string | null } | null;
      profiles?: { full_name: string | null } | null;
    }

    const movements: StockMovementRecord[] = ((data as unknown as RawStockMovementRow[]) || []).map((m) => ({
      id: m.id,
      umkm_id: m.umkm_id,
      product_id: m.product_id,
      product_name: m.products?.name || "Produk",
      type: m.type,
      qty: Number(m.qty),
      note: m.note,
      created_by_name: m.profiles?.full_name || "Petugas",
      created_at: m.created_at,
    }));

    return { success: true, movements };
  } catch (err: unknown) {
    return { success: false, movements: [], error: err instanceof Error ? err.message : "Gagal memuat riwayat stok" };
  }
}
