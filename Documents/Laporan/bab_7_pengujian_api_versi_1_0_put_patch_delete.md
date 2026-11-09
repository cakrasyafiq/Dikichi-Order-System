# BAB 7. PENGUJIAN API VERSI 1.0 (PUT, PATCH, & DELETE)

Bab ini memuat pengujian terhadap operasi mutasi PUT, PATCH, dan DELETE pada API versi 1.0 (`/api/v1`) yang diimplementasikan pada Bab 4 dan melengkapi pengujian GET serta POST pada Bab 6. Pengujian dilakukan dengan dua pendekatan yang saling melengkapi, yaitu uji unit pada lapisan service menggunakan JUnit 5 serta Mockito dan uji API *black-box* terhadap sistem yang berjalan penuh melalui API Gateway menggunakan Postman Collection dan Newman. Pembahasan mencakup strategi pengujian, rancangan kasus uji, kode sumber pengujian, cara menjalankan pengujian, serta hasil dan analisis eksekusi.

---

## 7.1 Strategi Pengujian

### 7.1.1 Tujuan dan Ruang Lingkup
* Memastikan seluruh endpoint PUT, PATCH, dan DELETE pada API versi 1.0 (`/api/v1`) berperilaku sesuai spesifikasi pada Bab 2 dan keputusan kontrak PRD (D5, D6, D10, D14, D16, D17, D18), baik pada jalur normal maupun jalur kesalahan.
* Memverifikasi aturan otorisasi per role (`MASTER`, `CASHIER`, `KITCHEN`) dan cakupan outlet (*outlet scope*), termasuk hak lintas outlet bagi `MASTER` serta pembatasan outlet sendiri bagi `CASHIER` dan `KITCHEN` pada `PATCH /api/v1/menu-items/{id}/availability`, `PUT /api/v1/orders/{id}`, dan `PATCH /api/v1/orders/{id}/status`.
* Memverifikasi urutan evaluasi kesalahan yang deterministik pada `PATCH /api/v1/orders/{id}/status` (keputusan D16) serta aturan mesin status pesanan (*order state machine*).
* Memverifikasi perilaku *soft delete* (`204 No Content`) pada outlet, meja, dan item menu, termasuk penolakan penghapusan berulang (`404 NOT_FOUND`), pemeliharaan keunikan ID outlet yang sudah di-*soft-delete* (`409 DUPLICATE_OUTLET_ID`), dan kebolehan pembuatan ulang kode meja yang sama setelah *soft delete* (`201 Created`).
* **Cakupan:** 8 endpoint mutasi PUT, PATCH, dan DELETE pada `catalog-service` serta `order-service` (ditambah verifikasi penolakan `405 METHOD_NOT_ALLOWED` untuk `PUT` pada meja sesuai keputusan D6). Beberapa request POST dan GET disertakan sebagai prasyarat pembentukan data uji mandiri dan verifikasi persistensi perubahan.

### 7.1.2 Lapisan Pengujian

| Lapisan | Alat | Sasaran | Jumlah | Sistem Menyala |
| :--- | :--- | :--- | :--- | :--- |
| **Uji unit** | JUnit 5, Mockito, AssertJ | Logika mutasi pada service tanpa basis data: validasi bisnis, otorisasi role dan outlet, mesin status, *soft delete*, dan perhitungan ulang pesanan | 47 uji mutasi (103 total uji unit di repositori) | Tidak |
| **Uji API** | Postman Collection dijalankan dengan Newman | Perilaku HTTP sistem utuh melalui gateway: status, kode kesalahan, bentuk data, ketiadaan body pada 204, waktu respons | 90 request, 375 asersi | Ya |
| **Smoke test** | Skrip bash dengan curl dan jq | Alur ujung ke ujung dari login sampai pembayaran dan operasi PUT, PATCH, DELETE | 58 pemeriksaan | Ya |

Uji unit memeriksa setiap cabang logika pada `OutletService`, `TableService`, `MenuItemService`, `OrderService`, dan `OrderStateMachine` secara terisolasi dan cepat, sedangkan uji API dengan Newman membuktikan bahwa gateway, layanan, dan PostgreSQL bekerja bersama dalam menegakkan kontrak HTTP.

### 7.1.3 Teknik Perancangan Kasus Uji
* **Partisi ekuivalen:** masukan dikelompokkan menjadi valid dan tidak valid, misalnya status pesanan yang sah (`ACCEPTED`, `CANCELLED`, `READY`, `COMPLETED`), status yang tidak pernah dapat di-PATCH (`PENDING`, `PREPARING`), dan status yang tidak dikenal (`NOPE`).
* **Analisis nilai batas:** harga item menu `0` pada `PUT` (di bawah batas minimum `1`), kuantitas item pesanan `100` pada `PUT` (melampaui batas maksimum `99`), daftar item kosong `[]`, serta pemangkasan spasi di tepi nama dan alamat.
* **Pengujian negatif:** JSON rusak (`400 MALFORMED_REQUEST`), path variabel bukan UUID (`400 VALIDATION_ERROR`), field wajib `available` bernilai `null` pada `PUT` atau `PATCH` item menu, percobaan mengubah `outletId` pada `PUT` pesanan (`400 OUTLET_IMMUTABLE`), dan pemanggilan metode `PUT` pada meja (`405 METHOD_NOT_ALLOWED`).
* **Pengujian berbasis role dan cakupan outlet:** setiap endpoint mutasi diuji tanpa token (`401 UNAUTHORIZED`), dengan role yang tidak berhak (`403 FORBIDDEN`), dengan staf dari outlet berbeda (`403 FORBIDDEN`), dan dengan role yang berhak (`200 OK` atau `204 No Content`).
* **Pengujian transisi status dan siklus hidup (*state transition testing*):** menguji seluruh transisi sah dari `PENDING` -> `ACCEPTED` -> `PREPARING` (melalui pembayaran) -> `READY` -> `COMPLETED` serta jalur pembatalan (`PENDING` -> `CANCELLED`, `ACCEPTED` -> `CANCELLED`), dan menolak pengeditan `PUT` ketika pesanan tidak lagi `PENDING` (`409 ORDER_NOT_EDITABLE`).

### 7.1.4 Lingkungan Pengujian

| Komponen | Versi dan Keterangan |
| :--- | :--- |
| **Docker Desktop** | 4.96.0 (Docker Engine 29.9.1) |
| **Java (host dan citra `eclipse-temurin:21-jre`)** | Temurin 21.0.12.1 |
| **Spring Boot (parent pom)** | 4.0.7, ketiga layanan berhasil dibangun oleh Maven |
| **Tomcat tertanam** | 11.0.22 |
| **Hibernate ORM** | 7.2.19.Final, `ddl-auto: validate` lolos pada kedua layanan |
| **PostgreSQL** | 16.15, dua basis data terpisah (`catalog_db` dan `order_db`) |
| **Migrasi Flyway** | `catalog-service`: V1 sampai V3. `order-service`: V1 |
| **JUnit Jupiter** | 6.0.3 (Surefire 3.5.6) |
| **Mockito dan AssertJ** | Mockito 5.20.0, AssertJ 3.27.7 |
| **Penjalan uji unit** | Maven 3.9 di dalam kontainer `maven:3.9-eclipse-temurin-21` |
| **Penjalan uji API** | Newman di dalam kontainer `postman/newman:alpine` |

---

## 7.2 Rancangan Kasus Uji

### 7.2.1 Kasus Uji Unit

Tabel berikut memuat 47 kasus uji unit yang menguji operasi PUT, PATCH, DELETE, dan aturan mesin status pada `order-service` serta `catalog-service`. Bersama 56 kasus uji GET dan POST pada Bab 6, total uji unit yang dieksekusi pada kedua layanan adalah **103 kasus uji unit**.

