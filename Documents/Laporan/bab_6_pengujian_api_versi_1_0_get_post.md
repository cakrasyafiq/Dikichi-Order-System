# BAB 6. PENGUJIAN API VERSI 1.0 (GET & POST)

Bab ini memuat pengujian terhadap operasi GET dan POST pada API versi 1.0 (`/api/v1`) yang diimplementasikan pada Bab 4. Pengujian dilakukan dengan dua pendekatan yang saling melengkapi, yaitu uji unit pada lapisan service dan uji API terhadap sistem yang berjalan penuh melalui gateway. Pembahasan mencakup strategi, rancangan kasus uji, kode sumber pengujian, serta hasil eksekusi. Pengujian untuk PUT, PATCH, dan DELETE dilaporkan pada iterasi berikutnya.

---

## 6.1 Strategi Pengujian

### 6.1.1 Tujuan dan Ruang Lingkup
* Memastikan setiap endpoint GET dan POST pada Bab 4 berperilaku sesuai spesifikasi pada Bab 2, baik pada jalur normal maupun jalur kesalahan.
* Memverifikasi aturan otorisasi per role (`MASTER`, `CASHIER`, `KITCHEN`), cakupan outlet, dan rute publik yang dibatasi pada path yang tepat.
* Memverifikasi bahwa seluruh kesalahan memakai format yang seragam, baik yang dihasilkan layanan maupun gateway.
* **Cakupan:** 13 endpoint GET dan POST pada Bab 4.1.1 ditambah endpoint internal validasi. Satu request PATCH dipakai hanya sebagai prasyarat agar pesanan berstatus `ACCEPTED` sebelum diuji pembayarannya.

### 6.1.2 Lapisan Pengujian

| Lapisan | Alat | Sasaran | Jumlah | Sistem Menyala |
| :--- | :--- | :--- | :--- | :--- |
| **Uji unit** | JUnit 5 dan Mockito | Logika service tanpa basis data: validasi, otorisasi, perhitungan, aturan bisnis | 60 uji | Tidak |
| **Uji API** | Postman Collection dijalankan dengan Newman | Perilaku HTTP sistem utuh melalui gateway: status, kode kesalahan, bentuk data, header, waktu respons | 60 request, 262 asersi | Ya |
| **Smoke test** | Skrip bash dengan curl dan jq | Alur ujung ke ujung dari login sampai pembayaran dan operasi PUT, PATCH, DELETE | 58 pemeriksaan | Ya |

Uji unit memeriksa aturan bisnis dengan cepat dan terisolasi, sedangkan uji API membuktikan bahwa seluruh komponen (gateway, layanan, basis data, migrasi) bekerja bersama. Skrip smoke test telah dilaporkan pada Bab 4.6 dan 5.6 sehingga tidak diulang di bab ini.

### 6.1.3 Teknik Perancangan Kasus Uji
* **Partisi ekuivalen:** masukan dikelompokkan menjadi valid dan tidak valid, misalnya kode meja valid (`T-01`), format salah (`X-1`), dan meja yang tidak ada (`T-99`).
* **Analisis nilai batas:** jumlah item 99 (batas atas) dan 100 (melanggar), harga 0 (di bawah batas minimum), daftar item kosong, serta nama pelanggan yang hanya berisi spasi.
* **Pengujian negatif:** JSON rusak, UUID yang tidak valid, metode pembayaran yang tidak dikenal, dan status yang tidak dikenal.
* **Pengujian berbasis role:** setiap endpoint terlindungi diuji dengan role yang berhak, role yang tidak berhak, dan tanpa token.
* **Pengujian aturan bisnis:** snapshot harga, total, nomor pesanan, pembayaran tunggal, dan urutan evaluasi kesalahan (penolakan katalog sebelum penyimpanan).

### 6.1.4 Lingkungan Pengujian

| Komponen | Versi dan Keterangan |
| :--- | :--- |
| **Docker Desktop** | 4.96.0 (Docker Engine 29.9.1) |
| **Java (host dan citra `eclipse-temurin:21-jre`)** | Temurin 21.0.12.1 |
| **Spring Boot (parent pom)** | 4.0.7, ketiga layanan berhasil dibangun oleh Maven |
| **Tomcat tertanam** | 11.0.22 |
| **Hibernate ORM** | 7.2.19.Final, `ddl-auto: validate` lolos pada kedua layanan |
| **PostgreSQL** | 16.15, dua basis data terpisah (`catalog_db` dan `order_db`) |
| **Migrasi Flyway** | `catalog-service`: V1 sampai V3. `order-service`: V1 |
| **Alat uji** | `scripts/smoke-test.sh` (Git Bash, curl, jq 1.8.2) |
| **JUnit Jupiter** | 6.0.3 (Surefire 3.5.6) |
| **Mockito dan AssertJ** | Mockito 5.20.0, AssertJ 3.27.7 |
| **Penjalan uji unit** | Maven 3.9 di dalam kontainer `maven:3.9-eclipse-temurin-21` |
| **Penjalan uji API** | Newman di dalam kontainer `postman/newman:alpine` |

---

## 6.2 Rancangan Kasus Uji

### 6.2.1 Kasus Uji Unit

Tabel berikut memuat seluruh 60 kasus uji unit. Setiap kelas uji membuat service dengan repository dan klien yang ditiru (Mockito), sehingga yang diuji murni logika. `OrderStateMachineTest` berasal dari iterasi sebelumnya dan ikut dieksekusi bersama kelas lainnya.

| No | Kelas Uji | Skenario yang Diuji |
| :---: | :--- | :--- |
| 1 | OrderServiceTest | Pembuatan pesanan menghitung total 68.000 dan menyimpan snapshot nama serta harga item |
| 2 | OrderServiceTest | Nomor pesanan tetap berformat ORD- saat urutan melebihi empat digit (`ORD-12345`) |
| 3 | OrderServiceTest | Item ganda ditolak 400 `DUPLICATE_MENU_ITEM` sebelum `catalog-service` dipanggil |
| 4 | OrderServiceTest | Penolakan katalog (409) menghentikan proses dan tidak ada pesanan yang disimpan |
| 5 | OrderServiceTest | CASHIER secara bawaan melihat antrean PENDING dan ACCEPTED |
| 6 | OrderServiceTest | KITCHEN secara bawaan melihat antrean PREPARING dan READY |
| 7 | OrderServiceTest | Filter status di dalam antrean role diizinkan |
| 8 | OrderServiceTest | Filter status di luar antrean role ditolak 403 |
| 9 | OrderServiceTest | Melihat daftar pesanan outlet lain ditolak 403 |
| 10 | OrderServiceTest | MASTER tidak boleh melihat daftar pesanan (403) |
| 11 | OrderServiceTest | Pemanggil tanpa identitas ditolak 403 |
| 12 | OrderServiceTest | Pesanan yang tidak ada menghasilkan 404 `NOT_FOUND` |
| 13 | OrderServiceTest | Pesanan milik outlet lain ditolak 403 |
| 14 | OrderServiceTest | Pesanan milik outlet yang sama dikembalikan |
| 15 | PaymentServiceTest | Pembayaran CASH memindahkan pesanan ke PREPARING dan menyimpan kembalian 10.000 |
| 16 | PaymentServiceTest | Uang pas menghasilkan kembalian 0 |
| 17 | PaymentServiceTest | CASH kurang dari total ditolak 400 dan pembayaran tidak disimpan |
| 18 | PaymentServiceTest | CASH tanpa amountTendered ditolak 400 |
| 19 | PaymentServiceTest | CARD dengan amountTendered ditolak 400 |
| 20 | PaymentServiceTest | Pembayaran QRIS tidak menyimpan kembalian dan pesanan menjadi PREPARING |
| 21 | PaymentServiceTest | Pembayaran kedua ditolak 409 `ORDER_ALREADY_PAID` |
| 22 | PaymentServiceTest | Pesanan PENDING tidak dapat dibayar (409 `INVALID_STATUS_TRANSITION`) |
| 23 | PaymentServiceTest | Role selain CASHIER ditolak 403 |
| 24 | PaymentServiceTest | CASHIER outlet lain ditolak 403 |
| 25 | PaymentServiceTest | Pesanan yang tidak ada menghasilkan 404 |
| 26 | OrderStateMachineTest | Hanya lima transisi status yang terdokumentasi yang diizinkan |
| 27 | OrderStateMachineTest | PENDING dan PREPARING tidak pernah menjadi target PATCH |
| 28 | OrderStateMachineTest | Setiap role hanya memiliki target statusnya sendiri |
| 29 | OrderStateMachineTest | Hanya PENDING yang dapat diedit dan hanya ACCEPTED yang dapat dibayar |
| 30 | AuthServiceTest | Kredensial valid menghasilkan token Bearer berlaku 28.800 detik beserta identitas |
| 31 | AuthServiceTest | Akun MASTER tidak terikat pada outlet |
| 32 | AuthServiceTest | Kata sandi salah ditolak 401 dengan pesan yang generik |
| 33 | AuthServiceTest | Pengguna yang tidak dikenal mendapat pesan yang sama dengan kata sandi salah |
| 34 | OutletServiceTest | MASTER membuat outlet dan spasi di tepi nama serta alamat dipangkas |
| 35 | OutletServiceTest | ID outlet ganda ditolak 409 `DUPLICATE_OUTLET_ID` |
| 36 | OutletServiceTest | Role selain MASTER ditolak 403 |
| 37 | OutletServiceTest | Pemanggil tanpa identitas ditolak 403 |
| 38 | OutletServiceTest | Daftar outlet aktif dikembalikan |
| 39 | OutletServiceTest | Outlet dikembalikan berdasarkan ID |
| 40 | OutletServiceTest | Outlet yang tidak ada menghasilkan 404 |
| 41 | TableServiceTest | Daftar meja outlet dikembalikan |
| 42 | TableServiceTest | Daftar meja outlet yang tidak ada menghasilkan 404 |
| 43 | TableServiceTest | MASTER membuat meja baru |
| 44 | TableServiceTest | Kode meja ganda ditolak 409 `DUPLICATE_TABLE_CODE` |
| 45 | TableServiceTest | Membuat meja pada outlet yang tidak ada menghasilkan 404 |
| 46 | TableServiceTest | Role selain MASTER ditolak 403 |
| 47 | MenuItemServiceTest | Item menu baru tersedia secara bawaan dan field dipangkas |
| 48 | MenuItemServiceTest | Nilai available yang dikirim secara eksplisit dipertahankan |
| 49 | MenuItemServiceTest | Role selain MASTER ditolak 403 |
| 50 | MenuItemServiceTest | Membuat item menu pada outlet yang tidak ada menghasilkan 404 |
| 51 | MenuItemServiceTest | Daftar menu outlet yang tidak ada menghasilkan 404 |
| 52 | MenuItemServiceTest | Daftar menu mempertahankan urutan dan menyertakan item sold out |
| 53 | MenuItemServiceTest | Item menu dikembalikan berdasarkan ID |
| 54 | MenuItemServiceTest | Item menu yang tidak ada menghasilkan 404 |
| 55 | OrderValidationServiceTest | Outlet yang tidak ada ditolak 422 `INVALID_OUTLET` |
| 56 | OrderValidationServiceTest | Meja yang tidak ada ditolak 422 `INVALID_TABLE` |
| 57 | OrderValidationServiceTest | Item milik outlet lain dianggap tidak ada (422 `INVALID_MENU_ITEM`) |
| 58 | OrderValidationServiceTest | Seluruh item yang tidak tersedia dilaporkan sekaligus (409 `ITEM_UNAVAILABLE`) |
| 59 | OrderValidationServiceTest | Item yang tidak ada diprioritaskan di atas item yang tidak tersedia |
| 60 | OrderValidationServiceTest | Permintaan valid mengembalikan nama dan harga sesuai urutan permintaan |

