package com.recruitpro.repository;

import com.recruitpro.model.Subscription;
import com.recruitpro.model.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID>, JpaSpecificationExecutor<Subscription> {

    boolean existsByPlanId(UUID planId);

    long countByPlanIdAndStatus(UUID planId, SubscriptionStatus status);

    long countByPlanIdAndStatusAndEndDateAfter(UUID planId, SubscriptionStatus status, Instant now);

    @Query("SELECT s FROM Subscription s WHERE s.company.id = :companyId ORDER BY s.createdAt DESC")
    List<Subscription> findByCompanyId(@Param("companyId") UUID companyId);

    Optional<Subscription> findFirstByCompanyIdAndStatusOrderByCreatedAtDesc(UUID companyId, SubscriptionStatus status);

    Optional<Subscription> findFirstByCompanyIdAndStatusAndEndDateAfterOrderByCreatedAtDesc(
            UUID companyId, SubscriptionStatus status, Instant now);

    Optional<Subscription> findFirstByCompanyIdOrderByCreatedAtDesc(UUID companyId);

    @Modifying
    @Query("""
            UPDATE Subscription s
               SET s.status = :expiredStatus
             WHERE s.status = :activeStatus
               AND s.endDate <= :now
            """)
    int expireOverdueActiveSubscriptions(
            @Param("activeStatus") SubscriptionStatus activeStatus,
            @Param("expiredStatus") SubscriptionStatus expiredStatus,
            @Param("now") Instant now);
}
