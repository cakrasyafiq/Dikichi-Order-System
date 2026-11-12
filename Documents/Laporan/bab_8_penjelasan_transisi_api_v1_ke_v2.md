# BAB 8. PENJELASAN TRANSISI DARI API VERSI 1.0 KE VERSI 2.0

Bab ini menjelaskan transisi kontrak antarmuka pemrograman aplikasi dari versi 1.0 (`/api/v1`) ke versi 2.0 (`/api/v2`) pada Dikichi Order Management Platform, mencakup latar belakang, batasan ruang lingkup, karakteristik *breaking change*, pemetaan medan data, serta strategi implementasi dan kompatibilitasnya.

---

## 8.1 Latar Belakang dan Alasan Pembaruan

Pada API versi 1.0, kontrak pesanan dirancang menggunakan skema datar (*flat schema*). Transisi ke versi 2.0 didorong oleh tiga alasan utama:

1. **Pemisahan Tanggung Jawab dan Pengelompokan Logis (*Domain Grouping*):**  
   Pada v1, identitas pemesan (`customerName`) dan lokasi meja (`outletId`, `tableCode`) ditempatkan bercampur di tingkat *root*. Versi 2.0 mengelompokkannya secara modular ke dalam sub-objek `customer` dan `location` agar payload lebih deskriptif dan fleksibel diekspansi (misal: kontak pemesan atau nomor lantai meja).
2. **Visibilitas dan Transparansi Transaksi Pembayaran (*Payment Visibility*):**  
   API v1 hanya mengekspos nominal tunggal `totalAmount` tanpa rincian status pascabayar. Kasir tidak dapat melihat metode bayar, uang yang diterima, maupun uang kembalian di respons API. Versi 2.0 memperkenalkan objek terpadu `paymentSummary` yang memuat `totalAmount`, `paymentStatus`, `paymentMethod`, `amountTendered`, dan `change`.
3. **Penerapan *Intentional Breaking Change* (Kebutuhan Akademik & G6):**  
   Memenuhi sasaran proyek untuk mendemonstrasikan perubahan kontrak mayor yang terencana dan terdokumentasi, sekaligus mengoperasikan kedua versi secara simultan (*side-by-side*) pada satu basis data yang sama.

---

## 8.2 Batasan Ruang Lingkup (Keputusan D4)

Berdasarkan *Decision Log* D4, **perubahan versi 2.0 hanya diterapkan pada resource Order**. Resource lain tidak mengalami perubahan struktur sehingga tetap dilayani di bawah `/api/v1` guna mencegah redundansi rute (*version bloat*):

* **Orders v2:** `/api/v2/orders/**` (*breaking change*, skema bersarang).
* **Orders v1:** `/api/v1/orders/**` (tetap aktif berdampingan untuk kompatibilitas mundur).
* **Katalog & Auth (v1):** `/api/v1/auth/**`, `/api/v1/outlets/**`, dan `/api/v1/menu-items/**` tetap di v1 dan digunakan bersama oleh ekosistem sistem.

---

## 8.3 Karakteristik *Breaking Change*

Perubahan pada v2 bersifat memutus kompatibilitas (*breaking*) jika klien v1 memanggil endpoint v2:

| Sisi | Kegagalan Klien v1 terhadap Antarmuka v2 | Dampak |
| :--- | :--- | :--- |
| **Response** | Klien membaca `customerName`, `outletId`, `tableCode`, `totalAmount` di *root*. | Bernilai `undefined`/`null`, tampilan UI kasir/pelanggan kosong atau `NaN`. |
| **Request** | Klien mengirim payload datar ke `POST` / `PUT /api/v2/orders`. | Ditolak server dengan kode HTTP `400 Bad Request` (`VALIDATION_ERROR`) karena objek `customer` dan `location` wajib ada. |

---

## 8.4 Pemetaan Medan (*Field Mapping Table*)

### 8.4.1 Request (`POST /orders`, `PUT /orders/{id}`)

| Medan v1 (Datar) | Medan v2 (Bersarang) | Tipe Data & Validasi | Keterangan |
| :--- | :--- | :--- | :--- |
| `outletId` | `location.outletId` | String (`^OUT-\d{2,}$`) | Dipindah ke objek `location` |
| `tableCode` | `location.tableCode` | String (`^T-\d{2,3}$`) | Dipindah ke objek `location` |
| `customerName` | `customer.name` | String (1–50 karakter) | Dipindah ke objek `customer` |
| `items[]` | `items[]` | Array of Object (1–30 baris) | **Tetap**: `{ menuItemId, quantity }` |

### 8.4.2 Response (Semua Endpoint Pengembalian Pesanan)

