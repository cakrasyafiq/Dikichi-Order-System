package com.ambatucode.dikichi.catalog.dto;

import jakarta.validation.constraints.NotNull;

public record AvailabilityPatchRequest(@NotNull Boolean available) {
}
