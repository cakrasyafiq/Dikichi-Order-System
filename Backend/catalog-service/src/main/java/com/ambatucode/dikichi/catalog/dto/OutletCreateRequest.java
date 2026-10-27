package com.ambatucode.dikichi.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OutletCreateRequest(
        @NotBlank @Size(max = 20) @Pattern(regexp = "^OUT-\\d{2,}$") String id,
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 255) String address) {
}
