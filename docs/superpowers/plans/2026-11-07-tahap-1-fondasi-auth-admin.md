# Tahap 1: Fondasi, Auth, dan Dashboard Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fondasi teknis ZeniPOS Tahap 1 yang mencakup migrasi struktur ke `src/`, skema database 8 tabel dengan RLS multi-tenant dan privasi transaksi, autentikasi email & password dengan alur wajib ganti password acak pada login pertama, dashboard admin `/admin` untuk pendaftaran UMKM berdurasi 3 bulan, serta halaman beranda awal pemilik `/dashboard`.

**Architecture:** Next.js App Router dengan React Server Components (RSC) dan Server Actions untuk mutasi data, divalidasi dengan Zod. Menggunakan `@supabase/ssr` untuk autentikasi browser/server dan `supabase-admin` (service role) hanya di server untuk pembuatan akun serta pengelolaan UMKM oleh admin. Skema database diisolasi berbasis `umkm_id` dengan RLS multi-tenant ketat dan view ringkasan agregat untuk admin.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4, `@supabase/ssr`, `@supabase/supabase-js`, Zod, Lucide React, Sonner.

**Spec:** [docs/superpowers/specs/2026-11-07-tahap-1-fondasi-auth-admin-design.md](file:///home/ryaleason/Projects/My%20Project/zenipos/docs/superpowers/specs/2026-11-07-tahap-1-fondasi-auth-admin-design.md)

## Global Constraints

- Struktur kode dipusatkan di folder `src/` (`src/app/`, `src/features/`, `src/lib/`, `src/components/`).
- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh diakses di sisi server (`src/lib/supabase/admin.ts`), dilarang berada di kode klien atau log.
- Seluruh query dan mutasi data usaha wajib terikat `umkm_id` dengan RLS aktif.
- Transaksi dan data nota terlindung dari admin; admin hanya membaca data ringkasan agregat (`admin_umkm_summary`).
- Semua jumlah uang disimpan sebagai integer Rupiah tanpa desimal/float.
- Durasi langganan standar siklus 3 bulan; perpanjangan dihitung menggunakan `GREATEST(active_until, current_date) + interval '3 months'`.
- Bebas dari error `tsc --noEmit` dan `npm run lint`.

## Review Focus

- **Bypass must_change_password:** Pengguna dengan `must_change_password = true` mencoba langsung mengakses `/dashboard` atau `/admin` tanpa mengganti password. Perilaku yang diharapkan: dicegat oleh middleware / server auth guard dan otomatis dialihkan ke `/auth/ganti-password`.
- **Eksfiltrasi Data Transaksi oleh Admin:** Pengguna dengan role `admin` mencoba query langsung ke tabel `sales` atau `sale_items`. Perilaku yang diharapkan: query menghasilkan 0 baris atau diblokir oleh RLS policy.
- **Pendaftaran Mandiri Ilegal:** Permintaan sign-up publik ke Supabase Auth. Perilaku yang diharapkan: ditolak karena registrasi mandiri dimatikan; hanya Server Action admin yang bisa membuat akun via `auth.admin.createUser`.
- **Perpanjangan UMKM Kedaluwarsa Lama:** UMKM yang telah kedaluwarsa 2 bulan lalu diperpanjang oleh admin. Perilaku yang diharapkan: tanggal baru adalah `current_date + 3 bulan`, bukan tanggal kedaluwarsa lama + 3 bulan (yang akan langsung hangus).
- **Tabrakan Duplikasi Owner:** Admin mencoba mendaftarkan lebih dari 1 akun owner untuk UMKM yang sama. Perilaku yang diharapkan: ditolak oleh partial unique index di tabel `profiles`.

---

### Task 1: Restrukturisasi Repositori ke Pola `src/`

**Files:**
- Create: `src/lib/utils.ts`
- Modify: `tsconfig.json`
- Move: `app/` -> `src/app/`, `components/` -> `src/components/`, `lib/` -> `src/lib/`, `hooks/` -> `src/hooks/`

**Interfaces:**
- Consumes: Struktur repositori saat ini
- Produces: Pola direktori `src/` dengan alias path `@/*` menunjuk ke `./src/*`

- [ ] **Step 1: Update konfigurasi alias path di `tsconfig.json`**

Edit `tsconfig.json` agar `paths` memetakan `@/*` ke `./src/*`.

- [ ] **Step 2: Pindahkan folder ke dalam `src/`**

Pindahkan direktori `app/`, `components/`, `lib/`, dan `hooks/` ke dalam `src/`.

- [ ] **Step 3: Verifikasi kompilasi path alias**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors).

