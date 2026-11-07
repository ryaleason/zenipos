# AGENTS.md — ZeniPOS

Aturan kerja untuk AI agent yang menulis kode di repo ini. Baca seluruh file sebelum mengubah apa pun. Sumber kebenaran produk adalah PRD ZeniPOS; kalau kode dan PRD bertentangan, tanyakan, jangan menebak.

## 1. Ringkasan Produk

ZeniPOS adalah layanan pencatatan penjualan multi-UMKM (multi-tenant), berbentuk PWA mobile-first.

- **Admin** (pemilik layanan) mendaftarkan UMKM yang sudah membayar lewat chat. Tidak ada pendaftaran terbuka.
- **Pemilik (owner)** mengelola produk, stok, penjualan, pengeluaran, laporan, dan membuat akun kasir.
- **Kasir (cashier)**: maksimal 1 per UMKM. Hanya mencatat penjualan dan melihat produk/stok.
- Fitur MVP: produk + stok, pencatatan penjualan, pengeluaran, laporan omzet dan laba, struk (cetak/WhatsApp).
- Offline hanya untuk halaman Kasir. Fitur lain butuh internet.

## 2. Stack

- Next.js (App Router) + TypeScript strict
- Supabase: Postgres, Auth, Storage, Row Level Security
- Tailwind CSS
- Offline: service worker + manifest PWA, IndexedDB lewat Dexie
- Validasi: Zod
- Hosting: Vercel

Jangan menambah dependensi besar tanpa alasan. Tanyakan dulu sebelum menambah library UI, state manager, atau ORM.

## 3. Aturan Emas (tidak boleh dilanggar)

1. **Isolasi data antar-UMKM.** Semua tabel data usaha punya `umkm_id`. Semua query harus dibatasi oleh UMKM pengguna, dan RLS wajib aktif di semua tabel. Jangan mengandalkan filter di frontend saja.
2. **`SUPABASE_SERVICE_ROLE_KEY` hanya di server.** Tidak boleh ada di kode klien, variabel `NEXT_PUBLIC_*`, atau log. Dipakai hanya untuk membuat akun pemilik/kasir dan tugas admin.
3. **Uang disimpan sebagai integer rupiah.** Tidak ada float, tidak ada desimal. Format tampilan lewat satu helper (`formatRupiah`).
4. **Harga di transaksi disalin, bukan dirujuk.** `sale_items` menyimpan `product_name`, `sell_price`, `cost_price` saat transaksi, sehingga laporan lama tidak berubah saat harga produk diedit.
5. **Stok dihitung dari `stock_movements`**, tidak diedit sebagai angka tunggal. Penjualan, pembatalan, penambahan, dan penyesuaian semuanya menjadi baris pergerakan stok.
6. **Transaksi tidak dihapus, hanya dibatalkan** (`status = 'void'`) dan stok dikembalikan lewat pergerakan stok.
7. **Penjualan dibuat lewat satu fungsi RPC `create_sale`** yang atomik (sales + sale_items + stock_movements dalam satu transaksi) dan idempotent terhadap `sales.id`.
8. **Kasir tidak boleh melihat** harga modal, pengeluaran, atau laporan laba, dijaga di database (view khusus kasir + RLS), bukan hanya disembunyikan di UI.
9. **Pendaftaran publik Supabase Auth dimatikan.** Akun hanya dibuat lewat server.
10. **Masa aktif dipaksa di database.** Insert pada `sales`, `products`, `expenses` ditolak oleh RLS bila UMKM tidak aktif (`umkm_is_active()`). UMKM kedaluwarsa tetap bisa login, melihat, dan mengekspor data.

## 4. Peran dan Hak Akses

| Peran | Akses |
|---|---|
| `admin` | Tabel `umkm` dan `profiles`, view ringkasan agregat. Tidak membaca detail transaksi UMKM. |
| `owner` | Semua data UMKM-nya, termasuk laporan, pengeluaran, dan kelola kasir. |
| `cashier` | Baca produk dan stok (tanpa harga modal), buat penjualan, baca penjualan miliknya. |

Batas satu owner dan satu cashier per UMKM dijaga lewat indeks unik parsial di `profiles`.

## 5. Struktur Folder (acuan)

```
src/
  app/
    (auth)/login/
    (admin)/admin/           # dashboard admin
    (app)/                   # area owner & cashier
      kasir/
      penjualan/
      produk/
      stok/
      pengeluaran/
      laporan/
      pengaturan/
    api/                     # route handler server-only
  components/                # komponen UI umum
  features/<fitur>/          # logika per fitur (actions, queries, schema, komponen)
  lib/
    supabase/                # client browser, server, admin (service role)
    offline/                 # dexie db, outbox, sync
    format.ts                # formatRupiah, tanggal Asia/Jakarta
    auth.ts                  # ambil profil, cek role
supabase/
  migrations/                # SQL berurutan, jangan edit migration lama
  seed.sql
```

Kode per fitur ditaruh di `features/`, bukan disebar di `app/`. Halaman di `app/` tipis: ambil data, panggil komponen.

## 6. Konvensi Kode

