# PRD ZeniPOS — Aplikasi Pencatatan Penjualan UMKM

Nama proyek sementara: ZeniPOS. Dokumen ini merangkum keputusan produk, alur, fitur MVP, dan rancangan database untuk layanan pencatatan penjualan multi-UMKM.

## 1. Ringkasan

Layanan web (PWA) untuk pencatatan penjualan yang dipakai banyak UMKM. Admin (penyedia layanan) mendaftarkan UMKM yang sudah membayar, lalu pemilik UMKM mengelola produk, mencatat penjualan, mencatat pengeluaran, dan melihat laporan omzet serta laba. Setiap UMKM memiliki data yang terpisah penuh dari UMKM lain.

**Model bisnis:** berbayar. Calon pelanggan menghubungi admin lewat chat terlebih dahulu, admin yang menawarkan dan mendaftarkan akun. Tidak ada pendaftaran terbuka untuk umum.

**Pengguna utama:** pemilik dan kasir UMKM yang sebagian besar memakai HP, sehingga tampilan harus mobile-first dan fitur kasir harus bisa berjalan offline.

## 2. Tujuan dan Non-tujuan

**Tujuan MVP**

- UMKM bisa mencatat penjualan harian dengan cepat dari HP, termasuk saat internet putus.
- Pemilik bisa melihat omzet, pengeluaran, dan laba tanpa menghitung manual.
- Data antar-UMKM terisolasi dan aman.
- Admin bisa mengelola daftar UMKM dan masa aktif langganan dari satu dashboard.

**Bukan tujuan MVP**

- Payment gateway otomatis (pembayaran langganan dilakukan manual lewat chat).
- Pendaftaran mandiri oleh UMKM.
- Lebih dari satu kasir per UMKM.
- Offline penuh untuk semua fitur (offline hanya untuk fitur kasir).
- Integrasi marketplace, multi-cabang, dan manajemen karyawan.

## 3. Peran dan Hak Akses

| Peran | Dibuat oleh | Hak akses |
| --- | --- | --- |
| Admin | Dibuat manual (seed) | Kelola UMKM (tambah, ubah, aktif/nonaktif, perpanjang masa aktif), buat akun pemilik, lihat ringkasan semua UMKM |
| Pemilik (owner) | Admin | Semua fitur milik UMKM-nya: produk, stok, penjualan, pengeluaran, laporan, kelola akun kasir |
| Kasir (cashier) | Pemilik | Lihat produk dan stok, catat penjualan, lihat riwayat penjualan miliknya. Tidak bisa melihat laporan laba, pengeluaran, atau harga modal |

Aturan khusus: satu UMKM memiliki tepat satu pemilik dan maksimal satu kasir. Batas ini dijaga di database, bukan hanya di tampilan.

Keputusan yang perlu dikonfirmasi: apakah admin boleh melihat detail transaksi UMKM atau hanya ringkasan (jumlah transaksi, status akun). Default PRD ini: admin hanya melihat ringkasan, demi privasi data pelanggan.

## 4. Alur Utama

**Onboarding UMKM**

1. Calon pelanggan chat admin dan menyepakati paket serta pembayaran.
2. Admin membuat UMKM baru di dashboard (nama usaha, nama pemilik, nomor HP, masa aktif).
3. Admin membuat akun login pemilik (email dan password awal), lalu mengirimkannya ke pemilik.
4. Pemilik login pertama kali, mengganti password, dan mengisi produk.
5. Pemilik menambahkan akun kasir (satu orang) bila diperlukan.

**Mencatat penjualan (kasir atau pemilik)**

1. Buka halaman Kasir, pilih produk (ketuk produk atau cari nama).
2. Atur jumlah, lihat total otomatis.
3. Pilih metode bayar (tunai, transfer, QRIS), isi uang diterima bila tunai, sistem hitung kembalian.
4. Simpan. Stok berkurang otomatis, struk bisa dicetak atau dibagikan lewat WhatsApp.
5. Jika offline, transaksi masuk antrean lokal dan dikirim otomatis saat internet kembali.

**Perpanjangan langganan**

1. UMKM chat admin dan membayar.
2. Admin memperbarui tanggal `active_until` di dashboard.
3. Akun kembali aktif penuh.

## 5. Fitur MVP

### 5.1 Produk dan Stok

- CRUD produk: nama, kategori, harga jual, harga modal, foto (opsional), status aktif.
- Opsi lacak stok per produk (jasa atau produk tanpa stok bisa dimatikan pelacakannya).
- Stok awal saat produk dibuat, penyesuaian stok manual dengan catatan alasan (misalnya barang rusak atau stok opname).
- Penambahan stok (barang masuk).
- Peringatan stok menipis berdasarkan batas minimum per produk.
- Stok dihitung dari riwayat pergerakan stok, bukan angka yang diedit langsung.

### 5.2 Pencatatan Penjualan

