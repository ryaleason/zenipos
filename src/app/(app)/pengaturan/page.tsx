import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCashierAccountAction } from "@/features/settings/actions";
import { SettingsDashboard } from "@/features/settings/components/settings-dashboard";
import { Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Pengaturan Usaha & Kasir | ZeniPOS",
  description: "Kelola profil toko UMKM dan akun kasir",
};

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl animate-pulse">
      <div className="h-14 bg-bg-muted rounded-2xl" />
      <div className="h-64 bg-bg-muted rounded-2xl" />
      <div className="h-44 bg-bg-muted rounded-2xl" />
    </div>
  );
}

async function SettingsContent() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, umkm_id")
    .eq("id", user.id)
    .single();

  // Golden Rule 8: Cashier cannot access settings/cashier provisioning
  if (profile?.role !== "owner" || !profile?.umkm_id) {
    redirect("/kasir");
  }

  const { data: umkm } = await supabase
    .from("umkm")
    .select("id, name, phone, address")
    .eq("id", profile.umkm_id)
    .single();

  if (!umkm) {
    redirect("/dashboard");
  }

  const cashierRes = await getCashierAccountAction();
  const cashier = cashierRes.success && cashierRes.cashier ? cashierRes.cashier : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Pengaturan Usaha & Akun Kasir
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Konfigurasi identitas toko Anda dan kelola akun kasir untuk karyawan.
          </p>
        </div>
      </div>

      <SettingsDashboard
        initialUmkm={umkm}
        initialCashier={cashier}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}
