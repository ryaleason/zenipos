import { z } from "zod";

export const createUmkmSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama UMKM minimal 2 karakter"),
  owner_name: z
    .string()
    .trim()
    .min(2, "Nama pemilik minimal 2 karakter"),
  phone: z
    .string()
    .trim()
    .min(9, "Nomor telepon minimal 9 karakter"),
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  initial_password: z
    .string()
    .min(8, "Password awal minimal 8 karakter"),
  address: z
    .string()
    .trim()
    .optional(),
});

export type CreateUmkmInput = z.infer<typeof createUmkmSchema>;

export const extendSubscriptionSchema = z.object({
  umkm_id: z
    .string()
    .uuid("ID UMKM tidak valid"),
});

export type ExtendSubscriptionInput = z.infer<typeof extendSubscriptionSchema>;

export const toggleStatusSchema = z.object({
  umkm_id: z
    .string()
    .uuid("ID UMKM tidak valid"),
  status: z.enum(["active", "inactive"], {
    message: "Status harus active atau inactive",
  }),
});

export type ToggleStatusInput = z.infer<typeof toggleStatusSchema>;

export const resetPasswordSchema = z.object({
  profile_id: z
    .string()
    .uuid("ID profil tidak valid"),
  new_password: z
    .string()
    .min(8, "Password baru minimal 8 karakter"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
