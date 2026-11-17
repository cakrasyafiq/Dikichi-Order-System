# BAB 12. PENGUJIAN API VERSI 2.0 (GET, POST, PUT, PATCH & DELETE)

Bab ini memuat pengujian terhadap seluruh operasi pada resource **Order** di API versi 2.0 (**/api/v2**), yaitu **GET**, **POST**, **PUT**, **PATCH**, dan **DELETE**, yang diimplementasikan pada Bab 10 dan Bab 11. Pengujian memakai dua pendekatan yang saling melengkapi, yaitu uji unit pada lapisan controller, validasi, dan *mapper*, serta uji API terhadap sistem yang berjalan penuh melalui gateway. Pembahasan mencakup strategi, rancangan kasus uji, kode sumber pengujian, hasil eksekusi beserta bukti tangkapan layar, analisis, dan keterbatasan.

## 12.1 Strategi Pengujian

### 12.1.1 Tujuan dan Ruang Lingkup

- Memastikan setiap endpoint Order pada API v2 berperilaku sesuai spesifikasi pada Bab 9, baik pada jalur normal maupun jalur kesalahan.

- Memverifikasi aturan otorisasi per role (**MASTER**, **CASHIER**, **KITCHEN**), cakupan outlet, serta rute publik yang dibatasi pada **POST /api/v2/orders**.

- Memverifikasi bahwa kontrak v2 berbentuk bersarang (**customer**, **location**, **paymentSummary**) dan bahwa kontrak v1 tetap datar ketika pesanan yang sama dibaca melalui **/api/v1**.

- Memverifikasi bahwa seluruh kesalahan memakai format yang seragam (enam field **timestamp**, **status**, **code**, **message**, **path**, **errors**), baik yang dihasilkan gateway maupun layanan.

- **Cakupan:** enam endpoint Order v2 yang dipetakan (POST pesanan, GET daftar, GET detail, POST pay, PUT, dan PATCH status) ditambah **DELETE** pada pesanan yang sengaja tidak dipetakan dan harus dijawab **405 METHOD_NOT_ALLOWED**. Satu request PATCH v1 dipakai hanya sebagai prasyarat agar pesanan berstatus ACCEPTED sebelum diuji pembayarannya.

### 12.1.2 Lapisan Pengujian

| Lapisan | Alat | Sasaran | Jumlah | Sistem Menyala |
| :--- | :--- | :--- | :--- | :--- |
| Uji unit | JUnit 5 dan Mockito | Controller v2, validasi request bersarang, mapper v2, serta aturan bisnis bersama v1 dan v2 | 70 uji | Tidak |
| Uji API | Postman Collection dijalankan dengan Newman | Perilaku HTTP sistem utuh melalui gateway: status, kode kesalahan, bentuk data, waktu respons | 92 request, 417 asersi | Ya |

Uji unit memeriksa aturan dengan cepat dan terisolasi, sedangkan uji API membuktikan bahwa seluruh komponen (gateway, layanan, basis data, dan migrasi) bekerja bersama. Uji API v2 terbagi menjadi dua koleksi, yaitu **dikichi-v2-get-post** (37 request) dan **dikichi-v2-put-patch-delete** (55 request).

### 12.1.3 Teknik Perancangan Kasus Uji

- **Partisi ekuivalen:** masukan dikelompokkan menjadi valid dan tidak valid, misalnya kode meja valid (T-01), format salah, dan meja yang tidak ada (T-99).

- **Analisis nilai batas:** jumlah item 100 (melanggar batas atas), daftar item kosong, dan nama pelanggan lebih dari 50 karakter (uji unit).

- **Pengujian negatif:** JSON rusak, UUID tidak valid, metode pembayaran tidak dikenal, status tidak dikenal, dan body bergaya v1 yang dikirim ke endpoint v2.

- **Pengujian berbasis role:** setiap endpoint terlindungi diuji dengan role yang berhak, role yang tidak berhak, dan tanpa token.

- **Pengujian mesin status:** seluruh transisi yang diizinkan dan yang terlarang pada alur PENDING, ACCEPTED, PREPARING, READY, COMPLETED, dan CANCELLED.

- **Pengujian kompatibilitas:** pesanan yang dibuat atau diubah melalui v2 dibaca kembali melalui v1 untuk memastikan kedua versi berjalan berdampingan.

### 12.1.4 Lingkungan Pengujian

| Komponen | Keterangan |
| :--- | :--- |
| Sistem operasi host | Windows, dijalankan melalui Windows PowerShell 5.1 |
| Kontainer | Docker dan Docker Compose, lima kontainer backend (catalog-db, order-db, catalog-service, order-service, gateway-service) |
| Java | Versi 21 (citra eclipse-temurin:21-jre dan maven:3.9-eclipse-temurin-21) |
| Spring Boot | Versi 4.0.7 (parent pom.xml), pustaka uji mengikuti manajemen dependensi Spring Boot |
| PostgreSQL | Citra postgres:16, dua basis data terpisah (catalog_db dan order_db), dibuat bersih sebelum pengujian dengan menghapus volume |
| Penjalan uji unit | Maven 3.9 di dalam kontainer maven:3.9-eclipse-temurin-21 |
| Penjalan uji API | Newman di dalam kontainer postman/newman:alpine melalui skrip run-newman.ps1 |
| Alamat uji | Gateway pada http://host.docker.internal:8080 (port 8080 sistem lokal) |

## 12.2 Rancangan Kasus Uji

### 12.2.1 Kasus Uji Unit

| Kelas Uji | Jumlah | Cakupan |
| :--- | :--- | :--- |
| OrderV2ControllerTest | 9 | POST 201 dengan header Location dan paymentSummary UNPAID, daftar pesanan dengan satu pencarian pembayaran, GET detail dengan dan tanpa pembayaran, pembayaran menghasilkan PREPARING dan PAID, PUT mendelegasikan request bersarang, PATCH CANCELLED (UNPAID) dan READY (PAID), serta pemeriksaan bahwa PUT dan PATCH dipetakan tetapi DELETE tidak |
| V2OrderRequestValidationTest | 7 | Request valid, body datar gaya v1 ditolak, nama pelanggan kosong, nama lebih dari 50 karakter, format outlet dan meja salah, daftar item kosong, dan kuantitas tidak valid, dengan path galat bersarang |
| OrderV2MapperTest | 4 | Request diratakan menjadi perintah bersama, ringkasan UNPAID dengan field pembayaran null, pembayaran CASH memuat uang diterima dan kembalian, serta pembayaran non-tunai |
| OrderServiceTest (bersama v1 dan v2) | 32 | Pembuatan, daftar, detail, penggantian (PUT), dan perubahan status (PATCH) pada lapisan service |
| OrderStateMachineTest (bersama v1 dan v2) | 4 | Transisi status, kepemilikan status per role, dan status yang tidak pernah dapat di-PATCH |
| PaymentServiceTest dan PaymentServiceLookupTest (bersama v1 dan v2) | 11 dan 3 | Pembayaran CASH, CARD, dan QRIS serta pencarian pembayaran per pesanan dan per daftar pesanan |
| Total | 70 |  |

