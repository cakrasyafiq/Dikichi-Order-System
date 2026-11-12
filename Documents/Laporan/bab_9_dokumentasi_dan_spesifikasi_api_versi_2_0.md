# BAB 9. DOKUMENTASI DAN SPESIFIKASI API VERSI 2.0 (GET, POST, PUT, & DELETE)

Bab ini memuat dokumentasi dan spesifikasi API versi 2.0 Dikichi Order Management Platform dalam format OpenAPI 3.1. Spesifikasi disusun dari dokumen produk (PRD v1.1, Decision Log D4 dan D15–D24), dokumen spesifikasi API, panduan migrasi v1 ke v2 yang dibahas pada Bab 8, serta kode sumber `catalog-service`, `order-service`, dan `gateway-service`. Pembahasan dikelompokkan per metode HTTP, yaitu GET, POST, PUT, dan DELETE, lalu dilengkapi PATCH karena metode tersebut menggantikan peran DELETE pada resource pesanan.

Berkas spesifikasi lengkap disimpan di `Documents/openapi-v2.yaml`, sedangkan kontrak versi 1.x tetap berada di `Documents/openapi.yaml`.

---

## 9.1 Gambaran Umum API Versi 2.0

### 9.1.1 Ruang Lingkup

Sesuai Decision D4, perubahan *breaking* hanya terjadi pada resource **Order**. Resource lain tidak mengalami perubahan kontrak, sehingga tidak dibuat salinan `/api/v2` untuknya. Resource tersebut tetap dilayani di path `/api/v1` dan menjadi bagian dari API 2.0 tanpa perubahan bentuk data.

| Kelompok | Path | Status di API 2.0 | Layanan |
| :--- | :--- | :--- | :--- |
| **Orders v2** | `/api/v2/orders/**` | **Baru.** Kontrak bersarang dengan `customer`, `location`, `paymentSummary` | `order-service` |
| Auth | `/api/v1/auth/login` | Tidak berubah | `catalog-service` |
| Outlets | `/api/v1/outlets/**` | Tidak berubah | `catalog-service` |
| Tables | `/api/v1/outlets/{outletId}/tables/**` | Tidak berubah | `catalog-service` |
| Menu Items | `/api/v1/menu-items/**`, `/api/v1/outlets/{outletId}/menu-items` | Tidak berubah | `catalog-service` |
| Orders v1 (legacy) | `/api/v1/orders/**` | Tetap aktif berdampingan, didokumentasikan di `openapi.yaml` | `order-service` |
| Internal | `/internal/orders/validate` | Tidak dirutekan gateway, tidak termasuk kontrak publik | `catalog-service` |

> **Catatan:** Kedua versi Order berbagi satu lapisan domain (`OrderService`, `PaymentService`) dan satu basis data `order_db`. Pesanan yang dibuat melalui v1 dapat dibaca, diubah, dan dibayar melalui v2, begitu pula sebaliknya. Perbedaannya hanya pada DTO, mapper, dan controller per versi.

### 9.1.2 Informasi Umum Spesifikasi

| Atribut | Nilai |
| :--- | :--- |
| Format | OpenAPI **3.1.0** (YAML) |
| Judul | Dikichi Order Management Platform API |
| Versi dokumen | **2.0.0** |
| Berkas | `Documents/openapi-v2.yaml` |
| Server 1 | `http://localhost:8080` (API Gateway, Docker Compose lokal) |
| Server 2 | `http://localhost` (Nginx frontend, meneruskan `/api` ke gateway) |
| Skema keamanan | `bearerAuth` (HTTP Bearer, JWT HS256) |
| Tag | `Orders v2`, `Auth`, `Outlets`, `Tables`, `Menu Items` |
| Jumlah path / operasi | 12 path, 21 operasi |

Potongan bagian `info`, `servers`, dan `tags`:

```yaml
openapi: 3.1.0
info:
  title: Dikichi Order Management Platform API
  version: "2.0.0"
  summary: Kontrak publik API versi 2.0 platform pemesanan dine-in Dikichi, dilihat dari API Gateway.
  contact:
    name: Team Ambatucode
servers:
  - url: http://localhost:8080
    description: API Gateway (Docker Compose lokal)
  - url: http://localhost
    description: Nginx frontend, meneruskan /api ke gateway (satu origin, tanpa CORS)
tags:
  - name: Orders v2
    description: Kontrak Order bersarang dengan ringkasan pembayaran (order-service). Inti perubahan API 2.0.
  - name: Auth
  - name: Outlets
  - name: Tables
  - name: Menu Items
security:
  - bearerAuth: []
```

### 9.1.3 Konvensi

| Aspek | Aturan |
| :--- | :--- |
| Format data | Hanya JSON (`application/json`) |
| Waktu | ISO-8601 UTC, misalnya `2026-11-12T10:00:00Z` |
| Uang | Bilangan bulat Rupiah tanpa desimal |
| Path | Path gateway sama dengan path layanan hilir (tanpa penulisan ulang prefix) |
| Kesalahan | Seluruh layanan dan gateway memakai skema `ErrorResponse` yang sama; `errors` selalu ada |
| Pembuatan | `201 Created` dengan header `Location` |
| Penghapusan | *Soft delete* (`is_deleted = true`), `204 No Content`; menghapus ulang menghasilkan `404` |
| Pembatalan pesanan | Tidak memakai DELETE; melalui `PATCH /api/v2/orders/{orderId}/status` dengan `CANCELLED` |
| Metode tidak didukung | `405 METHOD_NOT_ALLOWED` dengan format `ErrorResponse` |

### 9.1.4 Autentikasi dan Otorisasi

