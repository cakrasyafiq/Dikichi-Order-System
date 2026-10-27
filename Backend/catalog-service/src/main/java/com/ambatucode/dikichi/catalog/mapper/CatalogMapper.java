package com.ambatucode.dikichi.catalog.mapper;

import com.ambatucode.dikichi.catalog.dto.MenuItemResponse;
import com.ambatucode.dikichi.catalog.dto.OutletResponse;
import com.ambatucode.dikichi.catalog.dto.TableResponse;
import com.ambatucode.dikichi.catalog.entity.DiningTable;
import com.ambatucode.dikichi.catalog.entity.MenuItem;
import com.ambatucode.dikichi.catalog.entity.Outlet;

public final class CatalogMapper {

    private CatalogMapper() {
    }

    public static OutletResponse toResponse(Outlet outlet) {
        return new OutletResponse(outlet.getId(), outlet.getName(), outlet.getAddress());
    }

    public static TableResponse toResponse(DiningTable table) {
        return new TableResponse(table.getId(), table.getOutletId(), table.getCode());
    }

    public static MenuItemResponse toResponse(MenuItem item) {
        return new MenuItemResponse(item.getId(), item.getOutletId(), item.getName(), item.getDescription(),
                item.getPrice(), item.getCategory(), item.isAvailable());
    }
}
