package com.ambatucode.dikichi.order.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.order.controller.v2.OrderV2Controller;
import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.dto.common.OrderStatusPatchRequest;
import com.ambatucode.dikichi.order.dto.common.PaymentRequest;
import com.ambatucode.dikichi.order.dto.v2.PaymentStatus;
import com.ambatucode.dikichi.order.dto.v2.V2OrderRequest;
import com.ambatucode.dikichi.order.dto.v2.V2OrderResponse;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.PaymentMethod;
import com.ambatucode.dikichi.order.service.CreateOrderCommand;
import com.ambatucode.dikichi.order.service.OrderService;
import com.ambatucode.dikichi.order.service.PaymentService;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;

class OrderV2ControllerTest {

    private static final UUID MENU_MIE = UUID.fromString("11111111-0000-4000-8000-000000000001");

    private final OrderService orderService = mock(OrderService.class);
    private final PaymentService paymentService = mock(PaymentService.class);
    private final OrderV2Controller controller = new OrderV2Controller(orderService, paymentService);

    private static Order order(String number, OrderStatus status) {
        Order order = new Order(number, "OUT-01", "T-01", "Budi");
        order.addItem(new OrderItem(MENU_MIE, "Mie Suit", 25000, 2));
        order.changeStatus(status);
        ReflectionTestUtils.setField(order, "id", UUID.randomUUID());
        return order;
    }