Staf memperoleh JWT dari `POST /api/v1/auth/login` (HS256, kedaluwarsa 8 jam, tanpa refresh token) lalu mengirimkannya sebagai `Authorization: Bearer <token>`. Gateway memvalidasi token dan meneruskan header identitas `X-User-Name`, `X-User-Role`, dan `X-Outlet-Id` ke layanan hilir, serta membuang salinan header tersebut yang dikirim klien.

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT HS256 dari POST /api/v1/auth/login. Kedaluwarsa setelah 8 jam. Tanpa refresh token.
```

Rute publik ditandai dengan `security: []` pada operasi terkait. Untuk v2, hanya `POST /api/v2/orders` (path persis) yang publik, sehingga `POST /api/v2/orders/{orderId}/pay` tetap terlindungi.

| Operasi | Publik | MASTER | CASHIER | KITCHEN |
| :--- | :---: | :---: | :---: | :---: |
| `POST /api/v2/orders` | Ya | - | - | - |
| `GET /api/v2/orders`, `GET /api/v2/orders/{orderId}` | - | 403 | Outlet sendiri | Outlet sendiri |
| `PUT /api/v2/orders/{orderId}` | - | 403 | Outlet sendiri | 403 |
| `POST /api/v2/orders/{orderId}/pay` | - | 403 | Outlet sendiri | 403 |
| `PATCH /api/v2/orders/{orderId}/status` | - | 403 | `ACCEPTED`, `CANCELLED` | `READY`, `COMPLETED` |
| `GET` katalog (outlet, meja, item menu) | Ya | Ya | Ya | Ya |
| `POST`, `PUT`, `DELETE` katalog | - | Ya | 403 | 403 |
| `PATCH /api/v1/menu-items/{id}/availability` | - | Ya | Outlet sendiri | Outlet sendiri |

### 9.1.5 Ringkasan Endpoint per Metode

| No | Metode | Path | Akses | Sukses | Bab |
| :---: | :--- | :--- | :--- | :---: | :---: |
| 1 | GET | `/api/v2/orders` | Cashier, Kitchen | 200 | 9.3 |
| 2 | GET | `/api/v2/orders/{orderId}` | Cashier, Kitchen | 200 | 9.3 |
| 3 | GET | `/api/v1/outlets` | Publik | 200 | 9.3 |
| 4 | GET | `/api/v1/outlets/{outletId}` | Publik | 200 | 9.3 |
| 5 | GET | `/api/v1/outlets/{outletId}/tables` | Publik | 200 | 9.3 |
| 6 | GET | `/api/v1/outlets/{outletId}/menu-items` | Publik | 200 | 9.3 |
| 7 | GET | `/api/v1/menu-items/{menuItemId}` | Publik | 200 | 9.3 |
| 8 | POST | `/api/v2/orders` | Publik | 201 | 9.4 |
| 9 | POST | `/api/v2/orders/{orderId}/pay` | Cashier | 200 | 9.4 |
| 10 | POST | `/api/v1/auth/login` | Publik | 200 | 9.4 |
| 11 | POST | `/api/v1/outlets` | Master | 201 | 9.4 |
| 12 | POST | `/api/v1/outlets/{outletId}/tables` | Master | 201 | 9.4 |
| 13 | POST | `/api/v1/outlets/{outletId}/menu-items` | Master | 201 | 9.4 |
| 14 | PUT | `/api/v2/orders/{orderId}` | Cashier | 200 | 9.5 |
| 15 | PUT | `/api/v1/outlets/{outletId}` | Master | 200 | 9.5 |
| 16 | PUT | `/api/v1/menu-items/{menuItemId}` | Master | 200 | 9.5 |
| 17 | DELETE | `/api/v1/outlets/{outletId}` | Master | 204 | 9.6 |
| 18 | DELETE | `/api/v1/outlets/{outletId}/tables/{code}` | Master | 204 | 9.6 |
| 19 | DELETE | `/api/v1/menu-items/{menuItemId}` | Master | 204 | 9.6 |
| 20 | PATCH | `/api/v2/orders/{orderId}/status` | Cashier, Kitchen | 200 | 9.7 |
| 21 | PATCH | `/api/v1/menu-items/{menuItemId}/availability` | Master, Cashier, Kitchen | 200 | 9.7 |

---

## 9.2 Skema Data Versi 2.0

### 9.2.1 Skema Baru Order v2

Inti API 2.0 adalah lima skema baru berikut. Skema `OrderItemRequest`, `OrderItemResponse`, `OrderStatusPatchRequest`, dan `PaymentRequest` dipakai bersama oleh v1 dan v2 tanpa perubahan.

| Skema | Peran | Menggantikan (v1) |
| :--- | :--- | :--- |
| `V2Customer` | Identitas pelanggan `{ name }` | `customerName` di root |
| `V2Location` | Lokasi meja `{ outletId, tableCode }` | `outletId`, `tableCode` di root |
| `V2PaymentSummary` | Total dan informasi pembayaran | `totalAmount` di root; info pembayaran tidak pernah tampil di v1 |
| `V2OrderRequest` | Body POST dan PUT pesanan | `V1OrderRequest` |
| `V2OrderResponse` | Respons setiap endpoint yang mengembalikan pesanan | `V1OrderResponse` |

```yaml
    V2Customer:
      type: object
      required: [name]
      description: Identitas pelanggan. Baru di v2 (menggantikan `customerName` v1).
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 50
          description: Di-trim oleh server sebelum validasi.
    V2Location:
      type: object
      required: [outletId, tableCode]
      description: Lokasi meja. Baru di v2 (menggantikan `outletId` dan `tableCode` v1 di root).
      properties:
        outletId:
          $ref: '#/components/schemas/OutletIdValue'
        tableCode:
          $ref: '#/components/schemas/TableCodeValue'
    V2PaymentSummary:
      type: object
      required: [totalAmount, paymentStatus, paymentMethod, amountTendered, change]
      description: |
        Baru di v2. `totalAmount` pindah dari root v1 ke sini.
        `paymentMethod`, `amountTendered`, `change` bernilai null sampai dibayar;
        `amountTendered` dan `change` tetap null untuk QRIS dan CARD.
      properties:
        totalAmount:
          type: integer
          format: int64
        paymentStatus:
          $ref: '#/components/schemas/PaymentStatus'
        paymentMethod:
          oneOf:
            - $ref: '#/components/schemas/PaymentMethod'
            - type: 'null'
        amountTendered:
          type: [integer, 'null']
          format: int64
        change:
          type: [integer, 'null']
          format: int64
    V2OrderRequest:
      type: object
      required: [customer, location, items]
      properties:
        customer:
          $ref: '#/components/schemas/V2Customer'
        location:
          $ref: '#/components/schemas/V2Location'
        items:
          $ref: '#/components/schemas/OrderItemList'
    V2OrderResponse:
      type: object
      required: [id, orderNumber, status, customer, location, items, paymentSummary, createdAt, updatedAt]
      properties:
        id:
          type: string
          format: uuid
        orderNumber:
          type: string
          pattern: '^ORD-\d{4,}$'
        status:
          $ref: '#/components/schemas/OrderStatus'
        customer:
          $ref: '#/components/schemas/V2Customer'
        location:
          $ref: '#/components/schemas/V2Location'
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItemResponse'
        paymentSummary:
          $ref: '#/components/schemas/V2PaymentSummary'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
```

### 9.2.2 Nilai `paymentSummary` per Status Pesanan

| Kondisi pesanan | `paymentStatus` | `paymentMethod` | `amountTendered` | `change` |
| :--- | :--- | :--- | :--- | :--- |
| `PENDING`, `ACCEPTED`, `CANCELLED` | `UNPAID` | `null` | `null` | `null` |
| Dibayar `CASH` | `PAID` | `CASH` | angka | angka |
| Dibayar `QRIS` / `CARD` | `PAID` | `QRIS` / `CARD` | `null` | `null` |

Pesanan `PREPARING`, `READY`, dan `COMPLETED` selalu `PAID`, karena satu-satunya jalan menuju `PREPARING` adalah endpoint `pay`.

### 9.2.3 Aturan Validasi

| Field | Aturan |
| :--- | :--- |
| `customer.name` | Wajib, di-trim, 1–50 karakter |
| `location.outletId` | Wajib, pola `^OUT-\d{2,}$`, harus ada dan belum dihapus |
| `location.tableCode` | Wajib, pola `^T-\d{2,3}$`, harus ada di outlet tersebut |
| `items` | 1–30 baris, tanpa `menuItemId` duplikat |
| `items[].quantity` | Bilangan bulat 1–99 |
| `amountTendered` | Wajib dan ≥ total untuk `CASH`; null untuk `QRIS`/`CARD` |
| Item menu `price` | Bilangan bulat 1–10.000.000 |
| Item menu `name` / `category` / `description` | 1–100 / 1–50 / ≤ 500 karakter |
| Outlet `id` / `name` / `address` | `^OUT-\d{2,}$` / 1–100 / 1–255 karakter |

Validasi field (`400`) dijalankan sebelum pemanggilan `catalog-service`, sehingga body yang tidak valid tidak pernah sampai ke layanan katalog.

---

## 9.3 Spesifikasi GET

### 9.3.1 GET `/api/v2/orders` — Antrean Pesanan

| Atribut | Keterangan |
| :--- | :--- |
| operationId | `listOrdersV2` |
| Akses | Cashier dan Kitchen, outlet sendiri. Master mendapat `403` (D14) |
| Query `outletId` | Opsional, default outlet dari JWT. Nilai berbeda menghasilkan `403` |
| Query `status` | Opsional, satu status. Default himpunan role (Cashier: `PENDING`, `ACCEPTED`; Kitchen: `PREPARING`, `READY`). Status di luar himpunan menghasilkan `403` |
| Urutan | Paling lama lebih dulu, tanpa paginasi (D13) |
| Respons | `200` array `V2OrderResponse`; `400`, `401`, `403` |

```yaml
  /api/v2/orders:
    get:
      tags: [Orders v2]
      operationId: listOrdersV2
      summary: Antrean pesanan (Cashier, Kitchen; outlet sendiri)
      parameters:
        - $ref: '#/components/parameters/OrderOutletIdQuery'
        - $ref: '#/components/parameters/OrderStatusQuery'
      responses:
        '200':
          description: Daftar pesanan dalam bentuk v2.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/V2OrderResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
```

Contoh request dan respons:

```http
GET /api/v2/orders?status=PENDING
Authorization: Bearer <token cashier>
```

```json
[
  {
    "id": "7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10",
    "orderNumber": "ORD-0042",
    "status": "PENDING",
    "customer": { "name": "Budi" },
    "location": { "outletId": "OUT-01", "tableCode": "T-01" },
    "items": [
      { "menuItemId": "11111111-0000-4000-8000-000000000001", "name": "Mie Suit",
        "unitPrice": 25000, "quantity": 2, "subtotal": 50000 }
    ],
    "paymentSummary": { "totalAmount": 50000, "paymentStatus": "UNPAID",
                        "paymentMethod": null, "amountTendered": null, "change": null },
    "createdAt": "2026-11-12T10:00:00Z",
    "updatedAt": "2026-11-12T10:00:00Z"
  }
]
```

### 9.3.2 GET `/api/v2/orders/{orderId}` — Detail Pesanan

| Atribut | Keterangan |
| :--- | :--- |
| operationId | `getOrderV2` |
| Akses | Cashier dan Kitchen, outlet sendiri |
| Path `orderId` | UUID pesanan (bukan nomor `ORD-xxxx`) |
| Respons | `200` `V2OrderResponse`; `401`, `403` (outlet lain), `404` |
| Kompatibilitas | Pesanan yang dibuat lewat v1 dikembalikan dalam bentuk v2 |

```yaml
  /api/v2/orders/{orderId}:
    parameters:
      - $ref: '#/components/parameters/OrderId'
    get:
      tags: [Orders v2]
      operationId: getOrderV2
      summary: Detail pesanan (Cashier, Kitchen; outlet sendiri)
      responses:
        '200':
          description: Pesanan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
              examples:
                pending:
                  $ref: '#/components/examples/OrderPending'
                paidCash:
                  $ref: '#/components/examples/OrderPaidCash'
                paidQris:
                  $ref: '#/components/examples/OrderPaidQris'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