| No | Kelas Uji | Skenario yang Diuji |
| :---: | :--- | :--- |
| 1 | OrderStateMachineTest | Hanya lima transisi status yang terdokumentasi yang diizinkan pada PATCH |
| 2 | OrderStateMachineTest | PENDING dan PREPARING tidak pernah menjadi target PATCH |
| 3 | OrderStateMachineTest | Setiap role hanya memiliki target statusnya sendiri (`CASHIER`: `ACCEPTED`/`CANCELLED`; `KITCHEN`: `READY`/`COMPLETED`) |
| 4 | OrderStateMachineTest | Hanya pesanan PENDING yang dapat diedit (`PUT`) dan hanya ACCEPTED yang dapat dibayar |
| 5 | OrderServiceTest | `PUT` pesanan oleh `CASHIER` memperbarui meja, nama pelanggan, dan daftar item, memanggil `flush()`, serta menghitung ulang total menjadi 37.000 |
| 6 | OrderServiceTest | `PUT` pesanan oleh role selain `CASHIER` (`KITCHEN`) ditolak 403 `FORBIDDEN` tanpa memanggil repository atau katalog |
| 7 | OrderServiceTest | `PUT` pada pesanan yang tidak ada menghasilkan 404 `NOT_FOUND` |
| 8 | OrderServiceTest | `PUT` pada pesanan milik outlet lain ditolak 403 `FORBIDDEN` |
| 9 | OrderServiceTest | `PUT` pesanan yang mencoba mengubah `outletId` ditolak 400 `OUTLET_IMMUTABLE` sebelum `catalog-service` dipanggil |
| 10 | OrderServiceTest | `PUT` pada pesanan berstatus selain `PENDING` (`ACCEPTED`) ditolak 409 `ORDER_NOT_EDITABLE` sebelum `catalog-service` dipanggil |
| 11 | OrderServiceTest | `PUT` pesanan dengan item ganda ditolak 400 `DUPLICATE_MENU_ITEM` sebelum `catalog-service` dipanggil |
| 12 | OrderServiceTest | Penolakan `catalog-service` (409 `ITEM_UNAVAILABLE`) saat `PUT` pesanan menghentikan perubahan dan tidak menyimpan data |
| 13 | OrderServiceTest | `PATCH` status: `CASHIER` mengubah pesanan `PENDING` menjadi `ACCEPTED` |
| 14 | OrderServiceTest | `PATCH` status: `CASHIER` membatalkan pesanan `PENDING` maupun `ACCEPTED` menjadi `CANCELLED` |
| 15 | OrderServiceTest | `PATCH` status: `KITCHEN` memindahkan pesanan dari `PREPARING` ke `READY` lalu `COMPLETED` |
| 16 | OrderServiceTest | Urutan evaluasi `PATCH` #1: Pemanggil tanpa identitas atau `MASTER` ditolak 403 `FORBIDDEN` sebelum mengakses repository |
| 17 | OrderServiceTest | Urutan evaluasi `PATCH` #2: Status kosong/spasi atau tidak dikenal (`NOPE`) ditolak 400 `VALIDATION_ERROR` sebelum mencari pesanan |
| 18 | OrderServiceTest | Urutan evaluasi `PATCH` #3: Pesanan yang tidak ada menghasilkan 404 `NOT_FOUND` |
| 19 | OrderServiceTest | Urutan evaluasi `PATCH` #4: Pesanan milik outlet lain ditolak 403 `FORBIDDEN` |
| 20 | OrderServiceTest | Urutan evaluasi `PATCH` #5: Target status `PENDING` atau `PREPARING` ditolak 409 `INVALID_STATUS_TRANSITION` |
| 21 | OrderServiceTest | Urutan evaluasi `PATCH` #6: `KITCHEN` tidak boleh membatalkan pesanan dan `CASHIER` tidak boleh mengubah ke `READY` (403 `FORBIDDEN`) |
| 22 | OrderServiceTest | Urutan evaluasi `PATCH` #7: Transisi tidak sah dari status saat ini (`ACCEPTED` -> `ACCEPTED`, `PREPARING` -> `COMPLETED`) ditolak 409 `INVALID_STATUS_TRANSITION` |
| 23 | OutletServiceTest | `MASTER` memperbarui outlet (`PUT`) dan spasi di tepi nama serta alamat dipangkas |
| 24 | OutletServiceTest | `PUT` pada outlet yang tidak ada atau sudah dihapus menghasilkan 404 `NOT_FOUND` |
| 25 | OutletServiceTest | Role selain `MASTER` (`CASHIER`) ditolak 403 `FORBIDDEN` saat `PUT` outlet |
| 26 | OutletServiceTest | Pemanggil tanpa identitas ditolak 403 `FORBIDDEN` saat `PUT` outlet |
| 27 | OutletServiceTest | `MASTER` menghapus outlet (`DELETE`) secara *soft delete* (`isDeleted() == true`) |
| 28 | OutletServiceTest | `DELETE` pada outlet yang tidak ada atau sudah dihapus menghasilkan 404 `NOT_FOUND` |
| 29 | OutletServiceTest | Role selain `MASTER` (`KITCHEN`) ditolak 403 `FORBIDDEN` saat `DELETE` outlet |
| 30 | TableServiceTest | `MASTER` menghapus meja (`DELETE`) secara *soft delete* (`deleted == true`) |
| 31 | TableServiceTest | `DELETE` pada kode meja yang tidak ada atau sudah dihapus menghasilkan 404 `NOT_FOUND` |
| 32 | TableServiceTest | `DELETE` meja pada outlet yang tidak ada menghasilkan 404 `NOT_FOUND` |
| 33 | TableServiceTest | Role selain `MASTER` (`CASHIER`) ditolak 403 `FORBIDDEN` saat `DELETE` meja |
| 34 | TableServiceTest | Pemanggil tanpa identitas ditolak 403 `FORBIDDEN` saat `DELETE` meja |
| 35 | MenuItemServiceTest | `MASTER` mengganti item menu (`PUT`), memangkas spasi nama dan kategori, serta memperbarui deskripsi, harga, dan `available` |
| 36 | MenuItemServiceTest | `PUT` pada item menu yang tidak ada menghasilkan 404 `NOT_FOUND` |
| 37 | MenuItemServiceTest | Role selain `MASTER` (`CASHIER`) ditolak 403 `FORBIDDEN` saat `PUT` item menu |
| 38 | MenuItemServiceTest | `MASTER` dapat mengubah ketersediaan (`PATCH availability`) item menu lintas outlet |
| 39 | MenuItemServiceTest | `CASHIER` dapat mengubah ketersediaan item menu pada outlet miliknya sendiri |
| 40 | MenuItemServiceTest | `KITCHEN` dapat mengubah ketersediaan item menu pada outlet miliknya sendiri |
| 41 | MenuItemServiceTest | `CASHIER` ditolak 403 `FORBIDDEN` saat mengubah ketersediaan item menu milik outlet lain |
| 42 | MenuItemServiceTest | `KITCHEN` ditolak 403 `FORBIDDEN` saat mengubah ketersediaan item menu milik outlet lain |
| 43 | MenuItemServiceTest | Pemanggil tanpa identitas ditolak 403 `FORBIDDEN` saat `PATCH` ketersediaan item menu |
| 44 | MenuItemServiceTest | `PATCH` ketersediaan pada item menu yang tidak ada menghasilkan 404 `NOT_FOUND` |
| 45 | MenuItemServiceTest | `MASTER` menghapus item menu (`DELETE`) secara *soft delete* (`deleted == true`) |
| 46 | MenuItemServiceTest | `DELETE` pada item menu yang tidak ada atau sudah dihapus menghasilkan 404 `NOT_FOUND` |
| 47 | MenuItemServiceTest | Role selain `MASTER` (`CASHIER`) ditolak 403 `FORBIDDEN` saat `DELETE` item menu |

---

### 7.2.2 Kasus Uji API

Koleksi uji API disimpan pada berkas `dikichi-v1-put-patch-delete.postman_collection.json` dan disusun sebagai satu alur berurutan yang mandiri. Kelompok 00 menyiapkan token ketiga role serta membuat entitas uji tersendiri (outlet baru dengan ID acak `{{newOutletId}}`, meja uji, item menu uji, dan pesanan uji) sehingga pengujian mutasi dan penghapusan tidak merusak data *seed* pada `OUT-01` dan koleksi dapat dijalankan berulang kali.

