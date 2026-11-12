# BAB 9. DOKUMENTASI DAN SPESIFIKASI API VERSI 2.0 (GET, POST, PUT, DELETE, & PATCH)

Bab ini memuat dokumentasi dan spesifikasi resmi API versi 2.0 Dikichi Order Management Platform berbasis standar **OpenAPI 3.1.0**. Seluruh spesifikasi diselaraskan dengan PRD v1.1 (*Decision Log* D4 dan D15–D24), panduan migrasi Bab 8, serta implementasi gateway dan layanan mikro backend.

Kontrak OpenAPI versi 2.0 tersimpan pada berkas terpisah [`Documents/openapi-v2.yaml`](../openapi-v2.yaml), sedangkan kontrak versi 1.0 tetap dipelihara di `Documents/openapi.yaml`.

---

## 9.1 Ringkasan Arsitektur dan Konvensi API 2.0

### 9.1.1 Ruang Lingkup dan Server
* **Lingkup Pembaruan (Decision D4):** Perubahan kontrak v2 hanya diterapkan pada endpoint `/api/v2/orders/**`. Rute Auth, Outlet, Meja, dan Menu Items tidak berubah dan tetap dilayani di bawah awalan `/api/v1` sebagai bagian dari ekosistem API 2.0.
* **Server Target:**
  1. API Gateway: `http://localhost:8080` (Docker Compose lokal)
  2. Nginx Frontend: `http://localhost` (proxy `/api` ke gateway, origin tunggal)
* **Format & Nilai:** Payload `application/json`, waktu berformat ISO-8601 UTC, dan nominal mata uang berupa integer Rupiah tanpa desimal.
* **Autentikasi:** Menggunakan HTTP Bearer JWT (HS256, masa aktif 8 jam) dari `POST /api/v1/auth/login`. Gateway mengekstrak klaim dan meneruskannya via header internal `X-User-Name`, `X-User-Role`, dan `X-Outlet-Id`.

### 9.1.2 Matriks Hak Akses Endpoint

| Metode | Pola Path | Akses | Kode Sukses | Keterangan |
| :--- | :--- | :--- | :---: | :--- |
| **POST** | `/api/v2/orders` | Publik | 201 | Pembuatan pesanan (kontrak bersarang v2) |
| **GET** | `/api/v2/orders` | Cashier, Kitchen | 200 | Antrean pesanan (filter status & outlet sendiri) |
| **GET** | `/api/v2/orders/{id}` | Cashier, Kitchen | 200 | Detail pesanan outlet sendiri |
| **PUT** | `/api/v2/orders/{id}` | Cashier | 200 | Penggantian pesanan (status `PENDING` saja) |
| **PATCH**| `/api/v2/orders/{id}/status` | Cashier, Kitchen | 200 | Perubahan status / pembatalan (`CANCELLED`) |
| **POST** | `/api/v2/orders/{id}/pay` | Cashier | 200 | Pembayaran tiruan (khusus `ACCEPTED` → `PREPARING`) |
| **POST** | `/api/v1/auth/login` | Publik | 200 | Login staf & penerbitan token JWT |
| **GET** | `/api/v1/outlets/**` | Publik | 200 | Daftar dan detail outlet aktif |
| **POST/PUT/DELETE** | `/api/v1/outlets/**` | Master | 201 / 200 / 204 | CRUD outlet (*soft delete*) |
| **GET** | `/api/v1/outlets/{id}/tables` | Publik | 200 | Daftar meja per outlet |
| **POST/DELETE** | `/api/v1/outlets/{id}/tables/**` | Master | 201 / 204 | Buat & *soft delete* meja (tanpa PUT, D6) |
| **GET** | `/api/v1/menu-items/**` | Publik | 200 | Daftar & detail menu (termasuk status ketersediaan) |
| **POST/PUT/DELETE** | `/api/v1/menu-items/**` | Master | 201 / 200 / 204 | CRUD item menu (*soft delete*) |
| **PATCH**| `/api/v1/menu-items/{id}/availability` | Master, Cashier, Kitchen | 200 | Toggle ketersediaan menu (staf: outlet sendiri) |

---

## 9.2 Skema Data Utama Versi 2.0

### 9.2.1 `V2OrderRequest` (Body untuk POST dan PUT Pesanan)
```yaml
V2OrderRequest:
  type: object
  required: [customer, location, items]
  properties:
    customer:
      type: object
      required: [name]
      properties:
        name: { type: string, minLength: 1, maxLength: 50 }
    location:
      type: object
      required: [outletId, tableCode]
      properties:
        outletId: { type: string, pattern: '^OUT-\d{2,}$' }
        tableCode: { type: string, pattern: '^T-\d{2,3}$' }
    items:
      type: array
      minItems: 1
      maxItems: 30
      items:
        type: object
        required: [menuItemId, quantity]
        properties:
          menuItemId: { type: string, format: uuid }
          quantity: { type: integer, minimum: 1, maximum: 99 }
```

