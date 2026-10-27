package com.ambatucode.dikichi.catalog.dto;

import java.util.UUID;

public record MenuItemResponse(UUID id, String outletId, String name, String description, int price,
                               String category, boolean available) {
}
