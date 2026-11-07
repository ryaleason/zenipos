import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { logoutAction } from "@/features/auth/actions";
import { LogOut } from "lucide-react";

export const metadata: Metadata = {
  title: "Admin Panel | ZeniPOS",
  description: "Panel Pengelolaan Mitra UMKM & Langganan ZeniPOS",
};

function AdminHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold font-mono text-xl shadow-xs">
            Z
          </div>
          <div className="space-y-1">
            <div className="h-4 w-28 bg-bg-muted rounded" />
            <div className="h-3 w-20 bg-bg-muted rounded" />
          </div>
        </div>
      </div>
    </header>
  );
}

async function AdminHeader() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    if (profile.role === "cashier") {
      redirect("/kasir");
    }
    redirect("/dashboard");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand as Clickable Button to Landing Page */}
        <Link
          href="/"
          title="Kembali ke Beranda"
          className="flex items-center gap-3 group transition-opacity hover:opacity-85"
        >
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold font-mono text-xl shadow-xs group-hover:scale-105 transition-transform">
            Z
          </div>
          <div>
            <div className="font-bold text-base leading-tight flex items-center gap-2">
              <span className="text-text group-hover:text-primary transition-colors">ZeniPOS</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/20">
                Admin Panel
              </span>
            </div>
            <p className="text-xs text-text-muted">{profile.fullName || profile.email}</p>
          </div>
        </Link>

        {/* Right side: Logout only */}
        <div className="flex items-center gap-3">
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
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-subtle text-text flex flex-col">
      <Suspense fallback={<AdminHeaderSkeleton />}>
        <AdminHeader />
      </Suspense>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
