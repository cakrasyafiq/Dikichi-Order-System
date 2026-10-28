package com.ambatucode.dikichi.order.service;

import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.Role;
import java.util.Map;
import java.util.Set;

public final class OrderStateMachine {

    private static final Set<OrderStatus> CASHIER_QUEUE = Set.of(OrderStatus.PENDING, OrderStatus.ACCEPTED);
    private static final Set<OrderStatus> KITCHEN_QUEUE = Set.of(OrderStatus.PREPARING, OrderStatus.READY);

    private static final Set<OrderStatus> NEVER_PATCHABLE = Set.of(OrderStatus.PENDING, OrderStatus.PREPARING);

    private static final Map<Role, Set<OrderStatus>> TARGETS_BY_ROLE = Map.of(
            Role.CASHIER, Set.of(OrderStatus.ACCEPTED, OrderStatus.CANCELLED),
            Role.KITCHEN, Set.of(OrderStatus.READY, OrderStatus.COMPLETED));

    // WHY: ACCEPTED to PREPARING is absent because only the pay endpoint may perform it
    private static final Map<OrderStatus, Set<OrderStatus>> PATCH_TRANSITIONS = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.ACCEPTED, OrderStatus.CANCELLED),
            OrderStatus.ACCEPTED, Set.of(OrderStatus.CANCELLED),
            OrderStatus.PREPARING, Set.of(OrderStatus.READY),
            OrderStatus.READY, Set.of(OrderStatus.COMPLETED));

    private OrderStateMachine() {
    }

    public static Set<OrderStatus> queueFor(Role role) {
        return role == Role.KITCHEN ? KITCHEN_QUEUE : CASHIER_QUEUE;
    }

    public static boolean isPayable(OrderStatus status) {
        return status == OrderStatus.ACCEPTED;
    }

    public static boolean isEditable(OrderStatus status) {
        return status == OrderStatus.PENDING;
    }

    public static boolean isNeverPatchable(OrderStatus target) {
        return NEVER_PATCHABLE.contains(target);
    }

    public static boolean roleOwns(Role role, OrderStatus target) {
        return TARGETS_BY_ROLE.getOrDefault(role, Set.of()).contains(target);
    }

    public static boolean allows(OrderStatus from, OrderStatus to) {
        return PATCH_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }
}
