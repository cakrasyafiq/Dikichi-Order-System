package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.MenuItemCreateRequest;
import com.ambatucode.dikichi.catalog.dto.MenuItemResponse;
import com.ambatucode.dikichi.catalog.entity.MenuItem;
import com.ambatucode.dikichi.catalog.entity.Outlet;
import com.ambatucode.dikichi.catalog.entity.Role;
import com.ambatucode.dikichi.catalog.exception.ApiException;
import com.ambatucode.dikichi.catalog.repository.MenuItemRepository;
import com.ambatucode.dikichi.catalog.repository.OutletRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class MenuItemServiceTest {

    private final MenuItemRepository menuItems = mock(MenuItemRepository.class);
    private final OutletRepository outlets = mock(OutletRepository.class);
    private final CallerContext caller = new CallerContext();
    private final MenuItemService service = new MenuItemService(menuItems, outlets, caller);

    @BeforeEach
    void setUp() {
        when(outlets.findByIdAndDeletedFalse("OUT-01")).thenReturn(Optional.of(new Outlet("OUT-01", "Dikichi 01", "Jl. A")));
        when(outlets.findByIdAndDeletedFalse("OUT-404")).thenReturn(Optional.empty());
        when(menuItems.save(any(MenuItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void newMenuItemIsAvailableByDefault() {
        caller.populate(Role.MASTER, null);

        MenuItemResponse response = service.create("OUT-01",
                new MenuItemCreateRequest(" Mie Suit ", "Mie ayam", 25000, " Mie ", null));

        assertThat(response.available()).isTrue();
        assertThat(response.name()).isEqualTo("Mie Suit");
        assertThat(response.category()).isEqualTo("Mie");
        assertThat(response.price()).isEqualTo(25000);
        assertThat(response.outletId()).isEqualTo("OUT-01");
    }

    @Test
    void explicitAvailabilityIsKept() {
        caller.populate(Role.MASTER, null);

        MenuItemResponse response = service.create("OUT-01",
                new MenuItemCreateRequest("Lumpia", null, 19000, "Dimsum", false));

        assertThat(response.available()).isFalse();
        assertThat(response.description()).isNull();
    }

    @Test
    void nonMasterCannotCreateMenuItem() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.create("OUT-01",
                new MenuItemCreateRequest("Mie", null, 25000, "Mie", true)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(menuItems, never()).save(any(MenuItem.class));
    }

    @Test
    void creatingMenuItemInUnknownOutletReturnsNotFound() {
        caller.populate(Role.MASTER, null);

        ApiException error = assertApiError(() -> service.create("OUT-404",
                new MenuItemCreateRequest("Mie", null, 25000, "Mie", true)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listForUnknownOutletReturnsNotFound() {
        ApiException error = assertApiError(() -> service.listByOutlet("OUT-404"));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void listKeepsRepositoryOrderAndIncludesSoldOutItems() {
        when(menuItems.findByOutletIdAndDeletedFalseOrderByCategoryAscNameAsc("OUT-01")).thenReturn(List.of(
                new MenuItem("OUT-01", "Lumpia", null, 19000, "Dimsum", false),
                new MenuItem("OUT-01", "Mie Suit", "Mie ayam", 25000, "Mie", true)));

        List<MenuItemResponse> response = service.listByOutlet("OUT-01");

        assertThat(response).extracting(MenuItemResponse::name).containsExactly("Lumpia", "Mie Suit");
        assertThat(response).extracting(MenuItemResponse::available).containsExactly(false, true);
    }

    @Test
    void getReturnsMenuItem() {
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id))
                .thenReturn(Optional.of(new MenuItem("OUT-01", "Mie Suit", "Mie ayam", 25000, "Mie", true)));

        MenuItemResponse response = service.get(id);

        assertThat(response.name()).isEqualTo("Mie Suit");
        assertThat(response.price()).isEqualTo(25000);
    }

    @Test
    void getUnknownMenuItemReturnsNotFound() {
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.get(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }
}
