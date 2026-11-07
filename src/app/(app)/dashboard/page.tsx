import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import {
  Store,
  Calendar,
  AlertTriangle,
  Clock,
  KeyRound,
  LogOut,
  ShoppingBag,
  Package,
  BarChart3,
  CheckCircle2,
  Phone,
  Sparkles,
} from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { calculateDaysRemaining } from "@/features/admin/utils";

export const metadata: Metadata = {
  title: "Dashboard Pemilik | ZeniPOS",
  description: "Pusat Pengelolaan Akun & Usaha UMKM ZeniPOS",
};

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bg text-text p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-12 w-48 bg-bg-muted rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-44 bg-bg-muted rounded-2xl" />
        <div className="h-44 bg-bg-muted rounded-2xl" />
        <div className="h-44 bg-bg-muted rounded-2xl" />
      </div>
    </div>
  );
}

async function OwnerDashboardContent() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let umkm = null;

  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
        must_change_password,
        umkm_id,
        umkm:umkm_id (*)
      `)
      .eq("id", user.id)
      .single();

    profile = profileData;
    umkm = profileData?.umkm as unknown as {
      name?: string;
      owner_name?: string;
      phone?: string;
      active_until?: string;
      status?: string;
    } | null;
  }

  // Fallback values if accessed in development without live Supabase session
  const businessName = umkm?.name || "Toko Usaha Anda";
  const ownerName = profile?.full_name || umkm?.owner_name || user?.email || "Pemilik UMKM";
  const phone = umkm?.phone || "081234567890";
  const activeUntilDate = umkm?.active_until || "2026-12-31";
  const status = umkm?.status || "active";

  const diffDays = calculateDaysRemaining(activeUntilDate);
  const isExpiringSoon = diffDays <= 7 && diffDays >= 0;
  const isExpired = diffDays < 0 || status === "inactive";

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-bold font-mono text-xl border border-primary/20">
              Z
            </div>
            <div>
              <div className="font-bold text-base leading-tight flex items-center gap-2">
                <span>{businessName}</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/20">
                  Pemilik
                </span>
              </div>
              <p className="text-xs text-text-muted">{ownerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/ganti-password"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-bg-subtle text-text transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-text-muted" />
              <span className="hidden sm:inline">Ganti Password</span>
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-muted hover:bg-red-50 text-text-muted hover:text-danger transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Banner Peringatan jika Masa Aktif <= 7 hari atau Kedaluwarsa */}
        {isExpired ? (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Masa Aktif Langganan Telah Berakhir</h3>
              <p className="text-xs text-red-700 mt-1">
                Layanan pencatatan dinonaktifkan sementara. Silakan hubungi admin via WhatsApp untuk memperpanjang langganan 3 bulan ke depan.
              </p>
            </div>
            <a
              href="https://wa.me/6281234567890?text=Halo%20Admin%20ZeniPOS,%20saya%20ingin%20memperpanjang%20langganan%20usaha%20saya."
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-danger text-white text-xs font-medium hover:bg-red-700 transition-colors shrink-0"
            >
              Hubungi Admin
            </a>
          </div>
        ) : isExpiringSoon ? (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3">
            <Clock className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Pengingat: Masa Aktif Tersisa {diffDays} Hari</h3>
              <p className="text-xs text-amber-700 mt-1">
                Langganan Anda akan berakhir pada {formatDate(activeUntilDate)}. Hubungi admin untuk perpanjangan paket 3 bulan agar operasional tidak terputus.
              </p>
            </div>
            <a
              href="https://wa.me/6281234567890?text=Halo%20Admin%20ZeniPOS,%20saya%20ingin%20memperpanjang%20langganan%20usaha%20saya."
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-accent-amber text-white text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
            >
              Perpanjang Sekarang
            </a>
          </div>
        ) : null}

        {/* Status & Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Profil Usaha */}
          <div className="p-6 rounded-2xl border border-border bg-bg-subtle space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-text-faint tracking-wider">
                Profil Usaha
              </span>
              <Store className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">{businessName}</h2>
              <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-text-faint" />
                <span>{phone}</span>
              </p>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
              <span>Status Akun:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-accent-green">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
              </span>
            </div>
          </div>

          {/* Card Masa Aktif 3 Bulan */}
          <div className="p-6 rounded-2xl border border-border bg-bg-subtle space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-text-faint tracking-wider">
                Paket Langganan
              </span>
              <Calendar className="w-4 h-4 text-accent-green" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-text">
                  {Math.max(0, diffDays)}
                </span>
                <span className="text-xs text-text-muted font-medium">Hari Tersisa</span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Berlaku s/d {formatDate(activeUntilDate)}
              </p>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
              <span>Siklus Langganan:</span>
              <span className="font-semibold text-text">Tiap 3 Bulan</span>
            </div>
          </div>

          {/* Card Keamanan Akun */}
          <div className="p-6 rounded-2xl border border-border bg-bg-subtle space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-text-faint tracking-wider">
                Keamanan & Akses
              </span>
              <KeyRound className="w-4 h-4 text-accent-amber" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text">Kredensial Login</h3>
              <p className="text-xs text-text-muted mt-1">
                Password Anda telah diamankan. Anda dapat mengganti password kapan saja.
              </p>
            </div>
            <div className="pt-2 border-t border-border">
              <Link
                href="/ganti-password"
                className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                Ubah Password Pribadi &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Roadmap Modul Operasional (Akan Aktif di Tahap 2 & 3) */}
        <div className="p-6 rounded-2xl border border-border bg-bg space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-soft text-primary mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fondasi Sistem Siap (Tahap 1 Berhasil)</span>
              </div>
              <h2 className="text-lg font-bold text-text">
                Modul Kasir & Inventori Siap Dihubungkan
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Skema database 8 tabel, isolasi RLS multi-tenant, dan otentikasi telah aktif. Fitur operasional di bawah akan dihubungkan di Tahap 2:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border bg-bg-subtle flex items-start gap-3 opacity-90">
              <div className="w-9 h-9 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Kasir Cepat</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Catat penjualan offline & cetak struk nota digital.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg-subtle flex items-start gap-3 opacity-90">
              <div className="w-9 h-9 rounded-lg bg-green-50 text-accent-green flex items-center justify-center shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Stok & Produk</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Katalog barang, peringatan stok menipis, dan barang masuk.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-bg-subtle flex items-start gap-3 opacity-90">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-accent-amber flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Laporan Laba Rugi</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Rekap omzet harian, belanja modal, dan laba bersih UMKM.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OwnerDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OwnerDashboardContent />
    </Suspense>
  );
}
