package com.ambatucode.dikichi.catalog.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MenuItemCreateRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 500) String description,
        @NotNull @Min(1) @Max(10_000_000) Integer price,
        @NotBlank @Size(max = 50) String category,
        Boolean available) {

    public boolean availableOrDefault() {
        return available == null || available;
    }
}