---

### 6.2.2 Kasus Uji API

Koleksi uji API disusun sebagai satu alur data yang berurutan: login, pembacaan katalog, pembuatan data, pembuatan pesanan, pembayaran, lalu antrean dapur. Variabel seperti token, ID pesanan, dan ID outlet uji disimpan antar-request. ID outlet uji dibuat acak sehingga koleksi dapat dijalankan berulang kali.

| Kelompok | Request | Asersi | Cakupan |
| :--- | :---: | :---: | :--- |
| **00 Autentikasi** (`POST /auth/login`) | 5 | 23 | Login salah dan tidak valid, login tiga role, bentuk token dan identitas |
| **01 Catalog GET** (rute publik) | 9 | 42 | Outlet, meja, menu, item menu, sold out tetap tampil, 404 dan 400 |
| **02 Catalog POST** | 15 | 64 | Outlet, meja, item menu: 401, 403, 400, 409, 201 dengan header Location, bukti data tersimpan |
| **03 Order POST dan GET** | 19 | 86 | Pembuatan pesanan, seluruh kode kesalahan, filter dan otorisasi daftar pesanan |
| **04 Pembayaran** (`POST /orders/{id}/pay`) | 9 | 38 | Pembayaran CASH, CARD, metode salah, pembayaran ganda, pesanan tidak ada |
| **05 Dapur dan Gateway** | 3 | 9 | Antrean dapur, antrean kasir setelah bayar, rute internal tidak diteruskan |
| **Total** | **60** | **262** | |

Setiap request kesalahan diperiksa dengan empat asersi yang sama: kode status, kesamaan format kesalahan (enam field `timestamp`, `status`, `code`, `message`, `path`, `errors`), kode kesalahan, dan waktu respons di bawah 2000 ms.

---

### 6.2.3 Keterlacakan Endpoint terhadap Pengujian

| Endpoint | Uji Unit | Request Uji API (nomor) |
| :--- | :--- | :--- |
| `POST /api/v1/auth/login` | AuthServiceTest (4) | 1 sampai 5 |
| `GET /api/v1/outlets` | OutletServiceTest (1) | 6 |
| `POST /api/v1/outlets` | OutletServiceTest (4) | 15 sampai 20 |
| `GET /api/v1/outlets/{outletId}` | OutletServiceTest (2) | 7, 8, 21 |
| `GET /api/v1/outlets/{outletId}/tables` | TableServiceTest (2) | 9, 10 |
| `POST /api/v1/outlets/{outletId}/tables` | TableServiceTest (4) | 22 sampai 25 |
| `GET /api/v1/outlets/{outletId}/menu-items` | MenuItemServiceTest (2) | 11, 29 |
| `POST /api/v1/outlets/{outletId}/menu-items` | MenuItemServiceTest (4) | 26 sampai 28 |
| `GET /api/v1/menu-items/{menuItemId}` | MenuItemServiceTest (2) | 12 sampai 14 |
| `POST /api/v1/orders` | OrderServiceTest (4) | 30 sampai 39 |
| `GET /api/v1/orders` | OrderServiceTest (7) | 40 sampai 45, 58, 59 |
| `GET /api/v1/orders/{orderId}` | OrderServiceTest (3) | 46 sampai 48 |
| `POST /api/v1/orders/{orderId}/pay` | PaymentServiceTest (11) | 50 sampai 57 (49 prasyarat) |
| `POST /internal/orders/validate` | OrderValidationServiceTest (6) | 60 (tidak diteruskan gateway) |

---

## 6.3 Kode Sumber Pengujian

Seluruh kode pengujian berada pada repositori: uji unit pada `src/test/java` di masing-masing layanan, dan uji API pada folder `Backend/tests/api`. Komentar pada kode uji hanya dipakai untuk menjelaskan alasan, dan nama metode uji menggambarkan perilaku yang diperiksa.

### 6.3.1 Uji Unit order-service

`OrderServiceTest` menguji POST dan GET pesanan, `PaymentServiceTest` menguji POST pembayaran. `ApiAssertions` adalah pembantu kecil yang menangkap `ApiException` agar asersi status dan kode kesalahan ringkas.

#### `order-service: src/test/.../order/support/ApiAssertions.java`
```java
package com.ambatucode.dikichi.order.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.ambatucode.dikichi.order.exception.ApiException;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;

public final class ApiAssertions {
    private ApiAssertions() {
    }

    public static ApiException assertApiError(ThrowingCallable action) {
        Throwable thrown = catchThrowable(action);
        assertThat(thrown).isInstanceOf(ApiException.class);
        return (ApiException) thrown;
    }
}
```

