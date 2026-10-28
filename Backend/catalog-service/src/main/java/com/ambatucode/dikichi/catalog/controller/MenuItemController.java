package com.ambatucode.dikichi.catalog.controller;

import com.ambatucode.dikichi.catalog.dto.AvailabilityPatchRequest;
import com.ambatucode.dikichi.catalog.dto.MenuItemCreateRequest;
import com.ambatucode.dikichi.catalog.dto.MenuItemReplaceRequest;
import com.ambatucode.dikichi.catalog.dto.MenuItemResponse;
import com.ambatucode.dikichi.catalog.service.MenuItemService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MenuItemController {

    private final MenuItemService menuItemService;

    public MenuItemController(MenuItemService menuItemService) {
        this.menuItemService = menuItemService;
    }

    @GetMapping("/api/v1/outlets/{outletId}/menu-items")
    public List<MenuItemResponse> listByOutlet(@PathVariable String outletId) {
        return menuItemService.listByOutlet(outletId);
    }

    @GetMapping("/api/v1/menu-items/{menuItemId}")
    public MenuItemResponse get(@PathVariable UUID menuItemId) {
        return menuItemService.get(menuItemId);
    }

    @PostMapping("/api/v1/outlets/{outletId}/menu-items")
    public ResponseEntity<MenuItemResponse> create(@PathVariable String outletId,
                                                   @Valid @RequestBody MenuItemCreateRequest request) {
        MenuItemResponse created = menuItemService.create(outletId, request);
        return ResponseEntity.created(URI.create("/api/v1/menu-items/" + created.id())).body(created);
    }

    @PutMapping("/api/v1/menu-items/{menuItemId}")
    public MenuItemResponse replace(@PathVariable UUID menuItemId,
                                    @Valid @RequestBody MenuItemReplaceRequest request) {
        return menuItemService.replace(menuItemId, request);
    }

    @PatchMapping("/api/v1/menu-items/{menuItemId}/availability")
    public MenuItemResponse changeAvailability(@PathVariable UUID menuItemId,
                                               @Valid @RequestBody AvailabilityPatchRequest request) {
        return menuItemService.changeAvailability(menuItemId, request);
    }

    @DeleteMapping("/api/v1/menu-items/{menuItemId}")
    public ResponseEntity<Void> delete(@PathVariable UUID menuItemId) {
        menuItemService.delete(menuItemId);
        return ResponseEntity.noContent().build();
    }
}
