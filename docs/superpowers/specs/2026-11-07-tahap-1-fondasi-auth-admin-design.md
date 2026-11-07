# Design Document: ZeniPOS Tahap 1 — Fondasi, Auth, dan Dashboard Admin

Tanggal: 2026-11-07
Status: Proposed (Menunggu Review)

---

## 1. Latar Belakang & Tujuan (Intent and Why)

ZeniPOS adalah layanan pencatatan penjualan (POS) multi-tenant berbasis PWA mobile-first untuk UMKM berbayar. Model bisnisnya tidak menggunakan pendaftaran publik; calon pelanggan menghubungi admin penyedia layanan lewat chat/WhatsApp, menyepakati langganan, lalu admin mendaftarkan UMKM dan akun pemiliknya.

Tahap 1 ini bertujuan membangun fondasi teknis terpenting:
1. Skema database PostgreSQL di Supabase dengan isolasi Row Level Security (RLS) ketat antar-UMKM.
2. Penegakan hak akses peran (`admin`, `owner`, `cashier`).
3. Sistem autentikasi berbasis Email & Password dengan alur wajib ganti password acak pada login pertama kali.
4. Dashboard Admin (`/admin`) untuk mengelola UMKM, membuat akun pemilik, dan memperpanjang masa aktif langganan siklus 3 bulanan.
5. Menata struktur repositori ke standar `src/` sesuai aturan di `AGENTS.md`.

---

## 2. Tujuan, Non-Tujuan, & Anti-Tujuan

### Goals (Tujuan Utama)
- **Isolasi Data**: Setiap tabel data usaha memiliki `umkm_id`. RLS mencegah UMKM A membaca/menulis data UMKM B.
- **Privasi Transaksi**: Admin penyedia layanan tidak memiliki akses membaca data produk, detail transaksi (`sales`, `sale_items`), atau pengeluaran UMKM; admin hanya membaca data ringkasan agregat.
- **Autentikasi Terkontrol**: Pendaftaran publik dimatikan. Akun pemilik dibuat oleh admin dengan password acak. Login pertama wajib mengganti password. Tombol Google Sign-In ditampilkan dengan status "Segera hadir".
- **Siklus Langganan 3 Bulan**: Admin dapat mendaftarkan UMKM baru dengan masa aktif 3 bulan dan memperpanjangnya (+3 bulan). Penegakan masa aktif di RLS menolak mutasi data baru jika langganan kedaluwarsa.
- **Dashboard Admin Fungsional**: Halaman `/admin` yang memungkinkan admin melihat daftar UMKM (status: aktif, kedaluwarsa, akan berakhir), mendaftarkan UMKM baru + pemilik, reset password, dan perpanjang langganan.

### Non-Goals (Bukan Tujuan Tahap 1)
- Integrasi payment gateway otomatis (pembayaran tetap manual via chat).
- Fitur transaksi kasir, manajemen stok, dan laporan laba rugi (dikerjakan pada Tahap 2 & 3).
- Offline sync PWA dan IndexedDB Dexie (dikerjakan pada Tahap 5).
- Multi-cabang atau multi-kasir (MVP dibatasi 1 pemilik dan 1 kasir per UMKM).

### Anti-Goals (Hal yang Dilarang)
- Menggunakan `SUPABASE_SERVICE_ROLE_KEY` di browser atau komponen klien.
- Membuat kebijakan RLS longgar seperti `using (true)`.
- Mengizinkan admin melihat rincian nota atau nama barang dagangan UMKM.
- Mengizinkan registrasi mandiri publik di Supabase Auth.

---

## 3. Batasan Teknis & Aturan Emas (Constraints)

Sesuai `AGENTS.md`:
1. **Multi-tenant RLS**: Setiap query data usaha terikat `umkm_id = current_umkm_id()`.
2. **Kerahasiaan Service Role Key**: Hanya digunakan pada Server Actions / Server-side Route Handler untuk keperluan administrasi.
3. **Mata Uang**: Disimpan sebagai integer Rupiah (tanpa desimal/float).
4. **Keamanan Akun**: Password awal dibuat acak dan aman; penanda `must_change_password` wajib dibersihkan sebelum pengguna bisa masuk ke dashboard utama.
5. **Struktur Folder**: Migrasi kode ke struktur `src/app/`, `src/components/`, `src/features/`, `src/lib/`.

---

## 4. Analisis Pendekatan Arsitektur (Approaches)

