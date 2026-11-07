"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { expenseSchema, type ExpenseInput } from "./schemas";

export interface ExpenseRecord {
  id: string;
  umkm_id: string;
  category: string;
  amount: number;
  note: string;
  spent_at: string;
  created_by_name?: string | null;
  created_at: string;
}

/**
 * Get expenses list (Owner only per PRD & AGENTS.md Golden Rule 8)
 */
export async function getExpensesAction(options?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}): Promise<{
  success: boolean;
  expenses: ExpenseRecord[];
  totalAmount: number;
  error?: string;
}> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile?.umkmId || profile.role !== "owner") {
      return { success: false, expenses: [], totalAmount: 0, error: "Akses ditolak: Hanya pemilik yang dapat melihat pengeluaran." };
    }

    const supabase = await createServerClient();

    let query = supabase
      .from("expenses")
      .select(`
        id,
        umkm_id,
        category,
        amount,
        note,
        spent_at,
        created_at,
        profiles(full_name)
      `)
      .order("spent_at", { ascending: false });

    if (options?.startDate) {
      query = query.gte("spent_at", options.startDate);
    }

    if (options?.endDate) {
      query = query.lte("spent_at", options.endDate);
    }

    if (options?.category && options.category !== "all") {
      query = query.eq("category", options.category);
    }

    const { data, error } = await query;
    if (error) throw error;

    let totalAmount = 0;
    interface RawExpenseRow {
      id: string;
      umkm_id: string;
      category: string;
      amount: number;
      note: string;
      spent_at: string;
      created_at: string;
      profiles?: { full_name: string | null } | null;
    }
    const expenses: ExpenseRecord[] = ((data as unknown as RawExpenseRow[]) || []).map((e) => {
      const amt = Number(e.amount);
      totalAmount += amt;
      return {
        id: e.id,
        umkm_id: e.umkm_id,
        category: e.category,
        amount: amt,
        note: e.note,
        spent_at: e.spent_at,
        created_by_name: e.profiles?.full_name || "Pemilik",
        created_at: e.created_at,
      };
    });

    return { success: true, expenses, totalAmount };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "digest" in err) {
      throw err;
    }
    console.error("getExpensesAction error:", err);
    return { success: false, expenses: [], totalAmount: 0, error: err instanceof Error ? err.message : "Gagal memuat pengeluaran" };
  }
}

/**
 * Record a new business expense (Owner only)
 */
export async function createExpenseAction(input: ExpenseInput): Promise<{
  success: boolean;
  expense?: ExpenseRecord;
  error?: string;
}> {
  try {
    const validated = expenseSchema.parse(input);
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Silakan login terlebih dahulu." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("umkm_id, role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.umkm_id || profile.role !== "owner") {
      return { success: false, error: "Hanya pemilik yang berhak mencatat pengeluaran." };
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("expenses")
      .insert({
        umkm_id: profile.umkm_id,
        category: validated.category,
        amount: validated.amount,
        note: validated.note,
        spent_at: validated.spent_at,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    revalidatePath("/pengeluaran");
    revalidatePath("/laporan");
    return {
      success: true,
      expense: {
        id: inserted.id,
        umkm_id: inserted.umkm_id,
        category: inserted.category,
        amount: Number(inserted.amount),
        note: inserted.note,
        spent_at: inserted.spent_at,
        created_by_name: profile.full_name || "Pemilik",
        created_at: inserted.created_at,
      },
    };
  } catch (err: unknown) {
    console.error("createExpenseAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Gagal menyimpan pengeluaran" };
  }
}

/**
 * Delete an expense record
 */
export async function deleteExpenseAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;

    revalidatePath("/pengeluaran");
    revalidatePath("/laporan");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal menghapus pengeluaran" };
  }
}
