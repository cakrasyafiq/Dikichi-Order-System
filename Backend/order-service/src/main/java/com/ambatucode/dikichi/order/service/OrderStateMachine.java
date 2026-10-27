package com.ambatucode.dikichi.order.service;

import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.Role;
import java.util.Set;

public final class OrderStateMachine {

    private static final Set<OrderStatus> CASHIER_QUEUE = Set.of(OrderStatus.PENDING, OrderStatus.ACCEPTED);
    private static final Set<OrderStatus> KITCHEN_QUEUE = Set.of(OrderStatus.PREPARING, OrderStatus.READY);

    private OrderStateMachine() {
    }

    public static Set<OrderStatus> queueFor(Role role) {
        return role == Role.KITCHEN ? KITCHEN_QUEUE : CASHIER_QUEUE;
    }

    public static boolean isPayable(OrderStatus status) {
        return status == OrderStatus.ACCEPTED;
    }
}