```

### 9.3.3 GET Katalog (Tidak Berubah dari v1)

| operationId | Path | Akses | Respons | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| `listOutlets` | `/api/v1/outlets` | Publik | `200` array `Outlet` | Urut berdasarkan id |
| `getOutlet` | `/api/v1/outlets/{outletId}` | Publik | `200` `Outlet`; `404` | |
| `listTables` | `/api/v1/outlets/{outletId}/tables` | Publik | `200` array `Table`; `404` | Urut berdasarkan kode |
| `listMenuItems` | `/api/v1/outlets/{outletId}/menu-items` | Publik | `200` array `MenuItem`; `404` | Urut kategori lalu nama; item `available=false` ikut tampil sebagai "Sold out" (D5) |
| `getMenuItem` | `/api/v1/menu-items/{menuItemId}` | Publik | `200` `MenuItem`; `404` | |

```yaml
  /api/v1/outlets/{outletId}/menu-items:
    parameters:
      - $ref: '#/components/parameters/OutletId'
    get:
      tags: [Menu Items]
      operationId: listMenuItems
      summary: Daftar item menu outlet yang belum dihapus
      security: []
      responses:
        '200':
          description: Daftar item menu.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MenuItem'
        '404':
          $ref: '#/components/responses/NotFound'
```

---

## 9.4 Spesifikasi POST

### 9.4.1 POST `/api/v2/orders` — Membuat Pesanan

| Atribut | Keterangan |
| :--- | :--- |
| operationId | `createOrderV2` |
| Akses | Publik (`security: []`), tetap publik walaupun membawa JWT staf (D16) |
| Body | `V2OrderRequest` |
| Proses | Validasi field → validasi ke `catalog-service` (outlet → meja → item → ketersediaan) → snapshot nama dan harga → hitung total → simpan `PENDING`, `UNPAID` |
| Respons | `201` `V2OrderResponse` + header `Location: /api/v2/orders/{id}` |
| Kesalahan | `400` (termasuk body v1), `409 ITEM_UNAVAILABLE`, `422 INVALID_OUTLET/INVALID_TABLE/INVALID_MENU_ITEM`, `503 CATALOG_UNAVAILABLE` |

```yaml
  /api/v2/orders:
    post:
      tags: [Orders v2]
      operationId: createOrderV2
      summary: Tamu membuat pesanan (kontrak v2 bersarang)
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V2OrderRequest'
            examples:
              valid:
                summary: Body v2 yang valid
                value:
                  customer:
                    name: Budi
                  location:
                    outletId: OUT-01
                    tableCode: T-01
                  items:
                    - menuItemId: 11111111-0000-4000-8000-000000000001
                      quantity: 2
      responses:
        '201':
          description: Dibuat. Body respons adalah satu-satunya bukti pesanan bagi pelanggan.
          headers:
            Location:
              $ref: '#/components/headers/Location'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
              examples:
                pending:
                  $ref: '#/components/examples/OrderPending'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          $ref: '#/components/responses/Conflict'
        '422':
          $ref: '#/components/responses/UnprocessableEntity'
        '503':
          $ref: '#/components/responses/ServiceUnavailable'
```

Contoh sukses:

```http
POST /api/v2/orders
Content-Type: application/json

{ "customer": { "name": "Budi" },
  "location": { "outletId": "OUT-01", "tableCode": "T-01" },
  "items": [ { "menuItemId": "11111111-0000-4000-8000-000000000001", "quantity": 2 } ] }
```

```http
HTTP/1.1 201 Created
Location: /api/v2/orders/7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10
Content-Type: application/json

{ "id": "7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10", "orderNumber": "ORD-0042", "status": "PENDING",
  "customer": { "name": "Budi" },
  "location": { "outletId": "OUT-01", "tableCode": "T-01" },
  "items": [ { "menuItemId": "11111111-0000-4000-8000-000000000001", "name": "Mie Suit",
               "unitPrice": 25000, "quantity": 2, "subtotal": 50000 } ],
  "paymentSummary": { "totalAmount": 50000, "paymentStatus": "UNPAID",
                      "paymentMethod": null, "amountTendered": null, "change": null },
  "createdAt": "2026-11-12T10:00:00Z", "updatedAt": "2026-11-12T10:00:00Z" }
```

Contoh *breaking change*, yaitu klien v1 mengirim body datar ke endpoint v2:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{ "timestamp": "2026-11-12T10:00:00Z", "status": 400, "code": "VALIDATION_ERROR",
  "message": "Request validation failed", "path": "/api/v2/orders",
  "errors": [ { "field": "customer", "message": "must not be null" },
              { "field": "location", "message": "must not be null" } ] }
```

### 9.4.2 POST `/api/v2/orders/{orderId}/pay` — Pembayaran Tiruan

| Atribut | Keterangan |
| :--- | :--- |
| operationId | `payOrderV2` |
| Akses | Cashier, outlet sendiri |
| Body | `PaymentRequest` (identik dengan v1) |
| Prasyarat | Pesanan berstatus `ACCEPTED` |
| Efek | Secara atomik membuat pembayaran dan mengubah status menjadi `PREPARING` |
| Aturan | `CASH`: `amountTendered` wajib dan ≥ total, `change = amountTendered − totalAmount`. `QRIS`/`CARD`: `amountTendered` null |
| Respons | `200` `V2OrderResponse` dengan `paymentSummary` terisi |
| Kesalahan | `400`, `401`, `403`, `404`, `409 ORDER_ALREADY_PAID`, `409 INVALID_STATUS_TRANSITION` |

```yaml
  /api/v2/orders/{orderId}/pay:
    parameters:
      - $ref: '#/components/parameters/OrderId'
    post:
      tags: [Orders v2]
      operationId: payOrderV2
      summary: Mencatat pembayaran tiruan (Cashier)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentRequest'
            examples:
              cash:
                summary: Tunai dengan kembalian
                value:
                  paymentMethod: CASH
                  amountTendered: 60000
              qris:
                summary: QRIS
                value:
                  paymentMethod: QRIS
                  amountTendered: null
      responses:
        '200':
          description: Pesanan terbaru (status `PREPARING`) beserta `paymentSummary`.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
              examples:
                paidCash:
                  $ref: '#/components/examples/OrderPaidCash'
                paidQris:
                  $ref: '#/components/examples/OrderPaidQris'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/Conflict'
```

Contoh respons setelah pembayaran tunai. Di v1, respons yang sama tidak memuat informasi pembayaran sama sekali, sehingga kembalian (AC-05) hanya dapat diverifikasi melalui v2.

```json
{ "id": "7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10", "orderNumber": "ORD-0042", "status": "PREPARING",
  "customer": { "name": "Budi" },
  "location": { "outletId": "OUT-01", "tableCode": "T-01" },
  "items": [ { "menuItemId": "11111111-0000-4000-8000-000000000001", "name": "Mie Suit",
               "unitPrice": 25000, "quantity": 2, "subtotal": 50000 } ],
  "paymentSummary": { "totalAmount": 50000, "paymentStatus": "PAID",
                      "paymentMethod": "CASH", "amountTendered": 60000, "change": 10000 },
  "createdAt": "2026-11-12T10:00:00Z", "updatedAt": "2026-11-12T10:03:12Z" }
```

### 9.4.3 POST Auth dan Katalog (Tidak Berubah dari v1)

| operationId | Path | Akses | Body | Sukses | Kesalahan khusus |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `login` | `/api/v1/auth/login` | Publik | `LoginRequest` | `200` `LoginResponse` | `401` generik |
| `createOutlet` | `/api/v1/outlets` | Master | `OutletCreateRequest` | `201` `Outlet` + `Location` | `409 DUPLICATE_OUTLET_ID` |
| `createTable` | `/api/v1/outlets/{outletId}/tables` | Master | `TableCreateRequest` | `201` `Table` + `Location` | `404`, `409 DUPLICATE_TABLE_CODE` |
| `createMenuItem` | `/api/v1/outlets/{outletId}/menu-items` | Master | `MenuItemCreateRequest` | `201` `MenuItem` + `Location` | `404`; `available` default `true` |

```yaml
  /api/v1/auth/login:
    post:
      tags: [Auth]
      operationId: login
      summary: Login staf
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Login berhasil.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
              example:
                accessToken: eyJhbGciOiJIUzI1NiJ9...
                tokenType: Bearer
                expiresIn: 28800
                user:
                  username: cashier
                  role: CASHIER
                  outletId: OUT-01
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
```

---

## 9.5 Spesifikasi PUT

### 9.5.1 PUT `/api/v2/orders/{orderId}` — Mengganti Pesanan PENDING

| Atribut | Keterangan |
| :--- | :--- |
| operationId | `replaceOrderV2` |
| Akses | Cashier, outlet sendiri |
| Body | `V2OrderRequest` (penggantian penuh nama, meja, dan item, D10) |
| Proses | Item divalidasi ulang ke katalog, snapshot harga diperbarui, total dihitung ulang |
| Aturan | `location.outletId` harus sama dengan outlet pesanan (`400 OUTLET_IMMUTABLE`, D16); hanya `PENDING` (`409 ORDER_NOT_EDITABLE`); *optimistic locking* (`409 CONCURRENT_MODIFICATION`) |
| Respons | `200` `V2OrderResponse` |
| Kesalahan | `400`, `401`, `403`, `404`, `409`, `422`, `503` |