- [ ] **Step 4: Commit perubahan struktur**

```bash
git add tsconfig.json src/
git commit -m "refactor: restructure repository to src/ directory convention"
```

---

### Task 2: Supabase Clients, Environment Config & Helper Format

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/format.ts`
- Create: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Consumes: `@supabase/supabase-js`, `@supabase/ssr`
- Produces:
  - `createBrowserClient()`: Supabase client untuk client components
  - `createServerClient()`: Supabase client untuk server components & actions dengan cookie store
  - `createAdminClient()`: Supabase service role client untuk operasi istimewa admin
  - `formatRupiah(amount: number): string`
  - `formatDate(date: string | Date): string`

- [ ] **Step 1: Install dependency `@supabase/supabase-js` dan `@supabase/ssr`**

Run: `npm install @supabase/supabase-js @supabase/ssr`
Expected: PASS (dependencies terpasang di package.json).

- [ ] **Step 2: Tulis test formatRupiah dan formatDate**

Buat file uji `src/lib/format.test.ts` untuk memastikan:
- `formatRupiah(50000)` menghasilkan `"Rp 50.000"`
- `formatDate("2026-11-07")` menghasilkan format tanggal Indonesia yang benar.

- [ ] **Step 3: Implementasi `src/lib/format.ts`**

Implementasikan `formatRupiah` dan `formatDate`.

- [ ] **Step 4: Implementasi Supabase Client Helpers**

- `src/lib/supabase/client.ts`: Menggunakan `createBrowserClient` dari `@supabase/ssr`.
- `src/lib/supabase/server.ts`: Menggunakan `createServerClient` dengan pengelolaan cookies Next.js.
- `src/lib/supabase/admin.ts`: Menggunakan `createClient` langsung dengan `SUPABASE_SERVICE_ROLE_KEY`.
- `.env.example`: Menyediakan template variabel lingkungan tanpa kredensial rahasia.

- [ ] **Step 5: Verifikasi typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/ .env.example
git commit -m "feat: add supabase clients, env configuration, and format helpers"
```

---

### Task 3: Skema Database 8 Tabel, RLS Multi-Tenant & Seed Migration

**Files:**
- Create: `supabase/migrations/20261107000001_init_schema.sql`
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: Rancangan skema dari Dokumen Desain Bagian 5.1 & PRD ZeniPOS
- Produces:
  - Tabel: `umkm`, `profiles`, `categories`, `products`, `stock_movements`, `sales`, `sale_items`, `expenses`
  - Helper functions: `current_umkm_id()`, `current_role()`, `umkm_is_active()`
  - View agregat: `admin_umkm_summary`
  - Partial unique indexes: 1 owner & 1 cashier per UMKM
  - RLS Policies per tabel (isolasi `umkm_id`, proteksi data transaksi dari admin, proteksi masa aktif)
  - Akun seed admin awal

- [ ] **Step 1: Tulis file migrasi SQL `supabase/migrations/20261107000001_init_schema.sql`**

Isi migrasi:
1. `umkm` dengan kolom status, `active_until`, dan RLS.
2. `profiles` dengan referensi `auth.users`, partial unique index `unique_owner_per_umkm` dan `unique_cashier_per_umkm`, serta RLS self-update `must_change_password`.
3. Fungsi pembantu: `current_umkm_id()`, `current_role()`, `umkm_is_active()`.
4. Tabel operasional: `categories`, `products`, `stock_movements`, `sales`, `sale_items`, `expenses` dengan `umkm_id` dan RLS penegakan masa aktif via `umkm_is_active()`.
5. View `admin_umkm_summary` dengan `security invoker` atau `security definer` yang mengagregasikan total produk dan transaksi per UMKM tanpa mengekspos rincian isi nota.

- [ ] **Step 2: Tulis file seed data `supabase/seed.sql`**

