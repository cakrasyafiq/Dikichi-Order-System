package com.ambatucode.dikichi.order.repository;

import com.ambatucode.dikichi.order.entity.MockPayment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MockPaymentRepository extends JpaRepository<MockPayment, UUID> {

    boolean existsByOrderId(UUID orderId);

    Optional<MockPayment> findByOrderId(UUID orderId);

    List<MockPayment> findByOrderIdIn(Collection<UUID> orderIds);
}
