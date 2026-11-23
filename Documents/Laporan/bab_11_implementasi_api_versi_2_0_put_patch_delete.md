# BAB 11. IMPLEMENTASI API VERSI 2.0 (PUT, PATCH & DELETE)

Bab ini memuat implementasi **API versi 2.0 (/api/v2)** untuk operasi **PUT**, **PATCH**, dan **DELETE** pada resource **Order**, sebagaimana dispesifikasikan pada Bab 9 dan dijelaskan alasan transisinya pada Bab 8. Bab ini melengkapi Bab 10 yang telah memuat operasi **GET** dan **POST**. Pembahasan mencakup properti *build*, konfigurasi *deployment*, dan kode sumber utama yang berkaitan langsung dengan ketiga metode tersebut.

## 11.1 Gambaran Implementasi

### 11.1.1 Cakupan Endpoint

Sesuai Keputusan D4, kontrak baru hanya berlaku pada resource Order. Implementasi PUT, PATCH, dan DELETE v2 karena itu terbatas pada tiga operasi berikut, dengan kolom Metode Controller merujuk ke kelas **OrderV2Controller**. Pesanan tidak memiliki operasi **DELETE** pada v2 karena pesanan adalah data transaksi yang wajib dapat diaudit. Pembatalan pesanan dilakukan dengan **PATCH** status **CANCELLED**, dan pemanggilan **DELETE** dijawab **405 METHOD_NOT_ALLOWED**.

| Method | Path Endpoint | Akses | Metode Controller | Service |
| :--- | :--- | :--- | :--- | :--- |
| PUT | /api/v2/orders/{orderId} | CASHIER | replace | OrderService.replace |
| PATCH | /api/v2/orders/{orderId}/status | CASHIER, KITCHEN | updateStatus | OrderService.updateStatus, PaymentService.findByOrderId |
| DELETE | /api/v2/orders/{orderId} | Tidak tersedia | Tidak dipetakan | GlobalExceptionHandler (handleMethodNotSupported) menjawab 405 |

Operasi PUT, PATCH, dan DELETE untuk outlet, meja, dan item menu tidak berubah dan tetap berada di **/api/v1** (Bab 5). Seperti pada Bab 10, aturan bisnis tidak ditulis ulang. Kedua operasi memakai **OrderService** yang sama dengan v1, sedangkan perbedaan terletak pada bentuk *request* dan *response*.

### 11.1.2 Perubahan terhadap Kode Bab 5 dan Bab 10

Implementasi hanya menambah pemetaan pada sisi pengendali. Tidak ada migrasi basis data karena tabel **orders**, **order_item**, dan **mock_payment** dipakai bersama oleh v1 dan v2.

