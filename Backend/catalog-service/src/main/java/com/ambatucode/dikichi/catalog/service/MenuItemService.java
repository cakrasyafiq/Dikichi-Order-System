package com.ambatucode.dikichi.catalog.service;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.MenuItemCreateRequest;
import com.ambatucode.dikichi.catalog.dto.MenuItemResponse;
import com.ambatucode.dikichi.catalog.entity.MenuItem;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.mapper.CatalogMapper;
import com.ambatucode.dikichi.catalog.repository.MenuItemRepository;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MenuItemService {

    private final MenuItemRepository menuItems;
    private final OutletRepository outlets;
    private final CallerContext caller;

    public MenuItemService(MenuItemRepository menuItems, OutletRepository outlets, CallerContext caller) {
        this.menuItems = menuItems;
        this.outlets = outlets;
        this.caller = caller;
    }

    @Transactional(readOnly = true)
    public List<MenuItemResponse> listByOutlet(String outletId) {
        requireActiveOutlet(outletId);
        return menuItems.findByOutletIdAndDeletedFalseOrderByCategoryAscNameAsc(outletId).stream()
                .map(CatalogMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MenuItemResponse get(UUID menuItemId) {
        return menuItems.findByIdAndDeletedFalse(menuItemId)
                .map(CatalogMapper::toResponse)
                .orElseThrow(() -> ApiException.notFound("Menu item not found"));
    }

    @Transactional
    public MenuItemResponse create(String outletId, MenuItemCreateRequest request) {
        caller.requireRole(Role.MASTER);
        requireActiveOutlet(outletId);
        MenuItem item = new MenuItem(outletId, request.name().strip(), request.description(), request.price(),
                request.category().strip(), request.availableOrDefault());
        return CatalogMapper.toResponse(menuItems.save(item));
    }

    private void requireActiveOutlet(String outletId) {
        outlets.findByIdAndDeletedFalse(outletId).orElseThrow(() -> ApiException.notFound("Outlet not found"));
    }
}
