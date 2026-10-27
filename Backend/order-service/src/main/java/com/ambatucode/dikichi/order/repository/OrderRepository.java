package com.ambatucode.dikichi.order.repository;

import com.ambatucode.dikichi.order.entity.Order;
import com.ambatucode.dikichi.order.entity.OrderStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    @Query(value = "select nextval('order_number_seq')", nativeQuery = true)
    long nextOrderSequence();

    @EntityGraph(attributePaths = "items")
    List<Order> findByOutletIdAndStatusInOrderByCreatedAtAsc(String outletId, Collection<OrderStatus> statuses);

    @EntityGraph(attributePaths = "items")
    Optional<Order> findWithItemsById(UUID id);
}
