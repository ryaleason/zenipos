import { z } from "zod";

export const umkmProfileSchema = z.object({
  name: z.string().trim().min(2, "Nama toko minimal 2 karakter"),
  phone: z.string().trim().min(9, "Nomor WhatsApp minimal 9 digit"),
  address: z.string().optional().nullable(),
});

export const cashierAccountSchema = z.object({
  fullName: z.string().trim().min(2, "Nama kasir minimal 2 karakter"),
  email: z.string().trim().email("Format email kasir tidak valid"),
  password: z.string().min(8, "Password kasir minimal 8 karakter").optional(),
});

export type UmkmProfileInput = z.infer<typeof umkmProfileSchema>;
export type CashierAccountInput = z.infer<typeof cashierAccountSchema>;
