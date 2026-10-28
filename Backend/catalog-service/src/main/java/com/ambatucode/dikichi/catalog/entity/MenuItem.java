package com.ambatucode.dikichi.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "menu_item")
public class MenuItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "outlet_id", nullable = false, length = 20)
    private String outletId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false)
    private int price;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    private boolean available;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected MenuItem() {
    }

    public MenuItem(String outletId, String name, String description, int price, String category,
                    boolean available) {
        this.outletId = outletId;
        this.name = name;
        this.description = description;
        this.price = price;
        this.category = category;
        this.available = available;
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

    public void replace(String name, String description, int price, String category, boolean available) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.category = category;
        this.available = available;
    }

    public void changeAvailability(boolean available) {
        this.available = available;
    }

    public void markDeleted() {
        this.deleted = true;
    }

    public UUID getId() {
        return id;
    }

    public String getOutletId() {
        return outletId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public int getPrice() {
        return price;
    }

    public String getCategory() {
        return category;
    }

    public boolean isAvailable() {
        return available;
    }
}