| Kelompok | Request | Asersi | Cakupan |
| :--- | :---: | :---: | :--- |
| **00 Prasyarat Autentikasi dan Data Uji** | 8 | 33 | Login tiga role, pembuatan outlet uji, meja uji, menu uji lintas outlet dan dalam `OUT-01`, serta pesanan awal `PENDING` |
| **01 Catalog PUT** (`PUT /outlets/{id}`, `PUT /menu-items/{id}`) | 14 | 61 | Otorisasi (`401`, `403`), `404`, validasi body dan UUID (`400`), JSON rusak (`400`), pembaruan sukses `200` dengan pemangkasan spasi dan verifikasi `GET` |
| **02 Catalog PATCH** (`PATCH /menu-items/{id}/availability`) | 11 | 46 | Otorisasi (`401`, `403` lintas outlet oleh `CASHIER` dan `KITCHEN`), validasi (`400`), `404`, sukses `200` oleh `MASTER`, `CASHIER` (`false`), penolakan pesanan `409 ITEM_UNAVAILABLE`, dan `KITCHEN` (`true`) |
| **03 Order PUT** (`PUT /orders/{id}`) | 14 | 63 | Otorisasi (`401`, `403` oleh `KITCHEN` dan `MASTER`), `404`, `400 OUTLET_IMMUTABLE`, `400 DUPLICATE_MENU_ITEM`, validasi batas (`400`), validasi katalog (`422`, `409`), dan `200` perhitungan ulang total menjadi 37.000 |
| **04 Order PATCH** (`PATCH /orders/{id}/status`) | 23 | 95 | Urutan evaluasi D16 (`401`, `403 MASTER`, `400` status kosong/tidak dikenal/JSON rusak, `404`, `409` target `PENDING`/`PREPARING`, `403` kepemilikan role, `409` transisi tidak sah), siklus hidup penuh sampai `COMPLETED`, `409 ORDER_NOT_EDITABLE` saat `PUT` pesanan `ACCEPTED`, dan pembatalan pesanan |
| **05 Catalog DELETE** (`DELETE` Menu, Meja, Outlet) | 20 | 77 | Otorisasi (`401`, `403`), UUID salah (`400`), `405 METHOD_NOT_ALLOWED` untuk `PUT` meja, *soft delete* `204` dengan body kosong, `404` pada penghapusan/pembacaan/pembaruan ulang, pembuatan ulang kode meja yang sudah dihapus (`201`), serta penolakan `409 DUPLICATE_OUTLET_ID` untuk ID outlet yang sudah di-*soft-delete* |
| **Total** | **90** | **375** | |

Setiap request kesalahan diperiksa dengan asersi standar yang seragam: kode status HTTP, kesamaan struktur kesalahan (enam field `timestamp`, `status`, `code`, `message`, `path`, `errors`), kecocokan nilai `code`, detail `errors[]` untuk kesalahan validasi field, serta waktu respons di bawah 2000 ms.

---

### 7.2.3 Keterlacakan Endpoint terhadap Pengujian

| Endpoint | Uji Unit (Mutasi) | Request Uji API (nomor) |
| :--- | :--- | :--- |
| `PUT /api/v1/outlets/{outletId}` | OutletServiceTest (4) | 9 sampai 16, 78 (pasca-*delete* menu), 90 (prasyarat) |
| `DELETE /api/v1/outlets/{outletId}` | OutletServiceTest (3) | 86 sampai 90 |
| `DELETE /api/v1/outlets/{outletId}/tables/{code}` | TableServiceTest (5) | 79 (`PUT` ditolak 405), 80 sampai 85 |
| `PUT /api/v1/menu-items/{menuItemId}` | MenuItemServiceTest (3) | 17 sampai 22, 77 |
| `PATCH /api/v1/menu-items/{menuItemId}/availability` | MenuItemServiceTest (7) | 23 sampai 33, 78 |
| `DELETE /api/v1/menu-items/{menuItemId}` | MenuItemServiceTest (3) | 71 sampai 78 |
| `PUT /api/v1/orders/{orderId}` | OrderServiceTest (8), OrderStateMachineTest (1) | 34 sampai 47, 61 |
| `PATCH /api/v1/orders/{orderId}/status` | OrderServiceTest (10), OrderStateMachineTest (3) | 48 sampai 70 (62 dan 68 prasyarat POST) |

---

## 7.3 Kode Sumber Pengujian

Seluruh kode pengujian berada pada repositori: uji unit pada `src/test/java` di masing-masing layanan, dan koleksi uji API pada folder `Backend/tests/api`.

### 7.3.1 Uji Unit order-service

`OrderStateMachineTest` menguji aturan transisi status dan syarat pengeditan pesanan, sedangkan `OrderServiceTest` menguji metode `replace` (`PUT /orders/{id}`) dan `updateStatus` (`PATCH /orders/{id}/status`) beserta urutan evaluasi kesalahannya.

#### `order-service: src/test/.../order/service/OrderStateMachineTest.java`
```java
package com.ambatucode.dikichi.order.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.Role;
import org.junit.jupiter.api.Test;

class OrderStateMachineTest {

    @Test
    void allowsOnlyDocumentedPatchTransitions() {
        assertTrue(OrderStateMachine.allows(OrderStatus.PENDING, OrderStatus.ACCEPTED));
        assertTrue(OrderStateMachine.allows(OrderStatus.PENDING, OrderStatus.CANCELLED));
        assertTrue(OrderStateMachine.allows(OrderStatus.ACCEPTED, OrderStatus.CANCELLED));
        assertTrue(OrderStateMachine.allows(OrderStatus.PREPARING, OrderStatus.READY));
        assertTrue(OrderStateMachine.allows(OrderStatus.READY, OrderStatus.COMPLETED));

        assertFalse(OrderStateMachine.allows(OrderStatus.ACCEPTED, OrderStatus.ACCEPTED));
        assertFalse(OrderStateMachine.allows(OrderStatus.ACCEPTED, OrderStatus.PREPARING));
        assertFalse(OrderStateMachine.allows(OrderStatus.PENDING, OrderStatus.READY));
        assertFalse(OrderStateMachine.allows(OrderStatus.COMPLETED, OrderStatus.CANCELLED));
        assertFalse(OrderStateMachine.allows(OrderStatus.CANCELLED, OrderStatus.ACCEPTED));
    }

    @Test
    void pendingAndPreparingAreNeverPatchTargets() {
        assertTrue(OrderStateMachine.isNeverPatchable(OrderStatus.PENDING));
        assertTrue(OrderStateMachine.isNeverPatchable(OrderStatus.PREPARING));
        assertFalse(OrderStateMachine.isNeverPatchable(OrderStatus.READY));
    }

    @Test
    void eachRoleOwnsOnlyItsTargets() {
        assertTrue(OrderStateMachine.roleOwns(Role.CASHIER, OrderStatus.ACCEPTED));
        assertTrue(OrderStateMachine.roleOwns(Role.CASHIER, OrderStatus.CANCELLED));
        assertFalse(OrderStateMachine.roleOwns(Role.CASHIER, OrderStatus.READY));
        assertTrue(OrderStateMachine.roleOwns(Role.KITCHEN, OrderStatus.READY));
        assertTrue(OrderStateMachine.roleOwns(Role.KITCHEN, OrderStatus.COMPLETED));
        assertFalse(OrderStateMachine.roleOwns(Role.KITCHEN, OrderStatus.CANCELLED));
        assertFalse(OrderStateMachine.roleOwns(Role.MASTER, OrderStatus.ACCEPTED));
    }

    @Test
    void onlyPendingOrdersAreEditableAndOnlyAcceptedOrdersArePayable() {
        assertTrue(OrderStateMachine.isEditable(OrderStatus.PENDING));
        assertFalse(OrderStateMachine.isEditable(OrderStatus.ACCEPTED));
        assertTrue(OrderStateMachine.isPayable(OrderStatus.ACCEPTED));
        assertFalse(OrderStateMachine.isPayable(OrderStatus.PENDING));
    }
}
```

