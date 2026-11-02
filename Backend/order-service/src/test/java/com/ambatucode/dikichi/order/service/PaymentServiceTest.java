package com.ambatucode.dikichi.order.service;

import static com.ambatucode.dikichi.order.support.ApiAssertions.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.order.config.CallerContext;
import com.ambatucode.dikichi.order.dto.common.PaymentRequest;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.PaymentMethod;
import com.ambatucode.dikichi.order.entity.Role;
import com.ambatucode.dikichi.order.exception.ApiException;
import com.ambatucode.dikichi.order.repository.MockPaymentRepository;
import com.ambatucode.dikichi.order.repository.OrderRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

class PaymentServiceTest {

    private final OrderRepository orders = mock(OrderRepository.class);
    private final MockPaymentRepository payments = mock(MockPaymentRepository.class);
    private final CallerContext caller = new CallerContext();
    private final PaymentService service = new PaymentService(orders, payments, caller);
    private final UUID orderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        caller.populate(Role.CASHIER, "OUT-01");
        when(orders.saveAndFlush(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Order storedOrder(OrderStatus status) {
        Order order = new Order("ORD-0001", "OUT-01", "T-01", "Budi");
        order.addItem(new OrderItem(UUID.randomUUID(), "Mie Suit", 25000, 2));
        order.changeStatus(status);
        when(orders.findWithItemsById(orderId)).thenReturn(Optional.of(order));
        return order;
    }

    @Test
    void cashPaymentMovesOrderToPreparingAndStoresChange() {
        Order order = storedOrder(OrderStatus.ACCEPTED);

        Order paid = service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L));

        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PREPARING);
        assertThat(paid).isSameAs(order);
        ArgumentCaptor<MockPayment> captor = ArgumentCaptor.forClass(MockPayment.class);
        verify(payments).save(captor.capture());
        assertThat(captor.getValue().getPaymentMethod()).isEqualTo(PaymentMethod.CASH);
        assertThat(captor.getValue().getChangeAmount()).isEqualTo(10000L);
    }

    @Test
    void exactCashPaymentHasZeroChange() {
        storedOrder(OrderStatus.ACCEPTED);

        service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 50000L));

        ArgumentCaptor<MockPayment> captor = ArgumentCaptor.forClass(MockPayment.class);
        verify(payments).save(captor.capture());
        assertThat(captor.getValue().getChangeAmount()).isEqualTo(0L);
    }

    @Test
    void cashBelowTheTotalIsRejected() {
        storedOrder(OrderStatus.ACCEPTED);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 40000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(error.getErrors().get(0).field()).isEqualTo("amountTendered");
        verify(payments, never()).save(any(MockPayment.class));
    }

    @Test
    void cashWithoutTenderedAmountIsRejected() {
        storedOrder(OrderStatus.ACCEPTED);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, null)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void cardWithTenderedAmountIsRejected() {
        storedOrder(OrderStatus.ACCEPTED);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CARD, 50000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(error.getErrors().get(0).field()).isEqualTo("amountTendered");
    }

    @Test
    void qrisPaymentStoresNoChange() {
        storedOrder(OrderStatus.ACCEPTED);

        Order paid = service.pay(orderId, new PaymentRequest(PaymentMethod.QRIS, null));

        assertThat(paid.getStatus()).isEqualTo(OrderStatus.PREPARING);
        ArgumentCaptor<MockPayment> captor = ArgumentCaptor.forClass(MockPayment.class);
        verify(payments).save(captor.capture());
        assertThat(captor.getValue().getChangeAmount()).isNull();
    }

    @Test
    void secondPaymentOnTheSameOrderIsRejected() {
        storedOrder(OrderStatus.PREPARING);
        when(payments.existsByOrderId(orderId)).thenReturn(true);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("ORDER_ALREADY_PAID");
    }

    @Test
    void pendingOrderCannotBePaid() {
        storedOrder(OrderStatus.PENDING);

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(error.getCode()).isEqualTo("INVALID_STATUS_TRANSITION");
    }

    @Test
    void onlyCashierMayPay() {
        storedOrder(OrderStatus.ACCEPTED);
        caller.populate(Role.KITCHEN, "OUT-01");

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void cashierOfAnotherOutletCannotPay() {
        storedOrder(OrderStatus.ACCEPTED);
        caller.populate(Role.CASHIER, "OUT-02");

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void payingAnUnknownOrderReturnsNotFound() {
        when(orders.findWithItemsById(orderId)).thenReturn(Optional.empty());

        ApiException error = assertApiError(() -> service.pay(orderId, new PaymentRequest(PaymentMethod.CASH, 60000L)));

        assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
