package com.ambatucode.dikichi.order.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.ambatucode.dikichi.order.dto.common.OrderItemRequest;
import com.ambatucode.dikichi.order.dto.v2.PaymentStatus;
import com.ambatucode.dikichi.order.dto.v2.V2OrderRequest;
import com.ambatucode.dikichi.order.dto.v2.V2OrderResponse;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderItem;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.PaymentMethod;
import com.ambatucode.dikichi.order.service.CreateOrderCommand;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OrderV2MapperTest {

    private static final UUID MENU_MIE = UUID.fromString("11111111-0000-4000-8000-000000000001");

    private static Order order() {
        Order order = new Order("ORD-0042", "OUT-01", "T-01", "Budi");
        order.addItem(new OrderItem(MENU_MIE, "Mie Suit", 25000, 2));
        return order;
    }

    @Test
    void requestIsFlattenedIntoTheSharedCreateCommand() {
        V2OrderRequest request = new V2OrderRequest(new V2OrderRequest.Customer("  Budi  "),
                new V2OrderRequest.Location("OUT-01", "T-01"), List.of(new OrderItemRequest(MENU_MIE, 2)));

        CreateOrderCommand command = OrderV2Mapper.toCommand(request);

        assertThat(command.outletId()).isEqualTo("OUT-01");
        assertThat(command.tableCode()).isEqualTo("T-01");
        assertThat(command.customerName()).isEqualTo("Budi");
        assertThat(command.items()).hasSize(1);
    }

    @Test
    void unpaidOrderHasUnpaidSummaryWithNullPaymentFields() {
        V2OrderResponse response = OrderV2Mapper.toResponse(order(), null);

        assertThat(response.orderNumber()).isEqualTo("ORD-0042");
        assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.customer().name()).isEqualTo("Budi");
        assertThat(response.location().outletId()).isEqualTo("OUT-01");
        assertThat(response.location().tableCode()).isEqualTo("T-01");
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).subtotal()).isEqualTo(50000L);
        assertThat(response.paymentSummary().totalAmount()).isEqualTo(50000L);
        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.UNPAID);
        assertThat(response.paymentSummary().paymentMethod()).isNull();
        assertThat(response.paymentSummary().amountTendered()).isNull();
        assertThat(response.paymentSummary().change()).isNull();
    }

    @Test
    void cashPaymentExposesMethodTenderedAndChange() {
        Order order = order();
        MockPayment payment = new MockPayment(UUID.randomUUID(), PaymentMethod.CASH, 60000L, 10000L, 50000L);

        V2OrderResponse response = OrderV2Mapper.toResponse(order, payment);

        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().paymentMethod()).isEqualTo(PaymentMethod.CASH);
        assertThat(response.paymentSummary().amountTendered()).isEqualTo(60000L);
        assertThat(response.paymentSummary().change()).isEqualTo(10000L);
    }

    @Test
    void nonCashPaymentKeepsTenderedAndChangeNull() {
        MockPayment payment = new MockPayment(UUID.randomUUID(), PaymentMethod.QRIS, null, null, 50000L);

        V2OrderResponse response = OrderV2Mapper.toResponse(order(), payment);

        assertThat(response.paymentSummary().paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(response.paymentSummary().paymentMethod()).isEqualTo(PaymentMethod.QRIS);
        assertThat(response.paymentSummary().amountTendered()).isNull();
        assertThat(response.paymentSummary().change()).isNull();
    }
}
