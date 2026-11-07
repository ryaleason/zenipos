import type { Metadata } from "next";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Ganti Password Baru | ZeniPOS",
  description: "Buat password baru akun ZeniPOS Anda untuk mengamankan data toko",
};

export default function GantiPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-bg-subtle text-text">
      <div className="w-full max-w-[420px] space-y-6">
        <Card className="border border-border bg-bg shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="space-y-2 pb-4 pt-6 px-6 sm:px-8 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-text">
                  Keamanan Akun
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-text-faint font-semibold">
                  ZeniPOS Security
                </span>
              </div>
            </div>

            <CardTitle className="text-xl font-bold tracking-tight text-text">
              Buat Password Baru
            </CardTitle>
            <CardDescription className="text-xs text-text-muted leading-relaxed">
              Ini adalah kali pertama Anda masuk. Silakan ganti password acak sementara dengan password baru pribadi Anda.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-text-faint leading-relaxed px-4">
          Password baru harus memiliki panjang minimal 8 karakter. Simpan password Anda dengan baik.
        </p>
      </div>
    </div>
  );
}
