package com.ambatucode.dikichi.catalog.repository;

import com.ambatucode.dikichi.catalog.entity.DiningTable;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiningTableRepository extends JpaRepository<DiningTable, UUID> {

    List<DiningTable> findByOutletIdAndDeletedFalseOrderByCodeAsc(String outletId);

    Optional<DiningTable> findByOutletIdAndCodeAndDeletedFalse(String outletId, String code);

    boolean existsByOutletIdAndCodeAndDeletedFalse(String outletId, String code);
}
