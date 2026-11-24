# Dikichi Frontend

Website pemesanan Dikichi (React, Vite, TypeScript, Tailwind CSS). Semua panggilan API memakai alamat relatif `/api`, jadi browser selalu berada di satu origin dan gateway tidak membutuhkan CORS.

## Status pengerjaan

| Step | Isi                                                                                                      | Status                                 |
| :--- | :------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| 1    | Fondasi: build, desain token, logo, layout, klien API, Nginx, bukti rantai browser ke gateway ke catalog | Diimplementasikan, menunggu verifikasi |
| 2    | Halaman pelanggan `/order` sesuai desain, keranjang, kirim order v1 dan v2, layar konfirmasi             | Diimplementasikan, menunggu verifikasi |
| 3    | Login staf, sesi di `sessionStorage`, penjaga rute per peran, halaman sementara kasir, dapur, master     | Diimplementasikan, menunggu verifikasi |
| 4    | Dasbor kasir                                                                                             | Belum dimulai                          |
| 5    | Dasbor dapur                                                                                             | Belum dimulai                          |
| 6    | Dasbor master                                                                                            | Belum dimulai                          |

## Menjalankan seluruh sistem (backend dan frontend)

Prasyarat: berkas `.env` sudah dibuat di root proyek (lihat README utama) dan Docker Desktop menyala.

```bash
cd Backend
docker compose --env-file ../.env up -d --build
docker compose --env-file ../.env ps
```

Build pertama membutuhkan beberapa menit. Setelah semua kontainer `healthy`, buka `http://localhost/order?outlet=OUT-01&table=T-05` (simulasi QR). Hasil yang diharapkan: header ungu dengan logo Dikichi dan kartu "Dine In, Table T-05", kartu "Selected Kitchen" berisi `Dikichi Outlet 01`, menu per kategori dengan harga Rupiah, item habis berlabel "Sold out", dan kartu "Your Order" di sebelah kanan. Tambahkan dua item, isi nama, pilih versi `v1` atau `v2`, lalu "Place Order". Hasil yang diharapkan: layar konfirmasi dengan nomor order dan versi API yang dipakai, serta JSON respons server di bagian "Show server response".

Gambar menu diambil dari foto stok Unsplash yang sama dengan file desain, karena backend belum menyimpan foto. Tanpa internet, kotak gambar tampil kosong dan fitur lain tetap berjalan.

## Login staf (Step 3)

Buka `http://localhost/login` (alamat diketik langsung, tidak ada tautan di halaman pelanggan). Akun seed: `master`, `cashier`, `kitchen`. Password berasal dari `SEED_MASTER_PASSWORD`, `SEED_CASHIER_PASSWORD`, `SEED_KITCHEN_PASSWORD` di berkas `.env`.

Setelah login, pengguna diarahkan ke dasbor perannya: `/cashier`, `/kitchen`, atau `/master`. Membuka dasbor peran lain mengembalikan ke dasbor sendiri, dan tanpa login mengembalikan ke `/login`. Isi dasbor dibangun di Step 4 sampai 6, untuk sementara halaman menampilkan data sesi (username, peran, outlet, batas waktu) dan tombol "Sign out". Token berlaku 8 jam tanpa refresh, setelah itu pengguna keluar otomatis.

Penjaga rute hanya membentuk tampilan. Setiap endpoint tetap memeriksa peran dan outlet di server.

## Membagikan link ke orang lain (gratis, tanpa akun)

```bash
cloudflared tunnel --url http://localhost:80
```

Perintah ini menampilkan alamat `https://....trycloudflare.com`. Alamat berubah setiap tunnel dinyalakan ulang dan tidak ada jaminan uptime dari Cloudflare. Laptop harus tetap menyala dan Docker berjalan selama link dipakai. Hanya port 80 (Nginx) yang diteruskan, gateway tidak dibuka langsung.

## Pengembangan lokal

Backend harus sudah berjalan (gateway di `http://localhost:8080`).

```bash
cd Frontend
npm install
npm run dev
```

`npm install` pertama membuat `package-lock.json`. Commit berkas itu supaya build Docker dan CI memakai versi yang sama. Setelah install pertama, jalankan `npm run format` satu kali agar format berkas sesuai Prettier.

## Verifikasi

```bash
cd Frontend
node scripts/verify.mjs          # format, typecheck, lint, test, build
node scripts/verify.mjs --quick  # tanpa build produksi
```

Skrip berhenti di tahap pertama yang gagal. Tambahkan `--keep-going` untuk menjalankan semua tahap. Skrip tidak memasang dependensi dan tidak mengubah berkas.

## Struktur

- `src/components/layout` kerangka halaman (header, footer, layout).
- `src/components/ui` komponen kecil yang dipakai ulang (skeleton, pesan kosong dan galat).
- `src/features/<nama>` skema, pemanggilan API, hook, dan komponen per fitur.
- `src/lib/api` klien HTTP, pemetaan galat, dan pesan untuk pengguna.
- `src/constants` teks, rute, dan nilai statis.
- `nginx` konfigurasi server produksi: proxy `/api`, header keamanan, pembatas laju login.
