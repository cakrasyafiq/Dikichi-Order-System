# BAB 13. KESIMPULAN

Bab ini merangkum seluruh proses pengembangan **Food Order REST API** (Dikichi Order Management Platform) oleh Tim Ambatucode, mulai dari perumusan masalah hingga pengujian API versi 2.0, beserta kesimpulan, keterbatasan, dan saran pengembangan.

## 13.1 Ringkasan Proses Pengembangan

| Tahap | Bab | Hasil Utama |
| :--- | :--- | :--- |
| Latar belakang dan motivasi | 1 | Antrean pemesanan dine-in pada outlet Dikichi dirumuskan sebagai masalah, dengan usulan platform pengelolaan pesanan berbasis REST API yang memungkinkan pelanggan memesan langsung dari meja |
| Spesifikasi API v1.0 | 2 dan 3 | Kontrak OpenAPI 3.1.0 untuk 12 operasi GET dan POST serta 8 operasi PUT, PATCH, dan DELETE melalui API gateway, dengan autentikasi JWT (HS256, masa berlaku 8 jam) dan tiga role: MASTER, CASHIER, dan KITCHEN |
| Implementasi API v1.0 | 4 dan 5 | Tiga layanan, yaitu gateway-service (port 8080), catalog-service (port 8081), dan order-service (port 8082), pada Java 21 dan Spring Boot 4.0.7, dengan dua basis data PostgreSQL 16, migrasi Flyway, dan Docker Compose |
| Pengujian API v1.0 | 6 dan 7 | 103 uji unit (47 pada order-service dan 56 pada catalog-service) serta Newman dengan 60 request dan 262 asersi (GET dan POST) dan 90 request dan 375 asersi (PUT, PATCH, dan DELETE), seluruhnya tanpa kegagalan |
| Transisi ke API v2.0 | 8 | Perubahan kontrak yang disengaja (breaking change) pada resource Order, yaitu skema bersarang (customer dan location) dan objek paymentSummary, dengan v1 tetap aktif berdampingan (Keputusan D4) |
| Spesifikasi API v2.0 | 9 | Kontrak OpenAPI 3.1.0 yang mencakup 12 path dan 21 operasi |
| Implementasi API v2.0 | 10 dan 11 | Pemetaan POST, GET, PUT, dan PATCH pada /api/v2/orders yang memakai aturan bisnis bersama v1, sedangkan DELETE pada pesanan sengaja tidak dipetakan dan dijawab 405 METHOD_NOT_ALLOWED |
| Pengujian API v2.0 | 12 | 70 uji unit pada order-service serta Newman dengan 37 request dan 167 asersi (GET dan POST) dan 55 request dan 250 asersi (PUT, PATCH, dan DELETE), seluruhnya tanpa kegagalan |

## 13.2 Hasil Pengujian Keseluruhan

Seluruh pengujian API yang dilaporkan pada Bab 6, Bab 7, dan Bab 12 berjalan tanpa kegagalan. Tabel berikut merangkum hasil uji API (Newman) kedua versi.

| Koleksi Newman | Request | Asersi | Gagal |
| :--- | :--- | :--- | :--- |
| API v1.0 GET dan POST (Bab 6) | 60 | 262 | 0 |
| API v1.0 PUT, PATCH, dan DELETE (Bab 7) | 90 | 375 | 0 |
| API v2.0 GET dan POST (Bab 12) | 37 | 167 | 0 |
| API v2.0 PUT, PATCH, dan DELETE (Bab 12) | 55 | 250 | 0 |
| Total | 242 | 1.054 | 0 |

Pada tingkat uji unit, API v1.0 diverifikasi oleh 103 uji pada dua layanan, sedangkan API v2.0 diverifikasi oleh 70 uji pada order-service. Angka pada setiap tahap dilaporkan sesuai eksekusi pada bab terkait dan tidak dijumlahkan lintas tahap, karena sebagian uji dipakai bersama oleh kedua versi.

## 13.3 Kesimpulan

- **Tujuan proyek tercapai.** Proyek menghasilkan prototipe backend REST API untuk pemesanan dan pengelolaan pesanan dine-in Dikichi. Pelanggan dapat membuat pesanan dari meja tanpa autentikasi, kasir mengelola pembayaran dan status pesanan, dan dapur memproses pesanan sesuai alur status yang terdefinisi.

- **Arsitektur berbasis layanan terbukti memisahkan tanggung jawab.** Pemisahan gateway, katalog, dan pesanan dengan basis data masing-masing memudahkan penerapan otorisasi per role, validasi lintas layanan, dan evolusi versi tanpa mengubah layanan yang tidak terdampak.

- **Pengelolaan versi API berhasil dijalankan.** API v1 dan v2 berjalan berdampingan pada satu basis data. Perubahan kontrak dibatasi pada resource Order, didokumentasikan dengan pemetaan medan, dan diuji, termasuk pembuktian bahwa pesanan yang dibuat dan diubah melalui v2 tetap terbaca dalam bentuk datar melalui v1.

- **Aturan bisnis diterapkan konsisten dan terverifikasi.** Mesin status pesanan, hak akses per role dan outlet, validasi masukan, snapshot harga, dan format kesalahan yang seragam diuji pada dua lapisan, yaitu uji unit dan uji API terhadap sistem yang berjalan.

- **Dokumentasi, kode, dan pengujian saling selaras.** Setiap versi memiliki spesifikasi OpenAPI, implementasi, dan pengujian dengan keterlacakan dari endpoint ke kasus uji, sehingga perubahan pada satu bagian dapat ditelusuri dampaknya ke bagian lain.

## 13.4 Keterbatasan dan Saran Pengembangan

- **Pembayaran masih tiruan.** Pembayaran dicatat melalui mock_payment. Pengembangan berikutnya dapat mengintegrasikan penyedia pembayaran sungguhan beserta penanganan kegagalan dan pengembalian dana.

- **Pengujian non-fungsional belum dilakukan.** Pengujian beban, konkurensi (termasuk 409 CONCURRENT_MODIFICATION), dan ketahanan ketika catalog-service tidak tersedia (503) belum dilaporkan. Skenario tersebut disarankan sebagai langkah berikutnya.

- **Komunikasi antarlayanan bersifat sinkron.** Order-service memanggil catalog-service saat validasi pesanan. Pola ketahanan seperti *timeout*, *retry*, *circuit breaker*, atau *caching* katalog dapat dipertimbangkan untuk mengurangi ketergantungan antarlayanan.

- **Operasi dan otomatisasi.** Eksekusi uji pada laporan ini dijalankan secara manual. Pengujian otomatis pada alur integrasi berkelanjutan, pemantauan, dan pencatatan terpusat akan meningkatkan keandalan rilis.

- **Siklus hidup versi.** Dengan v2 tersedia, strategi penghentian bertahap v1 (komunikasi kepada klien, tenggat, dan pemantauan penggunaan) perlu ditetapkan sebelum v1 dapat dihapus.