- TypeScript strict, tanpa `any`. Pakai tipe hasil generate Supabase (`supabase gen types`).
- Validasi semua input server (Server Action / Route Handler) dengan Zod. Jangan percaya data dari klien, termasuk `umkm_id`; ambil dari profil pengguna di server.
- Nama kolom database dan identifier kode dalam bahasa Inggris (`umkm_id`, `sell_price`). Teks yang tampil ke pengguna dalam bahasa Indonesia.
- Waktu disimpan sebagai `timestamptz`, ditampilkan dalam zona Asia/Jakarta. `sold_at` memakai waktu perangkat; `synced_at` waktu server.
- Komponen Server secara default; Client Component hanya bila perlu interaksi.
- Jangan menulis komentar yang hanya mengulang kode. Komentar untuk menjelaskan alasan.
- Satu perubahan, satu tujuan. Jangan merapikan file yang tidak terkait dengan tugas.
- Migration baru untuk setiap perubahan skema. Jangan mengedit migration yang sudah ada.

## 7. Database dan RLS

Tabel: `umkm`, `profiles`, `categories`, `products`, `stock_movements`, `sales`, `sale_items`, `expenses`.

- Fungsi bantu: `current_umkm_id()`, `current_role()`, `umkm_is_active()`.
- Setiap tabel data usaha: RLS aktif, kebijakan berbasis `umkm_id = current_umkm_id()`, dipisah per perintah (select/insert/update/delete) dan per role.
- Kasir memakai view produk tanpa `cost_price`.
- Uji RLS untuk setiap tabel baru: owner UMKM A tidak boleh membaca atau menulis data UMKM B; kasir tidak boleh membaca `expenses`; UMKM kedaluwarsa tidak boleh insert.
- Nomor invoice unik per UMKM (`unique (umkm_id, invoice_no)`).

## 8. Offline dan Sinkronisasi (halaman Kasir saja)

- PWA: service worker menyimpan cache aplikasi; manifest agar bisa di-install.
- IndexedDB (Dexie) menyimpan salinan produk dan antrean transaksi (outbox).
- ID transaksi (`sales.id`) dibuat di perangkat sebagai UUID. Server menyimpan dengan `on conflict do nothing`, sehingga pengiriman ulang aman.
- Sinkron otomatis saat koneksi kembali. Tampilkan status per transaksi (menunggu, terkirim, gagal) dan tombol coba ulang.
- Stok bisa menjadi negatif setelah sinkron (penjualan offline bersamaan). Terima transaksinya, hitung ulang stok, tandai produk bernilai negatif untuk disesuaikan pemilik.
- Jangan membuat fitur lain (laporan, pengeluaran, pengaturan) bergantung pada offline.

## 9. UI dan Desain

- **Mobile-first.** Rancang untuk layar HP dulu (lebar ~360px), baru layar besar. Area sentuh minimal 44px. Halaman Kasir harus bisa dipakai dengan satu tangan.
- Ikuti `design.md` untuk palet, tipografi, komponen, dan aturan anti tampilan generik hasil AI. Jangan membuat keputusan visual yang bertentangan dengannya. Bila `design.md` belum ada, tanyakan, jangan memakai gaya templat bawaan.
- Teks antarmuka: bahasa Indonesia, singkat, bahasa sehari-hari yang dipahami pemilik warung. Hindari istilah teknis.
- Setiap layar punya keadaan kosong, memuat, dan galat yang dirancang, bukan layar putih.
- Angka uang rata kanan dan memakai font angka tabular.

## 10. Keamanan

- Jangan mencatat (log) password, token, atau data pelanggan.
- Cek role dan kepemilikan UMKM di server untuk setiap aksi, selain RLS.
- Password awal akun dibuat acak, wajib diganti saat login pertama.
- Unggahan foto produk: batasi tipe dan ukuran, simpan di bucket per `umkm_id`, dengan kebijakan storage yang sesuai.
- Jangan commit `.env*`. Sediakan `.env.example` tanpa nilai rahasia.

## 11. Cara Bekerja

1. Baca PRD dan bagian terkait di file ini sebelum mulai.
2. Untuk tugas besar, tulis rencana singkat (file yang akan diubah, migration yang dibutuhkan) lalu kerjakan.
3. Jalankan `lint`, `typecheck`, dan tes sebelum menyatakan selesai. Jangan menyatakan "selesai" bila ada yang gagal.
4. Perubahan skema: tulis migration, perbarui tipe, tulis atau perbarui tes RLS.
5. Bila persyaratan ambigu atau bertentangan dengan Aturan Emas, berhenti dan tanyakan.
6. Di akhir tugas, laporkan: apa yang diubah, apa yang diuji, apa yang belum.

## 12. Larangan

- Jangan mematikan RLS, membuat kebijakan `using (true)`, atau memakai service role untuk menyiasati masalah akses di sisi pengguna.
- Jangan menambah fitur di luar MVP (utang piutang, multi-cabang, banyak kasir, payment gateway) tanpa persetujuan.
- Jangan mengubah data produksi atau menjalankan migration ke produksi tanpa izin.
- Jangan menghapus data transaksi, hanya batalkan (void).
- Jangan menaruh logika bisnis penting (hitung total, kurangi stok) hanya di klien; server/database adalah penentu akhir.

## 13. Urutan Pengerjaan (acuan dari PRD)

1. Fondasi: skema, RLS, auth, dashboard admin (tambah UMKM dan akun pemilik).
2. Inti online: produk, kategori, stok, kasir, riwayat penjualan.
3. Pengeluaran, laporan omzet dan laba, ekspor Excel/PDF.
4. Akun kasir, struk, bagikan lewat WhatsApp.
5. Offline: PWA, IndexedDB, antrean, sinkronisasi.
6. Uji isolasi data, uji coba dengan 1–2 UMKM nyata, perbaikan.

Kerjakan berurutan; jangan mulai tahap berikutnya sebelum RLS tahap sebelumnya teruji.
