package com.ambatucode.dikichi.order.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "mock_payment")
public class MockPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id", nullable = false, unique = true)
    private UUID orderId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 5)
    private PaymentMethod paymentMethod;

    @Column(name = "amount_tendered")
    private Long amountTendered;

    @Column(name = "change_amount")
    private Long changeAmount;

    @Column(name = "amount_paid", nullable = false)
    private long amountPaid;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt;

    protected MockPayment() {
    }

    public MockPayment(UUID orderId, PaymentMethod paymentMethod, Long amountTendered, Long changeAmount,
                       long amountPaid) {
        this.orderId = orderId;
        this.paymentMethod = paymentMethod;
        this.amountTendered = amountTendered;
        this.changeAmount = changeAmount;
        this.amountPaid = amountPaid;
    }

    @PrePersist
    void onCreate() {
        paidAt = Instant.now().truncatedTo(ChronoUnit.SECONDS);
    }

    public UUID getOrderId() {
        return orderId;
    }

    public PaymentMethod getPaymentMethod() {
        return paymentMethod;
    }

    public Long getChangeAmount() {
        return changeAmount;
    }
}
