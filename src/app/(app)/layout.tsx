import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { logoutAction } from "@/features/auth/actions";
import {
  ShoppingBag,
  History,
  Package,
  Layers,
  ArrowDownCircle,
  BarChart3,
  Settings,
  LogOut,
  LayoutDashboard,
  KeyRound,
} from "lucide-react";

function NavSkeleton() {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-bg-subtle shrink-0 min-h-screen p-4 space-y-4 animate-pulse">
      <div className="h-12 bg-bg-muted rounded-xl" />
      <div className="space-y-2 flex-1 pt-4">
        <div className="h-9 bg-bg-muted rounded-xl" />
        <div className="h-9 bg-bg-muted rounded-xl" />
        <div className="h-9 bg-bg-muted rounded-xl" />
        <div className="h-9 bg-bg-muted rounded-xl" />
      </div>
      <div className="h-16 bg-bg-muted rounded-xl" />
    </aside>
  );
}

async function AppNav() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.isActive) {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  if (profile.role === "admin") {
    redirect("/admin");
  }

  if (profile.mustChangePassword) {
    redirect("/ganti-password");
  }

  const isOwner = profile.role === "owner";
  const roleLabel = isOwner ? "Pemilik" : "Kasir";
  const businessName = profile.umkmName;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: true },
    { href: "/kasir", label: "Kasir", icon: ShoppingBag, ownerOnly: false },
    { href: "/penjualan", label: "Penjualan", icon: History, ownerOnly: false },
    { href: "/produk", label: "Produk", icon: Package, ownerOnly: false },
    { href: "/stok", label: "Stok", icon: Layers, ownerOnly: true },
    { href: "/pengeluaran", label: "Pengeluaran", icon: ArrowDownCircle, ownerOnly: true },
    { href: "/laporan", label: "Laporan", icon: BarChart3, ownerOnly: true },
    { href: "/pengaturan", label: "Pengaturan", icon: Settings, ownerOnly: true },
  ].filter((link) => !link.ownerOnly || isOwner);

  return (
    <>
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-bg-subtle shrink-0 min-h-screen">
        <div className="p-5 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary font-mono font-bold text-xl flex items-center justify-center border border-primary/20 shrink-0">
            Z
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-base truncate text-text">{businessName}</h1>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/20">
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-text hover:bg-bg transition-colors"
              >
                <Icon className="w-4 h-4 shrink-0 text-text-faint" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Area */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="text-xs text-text-muted truncate">
            <p className="font-semibold text-text">{profile.fullName || "Pengguna"}</p>
            <p className="text-[11px] text-text-faint truncate">{profile.email}</p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Link
              href="/ganti-password"
              className="flex-1 text-center py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-bg text-text-muted transition-colors"
            >
              Password
            </Link>
            <form action={logoutAction} className="flex-1">
              <button
                type="submit"
                className="w-full text-center py-1.5 text-xs font-medium rounded-lg bg-bg-muted hover:bg-red-50 text-text-muted hover:text-danger transition-colors cursor-pointer"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-md px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary-soft text-primary font-bold text-sm flex items-center justify-center border border-primary/20 shrink-0">
            Z
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm truncate text-text">{businessName}</h1>
            <p className="text-[10px] text-text-muted leading-none">{roleLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ganti-password"
            className="p-2 text-text-muted hover:text-text rounded-lg"
            aria-label="Ganti Password"
          >
            <KeyRound className="w-4 h-4" />
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="p-2 text-text-muted hover:text-danger rounded-lg cursor-pointer"
              aria-label="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Phone First, touch >= 44px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg/95 backdrop-blur-md px-2 py-1 flex items-center justify-around safe-bottom">
        {navLinks.slice(0, 5).map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] text-[10px] font-medium text-text-muted hover:text-primary transition-colors active:scale-95"
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
        {navLinks.length > 5 && (
          <Link
            href="/pengaturan"
            className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] text-[10px] font-medium text-text-muted hover:text-primary transition-colors active:scale-95"
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span>Menu</span>
          </Link>
        )}
      </nav>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col md:flex-row">
      <Suspense fallback={<NavSkeleton />}>
        <AppNav />
      </Suspense>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8 p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
