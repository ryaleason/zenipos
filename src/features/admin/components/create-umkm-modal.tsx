"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  RefreshCw,
  Copy,
  Check,
  Send,
  Building2,
  Lock,
  User,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { createUmkmAction } from "../actions";
import { generateRandomPassword, formatWhatsAppUrl } from "../utils";
import { toast } from "sonner";

interface CreatedAccountInfo {
  name: string;
  owner_name: string;
  email: string;
  phone: string;
  password: string;
  active_until: string;
}

export function CreateUmkmModal() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccountInfo | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [initialPassword, setInitialPassword] = useState(() => generateRandomPassword(10));
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRandomizePassword = () => {
    setInitialPassword(generateRandomPassword(10));
  };

  const resetForm = () => {
    setName("");
    setOwnerName("");
    setPhone("");
    setEmail("");
    setInitialPassword(generateRandomPassword(10));
    setAddress("");
    setErrors({});
    setCreatedAccount(null);
    setCopied(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const result = await createUmkmAction({
      name,
      owner_name: ownerName,
      phone,
      email,
      initial_password: initialPassword,
      address: address.trim() || undefined,
    });

    setIsLoading(false);

    if (!result.success) {
      if (result.fieldErrors) {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(result.fieldErrors)) {
          if (v && v.length > 0) flat[k] = v[0];
        }
        setErrors(flat);
      }
      toast.error(result.error || "Gagal mendaftarkan UMKM");
      return;
    }

    // Success: prepare account summary
    const expDate = new Date();
    expDate.setMonth(expDate.getMonth() + 3);

    setCreatedAccount({
      name,
      owner_name: ownerName,
      email,
      phone,
      password: initialPassword,
      active_until: expDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    });
    toast.success("UMKM dan akun pemilik berhasil didaftarkan!");
  };

  const getShareableText = (acc: CreatedAccountInfo) => {
    return (
      `Halo Bpk/Ibu ${acc.owner_name},\n\n` +
      `Selamat datang di ZeniPOS! Pendaftaran usaha Anda telah berhasil disetujui.\n\n` +
      `Informasi Akun Pemilik:\n` +
      `• Nama Toko: ${acc.name}\n` +
      `• Email Login: ${acc.email}\n` +
      `• Kata Sandi Sementara: ${acc.password}\n` +
      `• Masa Aktif: 3 Bulan (s/d ${acc.active_until})\n\n` +
      `Silakan masuk ke aplikasi ZeniPOS dan Anda akan diminta membuat kata sandi baru pada saat login pertama.`
    );
  };

  const handleCopyCredentials = async () => {
    if (!createdAccount) return;
    const text = getShareableText(createdAccount);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Kredensial berhasil disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary-hover text-on-primary font-medium shadow-xs gap-1.5 h-10 px-4">
          <Plus className="w-4 h-4" />
          <span>Daftarkan UMKM</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg bg-bg text-text max-h-[90vh] overflow-y-auto">
        {!createdAccount ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-text">
                <Building2 className="w-5 h-5 text-primary" />
                Pendaftaran UMKM Baru
              </DialogTitle>
              <DialogDescription className="text-sm text-text-muted">
                Admin mendaftarkan UMKM berbayar. Masa aktif otomatis diset selama 3 bulan dan
                akun pemilik dibuatkan langsung.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-text flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-text-muted" /> Nama UMKM / Toko
                </Label>
                <Input
                  id="name"
                  placeholder="Contoh: Warung Berkah Barokah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-bg border-border text-text"
                  required
                />
                {errors.name && <p className="text-xs text-danger">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="owner_name" className="text-sm font-medium text-text flex items-center gap-1.5">
                    <User className="w-4 h-4 text-text-muted" /> Nama Pemilik
                  </Label>
                  <Input
                    id="owner_name"
                    placeholder="Contoh: Budi Santoso"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="bg-bg border-border text-text"
                    required
                  />
                  {errors.owner_name && <p className="text-xs text-danger">{errors.owner_name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium text-text flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-text-muted" /> No. WhatsApp / HP
                  </Label>
                  <Input
                    id="phone"
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-bg border-border text-text font-mono"
                    required
                  />
                  {errors.phone && <p className="text-xs text-danger">{errors.phone}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-text flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-text-muted" /> Email Akun Pemilik
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="pemilik@toko.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-bg border-border text-text"
                  required
                />
                {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="initial_password" className="text-sm font-medium text-text flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-text-muted" /> Password Awal
                  </Label>
                  <button
                    type="button"
                    onClick={handleRandomizePassword}
                    className="text-xs text-primary hover:text-primary-hover flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Acak Password
                  </button>
                </div>
                <Input
                  id="initial_password"
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  className="bg-bg border-border text-text font-mono"
                  required
                />
                <p className="text-xs text-text-faint">
                  Pemilik wajib mengganti password ini saat login pertama kali.
                </p>
                {errors.initial_password && (
                  <p className="text-xs text-danger">{errors.initial_password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-sm font-medium text-text flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-text-muted" /> Alamat Usaha (Opsional)
                </Label>
                <Textarea
                  id="address"
                  rows={2}
                  placeholder="Alamat toko atau rincian lokasi..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-bg border-border text-text text-sm"
                />
              </div>

              <div className="rounded-lg bg-primary-soft/60 border border-primary/20 p-3 text-xs text-text-muted">
                <span className="font-semibold text-primary">Siklus Langganan:</span> UMKM ini akan
                langsung aktif selama 3 bulan ke depan.
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                  className="border-border text-text hover:bg-bg-subtle"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary-hover text-on-primary font-medium"
                >
                  {isLoading ? "Mendaftarkan..." : "Daftarkan UMKM"}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 text-accent-green rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <DialogTitle className="text-xl font-bold text-text">
                Pendaftaran Berhasil!
              </DialogTitle>
              <p className="text-sm text-text-muted">
                UMKM <strong className="text-text">{createdAccount.name}</strong> dan akun pemilik telah
                dibuat.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-bg-subtle p-4 space-y-2.5 text-sm font-mono">
              <div className="flex justify-between border-b border-border/60 pb-2 font-sans">
                <span className="text-text-muted">Masa Aktif:</span>
                <span className="font-semibold text-accent-green">3 Bulan (s/d {createdAccount.active_until})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Email:</span>
                <span className="font-medium text-text select-all">{createdAccount.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Password Awal:</span>
                <span className="font-bold text-primary select-all">{createdAccount.password}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-text-muted">WhatsApp:</span>
                <span className="text-text">{createdAccount.phone}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={handleCopyCredentials}
                className="w-full bg-bg border border-border hover:bg-bg-subtle text-text flex items-center justify-center gap-2 h-11"
              >
                {copied ? <Check className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Tersalin ke Clipboard!" : "Salin Kredensial Akun"}</span>
              </Button>

              <a
                href={formatWhatsAppUrl(
                  createdAccount.phone,
                  getShareableText(createdAccount)
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Akun via WhatsApp</span>
              </a>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="w-full text-text-muted hover:text-text mt-2"
              >
                Selesai & Tutup
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