Menyiapkan data seed akun admin awal:
- Profil admin `admin@zenipos.id`.
- 1 contoh UMKM aktif dan 1 contoh UMKM kedaluwarsa untuk keperluan pengetesan visual dashboard admin.

- [ ] **Step 3: Validasi sintaks SQL migrasi**

Lakukan validasi sintaks SQL terhadap migrasi dan seed.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema migration, multi-tenant RLS, and seed data"
```

---

### Task 4: Autentikasi Email/Password, Guard Ganti Password & Middleware

**Files:**
- Create: `src/features/auth/schemas.ts`
- Create: `src/features/auth/actions.ts`
- Create: `src/features/auth/types.ts`
- Create: `src/middleware.ts`
- Create: `src/app/(auth)/ganti-password/page.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `createServerClient` dari `src/lib/supabase/server.ts`
- Produces:
  - `loginAction(formData: LoginFormInput): Promise<ActionResult>`
  - `changePasswordAction(formData: ChangePasswordInput): Promise<ActionResult>`
  - `logoutAction(): Promise<void>`
  - Middleware redirect logic:
    - Belum login -> diarahkan ke `/login`
    - Login dengan `must_change_password = true` -> wajib dialihkan ke `/ganti-password`
    - Admin -> diarahkan ke `/admin`
    - Owner/Cashier -> diarahkan ke `/dashboard`

- [ ] **Step 1: Tulis skema validasi Zod di `src/features/auth/schemas.ts`**

Definisikan `loginSchema` (email, password) dan `changePasswordSchema` (passwordBaru, konfirmasiPasswordBaru minimal 8 karakter).

- [ ] **Step 2: Implementasi Server Actions di `src/features/auth/actions.ts`**

- `loginAction`: Memvalidasi input via Zod, memanggil `supabase.auth.signInWithPassword`, membaca profil pengguna dari `profiles`. Jika `must_change_password === true`, arahkan ke `/ganti-password`. Jika role `admin`, arahkan ke `/admin`. Jika role `owner` atau `cashier`, arahkan ke `/dashboard`.
- `changePasswordAction`: Memperbarui password via `supabase.auth.updateUser({ password })`, kemudian memperbarui `profiles.must_change_password = false`.
- `logoutAction`: Memanggil `supabase.auth.signOut()` dan redirect ke `/login`.

- [ ] **Step 3: Implementasi Halaman `/login` dan `/ganti-password`**

- `src/app/(auth)/login/page.tsx`: Form login modern dengan input email dan password, tombol submit, pesan error visual, dan tombol "Masuk dengan Google" dalam status nonaktif dengan badge "Segera hadir".
- `src/app/(auth)/ganti-password/page.tsx`: Layar pengamanan wajib ganti password acak bawaan admin ke password baru pribadi sebelum mengakses sistem.

- [ ] **Step 4: Implementasi Next.js Middleware di `src/middleware.ts`**

Memeriksa session Supabase dari cookies:
- Jika mengakses `/admin` tanpa role `admin`, redirect ke `/login`.
- Jika mengakses rute terproteksi dengan `must_change_password = true`, cegat dan arahkan ke `/ganti-password`.