### 9.2.2 `V2OrderResponse` (Respons Detail Pesanan)
```yaml
V2OrderResponse:
  type: object
  required: [id, orderNumber, status, customer, location, items, paymentSummary, createdAt, updatedAt]
  properties:
    id: { type: string, format: uuid }
    orderNumber: { type: string, pattern: '^ORD-\d{4,}$' }
    status: { type: string, enum: [PENDING, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED] }
    customer: { $ref: '#/components/schemas/V2Customer' }
    location: { $ref: '#/components/schemas/V2Location' }
    items:
      type: array
      items:
        type: object
        required: [menuItemId, name, unitPrice, quantity, subtotal]
        properties:
          menuItemId: { type: string, format: uuid }
          name: { type: string }
          unitPrice: { type: integer }
          quantity: { type: integer }
          subtotal: { type: integer, format: int64 }
    paymentSummary:
      type: object
      required: [totalAmount, paymentStatus, paymentMethod, amountTendered, change]
      properties:
        totalAmount: { type: integer, format: int64 }
        paymentStatus: { type: string, enum: [UNPAID, PAID] }
        paymentMethod: { type: string, enum: [CASH, QRIS, CARD], nullable: true }
        amountTendered: { type: integer, format: int64, nullable: true }
        change: { type: integer, format: int64, nullable: true }
    createdAt: { type: string, format: date-time }
    updatedAt: { type: string, format: date-time }
```

---

## 9.3 Spesifikasi Endpoint Berdasarkan Metode HTTP

### 9.3.1 Operasi GET

1. **`GET /api/v2/orders` (Antrean Pesanan):**  
   * Akses: `CASHIER`, `KITCHEN` (hanya pesanan outlet sendiri).
   * Parameter: `outletId` (opsional), `status` (opsional). Tanpa filter, kasir menerima status `PENDING` & `ACCEPTED`; dapur menerima `PREPARING` & `READY`.
   * Respons: `200 OK` (Array `V2OrderResponse`, terurut dari yang terlama).
2. **`GET /api/v2/orders/{orderId}` (Detail Pesanan):**  
   * Akses: `CASHIER`, `KITCHEN` (outlet sendiri). Pesanan historis yang dibuat via v1 tetap dapat dibaca di sini dan disajikan dalam bentuk v2.
   * Respons: `200 OK` (`V2OrderResponse`) / `404 NOT_FOUND`.
3. **`GET` Katalog Publik (`/api/v1/outlets/**`, `/api/v1/menu-items/**`):**  
   * Mengembalikan daftar dan detail outlet, meja, dan menu yang aktif (`is_deleted = false`). Item menu yang habis tetap muncul dengan atribut `available = false` agar UI dapat melabeli "Sold out" (D5).

---

### 9.3.2 Operasi POST

1. **`POST /api/v2/orders` (Buat Pesanan Tamu):**  
   * Akses: Publik tanpa autentikasi.
   * Alur: Validasi input → validasi integritas ke `catalog-service` (outlet, meja, keaktifan item) → snapshot harga & hitung total → simpan pesanan dengan status `PENDING` dan `paymentStatus: UNPAID`.
   * Respons: `201 Created` (`Location: /api/v2/orders/{id}`) dan body `V2OrderResponse`.
   * Penolakan: Body datar ala v1 ditolak HTTP `400 VALIDATION_ERROR`.
2. **`POST /api/v2/orders/{orderId}/pay` (Pencatatan Pembayaran):**  
   * Akses: `CASHIER` (outlet sendiri).
   * Prasyarat: Pesanan wajib berstatus `ACCEPTED`.
   * Body: `PaymentRequest` (`{ paymentMethod, amountTendered }`).
   * Logika Tunai (`CASH`): `amountTendered` wajib $\ge$ `totalAmount`. Server menghitung otomatis `change = amountTendered - totalAmount`.
   * Efek: Transisi status seketika menjadi `PREPARING` dan mengembalikan respons `200 OK` dengan `paymentSummary` lengkap. Pembayaran berulang menghasilkan `409 ORDER_ALREADY_PAID`.
3. **`POST` Entitas Lain:**  
   * `POST /api/v1/auth/login` (Login staf, mengembalikan JWT token).
   * `POST /api/v1/outlets`, `/tables`, `/menu-items` (Pembuatan entitas katalog oleh role `MASTER`).

---

### 9.3.3 Operasi PUT

