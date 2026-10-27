package com.ambatucode.dikichi.order.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// WHY: the explicit entity name avoids a clash with the HQL reserved word ORDER in derived queries
@Entity(name = "DikichiOrder")
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_number", nullable = false, unique = true, length = 20)
    private String orderNumber;

    @Column(name = "outlet_id", nullable = false, length = 20)
    private String outletId;

    @Column(name = "table_code", nullable = false, length = 5)
    private String tableCode;

    @Column(name = "customer_name", nullable = false, length = 50)
    private String customerName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private OrderStatus status;

    @Column(name = "total_amount", nullable = false)
    private long totalAmount;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("menuItemName ASC")
    private List<OrderItem> items = new ArrayList<>();

    protected Order() {
    }

    public Order(String orderNumber, String outletId, String tableCode, String customerName) {
        this.orderNumber = orderNumber;
        this.outletId = outletId;
        this.tableCode = tableCode;
        this.customerName = customerName;
        this.status = OrderStatus.PENDING;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now().truncatedTo(ChronoUnit.SECONDS);
    }

    public void addItem(OrderItem item) {
        item.attachTo(this);
        items.add(item);
        totalAmount += item.getSubtotal();
    }

    public void markPreparing() {
        this.status = OrderStatus.PREPARING;
    }

    public UUID getId() {
        return id;
    }

    public String getOrderNumber() {
        return orderNumber;
    }

    public String getOutletId() {
        return outletId;
    }

    public String getTableCode() {
        return tableCode;
    }

    public String getCustomerName() {
        return customerName;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public long getTotalAmount() {
        return totalAmount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public List<OrderItem> getItems() {
        return items;
    }
}