### 12.2.2 Kasus Uji API

Kedua koleksi disusun sebagai alur data yang berurutan dan dijalankan pada basis data bersih. Variabel seperti token dan ID pesanan disimpan antar-request. Setiap request kesalahan diperiksa dengan empat asersi yang sama, yaitu kode status, kesamaan format kesalahan, kode kesalahan, dan waktu respons di bawah 2000 ms.

| Kelompok (koleksi GET dan POST) | Request | Asersi | Cakupan |
| :--- | :--- | :--- | :--- |
| 00 Autentikasi | 3 | 12 | Login tiga role dan bentuk token |
| 01 Order v2 POST | 13 | 63 | Pembuatan pesanan tanpa token dan seluruh kode kesalahan |
| 02 Order v2 GET | 10 | 45 | Daftar, filter, otorisasi, detail, dan pembacaan lewat v1 |
| 03 Pembayaran v2 | 11 | 47 | Pembayaran CASH, CARD, metode salah, pembayaran ganda, dan antrean dapur |
| Total | 37 | 167 |  |

| Kelompok (koleksi PUT, PATCH, dan DELETE) | Request | Asersi | Cakupan |
| :--- | :--- | :--- | :--- |
| 00 Prasyarat | 4 | 17 | Login tiga role dan pesanan awal |
| 01 Order v2 PUT | 18 | 80 | Otorisasi, validasi, kesalahan katalog, penggantian berhasil, dan pembacaan lewat v1 |
| 02 Order v2 PATCH | 26 | 123 | Otorisasi, validasi, seluruh transisi status, pembayaran, dan pembatalan |
| 03 Order v2 DELETE | 7 | 30 | Penolakan 405 untuk setiap role dan bukti data tidak berubah |
| Total | 55 | 250 |  |

### 12.2.3 Keterlacakan Endpoint terhadap Pengujian

Singkatan GP merujuk pada koleksi **dikichi-v2-get-post** dan PPD pada koleksi **dikichi-v2-put-patch-delete**. Nomor request mengikuti urutan eksekusi pada tabel rincian hasil (subbab 12.5.4). Request yang berstatus prasyarat tidak dihitung sebagai pengujian endpoint terkait.

| Endpoint | Uji Unit | Request Uji API (nomor) |
| :--- | :--- | :--- |
| POST /api/v2/orders | OrderV2ControllerTest (1), V2OrderRequestValidationTest (7), OrderV2MapperTest (1) | GP 4 sampai 16 (PPD 4 dan 44 sebagai prasyarat) |
| GET /api/v2/orders | OrderV2ControllerTest (1), OrderV2MapperTest (3) | GP 17 sampai 22 dan 37 |
| GET /api/v2/orders/{orderId} | OrderV2ControllerTest (2) | GP 23 sampai 25 dan 36, PPD 21, 47, 55 |
| POST /api/v2/orders/{orderId}/pay | OrderV2ControllerTest (1), PaymentServiceTest (11), PaymentServiceLookupTest (3) | GP 28 sampai 35 (PPD 38 sebagai prasyarat) |
| PUT /api/v2/orders/{orderId} | OrderV2ControllerTest (1), OrderServiceTest (bagian PUT) | PPD 5 sampai 20 dan 37 |
| PATCH /api/v2/orders/{orderId}/status | OrderV2ControllerTest (2), OrderStateMachineTest (4), OrderServiceTest (bagian PATCH) | PPD 23 sampai 36, 39 sampai 43, 45, 46 |
| DELETE /api/v2/orders/{orderId} (405) | OrderV2ControllerTest (1, pemetaan tanpa DELETE) | PPD 49 sampai 54 (55 membuktikan data tidak berubah) |
| Kompatibilitas v1 dan v2 | Tidak ada | GP 26, PPD 22 dan 48 |

## 12.3 Kode Sumber Pengujian

### 12.3.1 Uji Unit order-service

Tiga kelas uji berikut khusus untuk kontrak v2. Kelas **OrderServiceTest**, **OrderStateMachineTest**, **PaymentServiceTest**, dan **PaymentServiceLookupTest** dipakai bersama oleh v1 dan v2 dan kodenya telah dimuat pada Bab 6 dan Bab 7.

**order-service: src/test/.../order/controller/OrderV2ControllerTest.java**

