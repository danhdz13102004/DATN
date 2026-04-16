package com.recruitpro.repository;

import com.recruitpro.model.Subscription;
import com.recruitpro.model.enums.SubscriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    boolean existsByPlanId(UUID planId);

    long countByPlanIdAndStatus(UUID planId, SubscriptionStatus status);

    @Query("""
            SELECT s FROM Subscription s
            WHERE (:planId IS NULL OR s.plan.id = :planId)
              AND (:status IS NULL OR s.status = :status)
            ORDER BY s.createdAt DESC
            """)
    Page<Subscription> findAllWithFilters(
            @Param("planId") UUID planId,
            @Param("status") SubscriptionStatus status,
            Pageable pageable
    );

    Optional<Subscription> findFirstByCompanyIdAndStatusOrderByCreatedAtDesc(UUID companyId, SubscriptionStatus status);

    Optional<Subscription> findFirstByCompanyIdOrderByCreatedAtDesc(UUID companyId);
}
