package com.ambatucode.dikichi.order.dto.v1;

import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record V1OrderRequest(
        @NotNull @Pattern(regexp = "^OUT-\\d{2,}$") String outletId,
        @NotNull @Pattern(regexp = "^T-\\d{2,3}$") String tableCode,
        @NotBlank @Size(max = 50) String customerName,
        @NotNull @Size(min = 1, max = 30) List<@Valid OrderItemRequest> items) {

    public V1OrderRequest {
        customerName = customerName == null ? null : customerName.strip();
    }
}