```java
package com.ambatucode.dikichi.order.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.order.controller.v2.OrderV2Controller;
import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.dto.common.OrderStatusPatchRequest;
import com.ambatucode.dikichi.order.dto.common.PaymentRequest;
import com.ambatucode.dikichi.order.dto.v2.PaymentStatus;
import com.ambatucode.dikichi.order.dto.v2.V2OrderRequest;
import com.ambatucode.dikichi.order.dto.v2.V2OrderResponse;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.PaymentMethod;
import com.ambatucode.dikichi.order.service.CreateOrderCommand;
import com.ambatucode.dikichi.order.service.OrderService;
import com.ambatucode.dikichi.order.service.PaymentService;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;

class OrderV2ControllerTest {

    private static final UUID MENU_MIE = UUID.fromString("11111111-0000-4000-8000-000000000001");

    private final OrderService orderService = mock(OrderService.class);
    private final PaymentService paymentService = mock(PaymentService.class);
    private final OrderV2Controller controller = new OrderV2Controller(orderService, paymentService);

    private static Order order(String number, OrderStatus status) {
        Order order = new Order(number, "OUT-01", "T-01", "Budi");
        order.addItem(new OrderItem(MENU_MIE, "Mie Suit", 25000, 2));
        order.changeStatus(status);
        ReflectionTestUtils.setField(order, "id", UUID.randomUUID());
        return order;
    }

    @Test
    void createReturns201WithLocationAndUnpaidNestedBody() {
        Order created = order("ORD-0001", OrderStatus.PENDING);
        when(orderService.create(org.mockito.ArgumentMatchers.any(CreateOrderCommand.class))).thenReturn(created);
        V2OrderRequest request = new V2OrderRequest(new V2OrderRequest.Customer("Budi"),
                new V2OrderRequest.Location("OUT-01", "T-01"), List.of(new OrderItemRequest(MENU_MIE, 2)));

        ResponseEntity<V2OrderResponse> response = controller.create(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).hasToString("/api/v2/orders/" + created.getId());
        assertThat(response.getBody().customer().name()).isEqualTo("Budi");
        assertThat(response.getBody().location().tableCode()).isEqualTo("T-01");
        assertThat(response.getBody().paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        ArgumentCaptor<CreateOrderCommand> captor = ArgumentCaptor.forClass(CreateOrderCommand.class);
        verify(orderService).create(captor.capture());
        assertThat(captor.getValue().outletId()).isEqualTo("OUT-01");
        assertThat(captor.getValue().customerName()).isEqualTo("Budi");
        verify(paymentService, never()).findByOrderId(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void listLoadsPaymentsForTheWholeQueueWithOneLookup() {
        Order paid = order("ORD-0001", OrderStatus.PREPARING);
        Order unpaid = order("ORD-0002", OrderStatus.ACCEPTED);
        when(orderService.list("OUT-01", null)).thenReturn(List.of(paid, unpaid));
        MockPayment payment = new MockPayment(paid.getId(), PaymentMethod.CASH, 60000L, 10000L, 50000L);
        when(paymentService.findByOrderIds(List.of(paid.getId(), unpaid.getId())))
                .thenReturn(Map.of(paid.getId(), payment));

        List<V2OrderResponse> response = controller.list("OUT-01", null);

        assertThat(response).hasSize(2);
        assertThat(response.get(0).paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.get(0).paymentSummary().change()).isEqualTo(10000L);
        assertThat(response.get(1).paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        verify(paymentService).findByOrderIds(List.of(paid.getId(), unpaid.getId()));
        verify(paymentService, never()).findByOrderId(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void getReturnsOrderInV2ShapeWithPaymentWhenPresent() {
        Order order = order("ORD-0003", OrderStatus.PREPARING);
        when(orderService.get(order.getId())).thenReturn(order);
        when(paymentService.findByOrderId(order.getId())).thenReturn(Optional.of(
                new MockPayment(order.getId(), PaymentMethod.QRIS, null, null, 50000L)));

        V2OrderResponse response = controller.get(order.getId());

        assertThat(response.id()).isEqualTo(order.getId());
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().paymentMethod()).isEqualTo(PaymentMethod.QRIS);
    }

    @Test
    void getReturnsUnpaidSummaryWhenNoPaymentExists() {
        Order order = order("ORD-0004", OrderStatus.PENDING);
        when(orderService.get(order.getId())).thenReturn(order);
        when(paymentService.findByOrderId(order.getId())).thenReturn(Optional.empty());

        V2OrderResponse response = controller.get(order.getId());

        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
    }

    @Test
    void payReturnsPreparingOrderWithPaidSummary() {
        Order order = order("ORD-0005", OrderStatus.PREPARING);
        PaymentRequest request = new PaymentRequest(PaymentMethod.CASH, 60000L);
        when(paymentService.pay(order.getId(), request)).thenReturn(order);
        when(paymentService.findByOrderId(order.getId())).thenReturn(Optional.of(
                new MockPayment(order.getId(), PaymentMethod.CASH, 60000L, 10000L, 50000L)));

        V2OrderResponse response = controller.pay(order.getId(), request);

        assertThat(response.status()).isEqualTo(OrderStatus.PREPARING);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().amountTendered()).isEqualTo(60000L);
        assertThat(response.paymentSummary().change()).isEqualTo(10000L);
    }

    @Test
    void replaceDelegatesNestedRequestAndReturnsUnpaidV2Body() {
        Order replaced = order("ORD-0006", OrderStatus.PENDING);
        when(orderService.replace(org.mockito.ArgumentMatchers.eq(replaced.getId()),
                org.mockito.ArgumentMatchers.any(CreateOrderCommand.class))).thenReturn(replaced);
        V2OrderRequest request = new V2OrderRequest(new V2OrderRequest.Customer("Budi Santoso"),
                new V2OrderRequest.Location("OUT-01", "T-05"), List.of(new OrderItemRequest(MENU_MIE, 1)));

        V2OrderResponse response = controller.replace(replaced.getId(), request);

        ArgumentCaptor<CreateOrderCommand> captor = ArgumentCaptor.forClass(CreateOrderCommand.class);
        verify(orderService).replace(org.mockito.ArgumentMatchers.eq(replaced.getId()), captor.capture());
        assertThat(captor.getValue().outletId()).isEqualTo("OUT-01");
        assertThat(captor.getValue().tableCode()).isEqualTo("T-05");
        assertThat(captor.getValue().customerName()).isEqualTo("Budi Santoso");
        assertThat(response.id()).isEqualTo(replaced.getId());
        assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        verify(paymentService, never()).findByOrderId(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateStatusReturnsUnpaidSummaryWhenOrderIsCancelledWithoutPayment() {
        Order cancelled = order("ORD-0007", OrderStatus.CANCELLED);
        OrderStatusPatchRequest request = new OrderStatusPatchRequest("CANCELLED");
        when(orderService.updateStatus(cancelled.getId(), request)).thenReturn(cancelled);
        when(paymentService.findByOrderId(cancelled.getId())).thenReturn(Optional.empty());

        V2OrderResponse response = controller.updateStatus(cancelled.getId(), request);

        assertThat(response.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        assertThat(response.paymentSummary().paymentMethod()).isNull();
    }

    @Test
    void updateStatusReturnsPaidSummaryWhenOrderAlreadyHasPayment() {
        Order ready = order("ORD-0008", OrderStatus.READY);
        OrderStatusPatchRequest request = new OrderStatusPatchRequest("READY");
        when(orderService.updateStatus(ready.getId(), request)).thenReturn(ready);
        when(paymentService.findByOrderId(ready.getId())).thenReturn(Optional.of(
                new MockPayment(ready.getId(), PaymentMethod.CASH, 60000L, 10000L, 50000L)));

        V2OrderResponse response = controller.updateStatus(ready.getId(), request);

        assertThat(response.status()).isEqualTo(OrderStatus.READY);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().change()).isEqualTo(10000L);
    }

    @Test
    void controllerMapsPutAndPatchButNeverDelete() {
        List<Method> methods = Arrays.asList(OrderV2Controller.class.getDeclaredMethods());

        assertThat(methods).anyMatch(method -> method.isAnnotationPresent(PutMapping.class));
        assertThat(methods).anyMatch(method -> method.isAnnotationPresent(PatchMapping.class));
        // WHY: orders are financial records, so DELETE must stay unmapped and answer 405 METHOD_NOT_ALLOWED
        assertThat(methods).noneMatch(method -> method.isAnnotationPresent(DeleteMapping.class));
    }
}
```

**order-service: src/test/.../order/dto/V2OrderRequestValidationTest.java**

