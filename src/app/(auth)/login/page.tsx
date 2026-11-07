import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";
import { LoginForm } from "@/features/auth/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Masuk | ZeniPOS",
  description: "Masuk ke aplikasi kasir dan pencatatan penjualan ZeniPOS",
};

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-bg-subtle text-text animate-pulse">
      <div className="w-full max-w-[420px] h-96 bg-bg-muted rounded-2xl" />
    </div>
  );
}

async function LoginContent() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    if (profile.mustChangePassword) {
      redirect("/ganti-password");
    }
    if (profile.role === "admin") {
      redirect("/admin");
    }
    if (profile.role === "cashier") {
      redirect("/kasir");
    }
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-bg-subtle text-text">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <span className="w-2 h-2 rounded-full bg-accent-green" />
            <span>Sistem Normal</span>
          </div>
        </div>

        <Card className="border border-border bg-bg shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="space-y-2 pb-4 pt-6 px-6 sm:px-8 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-bold">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-text">
                  ZeniPOS
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-text-faint font-semibold">
                  Sistem Kasir UMKM
                </span>
              </div>
            </div>

            <CardTitle className="text-xl font-bold tracking-tight text-text">
              Selamat Datang Kembali
            </CardTitle>
            <CardDescription className="text-xs text-text-muted leading-relaxed">
              Masukkan kredensial akun Anda untuk mengakses pencatatan dan kasir toko.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
            <LoginForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-text-faint leading-relaxed px-4">
          Pendaftaran UMKM baru dan pembuatan akun dilakukan oleh Admin Layanan.
          Hubungi kami via WhatsApp jika memerlukan bantuan akun.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}
