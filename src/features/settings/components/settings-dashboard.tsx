"use client";

import { useState, useTransition } from "react";
import {
  type CashierAccountInfo,
  updateUmkmProfileAction,
  createOrResetCashierAction,
} from "../actions";
import {
  Store,
  UserCheck,
  UserX,
  KeyRound,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

interface SettingsDashboardProps {
  initialUmkm: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
  };
  initialCashier: CashierAccountInfo | null;
}

export function SettingsDashboard({
  initialUmkm,
  initialCashier,
}: SettingsDashboardProps) {
  // Store profile form
  const [storeName, setStoreName] = useState(initialUmkm.name);
  const [storePhone, setStorePhone] = useState(initialUmkm.phone);
  const [storeAddress, setStoreAddress] = useState(initialUmkm.address || "");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Cashier account state
  const [cashier, setCashier] = useState<CashierAccountInfo | null>(initialCashier);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [cashierFullName, setCashierFullName] = useState(cashier?.fullName || "");
  const [cashierEmail, setCashierEmail] = useState(cashier?.email || "");
  const [cashierPassword, setCashierPassword] = useState("");
  const [cashierResult, setCashierResult] = useState<{ email: string; pass: string } | null>(null);
  const [cashierError, setCashierError] = useState("");
  const [copied, setCopied] = useState(false);

  const [isPending, startTransition] = useTransition();

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess("");
    setProfileError("");

    startTransition(async () => {
      const res = await updateUmkmProfileAction({
        name: storeName,
        phone: storePhone,
        address: storeAddress,
      });

      if (res.success) {
        setProfileSuccess("Profil usaha berhasil diperbarui.");
      } else {
        setProfileError(res.error || "Gagal memperbarui profil usaha.");
      }
    });
  };

  const handleOpenCashierModal = () => {
    setCashierFullName(cashier?.fullName || "");
    setCashierEmail(cashier?.email || "");
    setCashierPassword("");
    setCashierError("");
    setCashierResult(null);
    setIsCashierModalOpen(true);
  };

  const handleSaveCashier = (e: React.FormEvent) => {
    e.preventDefault();
    setCashierError("");

    startTransition(async () => {
      const res = await createOrResetCashierAction({
        fullName: cashierFullName,
        email: cashierEmail,
        password: cashierPassword.trim() ? cashierPassword : undefined,
      });

      if (res.success && res.cashierId) {
        const passToDisplay = cashierPassword.trim() || res.defaultPassword || "********";
        setCashierResult({
          email: cashierEmail,
          pass: passToDisplay,
        });
        setCashier({
          id: res.cashierId,
          fullName: cashierFullName,
          email: cashierEmail,
          isActive: true,
          mustChangePassword: true,
          createdAt: new Date().toISOString(),
        });
      } else {
        setCashierError(res.error || "Gagal menyimpan akun kasir.");
      }
    });
  };

  const handleCopyCredentials = () => {
    if (!cashierResult) return;
    const text = `Akun Kasir ZeniPOS:\nEmail: ${cashierResult.email}\nPassword Sementara: ${cashierResult.pass}\nSilakan login dan ganti password Anda saat pertama kali masuk.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* 1. Store Profile Settings */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text">Profil Toko / Usaha</h2>
            <p className="text-xs text-text-muted">
              Informasi ini akan tertera pada struk cetak dan struk WhatsApp pelanggan.
            </p>
          </div>
        </div>

        {profileSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {profileSuccess}
          </div>
        )}

        {profileError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {profileError}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Nama Usaha / Toko <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Nomor WhatsApp / Telepon Toko <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full px-4 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Alamat Lengkap Toko
            </label>
            <textarea
              rows={3}
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              placeholder="Contoh: Jl. Diponegoro No. 12, Sleman, Yogyakarta"
              className="w-full p-4 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary-hover disabled:opacity-60 min-h-[44px] flex items-center gap-2 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              {isPending ? "Menyimpan..." : "Simpan Profil Toko"}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Cashier Account Management */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">Akun Kasir Toko</h2>
              <p className="text-xs text-text-muted">
                Sesuai PRD ZeniPOS: Maksimal 1 akun kasir per UMKM untuk mencatat penjualan kasir.
              </p>
            </div>
          </div>
        </div>

        {cashier ? (
          <div className="p-5 bg-bg-muted/40 rounded-2xl border border-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-text">{cashier.fullName}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Kasir Aktif
                  </span>
                  {cashier.mustChangePassword && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Wajib Ganti Password
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted mt-1 font-mono">{cashier.email}</div>
              </div>

              <button
                type="button"
                onClick={handleOpenCashierModal}
                className="px-4 py-2 bg-white border border-border hover:bg-bg-muted text-text font-semibold text-xs rounded-xl flex items-center gap-1.5 min-h-[44px] transition-colors"
              >
                <KeyRound className="w-4 h-4 text-primary" />
                Reset Password / Edit Kasir
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-bg-muted/30 rounded-2xl border border-border border-dashed space-y-3">
            <UserX className="w-10 h-10 mx-auto text-text-muted" />
            <p className="text-sm font-semibold text-text">Belum ada akun kasir terdaftar</p>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Buat akun kasir agar karyawan Anda dapat login ke halaman Kasir tanpa bisa melihat harga modal dan laporan laba.
            </p>
            <button
              type="button"
              onClick={handleOpenCashierModal}
              className="px-5 py-2.5 bg-primary text-white font-semibold text-xs rounded-xl hover:bg-primary-hover min-h-[44px] shadow-sm transition-all"
            >
              Buat Akun Kasir Sekarang
            </button>
          </div>
        )}
      </div>

      {/* Cashier Create/Reset Modal */}
      {isCashierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-base font-bold text-text">
                {cashier ? "Reset Password / Kelola Kasir" : "Buat Akun Kasir Baru"}
              </h3>
              <p className="text-xs text-text-muted">
                Kasir hanya memiliki akses ke halaman kasir & riwayat penjualan.
              </p>
            </div>

            {cashierResult ? (
              <div className="p-6 space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Akun Kasir Berhasil Disimpan!
                  </div>
                  <p className="text-xs text-emerald-700">
                    Sesuai Aturan Emas #10, kasir diwajibkan mengganti password ini saat login pertama kali.
                  </p>
                </div>

                <div className="bg-bg-muted/50 p-4 rounded-xl border border-border space-y-2 font-mono text-xs">
                  <div>
                    <span className="text-text-muted block">Email:</span>
                    <span className="font-bold text-text">{cashierResult.email}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Password Awal:</span>
                    <span className="font-bold text-primary text-sm">{cashierResult.pass}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px] transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Berhasil Disalin!" : "Salin Akun ke Clipboard"}
                </button>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCashierModalOpen(false)}
                    className="px-5 py-2.5 bg-primary text-white font-semibold text-xs rounded-xl hover:bg-primary-hover min-h-[44px]"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveCashier} className="p-6 space-y-4 text-sm">
                {cashierError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    {cashierError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Nama Kasir <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cashierFullName}
                    onChange={(e) => setCashierFullName(e.target.value)}
                    placeholder="Contoh: Rina Wahyuni"
                    className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Email Kasir <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!cashier}
                    value={cashierEmail}
                    onChange={(e) => setCashierEmail(e.target.value)}
                    placeholder="Contoh: kasir@tokoanda.com"
                    className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary disabled:opacity-60 min-h-[44px]"
                  />
                  {cashier && (
                    <span className="text-[11px] text-text-muted mt-0.5 block">
                      Email kasir tidak dapat diubah setelah dibuat.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Password Baru (Opsional)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={cashierPassword}
                    onChange={(e) => setCashierPassword(e.target.value)}
                    placeholder="Kosongkan untuk generate password acak otomatis"
                    className="w-full px-3.5 py-2.5 bg-bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:border-primary min-h-[44px]"
                  />
                  <span className="text-[11px] text-text-muted mt-0.5 block">
                    Minimal 6 karakter.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCashierModalOpen(false)}
                    disabled={isPending}
                    className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text rounded-xl min-h-[44px]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover disabled:opacity-60 min-h-[44px] flex items-center gap-2"
                  >
                    {isPending ? "Menyimpan..." : "Simpan Akun Kasir"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