#### `order-service: src/test/.../order/service/OrderServiceTest.java` (Bagian PUT dan PATCH)
```java
    @Test
    void replaceUpdatesTableCustomerAndItemsAndRecalculatesTotal() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        stored.addItem(new OrderItem(MENU_MIE, "Mie Suit", 25000, 2));
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));
        when(catalogClient.validate(eq("OUT-01"), eq("T-05"), any())).thenReturn(List.of(
                new CatalogItem(MENU_MIE, "Mie Suit", 25000),
                new CatalogItem(MENU_TEH, "Es Teh Manis", 6000)));
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-05", "Budi Santoso",
                List.of(new OrderItemRequest(MENU_MIE, 1), new OrderItemRequest(MENU_TEH, 2)));

        Order replaced = service.replace(id, command);

        assertThat(replaced.getOrderNumber()).isEqualTo("ORD-0001");
        assertThat(replaced.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(replaced.getTableCode()).isEqualTo("T-05");
        assertThat(replaced.getCustomerName()).isEqualTo("Budi Santoso");
        assertThat(replaced.getTotalAmount()).isEqualTo(37000L);
        assertThat(replaced.getItems()).extracting(OrderItem::getQuantity).containsExactlyInAnyOrder(1, 2);
        verify(orders).flush();
        verify(orders).saveAndFlush(stored);
    }

    @Test
    void nonCashierCannotReplaceOrder() {
        caller.populate(Role.KITCHEN, "OUT-01");
        UUID id = UUID.randomUUID();
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
        verifyNoInteractions(orders, catalogClient);
    }

    @Test
    void replacingUnknownOrderReturnsNotFound() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.empty());
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void replacingOrderOfAnotherOutletIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-02", "T-01", "Budi")));
        CreateOrderCommand command = new CreateOrderCommand("OUT-02", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void replacingOrderWithDifferentOutletIsRejected() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-01", "T-01", "Budi")));
        CreateOrderCommand command = new CreateOrderCommand("OUT-02", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("OUTLET_IMMUTABLE");
        assertThat(error.getErrors().get(0).field()).isEqualTo("outletId");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void replacingNonPendingOrderIsRejected() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        stored.changeStatus(OrderStatus.ACCEPTED);
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ORDER_NOT_EDITABLE");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void replacingOrderWithDuplicateMenuItemIsRejectedBeforeCatalogCall() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-01", "T-01", "Budi")));
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1), new OrderItemRequest(MENU_MIE, 3)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("DUPLICATE_MENU_ITEM");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void catalogRejectionOnReplacePreventsUpdate() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-01", "T-01", "Budi")));
        when(catalogClient.validate(any(), any(), any())).thenThrow(
                new ApiException(HttpStatus.CONFLICT, "ITEM_UNAVAILABLE", "One or more items are unavailable", List.of()));
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ITEM_UNAVAILABLE");
        verify(orders, never()).saveAndFlush(any(Order.class));
    }

    @Test
    void cashierAcceptsPendingOrder() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        Order updated = service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED"));

        assertThat(updated.getStatus()).isEqualTo(OrderStatus.ACCEPTED);
        verify(orders).saveAndFlush(stored);
    }

    @Test
    void cashierCancelsPendingAndAcceptedOrders() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID pendingId = UUID.randomUUID();
        Order pending = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(pendingId)).thenReturn(Optional.of(pending));

        UUID acceptedId = UUID.randomUUID();
        Order accepted = new Order("ORD-0002", "OUT-01", "T-02", "Siti");
        accepted.changeStatus(OrderStatus.ACCEPTED);
        when(orders.findWithItemsById(acceptedId)).thenReturn(Optional.of(accepted));

        assertThat(service.updateStatus(pendingId, new OrderStatusPatchRequest("CANCELLED")).getStatus())
                .isEqualTo(OrderStatus.CANCELLED);
        assertThat(service.updateStatus(acceptedId, new OrderStatusPatchRequest("CANCELLED")).getStatus())
                .isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void kitchenMovesOrderFromPreparingToReadyAndCompleted() {
        caller.populate(Role.KITCHEN, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        stored.changeStatus(OrderStatus.PREPARING);
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        Order ready = service.updateStatus(id, new OrderStatusPatchRequest("READY"));
        assertThat(ready.getStatus()).isEqualTo(OrderStatus.READY);

        Order completed = service.updateStatus(id, new OrderStatusPatchRequest("COMPLETED"));
        assertThat(completed.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    }

    @Test
    void masterAndAnonymousCannotUpdateOrderStatus() {
        UUID id = UUID.randomUUID();

        ApiException anonError = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));
        assertThat(anonError.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);

        caller.populate(Role.MASTER, null);
        ApiException masterError = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));
        assertThat(masterError.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        verifyNoInteractions(orders);
    }

    @Test
    void blankOrUnknownStatusIsRejectedBeforeLookingUpOrder() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();

        ApiException blankError = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("  ")));
        assertThat(blankError.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(blankError.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(blankError.getErrors().get(0).field()).isEqualTo("status");

        ApiException unknownError = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("NOPE")));
        assertThat(unknownError.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(unknownError.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(unknownError.getErrors().get(0).field()).isEqualTo("status");
        verifyNoInteractions(orders);
    }

    @Test
    void updatingStatusOfUnknownOrderReturnsNotFound() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void updatingStatusOfOrderFromAnotherOutletIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-02", "T-01", "Budi")));

        ApiException error = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void patchingToPendingOrPreparingIsRejectedAsInvalidTransition() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        stored.changeStatus(OrderStatus.ACCEPTED);
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        ApiException pendingErr = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("PENDING")));
        assertThat(pendingErr.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(pendingErr.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");

        ApiException prepErr = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("PREPARING")));
        assertThat(prepErr.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(prepErr.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");
    }

    @Test
    void kitchenCannotCancelAndCashierCannotMarkReadyOrCompleted() {
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        caller.populate(Role.KITCHEN, "OUT-01");
        ApiException kitchenCancel = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("CANCELLED")));
        assertThat(kitchenCancel.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(kitchenCancel.getCode()).isEqualTo("FORBIDDEN");

        caller.populate(Role.CASHIER, "OUT-01");
        stored.changeStatus(OrderStatus.PREPARING);
        ApiException cashierReady = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("READY")));
        assertThat(cashierReady.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(cashierReady.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void disallowedTransitionFromCurrentStatusReturnsConflict() {
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        caller.populate(Role.CASHIER, "OUT-01");
        stored.changeStatus(OrderStatus.ACCEPTED);
        ApiException acceptAgain = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));
        assertThat(acceptAgain.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(acceptAgain.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");

        caller.populate(Role.KITCHEN, "OUT-01");
        stored.changeStatus(OrderStatus.PREPARING);
        ApiException skipReady = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("COMPLETED")));
        assertThat(skipReady.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(skipReady.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");
    }
```

---

### 7.3.2 Uji Unit catalog-service

Mencakup pembaruan (`PUT`) dan penghapusan (`DELETE`) pada `OutletServiceTest`, penghapusan (`DELETE`) pada `TableServiceTest`, serta pembaruan (`PUT`), pengubahan ketersediaan (`PATCH`), dan penghapusan (`DELETE`) pada `MenuItemServiceTest`.

#### `catalog-service: src/test/.../catalog/service/OutletServiceTest.java` (Bagian PUT dan DELETE)
```java
    @Test
    void masterReplacesOutletWithTrimmedFields() {
        caller.populate(Role.MASTER, null);
        Outlet existing = new Outlet("OUT-01", "Lama", "Alamat Lama");
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(existing));

        OutletResponse response = service.replace("OUT-01",
                new OutletReplaceRequest("  Dikichi Baru  ", "  Jl. Baru No. 2  "));

        assertThat(response.id()).isEqualTo("OUT-01");
        assertThat(response.name()).isEqualTo("Dikichi Baru");
        assertThat(response.address()).isEqualTo("Jl. Baru No. 2");
    }

    @Test
    void replacingUnknownOutletReturnsNotFound() {
        caller.populate(Role.MASTER, null);
        when(outlets.findByIdAndDeletedFalse("OUT-404")).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.replace("OUT-404",
                new OutletReplaceRequest("Nama", "Alamat")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void nonMasterCannotReplaceOutlet() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.replace("OUT-01",
                new OutletReplaceRequest("Nama", "Alamat")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void anonymousCallerCannotReplaceOutlet() {
        ApiException error = assertApiError(() -> service.replace("OUT-01",
                new OutletReplaceRequest("Nama", "Alamat")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void masterDeletesOutletWithSoftDelete() {
        caller.populate(Role.MASTER, null);
        Outlet existing = new Outlet("OUT-01", "Dikichi 01", "Jl. A");
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(existing));

        service.delete("OUT-01");

        assertThat(existing.isDeleted()).isTrue();
    }

    @Test
    void deletingUnknownOutletReturnsNotFound() {
        caller.populate(Role.MASTER, null);
        when(outlets.findByIdAndDeletedFalse("OUT-404")).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.delete("OUT-404"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void nonMasterCannotDeleteOutlet() {
        caller.populate(Role.KITCHEN, "OUT-01");

        ApiException error = assertApiError(() -> service.delete("OUT-01"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }
```