#### `order-service: src/test/.../order/service/OrderServiceTest.java`
```java
package com.ambatucode.dikichi.order.service;

import static com.ambatucode.dikichi.order.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.order.config.CallerContext;
import com.ambatucode.dikichi.order.dto.catalog.CatalogValidateResponse.CatalogItem;
import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.Role;
import com.ambatucode.dikichi.order.exception.ApiException;
import com.ambatucode.dikichi.order.repository.OrderRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

class OrderServiceTest {
    private static final UUID MENU_MIE = UUID.fromString("11111111-0000-4000-8000-000000000001");
    private static final UUID MENU_TEH = UUID.fromString("11111111-0000-4000-8000-000000000009");
    private final OrderRepository orders = mock(OrderRepository.class);
    private final CatalogClient catalogClient = mock(CatalogClient.class);
    private final TransactionTemplate transactionTemplate = mock(TransactionTemplate.class);
    private final CallerContext caller = new CallerContext();
    private final OrderService service = new OrderService(orders, catalogClient, transactionTemplate, caller);

    @BeforeEach
    void setup() {
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            return callback.doInTransaction(mock(TransactionStatus.class));
        });
        when(orders.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createComputesTotalAndKeepsNameAndPriceSnapshots() {
        List<CatalogItem> catalogItems = List.of(
            new CatalogItem(MENU_MIE, "Mie Suit", 25000),
            new CatalogItem(MENU_TEH, "Es Teh Manis", 6000)
        );
        when(catalogClient.validate(eq("OUT-01"), eq("T-01"), any())).thenReturn(catalogItems);
        when(orders.nextOrderSequence()).thenReturn(42L);

        CreateOrderCommand command = new CreateOrderCommand(
            "OUT-01", "T-01", "Budi",
            List.of(new OrderItemRequest(MENU_MIE, 2), new OrderItemRequest(MENU_TEH, 3))
        );

        Order order = service.create(command);

        assertThat(order.getOrderNumber()).isEqualTo("ORD-0042");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.getOutletId()).isEqualTo("OUT-01");
        assertThat(order.getTableCode()).isEqualTo("T-01");
        assertThat(order.getCustomerName()).isEqualTo("Budi");
        assertThat(order.getTotalAmount()).isEqualTo(68000L);
        assertThat(order.getItems()).extracting(OrderItem::getMenuItemName)
            .containsExactlyInAnyOrder("Mie Suit", "Es Teh Manis");
        assertThat(order.getItems()).extracting(OrderItem::getSubtotal)
            .containsExactlyInAnyOrder(50000L, 18000L);

        verify(catalogClient).validate(eq("OUT-01"), eq("T-01"), eq(command.items()));
    }

    @Test
    void orderNumberKeepsGrowingBeyondFourDigits() {
        when(catalogClient.validate(any(), any(), any()))
            .thenReturn(List.of(new CatalogItem(MENU_MIE, "Mie Suit", 25000)));
        when(orders.nextOrderSequence()).thenReturn(12345L);

        Order order = service.create(new CreateOrderCommand("OUT-01", "T-01", "Budi",
            List.of(new OrderItemRequest(MENU_MIE, 1))));

        assertThat(order.getOrderNumber()).isEqualTo("ORD-12345");
    }

    @Test
    void duplicateMenuItemIsRejectedBeforeCatalogIsCalled() {
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
            List.of(new OrderItemRequest(MENU_MIE, 1), new OrderItemRequest(MENU_MIE, 2)));

        ApiException error = assertApiError(() -> service.create(command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("DUPLICATE_MENU_ITEM");
        assertThat(error.getErrors()).hasSize(1);
        assertThat(error.getErrors().get(0).field()).isEqualTo("items[1].menuItemId");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void catalogRejectionPreventsPersistence() {
        when(catalogClient.validate(any(), any(), any())).thenThrow(
            new ApiException(HttpStatus.CONFLICT, "ITEM_UNAVAILABLE", "One or more items are unavailable", List.of()));

        ApiException error = assertApiError(() -> service.create(new CreateOrderCommand(
            "OUT-01", "T-01", "Budi", List.of(new OrderItemRequest(MENU_MIE, 1)))));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ITEM_UNAVAILABLE");
        verify(orders, never()).save(any(Order.class));
    }

    @Test
    void cashierListsPendingAndAcceptedByDefault() {
        caller.populate(Role.CASHIER, "OUT-01");
        service.list(null, null);

        verify(orders).findByOutletIdAndStatusInOrderByCreatedAtAsc(
            eq("OUT-01"), eq(Set.of(OrderStatus.PENDING, OrderStatus.ACCEPTED)));
    }

    @Test
    void kitchenListsPreparingAndReadyByDefault() {
        caller.populate(Role.KITCHEN, "OUT-01");
        service.list(null, null);

        verify(orders).findByOutletIdAndStatusInOrderByCreatedAtAsc(
            eq("OUT-01"), eq(Set.of(OrderStatus.PREPARING, OrderStatus.READY)));
    }

    @Test
    void explicitStatusInsideRoleQueueIsAllowed() {
        caller.populate(Role.CASHIER, "OUT-01");
        service.list("OUT-01", OrderStatus.PENDING);

        verify(orders).findByOutletIdAndStatusInOrderByCreatedAtAsc(
            eq("OUT-01"), eq(Set.of(OrderStatus.PENDING)));
    }

    @Test
    void statusOutsideRoleQueueIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.list(null, OrderStatus.PREPARING));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void listingAnotherOutletIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.list("OUT-02", null));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void masterCannotListOrders() {
        caller.populate(Role.MASTER, null);

        ApiException error = assertApiError(() -> service.list(null, null));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void anonymousCallerCannotListOrders() {
        ApiException error = assertApiError(() -> service.list(null, null));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void getUnknownOrderReturnsNotFound() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.get(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void getOrderFromAnotherOutletIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id))
            .thenReturn(Optional.of(new Order("ORD-0001", "OUT-02", "T-01", "Budi")));

        ApiException error = assertApiError(() -> service.get(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void getOrderReturnsOrderOfTheSameOutlet() {
        caller.populate(Role.KITCHEN, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        Order found = service.get(id);

        assertThat(found).isSameAs(stored);
    }
}
```

#### `order-service: src/test/.../order/service/PaymentServiceTest.java`
```java
package com.ambatucode.dikichi.order.service;

import static com.ambatucode.dikichi.order.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.order.config.CallerContext;
import com.ambatucode.dikichi.order.dto.common.PaymentRequest;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.PaymentMethod;
import com.ambatucode.dikichi.order.entity.Role;
import com.ambatucode.dikichi.order.exception.ApiException;
import com.ambatucode.dikichi.order.repository.MockPaymentRepository;
import com.ambatucode.dikichi.order.repository.OrderRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class PaymentServiceTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final MockPaymentRepository payments = mock(MockPaymentRepository.class);
    private final CallerContext caller = new CallerContext();
    private final PaymentService service = new PaymentService(orders, payments, caller);
    private final UUID orderId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        caller.populate(Role.CASHIER, "OUT-01");
        when(orders.saveAndFlush(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Order storedOrder(OrderStatus status) {
        Order order = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        order.addItem(new OrderItem(UUID.randomUUID(), "Mie Suit", 25000, 2));
        order.changeStatus(status);
        when(orders.findWithItemsById(orderId)).thenReturn(Optional.of(order));
        return order;
    }

    @Test
    void cashPaymentMovesOrderToPreparingAndStoresChange() {
        Order order = storedOrder(OrderStatus.ACCEPTED);

        Order paid = service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L));

        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(paid).isSameAs(order);

        ArgumentCaptor<MockPayment> captor = ArgumentCaptor.forClass(MockPayment.class);
        verify(payments).save(captor.capture());
        assertThat(captor.getValue().getPaymentMethod()).isEqualTo(PaymentMethod.CASH);
        assertThat(captor.getValue().getChangeAmount()).isEqualTo(10000L);
    }

    @Test
    void exactCashPaymentHasZeroChange() {
        storedOrder(OrderStatus.ACCEPTED);

        service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 50000L));

        ArgumentCaptor<MockPayment> captor = ArgumentCaptor.forClass(MockPayment.class);
        verify(payments).save(captor.capture());
        assertThat(captor.getValue().getChangeAmount()).isEqualTo(0L);
    }

    @Test
    void cashBelowTheTotalIsRejected() {
        storedOrder(OrderStatus.ACCEPTED);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 40000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(error.getErrors().get(0).field()).isEqualTo("amountTendered");
        verify(payments, never()).save(any(MockPayment.class));
    }

    @Test
    void cashWithoutTenderedAmountIsRejected() {
        storedOrder(OrderStatus.ACCEPTED);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, null)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void cardWithTenderedAmountIsRejected() {
        storedOrder(OrderStatus.ACCEPTED);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CARD, 50000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getErrors().get(0).field()).isEqualTo("amountTendered");
    }

    @Test
    void qrisPaymentStoresNoChange() {
        storedOrder(OrderStatus.ACCEPTED);

        Order paid = service.pay(orderId, new PaymentRequest(PaymentMethod.QRIS, null));

        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PREPARING);
        ArgumentCaptor<MockPayment> captor = ArgumentCaptor.forClass(MockPayment.class);
        verify(payments).save(captor.capture());
        assertThat(captor.getValue().getChangeAmount()).isNull();
    }

    @Test
    void secondPaymentOnTheSameOrderIsRejected() {
        storedOrder(OrderStatus.PREPARING);
        when(payments.existsByOrderId(orderId)).thenReturn(true);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ORDER_ALREADY_PAID");
    }

    @Test
    void pendingOrderCannotBePaid() {
        storedOrder(OrderStatus.PENDING);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");
    }

    @Test
    void onlyCashierMayPay() {
        storedOrder(OrderStatus.ACCEPTED);
        caller.populate(Role.KITCHEN, "OUT-01");

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void cashierOfAnotherOutletCannotPay() {
        storedOrder(OrderStatus.ACCEPTED);
        caller.populate(Role.CASHIER, "OUT-02");

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void payingAnUnknownOrderReturnsNotFound() {
        when(orders.findWithItemsById(orderId)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
```