### Pendekatan 1: Next.js Server Actions + Supabase Direct RLS (Dipilih)
- **Mekanisme**: Skema dan RLS diatur lewat file migrasi SQL. Mutasi data admin dan auth ditangani via Server Actions dengan validasi skema Zod. Halaman login dan admin memanfaatkan React Server Components (RSC) dengan Client Component interaktif seperlunya.
- **Kelebihan**: Paling aman (kunci admin service role tetap di server), bebas dari waterfall data fetching di browser, performa optimal, dan selaras penuh dengan Next.js App Router.
- **Trade-off**: Memerlukan konfigurasi variabel lingkungan Supabase di `.env.local` untuk pengujian integrasi server.

### Pendekatan 2: REST Route Handlers Tradisional (`/api/*`) + Client-side Fetching
- **Mekanisme**: Membuat REST endpoint di `src/app/api/admin/*` dan halaman admin murni sebagai Client Component (`"use client"`).
- **Alasan Ditolak**: Menghasilkan boilerplate berlebih, rentan loading waterfall, dan duplikasi validasi data di dua tempat.

### Pendekatan 3: Supabase Edge Functions Terpisah
- **Mekanisme**: Memindahkan logika admin ke Deno Edge Functions di cloud Supabase.
- **Alasan Ditolak**: Menambah kompleksitas deployment dan pengujian lokal tanpa memberikan nilai tambah signifikan pada skala MVP.

---

## 5. Keputusan Desain & Spesifikasi Teknis

### 5.1 Skema Database & RLS (`supabase/migrations/`)

1. **Cakupan Tabel Lengkap (8 Tabel Inti)**:
   Migrasi awal langsung mencakup 8 tabel inti sesuai PRD untuk memastikan integritas relasi dan RLS global:
   - `umkm`, `profiles`, `categories`, `products`, `stock_movements`, `sales`, `sale_items`, `expenses`.
   - Ini memastikan `admin_umkm_summary` (menghitung jumlah produk dan transaksi per UMKM) dan aturan RLS `umkm_is_active()` pada mutasi transaksi sudah terpasang kokoh sejak hari pertama tanpa perlu refactor skema di Tahap 2.

2. **Fungsi Pembantu RLS**:
   - `current_umkm_id()`: Mengembalikan `umkm_id` dari profil pengguna yang terautentikasi (`auth.uid()`).
   - `current_role()`: Mengembalikan `role` pengguna (`admin`, `owner`, `cashier`).
   - `umkm_is_active()`: Mengembalikan `boolean` (`true` jika UMKM berstatus `active` dan tanggal `active_until >= current_date`).

3. **Tabel `umkm`**:
   - `id uuid primary key default gen_random_uuid()`
   - `name text not null`
   - `owner_name text not null`
   - `phone text not null`
   - `address text`
   - `status text not null default 'active'` check (`status in ('active', 'inactive')`)
   - `active_until date not null default (current_date + interval '3 months')`
   - `created_at timestamptz not null default now()`
   - **Logika Kedaluwarsa & Perpanjangan**:
     - Status 'expired' dihitung secara dinamis dari `active_until < current_date` sehingga tidak memerlukan background cron job.
     - Perpanjangan langganan 3 bulan dihitung adil menggunakan rumus `GREATEST(active_until, current_date) + interval '3 months'`.
   - **RLS**:
     - `admin`: SELECT, INSERT, UPDATE.
     - `owner` & `cashier`: SELECT hanya untuk baris dengan `id = current_umkm_id()`.

4. **Tabel `profiles`**:
   - `id uuid primary key references auth.users(id) on delete cascade`
   - `umkm_id uuid references umkm(id) on delete cascade` (NULL untuk role `admin`)
   - `role text not null` check (`role in ('admin', 'owner', 'cashier')`)
   - `full_name text not null`
   - `must_change_password boolean not null default true`
   - `is_active boolean not null default true`
   - `created_at timestamptz not null default now()`
   - **Indeks Unik Parsial**:
     - `create unique index unique_owner_per_umkm on profiles (umkm_id) where (role = 'owner');`
     - `create unique index unique_cashier_per_umkm on profiles (umkm_id) where (role = 'cashier');`
   - **RLS**:
     - `admin`: SELECT, INSERT, UPDATE seluruh profil.
     - `owner`: SELECT untuk profil di UMKM yang sama (`umkm_id = current_umkm_id()`), UPDATE hanya untuk akun kasir miliknya.
     - `cashier`: SELECT hanya profil dirinya sendiri (`id = auth.uid()`).
     - **Self-update**: Pengguna diizinkan UPDATE profil miliknya sendiri (`id = auth.uid()`) khusus untuk kolom `must_change_password` dan `full_name`.

