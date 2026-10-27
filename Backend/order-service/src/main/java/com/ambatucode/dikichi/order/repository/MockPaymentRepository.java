package com.ambatucode.dikichi.order.repository;

import com.ambatucode.dikichi.order.entity.MockPayment;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MockPaymentRepository extends JpaRepository<MockPayment, UUID> {

    boolean existsByOrderId(UUID orderId);
}