- [ ] **Step 5: Verifikasi typecheck dan lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/ src/middleware.ts src/app/\(auth\)/
git commit -m "feat: implement email-password authentication, forced password change, and route protection middleware"
```

---

### Task 5: Dashboard Admin ZeniPOS (`/admin`)

**Files:**
- Create: `src/features/admin/schemas.ts`
- Create: `src/features/admin/actions.ts`
- Create: `src/features/admin/components/create-umkm-modal.tsx`
- Create: `src/features/admin/components/umkm-table.tsx`
- Create: `src/features/admin/components/summary-cards.tsx`
- Create: `src/app/(admin)/admin/page.tsx`
- Create: `src/app/(admin)/admin/layout.tsx`

**Interfaces:**
- Consumes: `createAdminClient` dari `src/lib/supabase/admin.ts`, `createServerClient` dari `src/lib/supabase/server.ts`
- Produces:
  - Server actions:
    - `createUmkmAction(input: CreateUmkmInput)`: Menambahkan UMKM, membuat akun auth owner, insert profil owner, aktif 3 bulan.
    - `extendSubscriptionAction(umkmId: string)`: Menambahkan 3 bulan ke `active_until`.
    - `toggleUmkmStatusAction(umkmId: string, status: 'active' | 'inactive')`: Mengubah status aktif/nonaktif.
    - `resetOwnerPasswordAction(ownerId: string)`: Mengenerate password baru acak dan mengeset `must_change_password = true`.
  - Halaman Dashboard Admin `/admin` dengan metrik agregat dan tabel interaktif.

- [ ] **Step 1: Tulis skema Zod di `src/features/admin/schemas.ts`**

Skema untuk `createUmkmSchema` (nama usaha, nama pemilik, nomor telepon/WA, email pemilik).

- [ ] **Step 2: Implementasi Server Actions di `src/features/admin/actions.ts`**

- `createUmkmAction`: Generate password acak 8 karakter, buat UMKM dengan `active_until = current_date + 3 bulan`, panggil `adminAuthClient.createUser` untuk email pemilik, lalu buat profil owner dengan `must_change_password = true`.
- `extendSubscriptionAction`: Ambil `active_until` saat ini, hitung `GREATEST(active_until, current_date) + interval '3 months'`, simpan kembali.
- `toggleUmkmStatusAction`: Update status UMKM.
- `resetOwnerPasswordAction`: Update password akun di auth dan setel `must_change_password = true`.

- [ ] **Step 3: Implementasi Komponen UI Dashboard Admin**

- `summary-cards.tsx`: Menampilkan Total UMKM Aktif, UMKM Segera Berakhir (<= 7 hari), dan UMKM Kedaluwarsa.
- `create-umkm-modal.tsx`: Dialog formulir pendaftaran UMKM baru dengan tombol salin password acak awal.
- `umkm-table.tsx`: Tabel daftar UMKM dengan pencarian nama, indikator status, tombol perpanjang 3 bulan, tombol nonaktifkan, dan tombol reset password.
- `src/app/(admin)/admin/page.tsx`: Server Component yang memuat data ringkasan dan tabel secara efisien.

- [ ] **Step 4: Verifikasi typecheck dan build**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/ src/app/\(admin\)/
git commit -m "feat: implement admin dashboard for UMKM management, 3-month subscription cycle, and owner provisioning"
```

---

### Task 6: Halaman Beranda Awal Pemilik (`/dashboard`)

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `createServerClient`, profil pengguna login
- Produces: Halaman `/dashboard` Tahap 1 untuk peran `owner`

- [ ] **Step 1: Implementasi layout dashboard aplikasi**

Header dengan informasi nama UMKM pengguna, nama pemilik, dan tombol Logout.

- [ ] **Step 2: Implementasi halaman `/dashboard` untuk Pemilik**

- Menampilkan kartu profil UMKM (nama usaha, nomor WhatsApp, status akun).
- Menampilkan kartu masa aktif: tanggal berakhir, sisa hari aktif, serta banner pengingat jika masa aktif tinggal 7 hari atau kurang.
- Menampilkan pesan selamat datang yang menginformasikan bahwa modul Kasir, Inventori Stok, dan Laporan Laba sedang disiapkan untuk aktivasi pada Tahap 2.
- Tombol tautan cepat untuk ganti password mandiri.

- [ ] **Step 3: Verifikasi typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/
git commit -m "feat: implement owner welcome dashboard placeholder with subscription status"
```

---

### Task 7: Verifikasi Menyeluruh, Typecheck, Lint & Build

**Files:**
- Test & Check: Seluruh file dalam `src/`

**Interfaces:**
- Consumes: Seluruh implementasi Tahap 1
- Produces: Proyek bersih siap deploy tanpa error atau warning

- [ ] **Step 1: Jalankan pemeriksaan tipe TypeScript**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors).

- [ ] **Step 2: Jalankan linter ESLint**

Run: `npm run lint`
Expected: PASS (0 errors).

- [ ] **Step 3: Jalankan Next.js Production Build**

Run: `npm run build`
Expected: PASS (seluruh rute `/`, `/login`, `/ganti-password`, `/admin`, `/dashboard` terkompilasi optimal).

- [ ] **Step 4: Commit final Tahap 1**

```bash
git add -A
git commit -m "chore: complete Tahap 1 foundation, auth, and admin dashboard verification"
```