1. **`PUT /api/v2/orders/{orderId}` (Penggantian Pesanan PENDING):**  
   * Akses: `CASHIER` (outlet sendiri).
   * Aturan: Hanya diizinkan untuk pesanan yang masih `PENDING` (D10). Nilai `location.outletId` tidak boleh diubah (`400 OUTLET_IMMUTABLE`, D16).
   * Efek: Memperbarui nama pelanggan, kode meja, daftar item, dan menghitung ulang total harga. Konflik konkurensi dicegah via *optimistic locking* (`409 CONCURRENT_MODIFICATION`).
2. **`PUT` Entitas Katalog:**  
   * `PUT /api/v1/outlets/{outletId}` (Perubahan nama & alamat outlet oleh `MASTER`).
   * `PUT /api/v1/menu-items/{menuItemId}` (Penggantian atribut menu termasuk status `available` oleh `MASTER`).
   * *Catatan:* Meja **tidak memiliki PUT** karena satu-satunya atribut yang dapat diubah adalah kodenya (D6).

---

### 9.3.4 Operasi DELETE dan Kebijakan Pembatalan Pesanan

1. **Operasi Soft-Delete Katalog:**  
   * `DELETE /api/v1/outlets/{outletId}`
   * `DELETE /api/v1/outlets/{outletId}/tables/{code}`
   * `DELETE /api/v1/menu-items/{menuItemId}`  
   * Akses: Khusus `MASTER`.
   * Karakteristik: Mengubah flag `is_deleted = true` dan mengembalikan respons `204 No Content`. Data tidak dihapus permanen agar integritas relasi historis terjaga. Pemanggilan `DELETE` ulang menghasilkan `404 NOT_FOUND` (D17).
2. **Ketiadaan Metode DELETE pada Resource Pesanan:**  
   * Pesanan adalah data transaksi finansial yang wajib diaudit sehingga **tidak boleh dihapus secara fisik maupun soft-delete**.
   * Pemanggilan `DELETE /api/v2/orders/{id}` menghasilkan HTTP `405 METHOD_NOT_ALLOWED`.
   * Pembatalan pesanan dilakukan melalui mesin status menggunakan `PATCH /api/v2/orders/{id}/status` dengan payload `{ "status": "CANCELLED" }` (hanya dapat dilakukan oleh `CASHIER` saat pesanan berstatus `PENDING` atau `ACCEPTED`).

---

### 9.3.5 Operasi PATCH Pendukung

1. **`PATCH /api/v2/orders/{orderId}/status`:**  
   * Mengubah status pesanan sesuai kewenangan role:
     * `CASHIER`: `PENDING` → `ACCEPTED`, `PENDING` → `CANCELLED`, `ACCEPTED` → `CANCELLED`.
     * `KITCHEN`: `PREPARING` → `READY`, `READY` → `COMPLETED`.
   * Evaluasi kesalahan berurutan: Otorisasi Role → Validasi Format → Cek Keberadaan Pesanan → Batas Outlet → Status Terlarang (`PENDING`/`PREPARING` via PATCH) → Validasi Transisi Mesin Status → Kunci Optimistik.
2. **`PATCH /api/v1/menu-items/{menuItemId}/availability`:**  
   * Mengubah status stok menu `{ "available": boolean }` secara instan oleh Master atau staf outlet terkait.

---

## 9.4 Format Penanganan Kesalahan (*Error Handling*)

Semua respons kesalahan (4xx dan 5xx) di seluruh layanan memiliki struktur seragam `ErrorResponse`:

```json
{
  "timestamp": "2026-11-12T10:00:00Z",
  "status": 409,
  "code": "ITEM_UNAVAILABLE",
  "message": "One or more items are unavailable",
  "path": "/api/v2/orders",
  "errors": [
    {
      "field": "items[0].menuItemId",
      "message": "Item is unavailable"
    }
  ]
}
```

Daftar kode kesalahan baku: `VALIDATION_ERROR` (400), `MALFORMED_REQUEST` (400), `DUPLICATE_MENU_ITEM` (400), `OUTLET_IMMUTABLE` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405), `ITEM_UNAVAILABLE` (409), `INVALID_STATUS_TRANSITION` (409), `ORDER_NOT_EDITABLE` (409), `ORDER_ALREADY_PAID` (409), `CONCURRENT_MODIFICATION` (409), `INVALID_OUTLET` / `TABLE` / `MENU_ITEM` (422), dan `CATALOG_UNAVAILABLE` (503).

---

## 9.5 Panduan Akses Spesifikasi Lengkap

Dokumentasi lengkap dalam format YAML OpenAPI 3.1.0 dapat diakses langsung pada berkas pendukung sistem:
* **Lokasi Berkas:** [`Documents/openapi-v2.yaml`](../openapi-v2.yaml)
* **Validasi & Visualisasi:** Dapat diimpor langsung ke Swagger Editor (https://editor.swagger.io) atau Swagger UI / Postman untuk eksplorasi interaktif terhadap 12 path dan 21 operasi API versi 2.0.