---

### 6.3.2 Uji Unit catalog-service

Mencakup login, pembuatan dan pembacaan outlet, meja, dan menu, serta validasi internal pesanan yang dipanggil oleh `order-service`.

#### `catalog-service: src/test/.../catalog/support/ApiAssertions.java`
```java
package com.ambatucode.dikichi.catalog.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.ambatucode.dikichi.catalog.exception.ApiException;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;

public final class ApiAssertions {
    private ApiAssertions() {
    }

    public static ApiException assertApiError(ThrowingCallable action) {
        Throwable thrown = catchThrowable(action);
        assertThat(thrown).isInstanceOf(ApiException.class);
        return (ApiException) thrown;
    }
}
```

#### `catalog-service: src/test/.../catalog/service/AuthServiceTest.java`
```java
package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.JwtProperties;
import com.ambatucode.dikichi.catalog.dto.LoginRequest;
import com.ambatucode.dikichi.catalog.dto.LoginResponse;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.entity.StaffUser;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.StaffUserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceTest {
    private final StaffUserRepository staffUsers = mock(StaffUserRepository.class);
    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private final JwtService jwtService = mock(JwtService.class);
    private final JwtProperties properties = new JwtProperties("x".repeat(40), 28800);
    private final AuthService service = new AuthService(staffUsers, encoder, jwtService, properties);

    @BeforeEach
    void setup() {
        when(jwtService.issue(any(StaffUser.class))).thenReturn("token-abc");
    }

    private StaffUser staff(String username, String rawPassword, Role role, String outletId) {
        StaffUser user = mock(StaffUser.class);
        when(user.getUsername()).thenReturn(username);
        when(user.getPasswordHash()).thenReturn(encoder.encode(rawPassword));
        when(user.getRole()).thenReturn(role);
        when(user.getOutletId()).thenReturn(outletId);
        when(staffUsers.findByUsername(username)).thenReturn(Optional.of(user));
        return user;
    }

    @Test
    void validCredentialsReturnTokenAndIdentity() {
        staff("cashier", "secret-pass", Role.CASHIER, "OUT-01");

        LoginResponse response = service.login(new LoginRequest("cashier", "secret-pass"));

        assertThat(response.accessToken()).isEqualTo("token-abc");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(28800L);
        assertThat(response.user().username()).isEqualTo("cashier");
        assertThat(response.user().role()).isEqualTo(Role.CASHIER);
        assertThat(response.user().outletId()).isEqualTo("OUT-01");
    }

    @Test
    void masterHasNoOutlet() {
        staff("master", "secret-pass", Role.MASTER, null);

        LoginResponse response = service.login(new LoginRequest("master", "secret-pass"));

        assertThat(response.user().role()).isEqualTo(Role.MASTER);
        assertThat(response.user().outletId()).isNull();
    }

    @Test
    void wrongPasswordIsRejectedWithGenericMessage() {
        staff("cashier", "secret-pass", Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.login(new LoginRequest("cashier", "wrong-pass")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(error.getCode()).isEqualTo("UNAUTHORIZED");
        assertThat(error.getMessage()).isEqualTo("Invalid username or password");
    }

    @Test
    void unknownUserGetsTheSameMessageAsWrongPassword() {
        when(staffUsers.findByUsername("ghost")).thenReturn(Optional.empty());
        staff("cashier", "secret-pass", Role.CASHIER, "OUT-01");

        ApiException unknownUser = assertApiError(() -> service.login(new LoginRequest("ghost", "any-pass")));
        ApiException wrongPassword = assertApiError(() -> service.login(new LoginRequest("cashier", "wrong-pass")));

        assertThat(unknownUser.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(unknownUser.getMessage()).isEqualTo(wrongPassword.getMessage());
    }
}
```

#### `catalog-service: src/test/.../catalog/service/OutletServiceTest.java`
```java
package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.OutletCreateRequest;
import com.ambatucode.dikichi.catalog.dto.OutletResponse;
import com.ambatucode.dikichi.catalog.entity.Outlet;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class OutletServiceTest {
    private final OutletRepository outlets = mock(OutletRepository.class);
    private final CallerContext caller = new CallerContext();
    private final OutletService service = new OutletService(outlets, caller);

    @BeforeEach
    void setup() {
        when(outlets.save(any(Outlet.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void masterCreatesOutletWithTrimmedFields() {
        caller.populate(Role.MASTER, null);
        when(outlets.existsById("OUT-05")).thenReturn(false);

        OutletResponse response = service.create(new OutletCreateRequest("OUT-05", "  Dikichi 05  ", "  Jl. Uji No. 5  "));

        assertThat(response.id()).isEqualTo("OUT-05");
        assertThat(response.name()).isEqualTo("Dikichi 05");
        assertThat(response.address()).isEqualTo("Jl. Uji No. 5");
    }

    @Test
    void duplicateOutletIdIsRejected() {
        caller.populate(Role.MASTER, null);
        when(outlets.existsById("OUT-01")).thenReturn(true);

        ApiException error = assertApiError(() -> service.create(new OutletCreateRequest("OUT-01", "Nama", "Alamat")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("DUPLICATE_OUTLET_ID");
        verify(outlets, never()).save(any(Outlet.class));
    }

    @Test
    void nonMasterCannotCreateOutlet() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.create(new OutletCreateRequest("OUT-05", "Nama", "Alamat")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(outlets, never()).save(any(Outlet.class));
    }

    @Test
    void anonymousCallerCannotCreateOutlet() {
        ApiException error = assertApiError(() -> service.create(new OutletCreateRequest("OUT-05", "Nama", "Alamat")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void listReturnsActiveOutlets() {
        when(outlets.findByDeletedFalseOrderByIdAsc()).thenReturn(List.of(
            new Outlet("OUT-01", "Dikichi 01", "Jl. A"),
            new Outlet("OUT-02", "Dikichi 02", "Jl. B")
        ));

        List<OutletResponse> response = service.list();

        assertThat(response).extracting(OutletResponse::id).containsExactly("OUT-01", "OUT-02");
    }

    @Test
    void getReturnsOutletById() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(
            new Outlet("OUT-01", "Dikichi 01", "Jl. A")));

        assertThat(service.get("OUT-01").name()).isEqualTo("Dikichi 01");
    }

    @Test
    void getUnknownOutletReturnsNotFound() {
        when(outlets.findByIdAndDeletedFalse("OUT-404")).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.get("OUT-404"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }
}
```

#### `catalog-service: src/test/.../catalog/service/TableServiceTest.java`
```java
package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.TableCreateRequest;
import com.ambatucode.dikichi.catalog.dto.TableResponse;
import com.ambatucode.dikichi.catalog.entity.DiningTable;
import com.ambatucode.dikichi.catalog.entity.Outlet;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.DiningTableRepository;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class TableServiceTest {
    private final DiningTableRepository tables = mock(DiningTableRepository.class);
    private final OutletRepository outlets = mock(OutletRepository.class);
    private final CallerContext caller = new CallerContext();
    private final TableService service = new TableService(tables, outlets, caller);

    @BeforeEach
    void setup() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(
            new Outlet("OUT-01", "Dikichi 01", "Jl. A")));
        when(outlets.findByIdAndDeletedFalse("OUT-404")).thenReturn(Optional.empty());
        when(tables.save(any(DiningTable.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void listReturnsTablesOfTheOutlet() {
        when(tables.findByOutletIdAndDeletedFalseOrderByCodeAsc("OUT-01")).thenReturn(List.of(
            new DiningTable("OUT-01", "T-01"),
            new DiningTable("OUT-01", "T-02")
        ));

        List<TableResponse> response = service.list("OUT-01");

        assertThat(response).extracting(TableResponse::code).containsExactly("T-01", "T-02");
    }

    @Test
    void listForUnknownOutletReturnsNotFound() {
        ApiException error = assertApiError(() -> service.list("OUT-404"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void masterCreatesTable() {
        caller.populate(Role.MASTER, null);
        when(tables.existsByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-21")).thenReturn(false);

        TableResponse response = service.create("OUT-01", new TableCreateRequest("T-21"));

        assertThat(response.outletId()).isEqualTo("OUT-01");
        assertThat(response.code()).isEqualTo("T-21");
    }

    @Test
    void duplicateTableCodeIsRejected() {
        caller.populate(Role.MASTER, null);
        when(tables.existsByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-01")).thenReturn(true);

        ApiException error = assertApiError(() -> service.create("OUT-01", new TableCreateRequest("T-01")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("DUPLICATE_TABLE_CODE");
        verify(tables, never()).save(any(DiningTable.class));
    }

    @Test
    void creatingTableInUnknownOutletReturnsNotFound() {
        caller.populate(Role.MASTER, null);

        ApiException error = assertApiError(() -> service.create("OUT-404", new TableCreateRequest("T-01")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void nonMasterCannotCreateTable() {
        caller.populate(Role.KITCHEN, "OUT-01");

        ApiException error = assertApiError(() -> service.create("OUT-01", new TableCreateRequest("T-21")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
```

