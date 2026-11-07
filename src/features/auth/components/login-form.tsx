"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";

function GoogleIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
      viewBox="0 0 488 512"
      fill="currentColor"
    >
      <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
    </svg>
  );
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
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
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@tokousaha.com"
              required
              disabled={isPending}
              className="pl-10 h-11 bg-bg border-border text-text placeholder:text-text-faint focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>
          {state?.fieldErrors?.email && (
            <p className="text-xs text-danger mt-1">
              {state.fieldErrors.email[0]}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
            >
              Password
            </label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint pointer-events-none" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan password Anda"
              required
              disabled={isPending}
              className="pl-10 pr-10 h-11 bg-bg border-border text-text placeholder:text-text-faint focus-visible:ring-primary focus-visible:border-primary"
            />
            <button
              type="button"
              aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
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
          {state?.fieldErrors?.password && (
            <p className="text-xs text-danger mt-1">
              {state.fieldErrors.password[0]}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-11 font-medium bg-primary hover:bg-primary-hover text-on-primary transition-colors cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            "Masuk ke Akun"
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-bg px-2 text-text-faint">Atau masuk dengan</span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full h-11 px-4 rounded-md border border-border bg-bg-subtle text-text-muted flex items-center justify-center gap-2 cursor-not-allowed opacity-75 font-medium text-sm transition-colors"
        >
          <GoogleIcon />
          <span>Masuk dengan Google</span>
          <Badge
            variant="outline"
            className="ml-1 text-[10px] font-medium border-amber-300 bg-amber-50 text-accent-amber px-1.5 py-0.5 rounded-full"
          >
            Segera hadir
          </Badge>
        </button>
      </div>
    </div>
  );
}