#### `catalog-service: src/test/.../catalog/service/TableServiceTest.java` (Bagian DELETE)
```java
    @Test
    void masterDeletesTableWithSoftDelete() {
        caller.populate(Role.MASTER, null);
        DiningTable table = new DiningTable("OUT-01", "T-21");
        when(tables.findByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-21")).thenReturn(Optional.of(table));

        service.delete("OUT-01", "T-21");

        assertThat(table).extracting("deleted").isEqualTo(true);
    }

    @Test
    void deletingUnknownTableReturnsNotFound() {
        caller.populate(Role.MASTER, null);
        when(tables.findByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-99")).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.delete("OUT-01", "T-99"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void deletingTableInUnknownOutletReturnsNotFound() {
        caller.populate(Role.MASTER, null);

        ApiException error = assertApiError(() -> service.delete("OUT-404", "T-01"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void nonMasterCannotDeleteTable() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.delete("OUT-01", "T-01"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void anonymousCallerCannotDeleteTable() {
        ApiException error = assertApiError(() -> service.delete("OUT-01", "T-01"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }
```

#### `catalog-service: src/test/.../catalog/service/MenuItemServiceTest.java` (Bagian PUT, PATCH, dan DELETE)
```java
    @Test
    void masterReplacesMenuItemWithTrimmedFields() {
        caller.populate(Role.MASTER, null);
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-01", "Lama", null, 15000, "Lama", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        MenuItemResponse response = service.replace(id,
                new MenuItemReplaceRequest("  Mie Spesial  ", "Pedas manis", 28000, "  Mie  ", false));

        assertThat(response.name()).isEqualTo("Mie Spesial");
        assertThat(response.description()).isEqualTo("Pedas manis");
        assertThat(response.price()).isEqualTo(28000);
        assertThat(response.category()).isEqualTo("Mie");
        assertThat(response.available()).isFalse();
    }

    @Test
    void replacingUnknownMenuItemReturnsNotFound() {
        caller.populate(Role.MASTER, null);
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.replace(id,
                new MenuItemReplaceRequest("Mie", null, 25000, "Mie", true)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void nonMasterCannotReplaceMenuItem() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();

        ApiException error = assertApiError(() -> service.replace(id,
                new MenuItemReplaceRequest("Mie", null, 25000, "Mie", true)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void masterCanChangeAvailabilityAcrossOutlets() {
        caller.populate(Role.MASTER, null);
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-02", "Mie Suit", null, 25000, "Mie", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        MenuItemResponse response = service.changeAvailability(id, new AvailabilityPatchRequest(false));

        assertThat(response.available()).isFalse();
    }

    @Test
    void cashierCanChangeAvailabilityInOwnOutlet() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-01", "Mie Suit", null, 25000, "Mie", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        MenuItemResponse response = service.changeAvailability(id, new AvailabilityPatchRequest(false));

        assertThat(response.available()).isFalse();
    }

    @Test
    void kitchenCanChangeAvailabilityInOwnOutlet() {
        caller.populate(Role.KITCHEN, "OUT-01");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-01", "Mie Suit", null, 25000, "Mie", false);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        MenuItemResponse response = service.changeAvailability(id, new AvailabilityPatchRequest(true));

        assertThat(response.available()).isTrue();
    }

    @Test
    void cashierCannotChangeAvailabilityOfAnotherOutlet() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-02", "Mie Suit", null, 25000, "Mie", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        ApiException error = assertApiError(() -> service.changeAvailability(id, new AvailabilityPatchRequest(false)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
        assertThat(existing.isAvailable()).isTrue();
    }

    @Test
    void kitchenCannotChangeAvailabilityOfAnotherOutlet() {
        caller.populate(Role.KITCHEN, "OUT-01");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-02", "Mie Suit", null, 25000, "Mie", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        ApiException error = assertApiError(() -> service.changeAvailability(id, new AvailabilityPatchRequest(false)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void anonymousCallerCannotChangeAvailability() {
        UUID id = UUID.randomUUID();

        ApiException error = assertApiError(() -> service.changeAvailability(id, new AvailabilityPatchRequest(false)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void changingAvailabilityOfUnknownMenuItemReturnsNotFound() {
        caller.populate(Role.MASTER, null);
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.changeAvailability(id, new AvailabilityPatchRequest(false)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void masterDeletesMenuItemWithSoftDelete() {
        caller.populate(Role.MASTER, null);
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-01", "Mie Suit", null, 25000, "Mie", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        service.delete(id);

        assertThat(existing).extracting("deleted").isEqualTo(true);
    }

    @Test
    void deletingUnknownMenuItemReturnsNotFound() {
        caller.populate(Role.MASTER, null);
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.delete(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void nonMasterCannotDeleteMenuItem() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();

        ApiException error = assertApiError(() -> service.delete(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }
```

---

### 7.3.3 Uji API dengan Newman

Koleksi lengkap tersimpan pada berkas `dikichi-v1-put-patch-delete.postman_collection.json` (90 request). Berikut tiga request representatif beserta skrip asersinya, yaitu penggantian isi pesanan `PENDING` dengan `PUT`, transisi status pesanan dengan `PATCH`, dan penghapusan *soft delete* item menu dengan `DELETE`, diikuti skrip penjalan `run-newman.ps1`.

#### Request: PUT pesanan PENDING oleh CASHIER
```json
{
  "name": "PUT pesanan PENDING oleh CASHIER",
  "event": [
    {
      "listen": "test",
      "script": {
        "type": "text/javascript",
        "exec": [
          "pm.test(\"Status 200\", () => pm.response.to.have.status(200));",
          "pm.test(\"Waktu respons di bawah 2000 ms\", () => pm.expect(pm.response.responseTime).to.be.below(2000));",
          "pm.test(\"Content-Type JSON\", () => pm.expect(pm.response.headers.get(\"Content-Type\")).to.include(\"application/json\"));",
          "const j = pm.response.json();",
          "pm.test(\"ID dan nomor pesanan tetap sama\", () => { pm.expect(j.id).to.eql(pm.collectionVariables.get(\"orderId\")); pm.expect(j.orderNumber).to.eql(pm.collectionVariables.get(\"orderNumber\")); });",
          "pm.test(\"Status tetap PENDING\", () => pm.expect(j.status).to.eql(\"PENDING\"));",
          "pm.test(\"Meja dan nama pelanggan diperbarui\", () => { pm.expect(j.tableCode).to.eql(\"T-05\"); pm.expect(j.customerName).to.eql(\"Budi Santoso\"); });",
          "pm.test(\"Daftar item dan total dihitung ulang menjadi 37000\", () => { pm.expect(j.items).to.have.lengthOf(2); pm.expect(j.totalAmount).to.eql(37000); });",
          "pm.test(\"Kontrak v1 tetap datar tanpa objek bersarang\", () => { pm.expect(j).to.not.have.property(\"customer\"); pm.expect(j).to.not.have.property(\"location\"); pm.expect(j).to.not.have.property(\"paymentSummary\"); });"
        ]
      }
    }
  ],
  "request": {
    "method": "PUT",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{cashierToken}}"
      },
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "url": "{{baseUrl}}/api/v1/orders/{{orderId}}",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"outletId\": \"OUT-01\",\n  \"tableCode\": \"T-05\",\n  \"customerName\": \"  Budi Santoso  \",\n  \"items\": [\n    {\"menuItemId\": \"{{mieSuitId}}\", \"quantity\": 1},\n    {\"menuItemId\": \"{{esTehId}}\", \"quantity\": 2}\n  ]\n}"
    }
  }
}
```

