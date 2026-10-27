package com.ambatucode.dikichi.catalog.dto;

import java.util.List;
import java.util.UUID;

public record InternalValidateResponse(List<ValidatedItem> items) {

    public record ValidatedItem(UUID menuItemId, String name, int unitPrice) {
    }
}
