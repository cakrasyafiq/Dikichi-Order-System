# Dikichi Order System

Backend platform pemesanan makanan berbasis layanan (Spring Boot, PostgreSQL, Docker Compose). Proyek mata kuliah Arsitektur Berbasis Layanan.

| Layanan | Port | Fungsi |
| :--- | :--- | :--- |
| gateway-service | 8080 (dipublikasikan) | Pintu masuk tunggal, validasi JWT, routing |
| catalog-service | 8081 (internal) | Outlet, meja, menu, login staf |
| order-service | 8082 (internal) | Pesanan dan pembayaran tiruan |
| catalog-db, order-db | 5432 (internal) | PostgreSQL 16, satu basis data per layanan |

Seluruh API diakses melalui gateway di `http://localhost:8080/api/v1`.

## Prasyarat

| Alat | Keterangan |
| :--- | :--- |
| Docker Desktop | Harus dalam keadaan menyala (Engine running) |
| Git Bash | Untuk menjalankan skrip uji. Ikut terpasang bersama Git for Windows |
| jq | Pembaca JSON untuk skrip uji. Pasang dengan `winget install jqlang.jq` lalu buka ulang terminal |

Java dan Maven tidak perlu dipasang. Proses build berjalan di dalam Docker.

## 1. Buat berkas `.env`

Berkas `.env` berisi kata sandi dan tidak ada di repositori (sengaja diabaikan Git). Buat sendiri di root proyek, sejajar dengan folder `Backend`. Jalankan di PowerShell:

```powershell
function New-Secret($n){ -join ((48..57)+(65..90)+(97..122) | Get-Random -Count $n | ForEach-Object {[char]$_}) }
$text = @"
CATALOG_DB_USER=catalog
CATALOG_DB_PASSWORD=$(New-Secret 24)
ORDER_DB_USER=orders
ORDER_DB_PASSWORD=$(New-Secret 24)
JWT_SECRET=$(New-Secret 48)
SEED_MASTER_PASSWORD=$(New-Secret 16)
SEED_CASHIER_PASSWORD=$(New-Secret 16)
SEED_KITCHEN_PASSWORD=$(New-Secret 16)
GHCR_OWNER=local
IMAGE_TAG=latest
"@
[System.IO.File]::WriteAllText((Join-Path $PWD ".env"), ($text -replace "`r`n","`n"))
Get-Content .env | ForEach-Object { ($_ -split "=")[0] + "=" + (($_ -split "=",2)[1]).Length + " karakter" }
```

Baris terakhir hanya menampilkan panjang tiap nilai. Semua harus lebih dari 0 karakter, dan `JWT_SECRET` minimal 32.

Cara manual: salin `.env.example` menjadi `.env`, lalu isi semua nilainya. Tidak ada nilai bawaan.

## 2. Jalankan sistem

Di PowerShell:

```powershell
cd Backend
docker compose --env-file ../.env up -d --build gateway-service
docker compose --env-file ../.env ps
```

- Build pertama sekitar 3 sampai 8 menit karena mengunduh citra dan dependensi.
- Tunggu sampai kelima kontainer (`catalog-db`, `order-db`, `catalog-service`, `order-service`, `gateway-service`) berstatus `healthy`.
- Jangan menjalankan `docker compose up` tanpa nama layanan. Layanan `frontend` membutuhkan folder `../Frontend` yang belum ada di repositori ini.

## 3. Jalankan skrip uji

Skrip ini bash, jadi harus dijalankan dari **Git Bash**, bukan PowerShell. Di VS Code, klik tanda panah di samping tombol `+` pada panel terminal, lalu pilih Git Bash.

```bash
cd Backend
chmod +x scripts/smoke-test.sh
./scripts/smoke-test.sh
```

Hasil yang benar ada di baris terakhir:

```
Result: 58 passed, 0 failed
```

Skrip membuat data uji (`OUT-99`, meja `T-21`, satu menu uji) lalu menghapusnya sendiri. ID outlet yang sudah dihapus tidak dapat dipakai lagi, sehingga skrip hanya boleh dijalankan **sekali** per basis data. Untuk mengulang, lakukan reset pada bagian berikut.

## 4. Jalankan uji unit

Di PowerShell, dari folder `Backend/order-service`:

```powershell
docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test -Dtest=OrderStateMachineTest
```

Hasil yang benar: `Tests run: 4, Failures: 0, Errors: 0` dan `BUILD SUCCESS`. Folder `target/` yang muncul tidak perlu dikumpulkan dan diabaikan Git.

## Reset dan berhenti

```powershell
cd Backend

# Reset total: hapus kontainer dan data basis data, lalu jalankan ulang
docker compose --env-file ../.env down -v
docker compose --env-file ../.env up -d --build gateway-service

# Berhenti tanpa menghapus data
docker compose --env-file ../.env down
```

Reset total wajib dilakukan setelah mengganti isi `.env` atau berkas migrasi, karena kata sandi basis data dan riwayat Flyway tersimpan di volume.

## Akun seed

Tiga akun dibuat otomatis oleh migrasi. Kata sandinya adalah nilai `SEED_*_PASSWORD` pada `.env` Anda.

| Username | Role | Outlet |
| :--- | :--- | :--- |
| master | MASTER | Semua |
| cashier | CASHIER | OUT-01 |
| kitchen | KITCHEN | OUT-01 |

Contoh login:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"cashier","password":"<SEED_CASHIER_PASSWORD>"}'
```

## Masalah umum

| Gejala | Penyebab dan solusi |
| :--- | :--- |
| `error during connect` atau `docker daemon` | Docker Desktop belum menyala. Buka aplikasinya dan tunggu sampai Engine running |
| `r : Cannot locate the history` | Memakai fungsi bernama `r`. Gunakan skrip pada bagian 1 yang memakai nama `New-Secret` |
| `required variable ... is missing` | `.env` belum ada atau salah lokasi. Pastikan berada di root proyek dan jalankan dengan `--env-file ../.env` |
| `jq: command not found` | Pasang jq (lihat prasyarat), lalu buka ulang terminal Git Bash |
| `$'\r': command not found` | Skrip berakhir baris CRLF. Jalankan `sed -i 's/\r$//' scripts/smoke-test.sh` di Git Bash |
| `[200~` muncul di perintah | Penanda tempel terbawa. Tempel perintah satu per satu, atau ketik manual |
| Kontainer `unhealthy` atau `exited` | Lihat log: `docker compose --env-file ../.env logs <nama-layanan> --tail 80` |
| Skrip uji gagal pada `POST outlet as MASTER` di percobaan kedua | `OUT-99` sudah pernah dibuat. Lakukan reset total |
| Port 8080 sudah dipakai | Tutup aplikasi lain yang memakai port tersebut, atau ubah pemetaan port gateway di `docker-compose.yml` |
| Gateway tidak `healthy` beberapa detik pertama | Normal. Layanan Spring butuh sekitar 30 sampai 60 detik. Jalankan `ps` lagi |

## Keamanan

- Jangan pernah meng-commit `.env`. Berkas itu sudah tercantum di `.gitignore`.
- Kalau `.env` pernah masuk repositori publik, anggap semua nilainya sudah bocor: buat ulang `.env` dengan nilai baru, lalu lakukan reset total.
- `JWT_SECRET` yang bocor memungkinkan orang membuat token palsu dengan role MASTER.

## Struktur repositori

```
Dikichi-Order-System/
  .env.example        contoh variabel (tanpa nilai)
  .gitignore
  Backend/
    docker-compose.yml
    scripts/smoke-test.sh
    gateway-service/
    catalog-service/
    order-service/
  Documents/          dokumen proyek
```
