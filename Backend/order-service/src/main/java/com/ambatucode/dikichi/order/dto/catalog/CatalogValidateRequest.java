package com.ambatucode.dikichi.order.dto.catalog;

import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import java.util.List;

public record CatalogValidateRequest(String outletId, String tableCode, List<OrderItemRequest> items) {
}