#### `catalog-service: src/test/.../catalog/service/MenuItemServiceTest.java`
```java
package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.MenuItemCreateRequest;
import com.ambatucode.dikichi.catalog.dto.MenuItemResponse;
import com.ambatucode.dikichi.catalog.entity.MenuItem;
import com.ambatucode.dikichi.catalog.entity.Outlet;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.MenuItemRepository;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class MenuItemServiceTest {
    private final MenuItemRepository menuItems = mock(MenuItemRepository.class);
    private final OutletRepository outlets = mock(OutletRepository.class);
    private final CallerContext caller = new CallerContext();
    private final MenuItemService service = new MenuItemService(menuItems, outlets, caller);

    @BeforeEach
    void setup() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(
            new Outlet("OUT-01", "Dikichi 01", "Jl. A")));
        when(outlets.findByIdAndDeletedFalse("OUT-404")).thenReturn(Optional.empty());
        when(menuItems.save(any(MenuItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void newMenuItemIsAvailableByDefault() {
        caller.populate(Role.MASTER, null);

        MenuItemResponse response = service.create("OUT-01",
            new MenuItemCreateRequest(" Mie Suit ", "Mie ayam", 25000, "Mie", null));

        assertThat(response.available()).isTrue();
        assertThat(response.name()).isEqualTo("Mie Suit");
        assertThat(response.category()).isEqualTo("Mie");
        assertThat(response.price()).isEqualTo(25000);
        assertThat(response.outletId()).isEqualTo("OUT-01");
    }

    @Test
    void explicitAvailabilityIsKept() {
        caller.populate(Role.MASTER, null);

        MenuItemResponse response = service.create("OUT-01",
            new MenuItemCreateRequest("Lumpia", null, 19000, "Dimsum", false));

        assertThat(response.available()).isFalse();
        assertThat(response.description()).isNull();
    }

    @Test
    void nonMasterCannotCreateMenuItem() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.create("OUT-01",
            new MenuItemCreateRequest("Mie", null, 25000, "Mie", true)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(menuItems, never()).save(any(MenuItem.class));
    }

    @Test
    void creatingMenuItemInUnknownOutletReturnsNotFound() {
        caller.populate(Role.MASTER, null);

        ApiException error = assertApiError(() -> service.create("OUT-404",
            new MenuItemCreateRequest("Mie", null, 25000, "Mie", true)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listForUnknownOutletReturnsNotFound() {
        ApiException error = assertApiError(() -> service.listByOutlet("OUT-404"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listKeepsRepositoryOrderAndIncludesSoldOutItems() {
        when(menuItems.findByOutletIdAndDeletedFalseOrderByCategoryAscNameAsc("OUT-01"))
            .thenReturn(List.of(
                new MenuItem("OUT-01", "Lumpia", null, 19000, "Dimsum", false),
                new MenuItem("OUT-01", "Mie Suit", "Mie ayam", 25000, "Mie", true)));

        List<MenuItemResponse> response = service.listByOutlet("OUT-01");

        assertThat(response).extracting(MenuItemResponse::name).containsExactly("Lumpia", "Mie Suit");
        assertThat(response).extracting(MenuItemResponse::available).containsExactly(false, true);
    }

    @Test
    void getReturnsMenuItem() {
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id))
            .thenReturn(Optional.of(new MenuItem("OUT-01", "Mie Suit", "Mie ayam", 25000, "Mie", true)));

        MenuItemResponse response = service.get(id);

        assertThat(response.name()).isEqualTo("Mie Suit");
        assertThat(response.price()).isEqualTo(25000);
    }

    @Test
    void getUnknownMenuItemReturnsNotFound() {
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.get(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }
}
```

#### `catalog-service: src/test/.../catalog/service/OrderValidationServiceTest.java`
```java
package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.dto.ErrorDetail;
import com.ambatucode.dikichi.catalog.dto.InternalValidateRequest;
import com.ambatucode.dikichi.catalog.dto.InternalValidateRequest.Line;
import com.ambatucode.dikichi.catalog.dto.InternalValidateResponse;
import com.ambatucode.dikichi.catalog.entity.MenuItem;
import com.ambatucode.dikichi.catalog.entity.Outlet;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.DiningTableRepository;
import com.ambatucode.dikichi.catalog.repository.MenuItemRepository;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class OrderValidationServiceTest {
    private final OutletRepository outlets = mock(OutletRepository.class);
    private final DiningTableRepository tables = mock(DiningTableRepository.class);
    private final MenuItemRepository menuItems = mock(MenuItemRepository.class);
    private final OrderValidationService service = new OrderValidationService(outlets, tables, menuItems);

    private final UUID mieId = UUID.randomUUID();
    private final UUID tehId = UUID.randomUUID();
    private final UUID lumpiaId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(
            new Outlet("OUT-01", "Dikichi 01", "Jl. A")));
        when(tables.existsByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-01")).thenReturn(true);
    }

    private static MenuItem menuItem(UUID id, String outletId, String name, int price, boolean available) {
        MenuItem item = mock(MenuItem.class);
        when(item.getId()).thenReturn(id);
        when(item.getOutletId()).thenReturn(outletId);
        when(item.getName()).thenReturn(name);
        when(item.getPrice()).thenReturn(price);
        when(item.isAvailable()).thenReturn(available);
        return item;
    }

    private void stubMenuItems(MenuItem... items) {
        when(menuItems.findByIdInAndDeletedFalse(any())).thenReturn(List.of(items));
    }

    private static InternalValidateRequest request(UUID... ids) {
        List<Line> lines = java.util.Arrays.stream(ids).map(id -> new Line(id, 1)).toList();
        return new InternalValidateRequest("OUT-01", "T-01", lines);
    }

    @Test
    void unknownOutletIsRejected() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.validate(request(mieId)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(error.getCode()).isEqualTo("INVALID_OUTLET");
    }

    @Test
    void unknownTableIsRejected() {
        when(tables.existsByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-01")).thenReturn(false);

        ApiException error = assertApiError(() -> service.validate(request(mieId)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(error.getCode()).isEqualTo("INVALID_TABLE");
    }

    @Test
    void itemsOfAnotherOutletAreTreatedAsMissing() {
        stubMenuItems(
            menuItem(mieId, "OUT-01", "Mie Suit", 25000, true),
            menuItem(tehId, "OUT-02", "Es Teh", 6000, true));

        ApiException error = assertApiError(() -> service.validate(request(mieId, tehId)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(error.getCode()).isEqualTo("INVALID_MENU_ITEM");
        assertThat(error.getErrors()).extracting(ErrorDetail::field).containsExactly("items[1].menuItemId");
    }

    @Test
    void everyUnavailableItemIsReportedAtOnce() {
        stubMenuItems(
            menuItem(mieId, "OUT-01", "Mie Suit", 25000, false),
            menuItem(tehId, "OUT-01", "Es Teh", 6000, true),
            menuItem(lumpiaId, "OUT-01", "Lumpia", 19000, false));

        ApiException error = assertApiError(() -> service.validate(request(mieId, tehId, lumpiaId)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ITEM_UNAVAILABLE");
        assertThat(error.getErrors()).extracting(ErrorDetail::field)
            .containsExactly("items[0].menuItemId", "items[2].menuItemId");
    }

    @Test
    void missingItemTakesPrecedenceOverUnavailableItem() {
        stubMenuItems(
            menuItem(mieId, "OUT-01", "Mie Suit", 25000, false));

        ApiException error = assertApiError(() -> service.validate(request(mieId, tehId)));

        assertThat(error.getCode()).isEqualTo("INVALID_MENU_ITEM");
    }

    @Test
    void validRequestReturnsNamesAndPricesInRequestOrder() {
        stubMenuItems(
            menuItem(mieId, "OUT-01", "Mie Suit", 25000, true),
            menuItem(tehId, "OUT-01", "Es Teh Manis", 6000, true));

        InternalValidateResponse response = service.validate(request(tehId, mieId));

        assertThat(response.items()).extracting(InternalValidateResponse.ValidatedItem::name)
            .containsExactly("Es Teh Manis", "Mie Suit");
        assertThat(response.items()).extracting(InternalValidateResponse.ValidatedItem::unitPrice)
            .containsExactly(6000, 25000);
    }
}
```

