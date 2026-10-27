package com.ambatucode.dikichi.catalog.repository;

import com.ambatucode.dikichi.catalog.entity.Outlet;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OutletRepository extends JpaRepository<Outlet, String> {

    List<Outlet> findByDeletedFalseOrderByIdAsc();

    Optional<Outlet> findByIdAndDeletedFalse(String id);
}