- Halaman kasir mobile-first dengan daftar produk, pencarian, dan keranjang.
- Metode bayar: tunai, transfer, QRIS (pencatatan saja, tanpa integrasi pembayaran).
- Nomor invoice otomatis per UMKM.
- Riwayat transaksi dengan filter tanggal dan metode bayar.
- Pembatalan transaksi oleh pemilik (stok dikembalikan, tercatat sebagai pembatalan, bukan dihapus).
- Harga jual dan harga modal disimpan sebagai salinan di tiap item transaksi, sehingga laporan lama tidak berubah saat harga produk diubah.

### 5.3 Pengeluaran

- Catat pengeluaran: tanggal, kategori (bahan baku, gaji, listrik, sewa, lainnya), nominal, catatan.
- Daftar dan filter pengeluaran per periode.
- Hanya pemilik yang bisa mengakses.

### 5.4 Laporan Omzet dan Laba

- Ringkasan hari ini, 7 hari, bulan ini, dan rentang tanggal bebas.
- Omzet (total penjualan), laba kotor (penjualan dikurangi modal), pengeluaran, dan laba bersih (laba kotor dikurangi pengeluaran).
- Produk terlaris dan grafik penjualan harian.
- Ekspor ke Excel atau PDF.
- Hanya pemilik yang bisa mengakses.

### 5.5 Struk

- Tampilan struk per transaksi (nama usaha, item, total, metode bayar, waktu).
- Bagikan lewat WhatsApp (tautan atau teks) dan cetak lewat browser. Printer thermal Bluetooth dijadwalkan setelah MVP.

### 5.6 Dashboard Admin

- Daftar UMKM dengan status (aktif, nonaktif, kedaluwarsa) dan tanggal berakhir.
- Tambah UMKM dan buat akun pemilik.
- Perpanjang masa aktif, nonaktifkan atau aktifkan akun.
- Reset password pemilik.
- Penanda UMKM yang akan berakhir dalam 7 hari.

## 6. Aturan Masa Aktif

- Status `active`: semua fitur berjalan.
- Status `expired` atau `inactive`: pengguna masih bisa login, melihat data, dan mengekspor laporan, tetapi tidak bisa membuat transaksi, produk, atau pengeluaran baru.
- Aturan ini dipaksa di database lewat RLS, bukan hanya disembunyikan di tampilan.
- Banner pengingat tampil di aplikasi pemilik ketika masa aktif tersisa 7 hari atau kurang.

## 7. Offline dan Sinkronisasi

**Cakupan offline:** hanya halaman Kasir. Yang bisa dilakukan offline: melihat daftar produk dan stok terakhir, mencatat penjualan, melihat transaksi yang belum terkirim. Laporan, pengeluaran, dan pengaturan memerlukan internet.

**Pendekatan teknis**

- PWA: service worker untuk cache aplikasi, manifest agar bisa di-install ke layar HP.
- IndexedDB (misalnya lewat Dexie) menyimpan salinan produk dan antrean transaksi (outbox).
- Setiap transaksi diberi UUID dari perangkat. Server menyimpan dengan perintah idempotent (`on conflict do nothing`), sehingga pengiriman ulang tidak membuat transaksi ganda.
- Waktu transaksi (`sold_at`) memakai waktu perangkat saat transaksi dibuat, bukan waktu sinkron.
- Sinkron berjalan otomatis saat koneksi kembali, dengan indikator status (menunggu, terkirim, gagal) dan tombol coba ulang.
- Daftar produk disegarkan dari server setiap kali online.

**Konflik stok:** jika pemilik dan kasir menjual produk yang sama saat offline, stok bisa menjadi negatif setelah sinkron. Perilaku yang dipilih: transaksi tetap diterima (penjualan sudah terjadi), stok dihitung ulang dari seluruh pergerakan stok, dan produk dengan stok negatif ditandai agar pemilik melakukan penyesuaian.

## 8. Rancangan Database (Supabase / PostgreSQL)

Semua tabel data usaha memiliki kolom `umkm_id` sebagai kunci isolasi antar-UMKM.

### Tabel

**umkm**

- `id` uuid (pk)
- `name` text
- `owner_name` text
- `phone` text
- `address` text (opsional)
- `status` text (`active`, `inactive`, `expired`)
- `active_until` date
- `created_at` timestamptz

**profiles** (satu baris per akun login, id sama dengan `auth.users.id`)

- `id` uuid (pk, referensi `auth.users`)
- `umkm_id` uuid (null untuk admin)
- `role` text (`admin`, `owner`, `cashier`)
- `full_name` text
- `is_active` boolean
- Indeks unik parsial: satu `owner` per `umkm_id`, satu `cashier` per `umkm_id`.

**categories**

- `id`, `umkm_id`, `name`

**products**

- `id`, `umkm_id`, `category_id`
- `name`, `sell_price`, `cost_price`
- `photo_url` (opsional)
- `track_stock` boolean, `min_stock` integer
- `is_active` boolean

**stock\_movements**

- `id`, `umkm_id`, `product_id`
- `type` (`initial`, `purchase`, `sale`, `sale_void`, `adjustment`)
- `qty` integer bertanda (positif untuk masuk, negatif untuk keluar)
- `sale_id` (opsional), `note`, `created_by`, `created_at`
- Stok produk = jumlah `qty` per produk (disediakan lewat view atau fungsi).

