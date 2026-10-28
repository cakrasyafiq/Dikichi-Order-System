package com.ambatucode.dikichi.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "dining_table")
public class DiningTable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "outlet_id", nullable = false, length = 20)
    private String outletId;

    @Column(nullable = false, length = 5)
    private String code;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DiningTable() {
    }

    public DiningTable(String outletId, String code) {
        this.outletId = outletId;
        this.code = code;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now().truncatedTo(ChronoUnit.SECONDS);
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

    public String getCode() {
        return code;
    }
}