```yaml
    put:
      tags: [Orders v2]
      operationId: replaceOrderV2
      summary: Mengganti pesanan PENDING (Cashier)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V2OrderRequest'
            example:
              customer:
                name: Budi Santoso
              location:
                outletId: OUT-01
                tableCode: T-05
              items:
                - menuItemId: 11111111-0000-4000-8000-000000000001
                  quantity: 1
                - menuItemId: 11111111-0000-4000-8000-000000000002
                  quantity: 2
      responses:
        '200':
          description: Pesanan berhasil diganti.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/Conflict'
        '422':
          $ref: '#/components/responses/UnprocessableEntity'
        '503':
          $ref: '#/components/responses/ServiceUnavailable'
```

Contoh kesalahan saat PUT mencoba memindahkan pesanan ke outlet lain:

```json
{ "timestamp": "2026-11-12T10:00:00Z", "status": 400, "code": "OUTLET_IMMUTABLE",
  "message": "Order outlet cannot be changed",
  "path": "/api/v2/orders/7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10",
  "errors": [ { "field": "location.outletId", "message": "Order outlet cannot be changed" } ] }
```

### 9.5.2 PUT Katalog (Tidak Berubah dari v1)

| operationId | Path | Akses | Body | Sukses | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `replaceOutlet` | `/api/v1/outlets/{outletId}` | Master | `OutletReplaceRequest` (`name`, `address`) | `200` `Outlet` | Id dari path, tidak dapat diubah |
| `replaceMenuItem` | `/api/v1/menu-items/{menuItemId}` | Master | `MenuItemReplaceRequest` (`available` wajib) | `200` `MenuItem` | Item tetap di outletnya (D17) |

Meja tidak memiliki PUT karena satu-satunya field yang dapat diubah adalah kode (D6).

```yaml
  /api/v1/menu-items/{menuItemId}:
    put:
      tags: [Menu Items]
      operationId: replaceMenuItem
      summary: Mengganti item menu (Master)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MenuItemReplaceRequest'
            example:
              name: Mie Suit Pedas
              description: Mie dengan sambal level 5
              price: 29000
              category: Mie
              available: true
      responses:
        '200':
          description: Item menu berhasil diganti.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MenuItem'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
```

---

## 9.6 Spesifikasi DELETE

### 9.6.1 Operasi DELETE pada API 2.0

Seluruh DELETE adalah *soft delete*: baris diberi `is_deleted = true`, tidak muncul lagi di daftar maupun detail (`404`), dan ditolak untuk pesanan baru, tetapi tetap tersimpan agar pesanan lama dapat diaudit. Menghapus resource yang sudah dihapus menghasilkan `404` (D17).

| operationId | Path | Akses | Sukses | Kesalahan | Efek |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `deleteOutlet` | `/api/v1/outlets/{outletId}` | Master | `204` | `401`, `403`, `404` | Tanpa cascade; meja dan item outlet ikut tidak dapat dipakai karena validasi outlet gagal |
| `deleteTable` | `/api/v1/outlets/{outletId}/tables/{code}` | Master | `204` | `401`, `403`, `404` | Kode meja dapat dipakai lagi untuk meja baru |
| `deleteMenuItem` | `/api/v1/menu-items/{menuItemId}` | Master | `204` | `401`, `403`, `404` | Pesanan lama tetap menampilkan snapshot nama dan harga |

```yaml
  /api/v1/outlets/{outletId}:
    delete:
      tags: [Outlets]
      operationId: deleteOutlet
      summary: Soft delete outlet (Master)
      responses:
        '204':
          $ref: '#/components/responses/NoContent'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/outlets/{outletId}/tables/{code}:
    parameters:
      - $ref: '#/components/parameters/OutletId'
      - $ref: '#/components/parameters/TableCode'
    delete:
      tags: [Tables]
      operationId: deleteTable
      summary: Soft delete meja (Master)
      responses:
        '204':
          $ref: '#/components/responses/NoContent'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/menu-items/{menuItemId}:
    delete:
      tags: [Menu Items]
      operationId: deleteMenuItem
      summary: Soft delete item menu (Master)
      responses:
        '204':
          $ref: '#/components/responses/NoContent'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
```

Contoh:

```http
DELETE /api/v1/menu-items/11111111-0000-4000-8000-000000000003
Authorization: Bearer <token master>
```

```http
HTTP/1.1 204 No Content
```

### 9.6.2 Mengapa Order v2 Tidak Memiliki DELETE

Pesanan adalah catatan transaksi. Menghapusnya, walaupun secara *soft delete*, akan menghilangkan jejak pesanan yang sudah dibuat pelanggan dan berpotensi sudah dibayar. Karena itu PRD menetapkan bahwa pesanan hanya dapat **dibatalkan** melalui mesin status:

| Kebutuhan | Endpoint di API 2.0 |
| :--- | :--- |
| Membatalkan pesanan `PENDING` atau `ACCEPTED` | `PATCH /api/v2/orders/{orderId}/status` dengan `{ "status": "CANCELLED" }` (Cashier) |
| Pesanan `PREPARING` ke atas | Tidak dapat dibatalkan (sudah dibayar dan diproses dapur) |
| `DELETE /api/v2/orders/{orderId}` | Tidak didefinisikan; layanan mengembalikan `405 METHOD_NOT_ALLOWED` |

`CANCELLED` adalah status akhir. Pesanan yang dibatalkan tetap bisa dibaca melalui `GET /api/v2/orders/{orderId}` dengan `paymentSummary.paymentStatus = UNPAID`.

---

## 9.7 Spesifikasi PATCH Pendukung

### 9.7.1 PATCH `/api/v2/orders/{orderId}/status` — Mengubah Status

| Atribut | Keterangan |
| :--- | :--- |
| operationId | `patchOrderStatusV2` |
| Akses | Cashier (`ACCEPTED`, `CANCELLED`) dan Kitchen (`READY`, `COMPLETED`), outlet sendiri |
| Body | `OrderStatusPatchRequest` (identik dengan v1) |
| Respons | `200` `V2OrderResponse` (bentuk mengikuti versi yang dipanggil) |
| Kesalahan | `400`, `401`, `403`, `404`, `409 INVALID_STATUS_TRANSITION`, `409 CONCURRENT_MODIFICATION` |

| Dari | Ke | Aktor | Endpoint |
| :--- | :--- | :--- | :--- |
| - | `PENDING` | Tamu | `POST /api/v2/orders` |
| `PENDING` | `ACCEPTED` | Cashier | `PATCH /status` |
| `PENDING` | `CANCELLED` | Cashier | `PATCH /status` |
| `ACCEPTED` | `CANCELLED` | Cashier | `PATCH /status` |
| `ACCEPTED` | `PREPARING` | Sistem | `POST /pay` |
| `PREPARING` | `READY` | Kitchen | `PATCH /status` |
| `READY` | `COMPLETED` | Kitchen | `PATCH /status` |

Urutan evaluasi (D16): role → body → keberadaan pesanan → cakupan outlet → target terlarang (`PENDING`/`PREPARING`) → kepemilikan target oleh role → transisi dari status saat ini → *optimistic lock*.

```yaml
  /api/v2/orders/{orderId}/status:
    parameters:
      - $ref: '#/components/parameters/OrderId'
    patch:
      tags: [Orders v2]
      operationId: patchOrderStatusV2
      summary: Mengubah status pesanan, termasuk pembatalan (Cashier, Kitchen)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderStatusPatchRequest'
            examples:
              accept:
                value:
                  status: ACCEPTED
              cancel:
                value:
                  status: CANCELLED
      responses:
        '200':
          description: Pesanan terbaru dalam bentuk v2.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/Conflict'
```

### 9.7.2 PATCH `/api/v1/menu-items/{menuItemId}/availability`

Tidak berubah dari v1. Body `{ "available": false }`, akses Master serta Cashier dan Kitchen untuk outlet sendiri, respons `200` `MenuItem`.

---

## 9.8 Format Kesalahan dan Katalog Kode

Semua kesalahan dari semua layanan dan versi memakai satu bentuk:

```yaml
    ErrorResponse:
      type: object
      required: [timestamp, status, code, message, path, errors]
      properties:
        timestamp:
          type: string
          format: date-time
        status:
          type: integer
        code:
          type: string
        message:
          type: string
        path:
          type: string
        errors:
          type: array
          items:
            $ref: '#/components/schemas/FieldError'
```

