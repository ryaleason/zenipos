import { z } from "zod";

export const saleItemSchema = z.object({
  product_id: z.string().uuid("ID produk tidak valid"),
  product_name: z.string().min(1, "Nama produk wajib ada"),
  qty: z.coerce.number().int().min(1, "Jumlah minimal 1"),
  sell_price: z.coerce.number().int().min(0, "Harga jual minimal 0"),
  cost_price: z.coerce.number().int().min(0).default(0),
  subtotal: z.coerce.number().int().min(0),
});

export const createSaleSchema = z.object({
  id: z.string().uuid("ID transaksi harus berupa UUID"),
  invoice_no: z.string().min(3, "Nomor invoice tidak valid"),
  total: z.coerce.number().int().min(0, "Total penjualan tidak boleh negatif"),
  payment_method: z.enum(["cash", "transfer", "qris"]),
  paid_amount: z.coerce.number().int().min(0, "Uang diterima tidak boleh negatif"),
  note: z.string().nullable().optional(),
  sold_at: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "Keranjang belanja tidak boleh kosong"),
});

export type SaleItemInput = z.infer<typeof saleItemSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
