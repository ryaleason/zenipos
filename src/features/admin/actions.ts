"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createUmkmSchema,
  extendSubscriptionSchema,
  toggleStatusSchema,
  resetPasswordSchema,
} from "./schemas";
import type {
  AdminActionResult,
  AdminSummaryData,
  AdminUmkmItem,
} from "./types";

/**
 * Ensures caller is logged in and has 'admin' role
 */
async function assertAdminRole() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Sesi tidak valid atau telah berakhir. Silakan masuk kembali.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin" || !profile.is_active) {
    throw new Error("Akses ditolak: Hanya admin yang berhak melakukan tindakan ini.");
  }

  return { user, profile };
}

/**
 * Creates a new UMKM and provisions the owner Auth user & profile
 */
export async function createUmkmAction(
  input: unknown
): Promise<AdminActionResult<{ umkm_id: string; email: string }>> {
  try {
    await assertAdminRole();

    const rawData =
      input instanceof FormData
        ? {
            name: input.get("name")?.toString() || "",
            owner_name: input.get("owner_name")?.toString() || "",
            phone: input.get("phone")?.toString() || "",
            email: input.get("email")?.toString() || "",
            initial_password: input.get("initial_password")?.toString() || "",
            address: input.get("address")?.toString() || undefined,
          }
        : input;

    const parsed = createUmkmSchema.safeParse(rawData);
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

    const adminClient = createAdminClient();

    // Calculate initial 3-month subscription cycle
    const activeUntilDate = new Date();
    activeUntilDate.setMonth(activeUntilDate.getMonth() + 3);
    const activeUntilStr = activeUntilDate.toISOString().split("T")[0];

    // 1. Insert UMKM
    const { data: umkm, error: umkmError } = await adminClient
      .from("umkm")
      .insert({
        name: parsed.data.name.trim(),
        owner_name: parsed.data.owner_name.trim(),
        phone: parsed.data.phone.trim(),
        address: parsed.data.address?.trim() || null,
        status: "active",
        active_until: activeUntilStr,
      })
      .select("id")
      .single();

    if (umkmError || !umkm) {
      return {
        success: false,
        error: "Gagal menyimpan data UMKM: " + (umkmError?.message || "Kesalahan database"),
      };
    }

    // 2. Create Auth user
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: parsed.data.email.trim(),
        password: parsed.data.initial_password,
        email_confirm: true,
        user_metadata: {
          full_name: parsed.data.owner_name.trim(),
          role: "owner",
        },
      });

    if (authError || !authData.user) {
      // Rollback UMKM
      await adminClient.from("umkm").delete().eq("id", umkm.id);

      const isEmailTaken =
        authError?.message.toLowerCase().includes("already registered") ||
        authError?.message.toLowerCase().includes("user already exists");

      return {
        success: false,
        error: isEmailTaken
          ? "Email sudah terdaftar pada pengguna lain. Gunakan email berbeda."
          : `Gagal membuat akun autentikasi: ${authError?.message || "Kesalahan auth"}`,
      };
    }

    // 3. Create owner profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: authData.user.id,
      umkm_id: umkm.id,
      role: "owner",
      full_name: parsed.data.owner_name.trim(),
      must_change_password: true,
      is_active: true,
    });

    if (profileError) {
      // Rollback auth user & UMKM
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from("umkm").delete().eq("id", umkm.id);

      return {
        success: false,
        error: "Gagal menginisialisasi profil pemilik: " + profileError.message,
      };
    }

    revalidatePath("/admin");

    return {
      success: true,
      data: {
        umkm_id: umkm.id,
        email: parsed.data.email.trim(),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return { success: false, error: message };
  }
}

/**
 * Extends UMKM subscription by 3 months: GREATEST(active_until, current_date) + interval '3 months'
 */
