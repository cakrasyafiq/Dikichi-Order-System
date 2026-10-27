package com.ambatucode.dikichi.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TableCreateRequest(@NotBlank @Pattern(regexp = "^T-\\d{2,3}$") String code) {
}