| Medan v1 | Medan v2 | Status & Penjelasan |
| :--- | :--- | :--- |
| `id`, `orderNumber`, `status` | `id`, `orderNumber`, `status` | Tetap |
| `customerName` | `customer.name` | Dipindahkan ke objek `customer` |
| `outletId`, `tableCode` | `location.outletId`, `location.tableCode` | Dipindahkan ke objek `location` |
| `totalAmount` | `paymentSummary.totalAmount` | Dipindahkan ke dalam `paymentSummary` |
| *(Tidak ada)* | `paymentSummary.paymentStatus` | **Baru**: `UNPAID` atau `PAID` |
| *(Tidak ada)* | `paymentSummary.paymentMethod` | **Baru**: `CASH`, `QRIS`, `CARD`, atau `null` |
| *(Tidak ada)* | `paymentSummary.amountTendered` | **Baru**: Uang diserahkan (khusus tunai, lainnya `null`) |
| *(Tidak ada)* | `paymentSummary.change` | **Baru**: Uang kembalian (khusus tunai, lainnya `null`) |
| `items[]`, `createdAt`, `updatedAt` | `items[]`, `createdAt`, `updatedAt` | Tetap |

---

## 8.5 Perbandingan *Payload* Berdampingan (*Side-by-Side*)

### 8.5.1 Request `POST /orders`

```json
// v1: POST /api/v1/orders (Datar)
{
  "outletId": "OUT-01",
  "tableCode": "T-01",
  "customerName": "Budi",
  "items": [{ "menuItemId": "11111111-0000-4000-8000-000000000001", "quantity": 2 }]
}

// v2: POST /api/v2/orders (Bersarang)
{
  "customer": { "name": "Budi" },
  "location": { "outletId": "OUT-01", "tableCode": "T-01" },
  "items": [{ "menuItemId": "11111111-0000-4000-8000-000000000001", "quantity": 2 }]
}
```

### 8.5.2 Response Pascapembayaran Tunai (`POST /orders/{id}/pay`)

```json
// v1: POST /api/v1/orders/{id}/pay (Tanpa info pembayaran)
{
  "id": "7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10",
  "orderNumber": "ORD-0042",
  "status": "PREPARING",
  "outletId": "OUT-01",
  "tableCode": "T-01",
  "customerName": "Budi",
  "items": [{ "menuItemId": "...", "name": "Mie Suit", "unitPrice": 25000, "quantity": 2, "subtotal": 50000 }],
  "totalAmount": 50000,
  "createdAt": "2026-11-12T10:00:00Z",
  "updatedAt": "2026-11-12T10:03:12Z"
}

// v2: POST /api/v2/orders/{id}/pay (Memuat paymentSummary terperinci)
{
  "id": "7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10",
  "orderNumber": "ORD-0042",
  "status": "PREPARING",
  "customer": { "name": "Budi" },
  "location": { "outletId": "OUT-01", "tableCode": "T-01" },
  "items": [{ "menuItemId": "...", "name": "Mie Suit", "unitPrice": 25000, "quantity": 2, "subtotal": 50000 }],
  "paymentSummary": {
    "totalAmount": 50000,
    "paymentStatus": "PAID",
    "paymentMethod": "CASH",
    "amountTendered": 60000,
    "change": 10000
  },
  "createdAt": "2026-11-12T10:00:00Z",
  "updatedAt": "2026-11-12T10:03:12Z"
}
```

---

## 8.6 Invarian dan Arsitektur Implementasi

1. **Komponen yang Tidak Berubah:** Mesin status pesanan (`PENDING` → `ACCEPTED` → `PREPARING` → `READY` → `COMPLETED`/`CANCELLED`), aturan otorisasi berbasis role/outlet JWT, format `ErrorResponse`, serta tabel basis data bersama (`orders`, `order_items`, `mock_payments`).
2. **Pemisahan Lapisan Server:**
   * **Domain Agnostik:** `OrderService` dan `PaymentService` mengelola logika bisnis murni tanpa ketergantungan pada versi HTTP.
   * **DTO & Mapper Terpisah:** Paket `dto.v1` (`OrderV1Mapper`) dan `dto.v2` (`OrderV2Mapper`) memetakan payload secara independen.
   * **Controller Tipis:** `OrderV1Controller` (`/api/v1/orders`) dan `OrderV2Controller` (`/api/v2/orders`) hanya bertugas menerima dan mendelegasikan request.
   * **DTO Bersama:** Sesuai keputusan D19, request untuk `PATCH /status` dan `POST /pay` menggunakan DTO bersama di `dto.common` karena strukturnya identik di kedua versi.
3. **Kebijakan Deprikasi (D19):** Versi 1.0 tetap aktif dan beroperasi berdampingan dengan v2 selama masa evaluasi tanpa header `Deprecation`/`Sunset`. Pesanan yang dibuat melalui v1 dapat dikelola secara transparan melalui v2, begitu pula sebaliknya.
