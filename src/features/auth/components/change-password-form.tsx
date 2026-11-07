"use client";

import { useActionState, useState } from "react";
import { changePasswordAction, logoutAction } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Eye, EyeOff, AlertCircle, ShieldAlert, LogOut } from "lucide-react";

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutAction();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm text-text">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-accent-amber" />
        <div className="leading-snug">
          <p className="font-medium text-text">Keamanan Akun Diperlukan</p>
          <p className="text-xs text-text-muted mt-0.5">
            Akun Anda saat ini menggunakan password acak sementara dari admin.
            Harap buat password baru pribadi Anda sebelum melanjutkan ke
            dashboard aplikasi.
          </p>
        </div>
      </div>

      {state?.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-danger"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-danger" />
          <p className="leading-snug">{state.error}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="passwordBaru"
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            Password Baru
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint pointer-events-none" />
            <Input
              id="passwordBaru"
              name="passwordBaru"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              required
              disabled={isPending}
              className="pl-10 pr-10 h-11 bg-bg border-border text-text placeholder:text-text-faint focus-visible:ring-primary focus-visible:border-primary"
            />
            <button
              type="button"
              aria-label={
                showPassword ? "Sembunyikan password" : "Lihat password"
              }
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text transition-colors p-1"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {state?.fieldErrors?.passwordBaru && (
            <p className="text-xs text-danger mt-1">
              {state.fieldErrors.passwordBaru[0]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="konfirmasiPasswordBaru"
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            Konfirmasi Password Baru
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint pointer-events-none" />
            <Input
              id="konfirmasiPasswordBaru"
              name="konfirmasiPasswordBaru"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ulangi password baru Anda"
              required
              disabled={isPending}
              className="pl-10 pr-10 h-11 bg-bg border-border text-text placeholder:text-text-faint focus-visible:ring-primary focus-visible:border-primary"
            />
            <button
              type="button"
              aria-label={
                showConfirmPassword ? "Sembunyikan password" : "Lihat password"
              }
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text transition-colors p-1"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {state?.fieldErrors?.konfirmasiPasswordBaru && (
            <p className="text-xs text-danger mt-1">
              {state.fieldErrors.konfirmasiPasswordBaru[0]}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending || isLoggingOut}
          className="w-full h-11 font-medium bg-primary hover:bg-primary-hover text-on-primary transition-colors cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan Password...
            </>
          ) : (
            "Simpan & Lanjutkan"
          )}
        </Button>
      </form>

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending || isLoggingOut}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors cursor-pointer"
        >
          {isLoggingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>Bukan akun Anda? Keluar</span>
        </button>
      </div>
    </div>
  );
}