```java
package com.ambatucode.dikichi.order.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.dto.v2.V2OrderRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class V2OrderRequestValidationTest {

    private static final UUID MENU_MIE = UUID.fromString("11111111-0000-4000-8000-000000000001");
    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    private static V2OrderRequest request(V2OrderRequest.Customer customer, V2OrderRequest.Location location,
                                          List<OrderItemRequest> items) {
        return new V2OrderRequest(customer, location, items);
    }

    private static Set<String> invalidPaths(V2OrderRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    private static final List<OrderItemRequest> ONE_ITEM = List.of(new OrderItemRequest(MENU_MIE, 2));
    private static final V2OrderRequest.Location VALID_LOCATION = new V2OrderRequest.Location("OUT-01", "T-01");

    @Test
    void validNestedRequestHasNoViolations() {
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("Budi"), VALID_LOCATION, ONE_ITEM))).isEmpty();
    }

    @Test
    void flatV1StyleBodyIsRejectedBecauseCustomerAndLocationAreMissing() {
        assertThat(invalidPaths(request(null, null, ONE_ITEM))).containsExactlyInAnyOrder("customer", "location");
    }

    @Test
    void blankCustomerNameIsRejectedWithNestedPath() {
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("   "), VALID_LOCATION, ONE_ITEM)))
                .containsExactly("customer.name");
    }

    @Test
    void customerNameLongerThanFiftyCharactersIsRejected() {
        String longName = "a".repeat(51);
        assertThat(invalidPaths(request(new V2OrderRequest.Customer(longName), VALID_LOCATION, ONE_ITEM)))
                .containsExactly("customer.name");
    }

    @Test
    void malformedOutletAndTableCodesAreRejectedWithNestedPaths() {
        V2OrderRequest.Location bad = new V2OrderRequest.Location("OUTLET-1", "TABLE-1");
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("Budi"), bad, ONE_ITEM)))
                .containsExactlyInAnyOrder("location.outletId", "location.tableCode");
    }

    @Test
    void emptyItemListIsRejected() {
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("Budi"), VALID_LOCATION, List.of())))
                .containsExactly("items");
    }

    @Test
    void invalidQuantityInsideItemsIsReported() {
        List<OrderItemRequest> items = List.of(new OrderItemRequest(MENU_MIE, 0));
        assertThat(invalidPaths(request(new V2OrderRequest.Customer("Budi"), VALID_LOCATION, items)))
                .anyMatch(path -> path.startsWith("items[0]") && path.endsWith("quantity"));
    }
}
```

**order-service: src/test/.../order/mapper/OrderV2MapperTest.java**

```java
package com.ambatucode.dikichi.order.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.dto.v2.PaymentStatus;
import com.ambatucode.dikichi.order.dto.v2.V2OrderRequest;
import com.ambatucode.dikichi.order.dto.v2.V2OrderResponse;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.PaymentMethod;
import com.ambatucode.dikichi.order.service.CreateOrderCommand;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OrderV2MapperTest {

    private static final UUID MENU_MIE = UUID.fromString("11111111-0000-4000-8000-000000000001");

    private static Order order() {
        Order order = new Order("ORD-0042", "OUT-01", "T-01", "Budi");
        order.addItem(new OrderItem(MENU_MIE, "Mie Suit", 25000, 2));
        return order;
    }

    @Test
    void requestIsFlattenedIntoTheSharedCreateCommand() {
        V2OrderRequest request = new V2OrderRequest(new V2OrderRequest.Customer("  Budi  "),
                new V2OrderRequest.Location("OUT-01", "T-01"), List.of(new OrderItemRequest(MENU_MIE, 2)));

        CreateOrderCommand command = OrderV2Mapper.toCommand(request);

        assertThat(command.outletId()).isEqualTo("OUT-01");
        assertThat(command.tableCode()).isEqualTo("T-01");
        assertThat(command.customerName()).isEqualTo("Budi");
        assertThat(command.items()).hasSize(1);
    }

    @Test
    void unpaidOrderHasUnpaidSummaryWithNullPaymentFields() {
        V2OrderResponse response = OrderV2Mapper.toResponse(order(), null);

        assertThat(response.orderNumber()).isEqualTo("ORD-0042");
        assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.customer().name()).isEqualTo("Budi");
        assertThat(response.location().outletId()).isEqualTo("OUT-01");
        assertThat(response.location().tableCode()).isEqualTo("T-01");
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).subtotal()).isEqualTo(50000L);
        assertThat(response.paymentSummary().totalAmount()).isEqualTo(50000L);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        assertThat(response.paymentSummary().paymentMethod()).isNull();
        assertThat(response.paymentSummary().amountTendered()).isNull();
        assertThat(response.paymentSummary().change()).isNull();
    }

    @Test
    void cashPaymentExposesMethodTenderedAndChange() {
        Order order = order();
        MockPayment payment = new MockPayment(UUID.randomUUID(), PaymentMethod.CASH, 60000L, 10000L, 50000L);

        V2OrderResponse response = OrderV2Mapper.toResponse(order, payment);

        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().paymentMethod()).isEqualTo(PaymentMethod.CASH);
        assertThat(response.paymentSummary().amountTendered()).isEqualTo(60000L);
        assertThat(response.paymentSummary().change()).isEqualTo(10000L);
    }

    @Test
    void nonCashPaymentKeepsTenderedAndChangeNull() {
        MockPayment payment = new MockPayment(UUID.randomUUID(), PaymentMethod.QRIS, null, null, 50000L);

        V2OrderResponse response = OrderV2Mapper.toResponse(order(), payment);

        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().paymentMethod()).isEqualTo(PaymentMethod.QRIS);
        assertThat(response.paymentSummary().amountTendered()).isNull();
        assertThat(response.paymentSummary().change()).isNull();
    }
}
```

### 12.3.2 Uji API dengan Newman

Kedua koleksi tersimpan pada berkas **dikichi-v2-get-post.postman_collection.json** (37 request) dan **dikichi-v2-put-patch-delete.postman_collection.json** (55 request). Berikut empat request representatif beserta skrip asersinya.

**Request (GP): POST pesanan v2 oleh tamu tanpa token**

