# BAB 10. IMPLEMENTASI API VERSI 2.0 (GET & POST)

Bab ini memuat implementasi **API versi 2.0 (/api/v2)** untuk operasi **GET** dan **POST** pada resource **Order**, sebagaimana dispesifikasikan pada Bab 9 dan dijelaskan alasan transisinya pada Bab 8. Pembahasan mencakup properti *build*, konfigurasi *deployment*, dan kode sumber utama yang berkaitan langsung dengan kedua metode tersebut. Operasi **PUT**, **PATCH**, dan **DELETE** versi 2.0 diimplementasikan pada iterasi berikutnya dan dibahas pada Bab 11.

## 10.1 Gambaran Implementasi

### 10.1.1 Cakupan Endpoint

Sesuai Keputusan D4, kontrak baru hanya berlaku pada resource Order. Karena itu implementasi GET dan POST v2 terbatas pada empat endpoint berikut. Endpoint GET dan POST untuk autentikasi, outlet, meja, dan menu tidak berubah dan tetap berada di **/api/v1** (Bab 4).

| Method | Path Endpoint | Akses | Controller | Service |
| :--- | :--- | :--- | :--- | :--- |
| POST | /api/v2/orders | Publik (tanpa token) | OrderV2Controller.create | OrderService.create |
| GET | /api/v2/orders | CASHIER, KITCHEN | OrderV2Controller.list | OrderService.list, PaymentService.findByOrderIds |
| GET | /api/v2/orders/{orderId} | CASHIER, KITCHEN | OrderV2Controller.get | OrderService.get, PaymentService.findByOrderId |
| POST | /api/v2/orders/{orderId}/pay | CASHIER | OrderV2Controller.pay | PaymentService.pay, PaymentService.findByOrderId |

Perbedaan terhadap v1 hanya terletak pada bentuk *request* dan *response*. Aturan bisnis (validasi katalog, *snapshot* harga, hak akses per role, antrean per role, pembayaran atomik) tidak ditulis ulang, melainkan dipakai bersama melalui **OrderService** dan **PaymentService**.

### 10.1.2 Perubahan terhadap Kode Bab 4 dan Bab 5

Implementasi ditambahkan sebagai lapisan baru di sisi pengendali dan pemeta data. Berkas baru ditandai pada kolom jenis. Tidak ada migrasi basis data karena tabel **orders**, **order_item**, dan **mock_payment** dipakai bersama oleh v1 dan v2.

