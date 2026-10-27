package com.ambatucode.dikichi.order.service;

import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import java.util.List;

public record CreateOrderCommand(String outletId, String tableCode, String customerName,
                                 List<OrderItemRequest> items) {
}
