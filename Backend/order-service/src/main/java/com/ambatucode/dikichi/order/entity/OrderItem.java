package com.ambatucode.dikichi.order.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "order_item")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "menu_item_id", nullable = false)
    private UUID menuItemId;

    @Column(name = "menu_item_name_snapshot", nullable = false, length = 100)
    private String menuItemName;

    @Column(name = "unit_price_snapshot", nullable = false)
    private int unitPrice;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private long subtotal;

    protected OrderItem() {
    }

    public OrderItem(UUID menuItemId, String menuItemName, int unitPrice, int quantity) {
        this.menuItemId = menuItemId;
        this.menuItemName = menuItemName;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
        this.subtotal = (long) unitPrice * quantity;
    }

    void attachTo(Order order) {
        this.order = order;
    }

    public UUID getMenuItemId() {
        return menuItemId;
    }

    public String getMenuItemName() {
        return menuItemName;
    }

    public int getUnitPrice() {
        return unitPrice;
    }

    public int getQuantity() {
        return quantity;
    }

    public long getSubtotal() {
        return subtotal;
    }
}
