"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { umkmProfileSchema, cashierAccountSchema, type UmkmProfileInput, type CashierAccountInput } from "./schemas";

export interface CashierAccountInfo {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

/**
 * Update UMKM store profile (name, phone, address)
 */
export async function updateUmkmProfileAction(input: UmkmProfileInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const validated = umkmProfileSchema.parse(input);
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

    if (!profile?.umkm_id || profile.role !== "owner") {
      return { success: false, error: "Hanya pemilik toko yang dapat mengubah data usaha." };
    }

    const { error } = await supabase
      .from("umkm")
      .update({
        name: validated.name,
        phone: validated.phone,
        address: validated.address || null,
      })
      .eq("id", profile.umkm_id);

    if (error) throw error;

    revalidatePath("/pengaturan");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    console.error("updateUmkmProfileAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Gagal memperbarui profil usaha" };
  }
}

/**
 * Get the cashier account for this UMKM (max 1 cashier per UMKM)
 */
export async function getCashierAccountAction(): Promise<{
  success: boolean;
  cashier?: CashierAccountInfo | null;
  error?: string;
}> {
  try {
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

    if (!profile?.umkm_id || profile.role !== "owner") {
      return { success: false, error: "Akses ditolak." };
    }

    const { data: cashierProfile } = await supabase
      .from("profiles")
      .select("id, full_name, is_active, must_change_password, created_at")
      .eq("umkm_id", profile.umkm_id)
      .eq("role", "cashier")
      .maybeSingle();

    if (!cashierProfile) {
      return { success: true, cashier: null };
    }

    // Read email using admin client
    let email = "kasir@zenipos.id";
    try {
      const adminClient = createAdminClient();
      const { data: authUser } = await adminClient.auth.admin.getUserById(cashierProfile.id);
      if (authUser?.user?.email) {
        email = authUser.user.email;
      }
    } catch {
      // Fallback if admin key is pending
    }

    return {
      success: true,
      cashier: {
        id: cashierProfile.id,
        fullName: cashierProfile.full_name,
        email,
        isActive: cashierProfile.is_active,
        mustChangePassword: cashierProfile.must_change_password,
        createdAt: cashierProfile.created_at,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal memuat akun kasir" };
  }
}

/**
 * Create or reset the single cashier account for the UMKM
 */
export async function createOrResetCashierAction(input: CashierAccountInput): Promise<{
  success: boolean;
  cashierId?: string;
  defaultPassword?: string;
  error?: string;
}> {
  try {
    const validated = cashierAccountSchema.parse(input);
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

    if (!profile?.umkm_id || profile.role !== "owner") {
      return { success: false, error: "Hanya pemilik yang berhak mengelola akun kasir." };
    }

    const adminClient = createAdminClient();
    const actualPassword = validated.password || `ZeniKasir_${Math.random().toString(36).slice(2, 8)}!`;

    // Check if cashier already exists
    const { data: existingCashier } = await supabase
      .from("profiles")
      .select("id")
      .eq("umkm_id", profile.umkm_id)
      .eq("role", "cashier")
      .maybeSingle();

    let targetCashierId = "";

    if (existingCashier) {
      targetCashierId = existingCashier.id;
      // Update existing cashier password and name
      const { error: authErr } = await adminClient.auth.admin.updateUserById(existingCashier.id, {
        email: validated.email,
        password: actualPassword,
      });

      if (authErr) throw authErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: validated.fullName,
          must_change_password: true,
          is_active: true,
        })
        .eq("id", existingCashier.id);

      if (profErr) throw profErr;
    } else {
      // Create new cashier
      const { data: newAuth, error: createErr } = await adminClient.auth.admin.createUser({
        email: validated.email,
        password: actualPassword,
        email_confirm: true,
      });

      if (createErr || !newAuth.user) {
        throw createErr || new Error("Gagal membuat akun autentikasi kasir");
      }

      targetCashierId = newAuth.user.id;

      const { error: profErr } = await supabase.from("profiles").insert({
        id: newAuth.user.id,
        umkm_id: profile.umkm_id,
        role: "cashier",
        full_name: validated.fullName,
        must_change_password: true,
        is_active: true,
      });

      if (profErr) {
        // Rollback
        await adminClient.auth.admin.deleteUser(newAuth.user.id);
        throw profErr;
      }
    }

    revalidatePath("/pengaturan");
    return {
      success: true,
      cashierId: targetCashierId,
      defaultPassword: actualPassword,
    };
  } catch (err: unknown) {
    console.error("createOrResetCashierAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Gagal menyimpan akun kasir" };
  }
}
