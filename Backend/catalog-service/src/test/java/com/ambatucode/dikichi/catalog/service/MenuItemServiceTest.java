package com.ambatucode.dikichi.catalog.service;

import static com.ambatucode.dikichi.catalog.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.catalog.config.CallerContext;
import com.ambatucode.dikichi.catalog.dto.AvailabilityPatchRequest;
import com.ambatucode.dikichi.catalog.dto.MenuItemCreateRequest;
import com.ambatucode.dikichi.catalog.dto.MenuItemReplaceRequest;
import com.ambatucode.dikichi.catalog.dto.MenuItemResponse;
import com.ambatucode.dikichi.catalog.entity.MenuItem;
import com.ambatucode.dikichi.catalog.entity.Outlet;
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
        caller.populate("OUT-01");

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
        caller.populate("OUT-01");

        MenuItemResponse response = service.create("OUT-01",
                new MenuItemCreateRequest("Lumpia", null, 19000, "Dimsum", false));

        assertThat(response.available()).isFalse();
        assertThat(response.description()).isNull();
        assertThat(response.imageUrl()).isNull();
    }

    @Test
    void createTrimsAndPersistsImageUrlAndNormalizesBlankToNull() {
        caller.populate("OUT-01");

        MenuItemResponse withImage = service.create("OUT-01",
                new MenuItemCreateRequest("Crispy Chicken", "Original", 10000, "makanan",
                        "  /api/v1/menu-images/menu_1.png  ", true));
        MenuItemResponse blankImage = service.create("OUT-01",
                new MenuItemCreateRequest("Nasi Putih", "Nasi", 5000, "makanan", "   ", true));

        assertThat(withImage.imageUrl()).isEqualTo("/api/v1/menu-images/menu_1.png");
        assertThat(blankImage.imageUrl()).isNull();
    }

    @Test
    void anotherOutletCannotCreateMenuItem() {
        caller.populate("OUT-02");

        ApiException error = assertApiError(() -> service.create("OUT-01",
                new MenuItemCreateRequest("Mie", null, 25000, "Mie", true)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        verify(menuItems, never()).save(any(MenuItem.class));
    }

    @Test
    void creatingMenuItemInUnknownOutletReturnsNotFound() {
        caller.populate("OUT-404");

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

    @Test
    void outletAdminReplacesOwnMenuItemWithTrimmedFields() {
        caller.populate("OUT-01");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-01", "Lama", null, 15000, "Lama", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        MenuItemResponse response = service.replace(id,
                new MenuItemReplaceRequest("  Mie Spesial  ", "Pedas manis", 28000, "  Mie  ",
                        "  /api/v1/menu-images/menu_3.png  ", false));

        assertThat(response.name()).isEqualTo("Mie Spesial");
        assertThat(response.description()).isEqualTo("Pedas manis");
        assertThat(response.price()).isEqualTo(28000);
        assertThat(response.category()).isEqualTo("Mie");
        assertThat(response.imageUrl()).isEqualTo("/api/v1/menu-images/menu_3.png");
        assertThat(response.available()).isFalse();
    }

    @Test
    void replacingUnknownMenuItemReturnsNotFound() {
        caller.populate("OUT-01");
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.replace(id,
                new MenuItemReplaceRequest("Mie", null, 25000, "Mie", true)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void anotherOutletCannotReplaceMenuItem() {
        caller.populate("OUT-02");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-01", "Lama", null, 15000, "Lama", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        ApiException error = assertApiError(() -> service.replace(id,
                new MenuItemReplaceRequest("Mie", null, 25000, "Mie", true)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void outletAdminCanChangeAvailabilityInOwnOutlet() {
        caller.populate("OUT-01");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-01", "Mie Suit", null, 25000, "Mie", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        MenuItemResponse response = service.changeAvailability(id, new AvailabilityPatchRequest(false));

        assertThat(response.available()).isFalse();
    }

    @Test
    void anotherOutletCannotChangeAvailability() {
        caller.populate("OUT-01");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-02", "Mie Suit", null, 25000, "Mie", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        ApiException error = assertApiError(() -> service.changeAvailability(id, new AvailabilityPatchRequest(false)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
        assertThat(existing.isAvailable()).isTrue();
    }

    @Test
    void anonymousCallerCannotChangeAvailability() {
        UUID id = UUID.randomUUID();

        ApiException error = assertApiError(() -> service.changeAvailability(id, new AvailabilityPatchRequest(false)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void changingAvailabilityOfUnknownMenuItemReturnsNotFound() {
        caller.populate("OUT-01");
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.changeAvailability(id, new AvailabilityPatchRequest(false)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void outletAdminDeletesOwnMenuItemWithSoftDelete() {
        caller.populate("OUT-01");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-01", "Mie Suit", null, 25000, "Mie", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        service.delete(id);

        assertThat(existing).extracting("deleted").isEqualTo(true);
    }

    @Test
    void deletingUnknownMenuItemReturnsNotFound() {
        caller.populate("OUT-01");
        UUID id = UUID.randomUUID();
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.delete(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void anotherOutletCannotDeleteMenuItem() {
        caller.populate("OUT-02");
        UUID id = UUID.randomUUID();
        MenuItem existing = new MenuItem("OUT-01", "Mie Suit", null, 25000, "Mie", true);
        when(menuItems.findByIdAndDeletedFalse(id)).thenReturn(Optional.of(existing));

        ApiException error = assertApiError(() -> service.delete(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }
}