| Kode | Status | Kapan |
| :--- | :---: | :--- |
| `MALFORMED_REQUEST` | 400 | Body bukan JSON valid atau tipe data salah |
| `VALIDATION_ERROR` | 400 | Aturan field dilanggar, termasuk body v1 ke endpoint v2 |
| `DUPLICATE_MENU_ITEM` | 400 | `menuItemId` sama di dua baris |
| `OUTLET_IMMUTABLE` | 400 | PUT pesanan mencoba mengubah outlet |
| `UNAUTHORIZED` | 401 | Token tidak ada atau tidak valid, login gagal |
| `FORBIDDEN` | 403 | Pelanggaran role atau cakupan outlet |
| `NOT_FOUND` | 404 | Resource tidak ada atau sudah di-soft-delete |
| `METHOD_NOT_ALLOWED` | 405 | Metode tidak didukung, misalnya DELETE pada pesanan |
| `ITEM_UNAVAILABLE` | 409 | Ada item tidak tersedia; semua item terdampak dicantumkan di `errors` |
| `INVALID_STATUS_TRANSITION` | 409 | Transisi status tidak diizinkan |
| `ORDER_NOT_EDITABLE` | 409 | PUT pada pesanan non-`PENDING` |
| `CONCURRENT_MODIFICATION` | 409 | *Optimistic lock* kalah |
| `ORDER_ALREADY_PAID` | 409 | Pembayaran kedua pada pesanan yang sama |
| `DUPLICATE_OUTLET_ID` | 409 | Id outlet sudah ada |
| `DUPLICATE_TABLE_CODE` | 409 | Kode meja aktif sudah ada di outlet |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | `Content-Type` bukan JSON |
| `INVALID_OUTLET` / `INVALID_TABLE` / `INVALID_MENU_ITEM` | 422 | Body merujuk entitas yang tidak ada, terhapus, atau dari outlet lain |
| `INTERNAL_ERROR` | 500 | Kesalahan tak terduga (tanpa detail internal) |
| `CATALOG_UNAVAILABLE` | 503 | `catalog-service` mati atau timeout; tidak ada data yang disimpan |

---

## 9.9 Ringkasan Perbedaan Kontrak v1 dan v2

| Aspek | v1 (`/api/v1/orders`) | v2 (`/api/v2/orders`) |
| :--- | :--- | :--- |
| Nama pelanggan | `customerName` | `customer.name` |
| Lokasi | `outletId`, `tableCode` di root | `location.outletId`, `location.tableCode` |
| Total | `totalAmount` di root | `paymentSummary.totalAmount` |
| Info pembayaran | Tidak pernah tampil | `paymentSummary.{paymentStatus, paymentMethod, amountTendered, change}` |
| Body PATCH status dan pay | `OrderStatusPatchRequest`, `PaymentRequest` | Sama (DTO bersama) |
| Item, kode status, format error, otorisasi, mesin status | - | Tidak berubah |
| Pengguna | Halaman pelanggan saat toggle demo `v1` | Halaman pelanggan (default) dan semua dashboard staf |

Pada sisi server, kontrak ini diimplementasikan dengan pola yang ditetapkan pada panduan migrasi: satu `OrderService` yang tidak mengenal versi, DTO terpisah di paket `dto.v1` dan `dto.v2`, mapper terpisah (`OrderV1Mapper`, `OrderV2Mapper`), serta controller tipis terpisah (`OrderV1Controller`, `OrderV2Controller`).

---

## 9.10 Cara Membaca dan Memvalidasi Spesifikasi

1. Buka https://editor.swagger.io, pilih **File → Import file**, lalu pilih `Documents/openapi-v2.yaml`. Panel kanan menampilkan dokumentasi interaktif per tag.
2. Alternatif dari terminal, lint dengan Redocly CLI:

   ```bash
   npx @redocly/cli lint Documents/openapi-v2.yaml
   ```

3. Untuk mencoba langsung, jalankan sistem dengan `docker compose up -d` dari folder `Backend`, lalu arahkan server Swagger ke `http://localhost:8080`, login melalui `POST /api/v1/auth/login`, dan isi token pada tombol **Authorize**.

---

## 9.11 Listing Lengkap `openapi-v2.yaml`

Berikut isi lengkap berkas spesifikasi API versi 2.0.

