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
import com.ambatucode.dikichi.order.dto.common.OrderStatusPatchRequest;
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
        when(orders.saveAndFlush(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
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

    @Test
    void replaceUpdatesTableCustomerAndItemsAndRecalculatesTotal() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        stored.addItem(new OrderItem(MENU_MIE, "Mie Suit", 25000, 2));
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));
        when(catalogClient.validate(eq("OUT-01"), eq("T-05"), any())).thenReturn(List.of(
                new CatalogItem(MENU_MIE, "Mie Suit", 25000),
                new CatalogItem(MENU_TEH, "Es Teh Manis", 6000)));
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-05", "Budi Santoso",
                List.of(new OrderItemRequest(MENU_MIE, 1), new OrderItemRequest(MENU_TEH, 2)));

        Order replaced = service.replace(id, command);

        assertThat(replaced.getOrderNumber()).isEqualTo("ORD-0001");
        assertThat(replaced.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(replaced.getTableCode()).isEqualTo("T-05");
        assertThat(replaced.getCustomerName()).isEqualTo("Budi Santoso");
        assertThat(replaced.getTotalAmount()).isEqualTo(37000L);
        assertThat(replaced.getItems()).extracting(OrderItem::getQuantity).containsExactlyInAnyOrder(1, 2);
        verify(orders).flush();
        verify(orders).saveAndFlush(stored);
    }

    @Test
    void nonCashierCannotReplaceOrder() {
        caller.populate(Role.KITCHEN, "OUT-01");
        UUID id = UUID.randomUUID();
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
        verifyNoInteractions(orders, catalogClient);
    }

    @Test
    void replacingUnknownOrderReturnsNotFound() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.empty());
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void replacingOrderOfAnotherOutletIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-02", "T-01", "Budi")));
        CreateOrderCommand command = new CreateOrderCommand("OUT-02", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void replacingOrderWithDifferentOutletIsRejected() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-01", "T-01", "Budi")));
        CreateOrderCommand command = new CreateOrderCommand("OUT-02", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("OUTLET_IMMUTABLE");
        assertThat(error.getErrors().get(0).field()).isEqualTo("outletId");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void replacingNonPendingOrderIsRejected() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        stored.changeStatus(OrderStatus.ACCEPTED);
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ORDER_NOT_EDITABLE");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void replacingOrderWithDuplicateMenuItemIsRejectedBeforeCatalogCall() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-01", "T-01", "Budi")));
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1), new OrderItemRequest(MENU_MIE, 3)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("DUPLICATE_MENU_ITEM");
        verifyNoInteractions(catalogClient);
    }

    @Test
    void catalogRejectionOnReplacePreventsUpdate() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-01", "T-01", "Budi")));
        when(catalogClient.validate(any(), any(), any())).thenThrow(
                new ApiException(HttpStatus.CONFLICT, "ITEM_UNAVAILABLE", "One or more items are unavailable", List.of()));
        CreateOrderCommand command = new CreateOrderCommand("OUT-01", "T-01", "Budi",
                List.of(new OrderItemRequest(MENU_MIE, 1)));

        ApiException error = assertApiError(() -> service.replace(id, command));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ITEM_UNAVAILABLE");
        verify(orders, never()).saveAndFlush(any(Order.class));
    }

    @Test
    void cashierAcceptsPendingOrder() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        Order updated = service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED"));

        assertThat(updated.getStatus()).isEqualTo(OrderStatus.ACCEPTED);
        verify(orders).saveAndFlush(stored);
    }

    @Test
    void cashierCancelsPendingAndAcceptedOrders() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID pendingId = UUID.randomUUID();
        Order pending = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(pendingId)).thenReturn(Optional.of(pending));

        UUID acceptedId = UUID.randomUUID();
        Order accepted = new Order("ORD-0002", "OUT-01", "T-02", "Siti");
        accepted.changeStatus(OrderStatus.ACCEPTED);
        when(orders.findWithItemsById(acceptedId)).thenReturn(Optional.of(accepted));

        assertThat(service.updateStatus(pendingId, new OrderStatusPatchRequest("CANCELLED")).getStatus())
                .isEqualTo(OrderStatus.CANCELLED);
        assertThat(service.updateStatus(acceptedId, new OrderStatusPatchRequest("CANCELLED")).getStatus())
                .isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void kitchenMovesOrderFromPreparingToReadyAndCompleted() {
        caller.populate(Role.KITCHEN, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        stored.changeStatus(OrderStatus.PREPARING);
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        Order ready = service.updateStatus(id, new OrderStatusPatchRequest("READY"));
        assertThat(ready.getStatus()).isEqualTo(OrderStatus.READY);

        Order completed = service.updateStatus(id, new OrderStatusPatchRequest("COMPLETED"));
        assertThat(completed.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    }

    @Test
    void masterAndAnonymousCannotUpdateOrderStatus() {
        UUID id = UUID.randomUUID();

        ApiException anonError = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));
        assertThat(anonError.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);

        caller.populate(Role.MASTER, null);
        ApiException masterError = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));
        assertThat(masterError.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        verifyNoInteractions(orders);
    }

    @Test
    void blankOrUnknownStatusIsRejectedBeforeLookingUpOrder() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();

        ApiException blankError = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("  ")));
        assertThat(blankError.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(blankError.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(blankError.getErrors().get(0).field()).isEqualTo("status");

        ApiException unknownError = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("NOPE")));
        assertThat(unknownError.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(unknownError.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(unknownError.getErrors().get(0).field()).isEqualTo("status");
        verifyNoInteractions(orders);
    }

    @Test
    void updatingStatusOfUnknownOrderReturnsNotFound() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(error.getCode()).isEqualTo("NOT_FOUND");
    }

    @Test
    void updatingStatusOfOrderFromAnotherOutletIsForbidden() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(new Order("ORD-0001", "OUT-02", "T-01", "Budi")));

        ApiException error = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(error.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void patchingToPendingOrPreparingIsRejectedAsInvalidTransition() {
        caller.populate(Role.CASHIER, "OUT-01");
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        stored.changeStatus(OrderStatus.ACCEPTED);
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        ApiException pendingErr = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("PENDING")));
        assertThat(pendingErr.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(pendingErr.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");

        ApiException prepErr = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("PREPARING")));
        assertThat(prepErr.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(prepErr.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");
    }

    @Test
    void kitchenCannotCancelAndCashierCannotMarkReadyOrCompleted() {
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        caller.populate(Role.KITCHEN, "OUT-01");
        ApiException kitchenCancel = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("CANCELLED")));
        assertThat(kitchenCancel.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(kitchenCancel.getCode()).isEqualTo("FORBIDDEN");

        caller.populate(Role.CASHIER, "OUT-01");
        stored.changeStatus(OrderStatus.PREPARING);
        ApiException cashierReady = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("READY")));
        assertThat(cashierReady.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(cashierReady.getCode()).isEqualTo("FORBIDDEN");
    }

    @Test
    void disallowedTransitionFromCurrentStatusReturnsConflict() {
        UUID id = UUID.randomUUID();
        Order stored = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        when(orders.findWithItemsById(id)).thenReturn(Optional.of(stored));

        caller.populate(Role.CASHIER, "OUT-01");
        stored.changeStatus(OrderStatus.ACCEPTED);
        ApiException acceptAgain = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("ACCEPTED")));
        assertThat(acceptAgain.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(acceptAgain.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");

        caller.populate(Role.KITCHEN, "OUT-01");
        stored.changeStatus(OrderStatus.PREPARING);
        ApiException skipReady = assertApiError(() -> service.updateStatus(id, new OrderStatusPatchRequest("COMPLETED")));
        assertThat(skipReady.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(skipReady.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");
    }
}
