package com.ambatucode.dikichi.order.dto.common;

import java.util.UUID;

public record OrderItemResponse(UUID menuItemId, String name, int unitPrice, int quantity, long subtotal) {
}