| Layanan | Berkas | Jenis | Perubahan |
| :--- | :--- | :--- | :--- |
| order-service | controller/v2/OrderV2Controller | Ubah | Pemetaan PUT /{orderId} dan PATCH /{orderId}/status ditambahkan. DELETE sengaja tidak dipetakan |
| order-service | test/.../controller/OrderV2ControllerTest | Ubah | Empat uji baru untuk PUT, PATCH, dan ketiadaan DELETE |
| Backend/tests/api | dikichi-v2-put-patch-delete.postman_collection.json | Baru | Koleksi uji API v2 untuk PUT, PATCH, dan DELETE (55 permintaan) |
| order-service | OrderService, OrderStateMachine, PaymentService, OrderV2Mapper | Tetap | Dipakai bersama v1 dan v2 tanpa perubahan |
| gateway-service | config/GatewayRoutes, config/SecurityConfig | Tetap | Pola /api/v2/orders/** sudah mencakup seluruh metode HTTP |
| pom.xml, Dockerfile, Compose, Flyway | Seluruh berkas | Tetap | Tidak ada perubahan |

### 11.1.3 Pemetaan Aturan Bisnis ke Kode

| Aturan | Lokasi Implementasi |
| :--- | :--- |
| PUT hanya oleh CASHIER, MASTER dan KITCHEN dijawab 403 FORBIDDEN | OrderService.replace (caller.requireRole) |
| Pesanan outlet lain dijawab 403, outletId tidak dapat diubah (400 OUTLET_IMMUTABLE) | OrderService.requireOwnEditableOrder |
| Hanya pesanan PENDING yang dapat diganti (409 ORDER_NOT_EDITABLE), dicek ulang di dalam transaksi | OrderStateMachine.isEditable, OrderService.requireEditable |
| Item ganda ditolak sebelum katalog dipanggil (400 DUPLICATE_MENU_ITEM) | OrderService.rejectDuplicateItems |
| Item divalidasi ulang ke catalog-service, snapshot harga diperbarui, total dihitung ulang | OrderService.replace, CatalogClient, Order.replaceContents |
| Penggantian atomik: item lama dihapus dan di-flush sebelum item baru disimpan | OrderService.applyReplacement (TransactionTemplate) |
| Penulisan bersamaan dijawab 409 CONCURRENT_MODIFICATION | Order (@Version), GlobalExceptionHandler (handleConcurrentModification) |
| Respons PUT berbentuk v2 dengan paymentSummary UNPAID | OrderV2Controller.replace, OrderV2Mapper.toResponse |
| Urutan evaluasi PATCH: role, body, keberadaan pesanan, outlet, target terlarang, kepemilikan target, transisi | OrderService.updateStatus |
| Target PENDING dan PREPARING tidak pernah dapat di-PATCH (409 INVALID_STATUS_TRANSITION) | OrderStateMachine.isNeverPatchable |
| CASHIER hanya menetapkan ACCEPTED dan CANCELLED, KITCHEN hanya READY dan COMPLETED (403) | OrderStateMachine.roleOwns |
| Transisi yang diizinkan: PENDING ke ACCEPTED atau CANCELLED, ACCEPTED ke CANCELLED, PREPARING ke READY, READY ke COMPLETED | OrderStateMachine.allows |
| Respons PATCH memuat paymentSummary sesuai ada tidaknya baris mock_payment | OrderV2Controller.updateStatus, PaymentService.findByOrderId |
| DELETE pesanan dijawab 405 METHOD_NOT_ALLOWED, pembatalan memakai PATCH CANCELLED | OrderV2Controller (tanpa @DeleteMapping), GlobalExceptionHandler (handleMethodNotSupported) |
| PUT, PATCH, dan DELETE wajib JWT (401 UNAUTHORIZED tanpa token) | SecurityConfig.securityWebFilterChain (anyExchange().authenticated()) |

## 11.2 Build Properties

Implementasi PUT, PATCH, dan DELETE v2 tidak menambah dependensi Maven. Seluruh kebutuhan teknis sudah dipenuhi oleh dependensi pada Bab 4 dan Bab 10, sehingga **pom.xml** ketiga layanan dan **application.yml** tidak berubah.

| Kebutuhan Teknis | Dependensi yang Dipakai | Keterangan |
| :--- | :--- | :--- |
| Pemetaan @PutMapping dan @PatchMapping pada /api/v2/orders | spring-boot-starter-webmvc | Sudah ada |
| Validasi bersarang V2OrderRequest pada PUT (@Valid) | spring-boot-starter-validation | Sudah ada |
| Transaksi dan penguncian optimistik (@Version) pada penggantian pesanan | spring-boot-starter-data-jpa | Sudah ada, tanpa migrasi |
| Rute /api/v2/orders/** dan kewajiban JWT pada gateway | spring-cloud-starter-gateway-server-webflux, spring-boot-starter-oauth2-resource-server | Sudah ada, tanpa perubahan konfigurasi |
| Uji unit baru (JUnit 5, Mockito, AssertJ) | spring-boot-starter-test | Scope test, sudah ada |

Versi yang dipakai tidak berubah dari Bab 4: Java 21, Spring Boot 4.0.7, Spring Cloud 2025.1.2, PostgreSQL 16, dan Hibernate ORM dengan **ddl-auto: validate**.

## 11.3 Konfigurasi Deployment

| Berkas | Status | Alasan |
| :--- | :--- | :--- |
| Dockerfile (3 layanan) | Tetap | Proses build dan citra tidak bergantung pada versi API |
| docker-compose.yml | Tetap | Topologi, port, dan health check tidak berubah. Gateway tetap satu-satunya pintu masuk pada port 8080 |
| .env.example | Tetap | Tidak ada variabel lingkungan baru |
| GatewayRoutes | Tetap | Pola /api/v2/orders/** dari Bab 10 berlaku untuk semua metode HTTP, sehingga PUT, PATCH, dan DELETE diteruskan ke order-service |
| SecurityConfig | Tetap | Hanya POST pada /api/v2/orders yang publik. PUT, PATCH, dan DELETE jatuh pada aturan anyExchange().authenticated() |
| Migrasi Flyway | Tetap | Tidak ada perubahan skema basis data |

### 11.3.1 Memperbarui Layanan

Hanya **order-service** yang perlu dibangun ulang. **gateway-service** dan **catalog-service** tidak berubah. Uji unit dapat dijalankan terlebih dahulu sebelum citra dibangun.

**Perintah pembaruan layanan**

```bash
cd Backend/order-service
docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test
cd ..
docker compose --env-file ../.env up -d --build order-service
docker compose --env-file ../.env ps
```

## 11.4 Kode Sumber Utama PUT, PATCH, dan DELETE Versi 2.0

Bagian ini memuat berkas yang berkaitan langsung dengan operasi PUT, PATCH, dan DELETE pada API v2. DTO **V2OrderRequest** dan **V2OrderResponse** serta **OrderV2Mapper** dipakai ulang dari Bab 10. Arsip kode sumber memuat seluruh berkas.

### 11.4.1 gateway-service

Gateway tidak diubah. Cuplikan berikut menunjukkan aturan yang membuat PUT, PATCH, dan DELETE pada /api/v2/orders wajib membawa JWT, karena hanya POST pada path yang tepat yang dibuka untuk publik.

**gateway-service: config/SecurityConfig.java (cuplikan)**

```java
.authorizeExchange(exchanges -> exchanges
        // WHY: exact path for POST orders, so POST /orders/{id}/pay stays protected
        .pathMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/orders", "/api/v2/orders").permitAll()
        .pathMatchers(HttpMethod.GET, "/api/v1/outlets/**", "/api/v1/menu-items/**").permitAll()
        .pathMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
        .pathMatchers("/internal/**").permitAll()
        .anyExchange().authenticated())
```

### 11.4.2 order-service: Controller

**OrderV2Controller** menambahkan dua pemetaan. **replace** meratakan request bersarang menjadi **CreateOrderCommand** melalui **OrderV2Mapper.toCommand**, lalu mengembalikan respons v2 dengan paymentSummary UNPAID karena hanya pesanan PENDING yang dapat diganti. **updateStatus** meneruskan body status ke **OrderService** dan mencari pembayaran pesanan, sehingga pesanan berstatus READY atau COMPLETED menampilkan paymentSummary PAID. Tidak ada metode berlabel **@DeleteMapping**.

**order-service: controller/v2/OrderV2Controller.java**

```java
package com.ambatucode.dikichi.order.controller.v2;

import com.ambatucode.dikichi.order.dto.common.OrderStatusPatchRequest;
import com.ambatucode.dikichi.order.dto.common.PaymentRequest;
import com.ambatucode.dikichi.order.dto.v2.V2OrderRequest;
import com.ambatucode.dikichi.order.dto.v2.V2OrderResponse;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.mapper.OrderV2Mapper;
import com.ambatucode.dikichi.order.service.OrderService;
import com.ambatucode.dikichi.order.service.PaymentService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// WHY: the controller only maps v2 DTOs; business rules stay in OrderService and PaymentService, shared with v1.
// WHY: there is intentionally no @DeleteMapping. Orders are financial records, so DELETE /api/v2/orders/{id}
// is answered 405 METHOD_NOT_ALLOWED by GlobalExceptionHandler and cancellation uses PATCH status CANCELLED
@RestController
@RequestMapping("/api/v2/orders")
public class OrderV2Controller {

    private final OrderService orderService;
    private final PaymentService paymentService;

    public OrderV2Controller(OrderService orderService, PaymentService paymentService) {
        this.orderService = orderService;
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<V2OrderResponse> create(@Valid @RequestBody V2OrderRequest request) {
        Order order = orderService.create(OrderV2Mapper.toCommand(request));
        // WHY: a freshly created order cannot have a payment yet
        return ResponseEntity.created(URI.create("/api/v2/orders/" + order.getId()))
                .body(OrderV2Mapper.toResponse(order, null));
    }

    @GetMapping
    public List<V2OrderResponse> list(@RequestParam(required = false) String outletId,
                                      @RequestParam(required = false) OrderStatus status) {
        List<Order> orders = orderService.list(outletId, status);
        Map<UUID, MockPayment> paymentsByOrder =
                paymentService.findByOrderIds(orders.stream().map(Order::getId).toList());
        return orders.stream()
                .map(order -> OrderV2Mapper.toResponse(order, paymentsByOrder.get(order.getId())))
                .toList();
    }

    @GetMapping("/{orderId}")
    public V2OrderResponse get(@PathVariable UUID orderId) {
        Order order = orderService.get(orderId);
        return OrderV2Mapper.toResponse(order, paymentService.findByOrderId(order.getId()).orElse(null));
    }

    @PostMapping("/{orderId}/pay")
    public V2OrderResponse pay(@PathVariable UUID orderId, @Valid @RequestBody PaymentRequest request) {
        Order order = paymentService.pay(orderId, request);
        return OrderV2Mapper.toResponse(order, paymentService.findByOrderId(order.getId()).orElse(null));
    }

    @PutMapping("/{orderId}")
    public V2OrderResponse replace(@PathVariable UUID orderId, @Valid @RequestBody V2OrderRequest request) {
        Order order = orderService.replace(orderId, OrderV2Mapper.toCommand(request));
        // WHY: only PENDING orders can be replaced and a PENDING order cannot have a payment yet
        return OrderV2Mapper.toResponse(order, null);
    }

    @PatchMapping("/{orderId}/status")
    public V2OrderResponse updateStatus(@PathVariable UUID orderId, @RequestBody OrderStatusPatchRequest request) {
        Order order = orderService.updateStatus(orderId, request);
        // WHY: READY and COMPLETED orders are always paid while ACCEPTED and CANCELLED never are, so the payment is looked up
        return OrderV2Mapper.toResponse(order, paymentService.findByOrderId(order.getId()).orElse(null));
    }
}
```

### 11.4.3 order-service: Aturan Bisnis Bersama

**OrderService** dan **OrderStateMachine** dipakai bersama oleh v1 dan v2 dan tidak berubah. Metode **replace** dan **updateStatus** pada **OrderService** memuat urutan evaluasi yang dijelaskan pada Bab 9, sedangkan **OrderStateMachine** memuat tabel transisi dan kepemilikan status per role.

**order-service: service/OrderService.java**

```java
package com.ambatucode.dikichi.order.service;

import com.ambatucode.dikichi.order.config.CallerContext;
import com.ambatucode.dikichi.order.dto.catalog.CatalogValidateResponse.CatalogItem;
import com.ambatucode.dikichi.order.dto.common.ErrorDetail;
import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.dto.common.OrderStatusPatchRequest;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.Role;
import com.ambatucode.dikichi.order.exception.ApiException;
import com.ambatucode.dikichi.order.repository.OrderRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class OrderService {

    private static final String ORDER_NUMBER_PREFIX = "ORD-";

    private final OrderRepository orders;
    private final CatalogClient catalogClient;
    private final TransactionTemplate transactionTemplate;
    private final CallerContext caller;

    public OrderService(OrderRepository orders, CatalogClient catalogClient,
                        TransactionTemplate transactionTemplate, CallerContext caller) {
        this.orders = orders;
        this.catalogClient = catalogClient;
        this.transactionTemplate = transactionTemplate;
        this.caller = caller;
    }

    public Order create(CreateOrderCommand command) {
        rejectDuplicateItems(command.items());
        List<CatalogItem> catalogItems =
                catalogClient.validate(command.outletId(), command.tableCode(), command.items());
        // WHY: the catalog call stays outside the transaction so a slow catalog never holds a database connection
        return transactionTemplate.execute(status -> persist(command, catalogItems));
    }

    @Transactional(readOnly = true)
    public List<Order> list(String outletIdParam, OrderStatus statusParam) {
        caller.requireRole(Role.CASHIER, Role.KITCHEN);
        String outletId = outletIdParam == null ? caller.outletId() : outletIdParam;
        caller.requireSameOutlet(outletId);

        Set<OrderStatus> allowed = OrderStateMachine.queueFor(caller.role());
        Set<OrderStatus> statuses = allowed;
        if (statusParam != null) {
            if (!allowed.contains(statusParam)) {
                throw ApiException.forbidden("Role cannot list orders with this status");
            }
            statuses = Set.of(statusParam);
        }
        return orders.findByOutletIdAndStatusInOrderByCreatedAtAsc(outletId, statuses);
    }

    @Transactional(readOnly = true)
    public Order get(UUID orderId) {
        caller.requireRole(Role.CASHIER, Role.KITCHEN);
        Order order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        caller.requireSameOutlet(order.getOutletId());
        return order;
    }

    public Order replace(UUID orderId, CreateOrderCommand command) {
        caller.requireRole(Role.CASHIER);
        Order current = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        requireOwnEditableOrder(current, command.outletId());
        rejectDuplicateItems(command.items());
        List<CatalogItem> catalogItems =
                catalogClient.validate(command.outletId(), command.tableCode(), command.items());
        return transactionTemplate.execute(status -> applyReplacement(orderId, command, catalogItems));
    }

    @Transactional
    public Order updateStatus(UUID orderId, OrderStatusPatchRequest request) {
        caller.requireRole(Role.CASHIER, Role.KITCHEN);
        OrderStatus target = parseTargetStatus(request);
        Order order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        caller.requireSameOutlet(order.getOutletId());
        if (OrderStateMachine.isNeverPatchable(target)) {
            throw ApiException.conflict("INVALID_STATUS_TRANSITION", "Status cannot be set through this endpoint");
        }
        if (!OrderStateMachine.roleOwns(caller.role(), target)) {
            throw ApiException.forbidden("Role is not allowed to set this status");
        }
        if (!OrderStateMachine.allows(order.getStatus(), target)) {
            throw ApiException.conflict("INVALID_STATUS_TRANSITION",
                    "Transition from " + order.getStatus() + " to " + target + " is not allowed");
        }
        order.changeStatus(target);
        return orders.saveAndFlush(order);
    }

    private Order applyReplacement(UUID orderId, CreateOrderCommand command, List<CatalogItem> catalogItems) {
        Order order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        requireEditable(order);
        order.removeAllItems();
        // WHY: Hibernate runs inserts before orphan deletes, which would break ux_order_item_order_menu
        orders.flush();
        Map<UUID, CatalogItem> catalogById = catalogItems.stream()
                .collect(Collectors.toMap(CatalogItem::menuItemId, Function.identity()));
        List<OrderItem> newItems = command.items().stream()
                .map(line -> {
                    CatalogItem item = catalogById.get(line.menuItemId());
                    return new OrderItem(item.menuItemId(), item.name(), item.unitPrice(), line.quantity());
                })
                .toList();
        order.replaceContents(command.tableCode(), command.customerName(), newItems);
        return orders.saveAndFlush(order);
    }

    private void requireOwnEditableOrder(Order order, String requestedOutletId) {
        caller.requireSameOutlet(order.getOutletId());
        if (!order.getOutletId().equals(requestedOutletId)) {
            throw ApiException.badRequest("OUTLET_IMMUTABLE", "Order outlet cannot be changed",
                    List.of(new ErrorDetail("outletId", "Order outlet cannot be changed")));
        }
        requireEditable(order);
    }

    private static void requireEditable(Order order) {
        if (!OrderStateMachine.isEditable(order.getStatus())) {
            throw ApiException.conflict("ORDER_NOT_EDITABLE", "Only PENDING orders can be edited");
        }
    }

    private static OrderStatus parseTargetStatus(OrderStatusPatchRequest request) {
        String raw = request == null ? null : request.status();
        if (raw == null || raw.isBlank()) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request validation failed",
                    List.of(new ErrorDetail("status", "must not be blank")));
        }
        try {
            return OrderStatus.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request validation failed",
                    List.of(new ErrorDetail("status", "must be a valid order status")));
        }
    }

    private Order persist(CreateOrderCommand command, List<CatalogItem> catalogItems) {
        Map<UUID, CatalogItem> catalogById = catalogItems.stream()
                .collect(Collectors.toMap(CatalogItem::menuItemId, Function.identity()));

        Order order = new Order(formatOrderNumber(orders.nextOrderSequence()), command.outletId(),
                command.tableCode(), command.customerName());
        for (OrderItemRequest line : command.items()) {
            CatalogItem catalogItem = catalogById.get(line.menuItemId());
            order.addItem(new OrderItem(catalogItem.menuItemId(), catalogItem.name(), catalogItem.unitPrice(),
                    line.quantity()));
        }
        return orders.save(order);
    }

    private static void rejectDuplicateItems(List<OrderItemRequest> items) {
        Set<UUID> seen = new HashSet<>();
        List<ErrorDetail> duplicates = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            if (!seen.add(items.get(i).menuItemId())) {
                duplicates.add(new ErrorDetail("items[" + i + "].menuItemId", "Duplicate menu item"));
            }
        }
        if (!duplicates.isEmpty()) {
            throw ApiException.badRequest("DUPLICATE_MENU_ITEM", "The same menu item appears on two lines",
                    duplicates);
        }
    }

    private static String formatOrderNumber(long sequence) {
        return ORDER_NUMBER_PREFIX + String.format("%04d", sequence);
    }
}
```

**order-service: service/OrderStateMachine.java**

```java
package com.ambatucode.dikichi.order.service;

import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.Role;
import java.util.Map;
import java.util.Set;

public final class OrderStateMachine {

    private static final Set<OrderStatus> CASHIER_QUEUE = Set.of(OrderStatus.PENDING, OrderStatus.ACCEPTED);
    private static final Set<OrderStatus> KITCHEN_QUEUE = Set.of(OrderStatus.PREPARING, OrderStatus.READY);

    private static final Set<OrderStatus> NEVER_PATCHABLE = Set.of(OrderStatus.PENDING, OrderStatus.PREPARING);

    private static final Map<Role, Set<OrderStatus>> TARGETS_BY_ROLE = Map.of(
            Role.CASHIER, Set.of(OrderStatus.ACCEPTED, OrderStatus.CANCELLED),
            Role.KITCHEN, Set.of(OrderStatus.READY, OrderStatus.COMPLETED));

    // WHY: ACCEPTED to PREPARING is absent because only the pay endpoint may perform it
    private static final Map<OrderStatus, Set<OrderStatus>> PATCH_TRANSITIONS = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.ACCEPTED, OrderStatus.CANCELLED),
            OrderStatus.ACCEPTED, Set.of(OrderStatus.CANCELLED),
            OrderStatus.PREPARING, Set.of(OrderStatus.READY),
            OrderStatus.READY, Set.of(OrderStatus.COMPLETED));

    private OrderStateMachine() {
    }

    public static Set<OrderStatus> queueFor(Role role) {
        return role == Role.KITCHEN ? KITCHEN_QUEUE : CASHIER_QUEUE;
    }

    public static boolean isPayable(OrderStatus status) {
        return status == OrderStatus.ACCEPTED;
    }

    public static boolean isEditable(OrderStatus status) {
        return status == OrderStatus.PENDING;
    }

    public static boolean isNeverPatchable(OrderStatus target) {
        return NEVER_PATCHABLE.contains(target);
    }

    public static boolean roleOwns(Role role, OrderStatus target) {
        return TARGETS_BY_ROLE.getOrDefault(role, Set.of()).contains(target);
    }

    public static boolean allows(OrderStatus from, OrderStatus to) {
        return PATCH_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }
}
```

### 11.4.4 order-service: Penanganan Kesalahan

Karena **DELETE /api/v2/orders/{orderId}** tidak dipetakan sementara path yang sama dipetakan untuk metode lain, Spring MVC melemparkan **HttpRequestMethodNotSupportedException**. **GlobalExceptionHandler** mengubahnya menjadi **405 METHOD_NOT_ALLOWED** dengan format kesalahan seragam. Penulisan bersamaan yang gagal pada kolom **@Version** dijawab **409 CONCURRENT_MODIFICATION**.

**order-service: exception/GlobalExceptionHandler.java (cuplikan)**

```java
@ExceptionHandler(OptimisticLockingFailureException.class)
public ResponseEntity<ErrorResponse> handleConcurrentModification(HttpServletRequest request) {
    return build(HttpStatus.CONFLICT, "CONCURRENT_MODIFICATION",
            "The order was modified by another request", request, List.of());
}

@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpServletRequest request) {
    return build(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "Method is not allowed", request, List.of());
}
```

## 11.5 Alur Eksekusi

| Operasi | Alur |
| :--- | :--- |
| PUT /api/v2/orders/{orderId} | Gateway (JWT wajib, header identitas diisi) → OrderV2Controller.replace → validasi Bean Validation (400) → OrderV2Mapper.toCommand → OrderService.replace (role CASHIER, outlet sendiri, outlet tidak berubah, status PENDING, item ganda 400, validasi ke catalog-service 422/409/503) → transaksi: hapus item lama, simpan snapshot baru, total dihitung ulang → 200 dengan paymentSummary UNPAID |
| PATCH /api/v2/orders/{orderId}/status | Gateway (JWT wajib) → OrderV2Controller.updateStatus → OrderService.updateStatus (role, body status 400, pesanan 404, outlet 403, target terlarang 409, kepemilikan target 403, transisi 409) → perubahan status disimpan → PaymentService.findByOrderId → 200 dengan paymentSummary UNPAID atau PAID |
| DELETE /api/v2/orders/{orderId} | Gateway (JWT wajib, 401 tanpa token) → order-service tidak menemukan pemetaan DELETE → GlobalExceptionHandler.handleMethodNotSupported → 405 METHOD_NOT_ALLOWED. Data pesanan tidak berubah |

## 11.6 Skenario Verifikasi Manual

Skenario berikut dapat dijalankan setelah seluruh kontainer berstatus sehat dan satu pesanan PENDING dibuat melalui POST /api/v2/orders. Kolom terakhir adalah hasil yang diharapkan berdasarkan spesifikasi pada Bab 9. Skenario ini disiapkan sebagai panduan pemeriksaan, dan ringkasan hasil eksekusinya dimuat pada subbab 11.8.

**Contoh permintaan API v2.0**

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"cashier","password":"<SEED_CASHIER_PASSWORD>"}' | jq -r .accessToken)

curl -i -X PUT http://localhost:8080/api/v2/orders/<orderId> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"customer":{"name":"Budi Santoso"},"location":{"outletId":"OUT-01","tableCode":"T-05"},"items":[{"menuItemId":"11111111-0000-4000-8000-000000000001","quantity":1},{"menuItemId":"11111111-0000-4000-8000-000000000009","quantity":2}]}'

curl -i -X PATCH http://localhost:8080/api/v2/orders/<orderId>/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"ACCEPTED"}'

curl -i -X DELETE http://localhost:8080/api/v2/orders/<orderId> \
  -H "Authorization: Bearer $TOKEN"
```

| No | Skenario | Status | Kode / Hasil |
| :--- | :--- | :--- | :--- |
| 1 | PUT pesanan v2 tanpa token | 401 | UNAUTHORIZED |
| 2 | PUT pesanan v2 oleh KITCHEN | 403 | FORBIDDEN |
| 3 | PUT pesanan dengan body datar gaya v1 | 400 | VALIDATION_ERROR, medan customer dan location dilaporkan |
| 4 | PUT pesanan mencoba mengubah outletId | 400 | OUTLET_IMMUTABLE |
| 5 | PUT pesanan berisi item ganda | 400 | DUPLICATE_MENU_ITEM |
| 6 | PUT pesanan dengan meja yang tidak ada | 422 | INVALID_TABLE |
| 7 | PUT pesanan berisi item sold out | 409 | ITEM_UNAVAILABLE |
| 8 | PUT pesanan PENDING oleh CASHIER dengan body bersarang valid | 200 | Status tetap PENDING, nama dipangkas, total dihitung ulang, paymentSummary UNPAID |
| 9 | PUT pesanan yang sudah berstatus ACCEPTED | 409 | ORDER_NOT_EDITABLE |
| 10 | PATCH status v2 tanpa token | 401 | UNAUTHORIZED |
| 11 | PATCH status dengan body kosong | 400 | VALIDATION_ERROR, medan status |
| 12 | PATCH status ke PREPARING | 409 | INVALID_STATUS_TRANSITION |
| 13 | PATCH status ke READY oleh CASHIER | 403 | FORBIDDEN |
| 14 | PATCH status dari PENDING ke ACCEPTED oleh CASHIER | 200 | Status ACCEPTED, paymentSummary UNPAID |
| 15 | PATCH status dari PREPARING ke READY oleh KITCHEN | 200 | Status READY, paymentSummary PAID |
| 16 | PATCH status dari PENDING ke CANCELLED oleh CASHIER | 200 | Status CANCELLED, paymentSummary UNPAID |
| 17 | PATCH status dari CANCELLED ke ACCEPTED | 409 | INVALID_STATUS_TRANSITION |
| 18 | DELETE pesanan v2 tanpa token | 401 | UNAUTHORIZED |
| 19 | DELETE pesanan v2 oleh CASHIER | 405 | METHOD_NOT_ALLOWED, data pesanan tidak berubah |
| 20 | GET pesanan hasil PUT atau PATCH v2 melalui /api/v1/orders/{id} | 200 | Bentuk v1 datar (kompatibilitas berdampingan) |

## 11.7 Berkas Pengujian Pendukung

Berkas berikut disertakan pada arsip kode sumber untuk memverifikasi implementasi di atas. Ringkasan hasil eksekusinya dimuat pada subbab 11.8, sedangkan pengujian API v2.0 yang lengkap dilaporkan pada Bab 12.

| Berkas | Cakupan |
| :--- | :--- |
| test/.../controller/OrderV2ControllerTest | Empat uji baru: PUT mendelegasikan request bersarang dan mengembalikan respons v2 UNPAID, PATCH tanpa pembayaran (CANCELLED, UNPAID) dan dengan pembayaran (READY, PAID), serta pemeriksaan bahwa controller memetakan PUT dan PATCH tetapi tidak DELETE |
| test/.../service/OrderServiceTest, OrderStateMachineTest | Aturan penggantian dan transisi status yang dipakai bersama v1 dan v2 |
| Backend/tests/api/dikichi-v2-put-patch-delete.postman_collection.json | 55 permintaan Newman: prasyarat (4), PUT (18), PATCH (26), dan DELETE (7) pada /api/v2/orders |

**Menjalankan uji unit dan uji API v2**

```bash
cd Backend/order-service
docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test

cd ../tests/api
./run-newman.ps1 -Collection dikichi-v2-put-patch-delete.postman_collection.json
```

## 11.8 Hasil Verifikasi

Verifikasi dijalankan pada satu mesin pengembangan berbasis Linux (Pop!_OS) dengan Docker. Lima kontainer backend, yaitu catalog-db, order-db, catalog-service, order-service, dan gateway-service, berstatus *healthy*, dan seluruh permintaan dikirim melalui API Gateway pada http://localhost:8080. Layanan frontend tidak dijalankan karena tidak dibutuhkan untuk pengujian API.

### 11.8.1 Uji Unit order-service

Uji unit dijalankan dengan perintah **mvn -B test** di dalam kontainer maven:3.9-eclipse-temurin-21. Sebanyak 70 uji dijalankan tanpa kegagalan dan tanpa galat, dengan status **BUILD SUCCESS**. Rincian per kelas uji ditunjukkan pada tabel berikut.

| Kelas Uji | Jumlah Uji | Gagal |
| :--- | :--- | :--- |
| OrderV2ControllerTest | 9 | 0 |
| V2OrderRequestValidationTest | 7 | 0 |
| OrderV2MapperTest | 4 | 0 |
| OrderServiceTest | 32 | 0 |
| OrderStateMachineTest | 4 | 0 |
| PaymentServiceLookupTest | 3 | 0 |
| PaymentServiceTest | 11 | 0 |
| Total | 70 | 0 |

### 11.8.2 Uji API v2 dengan Newman

Koleksi **dikichi-v2-put-patch-delete** dijalankan dengan Newman terhadap sistem yang berjalan. Seluruh 55 permintaan dan 250 asersi berhasil tanpa kegagalan. Total durasi eksekusi 2,5 detik dengan waktu respons rata-rata 32 ms (minimum 3 ms, maksimum 497 ms, simpangan baku 76 ms).

| Kelompok Permintaan | Permintaan | Gagal |
| :--- | :--- | :--- |
| 00 Prasyarat autentikasi dan data uji | 4 | 0 |
| 01 Order v2 PUT | 18 | 0 |
| 02 Order v2 PATCH | 26 | 0 |
| 03 Order v2 DELETE | 7 | 0 |
| Total | 55 | 0 |

| Ringkasan Newman | Dijalankan | Gagal |
| :--- | :--- | :--- |
| Iterasi | 1 | 0 |
| Permintaan (requests) | 55 | 0 |
| Skrip uji (test-scripts) | 55 | 0 |
| Asersi (assertions) | 250 | 0 |

Gambar 11.1 menampilkan akhir keluaran Newman, yaitu permintaan DELETE yang dijawab 405 METHOD_NOT_ALLOWED, pemeriksaan bahwa pesanan tetap tersimpan, dan tabel ringkasan.

**Gambar 11.1** Ringkasan hasil uji API v2 (PUT, PATCH, dan DELETE) dengan Newman (tangkapan layar terminal, disertakan pada dokumen laporan)

Hasil ini menunjukkan bahwa PUT dan PATCH v2 mengembalikan kontrak bersarang dengan paymentSummary yang sesuai, DELETE pada pesanan dijawab 405 METHOD_NOT_ALLOWED, dan pesanan hasil perubahan v2 tetap dapat dibaca melalui /api/v1 dalam bentuk datar.

## 11.9 Batasan Iterasi Ini

- **DELETE** pada **/api/v2/orders/{id}** sengaja tidak diimplementasikan. Pesanan adalah data transaksi yang wajib dapat diaudit, sehingga pemanggilan DELETE dijawab **405 METHOD_NOT_ALLOWED** dan pembatalan dilakukan dengan **PATCH** status **CANCELLED**.

- Operasi **PUT**, **PATCH**, dan **DELETE** untuk outlet, meja, dan item menu tetap berada di **/api/v1** sesuai Keputusan D4 dan telah diimplementasikan pada Bab 5.

- Respons **PUT** selalu memuat paymentSummary **UNPAID** karena hanya pesanan PENDING yang dapat diganti. Respons **PATCH** membentuk paymentSummary dari baris **mock_payment** pada saat permintaan, sehingga tidak ada status pembayaran tersimpan yang dapat tidak sinkron.

- Bab ini memuat implementasi beserta ringkasan verifikasi awal pada subbab 11.8. Pengujian API v2.0 yang lengkap, termasuk bukti per skenario, dilaporkan pada Bab 12.
