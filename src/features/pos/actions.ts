"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createSaleSchema, type CreateSaleInput } from "./schemas";

/**
 * Execute atomic sale creation via Supabase RPC `create_sale`
 * This atomically records sales header, line items, and negative stock movements.
 */
export async function createSaleAction(input: CreateSaleInput): Promise<{
  success: boolean;
  saleId?: string;
  invoiceNo?: string;
  error?: string;
}> {
  try {
    const validated = createSaleSchema.parse(input);
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

    if (!profile?.umkm_id) {
      return { success: false, error: "Profil UMKM tidak ditemukan." };
    }

    // Call atomic idempotent RPC function on database
    const { data: saleId, error: rpcError } = await supabase.rpc("create_sale", {
      p_sale_id: validated.id,
      p_umkm_id: profile.umkm_id,
      p_invoice_no: validated.invoice_no,
      p_total: validated.total,
      p_payment_method: validated.payment_method,
      p_paid_amount: validated.paid_amount,
      p_sold_at: validated.sold_at || new Date().toISOString(),
      p_items: validated.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        qty: item.qty,
        sell_price: item.sell_price,
        cost_price: item.cost_price || 0,
        subtotal: item.subtotal,
      })),
    });

    if (rpcError) {
      // Check if rejection was due to subscription expiration
      if (rpcError.message.includes("Langganan UMKM tidak aktif") || rpcError.message.includes("kedaluwarsa")) {
        return {
          success: false,
          error: "Transaksi ditolak: Masa aktif langganan UMKM telah berakhir. Hubungi admin untuk perpanjang.",
        };
      }
      throw rpcError;
    }

    revalidatePath("/penjualan");
    revalidatePath("/stok");
    revalidatePath("/laporan");
    revalidatePath("/kasir");

    return {
      success: true,
      saleId: (saleId as string) || validated.id,
      invoiceNo: validated.invoice_no,
    };
  } catch (err: unknown) {
    console.error("createSaleAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Gagal mencatat transaksi penjualan" };
  }
}