export async function extendSubscriptionAction(
  input: unknown
): Promise<AdminActionResult<{ active_until: string }>> {
  try {
    await assertAdminRole();

    const rawData =
      input instanceof FormData
        ? { umkm_id: input.get("umkm_id")?.toString() || "" }
        : input;

    const parsed = extendSubscriptionSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "ID UMKM tidak valid",
      };
    }

    const adminClient = createAdminClient();

    // Fetch current active_until
    const { data: umkm, error: fetchError } = await adminClient
      .from("umkm")
      .select("id, active_until")
      .eq("id", parsed.data.umkm_id)
      .single();

    if (fetchError || !umkm) {
      return { success: false, error: "Data UMKM tidak ditemukan." };
    }

    // GREATEST(active_until, current_date) + 3 months
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentActive = new Date(umkm.active_until);
    currentActive.setHours(0, 0, 0, 0);

    const baseDate = currentActive > today ? currentActive : today;
    const newActiveDate = new Date(baseDate);
    newActiveDate.setMonth(newActiveDate.getMonth() + 3);
    const newActiveUntilStr = newActiveDate.toISOString().split("T")[0];

    // Update UMKM status to active and new date
    const { error: updateError } = await adminClient
      .from("umkm")
      .update({
        active_until: newActiveUntilStr,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", umkm.id);

    if (updateError) {
      return {
        success: false,
        error: "Gagal memperpanjang masa aktif: " + updateError.message,
      };
    }

    // Reactivate profiles if previously deactivated
    await adminClient
      .from("profiles")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("umkm_id", umkm.id);

    revalidatePath("/admin");

    return {
      success: true,
      data: { active_until: newActiveUntilStr },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return { success: false, error: message };
  }
}

/**
 * Toggles UMKM status between active and inactive
 */
export async function toggleUmkmStatusAction(
  input: unknown
): Promise<AdminActionResult<{ status: "active" | "inactive" }>> {
  try {
    await assertAdminRole();

    const rawData =
      input instanceof FormData
        ? {
            umkm_id: input.get("umkm_id")?.toString() || "",
            status: input.get("status")?.toString() || "",
          }
        : input;

    const parsed = toggleStatusSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Input status tidak valid",
      };
    }

    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from("umkm")
      .update({
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.umkm_id);

    if (updateError) {
      return {
        success: false,
        error: "Gagal memperbarui status UMKM: " + updateError.message,
      };
    }

    // Keep profile is_active in sync with UMKM status
    await adminClient
      .from("profiles")
      .update({
        is_active: parsed.data.status === "active",
        updated_at: new Date().toISOString(),
      })
      .eq("umkm_id", parsed.data.umkm_id);

    revalidatePath("/admin");

    return {
      success: true,
      data: { status: parsed.data.status },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return { success: false, error: message };
  }
}

/**
 * Resets owner auth password and flags must_change_password = true
 */
export async function resetOwnerPasswordAction(
  input: unknown
): Promise<AdminActionResult> {
  try {
    await assertAdminRole();

    const rawData =
      input instanceof FormData
        ? {
            profile_id: input.get("profile_id")?.toString() || "",
            new_password: input.get("new_password")?.toString() || "",
          }
        : input;

    const parsed = resetPasswordSchema.safeParse(rawData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Input reset password tidak valid",
      };
    }

    const adminClient = createAdminClient();

    // 1. Update Auth password
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      parsed.data.profile_id,
      { password: parsed.data.new_password }
    );

    if (authError) {
      return {
        success: false,
        error: "Gagal mereset kata sandi: " + authError.message,
      };
    }

    // 2. Set must_change_password = true in profiles
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.profile_id);

    if (profileError) {
      return {
        success: false,
        error:
          "Password berhasil diganti namun gagal menyetel status wajib ubah password: " +
          profileError.message,
      };
    }

    revalidatePath("/admin");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return { success: false, error: message };
  }
}

/**
 * Loads aggregate summary and list of UMKM from admin_umkm_summary view
 */
export async function getAdminSummaryData(): Promise<AdminSummaryData> {
  await assertAdminRole();
  const adminClient = createAdminClient();

  const { data: summaryRows, error: summaryError } = await adminClient
    .from("admin_umkm_summary")
    .select("*")
    .order("created_at", { ascending: false });

  if (summaryError) {
    console.error("Error loading admin_umkm_summary:", summaryError);
    return {
      stats: { totalUmkm: 0, activeUmkm: 0, expiringSoonUmkm: 0, expiredUmkm: 0 },
      umkmList: [],
    };
  }

  // Get owner profiles
  const { data: ownerProfiles } = await adminClient
    .from("profiles")
    .select("id, umkm_id")
    .eq("role", "owner");

  const ownerProfileMap = new Map<string, string>();
  if (ownerProfiles) {
    for (const p of ownerProfiles) {
      if (p.umkm_id) {
        ownerProfileMap.set(p.umkm_id, p.id);
      }
    }
  }

  // Get auth user emails for owners
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const userEmailMap = new Map<string, string>();
  if (usersData?.users) {
    for (const u of usersData.users) {
      if (u.email) {
        userEmailMap.set(u.id, u.email);
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let activeCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;

  const umkmList: AdminUmkmItem[] = (summaryRows || []).map((row) => {
    const activeUntilDate = new Date(row.active_until);
    activeUntilDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (activeUntilDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isExpired = Boolean(row.is_expired) || diffDays < 0;
    const isExpiringSoon = !isExpired && row.status === "active" && diffDays <= 7;
    const isActive = row.status === "active" && !isExpired;

    if (isActive) activeCount++;
    if (isExpiringSoon) expiringSoonCount++;
    if (isExpired || row.status === "inactive") expiredCount++;

    const ownerProfileId = ownerProfileMap.get(row.umkm_id);
    const ownerEmail = ownerProfileId ? userEmailMap.get(ownerProfileId) : undefined;

    return {
      umkm_id: row.umkm_id,
      umkm_name: row.umkm_name,
      owner_name: row.owner_name,
      phone: row.phone,
      address: row.address,
      status: row.status as "active" | "inactive",
      active_until: row.active_until,
      is_expired: isExpired,
      total_products: Number(row.total_products || 0),
      total_sales_count: Number(row.total_sales_count || 0),
      total_sales_amount: Number(row.total_sales_amount || 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
      owner_profile_id: ownerProfileId,
      owner_email: ownerEmail,
      days_remaining: diffDays,
    };
  });

  return {
    stats: {
      totalUmkm: umkmList.length,
      activeUmkm: activeCount,
      expiringSoonUmkm: expiringSoonCount,
      expiredUmkm: expiredCount,
    },
    umkmList,
  };
}