| Layanan | Berkas | Jenis | Perubahan |
| :--- | :--- | :--- | :--- |
| gateway-service | config/GatewayRoutes | Ubah | Rute order-service ditambah pola /api/v2/orders/** |
| gateway-service | config/SecurityConfig | Ubah | POST /api/v2/orders ditambahkan sebagai rute publik |
| order-service | dto/v2/V2OrderRequest | Baru | Body bersarang: customer, location, items |
| order-service | dto/v2/V2OrderResponse | Baru | Respons bersarang dengan paymentSummary |
| order-service | dto/v2/V2PaymentSummary | Baru | Ringkasan pembayaran |
| order-service | dto/v2/PaymentStatus | Baru | Enum UNPAID dan PAID |
| order-service | mapper/OrderV2Mapper | Baru | Pemeta request ke command dan Order ke respons v2 |
| order-service | controller/v2/OrderV2Controller | Baru | Pemetaan POST, GET, dan POST pay pada /api/v2/orders |
| order-service | service/PaymentService | Ubah | Metode findByOrderId dan findByOrderIds (hanya baca) |
| order-service | repository/MockPaymentRepository | Ubah | Kueri findByOrderId dan findByOrderIdIn |
| order-service | entity/MockPayment | Ubah | Getter getAmountTendered |
| order-service | test/... | Baru | Uji unit pemeta, validasi request, controller, dan pencarian pembayaran |
| Backend/tests/api | dikichi-v2-get-post.postman_collection.json | Baru | Koleksi uji API v2 untuk Newman |
| pom.xml, Dockerfile, Compose, Flyway | Seluruh berkas | Tetap | Tidak ada perubahan |

### 10.1.3 Pemetaan Aturan Bisnis ke Kode

| Aturan | Lokasi Implementasi |
| :--- | :--- |
| Body datar v1 ditolak 400 VALIDATION_ERROR karena customer dan location wajib ada | V2OrderRequest (@NotNull @Valid), GlobalExceptionHandler.handleValidation |
| Nama pelanggan di-trim, 1 sampai 50 karakter | V2OrderRequest.Customer (konstruktor ringkas dan @NotBlank @Size) |
| Format outletId (OUT-nn) dan tableCode (T-nn) | V2OrderRequest.Location (@Pattern) |
| Rute publik POST /api/v2/orders, POST /{id}/pay tetap terlindungi | SecurityConfig.securityWebFilterChain (path tepat) |
| Validasi outlet, meja, item, dan ketersediaan semua atau tidak sama sekali | OrderService.create, CatalogClient, OrderValidationService (dipakai bersama v1) |
| Pesanan baru berstatus PENDING dan paymentStatus UNPAID | Order (konstruktor), OrderV2Mapper.toPaymentSummary |
| paymentSummary: PAID bila ada baris mock_payment, selain itu UNPAID dengan medan pembayaran null | OrderV2Mapper.toPaymentSummary |
| Antrean per role dan batas outlet pada GET | OrderService.list dan OrderService.get (dipakai bersama v1) |
| Pembayaran atomik, kembalian dihitung server, pembayaran kedua 409 ORDER_ALREADY_PAID | PaymentService.pay (dipakai bersama v1) |
| Pencarian pembayaran satu kali untuk seluruh antrean (tanpa N+1) | PaymentService.findByOrderIds, MockPaymentRepository.findByOrderIdIn |
| Pesanan buatan v1 terbaca dalam bentuk v2 dan sebaliknya | Entitas dan tabel yang sama, dua pemeta (OrderV1Mapper dan OrderV2Mapper) |

## 10.2 Build Properties

Implementasi v2 tidak menambah dependensi Maven. Seluruh kebutuhan teknis sudah dipenuhi oleh dependensi yang tercantum pada Bab 4, sehingga **pom.xml** ketiga layanan dan **application.yml** tidak berubah.

| Kebutuhan Teknis | Dependensi yang Dipakai | Keterangan |
| :--- | :--- | :--- |
| Pemetaan @RestController pada /api/v2/orders | spring-boot-starter-webmvc | Sudah ada |
| Validasi bersarang (@Valid pada record customer dan location) | spring-boot-starter-validation | Sudah ada |
| Kueri findByOrderId dan findByOrderIdIn | spring-boot-starter-data-jpa | Query derivation, tanpa migrasi |
| Rute /api/v2/orders/** pada gateway | spring-cloud-starter-gateway-server-webflux | Sudah ada, hanya konfigurasi rute |
| Uji unit baru (JUnit 5, Mockito, AssertJ, Bean Validation) | spring-boot-starter-test, spring-boot-starter-validation | Scope test, sudah ada |

Versi yang dipakai tidak berubah dari Bab 4: Java 21, Spring Boot 4.0.7, Spring Cloud 2025.1.2, PostgreSQL 16, dan Hibernate ORM dengan **ddl-auto: validate**. Karena tidak ada kolom atau tabel baru, validasi skema Hibernate tidak terpengaruh.

## 10.3 Konfigurasi Deployment

| Berkas | Status | Alasan |
| :--- | :--- | :--- |
| Dockerfile (3 layanan) | Tetap | Proses build dan citra tidak bergantung pada versi API |
| docker-compose.yml | Tetap | Topologi, port, dan health check tidak berubah. Gateway tetap satu-satunya pintu masuk pada port 8080 |
| .env.example | Tetap | Tidak ada variabel lingkungan baru |
| GatewayRoutes | Ubah | Pola /api/v1/orders/** tidak mencakup /api/v2/orders/**, sehingga rute order-service perlu pola kedua. Tanpa perubahan ini gateway membalas 404 |
| SecurityConfig | Ubah | POST /api/v2/orders ditambahkan sebagai rute publik dengan path yang tepat, sehingga POST /api/v2/orders/{id}/pay tetap mewajibkan JWT |
| Migrasi Flyway | Tetap | Tidak ada perubahan skema basis data |

### 10.3.1 Memperbarui Layanan

Hanya **order-service** dan **gateway-service** yang perlu dibangun ulang. **catalog-service** tidak berubah. Uji unit dapat dijalankan terlebih dahulu sebelum citra dibangun.

**Perintah pembaruan layanan**

```bash
cd Backend/order-service
docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test
cd ..
docker compose --env-file ../.env up -d --build order-service gateway-service
docker compose --env-file ../.env ps
```

## 10.4 Kode Sumber Utama GET dan POST Versi 2.0

Bagian ini memuat berkas yang berkaitan langsung dengan operasi GET dan POST pada API v2. Kelas yang dipakai bersama dengan v1 (OrderService, OrderStateMachine, CatalogClient, GlobalExceptionHandler) tidak diubah dan dimuat pada Bab 4 dan Bab 5. Arsip kode sumber memuat seluruh berkas.

### 10.4.1 gateway-service

Gateway menambahkan pola rute v2 ke order-service dan membuka POST /api/v2/orders tanpa token. Path publik ditulis tepat agar POST /api/v2/orders/{orderId}/pay tetap diperiksa JWT-nya.

**gateway-service: gateway/config/GatewayRoutes.java**

```java
package com.ambatucode.dikichi.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRoutes {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder, UpstreamProperties upstream) {
        return builder.routes()
                .route("catalog-service", route -> route
                        .path("/api/v1/auth/**", "/api/v1/outlets/**", "/api/v1/menu-items/**")
                        .uri(upstream.catalog()))
                .route("order-service", route -> route
                        .path("/api/v1/orders/**", "/api/v2/orders/**")
                        .uri(upstream.order()))
                .build();
    }
}
```

**gateway-service: gateway/config/SecurityConfig.java**

```java
package com.ambatucode.dikichi.gateway.config;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    private static final int MIN_SECRET_BYTES = 32;

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                        // WHY: exact path for POST orders, so POST /orders/{id}/pay stays protected
                        .pathMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/orders", "/api/v2/orders").permitAll()
                        .pathMatchers(HttpMethod.GET, "/api/v1/outlets/**", "/api/v1/menu-items/**").permitAll()
                        .pathMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**").permitAll()
                        .pathMatchers("/internal/**").permitAll()
                        .anyExchange().authenticated())
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint((exchange, ex) ->
                                writeError(exchange, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                                        "Authentication is required"))
                        .accessDeniedHandler((exchange, ex) ->
                                writeError(exchange, HttpStatus.FORBIDDEN, "FORBIDDEN", "Access is denied")))
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .authenticationEntryPoint((exchange, ex) ->
                                writeError(exchange, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                                        "Token is missing or invalid"))
                        .jwt(Customizer.withDefaults()))
                .build();
    }

    @Bean
    public ReactiveJwtDecoder jwtDecoder(JwtProperties properties) {
        byte[] secret = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET must be at least " + MIN_SECRET_BYTES + " bytes");
        }
        return NimbusReactiveJwtDecoder.withSecretKey(new SecretKeySpec(secret, "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }

    private static Mono<Void> writeError(ServerWebExchange exchange, HttpStatus status, String code,
                                         String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String path = exchange.getRequest().getPath().value().replace("\\", "\\\\").replace("\"", "\\\"");
        String body = "{\"timestamp\":\"" + Instant.now().truncatedTo(ChronoUnit.SECONDS) + "\","
                + "\"status\":" + status.value() + ","
                + "\"code\":\"" + code + "\","
                + "\"message\":\"" + message + "\","
                + "\"path\":\"" + path + "\","
                + "\"errors\":[]}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}
```

### 10.4.2 order-service: DTO Versi 2.0

Request v2 bersarang. Anotasi **@Valid** pada komponen customer dan location membuat validasi turun ke dalam sub-objek, sehingga kesalahan dilaporkan dengan jalur medan seperti **customer.name** dan **location.outletId**. Respons memuat **paymentSummary** pada setiap pesanan.

**order-service: dto/v2/V2OrderRequest.java**

```java
package com.ambatucode.dikichi.order.dto.v2;

import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record V2OrderRequest(
        @NotNull @Valid Customer customer,
        @NotNull @Valid Location location,
        @NotNull @Size(min = 1, max = 30) List<@Valid OrderItemRequest> items) {

    public record Customer(@NotBlank @Size(max = 50) String name) {

        public Customer {
            name = name == null ? null : name.strip();
        }
    }

    public record Location(
            @NotNull @Pattern(regexp = "^OUT-\\d{2,}$") String outletId,
            @NotNull @Pattern(regexp = "^T-\\d{2,3}$") String tableCode) {
    }
}
```

**order-service: dto/v2/V2OrderResponse.java**

```java
package com.ambatucode.dikichi.order.dto.v2;

import com.ambatucode.dikichi.order.dto.common.OrderItemResponse;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record V2OrderResponse(UUID id, String orderNumber, OrderStatus status, Customer customer,
                              Location location, List<OrderItemResponse> items,
                              V2PaymentSummary paymentSummary, Instant createdAt, Instant updatedAt) {

    public record Customer(String name) {
    }

    public record Location(String outletId, String tableCode) {
    }
}
```

**order-service: dto/v2/V2PaymentSummary.java**

```java
package com.ambatucode.dikichi.order.dto.v2;

import com.ambatucode.dikichi.order.entity.PaymentMethod;

public record V2PaymentSummary(long totalAmount, PaymentStatus paymentStatus, PaymentMethod paymentMethod,
                               Long amountTendered, Long change) {
}
```

**order-service: dto/v2/PaymentStatus.java**

```java
package com.ambatucode.dikichi.order.dto.v2;

// WHY: payment status is a view concern of API v2, derived from the presence of a mock payment row
public enum PaymentStatus {
    UNPAID,
    PAID
}
```

### 10.4.3 order-service: Pemeta dan Controller

**OrderV2Mapper** meratakan request v2 menjadi **CreateOrderCommand** yang sama dengan yang dipakai v1, lalu membentuk respons bersarang dari entitas **Order** dan **MockPayment** (null bila belum dibayar). **OrderV2Controller** hanya menerima dan mendelegasikan permintaan. Pada daftar pesanan, pembayaran seluruh antrean dimuat dengan satu kueri **IN**.

**order-service: mapper/OrderV2Mapper.java**

```java
package com.ambatucode.dikichi.order.mapper;

import com.ambatucode.dikichi.order.dto.common.OrderItemResponse;
import com.ambatucode.dikichi.order.dto.v2.PaymentStatus;
import com.ambatucode.dikichi.order.dto.v2.V2OrderRequest;
import com.ambatucode.dikichi.order.dto.v2.V2OrderResponse;
import com.ambatucode.dikichi.order.dto.v2.V2PaymentSummary;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.service.CreateOrderCommand;

public final class OrderV2Mapper {

    private OrderV2Mapper() {
    }

    public static CreateOrderCommand toCommand(V2OrderRequest request) {
        return new CreateOrderCommand(request.location().outletId(), request.location().tableCode(),
                request.customer().name(), request.items());
    }

    // WHY: payment is null while the order is unpaid; the summary then carries UNPAID and null payment fields
    public static V2OrderResponse toResponse(Order order, MockPayment payment) {
        return new V2OrderResponse(order.getId(), order.getOrderNumber(), order.getStatus(),
                new V2OrderResponse.Customer(order.getCustomerName()),
                new V2OrderResponse.Location(order.getOutletId(), order.getTableCode()),
                order.getItems().stream()
                        .map(item -> new OrderItemResponse(item.getMenuItemId(), item.getMenuItemName(),
                                item.getUnitPrice(), item.getQuantity(), item.getSubtotal()))
                        .toList(),
                toPaymentSummary(order, payment), order.getCreatedAt(), order.getUpdatedAt());
    }

    private static V2PaymentSummary toPaymentSummary(Order order, MockPayment payment) {
        if (payment == null) {
            return new V2PaymentSummary(order.getTotalAmount(), PaymentStatus.UNPAID, null, null, null);
        }
        return new V2PaymentSummary(order.getTotalAmount(), PaymentStatus.PAID, payment.getPaymentMethod(),
                payment.getAmountTendered(), payment.getChangeAmount());
    }
}
```

**order-service: controller/v2/OrderV2Controller.java**

```java
package com.ambatucode.dikichi.order.controller.v2;

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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// WHY: the controller only maps v2 DTOs; business rules stay in OrderService and PaymentService, shared with v1
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
}
```

### 10.4.4 order-service: Akses Data Pembayaran

Metode pencarian pembayaran ditambahkan sebagai operasi hanya baca. Logika **pay** tidak diubah sehingga perilaku v1 tetap sama.

**order-service: repository/MockPaymentRepository.java**

```java
package com.ambatucode.dikichi.order.repository;

import com.ambatucode.dikichi.order.entity.MockPayment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MockPaymentRepository extends JpaRepository<MockPayment, UUID> {

    boolean existsByOrderId(UUID orderId);

    Optional<MockPayment> findByOrderId(UUID orderId);

    List<MockPayment> findByOrderIdIn(Collection<UUID> orderIds);
}
```

**order-service: service/PaymentService.java**

```java
package com.ambatucode.dikichi.order.service;

import com.ambatucode.dikichi.order.config.CallerContext;
import com.ambatucode.dikichi.order.dto.common.ErrorDetail;
import com.ambatucode.dikichi.order.dto.common.PaymentRequest;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.PaymentMethod;
import com.ambatucode.dikichi.order.entity.Role;
import com.ambatucode.dikichi.order.exception.ApiException;
import com.ambatucode.dikichi.order.repository.MockPaymentRepository;
import com.ambatucode.dikichi.order.repository.OrderRepository;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final OrderRepository orders;
    private final MockPaymentRepository payments;
    private final CallerContext caller;

    public PaymentService(OrderRepository orders, MockPaymentRepository payments, CallerContext caller) {
        this.orders = orders;
        this.payments = payments;
        this.caller = caller;
    }

    @Transactional
    public Order pay(UUID orderId, PaymentRequest request) {
        caller.requireRole(Role.CASHIER);
        Order order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        caller.requireSameOutlet(order.getOutletId());
        validateTender(order, request);

        if (payments.existsByOrderId(orderId)) {
            throw ApiException.conflict("ORDER_ALREADY_PAID", "Order has already been paid");
        }
        if (!OrderStateMachine.isPayable(order.getStatus())) {
            throw ApiException.conflict("INVALID_STATUS_TRANSITION", "Only ACCEPTED orders can be paid");
        }

        boolean cash = request.paymentMethod() == PaymentMethod.CASH;
        Long tendered = cash ? request.amountTendered() : null;
        Long change = cash ? tendered - order.getTotalAmount() : null;
        payments.save(new MockPayment(orderId, request.paymentMethod(), tendered, change, order.getTotalAmount()));

        order.markPreparing();
        return orders.saveAndFlush(order);
    }

    @Transactional(readOnly = true)
    public Optional<MockPayment> findByOrderId(UUID orderId) {
        return payments.findByOrderId(orderId);
    }

    // WHY: one IN query for a whole queue avoids an N+1 lookup when listing orders in the v2 shape
    @Transactional(readOnly = true)
    public Map<UUID, MockPayment> findByOrderIds(Collection<UUID> orderIds) {
        if (orderIds.isEmpty()) {
            return Map.of();
        }
        return payments.findByOrderIdIn(orderIds).stream()
                .collect(Collectors.toMap(MockPayment::getOrderId, Function.identity()));
    }

    private static void validateTender(Order order, PaymentRequest request) {
        boolean cash = request.paymentMethod() == PaymentMethod.CASH;
        Long tendered = request.amountTendered();
        if (cash && (tendered == null || tendered < order.getTotalAmount())) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request validation failed",
                    List.of(new ErrorDetail("amountTendered", "must be at least the order total for CASH")));
        }
        if (!cash && tendered != null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request validation failed",
                    List.of(new ErrorDetail("amountTendered", "must be null for QRIS and CARD")));
        }
    }
}
```

**order-service: entity/MockPayment.java (potongan: getter yang ditambahkan)**

```java

    public Long getChangeAmount() {
        return changeAmount;
    }

    public Long getAmountTendered() {
        return amountTendered;
    }
}
```

## 10.5 Alur Eksekusi

| Operasi | Alur |
| :--- | :--- |
| POST /api/v2/orders | Gateway (rute publik) → OrderV2Controller.create → validasi Bean Validation (400) → OrderV2Mapper.toCommand → OrderService.create (cek item ganda 400, validasi ke catalog-service 422/409/503, simpan snapshot dan total) → respons 201 dengan header Location /api/v2/orders/{id} dan paymentSummary UNPAID |
| GET /api/v2/orders | Gateway (JWT wajib, header identitas diisi) → OrderV2Controller.list → OrderService.list (role, outlet, filter status) → PaymentService.findByOrderIds (satu kueri) → OrderV2Mapper.toResponse per pesanan → 200 |
| GET /api/v2/orders/{orderId} | Gateway → OrderV2Controller.get → OrderService.get (404 bila tidak ada, 403 bila outlet lain) → PaymentService.findByOrderId → 200. Pesanan buatan v1 juga dikembalikan dalam bentuk v2 |
| POST /api/v2/orders/{orderId}/pay | Gateway (JWT wajib) → OrderV2Controller.pay → PaymentService.pay (CASHIER, outlet sendiri, status ACCEPTED, validasi tunai, simpan mock_payment, status PREPARING) → PaymentService.findByOrderId → 200 dengan paymentSummary PAID |

## 10.6 Skenario Verifikasi Manual

Skenario berikut dapat dijalankan setelah seluruh kontainer berstatus sehat. Kolom terakhir adalah hasil yang diharapkan berdasarkan spesifikasi pada Bab 9. Skenario ini disiapkan sebagai panduan pemeriksaan dan hasil eksekusinya dicatat pada laporan pengujian API v2.0.

**Contoh permintaan API v2.0**

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"cashier","password":"<SEED_CASHIER_PASSWORD>"}' | jq -r .accessToken)

curl -i -X POST http://localhost:8080/api/v2/orders \
  -H "Content-Type: application/json" \
  -d '{"customer":{"name":"Budi"},"location":{"outletId":"OUT-01","tableCode":"T-01"},"items":[{"menuItemId":"11111111-0000-4000-8000-000000000001","quantity":2}]}'

curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v2/orders
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v2/orders/<orderId>
```

| No | Skenario | Status | Kode / Hasil |
| :--- | :--- | :--- | :--- |
| 1 | POST pesanan v2 tanpa token dengan body bersarang valid | 201 | Header Location /api/v2/orders/{id}, status PENDING, paymentSummary UNPAID |
| 2 | POST pesanan dengan body datar gaya v1 | 400 | VALIDATION_ERROR, medan customer dan location dilaporkan |
| 3 | POST pesanan dengan customer.name kosong | 400 | VALIDATION_ERROR, medan customer.name |
| 4 | POST pesanan dengan location.outletId berformat salah | 400 | VALIDATION_ERROR, medan location.outletId |
| 5 | POST pesanan berisi item ganda | 400 | DUPLICATE_MENU_ITEM |
| 6 | POST pesanan berisi item sold out | 409 | ITEM_UNAVAILABLE |
| 7 | POST pesanan dengan meja yang tidak ada | 422 | INVALID_TABLE |
| 8 | GET daftar pesanan tanpa token | 401 | UNAUTHORIZED |
| 9 | GET daftar pesanan sebagai CASHIER | 200 | Antrean PENDING dan ACCEPTED dalam bentuk v2, terlama dahulu |
| 10 | GET daftar pesanan sebagai MASTER | 403 | FORBIDDEN |
| 11 | GET pesanan berdasarkan ID sebagai CASHIER | 200 | Bentuk v2 dengan customer, location, paymentSummary |
| 12 | GET pesanan yang tidak ada | 404 | NOT_FOUND |
| 13 | POST pay tanpa token | 401 | UNAUTHORIZED |
| 14 | POST pay CASH pada pesanan ACCEPTED dengan uang cukup | 200 | Status PREPARING, paymentStatus PAID, change = amountTendered - totalAmount |
| 15 | POST pay untuk kedua kalinya | 409 | ORDER_ALREADY_PAID |
| 16 | GET pesanan buatan v2 melalui /api/v1/orders/{id} | 200 | Bentuk v1 datar (kompatibilitas berdampingan) |

## 10.7 Berkas Pengujian Pendukung

Berkas berikut disertakan pada arsip kode sumber untuk memverifikasi implementasi di atas. Eksekusi dan hasilnya dilaporkan pada Bab 12.

| Berkas | Cakupan |
| :--- | :--- |
| test/.../mapper/OrderV2MapperTest | Pemetaan request ke command, respons UNPAID dan PAID, pembayaran tunai dan non-tunai |
| test/.../dto/V2OrderRequestValidationTest | Validasi bersarang: body datar, nama kosong atau terlalu panjang, format outlet dan meja, item kosong, jumlah tidak valid |
| test/.../controller/OrderV2ControllerTest | POST 201 dengan header Location, daftar dengan satu kali pencarian pembayaran, detail, dan pay |
| test/.../service/PaymentServiceLookupTest | Pencarian pembayaran per pesanan dan per kumpulan pesanan, termasuk antrean kosong |
| Backend/tests/api/dikichi-v2-get-post.postman_collection.json | 37 permintaan Newman: login, POST, GET, dan pembayaran pada /api/v2/orders |

**Menjalankan uji unit dan uji API v2**

```bash
cd Backend/order-service
docker run --rm -v "${PWD}:/w" -v dikichi-m2:/root/.m2 -w /w maven:3.9-eclipse-temurin-21 mvn -B test

cd ../tests/api
./run-newman.ps1 -Collection dikichi-v2-get-post.postman_collection.json
```

## 10.8 Batasan Iterasi Ini

- **PUT**, **PATCH**, dan **DELETE** pada **/api/v2/orders** belum dipetakan pada iterasi ini. Pada saat itu **PUT** dan **DELETE** pada /api/v2/orders/{id} dijawab **405 METHOD_NOT_ALLOWED**, sedangkan **PATCH** pada /api/v2/orders/{id}/status dijawab **404 NOT_FOUND** oleh order-service. Pemetaan ketiganya diimplementasikan pada iterasi berikutnya (Bab 11).
- Prasyarat pembayaran (PENDING menjadi ACCEPTED) pada skenario uji koleksi GET dan POST memakai **PATCH /api/v1/orders/{id}/status**, karena PATCH v2 baru diimplementasikan pada Bab 11.
- Respons v2 dibentuk dari entitas dan baris **mock_payment** pada saat permintaan, sehingga tidak ada kolom status pembayaran tersimpan yang dapat tidak sinkron.