---

### 6.3.3 Uji API dengan Newman

Koleksi lengkap tersimpan pada berkas `dikichi-v1-get-post.postman_collection.json` (60 request). Berikut dua request representatif beserta skrip asersinya, yaitu pembuatan pesanan oleh tamu dan pembayaran tunai.

#### Request: POST pesanan oleh tamu tanpa token
```json
{
  "name": "POST pesanan oleh tamu tanpa token",
  "event": [
    {
      "listen": "test",
      "script": {
        "type": "text/javascript",
        "exec": [
          "pm.test(\"Status 201\", () => pm.response.to.have.status(201));",
          "pm.test(\"Waktu respons di bawah 2000 ms\", () => pm.expect(pm.response.responseTime).to.be.below(2000));",
          "pm.test(\"Content-Type JSON\", () => pm.expect(pm.response.headers.get(\"Content-Type\")).to.include(\"application/json\"));",
          "const j = pm.response.json();",
          "pm.test(\"Header Location menunjuk pesanan\", () => pm.expect(pm.response.headers.get(\"Location\")).to.eql(\"/api/v1/orders/\" + j.id));",
          "pm.test(\"ID berformat UUID\", () => pm.expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/));",
          "pm.test(\"Nomor pesanan berformat ORD-\", () => pm.expect(j.orderNumber).to.match(/^ORD-\\d{4,}$/));",
          "pm.test(\"Status awal PENDING dan data lokasi\", () => { pm.expect(j.status).to.eql(\"PENDING\"); pm.expect(j.outletId).to.eql(\"OUT-01\"); pm.expect(j.tableCode).to.eql(\"T-01\"); pm.expect(j.customerName).to.eql(\"Budi\"); });",
          "pm.test(\"Kontrak v1 datar tanpa objek bersarang\", () => { pm.expect(j).to.not.have.property(\"customer\"); pm.expect(j).to.not.have.property(\"location\"); pm.expect(j).to.not.have.property(\"paymentSummary\"); });",
          "pm.test(\"Snapshot item dan subtotal\", () => { pm.expect(j.items).to.have.lengthOf(1); const i = j.items[0]; pm.expect(i.name).to.be.a(\"string\").and.not.empty; pm.expect(i.quantity).to.eql(2); pm.expect(i.subtotal).to.eql(i.unitPrice * i.quantity); });",
          "pm.test(\"Total sama dengan jumlah subtotal\", () => pm.expect(j.totalAmount).to.eql(j.items.reduce((s, i) => s + i.subtotal, 0)));",
          "pm.test(\"Timestamp ISO-8601 UTC\", () => pm.expect(j.createdAt).to.match(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$/));",
          "pm.collectionVariables.set(\"orderId\", j.id);"
        ]
      }
    }
  ],
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "Content-Type",
        "value": "application/json"
      }
    ],
    "url": "{{baseUrl}}/api/v1/orders",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"outletId\": \"OUT-01\",\n  \"tableCode\": \"T-01\",\n  \"customerName\": \"Budi\",\n  \"items\": [\n    {\"menuItemId\": \"{{mieSuitId}}\", \"quantity\": 2}\n  ]\n}"
    }
  }
}
```

#### Request: POST pay CASH dengan uang cukup
```json
{
  "name": "POST pay CASH dengan uang cukup",
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
          "pm.test(\"Pesanan berpindah ke PREPARING\", () => pm.expect(j.status).to.eql(\"PREPARING\"));",
          "pm.test(\"Kontrak v1 tidak menampilkan detail pembayaran\", () => { pm.expect(j).to.not.have.property(\"paymentSummary\"); pm.expect(j).to.not.have.property(\"change\"); });",
          "pm.test(\"Total tidak berubah\", () => pm.expect(j.totalAmount).to.eql(j.items.reduce((s, i) => s + i.subtotal, 0)));"
        ]
      }
    }
  ],
  "request": {
    "method": "POST",
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
    "url": "{{baseUrl}}/api/v1/orders/{{orderId}}/pay",
    "body": {
      "mode": "raw",
      "raw": "{\"paymentMethod\": \"CASH\", \"amountTendered\": 100000}"
    }
  }
}
```

#### `tests/api/run-newman.ps1`
```powershell
param(
    [string]$BaseUrl = "http://host.docker.internal:8080"
)

$envFile = Join-Path $PSScriptRoot "../../../.env"
if (-not (Test-Path $envFile)) {
    Write-Error "File .env tidak ditemukan di root proyek: $envFile"
    exit 2
}

$values = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)=(.*)$') {
        $values[$Matches[1]] = $Matches[2]
    }
}

docker run --rm -v "${PSScriptRoot}:/etc/newman" postman/newman:alpine run `
    dikichi-v1-get-post.postman_collection.json `
    --env-var "baseUrl=$BaseUrl" `
    --env-var "masterPassword=$($values['SEED_MASTER_PASSWORD'])" `
    --env-var "cashierPassword=$($values['SEED_CASHIER_PASSWORD'])" `
    --env-var "kitchenPassword=$($values['SEED_KITCHEN_PASSWORD'])" `
    --reporters cli
```

---

## 6.4 Cara Menjalankan Pengujian

Uji unit tidak membutuhkan sistem yang menyala. Uji API membutuhkan seluruh kontainer berstatus *healthy*.

```powershell
cd Backend/order-service
docker run --rm -v "$(PWD):/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test

cd ../catalog-service
docker run --rm -v "$(PWD):/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test

cd ..
docker compose --env-file ./.env up -d --build gateway-service
docker compose --env-file ./.env ps

powershell -ExecutionPolicy Bypass -File ./tests/api/run-newman.ps1
```

Skrip `run-newman.ps1` membaca kata sandi akun seed dari berkas `.env` dan meneruskannya ke Newman sebagai variabel lingkungan, sehingga tidak ada kata sandi yang tersimpan pada koleksi. Opsi `-ExecutionPolicy Bypass` hanya berlaku untuk satu kali eksekusi dan tidak mengubah pengaturan Windows.

---

## 6.5 Hasil Pengujian

### 6.5.1 Hasil Uji Unit

| Kelas Uji | Dijalankan | Gagal | Error | Dilewati | Waktu (detik) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `order-service: OrderServiceTest` | 14 | 0 | 0 | 0 | 3,589 |
| `order-service: OrderStateMachineTest` | 4 | 0 | 0 | 0 | 0,013 |
| `order-service: PaymentServiceTest` | 11 | 0 | 0 | 0 | 0,140 |
| **Total order-service** | **29** | **0** | **0** | **0** | **10,820 (BUILD SUCCESS)** |
| `catalog-service: AuthServiceTest` | 4 | 0 | 0 | 0 | 4,679 |
| `catalog-service: MenuItemServiceTest` | 8 | 0 | 0 | 0 | 0,294 |
| `catalog-service: OrderValidationServiceTest` | 6 | 0 | 0 | 0 | 0,222 |
| `catalog-service: OutletServiceTest` | 7 | 0 | 0 | 0 | 0,047 |
| `catalog-service: TableServiceTest` | 6 | 0 | 0 | 0 | 0,047 |
| **Total catalog-service** | **31** | **0** | **0** | **0** | **8,701 (BUILD SUCCESS)** |

Seluruh 60 uji unit lulus pada eksekusi akhir. Pada eksekusi pertama `catalog-service`, empat uji pada `OrderValidationServiceTest` berstatus error (`UnfinishedStubbingException`) karena fungsi pembantu uji melakukan stubbing Mockito di dalam stubbing lain. Penyebabnya ada pada kode uji, bukan pada layanan, sehingga perbaikan hanya dilakukan pada kode uji dan eksekusi ulang menghasilkan 31 dari 31 uji lulus. Angka waktu pada tabel di atas diambil dari eksekusi bukti pada Gambar 6.4 dan Gambar 6.5.

### 6.5.2 Hasil Uji API (Newman)

| Ukuran | Dijalankan | Gagal |
| :--- | :---: | :---: |
| Iterasi | 1 | 0 |
| Request | 60 | 0 |
| Skrip uji (*test-scripts*) | 60 | 0 |
| Skrip prarequest | 1 | 0 |
| Asersi | 262 | 0 |

Total durasi eksekusi 3,8 detik. Rata-rata waktu respons 49 ms dengan minimum 7 ms, maksimum 699 ms, dan simpangan baku 103 ms (Gambar 6.2). Seluruh respons berada di bawah ambang 2000 ms yang ditetapkan pada asersi.