**sales**

- `id` uuid (dibuat di perangkat, untuk idempotensi)
- `umkm_id`, `invoice_no`
- `total`, `payment_method` (`cash`, `transfer`, `qris`), `paid_amount`
- `status` (`completed`, `void`), `note`
- `sold_at` (waktu perangkat), `synced_at`, `created_by`

**sale\_items**

- `id`, `sale_id`, `umkm_id`, `product_id`
- `product_name` (salinan), `qty`
- `sell_price` (salinan), `cost_price` (salinan), `subtotal`

**expenses**

- `id`, `umkm_id`, `category`, `amount`, `note`, `spent_at`, `created_by`

### Relasi Singkat

`umkm` 1—N `profiles`, `products`, `categories`, `sales`, `expenses`. `products` 1—N `stock_movements`. `sales` 1—N `sale_items`.

## 9. Keamanan dan RLS

Row Level Security aktif di semua tabel. Dua fungsi bantu membaca profil pengguna yang sedang login: `current_umkm_id()` dan `current_role()`.

- **Pemilik:** baca dan tulis semua tabel dengan `umkm_id` sama dengan `current_umkm_id()`.
- **Kasir:** baca `products`, `categories`, dan stok; tambah `sales` serta `sale_items`; baca penjualan miliknya. Tidak punya akses ke `expenses`, laporan, dan kolom `cost_price`. Karena RLS bekerja per baris, penyembunyian `cost_price` untuk kasir dilakukan lewat view khusus kasir yang tidak memuat kolom tersebut.
- **Admin:** baca dan tulis `umkm` dan `profiles`; tidak punya akses langsung ke tabel penjualan, hanya ke view ringkasan agregat.
- **Masa aktif:** kebijakan insert pada `sales`, `products`, dan `expenses` memeriksa fungsi `umkm_is_active()`.
- Pembuatan akun pemilik dan kasir dilakukan di server (Route Handler Next.js dengan service role key), kunci tersebut tidak pernah dikirim ke browser.
- Pendaftaran publik Supabase Auth dimatikan.
- Penyimpanan penjualan dari perangkat melalui fungsi RPC `create_sale(...)` yang atomik: menyimpan `sales`, `sale_items`, dan `stock_movements` dalam satu transaksi.

## 10. Stack Teknis

- **Frontend:** Next.js (App Router), Tailwind, komponen UI mobile-first.
- **Backend dan database:** Supabase (Postgres, Auth, Storage, RLS).
- **Offline:** service worker dan manifest PWA, IndexedDB lewat Dexie.
- **Hosting:** Vercel untuk aplikasi, Supabase untuk data.
- **Ekspor:** Excel dan PDF dibuat di sisi server atau di browser.

## 11. Daftar Halaman

**Admin:** login, daftar UMKM, detail dan perpanjangan UMKM, buat UMKM baru.

**Pemilik:** dashboard ringkasan, kasir, riwayat penjualan, produk dan kategori, stok, pengeluaran, laporan, kelola kasir, profil usaha, ganti password.

**Kasir:** kasir, riwayat penjualan miliknya, daftar produk dan stok (hanya lihat).

## 12. Risiko dan Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Kebocoran data antar-UMKM | RLS di semua tabel, uji akses lintas-UMKM sebelum rilis |
| Transaksi ganda saat sinkron offline | UUID dari perangkat dan insert idempotent |
| Stok selisih akibat penjualan offline bersamaan | Stok dihitung dari pergerakan stok, penanda stok negatif |
| Penyimpanan IndexedDB terhapus oleh browser | Peringatan ke pengguna, sinkron sesering mungkin, tampilkan jumlah transaksi belum terkirim |
| Pengguna tidak bisa mengakses saat masa aktif habis | Mode baca dan ekspor tetap terbuka, banner pengingat sebelum berakhir |
| Waktu perangkat salah | Simpan juga `synced_at` dan tandai transaksi dengan selisih waktu yang tidak wajar |

## 13. Tahap Pengerjaan

1. **Fondasi:** skema database, RLS, auth, dashboard admin (tambah UMKM dan akun pemilik).
2. **Inti online:** produk, kategori, stok, kasir, riwayat penjualan.
3. **Laporan dan pengeluaran:** pengeluaran, laporan omzet dan laba, ekspor.
4. **Kasir dan struk:** akun kasir, struk, bagikan lewat WhatsApp.
5. **Offline:** PWA, IndexedDB, antrean dan sinkronisasi, uji koneksi putus-nyambung.
6. **Uji dan rilis:** uji isolasi data, uji coba dengan satu atau dua UMKM nyata, perbaikan.

## 14. Pertanyaan Terbuka

- Identitas visual ZeniPOS (logo dan palet warna), dan konfirmasi nama setelah domain, akun media sosial, dan merek dicek.
- Besar biaya dan durasi langganan (bulanan, tahunan).
- Apakah admin boleh melihat detail transaksi UMKM.
- Apakah perlu data pelanggan dan catatan utang piutang di versi berikutnya.
- Kapan printer thermal Bluetooth masuk jadwal.