```json
{
  "name": "POST pesanan v2 oleh tamu tanpa token",
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
          "pm.test(\"Header Location menunjuk pesanan v2\", () => pm.expect(pm.response.headers.get(\"Location\")).to.eql(\"/api/v2/orders/\" + j.id));",
          "pm.test(\"ID UUID dan nomor ORD-\", () => { pm.expect(j.id).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/); pm.expect(j.orderNumber).to.match(/^ORD-\\d{4,}$/); });",
          "pm.test(\"Status awal PENDING\", () => pm.expect(j.status).to.eql(\"PENDING\"));",
          "pm.test(\"Data pelanggan dan lokasi bersarang\", () => { pm.expect(j.customer.name).to.eql(\"Budi\"); pm.expect(j.location.outletId).to.eql(\"OUT-01\"); pm.expect(j.location.tableCode).to.eql(\"T-01\"); });",
          "pm.test(\"Medan datar v1 tidak ada\", () => { [\"customerName\",\"outletId\",\"tableCode\",\"totalAmount\"].forEach(k => pm.expect(j).to.not.have.property(k)); });",
          "pm.test(\"Snapshot item dan subtotal\", () => { pm.expect(j.items).to.have.lengthOf(1); const i = j.items[0]; pm.expect(i.quantity).to.eql(2); pm.expect(i.subtotal).to.eql(i.unitPrice * i.quantity); });",
          "pm.test(\"paymentSummary UNPAID dengan medan pembayaran null\", () => { const p = j.paymentSummary; pm.expect(p.paymentStatus).to.eql(\"UNPAID\"); pm.expect(p.totalAmount).to.eql(j.items.reduce((s, i) => s + i.subtotal, 0)); pm.expect(p.paymentMethod).to.eql(null); pm.expect(p.amountTendered).to.eql(null); pm.expect(p.change).to.eql(null); });",
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
    "url": "{{baseUrl}}/api/v2/orders",
    "body": {
      "mode": "raw",
      "raw": "{\"customer\": {\"name\": \"Budi\"}, \"location\": {\"outletId\": \"OUT-01\", \"tableCode\": \"T-01\"}, \"items\": [{\"menuItemId\": \"{{mieSuitId}}\", \"quantity\": 2}]}"
    }
  }
}
```

**Request (GP): POST pay v2 CASH dengan uang cukup**

```json
{
  "name": "POST pay v2 CASH dengan uang cukup",
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
          "pm.test(\"Kontrak v2 bersarang\", () => { pm.expect(j.customer).to.have.property(\"name\"); pm.expect(j.location).to.have.all.keys(\"outletId\", \"tableCode\"); pm.expect(j.paymentSummary).to.have.all.keys(\"totalAmount\", \"paymentStatus\", \"paymentMethod\", \"amountTendered\", \"change\"); });",
          "pm.test(\"Medan datar v1 tidak ada\", () => { [\"customerName\",\"outletId\",\"tableCode\",\"totalAmount\"].forEach(k => pm.expect(j).to.not.have.property(k)); });",
          "pm.test(\"Pesanan berpindah ke PREPARING\", () => pm.expect(j.status).to.eql(\"PREPARING\"));",
          "pm.test(\"paymentSummary PAID tunai lengkap\", () => { const p = j.paymentSummary; const total = j.items.reduce((s, i) => s + i.subtotal, 0); pm.expect(p.paymentStatus).to.eql(\"PAID\"); pm.expect(p.paymentMethod).to.eql(\"CASH\"); pm.expect(p.totalAmount).to.eql(total); pm.expect(p.amountTendered).to.eql(1000000); pm.expect(p.change).to.eql(1000000 - total); });"
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
    "url": "{{baseUrl}}/api/v2/orders/{{orderId}}/pay",
    "body": {
      "mode": "raw",
      "raw": "{\"paymentMethod\": \"CASH\", \"amountTendered\": 1000000}"
    }
  }
}
```

**Request (PPD): PUT pesanan v2 PENDING oleh CASHIER**

```json
{
  "name": "PUT pesanan v2 PENDING oleh CASHIER",
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
          "pm.test(\"Status pesanan PENDING\", () => pm.expect(j.status).to.eql(\"PENDING\"));",
          "pm.test(\"Kontrak v2 bersarang\", () => { pm.expect(j.customer).to.be.an(\"object\"); pm.expect(j.location).to.be.an(\"object\"); pm.expect(j.paymentSummary).to.be.an(\"object\"); });",
          "pm.test(\"Meja dan nama pelanggan diperbarui dan dipangkas\", () => { pm.expect(j.location.tableCode).to.eql(\"T-05\"); pm.expect(j.customer.name).to.eql(\"Budi Santoso\"); pm.expect(j.location.outletId).to.eql(\"OUT-01\"); });",
          "pm.test(\"Daftar item dan total dihitung ulang menjadi 37000\", () => { pm.expect(j.items).to.have.lengthOf(2); pm.expect(j.paymentSummary.totalAmount).to.eql(37000); });",
          "pm.test(\"paymentSummary UNPAID dengan medan pembayaran null\", () => { const p = j.paymentSummary; pm.expect(p.paymentStatus).to.eql(\"UNPAID\"); pm.expect(p.paymentMethod).to.eql(null); pm.expect(p.amountTendered).to.eql(null); pm.expect(p.change).to.eql(null); });",
          "pm.test(\"Medan datar v1 tidak ada\", () => { [\"customerName\",\"outletId\",\"tableCode\",\"totalAmount\"].forEach(k => pm.expect(j).to.not.have.property(k)); });"
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
    "url": "{{baseUrl}}/api/v2/orders/{{orderId}}",
    "body": {
      "mode": "raw",
      "raw": "{\n  \"customer\": {\"name\": \"  Budi Santoso  \"},\n  \"location\": {\"outletId\": \"OUT-01\", \"tableCode\": \"T-05\"},\n  \"items\": [\n    {\"menuItemId\": \"{{mieSuitId}}\", \"quantity\": 1},\n    {\"menuItemId\": \"{{esTehId}}\", \"quantity\": 2}\n  ]\n}"
    }
  }
}
```

**Request (PPD): DELETE pesanan v2 oleh CASHIER**

```json
{
  "name": "DELETE pesanan v2 oleh CASHIER",
  "event": [
    {
      "listen": "test",
      "script": {
        "type": "text/javascript",
        "exec": [
          "pm.test(\"Status 405\", () => pm.response.to.have.status(405));",
          "pm.test(\"Format kesalahan seragam\", () => { const j = pm.response.json(); pm.expect(j).to.have.all.keys(\"timestamp\", \"status\", \"code\", \"message\", \"path\", \"errors\"); pm.expect(j.errors).to.be.an(\"array\"); pm.expect(j.status).to.eql(405); pm.expect(j.path).to.be.a(\"string\"); });",
          "pm.test(\"Kode kesalahan METHOD_NOT_ALLOWED\", () => pm.expect(pm.response.json().code).to.eql(\"METHOD_NOT_ALLOWED\"));",
          "pm.test(\"Waktu respons di bawah 2000 ms\", () => pm.expect(pm.response.responseTime).to.be.below(2000));"
        ]
      }
    }
  ],
  "request": {
    "method": "DELETE",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{cashierToken}}"
      }
    ],
    "url": "{{baseUrl}}/api/v2/orders/{{orderId}}"
  }
}
```

**tests/api/run-newman.ps1**

