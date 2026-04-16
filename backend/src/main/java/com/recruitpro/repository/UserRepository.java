package com.recruitpro.repository;

import com.recruitpro.model.User;
import com.recruitpro.model.enums.UserRole;
import com.recruitpro.model.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE " +
           "(cast(:role as string) IS NULL OR u.role = :role) AND " +
           "(cast(:status as string) IS NULL OR u.status = :status)")
    Page<User> findAllByFilters(
            @Param("role") UserRole role,
            @Param("status") UserStatus status,
            Pageable pageable
    );

    long countByStatus(UserStatus status);
}
