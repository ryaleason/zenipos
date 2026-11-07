import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { formatRupiah, formatDate } from "@/lib/format";
import { calculateDaysRemaining } from "@/features/admin/utils";
import {
  Store,
  Calendar,
  AlertTriangle,
  Clock,
  KeyRound,
  ShoppingBag,
  History,
  Package,
  Layers,
  BarChart3,
  ArrowDownCircle,
  Settings,
  ArrowRight,
  TrendingUp,
  Receipt,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard Pemilik | ZeniPOS",
  description: "Pusat Pengelolaan Akun & Usaha UMKM ZeniPOS",
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 bg-bg-muted rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="h-40 bg-bg-muted rounded-2xl" />
        <div className="h-40 bg-bg-muted rounded-2xl" />
        <div className="h-40 bg-bg-muted rounded-2xl" />
      </div>
      <div className="h-64 bg-bg-muted rounded-2xl" />
    </div>
  );
}

async function OwnerDashboardContent() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  if (profile.role === "cashier") {
    redirect("/kasir");
  }

  if (!profile.umkmId) {
    return (
      <div className="p-8 text-center bg-bg rounded-2xl border border-border space-y-3">
        <AlertTriangle className="w-10 h-10 text-accent-amber mx-auto" />
        <h2 className="text-lg font-bold text-text">Data Usaha Belum Terhubung</h2>
        <p className="text-sm text-text-muted">
          Akun Anda belum ditautkan ke data UMKM mana pun. Silakan hubungi admin ZeniPOS.
        </p>
      </div>
    );
  }

  const supabase = await createServerClient();

  // Fetch real UMKM details
  const { data: umkm } = await supabase
    .from("umkm")
    .select("name, owner_name, phone, address, status, active_until")
    .eq("id", profile.umkmId)
    .single();

  const businessName = umkm?.name || profile.umkmName || "Usaha Anda";
  const ownerName = umkm?.owner_name || profile.fullName || "Pemilik UMKM";
  const phone = umkm?.phone || "-";
  const address = umkm?.address || "-";
  const activeUntilDate = umkm?.active_until || new Date().toISOString();
  const status = umkm?.status || "active";

  const diffDays = calculateDaysRemaining(activeUntilDate);
  const isExpiringSoon = diffDays <= 7 && diffDays >= 0;
  const isExpired = diffDays < 0 || status === "inactive";

  // Today ISO start range for daily operational metrics
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [salesRes, productsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("total, status")
      .eq("umkm_id", profile.umkmId)
      .eq("status", "completed")
      .gte("sold_at", todayStart.toISOString()),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("umkm_id", profile.umkmId)
      .eq("is_active", true),
  ]);

  const todaySales = salesRes.data || [];
  const todayRevenue = todaySales.reduce((acc, s) => acc + (s.total || 0), 0);
  const todayTransactionCount = todaySales.length;
  const activeProductCount = productsRes.count || 0;

  const quickModules = [
    {
      title: "Kasir Penjualan",
      description: "Catat transaksi langsung, cetak struk thermal, & bagikan ke WhatsApp",
      href: "/kasir",
      icon: ShoppingBag,
      color: "bg-primary-soft text-primary border-primary/20",
    },
    {
      title: "Riwayat Penjualan",
      description: "Pantau daftar transaksi masuk, filter status, atau batalkan (void)",
      href: "/penjualan",
      icon: History,
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      title: "Katalog Produk",
      description: "Kelola harga jual, harga modal, kategori, dan toggle status aktif",
      href: "/produk",
      icon: Package,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    {
      title: "Manajemen Stok",
      description: "Pantau stok opname fisik, barang masuk, dan kartu pergerakan stok",
      href: "/stok",
      icon: Layers,
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    },
    {
      title: "Pengeluaran Operasional",
      description: "Pencatatan belanja modal, sewa, listrik, dan biaya usaha lainnya",
      href: "/pengeluaran",
      icon: ArrowDownCircle,
      color: "bg-rose-50 text-rose-600 border-rose-200",
    },
    {
      title: "Laporan Laba Rugi",
      description: "Rekapitulasi omzet bersih, HPP, pengeluaran, laba kotor & laba bersih",
      href: "/laporan",
      icon: BarChart3,
      color: "bg-amber-50 text-amber-600 border-amber-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {businessName}
            </h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/20">
              Pemilik
            </span>
          </div>
          <p className="text-sm text-text-muted">
            Selamat datang kembali, <span className="font-medium text-text">{ownerName}</span>. Berikut ringkasan operasional toko Anda hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pengaturan"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border bg-bg hover:bg-bg-subtle text-text transition-colors shadow-xs"
          >
            <Settings className="w-4 h-4 text-text-muted" />
            <span>Pengaturan Toko</span>
          </Link>
          <Link
            href="/kasir"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary-hover text-on-primary transition-colors shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buka Kasir</span>
          </Link>
        </div>
      </div>

      {/* Banner Peringatan jika Masa Aktif <= 7 hari atau Kedaluwarsa */}
      {isExpired ? (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Masa Aktif Langganan Telah Berakhir</h3>
            <p className="text-xs text-red-700 mt-1">
              Layanan pencatatan transaksi baru dinonaktifkan sementara. Silakan hubungi admin via WhatsApp untuk memperpanjang langganan 3 bulan ke depan.
            </p>
          </div>
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin%20ZeniPOS,%20saya%20ingin%20memperpanjang%20langganan%20usaha%20saya."
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg bg-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0"
          >
            Hubungi Admin
          </a>
        </div>
      ) : isExpiringSoon ? (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3">
          <Clock className="w-5 h-5 text-accent-amber shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Peringatan: Masa Aktif Tersisa {diffDays} Hari</h3>
            <p className="text-xs text-amber-700 mt-1">
              Masa aktif toko Anda akan berakhir pada {formatDate(activeUntilDate)}. Hubungi admin untuk perpanjangan paket agar operasional tidak terputus.
            </p>
          </div>
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin%20ZeniPOS,%20saya%20ingin%20memperpanjang%20langganan%20usaha%20saya."
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-accent-amber text-white text-xs font-semibold hover:bg-amber-600 transition-colors shrink-0"
          >
            Perpanjang
          </a>
        </div>
      ) : null}

      {/* Ringkasan Operasional Hari Ini */}
      <section aria-label="Ringkasan Operasional Hari Ini">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-border bg-bg shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-text-faint tracking-wider">
              <span>Omzet Penjualan Hari Ini</span>
              <TrendingUp className="w-4 h-4 text-accent-green" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-text">
              {formatRupiah(todayRevenue)}
            </div>
            <p className="text-xs text-text-muted">
              Total penerimaan dari transaksi berstatus sukses hari ini.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-bg shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-text-faint tracking-wider">
              <span>Transaksi Hari Ini</span>
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-text">
              {todayTransactionCount} <span className="text-sm font-sans font-normal text-text-muted">nota</span>
            </div>
            <p className="text-xs text-text-muted">
              Jumlah struk nota yang berhasil dicatat kasir hari ini.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-bg shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-text-faint tracking-wider">
              <span>Produk Aktif Terdaftar</span>
              <Package className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-text">
              {activeProductCount} <span className="text-sm font-sans font-normal text-text-muted">barang</span>
            </div>
            <p className="text-xs text-text-muted">
              Produk yang siap dijual pada menu Kasir kasir toko.
            </p>
          </div>
        </div>
      </section>

      {/* Informasi Paket & Akun Usaha */}
      <section aria-label="Informasi Usaha dan Langganan">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-border bg-bg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-text-faint tracking-wider">
                Profil Toko
              </span>
              <Store className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">{businessName}</h2>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Telepon: {phone}<br />
                Alamat: {address}
              </p>
            </div>
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-muted">Status Operasional:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-accent-green">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {status === "active" ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border bg-bg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-text-faint tracking-wider">
                Masa Aktif Layanan
              </span>
              <Calendar className="w-4 h-4 text-accent-green" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-text">
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

          <div className="p-5 rounded-2xl border border-border bg-bg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-text-faint tracking-wider">
                Keamanan Akun
              </span>
              <KeyRound className="w-4 h-4 text-accent-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text">Kredensial Login</h2>
              <p className="text-xs text-text-muted mt-1">
                Ganti kata sandi secara berkala untuk menjaga keamanan data usaha Anda.
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
      </section>

      {/* Navigasi Fitur Operasional Toko */}
      <section aria-label="Menu Operasional Cepat" className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-text">
            Menu Operasional Toko
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Akses langsung seluruh fitur pencatatan dan manajemen ZeniPOS.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickModules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="group p-5 rounded-2xl border border-border bg-bg hover:border-primary/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${m.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-faint group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text group-hover:text-primary transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
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