```powershell
param(
    [string]$BaseUrl = "http://host.docker.internal:8080",
    [string]$Collection = "dikichi-v1-get-post.postman_collection.json"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

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

## 12.4 Cara Menjalankan Pengujian

Uji unit tidak membutuhkan sistem yang menyala. Uji API membutuhkan seluruh kontainer berstatus *healthy*. Urutan berikut adalah perintah yang dijalankan pada pengujian ini, dimulai dari basis data yang bersih.

```powershell
cd Backend
docker compose --env-file ../.env down -v
docker compose --env-file ../.env up -d --build catalog-db order-db catalog-service order-service gateway-service
docker compose --env-file ../.env ps --format "table {{.Name}}\t{{.Service}}\t{{.Status}}\t{{.Ports}}"

cd tests/api
./run-newman.ps1 -Collection dikichi-v2-get-post.postman_collection.json | Tee-Object -FilePath newman-v2-get-post.txt
./run-newman.ps1 -Collection dikichi-v2-put-patch-delete.postman_collection.json | Tee-Object -FilePath newman-v2-put-patch-delete.txt

cd ../../order-service
docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test 2>&1 | Select-String "Tests run:|BUILD"
```

Perintah **down -v** menghapus volume basis data sehingga data seed dibuat ulang dan hasil pengujian dapat diulang. Skrip **run-newman.ps1** membaca kata sandi akun seed dari berkas **.env** dan meneruskannya ke Newman sebagai variabel lingkungan, sehingga tidak ada kata sandi yang tersimpan pada koleksi. Keluaran lengkap kedua koleksi disimpan pada folder **Backend/tests/api/hasil** di arsip kode sumber.

## 12.5 Hasil Pengujian

### 12.5.1 Hasil Uji Unit

| Kelas Uji | Dijalankan | Gagal | Error | Waktu (detik) |
| :--- | :--- | :--- | :--- | :--- |
| order-service: OrderV2ControllerTest | 9 | 0 | 0 | 2,861 |
| order-service: V2OrderRequestValidationTest | 7 | 0 | 0 | 1,175 |
| order-service: OrderV2MapperTest | 4 | 0 | 0 | 0,008 |
| order-service: OrderServiceTest | 32 | 0 | 0 | 0,628 |
| order-service: OrderStateMachineTest | 4 | 0 | 0 | 0,011 |
| order-service: PaymentServiceLookupTest | 3 | 0 | 0 | 0,069 |
| order-service: PaymentServiceTest | 11 | 0 | 0 | 0,020 |
| Total order-service | 70 | 0 | 0 | BUILD SUCCESS |

Seluruh 70 uji unit lulus pada eksekusi bukti (Gambar 12.4), tanpa kegagalan, galat, maupun uji yang dilewati. Uji unit **catalog-service** tidak dijalankan ulang pada iterasi ini karena layanan tersebut tidak berubah sejak pengujian pada Bab 6 dan Bab 7.

### 12.5.2 Hasil Uji API GET dan POST (Newman)

| Ukuran | Dijalankan | Gagal |
| :--- | :--- | :--- |
| Iterasi | 1 | 0 |
| Request | 37 | 0 |
| Skrip uji (test-scripts) | 37 | 0 |
| Skrip prarequest | 0 | 0 |
| Asersi | 167 | 0 |

Total durasi eksekusi 2,8 detik. Rata-rata waktu respons 60 ms dengan minimum 6 ms, maksimum 678 ms, dan simpangan baku 129 ms (Gambar 12.2). Seluruh respons berada di bawah ambang 2000 ms yang ditetapkan pada asersi.

| Kelompok | Request | Asersi | Gagal | Hasil |
| :--- | :--- | :--- | :--- | :--- |
| 00 Autentikasi (POST /api/v1/auth/login) | 3 | 12 | 0 | Lulus |
| 01 Order v2 POST (POST /api/v2/orders) | 13 | 63 | 0 | Lulus |
| 02 Order v2 GET | 10 | 45 | 0 | Lulus |
| 03 Pembayaran v2 (POST /api/v2/orders/{id}/pay) | 11 | 47 | 0 | Lulus |
| Total | 37 | 167 | 0 | Lulus |

### 12.5.3 Hasil Uji API PUT, PATCH, dan DELETE (Newman)

| Ukuran | Dijalankan | Gagal |
| :--- | :--- | :--- |
| Iterasi | 1 | 0 |
| Request | 55 | 0 |
| Skrip uji (test-scripts) | 55 | 0 |
| Skrip prarequest | 0 | 0 |
| Asersi | 250 | 0 |

Total durasi eksekusi 2 detik. Rata-rata waktu respons 21 ms dengan minimum 7 ms, maksimum 116 ms, dan simpangan baku 17 ms (Gambar 12.3). Seluruh respons berada di bawah ambang 2000 ms.

| Kelompok | Request | Asersi | Gagal | Hasil |
| :--- | :--- | :--- | :--- | :--- |
| 00 Prasyarat Autentikasi dan Data Uji | 4 | 17 | 0 | Lulus |
| 01 Order v2 PUT (PUT /api/v2/orders/{id}) | 18 | 80 | 0 | Lulus |
| 02 Order v2 PATCH (PATCH /api/v2/orders/{id}/status) | 26 | 123 | 0 | Lulus |
| 03 Order v2 DELETE (DELETE /api/v2/orders/{id}) | 7 | 30 | 0 | Lulus |
| Total | 55 | 250 | 0 | Lulus |

### 12.5.4 Rincian Hasil per Request

Tabel berikut memuat status HTTP aktual, waktu respons, dan jumlah asersi yang lulus untuk setiap request, disalin dari keluaran Newman. Nomor urut dihitung per koleksi dan dipakai pada tabel keterlacakan (subbab 12.2.3). Seluruh asersi pada seluruh request lulus.

**Koleksi GET dan POST: 00 Autentikasi (POST /api/v1/auth/login)**

| No | Request | Status | Waktu (ms) | Asersi |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Login MASTER | 200 | 678 | 4 |
| 2 | Login CASHIER | 200 | 80 | 4 |
| 3 | Login KITCHEN | 200 | 71 | 4 |

**Koleksi GET dan POST: 01 Order v2 POST (POST /api/v2/orders)**

| No | Request | Status | Waktu (ms) | Asersi |
| :--- | :--- | :--- | :--- | :--- |
| 4 | POST pesanan v2 oleh tamu tanpa token | 201 | 387 | 10 |
| 5 | POST pesanan dengan body datar v1 | 400 | 46 | 5 |
| 6 | POST pesanan dengan nama pelanggan kosong | 400 | 19 | 5 |
| 7 | POST pesanan dengan format outlet salah | 400 | 20 | 5 |
| 8 | POST pesanan dengan format meja salah | 400 | 17 | 5 |
| 9 | POST pesanan tanpa item | 400 | 21 | 4 |
| 10 | POST pesanan dengan jumlah 100 | 400 | 18 | 4 |
| 11 | POST pesanan dengan item ganda | 400 | 16 | 4 |
| 12 | POST pesanan dengan JSON rusak | 400 | 15 | 4 |
| 13 | POST pesanan berisi item sold out | 409 | 41 | 5 |
| 14 | POST pesanan dengan meja yang tidak ada | 422 | 28 | 4 |
| 15 | POST pesanan dengan outlet yang tidak ada | 422 | 23 | 4 |
| 16 | POST pesanan dengan item yang tidak ada | 422 | 24 | 4 |

**Koleksi GET dan POST: 02 Order v2 GET**

| No | Request | Status | Waktu (ms) | Asersi |
| :--- | :--- | :--- | :--- | :--- |
| 17 | GET daftar pesanan v2 tanpa token | 401 | 15 | 4 |
| 18 | GET daftar pesanan v2 oleh CASHIER | 200 | 351 | 7 |
| 19 | GET pesanan v2 berstatus PREPARING oleh CASHIER | 403 | 20 | 4 |
| 20 | GET pesanan v2 dengan status tidak dikenal | 400 | 18 | 4 |
| 21 | GET pesanan v2 outlet lain oleh CASHIER | 403 | 19 | 4 |
| 22 | GET daftar pesanan v2 oleh MASTER | 403 | 14 | 4 |
| 23 | GET pesanan v2 berdasarkan ID | 200 | 28 | 6 |
| 24 | GET pesanan v2 yang tidak ada | 404 | 23 | 4 |
| 25 | GET pesanan v2 dengan ID bukan UUID | 400 | 14 | 4 |
| 26 | GET pesanan buatan v2 dibaca lewat v1 (datar) | 200 | 23 | 4 |

**Koleksi GET dan POST: 03 Pembayaran v2 (POST /api/v2/orders/{id}/pay)**

| No | Request | Status | Waktu (ms) | Asersi |
| :--- | :--- | :--- | :--- | :--- |
| 27 | Prasyarat: CASHIER menerima pesanan (PATCH v1 status) | 200 | 32 | 4 |
| 28 | POST pay v2 tanpa token | 401 | 6 | 4 |
| 29 | POST pay v2 oleh KITCHEN | 403 | 21 | 4 |
| 30 | POST pay v2 CASH dengan uang kurang | 400 | 18 | 4 |
| 31 | POST pay v2 CARD dengan amountTendered | 400 | 19 | 4 |
| 32 | POST pay v2 dengan metode tidak dikenal | 400 | 15 | 4 |
| 33 | POST pay v2 CASH dengan uang cukup | 200 | 33 | 7 |
| 34 | POST pay v2 untuk kedua kalinya | 409 | 19 | 4 |
| 35 | POST pay v2 pada pesanan yang tidak ada | 404 | 19 | 4 |
| 36 | GET pesanan v2 setelah dibayar memuat paymentSummary PAID | 200 | 21 | 4 |
| 37 | GET antrean PREPARING v2 oleh KITCHEN | 200 | 20 | 4 |

**Koleksi PUT, PATCH, dan DELETE: 00 Prasyarat Autentikasi dan Data Uji**

| No | Request | Status | Waktu (ms) | Asersi |
| :--- | :--- | :--- | :--- | :--- |
| 1 | POST Login MASTER | 200 | 116 | 4 |
| 2 | POST Login CASHIER | 200 | 72 | 4 |
| 3 | POST Login KITCHEN | 200 | 70 | 4 |
| 4 | POST Prasyarat: buat pesanan awal PENDING oleh tamu (v2) | 201 | 36 | 5 |

**Koleksi PUT, PATCH, dan DELETE: 01 Order v2 PUT (PUT /api/v2/orders/{id})**

| No | Request | Status | Waktu (ms) | Asersi |
| :--- | :--- | :--- | :--- | :--- |
| 5 | PUT pesanan v2 tanpa token | 401 | 9 | 4 |
| 6 | PUT pesanan v2 oleh KITCHEN | 403 | 16 | 4 |
| 7 | PUT pesanan v2 oleh MASTER | 403 | 14 | 4 |
| 8 | PUT pesanan v2 dengan ID bukan UUID | 400 | 14 | 4 |
| 9 | PUT pesanan v2 yang tidak ada | 404 | 45 | 4 |
| 10 | PUT pesanan v2 dengan body datar gaya v1 | 400 | 15 | 4 |
| 11 | PUT pesanan v2 dengan nama pelanggan kosong | 400 | 15 | 4 |
| 12 | PUT pesanan v2 mencoba mengubah outletId | 400 | 19 | 4 |
| 13 | PUT pesanan v2 dengan item ganda | 400 | 19 | 4 |
| 14 | PUT pesanan v2 tanpa daftar item | 400 | 14 | 4 |
| 15 | PUT pesanan v2 dengan jumlah item 100 | 400 | 16 | 4 |
| 16 | PUT pesanan v2 dengan JSON rusak | 400 | 16 | 4 |
| 17 | PUT pesanan v2 dengan kode meja yang tidak ada | 422 | 27 | 4 |
| 18 | PUT pesanan v2 dengan item yang tidak ada | 422 | 28 | 4 |
| 19 | PUT pesanan v2 berisi item sold out | 409 | 27 | 4 |
| 20 | PUT pesanan v2 PENDING oleh CASHIER | 200 | 49 | 10 |
| 21 | GET pesanan v2 memastikan perubahan PUT tersimpan | 200 | 19 | 5 |
| 22 | GET pesanan hasil PUT v2 dibaca lewat v1 (datar) | 200 | 17 | 5 |

**Koleksi PUT, PATCH, dan DELETE: 02 Order v2 PATCH (PATCH /api/v2/orders/{id}/status)**

| No | Request | Status | Waktu (ms) | Asersi |
| :--- | :--- | :--- | :--- | :--- |
| 23 | PATCH status v2 tanpa token | 401 | 7 | 4 |
| 24 | PATCH status v2 oleh MASTER | 403 | 14 | 4 |
| 25 | PATCH status v2 dengan body kosong | 400 | 14 | 5 |
| 26 | PATCH status v2 dengan nilai status tidak dikenal | 400 | 14 | 5 |
| 27 | PATCH status v2 dengan JSON rusak | 400 | 14 | 4 |
| 28 | PATCH status v2 pada pesanan yang tidak ada | 404 | 17 | 4 |
| 29 | PATCH status v2 pada ID bukan UUID | 400 | 12 | 4 |
| 30 | PATCH status v2 ke PENDING | 409 | 16 | 4 |
| 31 | PATCH status v2 ke PREPARING | 409 | 17 | 4 |
| 32 | PATCH status v2 ke CANCELLED oleh KITCHEN | 403 | 17 | 4 |
| 33 | PATCH status v2 ke READY oleh CASHIER | 403 | 16 | 4 |
| 34 | PATCH status v2 dari PENDING langsung ke READY oleh KITCHEN | 409 | 16 | 4 |
| 35 | PATCH status v2 dari PENDING ke ACCEPTED oleh CASHIER | 200 | 21 | 9 |
| 36 | PATCH status v2 dari ACCEPTED ke ACCEPTED lagi | 409 | 15 | 4 |
| 37 | PUT pesanan v2 yang sudah berstatus ACCEPTED | 409 | 15 | 4 |
| 38 | POST Prasyarat: bayar pesanan v2 agar berpindah ke PREPARING | 200 | 23 | 5 |
| 39 | PATCH status v2 dari PREPARING ke CANCELLED oleh CASHIER | 409 | 16 | 4 |
| 40 | PATCH status v2 dari PREPARING langsung ke COMPLETED oleh KITCHEN | 409 | 16 | 4 |
| 41 | PATCH status v2 dari PREPARING ke READY oleh KITCHEN | 200 | 21 | 8 |
| 42 | PATCH status v2 dari READY ke COMPLETED oleh KITCHEN | 200 | 20 | 6 |
| 43 | PATCH status v2 dari COMPLETED ke READY oleh KITCHEN | 409 | 15 | 4 |
| 44 | POST Prasyarat: buat pesanan kedua v2 untuk uji pembatalan | 201 | 27 | 4 |
| 45 | PATCH status v2 dari PENDING ke CANCELLED oleh CASHIER | 200 | 20 | 7 |
| 46 | PATCH status v2 dari CANCELLED ke ACCEPTED oleh CASHIER | 409 | 15 | 4 |
| 47 | GET pesanan yang dibatalkan v2 tetap tersimpan | 200 | 16 | 5 |
| 48 | GET pesanan hasil PATCH v2 dibaca lewat v1 (datar) | 200 | 15 | 5 |

**Koleksi PUT, PATCH, dan DELETE: 03 Order v2 DELETE (DELETE /api/v2/orders/{id})**

| No | Request | Status | Waktu (ms) | Asersi |
| :--- | :--- | :--- | :--- | :--- |
| 49 | DELETE pesanan v2 tanpa token | 401 | 7 | 4 |
| 50 | DELETE pesanan v2 oleh CASHIER | 405 | 13 | 4 |
| 51 | DELETE pesanan v2 oleh KITCHEN | 405 | 11 | 4 |
| 52 | DELETE pesanan v2 oleh MASTER | 405 | 11 | 4 |
| 53 | DELETE pesanan v2 yang tidak ada | 405 | 12 | 4 |
| 54 | DELETE status pesanan v2 (sub-resource status) | 405 | 11 | 4 |
| 55 | GET pesanan v2 tetap ada setelah percobaan DELETE | 200 | 16 | 6 |

### 12.5.5 Bukti Tangkapan Layar

Seluruh tangkapan layar berikut diambil pada eksekusi yang sama, yaitu setelah sistem dijalankan dengan basis data bersih.

**Gambar 12.1** Status kelima kontainer pada docker compose ps (berkas gambar pada folder Backend/tests/api/hasil)

**Gambar 12.2** Ringkasan hasil uji API v2 (GET dan POST) dengan Newman (berkas gambar pada folder Backend/tests/api/hasil)

**Gambar 12.3** Ringkasan hasil uji API v2 (PUT, PATCH, dan DELETE) dengan Newman (berkas gambar pada folder Backend/tests/api/hasil)

**Gambar 12.4** Hasil uji unit order-service (berkas gambar pada folder Backend/tests/api/hasil)

## 12.6 Analisis Hasil

- **Kesesuaian dengan spesifikasi:** seluruh status dan kode kesalahan aktual sama dengan yang dirancang pada Bab 9, termasuk urutan kesalahan 401 (tanpa token), 403 (role), 404, 409, dan 422.

- **Kontrak v2 dan kompatibilitas v1:** respons v2 berbentuk bersarang dengan **paymentSummary** (UNPAID sebelum dibayar dan PAID sesudahnya), sedangkan pesanan yang sama tetap terbaca datar melalui **/api/v1** setelah dibuat, diganti (PUT), dan diubah statusnya (PATCH) melalui v2 (GP 26, PPD 22 dan 48).

- **Mesin status:** seluruh transisi terlarang dijawab 409 INVALID_STATUS_TRANSITION, kepemilikan status per role dijawab 403, dan pesanan yang sudah ACCEPTED tidak dapat diganti (409 ORDER_NOT_EDITABLE).

- **DELETE:** pemanggilan DELETE pada pesanan dijawab 405 METHOD_NOT_ALLOWED untuk ketiga role, dan pesanan terbukti tidak berubah setelah percobaan tersebut (PPD 55).

- **Keamanan rute:** PUT, PATCH, dan DELETE tanpa token ditolak 401, sedangkan hanya POST pada /api/v2/orders yang bersifat publik.

- **Waktu respons:** request pertama pada jalur yang belum pernah dilewati memakan waktu paling lama, yaitu login pertama (678 ms pada koleksi GET dan POST, 116 ms pada koleksi PUT, PATCH, dan DELETE), sedangkan rata-rata seluruh request hanya 60 ms dan 21 ms. Pola ini sesuai dengan pemanasan JVM dan koneksi basis data pada pemanggilan pertama, dan seluruhnya jauh di bawah ambang 2000 ms.

- **Temuan cacat:** tidak ada ketidaksesuaian perilaku API yang ditemukan oleh uji unit maupun uji API pada eksekusi bukti. Keluaran uji unit memuat peringatan dari Mockito tentang mekanisme *self-attaching* yang akan dihentikan pada rilis JDK mendatang. Peringatan ini tidak memengaruhi hasil dan dapat diatasi kelak dengan menambahkan Mockito sebagai agen pada konfigurasi build.

## 12.7 Keterbatasan Pengujian

- Uji unit memakai mock untuk repository, sehingga batasan basis data dan *optimistic locking* tidak diuji pada lapisan ini. Aspek tersebut tercakup sebagian oleh uji API terhadap PostgreSQL asli, tetapi skenario penulisan bersamaan (409 CONCURRENT_MODIFICATION) belum diuji secara eksplisit.

- Uji API berjalan sebagai satu alur berurutan pada satu pengguna. Pengujian beban, konkurensi, dan ketahanan ketika catalog-service tidak tersedia (503) belum dilakukan.

- Uji unit catalog-service dan skrip *smoke test* tidak dijalankan ulang pada iterasi ini karena tidak ada perubahan pada layanan tersebut. Hasilnya tercatat pada Bab 4 sampai Bab 7.

- Data hasil uji API (pesanan uji) tetap tersimpan di basis data. Untuk kondisi bersih, sistem dijalankan ulang dengan menghapus volume basis data.
