package com.ambatucode.dikichi.order.service;

import static com.ambatucode.dikichi.order.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.order.config.CallerContext;
import com.ambatucode.dikichi.order.dto.catalog.CatalogValidateResponse.CatalogItem;
import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.Role;
import com.ambatucode.dikichi.order.exception.ApiException;
import com.ambatucode.dikichi.order.repository.OrderRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

class OrderServiceTest {

    private static final UUID MENU_MIE = UUID.fromString("11111111-0000-4000-8000-000000000001");
    private static final UUID MENU_TEH = UUID.fromString("11111111-0000-4000-8000-000000000009");

    private final OrderRepository orders = mock(OrderRepository.class);
    private final CatalogClient catalogClient = mock(CatalogClient.class);
    private final TransactionTemplate transactionTemplate = mock(TransactionTemplate.class);
    private final CallerContext caller = new CallerContext();
    private final OrderService service = new OrderService(orders, catalogClient, transactionTemplate, caller);

    @BeforeEach
    void setUp() {
        when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            return callback.doInTransaction(mock(TransactionStatus.class));
        });
        when(orders.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void createComputesTotalAndKeepsNameAndPriceSnapshots() {
        List<CatalogItem> catalogItems = List.of(
                new CatalogItem(MENU_MIE, "Mie Suit", 25000),
                new CatalogItem(MENU_TEH, "Es Teh Manis", 6000));
        when(catalogClient.validate(eq("OUT-01"), eq("T-01"), any())).thenReturn(catalogItems);
        when(orders.nextOrderSequence()).thenReturn(42L);
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 2), new OrderItemRequest(MENU_TEH, 3)));

        Order order = service.create(command);

        assertThat(order.getOrderNumber()).isEqualTo("ORD-0042");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.getOutletId()).isEqualTo("OUT-01");
        assertThat(order.getTableCode()).isEqualTo("T-01");
        assertThat(order.getCustomerName()).isEqualTo("Budi");
        assertThat(order.getTotalAmount()).isEqualTo(68000L);
        assertThat(order.getItems()).extracting(OrderItem::getMenuItemName)
                .containsExactlyInAnyOrder("Mie Suit", "Es Teh Manis");
        assertThat(order.getItems()).extracting(OrderItem::getSubtotal)
                .containsExactlyInAnyOrder(50000L, 18000L);
        verify(catalogClient).validate(eq("OUT-01"), eq("T-01"), eq(command.items()));
    }

    @Test
    void orderNumberKeepsGrowingBeyondFourDigits() {
        when(catalogClient.validate(any(), any(), any()))
                .thenReturn(List.of(new CatalogItem(MENU_MIE, "Mie Suit", 25000)));
        when(orders.nextOrderSequence()).thenReturn(12345L);

        Order order = service.create(new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1))));

        assertThat(order.getOrderNumber()).isEqualTo("ORD-12345");
    }

    @Test
    void duplicateMenuItemIsRejectedBeforeCatalogIsCalled() {
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1), new OrderItemRequest(MENU_MIE, 2)));

        ApiException error = assertApiError(() -> service.create(command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("DUPLICATE_MENU_ITEM");
        assertThat(error.getErrors()).hasSize(1);
        assertThat(error.getErrors().get(0).field()).isEqualTo("items[1].menuItemId");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void catalogRejectionPreventsPersistence() {
        when(catalogClient.validate(any(), any(), any())).thenThrow(
                new ApiException(HttpStatus.CONFLICT, "ITEM_UNAVAILABLE", "One or more items are unavailable", List.of()));

        ApiException error = assertApiError(() -> service.create(new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)))));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ITEM_UNAVAILABLE");
        verify(orders, never()).save(any(Order.class));
    }

    @Test
    void cashierListsPendingAndAcceptedByDefault() {
        caller.populate(Role.CASHIER, "OUT-01");

        service.list(null, null);

        verify(orders).findByOutletIdAndStatusInOrderByCreatedAtAsc(
                eq("OUT-01"), eq(Set.of(OrderStatus.PENDING, OrderStatus.ACCEPTED)));
    }

    @Test
    void kitchenListsPreparingAndReadyByDefault() {
        caller.populate(Role.KITCHEN, "OUT-01");

        service.list(null, null);

        verify(orders).findByOutletIdAndStatusInOrderByCreatedAtAsc(
                eq("OUT-01"), eq(Set.of(OrderStatus.PREPARING, OrderStatus.READY)));
    }

    @Test
    void explicitStatusInsideRoleQueueIsAllowed() {
        caller.populate(Role.CASHIER, "OUT-01");

        service.list("OUT-01", OrderStatus.PENDING);

        verify(orders).findByOutletIdAndStatusInOrderByCreatedAtAsc(eq("OUT-01"), eq(Set.of(OrderStatus.PENDING)));
    }

    @Test
    void statusOutsideRoleQueueIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.list(null, OrderStatus.PREPARING));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void listingAnotherOutletIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");

        ApiException error = assertApiError(() -> service.list("OUT-02", null));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void masterCannotListOrders() {
        caller.populate(Role.MASTER, null);

        ApiException error = assertApiError(() -> service.list(null, null));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void anonymousCallerCannotListOrders() {
        ApiException error = assertApiError(() -> service.list(null, null));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void getUnknownOrderReturnsNotFound() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.get(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void getOrderFromAnotherOutletIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id))
                .thenReturn(Optional.of(new Order("ORD-0001", "OUT-02", "T-01", "Budi")));

        ApiException error = assertApiError(() -> service.get(id));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void getOrderReturnsOrderOfTheSameOutlet() {
        caller.populate(Role.KITCHEN, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        Order found = service.get(id);

        assertThat(found).isSameAs(stored);
    }
}
