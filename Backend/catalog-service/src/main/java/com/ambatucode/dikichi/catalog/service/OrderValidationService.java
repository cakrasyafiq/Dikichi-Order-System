package com.ambatucode.dikichi.catalog.service;

import com.ambatucode.dikichi.catalog.dto.ErrorDetail;
import com.ambatucode.dikichi.catalog.dto.InternalValidateRequest;
import com.ambatucode.dikichi.catalog.dto.InternalValidateResponse;
import com.ambatucode.dikichi.catalog.dto.InternalValidateResponse.ValidatedItem;
import com.ambatucode.dikichi.catalog.entity.MenuItem;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.DiningTableRepository;
import com.ambatucode.dikichi.catalog.repository.MenuItemRepository;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderValidationService {

    private final OutletRepository outlets;
    private final DiningTableRepository tables;
    private final MenuItemRepository menuItems;

    public OrderValidationService(OutletRepository outlets, DiningTableRepository tables,
                                  MenuItemRepository menuItems) {
        this.outlets = outlets;
        this.tables = tables;
        this.menuItems = menuItems;
    }

    @Transactional(readOnly = true)
    public InternalValidateResponse validate(InternalValidateRequest request) {
        if (outlets.findByIdAndDeletedFalse(request.outletId()).isEmpty()) {
            throw ApiException.unprocessable("INVALID_OUTLET", "Outlet does not exist",
                    List.of(new ErrorDetail("outletId", "Outlet does not exist")));
        }
        if (!tables.existsByOutletIdAndCodeAndDeletedFalse(request.outletId(), request.tableCode())) {
            throw ApiException.unprocessable("INVALID_TABLE", "Table does not exist in this outlet",
                    List.of(new ErrorDetail("tableCode", "Table does not exist in this outlet")));
        }

        List<InternalValidateRequest.Line> lines = request.items();
        List<UUID> ids = lines.stream().map(InternalValidateRequest.Line::menuItemId).toList();
        Map<UUID, MenuItem> found = menuItems.findByIdInAndDeletedFalse(ids).stream()
                .filter(item -> item.getOutletId().equals(request.outletId()))
                .collect(Collectors.toMap(MenuItem::getId, Function.identity()));

        List<ErrorDetail> missing = new ArrayList<>();
        List<ErrorDetail> unavailable = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            MenuItem item = found.get(lines.get(i).menuItemId());
            String field = "items[" + i + "].menuItemId";
            if (item == null) {
                missing.add(new ErrorDetail(field, "Item does not exist in this outlet"));
            } else if (!item.isAvailable()) {
                unavailable.add(new ErrorDetail(field, "Item is unavailable"));
            }
        }
        if (!missing.isEmpty()) {
            throw ApiException.unprocessable("INVALID_MENU_ITEM", "One or more items are invalid", missing);
        }
        if (!unavailable.isEmpty()) {
            throw ApiException.conflict("ITEM_UNAVAILABLE", "One or more items are unavailable", unavailable);
        }

        List<ValidatedItem> validated = lines.stream()
                .map(line -> found.get(line.menuItemId()))
                .map(item -> new ValidatedItem(item.getId(), item.getName(), item.getPrice()))
                .toList();
        return new InternalValidateResponse(validated);
    }
}
