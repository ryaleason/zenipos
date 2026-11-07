import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid("ID produk tidak valid"),
  type: z.enum(["purchase", "adjustment"]),
  qty: z.coerce.number().int("Jumlah harus berupa angka bulat").refine((val) => val !== 0, {
    message: "Jumlah perubahan stok tidak boleh 0",
  }),
  note: z.string().trim().min(3, "Catatan alasan wajib diisi (misal: barang masuk dari distributor, rusak, stok opname)"),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
