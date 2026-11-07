import { Suspense } from "react";
import { getAdminSummaryData } from "@/features/admin/actions";
import { SummaryCards } from "@/features/admin/components/summary-cards";
import { CreateUmkmModal } from "@/features/admin/components/create-umkm-modal";
import { UmkmTable } from "@/features/admin/components/umkm-table";

function AdminPageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-bg-muted rounded" />
          <div className="h-4 w-80 bg-bg-muted rounded" />
        </div>
        <div className="h-10 w-36 bg-bg-muted rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-bg p-5" />
        ))}
      </div>

      <div className="h-96 rounded-xl border border-border bg-bg" />
    </div>
  );
}

async function AdminPageContent() {
  const { stats, umkmList } = await getAdminSummaryData();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            Manajemen Mitra UMKM
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Kelola siklus langganan 3 bulan, daftarkan mitra baru, dan pantau status toko.
          </p>
        </div>
        <div>
          <CreateUmkmModal />
        </div>
      </div>

      {/* Summary Cards */}
      <section aria-label="Statistik Ringkasan UMKM">
        <SummaryCards stats={stats} />
      </section>

      {/* UMKM Management Table */}
      <section aria-label="Daftar Manajemen UMKM">
        <UmkmTable initialUmkmList={umkmList} />
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <AdminPageContent />
    </Suspense>
  );
}