5. **Database View untuk Admin (Ringkasan Agregat)**:
   - `create view admin_umkm_summary as ...`: Menyajikan data agregat UMKM (total produk terdaftar, total transaksi penjualan, tanggal aktif, status) tanpa mengekspos nota detail atau nama item produk demi privasi pelanggan.

### 5.2 Alur Autentikasi (`src/features/auth/`)

1. **Halaman Login (`/login`)**:
   - Form Email dan Password.
   - Tombol "Masuk dengan Google" dalam status `disabled` dengan badge "Segera hadir".
   - Menggunakan Server Action untuk login via Supabase Auth (`signInWithPassword`).
2. **Pengecekan Wajib Ganti Password**:
   - Middleware / Layout memeriksa nilai `must_change_password`.
   - Jika `true`, pengguna diarahkan ke `/auth/ganti-password` (layar modal / halaman ganti password baru) sebelum dapat mengakses rute `/dashboard` atau `/kasir`.
3. **Pendaftaran Publik**:
   - Opsi `enable_signup = false` pada Supabase Auth. Pembuatan akun dilakukan di server via service role (`supabase.auth.admin.createUser`).

### 5.3 Dashboard Admin (`/admin`)

1. **Navigasi & Ringkasan**:
   - Ringkasan total UMKM aktif, UMKM yang masa aktifnya tersisa <= 7 hari, dan UMKM kedaluwarsa.
2. **Kelola UMKM**:
   - Form modal "Tambah UMKM Baru":
     - Input: Nama Usaha, Nama Pemilik, Nomor WhatsApp/HP, Email Pemilik, Password Awal (otomatis digenerate atau input manual).
     - Otomatis mengisi `active_until = current_date + 3 bulan`.
     - Eksekusi Server Action: insert `umkm`, buat akun auth di Supabase, dan insert `profiles` dengan role `owner`.
   - Aksi per baris UMKM:
     - **Perpanjang 3 Bulan**: Menambahkan 3 bulan ke `active_until`.
     - **Nonaktifkan / Aktifkan**: Mengubah kolom `status` (`inactive` / `active`).
     - **Reset Password**: Mengenerate password baru dan menandai `must_change_password = true`.

### 5.4 Dashboard Pemilik di Tahap 1 (`/dashboard`)

Halaman landing pemilik setelah login dan selesai mengganti password:
- **Kartu Profil Usaha**: Menampilkan nama toko, nama pemilik, dan status akun.
- **Badge Masa Aktif**: Menampilkan tanggal `active_until` dan sisa hari masa aktif. Jika tersisa <= 7 hari, tampil banner peringatan perpanjangan langganan.
- **Status Operasional**: Kartu pengantar bahwa menu kasir, produk, dan laporan sedang dipersiapkan untuk aktivasi di Tahap 2.
- **Aksi Akun**: Tombol ganti password mandiri dan tombol keluar (logout).

### 5.5 Penataan Struktur Folder (`src/`)

Memindahkan struktur repositori ke format standar:
```
src/
  app/
    (auth)/login/
    (auth)/ganti-password/
    (admin)/admin/
    (app)/dashboard/
    page.tsx                 # Landing page ZeniPOS
    layout.tsx
    globals.css
  components/
    ui/                      # Komponen Shadcn / Radix
    world-map.tsx
  features/
    auth/                    # actions, schemas, components auth
    admin/                   # actions, schemas, components admin
  lib/
    supabase/
      client.ts              # Browser client
      server.ts              # Server client (cookies)
      admin.ts               # Admin client (service role)
    format.ts                # formatRupiah, formatTanggal
supabase/
  migrations/
    20261107000001_init_schema.sql
  seed.sql
```

---

## 6. Tanggung Jawab Builder (What's Left to the Builder)

Hal-hal implementasi detail yang diserahkan ke builder:
- Pola generator password acak (panjang 8-10 karakter alfanumerik yang mudah dibaca).
- Visual feedback / notifikasi toast (menggunakan `sonner`) saat perpanjangan berhasil atau UMKM baru dibuat.
- Skrip migrasi dan seed awal untuk akun admin pertama (`admin@zenipos.id`).
