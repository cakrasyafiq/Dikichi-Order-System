package com.ambatucode.dikichi.catalog.repository;

import com.ambatucode.dikichi.catalog.entity.MenuItem;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {

    List<MenuItem> findByOutletIdAndDeletedFalseOrderByCategoryAscNameAsc(String outletId);

    Optional<MenuItem> findByIdAndDeletedFalse(UUID id);

    List<MenuItem> findByIdInAndDeletedFalse(Collection<UUID> ids);
}
