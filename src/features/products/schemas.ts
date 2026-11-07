import { z } from "zod";

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter"),
});

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Nama produk minimal 2 karakter"),
  category_id: z.string().uuid().nullable().optional(),
  sell_price: z.coerce.number().int("Harga jual harus bilangan bulat").min(0, "Harga jual minimal Rp 0"),
  cost_price: z.coerce.number().int("Harga modal harus bilangan bulat").min(0, "Harga modal minimal Rp 0").default(0),
  photo_url: z.string().url("URL foto tidak valid").nullable().optional().or(z.literal("")),
  track_stock: z.boolean().default(true),
  min_stock: z.coerce.number().int("Batas minimum stok harus bulat").min(0).default(0),
  initial_stock: z.coerce.number().int().min(0, "Stok awal minimal 0").default(0).optional(),
  is_active: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
