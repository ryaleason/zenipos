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
    const { data: createdSale, error: rpcError } = await supabase.rpc("create_sale", {
      p_id: validated.id,
      p_invoice_no: validated.invoice_no,
      p_total: validated.total,
      p_payment_method: validated.payment_method,
      p_paid_amount: validated.paid_amount,
      p_sold_at: validated.sold_at || new Date().toISOString(),
      p_note: validated.note || null,
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
      console.error("create_sale RPC error:", rpcError);
      if (
        rpcError.message.includes("Langganan UMKM tidak aktif") ||
        rpcError.message.includes("kedaluwarsa")
      ) {
        return {
          success: false,
          error: "Transaksi ditolak: Masa aktif langganan UMKM telah berakhir. Hubungi admin untuk perpanjang.",
        };
      }
      return {
        success: false,
        error: rpcError.message || "Gagal mencatat transaksi penjualan",
      };
    }

    revalidatePath("/penjualan");
    revalidatePath("/stok");
    revalidatePath("/laporan");
    revalidatePath("/kasir");

    const saleRecord = createdSale as { id?: string } | null;

    return {
      success: true,
      saleId: saleRecord?.id || validated.id,
      invoiceNo: validated.invoice_no,
    };
  } catch (err: unknown) {
    console.error("createSaleAction error:", err);
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : "Gagal mencatat transaksi penjualan";
    return { success: false, error: msg };
  }
}
