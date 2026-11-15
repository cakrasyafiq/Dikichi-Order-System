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
