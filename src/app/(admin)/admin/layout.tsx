import { Suspense } from "react";
import { logoutAction } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Admin Dashboard — ZeniPOS",
  description: "Manajemen UMKM, langganan 3 bulan, dan penyediaan akun pemilik.",
};

async function AdminUserBadge() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="text-right hidden md:block">
      <div className="text-xs font-medium text-text">{user?.email ?? "admin@zenipos.id"}</div>
      <div className="text-[11px] text-text-faint">Super Administrator</div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-subtle text-text flex flex-col">
      {/* Top Admin Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/95 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-lg tracking-tight text-text">ZeniPOS</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-soft text-primary">
                Admin
              </span>
            </div>
          </div>

          {/* Status, Admin Email & Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* System Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-text-muted bg-bg-muted/80 px-2.5 py-1 rounded-full border border-border">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span>Sistem Aktif</span>
            </div>

            {/* Email with Suspense */}
            <Suspense
              fallback={
                <div className="hidden md:block w-32 h-7 bg-bg-muted rounded-md animate-pulse" />
              }
            >
              <AdminUserBadge />
            </Suspense>

            {/* Logout Action */}
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-9 px-3 border-border text-text hover:bg-bg-muted hover:text-danger gap-1.5 text-xs font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
