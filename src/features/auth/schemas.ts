import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    passwordBaru: z
      .string()
      .min(8, "Password baru minimal 8 karakter"),
    konfirmasiPasswordBaru: z
      .string()
      .min(8, "Konfirmasi password minimal 8 karakter"),
  })
  .refine((data) => data.passwordBaru === data.konfirmasiPasswordBaru, {
    message: "Konfirmasi password tidak cocok",
    path: ["konfirmasiPasswordBaru"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
