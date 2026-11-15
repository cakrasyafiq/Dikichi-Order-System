package com.ambatucode.dikichi.order.dto.v2;

import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record V2OrderRequest(
        @NotNull @Valid Customer customer,
        @NotNull @Valid Location location,
        @NotNull @Size(min = 1, max = 30) List<@Valid OrderItemRequest> items) {

    public record Customer(@NotBlank @Size(max = 50) String name) {

        public Customer {
            name = name == null ? null : name.strip();
        }
    }

    public record Location(
            @NotNull @Pattern(regexp = "^OUT-\\d{2,}$") String outletId,
            @NotNull @Pattern(regexp = "^T-\\d{2,3}$") String tableCode) {
    }
}