    @Test
    void createReturns201WithLocationAndUnpaidNestedBody() {
        Order created = order("ORD-0001", OrderStatus.PENDING);
        when(orderService.create(org.mockito.ArgumentMatchers.any(CreateOrderCommand.class))).thenReturn(created);
        V2OrderRequest request = new V2OrderRequest(new V2OrderRequest.Customer("Budi"),
                new V2OrderRequest.Location("OUT-01", "T-01"), List.of(new OrderItemRequest(MENU_MIE, 2)));

        ResponseEntity<V2OrderResponse> response = controller.create(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).hasToString("/api/v2/orders/" + created.getId());
        assertThat(response.getBody().customer().name()).isEqualTo("Budi");
        assertThat(response.getBody().location().tableCode()).isEqualTo("T-01");
        assertThat(response.getBody().paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        ArgumentCaptor<CreateOrderCommand> captor = ArgumentCaptor.forClass(CreateOrderCommand.class);
        verify(orderService).create(captor.capture());
        assertThat(captor.getValue().outletId()).isEqualTo("OUT-01");
        assertThat(captor.getValue().customerName()).isEqualTo("Budi");
        verify(paymentService, never()).findByOrderId(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void listLoadsPaymentsForTheWholeQueueWithOneLookup() {
        Order paid = order("ORD-0001", OrderStatus.PREPARING);
        Order unpaid = order("ORD-0002", OrderStatus.ACCEPTED);
        when(orderService.list("OUT-01", null)).thenReturn(List.of(paid, unpaid));
        MockPayment payment = new MockPayment(paid.getId(), PaymentMethod.CASH, 60000L, 10000L, 50000L);
        when(paymentService.findByOrderIds(List.of(paid.getId(), unpaid.getId())))
                .thenReturn(Map.of(paid.getId(), payment));

        List<V2OrderResponse> response = controller.list("OUT-01", null);

        assertThat(response).hasSize(2);
        assertThat(response.get(0).paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.get(0).paymentSummary().change()).isEqualTo(10000L);
        assertThat(response.get(1).paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        verify(paymentService).findByOrderIds(List.of(paid.getId(), unpaid.getId()));
        verify(paymentService, never()).findByOrderId(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void getReturnsOrderInV2ShapeWithPaymentWhenPresent() {
        Order order = order("ORD-0003", OrderStatus.PREPARING);
        when(orderService.get(order.getId())).thenReturn(order);
        when(paymentService.findByOrderId(order.getId())).thenReturn(Optional.of(
                new MockPayment(order.getId(), PaymentMethod.QRIS, null, null, 50000L)));

        V2OrderResponse response = controller.get(order.getId());

        assertThat(response.id()).isEqualTo(order.getId());
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().paymentMethod()).isEqualTo(PaymentMethod.QRIS);
    }

    @Test
    void getReturnsUnpaidSummaryWhenNoPaymentExists() {
        Order order = order("ORD-0004", OrderStatus.PENDING);
        when(orderService.get(order.getId())).thenReturn(order);
        when(paymentService.findByOrderId(order.getId())).thenReturn(Optional.empty());

        V2OrderResponse response = controller.get(order.getId());

        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
    }

    @Test
    void payReturnsPreparingOrderWithPaidSummary() {
        Order order = order("ORD-0005", OrderStatus.PREPARING);
        PaymentRequest request = new PaymentRequest(PaymentMethod.CASH, 60000L);
        when(paymentService.pay(order.getId(), request)).thenReturn(order);
        when(paymentService.findByOrderId(order.getId())).thenReturn(Optional.of(
                new MockPayment(order.getId(), PaymentMethod.CASH, 60000L, 10000L, 50000L)));

        V2OrderResponse response = controller.pay(order.getId(), request);

        assertThat(response.status()).isEqualTo(OrderStatus.PREPARING);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().amountTendered()).isEqualTo(60000L);
        assertThat(response.paymentSummary().change()).isEqualTo(10000L);
    }

    @Test
    void replaceDelegatesNestedRequestAndReturnsUnpaidV2Body() {
        Order replaced = order("ORD-0006", OrderStatus.PENDING);
        when(orderService.replace(org.mockito.ArgumentMatchers.eq(replaced.getId()),
                org.mockito.ArgumentMatchers.any(CreateOrderCommand.class))).thenReturn(replaced);
        V2OrderRequest request = new V2OrderRequest(new V2OrderRequest.Customer("Budi Santoso"),
                new V2OrderRequest.Location("OUT-01", "T-05"), List.of(new OrderItemRequest(MENU_MIE, 1)));

        V2OrderResponse response = controller.replace(replaced.getId(), request);

        ArgumentCaptor<CreateOrderCommand> captor = ArgumentCaptor.forClass(CreateOrderCommand.class);
        verify(orderService).replace(org.mockito.ArgumentMatchers.eq(replaced.getId()), captor.capture());
        assertThat(captor.getValue().outletId()).isEqualTo("OUT-01");
        assertThat(captor.getValue().tableCode()).isEqualTo("T-05");
        assertThat(captor.getValue().customerName()).isEqualTo("Budi Santoso");
        assertThat(response.id()).isEqualTo(replaced.getId());
        assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        verify(paymentService, never()).findByOrderId(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateStatusReturnsUnpaidSummaryWhenOrderIsCancelledWithoutPayment() {
        Order cancelled = order("ORD-0007", OrderStatus.CANCELLED);
        OrderStatusPatchRequest request = new OrderStatusPatchRequest("CANCELLED");
        when(orderService.updateStatus(cancelled.getId(), request)).thenReturn(cancelled);
        when(paymentService.findByOrderId(cancelled.getId())).thenReturn(Optional.empty());

        V2OrderResponse response = controller.updateStatus(cancelled.getId(), request);

        assertThat(response.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        assertThat(response.paymentSummary().paymentMethod()).isNull();
    }

    @Test
    void updateStatusReturnsPaidSummaryWhenOrderAlreadyHasPayment() {
        Order ready = order("ORD-0008", OrderStatus.READY);
        OrderStatusPatchRequest request = new OrderStatusPatchRequest("READY");
        when(orderService.updateStatus(ready.getId(), request)).thenReturn(ready);
        when(paymentService.findByOrderId(ready.getId())).thenReturn(Optional.of(
                new MockPayment(ready.getId(), PaymentMethod.CASH, 60000L, 10000L, 50000L)));

        V2OrderResponse response = controller.updateStatus(ready.getId(), request);

        assertThat(response.status()).isEqualTo(OrderStatus.READY);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().change()).isEqualTo(10000L);
    }

    @Test
    void controllerMapsPutAndPatchButNeverDelete() {
        List<Method> methods = Arrays.asList(OrderV2Controller.class.getDeclaredMethods());

        assertThat(methods).anyMatch(method -> method.isAnnotationPresent(PutMapping.class));
        assertThat(methods).anyMatch(method -> method.isAnnotationPresent(PatchMapping.class));
        // WHY: orders are financial records, so DELETE must stay unmapped and answer 405 METHOD_NOT_ALLOWED
        assertThat(methods).noneMatch(method -> method.isAnnotationPresent(DeleteMapping.class));
    }
}
