"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MessageCircle,
  MoreVertical,
  CalendarPlus,
  KeyRound,
  Power,
  Copy,
  Check,
  Send,
  RefreshCw,
  ShoppingBag,
  Receipt,
  Store,
  Clock,
  AlertCircle,
} from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/format";
import { formatWhatsAppUrl, generateRandomPassword } from "../utils";
import {
  extendSubscriptionAction,
  toggleUmkmStatusAction,
  resetOwnerPasswordAction,
} from "../actions";
import type { AdminUmkmItem } from "../types";
import { toast } from "sonner";

interface UmkmTableProps {
  initialUmkmList: AdminUmkmItem[];
}

type StatusFilter = "all" | "active" | "expiring_soon" | "expired" | "inactive";

export function UmkmTable({ initialUmkmList }: UmkmTableProps) {
  const [umkmList, setUmkmList] = useState<AdminUmkmItem[]>(initialUmkmList);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isPending, startTransition] = useTransition();

  // Reset password dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUmkm, setSelectedUmkm] = useState<AdminUmkmItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetCompleted, setResetCompleted] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Filtered list
  const filteredList = useMemo(() => {
    return umkmList.filter((item) => {
      // Search matching
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.umkm_name.toLowerCase().includes(query) ||
        item.owner_name.toLowerCase().includes(query) ||
        item.phone.toLowerCase().includes(query) ||
        (item.owner_email && item.owner_email.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return item.status === "active" && !item.is_expired;
      if (statusFilter === "expiring_soon") {
        return (
          item.status === "active" &&
          !item.is_expired &&
          typeof item.days_remaining === "number" &&
          item.days_remaining <= 7 &&
          item.days_remaining >= 0
        );
      }
      if (statusFilter === "expired") return item.is_expired;
      if (statusFilter === "inactive") return item.status === "inactive";

      return true;
    });
  }, [umkmList, searchQuery, statusFilter]);

  // Handle Extend Subscription (3 Months)
  const handleExtend = (item: AdminUmkmItem) => {
    startTransition(async () => {
      const result = await extendSubscriptionAction({ umkm_id: item.umkm_id });
      if (result.success && result.data) {
        toast.success(`Masa aktif ${item.umkm_name} berhasil diperpanjang 3 bulan!`);
        setUmkmList((prev) =>
          prev.map((u) => {
            if (u.umkm_id === item.umkm_id) {
              const newActiveUntil = result.data!.active_until;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const exp = new Date(newActiveUntil);
              exp.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil(
                (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );
              return {
                ...u,
                active_until: newActiveUntil,
                status: "active",
                is_expired: false,
                days_remaining: diffDays,
              };
            }
            return u;
          })
        );
      } else {
        toast.error(result.error || "Gagal memperpanjang masa aktif");
      }
    });
  };

  // Handle Toggle Status
  const handleToggleStatus = (item: AdminUmkmItem) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const result = await toggleUmkmStatusAction({
        umkm_id: item.umkm_id,
        status: nextStatus,
      });
      if (result.success) {
        toast.success(
          `Status ${item.umkm_name} diubah menjadi ${
            nextStatus === "active" ? "Aktif" : "Nonaktif"
          }`
        );
        setUmkmList((prev) =>
          prev.map((u) => (u.umkm_id === item.umkm_id ? { ...u, status: nextStatus } : u))
        );
      } else {
        toast.error(result.error || "Gagal mengubah status UMKM");
      }
    });
  };

  // Open Reset Password dialog
  const openResetPasswordModal = (item: AdminUmkmItem) => {
    if (!item.owner_profile_id) {
      toast.error("Profil pemilik tidak ditemukan untuk UMKM ini.");
      return;
    }
    setSelectedUmkm(item);
    setNewPassword(generateRandomPassword(10));
    setResetCompleted(false);
    setCopiedPassword(false);
    setResetDialogOpen(true);
  };

  // Execute Password Reset
  const handleExecuteResetPassword = async () => {
    if (!selectedUmkm?.owner_profile_id) return;
    setIsResetting(true);

    const result = await resetOwnerPasswordAction({
      profile_id: selectedUmkm.owner_profile_id,
      new_password: newPassword,
    });

    setIsResetting(false);

    if (result.success) {
      setResetCompleted(true);
      toast.success("Password pemilik berhasil direset!");
    } else {
      toast.error(result.error || "Gagal mereset password");
    }
  };

  const getResetShareText = () => {
    if (!selectedUmkm) return "";
    return (
      `Halo Bpk/Ibu ${selectedUmkm.owner_name},\n\n` +
      `Kata sandi akun ZeniPOS Anda untuk toko ${selectedUmkm.umkm_name} telah diatur ulang oleh Admin.\n\n` +
      `Kredensial Baru:\n` +
      `• Email: ${selectedUmkm.owner_email || "Email akun Anda"}\n` +
      `• Password Baru: ${newPassword}\n\n` +
      `Silakan login dan Anda akan diminta membuat password baru saat masuk.`
    );
  };

  const handleCopyNewPassword = async () => {
    await navigator.clipboard.writeText(getResetShareText());
    setCopiedPassword(true);
    toast.success("Informasi password berhasil disalin!");
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "active", label: "Aktif" },
    { key: "expiring_soon", label: "Segera Berakhir" },
    { key: "expired", label: "Kedaluwarsa" },
    { key: "inactive", label: "Nonaktif" },
  ];

  return (
    <div className="space-y-4">
      {/* Controls: Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Cari toko, pemilik, HP, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-bg border-border text-text h-10 text-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setStatusFilter(btn.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === btn.key
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-bg-subtle text-text-muted hover:text-text hover:bg-bg-muted border border-border/80"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop & Tablet Table */}
      <div className="rounded-xl border border-border bg-bg overflow-hidden shadow-xs">
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-bg-subtle/80">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold text-text py-3">Nama Toko & Pemilik</TableHead>
                <TableHead className="font-semibold text-text">Kontak & WhatsApp</TableHead>
                <TableHead className="font-semibold text-text">Masa Aktif</TableHead>
                <TableHead className="font-semibold text-text text-right">Produk</TableHead>
                <TableHead className="font-semibold text-text text-right">Transaksi</TableHead>
                <TableHead className="font-semibold text-text text-right">Omzet</TableHead>
                <TableHead className="font-semibold text-text text-center">Status</TableHead>
                <TableHead className="font-semibold text-text text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-text-muted">
                    <Store className="w-10 h-10 mx-auto text-text-faint mb-2" />
                    <p className="font-medium text-text">Tidak ada data UMKM</p>
                    <p className="text-xs text-text-faint">
                      {searchQuery
                        ? "Tidak ada UMKM yang cocok dengan pencarian Anda."
                        : "Belum ada mitra UMKM terdaftar di sistem."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((item) => {
                  const isExpiringSoon =
                    item.status === "active" &&
                    !item.is_expired &&
                    typeof item.days_remaining === "number" &&
                    item.days_remaining <= 7 &&
                    item.days_remaining >= 0;

                  return (
                    <TableRow key={item.umkm_id} className="border-border hover:bg-bg-subtle/50">
                      {/* Name & Owner */}
                      <TableCell className="py-3.5">
                        <div className="font-semibold text-text">{item.umkm_name}</div>
                        <div className="text-xs text-text-muted mt-0.5">
                          {item.owner_name} {item.owner_email && `• ${item.owner_email}`}
                        </div>
                        {item.address && (
                          <div className="text-xs text-text-faint truncate max-w-xs mt-0.5">
                            {item.address}
                          </div>
                        )}
                      </TableCell>

                      {/* Phone & WhatsApp Link */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm tabular-nums text-text">
                            {item.phone}
                          </span>
                          <a
                            href={formatWhatsAppUrl(
                              item.phone,
                              `Halo Bpk/Ibu ${item.owner_name} (${item.umkm_name}), kami dari tim Admin ZeniPOS...`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Chat WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4 fill-emerald-600/10" />
                          </a>
                        </div>
                      </TableCell>

                      {/* Active Until Date */}
                      <TableCell>
                        <div className="font-mono text-sm tabular-nums text-text">
                          {formatDate(item.active_until)}
                        </div>
                        <div className="mt-0.5">
                          {item.is_expired ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-danger">
                              <AlertCircle className="w-3 h-3" /> Kedaluwarsa
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-amber">
                              <Clock className="w-3 h-3" /> Sisa {item.days_remaining} hari
                            </span>
                          ) : (
                            <span className="text-xs text-text-faint">
                              Sisa {item.days_remaining} hari
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Total Products */}
                      <TableCell className="text-right font-mono tabular-nums text-text">
                        {item.total_products}
                      </TableCell>

                      {/* Total Sales Count */}
                      <TableCell className="text-right font-mono tabular-nums text-text">
                        {item.total_sales_count}
                      </TableCell>

                      {/* Total Sales Amount (Omzet) */}
                      <TableCell className="text-right font-mono tabular-nums font-medium text-text">
                        {formatRupiah(item.total_sales_amount)}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="text-center">
                        {item.status === "inactive" ? (
                          <Badge variant="outline" className="border-border text-text-faint bg-bg-muted text-xs">
                            Nonaktif
                          </Badge>
                        ) : item.is_expired ? (
                          <Badge variant="destructive" className="bg-red-100 text-danger border-red-200 text-xs">
                            Kedaluwarsa
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs">
                            Segera Berakhir
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-900 border-green-200 text-xs">
                            Aktif
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isPending}
                              className="h-8 w-8 text-text-muted hover:text-text cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-bg text-text border-border">
                            <DropdownMenuLabel className="text-xs text-text-faint">
                              Kelola Mitra
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleExtend(item)}
                              className="gap-2 cursor-pointer text-sm"
                            >
                              <CalendarPlus className="w-4 h-4 text-primary" />
                              <span>Perpanjang 3 Bulan</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openResetPasswordModal(item)}
                              className="gap-2 cursor-pointer text-sm"
                            >
                              <KeyRound className="w-4 h-4 text-accent-amber" />
                              <span>Reset Kata Sandi</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(item)}
                              className="gap-2 cursor-pointer text-sm text-text-muted"
                            >
                              <Power className="w-4 h-4" />
                              <span>{item.status === "active" ? "Nonaktifkan Toko" : "Aktifkan Toko"}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile & Tablet Card Layout */}
        <div className="block lg:hidden divide-y divide-border">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 px-4 text-text-muted">
              <Store className="w-10 h-10 mx-auto text-text-faint mb-2" />
              <p className="font-medium text-text">Tidak ada data UMKM</p>
              <p className="text-xs text-text-faint">
                {searchQuery
                  ? "Tidak ada UMKM yang cocok dengan pencarian Anda."
                  : "Belum ada mitra UMKM terdaftar di sistem."}
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isExpiringSoon =
                item.status === "active" &&
                !item.is_expired &&
                typeof item.days_remaining === "number" &&
                item.days_remaining <= 7 &&
                item.days_remaining >= 0;

              return (
                <div key={item.umkm_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-text text-base">{item.umkm_name}</h4>
                      <p className="text-xs text-text-muted">
                        {item.owner_name} {item.owner_email && `• ${item.owner_email}`}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {item.status === "inactive" ? (
                        <Badge variant="outline" className="border-border text-text-faint bg-bg-muted text-xs">
                          Nonaktif
                        </Badge>
                      ) : item.is_expired ? (
                        <Badge variant="destructive" className="bg-red-100 text-danger border-red-200 text-xs">
                          Kedaluwarsa
                        </Badge>
                      ) : isExpiringSoon ? (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs">
                          Segera Berakhir
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-900 border-green-200 text-xs">
                          Aktif
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Summary metrics on mobile */}
                  <div className="grid grid-cols-3 gap-2 bg-bg-subtle p-2.5 rounded-lg text-xs font-mono">
                    <div>
                      <span className="text-text-faint block font-sans text-[11px] flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> Produk
                      </span>
                      <span className="font-semibold text-text tabular-nums">{item.total_products}</span>
                    </div>
                    <div>
                      <span className="text-text-faint block font-sans text-[11px] flex items-center gap-1">
                        <Receipt className="w-3 h-3" /> Transaksi
                      </span>
                      <span className="font-semibold text-text tabular-nums">{item.total_sales_count}</span>
                    </div>
                    <div>
                      <span className="text-text-faint block font-sans text-[11px]">Omzet</span>
                      <span className="font-semibold text-text tabular-nums truncate block">
                        {formatRupiah(item.total_sales_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Expiration date & contact */}
                  <div className="flex items-center justify-between text-xs text-text-muted pt-0.5">
                    <div>
                      <span>Masa aktif: </span>
                      <span className="font-mono text-text font-medium tabular-nums">
                        {formatDate(item.active_until)}
                      </span>
                      {isExpiringSoon && (
                        <span className="text-accent-amber font-semibold ml-1">
                          (Sisa {item.days_remaining} hr)
                        </span>
                      )}
                    </div>

                    <a
                      href={formatWhatsAppUrl(
                        item.phone,
                        `Halo Bpk/Ibu ${item.owner_name} (${item.umkm_name}), kami dari tim Admin ZeniPOS...`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  {/* Action Buttons for Mobile */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExtend(item)}
                      disabled={isPending}
                      className="flex-1 h-9 text-xs border-border text-primary hover:bg-primary-soft font-medium"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                      +3 Bulan
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openResetPasswordModal(item)}
                      disabled={isPending}
                      className="flex-1 h-9 text-xs border-border text-text-muted hover:text-text font-medium"
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1 text-accent-amber" />
                      Reset Sandi
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(item)}
                      disabled={isPending}
                      className="h-9 w-9 p-0 text-text-muted hover:text-text"
                      title={item.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-bg text-text">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-text">
              <KeyRound className="w-5 h-5 text-accent-amber" />
              Reset Kata Sandi Pemilik
            </DialogTitle>
            <DialogDescription className="text-sm text-text-muted">
              {selectedUmkm && (
                <>
                  Atur ulang kata sandi pemilik toko{" "}
                  <strong className="text-text">{selectedUmkm.umkm_name}</strong> ({selectedUmkm.owner_name}).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {!resetCompleted ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text">Password Baru</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword(10))}
                    className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Acak Sandi
                  </button>
                </div>
                <Input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-bg border-border text-text font-mono"
                  placeholder="Minimal 8 karakter"
                />
                <p className="text-xs text-text-faint">
                  Pemilik wajib mengganti password ini begitu masuk ke aplikasi.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetDialogOpen(false)}
                  disabled={isResetting}
                  className="border-border text-text hover:bg-bg-subtle"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteResetPassword}
                  disabled={isResetting || newPassword.length < 8}
                  className="bg-primary hover:bg-primary-hover text-on-primary font-medium"
                >
                  {isResetting ? "Menyimpan..." : "Simpan Password Baru"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 bg-green-100 text-accent-green rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <p className="font-semibold text-text">Kata Sandi Berhasil Direset!</p>
                <p className="text-xs text-text-muted">
                  Kirimkan password baru ini kepada pemilik toko.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-bg-subtle p-3 space-y-1.5 font-mono text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted font-sans text-xs">Email:</span>
                  <span className="text-text font-medium select-all">
                    {selectedUmkm?.owner_email || "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted font-sans text-xs">Password Baru:</span>
                  <span className="text-primary font-bold select-all">{newPassword}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  onClick={handleCopyNewPassword}
                  className="w-full bg-bg border border-border hover:bg-bg-subtle text-text flex items-center justify-center gap-2 h-10"
                >
                  {copiedPassword ? (
                    <Check className="w-4 h-4 text-accent-green" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copiedPassword ? "Tersalin ke Clipboard!" : "Salin Info Sandi"}</span>
                </Button>

                {selectedUmkm && (
                  <a
                    href={formatWhatsAppUrl(selectedUmkm.phone, getResetShareText())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-xs"
                  >
                    <Send className="w-4 h-4" />
                    <span>Kirim via WhatsApp</span>
                  </a>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setResetDialogOpen(false)}
                  className="w-full text-text-muted hover:text-text"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
