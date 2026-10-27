package com.ambatucode.dikichi.order.service;

import com.ambatucode.dikichi.order.config.CallerContext;
import com.ambatucode.dikichi.order.dto.common.ErrorDetail;
import com.ambatucode.dikichi.order.dto.common.PaymentRequest;
import com.ambatucode.dikichi.order.entity.MockPayment;
import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.PaymentMethod;
import com.ambatucode.dikichi.order.entity.Role;
import com.ambatucode.dikichi.order.exception.ApiException;
import com.ambatucode.dikichi.order.repository.MockPaymentRepository;
import com.ambatucode.dikichi.order.repository.OrderRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final OrderRepository orders;
    private final MockPaymentRepository payments;
    private final CallerContext caller;

    public PaymentService(OrderRepository orders, MockPaymentRepository payments, CallerContext caller) {
        this.orders = orders;
        this.payments = payments;
        this.caller = caller;
    }

    @Transactional
    public Order pay(UUID orderId, PaymentRequest request) {
        caller.requireRole(Role.CASHIER);
        Order order = orders.findWithItemsById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));
        caller.requireSameOutlet(order.getOutletId());
        validateTender(order, request);

        if (payments.existsByOrderId(orderId)) {
            throw ApiException.conflict("ORDER_ALREADY_PAID", "Order has already been paid");
        }
        if (!OrderStateMachine.isPayable(order.getStatus())) {
            throw ApiException.conflict("INVALID_STATUS_TRANSITION", "Only ACCEPTED orders can be paid");
        }

        boolean cash = request.paymentMethod() == PaymentMethod.CASH;
        Long tendered = cash ? request.amountTendered() : null;
        Long change = cash ? tendered - order.getTotalAmount() : null;
        payments.save(new MockPayment(orderId, request.paymentMethod(), tendered, change, order.getTotalAmount()));

        order.markPreparing();
        return orders.saveAndFlush(order);
    }

    private static void validateTender(Order order, PaymentRequest request) {
        boolean cash = request.paymentMethod() == PaymentMethod.CASH;
        Long tendered = request.amountTendered();
        if (cash && (tendered == null || tendered < order.getTotalAmount())) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request validation failed",
                    List.of(new ErrorDetail("amountTendered", "must be at least the order total for CASH")));
        }
        if (!cash && tendered != null) {
            throw ApiException.badRequest("VALIDATION_ERROR", "Request validation failed",
                    List.of(new ErrorDetail("amountTendered", "must be null for QRIS and CARD")));
        }
    }
}
