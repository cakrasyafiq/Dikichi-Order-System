package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.dto.ErrorDetail;
import com.ambatucode.dikichi.catalog.dto.InternalValidateRequest;
import com.ambatucode.dikichi.catalog.dto.InternalValidateRequest.Line;
import com.ambatucode.dikichi.catalog.dto.InternalValidateResponse;
import com.ambatucode.dikichi.catalog.entity.MenuItem;
import com.ambatucode.dikichi.catalog.entity.Outlet;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.DiningTableRepository;
import com.ambatucode.dikichi.catalog.repository.MenuItemRepository;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class OrderValidationServiceTest {

    private final OutletRepository outlets = mock(OutletRepository.class);
    private final DiningTableRepository tables = mock(DiningTableRepository.class);
    private final MenuItemRepository menuItems = mock(MenuItemRepository.class);
    private final OrderValidationService service = new OrderValidationService(outlets, tables, menuItems);

    private final UUID mieId = UUID.randomUUID();
    private final UUID tehId = UUID.randomUUID();
    private final UUID lumpiaId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(new Outlet("OUT-01", "Dikichi 01", "Jl. A")));
        when(tables.existsByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-01")).thenReturn(true);
    }

    private static MenuItem menuItem(UUID id, String outletId, String name, int price, boolean available) {
        MenuItem item = mock(MenuItem.class);
        when(item.getId()).thenReturn(id);
        when(item.getOutletId()).thenReturn(outletId);
        when(item.getName()).thenReturn(name);
        when(item.getPrice()).thenReturn(price);
        when(item.isAvailable()).thenReturn(available);
        return item;
    }

    private static InternalValidateRequest request(UUID... ids) {
        List<Line> lines = java.util.Arrays.stream(ids).map(id -> new Line(id, 1)).toList();
        return new InternalValidateRequest("OUT-01", "T-01", lines);
    }

    @Test
    void unknownOutletIsRejected() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.validate(request(mieId)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(error.getCode()).isEqualTo("INVALID_OUTLET");
    }

    @Test
    void unknownTableIsRejected() {
        when(tables.existsByOutletIdAndCodeAndDeletedFalse("OUT-01", "T-01")).thenReturn(false);

        ApiException error = assertApiError(() -> service.validate(request(mieId)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(error.getCode()).isEqualTo("INVALID_TABLE");
    }

    @Test
    void itemsOfAnotherOutletAreTreatedAsMissing() {
        when(menuItems.findByIdInAndDeletedFalse(any())).thenReturn(List.of(
                menuItem(mieId, "OUT-01", "Mie Suit", 25000, true),
                menuItem(tehId, "OUT-02", "Es Teh", 6000, true)));

        ApiException error = assertApiError(() -> service.validate(request(mieId, tehId)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(error.getCode()).isEqualTo("INVALID_MENU_ITEM");
        assertThat(error.getErrors()).extracting(ErrorDetail::field).containsExactly("items[1].menuItemId");
    }

    @Test
    void everyUnavailableItemIsReportedAtOnce() {
        when(menuItems.findByIdInAndDeletedFalse(any())).thenReturn(List.of(
                menuItem(mieId, "OUT-01", "Mie Suit", 25000, false),
                menuItem(tehId, "OUT-01", "Es Teh", 6000, true),
                menuItem(lumpiaId, "OUT-01", "Lumpia", 19000, false)));

        ApiException error = assertApiError(() -> service.validate(request(mieId, tehId, lumpiaId)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ITEM_UNAVAILABLE");
        assertThat(error.getErrors()).extracting(ErrorDetail::field)
                .containsExactly("items[0].menuItemId", "items[2].menuItemId");
    }

    @Test
    void missingItemTakesPrecedenceOverUnavailableItem() {
        when(menuItems.findByIdInAndDeletedFalse(any())).thenReturn(List.of(
                menuItem(mieId, "OUT-01", "Mie Suit", 25000, false)));

        ApiException error = assertApiError(() -> service.validate(request(mieId, tehId)));

        assertThat(error.getCode()).isEqualTo("INVALID_MENU_ITEM");
    }

    @Test
    void validRequestReturnsNamesAndPricesInRequestOrder() {
        when(menuItems.findByIdInAndDeletedFalse(any())).thenReturn(List.of(
                menuItem(mieId, "OUT-01", "Mie Suit", 25000, true),
                menuItem(tehId, "OUT-01", "Es Teh Manis", 6000, true)));

        InternalValidateResponse response = service.validate(request(tehId, mieId));

        assertThat(response.items()).extracting(InternalValidateResponse.ValidatedItem::name)
                .containsExactly("Es Teh Manis", "Mie Suit");
        assertThat(response.items()).extracting(InternalValidateResponse.ValidatedItem::unitPrice)
                .containsExactly(6000, 25000);
    }
}
