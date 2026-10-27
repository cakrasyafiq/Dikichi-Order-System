package com.ambatucode.dikichi.catalog.repository;

import com.ambatucode.dikichi.catalog.entity.StaffUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StaffUserRepository extends JpaRepository<StaffUser, UUID> {

    Optional<StaffUser> findByUsername(String username);
}
