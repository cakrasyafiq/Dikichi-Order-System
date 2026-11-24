# Feature Checklist (Frontend)

Status implementasi dan status verifikasi dipisah. Implementasi selesai tidak berarti sudah diuji, dan lulus uji teknis tidak berarti diterima dosen.

Status implementasi: PLANNED, IN PROGRESS, IMPLEMENTED, BLOCKED, DEFERRED.
Status verifikasi: NOT RUN, PARTIAL, PASS, FAIL, STALE.

| Fitur | Implementasi | Verifikasi | Catatan |
| :--- | :--- | :--- | :--- |
| Fondasi build (Vite, TypeScript strict, Tailwind, ESLint, Vitest) | IMPLEMENTED | NOT RUN | Dijalankan pengguna lewat `Frontend/scripts/verify.mjs` |
| Token desain dari `design_dikichi_order_system.html` | IMPLEMENTED | NOT RUN | Warna, radius, bayangan, font, dan titik putus responsif |
| Logo dan favicon | IMPLEMENTED | NOT RUN | Dibuat dari gambar logo yang diberikan |
| Header dan footer | IMPLEMENTED | NOT RUN | Kolom jam buka dan media sosial menunggu data nyata |
| Klien API (timeout, pemetaan galat, validasi Zod) | IMPLEMENTED | NOT RUN | 6 tes unit ditulis, belum dijalankan |
| Kartu outlet terpilih (loading, kosong, galat, ulang, pilih cabang) | IMPLEMENTED | NOT RUN | 5 tes komponen ditulis, belum dijalankan |
| Nginx (proxy `/api`, header keamanan, batas laju login) | IMPLEMENTED | NOT RUN | Batas laju di luar PRD (non-goal), mudah dihapus |
| Halaman pelanggan `/order` (promo, highlight, menu per kategori, langkah) | IMPLEMENTED | NOT RUN | Step 2, mengikuti desain dengan penyesuaian data backend |
| Pilih outlet dan meja (parameter QR `outlet` dan `table`, atau manual) | IMPLEMENTED | NOT RUN | Meja yang tidak dikenal memunculkan pesan |
| Keranjang (batas 99 per item, 30 baris) | IMPLEMENTED | NOT RUN | 6 tes unit dan 3 tes komponen ditulis |
| Kirim order v1 dan v2 dengan toggle demo | IMPLEMENTED | NOT RUN | Galat field server dipetakan ke form |
| Item habis: tombol Sold out dan penanganan 409 ITEM_UNAVAILABLE | IMPLEMENTED | NOT RUN | Menu dimuat ulang dan item habis dihapus dari keranjang |
| Layar konfirmasi (nomor order, versi API, respons server) | IMPLEMENTED | NOT RUN | Struk satu-satunya karena pelanggan tidak bisa GET order |
| Tes integrasi alur pesan tamu | IMPLEMENTED | NOT RUN | `src/pages/OrderPage.test.tsx`, belum dijalankan |
| Halaman `/login` (validasi form, galat 401 generik, batas laju 429) | IMPLEMENTED | NOT RUN | Step 3, input tidak hilang saat login gagal |
| Sesi staf di `sessionStorage` (kedaluwarsa 8 jam, keluar otomatis, sign out) | IMPLEMENTED | NOT RUN | Step 3, token dikirim hanya pada panggilan `authenticated` |
| Penjaga rute per peran (`/cashier`, `/kitchen`, `/master`) | IMPLEMENTED | NOT RUN | Step 3, peran salah diarahkan ke dasbor sendiri |
| Halaman sementara dasbor kasir, dapur, master | IMPLEMENTED | NOT RUN | Isi dasbor menunggu Step 4 sampai 6 |
| Tes login, sesi, penjaga rute, header Authorization | IMPLEMENTED | NOT RUN | 5 berkas tes baru, belum dijalankan |
| Dasbor kasir | PLANNED | NOT RUN | Step 4 |
| Dasbor dapur | PLANNED | NOT RUN | Step 5 |
| Dasbor master | PLANNED | NOT RUN | Step 6 |
