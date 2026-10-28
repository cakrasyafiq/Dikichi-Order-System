package com.ambatucode.dikichi.order.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.ambatucode.dikichi.order.entity.OrderStatus;
import com.ambatucode.dikichi.order.entity.Role;
import org.junit.jupiter.api.Test;

class OrderStateMachineTest {

    @Test
    void allowsOnlyDocumentedPatchTransitions() {
        assertTrue(OrderStateMachine.allows(OrderStatus.PENDING, OrderStatus.ACCEPTED));
        assertTrue(OrderStateMachine.allows(OrderStatus.PENDING, OrderStatus.CANCELLED));
        assertTrue(OrderStateMachine.allows(OrderStatus.ACCEPTED, OrderStatus.CANCELLED));
        assertTrue(OrderStateMachine.allows(OrderStatus.PREPARING, OrderStatus.READY));
        assertTrue(OrderStateMachine.allows(OrderStatus.READY, OrderStatus.COMPLETED));

        assertFalse(OrderStateMachine.allows(OrderStatus.ACCEPTED, OrderStatus.ACCEPTED));
        assertFalse(OrderStateMachine.allows(OrderStatus.ACCEPTED, OrderStatus.PREPARING));
        assertFalse(OrderStateMachine.allows(OrderStatus.PENDING, OrderStatus.READY));
        assertFalse(OrderStateMachine.allows(OrderStatus.COMPLETED, OrderStatus.CANCELLED));
        assertFalse(OrderStateMachine.allows(OrderStatus.CANCELLED, OrderStatus.ACCEPTED));
    }

    @Test
    void pendingAndPreparingAreNeverPatchTargets() {
        assertTrue(OrderStateMachine.isNeverPatchable(OrderStatus.PENDING));
        assertTrue(OrderStateMachine.isNeverPatchable(OrderStatus.PREPARING));
        assertFalse(OrderStateMachine.isNeverPatchable(OrderStatus.READY));
    }

    @Test
    void eachRoleOwnsOnlyItsTargets() {
        assertTrue(OrderStateMachine.roleOwns(Role.CASHIER, OrderStatus.ACCEPTED));
        assertTrue(OrderStateMachine.roleOwns(Role.CASHIER, OrderStatus.CANCELLED));
        assertFalse(OrderStateMachine.roleOwns(Role.CASHIER, OrderStatus.READY));
        assertTrue(OrderStateMachine.roleOwns(Role.KITCHEN, OrderStatus.READY));
        assertTrue(OrderStateMachine.roleOwns(Role.KITCHEN, OrderStatus.COMPLETED));
        assertFalse(OrderStateMachine.roleOwns(Role.KITCHEN, OrderStatus.CANCELLED));
        assertFalse(OrderStateMachine.roleOwns(Role.MASTER, OrderStatus.ACCEPTED));
    }

    @Test
    void onlyPendingOrdersAreEditableAndOnlyAcceptedOrdersArePayable() {
        assertTrue(OrderStateMachine.isEditable(OrderStatus.PENDING));
        assertFalse(OrderStateMachine.isEditable(OrderStatus.ACCEPTED));
        assertTrue(OrderStateMachine.isPayable(OrderStatus.ACCEPTED));
        assertFalse(OrderStateMachine.isPayable(OrderStatus.PENDING));
    }
}