| Kelompok | Request | Asersi | Gagal | Hasil |
| :--- | :---: | :---: | :---: | :---: |
| 00 Autentikasi (`POST /auth/login`) | 5 | 23 | 0 | Lulus |
| 01 Catalog GET (rute publik) | 9 | 42 | 0 | Lulus |
| 02 Catalog POST | 15 | 64 | 0 | Lulus |
| 03 Order POST dan GET | 19 | 86 | 0 | Lulus |
| 04 Pembayaran (`POST /orders/{id}/pay`) | 9 | 38 | 0 | Lulus |
| 05 Dapur dan Gateway | 3 | 9 | 0 | Lulus |
| **Total** | **60** | **262** | **0** | **Lulus** |

### 6.5.3 Rincian Hasil per Request

Tabel berikut memuat status HTTP aktual, waktu respons, dan jumlah asersi untuk setiap request. Seluruh asersi pada seluruh request lulus.

| No | Request | Status | Waktu (ms) | Asersi Lulus |
| :---: | :--- | :---: | :---: | :---: |
| 1 | POST Login dengan kata sandi salah | 401 | 665 | 4 |
| 2 | POST Login dengan body tidak valid | 400 | 31 | 5 |
| 3 | POST Login MASTER | 200 | 139 | 6 |
| 4 | POST Login CASHIER | 200 | 81 | 4 |
| 5 | POST Login KITCHEN | 200 | 101 | 4 |
| 6 | GET daftar outlet | 200 | 47 | 6 |
| 7 | GET outlet OUT-01 | 200 | 45 | 4 |
| 8 | GET outlet yang tidak ada | 404 | 20 | 4 |
| 9 | GET daftar meja OUT-01 | 200 | 35 | 6 |
| 10 | GET daftar meja outlet yang tidak ada | 404 | 17 | 4 |
| 11 | GET daftar menu OUT-01 | 200 | 39 | 5 |
| 12 | GET item menu berdasarkan ID | 200 | 27 | 5 |
| 13 | GET item menu yang tidak ada | 404 | 17 | 4 |
| 14 | GET item menu dengan ID bukan UUID | 400 | 19 | 4 |
| 15 | POST outlet tanpa token | 401 | 15 | 4 |
| 16 | POST outlet oleh CASHIER | 403 | 97 | 4 |
| 17 | POST outlet dengan body tidak valid | 400 | 23 | 5 |
| 18 | POST outlet dengan JSON rusak | 400 | 18 | 4 |
| 19 | POST outlet oleh MASTER | 201 | 82 | 5 |
| 20 | POST outlet dengan ID yang sudah ada | 409 | 20 | 4 |
| 21 | GET outlet yang baru dibuat | 200 | 16 | 4 |
| 22 | POST meja pada outlet baru | 201 | 38 | 5 |
| 23 | POST meja dengan kode yang sama | 409 | 23 | 4 |
| 24 | POST meja dengan format kode salah | 400 | 17 | 4 |
| 25 | POST meja pada outlet yang tidak ada | 404 | 20 | 4 |
| 26 | POST item menu pada outlet baru | 201 | 36 | 5 |
| 27 | POST item menu dengan harga 0 | 400 | 15 | 4 |
| 28 | POST item menu oleh KITCHEN | 403 | 21 | 4 |
| 29 | GET menu outlet baru memuat item yang dibuat | 200 | 26 | 4 |
| 30 | POST pesanan oleh tamu tanpa token | 201 | 330 | 11 |
| 31 | POST pesanan berisi item sold out | 409 | 33 | 5 |
| 32 | POST pesanan dengan kode meja yang tidak ada | 422 | 21 | 4 |
| 33 | POST pesanan dengan outlet yang tidak ada | 422 | 28 | 4 |
| 34 | POST pesanan dengan item yang tidak ada | 422 | 27 | 4 |
| 35 | POST pesanan dengan item ganda | 400 | 17 | 4 |
| 36 | POST pesanan tanpa item | 400 | 37 | 4 |
| 37 | POST pesanan dengan jumlah 100 | 400 | 22 | 4 |
| 38 | POST pesanan dengan nama pelanggan kosong | 400 | 32 | 4 |
| 39 | POST pesanan dengan JSON rusak | 400 | 29 | 4 |
| 40 | GET daftar pesanan tanpa token | 401 | 11 | 4 |
| 41 | GET daftar pesanan oleh CASHIER | 200 | 450 | 6 |
| 42 | GET pesanan berstatus PREPARING oleh CASHIER | 403 | 27 | 4 |
| 43 | GET pesanan dengan status tidak dikenal | 400 | 24 | 4 |
| 44 | GET pesanan outlet lain oleh CASHIER | 403 | 28 | 4 |
| 45 | GET daftar pesanan oleh MASTER | 403 | 17 | 4 |
| 46 | GET pesanan berdasarkan ID | 200 | 33 | 4 |
| 47 | GET pesanan yang tidak ada | 404 | 29 | 4 |
| 48 | GET pesanan dengan ID bukan UUID | 400 | 19 | 4 |
| 49 | PATCH Prasyarat: CASHIER menerima pesanan (PATCH status) | 200 | 38 | 4 |
| 50 | POST pay tanpa token | 401 | 9 | 4 |
| 51 | POST pay oleh KITCHEN | 403 | 23 | 4 |
| 52 | POST pay CASH dengan uang kurang | 400 | 28 | 4 |
| 53 | POST pay CARD dengan amountTendered | 400 | 20 | 4 |
| 54 | POST pay dengan metode tidak dikenal | 400 | 15 | 4 |
| 55 | POST pay CASH dengan uang cukup | 200 | 41 | 6 |
| 56 | POST pay untuk kedua kalinya | 409 | 24 | 4 |
| 57 | POST pay pada pesanan yang tidak ada | 404 | 19 | 4 |
| 58 | GET antrean PREPARING oleh KITCHEN | 200 | 20 | 4 |
| 59 | GET antrean CASHIER tidak lagi memuat pesanan yang dibayar | 200 | 17 | 4 |
| 60 | POST ke `/internal/orders/validate` melalui gateway | 404 | 53 | 1 |

> **Catatan:** Waktu respons pada request 30, 31, dan 32 sesuai dengan eksekusi bukti pada Gambar 6.3, sedangkan ringkasan pada subbab 6.5.2 sesuai dengan Gambar 6.2. Waktu respons bersifat variatif antar eksekusi, sehingga nilai request lain dan nilai maksimum pada tabel dapat berbeda beberapa milidetik dari ringkasan. Status HTTP dan jumlah asersi pada setiap request tidak berubah.

---

### 6.5.4 Bukti Screenshot

Subbab ini memuat tangkapan layar dari eksekusi pengujian yang menjadi dasar angka pada subbab 6.5. Pengujian dijalankan pada sistem yang baru dibangun ulang dengan Docker Compose, sesuai langkah pada subbab 6.4. Setiap gambar menampilkan perintah yang dijalankan beserta keluaran aslinya.

#### Gambar 6.1 Status kelima kontainer pada docker compose ps
```text
PS C:\Users\LENOVO\Documents\Kuliah SEMESTER 7 ABL\projek\Dikichi-Order-System\Backend> docker compose --env-file ../.env ps
NAME                        IMAGE                                           COMMAND                  SERVICE           CREATED         STATUS                   PORTS
dikichi-catalog-db-1        postgres:16                                     "docker-entrypoint.s…"   catalog-db        2 minutes ago   Up 2 minutes (healthy)   5432/tcp
dikichi-catalog-service-1   ghcr.io/local/dikichi-catalog-service:latest     "java -jar app.jar"      catalog-service   2 minutes ago   Up 2 minutes (healthy)   8081/tcp
dikichi-gateway-service-1   ghcr.io/local/dikichi-gateway-service:latest     "java -jar app.jar"      gateway-service   2 minutes ago   Up 2 minutes (healthy)   0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp
dikichi-order-db-1          postgres:16                                     "docker-entrypoint.s…"   order-db          2 minutes ago   Up 2 minutes (healthy)   5432/tcp
dikichi-order-service-1     ghcr.io/local/dikichi-order-service:latest       "java -jar app.jar"      order-service     2 minutes ago   Up 2 minutes (healthy)   8082/tcp
```
*Keterangan Gambar 6.1:* Perintah `docker compose ps` menampilkan `catalog-db`, `order-db`, `catalog-service`, `order-service`, dan `gateway-service` dengan status *healthy*. Hanya `gateway-service` yang memublikasikan port 8080 ke host, sedangkan layanan lain hanya dapat dijangkau di jaringan internal Docker.

---

#### Gambar 6.2 Ringkasan hasil uji API dengan Newman
```text
PS C:\Users\LENOVO\Documents\Kuliah SEMESTER 7 ABL\projek\Dikichi-Order-System\Backend> $out | Select-Object -Last 20
                                executed   failed
iterations                             1        0
requests                              60        0
test-scripts                          60        0
prerequest-scripts                     1        0
assertions                           262        0
total run duration: 3.8s
total data received: 15.23kB (approx)
average response time: 49ms [min: 7ms, max: 699ms, s.d.: 103ms]
```
*Keterangan Gambar 6.2:* Newman menjalankan 60 request dan 262 asersi tanpa satu pun kegagalan. Total durasi 3,8 detik dengan rata-rata waktu respons 49 ms (minimum 7 ms, maksimum 699 ms, simpangan baku 103 ms).

