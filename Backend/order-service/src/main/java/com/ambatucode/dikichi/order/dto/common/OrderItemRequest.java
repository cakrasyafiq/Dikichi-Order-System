package com.ambatucode.dikichi.order.dto.common;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record OrderItemRequest(
        @NotNull UUID menuItemId,
        @NotNull @Min(1) @Max(99) Integer quantity) {
}
