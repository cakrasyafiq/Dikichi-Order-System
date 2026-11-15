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
