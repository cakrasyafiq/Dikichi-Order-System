package com.ambatucode.dikichi.order.mapper;

import com.ambatucode.dikichi.order.dto.common.OrderItemResponse;
import com.ambatucode.dikichi.order.dto.v1.V1OrderRequest;
import com.ambatucode.dikichi.order.dto.v1.V1OrderResponse;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.service.CreateOrderCommand;

public final class OrderV1Mapper {

    private OrderV1Mapper() {
    }

    public static CreateOrderCommand toCommand(V1OrderRequest request) {
        return new CreateOrderCommand(request.outletId(), request.tableCode(), request.customerName(),
                request.items());
    }

    public static V1OrderResponse toResponse(Order order) {
        return new V1OrderResponse(order.getId(), order.getOrderNumber(), order.getOutletId(),
                order.getTableCode(), order.getCustomerName(), order.getStatus(),
                order.getItems().stream()
                        .map(item -> new OrderItemResponse(item.getMenuItemId(), item.getMenuItemName(),
                                item.getUnitPrice(), item.getQuantity(), item.getSubtotal()))
                        .toList(),
                order.getTotalAmount(), order.getCreatedAt(), order.getUpdatedAt());
    }
}
