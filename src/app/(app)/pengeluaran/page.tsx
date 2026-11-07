import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getExpensesAction } from "@/features/expenses/actions";
import { ExpenseManagement } from "@/features/expenses/components/expense-management";
import { ArrowDownCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Catatan Pengeluaran | ZeniPOS",
  description: "Catat pengeluaran dan biaya operasional usaha UMKM",
};

function ExpenseSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 bg-bg-muted rounded-2xl" />
      <div className="h-96 bg-bg-muted rounded-2xl" />
    </div>
  );
}

async function ExpenseContent() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Golden Rule 8: Cashier cannot see or record expenses
  if (profile?.role !== "owner") {
    redirect("/kasir");
  }

  const res = await getExpensesAction();
  const expenses = res.success ? res.expenses : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <ArrowDownCircle className="w-6 h-6 text-rose-500" />
            Catatan Pengeluaran
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Pencatatan biaya operasional, sewa, gaji, dan kulakan bahan baku toko.
          </p>
        </div>
      </div>

      <ExpenseManagement initialExpenses={expenses} />
    </div>
  );
}

export default function ExpensePage() {
  return (
    <Suspense fallback={<ExpenseSkeleton />}>
      <ExpenseContent />
    </Suspense>
  );
}
