"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, changePasswordSchema } from "./schemas";
import type { AuthActionResult, UserProfile } from "./types";

function mapSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email atau password salah.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email belum dikonfirmasi.";
  }
  if (lower.includes("user not found")) {
    return "Pengguna tidak ditemukan.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat.";
  }
  if (lower.includes("password should be at least")) {
    return "Password minimal 6 karakter.";
  }
  if (lower.includes("same_password") || lower.includes("should be different")) {
    return "Password baru tidak boleh sama dengan password lama.";
  }
  return message;
}

export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const email = (formData.get("email")?.toString() || "").trim();
    const password = formData.get("password")?.toString() || "";

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() || "form";
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Input tidak valid",
        fieldErrors,
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error ? mapSupabaseAuthError(error.message) : "Gagal masuk.",
      };
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, umkm_id, role, full_name, must_change_password, is_active")
      .eq("id", data.user.id)
      .single<UserProfile>();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: "Profil pengguna tidak ditemukan di sistem. Hubungi admin.",
      };
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: "Akun Anda dinonaktifkan. Silakan hubungi admin ZeniPOS.",
      };
    }

    let destination = "/dashboard";
    if (profile.must_change_password) {
      destination = "/ganti-password";
    } else if (profile.role === "admin") {
      destination = "/admin";
    }

    redirect(destination);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("loginAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan internal server saat mencoba masuk.",
    };
  }
}

export async function changePasswordAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const passwordBaru = formData.get("passwordBaru")?.toString() || "";
    const konfirmasiPasswordBaru =
      formData.get("konfirmasiPasswordBaru")?.toString() || "";

    const parsed = changePasswordSchema.safeParse({
      passwordBaru,
      konfirmasiPasswordBaru,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() || "form";
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Input tidak valid",
        fieldErrors,
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      redirect("/login");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.passwordBaru,
    });

    if (updateError) {
      return {
        success: false,
        error: mapSupabaseAuthError(updateError.message),
      };
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);

    if (profileError) {
      return {
        success: false,
        error: "Gagal memperbarui status keamanan akun.",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single<Pick<UserProfile, "role">>();

    const destination = profile?.role === "admin" ? "/admin" : "/dashboard";
    redirect(destination);
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("changePasswordAction error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan internal server saat mengubah password.",
    };
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