```yaml
openapi: 3.1.0
info:
  title: Dikichi Order Management Platform API
  version: "2.0.0"
  summary: Kontrak publik API versi 2.0 platform pemesanan dine-in Dikichi, dilihat dari API Gateway.
  description: |
    Dokumen ini adalah spesifikasi **API versi 2.0**. Sumber kebenaran tetap
    `PRD-Dikichi-Order-Platform-v1.md` (v1.1, Decision Log D4 dan D15–D24) serta
    `API-Migration-v1-to-v2.md`. Kontrak versi 1.x (termasuk Order v1 yang datar) ada di `openapi.yaml`.

    **Apa yang berubah di 2.0**
    - Resource Order memakai kontrak bersarang di `/api/v2/orders`: `customer`, `location`, dan
      `paymentSummary` menggantikan field datar `customerName`, `outletId`, `tableCode`, `totalAmount`.
    - `paymentSummary` baru menampilkan status, metode, uang diterima, dan kembalian pembayaran.
    - Perubahan ini *breaking*: body v1 yang dikirim ke `/api/v2/orders` ditolak `400 VALIDATION_ERROR`.

    **Apa yang tidak berubah (Decision D4)**
    - Auth, Outlet, Meja, dan Item Menu tidak memiliki perubahan kontrak sehingga **tetap dilayani di
      path `/api/v1`**. Endpoint tersebut menjadi bagian dari API 2.0 tanpa perubahan bentuk data.
    - `/api/v1/orders` (legacy) tetap aktif berdampingan dengan v2 sampai akhir evaluasi mata kuliah,
      tanpa header `Deprecation`/`Sunset` (D19). Kedua versi berbagi domain dan basis data yang sama.

    **Konvensi**
    - Semua path adalah path gateway. Layanan hilir memakai path yang sama (tanpa penulisan ulang prefix).
    - Hanya JSON. Timestamp ISO-8601 UTC. Uang dalam bilangan bulat Rupiah (tanpa desimal).
    - Setiap kesalahan memakai skema `ErrorResponse`; `errors` selalu ada (array kosong bila tidak ada detail field).
    - `DELETE` adalah *soft delete* (`is_deleted = true`), menghasilkan `204`; menghapus ulang menghasilkan `404`.
    - Order **tidak memiliki** `DELETE`. Pesanan dibatalkan melalui `PATCH /api/v2/orders/{orderId}/status`
      dengan `status: CANCELLED` agar riwayat transaksi tetap dapat diaudit. Metode yang tidak didukung
      menghasilkan `405 METHOD_NOT_ALLOWED`.

    **Autentikasi**
    - Staf memperoleh JWT dari `POST /api/v1/auth/login` (HS256, kedaluwarsa 8 jam, tanpa refresh token).
    - Kirim sebagai `Authorization: Bearer <token>`.
    - Klaim: `sub` (username), `role` (`MASTER` | `CASHIER` | `KITCHEN`), `outletId` (null untuk MASTER).
    - Gateway memvalidasi token lalu meneruskan `X-User-Name`, `X-User-Role`, `X-Outlet-Id` ke layanan hilir
      dan membuang salinan header tersebut yang dikirim klien.
  contact:
    name: Team Ambatucode
servers:
  - url: http://localhost:8080
    description: API Gateway (Docker Compose lokal)
  - url: http://localhost
    description: Nginx frontend, meneruskan /api ke gateway (satu origin, tanpa CORS)
tags:
  - name: Orders v2
    description: Kontrak Order bersarang dengan ringkasan pembayaran (order-service). Inti perubahan API 2.0.
  - name: Auth
    description: Login staf dan penerbitan JWT (catalog-service). Tidak berubah dari v1.
  - name: Outlets
    description: Pengelolaan outlet (catalog-service). Tidak berubah dari v1.
  - name: Tables
    description: Pengelolaan meja (catalog-service). Tidak berubah dari v1.
  - name: Menu Items
    description: Pengelolaan item menu dan ketersediaan (catalog-service). Tidak berubah dari v1.
security:
  - bearerAuth: []

paths:
  # ───────────────────────────── Orders v2 ─────────────────────────────
  /api/v2/orders:
    post:
      tags: [Orders v2]
      operationId: createOrderV2
      summary: Tamu membuat pesanan (kontrak v2 bersarang)
      description: |
        Publik (tidak butuh JWT; tetap publik walaupun request membawa JWT staf, D16).
        Server memvalidasi outlet, meja, dan item melalui catalog-service, menyimpan *snapshot* nama dan
        harga item, menghitung `paymentSummary.totalAmount = Σ(unitPrice × quantity)`, lalu membuat pesanan
        `PENDING` dengan `paymentStatus: UNPAID`. Harga dari klien diabaikan. Semua atau tidak sama sekali:
        bila ada satu item tidak tersedia, tidak ada pesanan yang dibuat.

        Urutan validasi: field body (`400`) → outlet → meja → keberadaan item (`422`) → ketersediaan (`409`).
        Body berbentuk v1 (datar) ditolak `400 VALIDATION_ERROR` karena `customer` dan `location` wajib ada.
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V2OrderRequest'
            examples:
              valid:
                summary: Body v2 yang valid
                value:
                  customer:
                    name: Budi
                  location:
                    outletId: OUT-01
                    tableCode: T-01
                  items:
                    - menuItemId: 11111111-0000-4000-8000-000000000001
                      quantity: 2
      responses:
        '201':
          description: Dibuat. Body respons adalah satu-satunya bukti pesanan bagi pelanggan.
          headers:
            Location:
              $ref: '#/components/headers/Location'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
              examples:
                pending:
                  $ref: '#/components/examples/OrderPending'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          $ref: '#/components/responses/Conflict'
        '422':
          $ref: '#/components/responses/UnprocessableEntity'
        '503':
          $ref: '#/components/responses/ServiceUnavailable'
    get:
      tags: [Orders v2]
      operationId: listOrdersV2
      summary: Antrean pesanan (Cashier, Kitchen; outlet sendiri)
      description: |
        Mengembalikan pesanan outlet pemanggil, urut dari yang paling lama, tanpa paginasi (D13).
        Tanpa filter `status`, Cashier melihat `PENDING` dan `ACCEPTED`, Kitchen melihat `PREPARING` dan `READY`.
        Master tidak memiliki akses ke pesanan (D14) dan mendapat `403`.
      parameters:
        - $ref: '#/components/parameters/OrderOutletIdQuery'
        - $ref: '#/components/parameters/OrderStatusQuery'
      responses:
        '200':
          description: Daftar pesanan dalam bentuk v2.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/V2OrderResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /api/v2/orders/{orderId}:
    parameters:
      - $ref: '#/components/parameters/OrderId'
    get:
      tags: [Orders v2]
      operationId: getOrderV2
      summary: Detail pesanan (Cashier, Kitchen; outlet sendiri)
      description: Pesanan yang dibuat melalui v1 juga dapat dibaca di sini dan dikembalikan dalam bentuk v2.
      responses:
        '200':
          description: Pesanan.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
              examples:
                pending:
                  $ref: '#/components/examples/OrderPending'
                paidCash:
                  $ref: '#/components/examples/OrderPaidCash'
                paidQris:
                  $ref: '#/components/examples/OrderPaidQris'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
    put:
      tags: [Orders v2]
      operationId: replaceOrderV2
      summary: Mengganti pesanan PENDING (Cashier)
      description: |
        Penggantian penuh nama pelanggan, kode meja, dan daftar item (D10). Item divalidasi ulang ke
        catalog-service, snapshot harga diperbarui, dan total dihitung ulang.
        - `location.outletId` harus sama dengan outlet pesanan saat ini, jika tidak `400 OUTLET_IMMUTABLE` (D16).
        - Pesanan yang tidak berstatus `PENDING` menghasilkan `409 ORDER_NOT_EDITABLE`.
        - Penulisan bersamaan dilindungi *optimistic locking* (`409 CONCURRENT_MODIFICATION`).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V2OrderRequest'
            example:
              customer:
                name: Budi Santoso
              location:
                outletId: OUT-01
                tableCode: T-05
              items:
                - menuItemId: 11111111-0000-4000-8000-000000000001
                  quantity: 1
                - menuItemId: 11111111-0000-4000-8000-000000000002
                  quantity: 2
      responses:
        '200':
          description: Pesanan berhasil diganti.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/Conflict'
        '422':
          $ref: '#/components/responses/UnprocessableEntity'
        '503':
          $ref: '#/components/responses/ServiceUnavailable'

  /api/v2/orders/{orderId}/pay:
    parameters:
      - $ref: '#/components/parameters/OrderId'
    post:
      tags: [Orders v2]
      operationId: payOrderV2
      summary: Mencatat pembayaran tiruan (Cashier)
      description: |
        Hanya untuk pesanan `ACCEPTED`. Secara atomik membuat pembayaran dan mengubah status menjadi `PREPARING`.
        Body request identik dengan v1; yang berbeda hanya respons, yang di v2 memuat `paymentSummary` lengkap.
        - `CASH`: `amountTendered` wajib dan ≥ total; `change = amountTendered − totalAmount`.
        - `QRIS`/`CARD`: `amountTendered` harus null atau tidak dikirim.
        - Pembayaran kedua → `409 ORDER_ALREADY_PAID`. Pesanan non-`ACCEPTED` lain → `409 INVALID_STATUS_TRANSITION`.
        - Ketersediaan item tidak diperiksa ulang (D12).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PaymentRequest'
            examples:
              cash:
                summary: Tunai dengan kembalian
                value:
                  paymentMethod: CASH
                  amountTendered: 60000
              qris:
                summary: QRIS
                value:
                  paymentMethod: QRIS
                  amountTendered: null
      responses:
        '200':
          description: Pesanan terbaru (status `PREPARING`) beserta `paymentSummary`.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
              examples:
                paidCash:
                  $ref: '#/components/examples/OrderPaidCash'
                paidQris:
                  $ref: '#/components/examples/OrderPaidQris'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/Conflict'

  /api/v2/orders/{orderId}/status:
    parameters:
      - $ref: '#/components/parameters/OrderId'
    patch:
      tags: [Orders v2]
      operationId: patchOrderStatusV2
      summary: Mengubah status pesanan, termasuk pembatalan (Cashier, Kitchen)
      description: |
        Menggantikan peran `DELETE` untuk pesanan: pembatalan dilakukan dengan `status: CANCELLED`.
        Transisi yang diizinkan: `PENDING→ACCEPTED`, `PENDING→CANCELLED`, `ACCEPTED→CANCELLED` (Cashier),
        `PREPARING→READY`, `READY→COMPLETED` (Kitchen). `PENDING` dan `PREPARING` tidak pernah bisa di-PATCH.

        Urutan evaluasi (D16): role → body → keberadaan pesanan → cakupan outlet → target terlarang →
        kepemilikan target oleh role → transisi dari status saat ini → optimistic lock.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OrderStatusPatchRequest'
            examples:
              accept:
                value:
                  status: ACCEPTED
              cancel:
                value:
                  status: CANCELLED
      responses:
        '200':
          description: Pesanan terbaru dalam bentuk v2.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2OrderResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          $ref: '#/components/responses/Conflict'

  # ───────────────────────────── Auth ─────────────────────────────
  /api/v1/auth/login:
    post:
      tags: [Auth]
      operationId: login
      summary: Login staf
      description: Memverifikasi akun staf (BCrypt) dan menerbitkan JWT. Kegagalan menghasilkan 401 generik
        yang tidak membedakan username atau password yang salah.
      security: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
            example:
              username: cashier
              password: "<password demo dari README>"
      responses:
        '200':
          description: Login berhasil.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
              example:
                accessToken: eyJhbGciOiJIUzI1NiJ9...
                tokenType: Bearer
                expiresIn: 28800
                user:
                  username: cashier
                  role: CASHIER
                  outletId: OUT-01
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'

  # ───────────────────────────── Outlets ─────────────────────────────
  /api/v1/outlets:
    get:
      tags: [Outlets]
      operationId: listOutlets
      summary: Daftar outlet yang belum dihapus (urut berdasarkan id)
      security: []
      responses:
        '200':
          description: Daftar outlet.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Outlet'
    post:
      tags: [Outlets]
      operationId: createOutlet
      summary: Membuat outlet (Master)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OutletCreateRequest'
            example:
              id: OUT-03
              name: Dikichi Malang Kota
              address: Jl. Veteran No. 8, Malang
      responses:
        '201':
          description: Dibuat.
          headers:
            Location:
              $ref: '#/components/headers/Location'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Outlet'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '409':
          description: "Id outlet sudah ada (termasuk yang sudah di-soft-delete). Kode `DUPLICATE_OUTLET_ID`."
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/v1/outlets/{outletId}:
    parameters:
      - $ref: '#/components/parameters/OutletId'
    get:
      tags: [Outlets]
      operationId: getOutlet
      summary: Detail satu outlet
      security: []
      responses:
        '200':
          description: Outlet.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Outlet'
        '404':
          $ref: '#/components/responses/NotFound'
    put:
      tags: [Outlets]
      operationId: replaceOutlet
      summary: Mengganti outlet (Master)
      description: Penggantian penuh field yang dapat diubah. Id diambil dari path dan tidak dapat berubah.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/OutletReplaceRequest'
            example:
              name: Dikichi Malang Kota (Renovasi)
              address: Jl. Veteran No. 10, Malang
      responses:
        '200':
          description: Outlet berhasil diganti.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Outlet'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
    delete:
      tags: [Outlets]
      operationId: deleteOutlet
      summary: Soft delete outlet (Master)
      description: Mengisi `is_deleted = true` tanpa cascade. Meja dan item menu outlet tersebut menjadi tidak
        dapat dipakai karena validasi outlet gagal. Menghapus ulang menghasilkan `404`.
      responses:
        '204':
          $ref: '#/components/responses/NoContent'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  # ───────────────────────────── Tables ─────────────────────────────
  /api/v1/outlets/{outletId}/tables:
    parameters:
      - $ref: '#/components/parameters/OutletId'
    get:
      tags: [Tables]
      operationId: listTables
      summary: Daftar meja outlet yang belum dihapus (urut berdasarkan kode)
      security: []
      responses:
        '200':
          description: Daftar meja.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Table'
        '404':
          $ref: '#/components/responses/NotFound'
    post:
      tags: [Tables]
      operationId: createTable
      summary: Membuat meja (Master)
      description: Meja tidak memiliki PUT karena satu-satunya field yang dapat diubah adalah kode (D6).
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TableCreateRequest'
            example:
              code: T-11
      responses:
        '201':
          description: Dibuat.
          headers:
            Location:
              $ref: '#/components/headers/Location'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Table'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '409':
          description: "Meja aktif dengan kode ini sudah ada di outlet. Kode `DUPLICATE_TABLE_CODE`."
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

  /api/v1/outlets/{outletId}/tables/{code}:
    parameters:
      - $ref: '#/components/parameters/OutletId'
      - $ref: '#/components/parameters/TableCode'
    delete:
      tags: [Tables]
      operationId: deleteTable
      summary: Soft delete meja (Master)
      responses:
        '204':
          $ref: '#/components/responses/NoContent'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  # ───────────────────────────── Menu Items ─────────────────────────────
  /api/v1/outlets/{outletId}/menu-items:
    parameters:
      - $ref: '#/components/parameters/OutletId'
    get:
      tags: [Menu Items]
      operationId: listMenuItems
      summary: Daftar item menu outlet yang belum dihapus
      description: Urut berdasarkan kategori lalu nama. Item tidak tersedia ikut ditampilkan dengan
        `available = false`; UI pelanggan menampilkannya sebagai "Sold out" (D5).
      security: []
      responses:
        '200':
          description: Daftar item menu.
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/MenuItem'
        '404':
          $ref: '#/components/responses/NotFound'
    post:
      tags: [Menu Items]
      operationId: createMenuItem
      summary: Membuat item menu (Master)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MenuItemCreateRequest'
            example:
              name: Mie Suit Pedas
              description: Mie dengan sambal level 3
              price: 27000
              category: Mie
      responses:
        '201':
          description: Dibuat.
          headers:
            Location:
              $ref: '#/components/headers/Location'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MenuItem'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/menu-items/{menuItemId}:
    parameters:
      - $ref: '#/components/parameters/MenuItemId'
    get:
      tags: [Menu Items]
      operationId: getMenuItem
      summary: Detail satu item menu
      security: []
      responses:
        '200':
          description: Item menu.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MenuItem'
        '404':
          $ref: '#/components/responses/NotFound'
    put:
      tags: [Menu Items]
      operationId: replaceMenuItem
      summary: Mengganti item menu (Master)
      description: Penggantian penuh termasuk `available` (D17). Item tetap berada di outletnya.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MenuItemReplaceRequest'
            example:
              name: Mie Suit Pedas
              description: Mie dengan sambal level 5
              price: 29000
              category: Mie
              available: true
      responses:
        '200':
          description: Item menu berhasil diganti.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MenuItem'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
    delete:
      tags: [Menu Items]
      operationId: deleteMenuItem
      summary: Soft delete item menu (Master)
      description: Item disembunyikan dari semua endpoint baca dan ditolak untuk pesanan baru. Pesanan lama
        tetap menyimpan snapshot nama dan harga. Menghapus ulang menghasilkan `404`.
      responses:
        '204':
          $ref: '#/components/responses/NoContent'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/menu-items/{menuItemId}/availability:
    parameters:
      - $ref: '#/components/parameters/MenuItemId'
    patch:
      tags: [Menu Items]
      operationId: patchMenuItemAvailability
      summary: Mengubah ketersediaan (Master; Cashier dan Kitchen untuk outlet sendiri)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AvailabilityPatchRequest'
            example:
              available: false
      responses:
        '200':
          description: Item menu terbaru.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MenuItem'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT HS256 dari POST /api/v1/auth/login. Kedaluwarsa setelah 8 jam. Tanpa refresh token.

  headers:
    Location:
      description: URL resource yang baru dibuat, misalnya `/api/v2/orders/{id}`.
      schema:
        type: string
        format: uri-reference

  parameters:
    OutletId:
      name: outletId
      in: path
      required: true
      description: Kunci outlet yang mudah dibaca (D7).
      schema:
        $ref: '#/components/schemas/OutletIdValue'
    TableCode:
      name: code
      in: path
      required: true
      schema:
        $ref: '#/components/schemas/TableCodeValue'
    MenuItemId:
      name: menuItemId
      in: path
      required: true
      schema:
        type: string
        format: uuid
    OrderId:
      name: orderId
      in: path
      required: true
      description: UUID pesanan (bukan nomor pesanan `ORD-xxxx`).
      schema:
        type: string
        format: uuid
    OrderOutletIdQuery:
      name: outletId
      in: query
      required: false
      description: Opsional. Default outlet dari JWT pemanggil. Nilai yang berbeda dari outlet pemanggil menghasilkan 403.
      schema:
        $ref: '#/components/schemas/OutletIdValue'
    OrderStatusQuery:
      name: status
      in: query
      required: false
      description: |
        Filter satu status. Bila tidak diisi, dipakai himpunan penuh milik role
        (Cashier: PENDING, ACCEPTED. Kitchen: PREPARING, READY). Status di luar himpunan role menghasilkan 403.
      schema:
        $ref: '#/components/schemas/OrderStatus'

  responses:
    NoContent:
      description: Terhapus (soft delete). Tanpa body.
    BadRequest:
      description: Body rusak atau validasi field gagal (`MALFORMED_REQUEST`, `VALIDATION_ERROR`, `DUPLICATE_MENU_ITEM`, `OUTLET_IMMUTABLE`).
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          examples:
            v1BodyOnV2:
              summary: Body v1 dikirim ke /api/v2/orders
              value:
                timestamp: "2026-11-12T10:00:00Z"
                status: 400
                code: VALIDATION_ERROR
                message: Request validation failed
                path: /api/v2/orders
                errors:
                  - field: customer
                    message: must not be null
                  - field: location
                    message: must not be null
            outletImmutable:
              summary: PUT mencoba memindahkan outlet pesanan
              value:
                timestamp: "2026-11-12T10:00:00Z"
                status: 400
                code: OUTLET_IMMUTABLE
                message: Order outlet cannot be changed
                path: /api/v2/orders/7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10
                errors:
                  - field: location.outletId
                    message: Order outlet cannot be changed
    Unauthorized:
      description: Token tidak ada atau tidak valid, atau login gagal (`UNAUTHORIZED`).
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            timestamp: "2026-11-12T10:00:00Z"
            status: 401
            code: UNAUTHORIZED
            message: Token is missing or invalid
            path: /api/v2/orders
            errors: []
    Forbidden:
      description: Pelanggaran role atau cakupan outlet (`FORBIDDEN`).
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    NotFound:
      description: Resource pada path tidak ada atau sudah di-soft-delete (`NOT_FOUND`).
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    Conflict:
      description: |
        Konflik status. Kode: `ITEM_UNAVAILABLE`, `INVALID_STATUS_TRANSITION`, `ORDER_NOT_EDITABLE`,
        `CONCURRENT_MODIFICATION`, `ORDER_ALREADY_PAID`.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
          example:
            timestamp: "2026-11-12T10:00:00Z"
            status: 409
            code: ITEM_UNAVAILABLE
            message: One or more items are unavailable
            path: /api/v2/orders
            errors:
              - field: items[0].menuItemId
                message: Item is unavailable
    UnprocessableEntity:
      description: Body merujuk entitas yang tidak valid (`INVALID_OUTLET`, `INVALID_TABLE`, `INVALID_MENU_ITEM`).
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    ServiceUnavailable:
      description: catalog-service tidak dapat dihubungi atau timeout (`CATALOG_UNAVAILABLE`). Tidak ada data yang disimpan.
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'

  examples:
    OrderPending:
      summary: Pesanan baru (PENDING, belum dibayar)
      value:
        id: 7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10
        orderNumber: ORD-0042
        status: PENDING
        customer:
          name: Budi
        location:
          outletId: OUT-01
          tableCode: T-01
        items:
          - menuItemId: 11111111-0000-4000-8000-000000000001
            name: Mie Suit
            unitPrice: 25000
            quantity: 2
            subtotal: 50000
        paymentSummary:
          totalAmount: 50000
          paymentStatus: UNPAID
          paymentMethod: null
          amountTendered: null
          change: null
        createdAt: "2026-11-12T10:00:00Z"
        updatedAt: "2026-11-12T10:00:00Z"
    OrderPaidCash:
      summary: Setelah dibayar tunai (PREPARING, PAID, ada kembalian)
      value:
        id: 7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10
        orderNumber: ORD-0042
        status: PREPARING
        customer:
          name: Budi
        location:
          outletId: OUT-01
          tableCode: T-01
        items:
          - menuItemId: 11111111-0000-4000-8000-000000000001
            name: Mie Suit
            unitPrice: 25000
            quantity: 2
            subtotal: 50000
        paymentSummary:
          totalAmount: 50000
          paymentStatus: PAID
          paymentMethod: CASH
          amountTendered: 60000
          change: 10000
        createdAt: "2026-11-12T10:00:00Z"
        updatedAt: "2026-11-12T10:03:12Z"
    OrderPaidQris:
      summary: Setelah dibayar QRIS (amountTendered dan change null)
      value:
        id: 7d3c0d4e-2f7a-4f63-9a51-0b8c2f3e9a10
        orderNumber: ORD-0042
        status: PREPARING
        customer:
          name: Budi
        location:
          outletId: OUT-01
          tableCode: T-01
        items:
          - menuItemId: 11111111-0000-4000-8000-000000000001
            name: Mie Suit
            unitPrice: 25000
            quantity: 2
            subtotal: 50000
        paymentSummary:
          totalAmount: 50000
          paymentStatus: PAID
          paymentMethod: QRIS
          amountTendered: null
          change: null
        createdAt: "2026-11-12T10:00:00Z"
        updatedAt: "2026-11-12T10:03:12Z"

  schemas:
    OutletIdValue:
      type: string
      pattern: '^OUT-\d{2,}$'
      examples: [OUT-01]
    TableCodeValue:
      type: string
      pattern: '^T-\d{2,3}$'
      examples: [T-01]
    Role:
      type: string
      enum: [MASTER, CASHIER, KITCHEN]
    OrderStatus:
      type: string
      enum: [PENDING, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED]
    PaymentMethod:
      type: string
      enum: [CASH, QRIS, CARD]
    PaymentStatus:
      type: string
      enum: [UNPAID, PAID]

    ErrorResponse:
      type: object
      required: [timestamp, status, code, message, path, errors]
      properties:
        timestamp:
          type: string
          format: date-time
        status:
          type: integer
        code:
          type: string
          description: Kode stabil yang dapat dibaca mesin. Lihat katalog kesalahan di API-Specification.md.
        message:
          type: string
          description: Pesan untuk manusia. Tidak pernah memuat stack trace atau detail internal.
        path:
          type: string
        errors:
          type: array
          description: Selalu ada; array kosong bila tidak ada kesalahan tingkat field.
          items:
            $ref: '#/components/schemas/FieldError'
    FieldError:
      type: object
      required: [field, message]
      properties:
        field:
          type: string
          examples: ["location.tableCode"]
        message:
          type: string

    LoginRequest:
      type: object
      required: [username, password]
      properties:
        username:
          type: string
          minLength: 1
          maxLength: 50
        password:
          type: string
          minLength: 1
          maxLength: 100
    LoginResponse:
      type: object
      required: [accessToken, tokenType, expiresIn, user]
      properties:
        accessToken:
          type: string
        tokenType:
          type: string
          const: Bearer
        expiresIn:
          type: integer
          description: Detik sampai kedaluwarsa (28800 = 8 jam).
        user:
          $ref: '#/components/schemas/StaffIdentity'
    StaffIdentity:
      type: object
      required: [username, role, outletId]
      properties:
        username:
          type: string
        role:
          $ref: '#/components/schemas/Role'
        outletId:
          type: [string, 'null']
          description: Null untuk MASTER.

    Outlet:
      type: object
      required: [id, name, address]
      properties:
        id:
          $ref: '#/components/schemas/OutletIdValue'
        name:
          type: string
        address:
          type: string
    OutletCreateRequest:
      type: object
      required: [id, name, address]
      description: Id outlet diberikan oleh klien (D17).
      properties:
        id:
          $ref: '#/components/schemas/OutletIdValue'
        name:
          type: string
          minLength: 1
          maxLength: 100
        address:
          type: string
          minLength: 1
          maxLength: 255
    OutletReplaceRequest:
      type: object
      required: [name, address]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        address:
          type: string
          minLength: 1
          maxLength: 255
    Table:
      type: object
      required: [id, outletId, code]
      properties:
        id:
          type: string
          format: uuid
        outletId:
          $ref: '#/components/schemas/OutletIdValue'
        code:
          $ref: '#/components/schemas/TableCodeValue'
    TableCreateRequest:
      type: object
      required: [code]
      properties:
        code:
          $ref: '#/components/schemas/TableCodeValue'

    MenuItem:
      type: object
      required: [id, outletId, name, description, price, category, available]
      properties:
        id:
          type: string
          format: uuid
        outletId:
          $ref: '#/components/schemas/OutletIdValue'
        name:
          type: string
        description:
          type: [string, 'null']
        price:
          type: integer
          description: Rupiah, bilangan bulat.
        category:
          type: string
        available:
          type: boolean
    MenuItemCreateRequest:
      type: object
      description: "`available` bernilai true bila tidak dikirim (D17)."
      required: [name, price, category]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: [string, 'null']
          maxLength: 500
        price:
          type: integer
          minimum: 1
          maximum: 10000000
        category:
          type: string
          minLength: 1
          maxLength: 50
        available:
          type: boolean
    MenuItemReplaceRequest:
      type: object
      description: Penggantian penuh; `available` wajib (D17).
      required: [name, price, category, available]
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: [string, 'null']
          maxLength: 500
        price:
          type: integer
          minimum: 1
          maximum: 10000000
        category:
          type: string
          minLength: 1
          maxLength: 50
        available:
          type: boolean
    AvailabilityPatchRequest:
      type: object
      required: [available]
      properties:
        available:
          type: boolean

    OrderItemRequest:
      type: object
      required: [menuItemId, quantity]
      description: Bentuk sama di v1 dan v2. Harga yang dikirim klien diabaikan.
      properties:
        menuItemId:
          type: string
          format: uuid
        quantity:
          type: integer
          minimum: 1
          maximum: 99
    OrderItemResponse:
      type: object
      required: [menuItemId, name, unitPrice, quantity, subtotal]
      description: Bentuk sama di v1 dan v2. `name` dan `unitPrice` adalah snapshot saat create atau PUT.
      properties:
        menuItemId:
          type: string
          format: uuid
        name:
          type: string
        unitPrice:
          type: integer
        quantity:
          type: integer
        subtotal:
          type: integer
          format: int64
    OrderItemList:
      type: array
      minItems: 1
      maxItems: 30
      description: 1 sampai 30 baris. `menuItemId` duplikat menghasilkan 400 `DUPLICATE_MENU_ITEM` (tidak digabung).
      items:
        $ref: '#/components/schemas/OrderItemRequest'
    OrderStatusPatchRequest:
      type: object
      required: [status]
      description: Identik di v1 dan v2 (DTO bersama `dto.common`).
      properties:
        status:
          $ref: '#/components/schemas/OrderStatus'
    PaymentRequest:
      type: object
      required: [paymentMethod]
      description: |
        Identik di v1 dan v2 (DTO bersama `dto.common`). `amountTendered` wajib untuk CASH dan harus ≥ total.
        Harus null atau tidak dikirim untuk QRIS dan CARD.
      properties:
        paymentMethod:
          $ref: '#/components/schemas/PaymentMethod'
        amountTendered:
          type: [integer, 'null']
          format: int64
          minimum: 1

    V2Customer:
      type: object
      required: [name]
      description: Identitas pelanggan. Baru di v2 (menggantikan `customerName` v1).
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 50
          description: Di-trim oleh server sebelum validasi.
    V2Location:
      type: object
      required: [outletId, tableCode]
      description: Lokasi meja. Baru di v2 (menggantikan `outletId` dan `tableCode` v1 di root).
      properties:
        outletId:
          $ref: '#/components/schemas/OutletIdValue'
        tableCode:
          $ref: '#/components/schemas/TableCodeValue'
    V2PaymentSummary:
      type: object
      required: [totalAmount, paymentStatus, paymentMethod, amountTendered, change]
      description: |
        Baru di v2. `totalAmount` pindah dari root v1 ke sini.
        `paymentMethod`, `amountTendered`, `change` bernilai null sampai dibayar;
        `amountTendered` dan `change` tetap null untuk QRIS dan CARD.
      properties:
        totalAmount:
          type: integer
          format: int64
        paymentStatus:
          $ref: '#/components/schemas/PaymentStatus'
        paymentMethod:
          oneOf:
            - $ref: '#/components/schemas/PaymentMethod'
            - type: 'null'
        amountTendered:
          type: [integer, 'null']
          format: int64
        change:
          type: [integer, 'null']
          format: int64
    V2OrderRequest:
      type: object
      required: [customer, location, items]
      description: |
        Kontrak bersarang untuk POST dan PUT.
        Pada PUT, `location.outletId` harus sama dengan outlet pesanan saat ini (`400 OUTLET_IMMUTABLE`, D16).
      properties:
        customer:
          $ref: '#/components/schemas/V2Customer'
        location:
          $ref: '#/components/schemas/V2Location'
        items:
          $ref: '#/components/schemas/OrderItemList'
    V2OrderResponse:
      type: object
      required: [id, orderNumber, status, customer, location, items, paymentSummary, createdAt, updatedAt]
      properties:
        id:
          type: string
          format: uuid
        orderNumber:
          type: string
          pattern: '^ORD-\d{4,}$'
          examples: [ORD-0042]
        status:
          $ref: '#/components/schemas/OrderStatus'
        customer:
          $ref: '#/components/schemas/V2Customer'
        location:
          $ref: '#/components/schemas/V2Location'
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItemResponse'
        paymentSummary:
          $ref: '#/components/schemas/V2PaymentSummary'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
```
