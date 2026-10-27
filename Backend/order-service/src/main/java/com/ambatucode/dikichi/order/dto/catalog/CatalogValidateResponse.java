package com.ambatucode.dikichi.order.dto.catalog;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.UUID;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CatalogValidateResponse(List<CatalogItem> items) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CatalogItem(UUID menuItemId, String name, int unitPrice) {
    }
}
