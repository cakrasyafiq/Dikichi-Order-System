package com.ambatucode.dikichi.order.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.ambatucode.dikichi.order.config.CallerContext;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.PaymentMethod;
import com.ambatucode.dikichi.order.repository.MockPaymentRepository;
import com.ambatucode.dikichi.order.repository.OrderRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PaymentServiceLookupTest {

    private final MockPaymentRepository payments = mock(MockPaymentRepository.class);
    private final PaymentService service =
            new PaymentService(mock(OrderRepository.class), payments, new CallerContext());

    @Test
    void findByOrderIdDelegatesToTheRepository() {
        UUID orderId = UUID.randomUUID();
        MockPayment payment = new MockPayment(orderId, PaymentMethod.CARD, null, null, 50000L);
        when(payments.findByOrderId(orderId)).thenReturn(Optional.of(payment));

        assertThat(service.findByOrderId(orderId)).containsSame(payment);
    }

    @Test
    void findByOrderIdsIndexesPaymentsByOrderId() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        MockPayment payment = new MockPayment(first, PaymentMethod.QRIS, null, null, 50000L);
        when(payments.findByOrderIdIn(List.of(first, second))).thenReturn(List.of(payment));

        Map<UUID, MockPayment> result = service.findByOrderIds(List.of(first, second));

        assertThat(result).containsOnlyKeys(first).containsEntry(first, payment);
        verify(payments).findByOrderIdIn(List.of(first, second));
    }

    @Test
    void findByOrderIdsSkipsTheQueryForAnEmptyQueue() {
        assertThat(service.findByOrderIds(List.of())).isEmpty();
        verifyNoInteractions(payments);
    }
}