---

#### Gambar 6.3 Keluaran Newman kelompok 03 Order POST dan GET (tiga request pertama)
```text
PS C:\Users\LENOVO\Documents\Kuliah SEMESTER 7 ABL\projek\Dikichi-Order-System\Backend> $i = [array]::IndexOf($out, ($out | Where-Object {$_ -like "*03 Order POST dan GET*"} | Select-Object -First 1))
>> $out[$i..($i+28)]
┌
│ 03 Order POST dan GET
└
  POST pesanan oleh tamu tanpa token
  POST http://host.docker.internal:8080/api/v1/orders [201 Created, 754B, 330ms]
  ✓ Status 201
  ✓ Waktu respons di bawah 2000 ms
  ✓ Content-Type JSON
  ✓ Header Location menunjuk pesanan
  ✓ ID berformat UUID
  ✓ Nomor pesanan berformat ORD-
  ✓ Status awal PENDING dan data lokasi
  ✓ Kontrak v1 datar tanpa objek bersarang
  ✓ Snapshot item dan subtotal
  ✓ Total sama dengan jumlah subtotal
  ✓ Timestamp ISO-8601 UTC

  POST pesanan berisi item sold out
  POST http://host.docker.internal:8080/api/v1/orders [409 Conflict, 542B, 33ms]
  ✓ Status 409
  ✓ Format kesalahan seragam
  ✓ Kode kesalahan ITEM_UNAVAILABLE
  ✓ Waktu respons di bawah 2000 ms
  ✓ Item bermasalah dilaporkan

  POST pesanan dengan kode meja yang tidak ada
  POST http://host.docker.internal:8080/api/v1/orders [422 Unprocessable Entity, 559B, 21ms]
  ✓ Status 422
  ✓ Format kesalahan seragam
  ✓ Kode kesalahan INVALID_TABLE
  ✓ Waktu respons di bawah 2000 ms
```
*Keterangan Gambar 6.3:* Request 30 sampai 32 pada kelompok 03: pembuatan pesanan oleh tamu tanpa token menghasilkan 201 Created (330 ms, 11 asersi), pesanan berisi item sold out menghasilkan 409 dengan kode `ITEM_UNAVAILABLE` (33 ms, 5 asersi), dan kode meja yang tidak ada menghasilkan 422 dengan kode `INVALID_TABLE` (21 ms, 4 asersi). Setiap asersi ditandai centang.

---

#### Gambar 6.4 Hasil uji unit order-service
```text
PS C:\Users\LENOVO\Documents\Kuliah SEMESTER 7 ABL\projek\Dikichi-Order-System\Backend\order-service> docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn test 2>&1 | Select-String "Running|Tests run|BUILD|Total time"
[INFO] Building order-service 1.0.0
[INFO] Running com.ambatucode.dikichi.order.service.OrderServiceTest
Mockito is currently self-attaching to enable the inline-mock-maker. This will no longer work in future releases of the JDK. Please add Mockito as an agent to your build as described in Mockito's documentation: https://javadoc.io/doc/org.mockito/mockito-core/latest/org.mockito/org/mockito/Mockito.html#0.3
[INFO] Tests run: 14, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 3.589 s in com.ambatucode.dikichi.order.service.OrderServiceTest
[INFO] Running com.ambatucode.dikichi.order.service.OrderStateMachineTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.013 s in com.ambatucode.dikichi.order.service.OrderStateMachineTest
[INFO] Running com.ambatucode.dikichi.order.service.PaymentServiceTest
[INFO] Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.140 s in com.ambatucode.dikichi.order.service.PaymentServiceTest
[INFO] Tests run: 29, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time: 10.820 s
```
*Keterangan Gambar 6.4:* Tiga kelas uji dijalankan: `OrderServiceTest` (14), `OrderStateMachineTest` (4), dan `PaymentServiceTest` (11), total 29 uji tanpa kegagalan, error, maupun yang dilewati, dengan BUILD SUCCESS dalam 10,820 detik. Peringatan Mockito mengenai *self-attaching* berasal dari JDK dan tidak memengaruhi hasil uji.

---

#### Gambar 6.5 Hasil uji unit catalog-service
```text
PS C:\Users\LENOVO\Documents\Kuliah SEMESTER 7 ABL\projek\Dikichi-Order-System\Backend\catalog-service> docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn test 2>&1 | Select-String "Running|Tests run|BUILD|Total time"
[INFO] Building catalog-service 1.0.0
[INFO] Running com.ambatucode.dikichi.catalog.service.AuthServiceTest
Mockito is currently self-attaching to enable the inline-mock-maker. This will no longer work in future releases of the JDK. Please add Mockito as an agent to your build as described in Mockito's documentation: https://javadoc.io/doc/org.mockito/mockito-core/latest/org.mockito/org/mockito/Mockito.html#0.3
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 4.679 s in com.ambatucode.dikichi.catalog.service.AuthServiceTest
[INFO] Running com.ambatucode.dikichi.catalog.service.MenuItemServiceTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.294 s in com.ambatucode.dikichi.catalog.service.MenuItemServiceTest
[INFO] Running com.ambatucode.dikichi.catalog.service.OrderValidationServiceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.222 s in com.ambatucode.dikichi.catalog.service.OrderValidationServiceTest
[INFO] Running com.ambatucode.dikichi.catalog.service.OutletServiceTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.047 s in com.ambatucode.dikichi.catalog.service.OutletServiceTest
[INFO] Running com.ambatucode.dikichi.catalog.service.TableServiceTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.047 s in com.ambatucode.dikichi.catalog.service.TableServiceTest
[INFO] Tests run: 31, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time: 8.701 s
```
*Keterangan Gambar 6.5:* Lima kelas uji dijalankan: `AuthServiceTest` (4), `MenuItemServiceTest` (8), `OrderValidationServiceTest` (6), `OutletServiceTest` (7), dan `TableServiceTest` (6), total 31 uji tanpa kegagalan, error, maupun yang dilewati, dengan BUILD SUCCESS dalam 8,701 detik.

---

## 6.6 Analisis Hasil

* **Kesesuaian dengan spesifikasi:** seluruh status dan kode kesalahan aktual sama dengan yang dirancang pada Bab 2, termasuk urutan kesalahan 401 (tanpa token), 403 (role), 404, 409, dan 422.
* **Format kesalahan seragam:** kesalahan yang dihasilkan gateway (401) dan layanan memiliki enam field yang sama, sehingga klien dapat menangani semuanya dengan satu pola.
* **Kontrak v1.0:** respons pesanan berbentuk datar tanpa objek `customer`, `location`, atau `paymentSummary`, termasuk setelah pembayaran.
* **Keamanan rute:** `POST /orders/{id}/pay` tanpa token ditolak 401 meskipun `POST /orders` bersifat publik, dan rute `/internal/**` tidak diteruskan oleh gateway (404).
* **Waktu respons:** request pertama pada jalur yang belum pernah dilewati memakan waktu lebih lama (misalnya 330 ms untuk pembuatan pesanan pertama pada Gambar 6.3, dengan nilai maksimum keseluruhan 699 ms), sedangkan rata-rata seluruh request hanya 49 ms. Pola ini sesuai dengan pemanasan JVM dan koneksi basis data pada pemanggilan pertama, dan seluruhnya masih jauh di bawah ambang 2000 ms.
* **Temuan cacat:** tidak ada ketidaksesuaian perilaku API yang ditemukan oleh uji API. Satu-satunya kegagalan selama pengujian berasal dari kode uji unit (lihat Hasil Uji Unit) dan telah diperbaiki.

---

## 6.7 Keterbatasan Pengujian

* Uji unit memakai mock untuk repository, sehingga batasan basis data (*constraint* dan indeks) serta *optimistic locking* tidak diuji pada lapisan ini. Aspek tersebut tercakup sebagian oleh uji API dan skrip smoke test terhadap PostgreSQL asli.
* Uji API berjalan sebagai satu alur berurutan pada satu pengguna. Pengujian beban, konkurensi, dan ketahanan ketika `catalog-service` tidak tersedia (503) belum dilakukan.
* Data hasil uji API (outlet, meja, menu, dan pesanan uji) tetap tersimpan di basis data. Untuk kondisi bersih, sistem dijalankan ulang dengan menghapus volume basis data.
* Pengujian PUT, PATCH, dan DELETE dilaporkan pada iterasi berikutnya. Request PATCH pada kelompok 04 hanya prasyarat alur pembayaran.