package com.ambatucode.dikichi.order.dto.v1;

import com.ambatucode.dikichi.order.dto.common.OrderItemResponse;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record V1OrderResponse(UUID id, String orderNumber, String outletId, String tableCode, String customerName,
                              OrderStatus status, List<OrderItemResponse> items, long totalAmount,
                              Instant createdAt, Instant updatedAt) {
}
