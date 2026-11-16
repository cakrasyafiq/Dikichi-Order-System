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
