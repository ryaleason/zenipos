import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "Bahan Baku & Kulakan",
  "Gaji Karyawan",
  "Listrik & Air",
  "Sewa Tempat",
  "Operasional & Lainnya",
] as const;

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.string().min(2, "Kategori pengeluaran wajib dipilih"),
  amount: z.coerce.number().int("Nominal harus berupa bilangan bulat").min(100, "Nominal pengeluaran minimal Rp 100"),
  note: z.string().trim().min(2, "Catatan pengeluaran wajib diisi"),
  spent_at: z.string().default(() => new Date().toISOString().split("T")[0]),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