#### Request: PATCH status dari PENDING ke ACCEPTED oleh CASHIER
```json
{
  "name": "PATCH status dari PENDING ke ACCEPTED oleh CASHIER",
  "event": [
    {
      "listen": "test",
      "script": {
        "type": "text/javascript",
        "exec": [
          "pm.test(\"Status 200\", () => pm.response.to.have.status(200));",
          "pm.test(\"Waktu respons di bawah 2000 ms\", () => pm.expect(pm.response.responseTime).to.be.below(2000));",
          "pm.test(\"Content-Type JSON\", () => pm.expect(pm.response.headers.get(\"Content-Type\")).to.include(\"application/json\"));",
          "const j = pm.response.json();",
          "pm.test(\"Status berpindah ke ACCEPTED\", () => pm.expect(j.status).to.eql(\"ACCEPTED\"));",
          "pm.test(\"Total tetap 37000\", () => pm.expect(j.totalAmount).to.eql(37000));"
        ]
      }
    }
  ],
  "request": {
    "method": "PATCH",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{cashierToken}}"
      },
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "url": "{{baseUrl}}/api/v1/orders/{{orderId}}/status",
    "body": {
      "mode": "raw",
      "raw": "{\"status\":\"ACCEPTED\"}"
    }
  }
}
```

#### Request: DELETE item menu oleh MASTER
```json
{
  "name": "DELETE item menu oleh MASTER",
  "event": [
    {
      "listen": "test",
      "script": {
        "type": "text/javascript",
        "exec": [
          "pm.test(\"Status 204\", () => pm.response.to.have.status(204));",
          "pm.test(\"Waktu respons di bawah 2000 ms\", () => pm.expect(pm.response.responseTime).to.be.below(2000));",
          "pm.test(\"Body respons kosong\", () => pm.expect(pm.response.text()).to.be.empty);"
        ]
      }
    }
  ],
  "request": {
    "method": "DELETE",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{masterToken}}"
      }
    ],
    "url": "{{baseUrl}}/api/v1/menu-items/{{testMenuId}}"
  }
}
```

#### `tests/api/run-newman.ps1`
```powershell
param(
    [string]$BaseUrl = "http://host.docker.internal:8080",
    [string]$Collection = "dikichi-v1-get-post.postman_collection.json"
)

$envFile = Join-Path $PSScriptRoot "../../../.env"
if (-not (Test-Path $envFile)) {
    Write-Error "File .env tidak ditemukan di root proyek: $envFile"
    exit 2
}

$values = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2] }
}

docker run --rm -v "${PSScriptRoot}:/etc/newman" postman/newman:alpine run $Collection `
    --env-var "baseUrl=$BaseUrl" `
    --env-var "masterPassword=$($values['SEED_MASTER_PASSWORD'])" `
    --env-var "cashierPassword=$($values['SEED_CASHIER_PASSWORD'])" `
    --env-var "kitchenPassword=$($values['SEED_KITCHEN_PASSWORD'])" `
    --reporters cli
```

---

## 7.4 Cara Menjalankan Pengujian

Uji unit tidak membutuhkan sistem yang menyala. Uji API membutuhkan seluruh kontainer berstatus *healthy*.

```powershell
cd Backend/order-service
docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test

cd ../catalog-service
docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test

cd ..
docker compose --env-file ../.env up -d gateway-service
docker compose --env-file ../.env ps

