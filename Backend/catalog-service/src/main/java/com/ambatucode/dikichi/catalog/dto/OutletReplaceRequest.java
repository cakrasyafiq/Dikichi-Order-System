package com.ambatucode.dikichi.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OutletReplaceRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 255) String address) {
}
