package com.ambatucode.dikichi.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Size(max = 20) String outletId,
        @NotBlank @Size(max = 100) String password) {
}
