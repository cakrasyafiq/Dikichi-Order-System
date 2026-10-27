package com.ambatucode.dikichi.catalog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.UUID;

public record InternalValidateRequest(
        @NotNull @Pattern(regexp = "^OUT-\\d{2,}$") String outletId,
        @NotNull @Pattern(regexp = "^T-\\d{2,3}$") String tableCode,
        @NotEmpty List<@Valid Line> items) {

    public record Line(@NotNull UUID menuItemId, @NotNull @Min(1) @Max(99) Integer quantity) {
    }
}
