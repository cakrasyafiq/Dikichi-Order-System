package com.ambatucode.dikichi.order.controller.v1;

import com.ambatucode.dikichi.order.dto.common.PaymentRequest;
import com.ambatucode.dikichi.order.dto.v1.V1OrderRequest;
import com.ambatucode.dikichi.order.dto.v1.V1OrderResponse;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.mapper.OrderV1Mapper;
import com.ambatucode.dikichi.order.service.OrderService;
import com.ambatucode.dikichi.order.service.PaymentService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderV1Controller {

    private final OrderService orderService;
    private final PaymentService paymentService;

    public OrderV1Controller(OrderService orderService, PaymentService paymentService) {
        this.orderService = orderService;
        this.paymentService = paymentService;
    }

    @PostMapping
    public ResponseEntity<V1OrderResponse> create(@Valid @RequestBody V1OrderRequest request) {
        Order order = orderService.create(OrderV1Mapper.toCommand(request));
        return ResponseEntity.created(URI.create("/api/v1/orders/" + order.getId()))
                .body(OrderV1Mapper.toResponse(order));
    }

    @GetMapping
    public List<V1OrderResponse> list(@RequestParam(required = false) String outletId,
                                      @RequestParam(required = false) OrderStatus status) {
        return orderService.list(outletId, status).stream().map(OrderV1Mapper::toResponse).toList();
    }

    @GetMapping("/{orderId}")
    public V1OrderResponse get(@PathVariable UUID orderId) {
        return OrderV1Mapper.toResponse(orderService.get(orderId));
    }

    @PostMapping("/{orderId}/pay")
    public V1OrderResponse pay(@PathVariable UUID orderId, @Valid @RequestBody PaymentRequest request) {
        return OrderV1Mapper.toResponse(paymentService.pay(orderId, request));
    }
}