powershell -ExecutionPolicy Bypass -File ./tests/api/run-newman.ps1 -Collection dikichi-v1-put-patch-delete.postman_collection.json
```

Skrip `run-newman.ps1` menerima parameter `-Collection` sehingga dapat menjalankan koleksi GET & POST (`dikichi-v1-get-post.postman_collection.json`) maupun koleksi PUT, PATCH, & DELETE (`dikichi-v1-put-patch-delete.postman_collection.json`) menggunakan variabel sandi dari berkas `.env`.

---

## 7.5 Hasil Pengujian

### 7.5.1 Hasil Uji Unit

| Kelas Uji | Dijalankan | Gagal | Error | Dilewati | Waktu (detik) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `order-service: OrderServiceTest` | 32 | 0 | 0 | 0 | 4,597 |
| `order-service: OrderStateMachineTest` | 4 | 0 | 0 | 0 | 0,031 |
| `order-service: PaymentServiceTest` | 11 | 0 | 0 | 0 | 0,194 |
| **Total order-service** | **47** | **0** | **0** | **0** | **10,265 (BUILD SUCCESS)** |
| `catalog-service: AuthServiceTest` | 4 | 0 | 0 | 0 | 5,319 |
| `catalog-service: MenuItemServiceTest` | 21 | 0 | 0 | 0 | 0,515 |
| `catalog-service: OrderValidationServiceTest` | 6 | 0 | 0 | 0 | 0,252 |
| `catalog-service: OutletServiceTest` | 14 | 0 | 0 | 0 | 0,081 |
| `catalog-service: TableServiceTest` | 11 | 0 | 0 | 0 | 0,063 |
| **Total catalog-service** | **56** | **0** | **0** | **0** | **11,996 (BUILD SUCCESS)** |

Seluruh 103 uji unit (47 uji mutasi PUT, PATCH, DELETE beserta mesin status dan 56 uji GET तथा POST dari iterasi sebelumnya) lulus tanpa kegagalan maupun error.

### 7.5.2 Hasil Uji API (Newman)

| Ukuran | Dijalankan | Gagal |
| :--- | :---: | :---: |
| Iterasi | 1 | 0 |
| Request | 90 | 0 |
| Skrip uji (*test-scripts*) | 90 | 0 |
| Skrip prarequest | 1 | 0 |
| Asersi | 375 | 0 |

Total durasi eksekusi 4,6 detik. Rata-rata waktu respons 33 ms dengan minimum 7 ms, maksimum 302 ms, dan simpangan baku 43 ms. Seluruh respons berada jauh di bawah ambang 2000 ms yang ditetapkan pada asersi.

| Kelompok | Request | Asersi | Gagal | Hasil |
| :--- | :---: | :---: | :---: | :---: |
| 00 Prasyarat Autentikasi dan Data Uji | 8 | 33 | 0 | Lulus |
| 01 Catalog PUT (Outlet dan Item Menu) | 14 | 61 | 0 | Lulus |
| 02 Catalog PATCH (Ketersediaan Item Menu) | 11 | 46 | 0 | Lulus |
| 03 Order PUT (Penggantian Pesanan PENDING) | 14 | 63 | 0 | Lulus |
| 04 Order PATCH (Transisi Status Pesanan) | 23 | 95 | 0 | Lulus |
| 05 Catalog DELETE (Soft Delete Item Menu, Meja, dan Outlet) | 20 | 77 | 0 | Lulus |
| **Total** | **90** | **375** | **0** | **Lulus** |

### 7.5.3 Rincian Hasil per Request

Tabel berikut memuat status HTTP aktual, waktu respons, dan jumlah asersi untuk setiap request pada koleksi `dikichi-v1-put-patch-delete.postman_collection.json`. Seluruh 375 asersi pada 90 request lulus.

| No | Request | Status | Waktu (ms) | Asersi Lulus |
| :---: | :--- | :---: | :---: | :---: |
| 1 | POST Login MASTER | 200 | 302 | 4 |
| 2 | POST Login CASHIER | 200 | 82 | 4 |
| 3 | POST Login KITCHEN | 200 | 78 | 4 |
| 4 | POST Prasyarat: buat outlet uji baru oleh MASTER | 201 | 147 | 4 |
| 5 | POST Prasyarat: buat meja pada outlet uji baru | 201 | 69 | 4 |
| 6 | POST Prasyarat: buat item menu pada outlet uji baru | 201 | 33 | 4 |
| 7 | POST Prasyarat: buat item menu uji pada OUT-01 | 201 | 27 | 4 |
| 8 | POST Prasyarat: buat pesanan awal PENDING oleh tamu | 201 | 228 | 5 |
| 9 | PUT outlet tanpa token | 401 | 14 | 4 |
| 10 | PUT outlet oleh CASHIER | 403 | 22 | 4 |
| 11 | PUT outlet oleh KITCHEN | 403 | 15 | 4 |
| 12 | PUT outlet yang tidak ada | 404 | 17 | 4 |
| 13 | PUT outlet dengan body tidak valid | 400 | 18 | 5 |
| 14 | PUT outlet dengan JSON rusak | 400 | 36 | 4 |
| 15 | PUT outlet oleh MASTER dengan pemangkasan spasi | 200 | 35 | 5 |
| 16 | GET outlet memastikan perubahan PUT tersimpan | 200 | 20 | 4 |
| 17 | PUT item menu tanpa token | 401 | 10 | 4 |
| 18 | PUT item menu oleh CASHIER | 403 | 17 | 4 |
| 19 | PUT item menu dengan ID bukan UUID | 400 | 82 | 4 |
| 20 | PUT item menu yang tidak ada | 404 | 17 | 4 |
| 21 | PUT item menu dengan harga 0 dan available null | 400 | 31 | 5 |
| 22 | PUT item menu oleh MASTER | 200 | 42 | 6 |
| 23 | PATCH availability tanpa token | 401 | 9 | 4 |
| 24 | PATCH availability dengan ID bukan UUID | 400 | 14 | 4 |
| 25 | PATCH availability pada item yang tidak ada | 404 | 22 | 4 |
| 26 | PATCH availability dengan body kosong | 400 | 15 | 5 |
| 27 | PATCH availability dengan JSON rusak | 400 | 16 | 4 |
| 28 | PATCH availability item outlet lain oleh CASHIER | 403 | 17 | 4 |
| 29 | PATCH availability item outlet lain oleh KITCHEN | 403 | 18 | 4 |
| 30 | PATCH availability item outlet lain oleh MASTER | 200 | 27 | 4 |
| 31 | PATCH availability menjadi false oleh CASHIER pada outlet sendiri | 200 | 26 | 4 |
| 32 | POST pesanan berisi item yang baru dinonaktifkan | 409 | 35 | 5 |
| 33 | PATCH availability kembali menjadi true oleh KITCHEN pada outlet sendiri | 200 | 31 | 4 |
| 34 | PUT pesanan tanpa token | 401 | 8 | 4 |
| 35 | PUT pesanan oleh KITCHEN | 403 | 27 | 4 |
| 36 | PUT pesanan oleh MASTER | 403 | 16 | 4 |
| 37 | PUT pesanan dengan ID bukan UUID | 400 | 78 | 4 |
| 38 | PUT pesanan yang tidak ada | 404 | 51 | 4 |
| 39 | PUT pesanan mencoba mengubah outletId | 400 | 19 | 5 |
| 40 | PUT pesanan dengan item ganda | 400 | 18 | 5 |
| 41 | PUT pesanan tanpa daftar item | 400 | 128 | 4 |
| 42 | PUT pesanan dengan jumlah item 100 | 400 | 16 | 4 |
| 43 | PUT pesanan dengan JSON rusak | 400 | 15 | 4 |
| 44 | PUT pesanan dengan kode meja yang tidak ada | 422 | 32 | 4 |
| 45 | PUT pesanan dengan item yang tidak ada | 422 | 31 | 4 |
| 46 | PUT pesanan berisi item sold out | 409 | 32 | 5 |
| 47 | PUT pesanan PENDING oleh CASHIER | 200 | 118 | 8 |
| 48 | PATCH status tanpa token | 401 | 8 | 4 |
| 49 | PATCH status oleh MASTER | 403 | 15 | 4 |
| 50 | PATCH status dengan body kosong | 400 | 15 | 5 |
| 51 | PATCH status dengan nilai status tidak dikenal | 400 | 16 | 5 |
| 52 | PATCH status dengan JSON rusak | 400 | 15 | 4 |
| 53 | PATCH status pada pesanan yang tidak ada | 404 | 27 | 4 |
| 54 | PATCH status ke PENDING | 409 | 19 | 4 |
| 55 | PATCH status ke PREPARING | 409 | 18 | 4 |
| 56 | PATCH status ke CANCELLED oleh KITCHEN | 403 | 19 | 4 |
| 57 | PATCH status ke READY oleh CASHIER | 403 | 18 | 4 |
| 58 | PATCH status dari PENDING langsung ke READY oleh KITCHEN | 409 | 17 | 4 |
| 59 | PATCH status dari PENDING ke ACCEPTED oleh CASHIER | 200 | 28 | 5 |
| 60 | PATCH status dari ACCEPTED ke ACCEPTED lagi | 409 | 17 | 4 |
| 61 | PUT pesanan yang sudah berstatus ACCEPTED | 409 | 18 | 4 |
| 62 | POST Prasyarat: bayar pesanan agar berpindah ke PREPARING | 200 | 39 | 4 |
| 63 | PATCH status dari PREPARING ke CANCELLED oleh CASHIER | 409 | 15 | 4 |
| 64 | PATCH status dari PREPARING langsung ke COMPLETED oleh KITCHEN | 409 | 16 | 4 |
| 65 | PATCH status dari PREPARING ke READY oleh KITCHEN | 200 | 42 | 4 |
| 66 | PATCH status dari READY ke COMPLETED oleh KITCHEN | 200 | 28 | 4 |
| 67 | PATCH status dari COMPLETED ke READY oleh KITCHEN | 409 | 19 | 4 |
| 68 | POST Prasyarat: buat pesanan kedua untuk uji pembatalan | 201 | 37 | 4 |
| 69 | PATCH status dari PENDING ke CANCELLED oleh CASHIER | 200 | 28 | 4 |
| 70 | PATCH status dari CANCELLED ke ACCEPTED oleh CASHIER | 409 | 18 | 4 |
| 71 | DELETE item menu tanpa token | 401 | 8 | 4 |
| 72 | DELETE item menu oleh CASHIER | 403 | 13 | 4 |
| 73 | DELETE item menu dengan ID bukan UUID | 400 | 12 | 4 |
| 74 | DELETE item menu oleh MASTER | 204 | 42 | 3 |
| 75 | DELETE item menu yang sama untuk kedua kalinya | 404 | 16 | 4 |
| 76 | GET item menu yang sudah dihapus | 404 | 13 | 4 |
| 77 | PUT item menu yang sudah dihapus | 404 | 14 | 4 |
| 78 | PATCH availability pada item menu yang sudah dihapus | 404 | 15 | 4 |
| 79 | PUT meja ditolak karena operasi tidak didukung | 405 | 22 | 4 |
| 80 | DELETE meja tanpa token | 401 | 7 | 4 |
| 81 | DELETE meja oleh CASHIER | 403 | 12 | 4 |
| 82 | DELETE meja pada outlet yang tidak ada | 404 | 15 | 4 |
| 83 | DELETE meja oleh MASTER | 204 | 43 | 3 |
| 84 | DELETE meja yang sama untuk kedua kalinya | 404 | 15 | 4 |
| 85 | POST pembuatan ulang meja dengan kode yang sama setelah soft delete | 201 | 28 | 4 |
| 86 | DELETE outlet tanpa token | 401 | 7 | 4 |
| 87 | DELETE outlet oleh CASHIER | 403 | 13 | 4 |
| 88 | DELETE outlet oleh MASTER | 204 | 25 | 3 |
| 89 | DELETE outlet yang sama untuk kedua kalinya | 404 | 15 | 4 |
| 90 | POST outlet dengan ID yang sudah di-soft-delete tetap ditolak | 409 | 16 | 4 |

> **Catatan:** Waktu respons bersifat variatif antar eksekusi bergantung pada kondisi beban host dan pemanasan koneksi, sehingga nilai milidetik pada tangkapan layar eksekusi ulang dapat berbeda tipis dari tabel di atas. Status HTTP dan jumlah asersi pada setiap request bersifat tetap.

---

### 7.5.4 Bukti Screenshot

Subbab ini memuat tangkapan layar dari eksekusi pengujian PUT, PATCH, dan DELETE.

#### Gambar 7.1 Status kelima kontainer pada docker compose ps
> **[Tempatkan Screenshot Gambar 7.1 di sini]**
> *Perintah yang dijalankan di folder `Backend`:*
> `docker compose --env-file ../.env ps`

*Keterangan Gambar 7.1:* Perintah `docker compose ps` menampilkan kelima kontainer (`catalog-db`, `order-db`, `catalog-service`, `order-service`, dan `gateway-service`) dengan status *healthy* sebelum pengujian API dijalankan.

---

#### Gambar 7.2 Ringkasan hasil uji API PUT, PATCH, dan DELETE dengan Newman
> **[Tempatkan Screenshot Gambar 7.2 di sini]**
> *Perintah yang dijalankan di folder `Backend`:*
> `powershell -ExecutionPolicy Bypass -File ./tests/api/run-newman.ps1 -Collection dikichi-v1-put-patch-delete.postman_collection.json`

*Keterangan Gambar 7.2:* Tabel ringkasan akhir Newman yang menunjukkan 1 iterasi, 90 request, 90 *test-scripts*, 1 *prerequest-script*, dan 375 asersi dieksekusi dengan 0 kegagalan (*failed: 0*).

---

#### Gambar 7.3 Keluaran Newman kelompok 03 Order PUT dan 04 Order PATCH
> **[Tempatkan Screenshot Gambar 7.3 di sini]**
> *Tampilkan bagian log Newman untuk kelompok `03 Order PUT (Penggantian Pesanan PENDING)` dan `04 Order PATCH (Transisi Status Pesanan)`.*

*Keterangan Gambar 7.3:* Keluaran Newman pada pengujian mutasi pesanan: percobaan mengubah `outletId` ditolak 400 `OUTLET_IMMUTABLE`, pengeditan pesanan `PENDING` oleh `CASHIER` berhasil 200 OK dengan perhitungan ulang total menjadi 37.000, transisi status mengikuti urutan evaluasi D16, dan pengeditan pesanan yang sudah `ACCEPTED` ditolak 409 `ORDER_NOT_EDITABLE`.

---

#### Gambar 7.4 Keluaran Newman kelompok 05 Catalog DELETE (Soft Delete)
> **[Tempatkan Screenshot Gambar 7.4 di sini]**
> *Tampilkan bagian log Newman untuk kelompok `05 Catalog DELETE (Soft Delete Item Menu, Meja, dan Outlet)`.*

*Keterangan Gambar 7.4:* Keluaran Newman pada pengujian *soft delete*: penghapusan item menu, meja, dan outlet oleh `MASTER` mengembalikan 204 No Content dengan body kosong, penghapusan kedua pada resource yang sama mengembalikan 404 `NOT_FOUND`, kode meja yang sudah dihapus dapat dibuat ulang (201 Created), sedangkan ID outlet yang sudah di-*soft-delete* tetap menolak pembuatan ulang dengan 409 `DUPLICATE_OUTLET_ID`.

---

#### Gambar 7.5 Hasil uji unit order-service
> **[Tempatkan Screenshot Gambar 7.5 di sini]**
> *Perintah yang dijalankan di folder `Backend/order-service`:*
> `docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn test 2>&1 | Select-String "Running|Tests run|BUILD|Total time"`

*Keterangan Gambar 7.5:* Tiga kelas uji dijalankan pada `order-service`: `OrderServiceTest` (32), `OrderStateMachineTest` (4), dan `PaymentServiceTest` (11), total 47 uji tanpa kegagalan, error, maupun yang dilewati, dengan `BUILD SUCCESS`.

---

#### Gambar 7.6 Hasil uji unit catalog-service
> **[Tempatkan Screenshot Gambar 7.6 di sini]**
> *Perintah yang dijalankan di folder `Backend/catalog-service`:*
> `docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn test 2>&1 | Select-String "Running|Tests run|BUILD|Total time"`

*Keterangan Gambar 7.6:* Lima kelas uji dijalankan pada `catalog-service`: `AuthServiceTest` (4), `MenuItemServiceTest` (21), `OrderValidationServiceTest` (6), `OutletServiceTest` (14), dan `TableServiceTest` (11), total 56 uji tanpa kegagalan, error, maupun yang dilewati, dengan `BUILD SUCCESS`.

---

## 7.6 Analisis Hasil

* **Kesesuaian penuh dengan spesifikasi mutasi:** seluruh operasi PUT, PATCH, dan DELETE pada `catalog-service` dan `order-service` menghasilkan kode status (`200`, `204`, `400`, `401`, `403`, `404`, `405`, `409`, `422`) dan kode kesalahan yang persis sesuai dengan spesifikasi Bab 2 serta keputusan kontrak D5, D6, D10, D14, D16, D17, dan D18.
* **Penegakan urutan evaluasi `PATCH /orders/{id}/status` (D16):** pengujian membuktikan bahwa urutan pemeriksaan berjalan secara deterministik. Pemanggil `MASTER` langsung ditolak `403 FORBIDDEN` pada langkah pertama, status tidak valid (`{}` atau `NOPE`) ditolak `400 VALIDATION_ERROR` sebelum pencarian pesanan, target `PENDING` dan `PREPARING` ditolak `409 INVALID_STATUS_TRANSITION`, pelanggaran kepemilikan target oleh role (`KITCHEN` mencoba `CANCELLED` atau `CASHIER` mencoba `READY`) ditolak `403 FORBIDDEN`, dan transisi yang melanggar status saat ini ditolak `409 INVALID_STATUS_TRANSITION`.
* **Integritas penggantian pesanan (`PUT /orders/{id}`):** pesanan hanya dapat diubah oleh `CASHIER` dari outlet yang sama ketika berstatus `PENDING`. Percobaan mengubah `outletId` ditolak `400 OUTLET_IMMUTABLE` dan percobaan mengedit setelah pesanan `ACCEPTED` ditolak `409 ORDER_NOT_EDITABLE`. Saat penggantian valid dilakukan, pemanggilan `orders.flush()` setelah penghapusan item lama memastikan indeks unik `(order_id, menu_item_id)` pada PostgreSQL tidak dilanggar ketika item yang sama dikirim kembali dengan kuantitas berbeda.
* **Konsistensi lintas layanan pada `PATCH availability`:** ketika `CASHIER` mengubah ketersediaan menu menjadi `false`, pembuatan atau pembaruan pesanan yang memuat item tersebut langsung ditolak `409 ITEM_UNAVAILABLE` oleh `catalog-service`, dan kembali diizinkan segera setelah `KITCHEN` mengubah ketersediaannya menjadi `true`.
* **Perilaku *soft delete* dan indeks unik parsial:** penghapusan item menu, meja, dan outlet mengembalikan `204 No Content` tanpa body dan menyembunyikan baris dari seluruh operasi `GET`, `PUT`, `PATCH`, dan `DELETE` berikutnya (`404 NOT_FOUND`). Berkat indeks unik parsial `ux_dining_table_outlet_code_active` (`WHERE is_deleted = FALSE`), kode meja yang telah dihapus dapat didaftarkan kembali (`201 Created`), sedangkan primary key `id` pada tabel `outlet` tetap mencegah penggunaan ulang ID outlet yang pernah dihapus (`409 DUPLICATE_OUTLET_ID`).
* **Kinerja waktu respons:** rata-rata waktu respons untuk 90 request adalah 33 ms dengan nilai maksimum 302 ms (pada login pertama yang menjalankan verifikasi BCrypt), seluruhnya berada jauh di bawah batas 2000 ms.

---

## 7.7 Keterbatasan Pengujian

* *Optimistic locking* (`@Version` pada entitas `Order` yang menghasilkan `409 CONCURRENT_MODIFICATION` saat terjadi modifikasi serentak) ditangani oleh `GlobalExceptionHandler`, namun belum diuji dengan simulasi balapan dua transaksi paralel (*race condition*) pada Newman karena Newman menjalankan request secara sekuensial.
* Kegagalan jaringan atau *timeout* menuju `catalog-service` saat `PUT /api/v1/orders/{id}` (`503 CATALOG_UNAVAILABLE`) belum disimulasikan pada uji API karena kedua layanan berjalan sehat di jaringan Docker yang sama.
* Pengujian pada bab ini berfokus pada kontrak API versi 1.0 (`/api/v1`). Pengujian untuk kontrak API versi 2.0 (`/api/v2`) yang memiliki struktur objek bersarang (`customer`, `location`, `paymentSummary`) berada pada cakupan pembahasan migrasi versi API.

