package com.recruitpro.repository;

import com.recruitpro.model.Interview;
import com.recruitpro.model.enums.InterviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, UUID> {

    @Query("""
        SELECT i FROM Interview i
        JOIN FETCH i.application a
        JOIN FETCH a.job j
        JOIN FETCH a.jobSeeker js
        JOIN FETCH js.user u
        WHERE j.companyId = :companyId
          AND (:from IS NULL OR i.scheduledTime >= :from)
          AND (:to IS NULL OR i.scheduledTime <= :to)
        ORDER BY i.scheduledTime ASC
    """)
    Page<Interview> findByCompanyIdAndDateRange(
            @Param("companyId") UUID companyId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );

    @Query("""
        SELECT i FROM Interview i
        JOIN FETCH i.application a
        JOIN FETCH a.job j
        JOIN FETCH a.jobSeeker js
        JOIN FETCH js.user u
        LEFT JOIN FETCH i.interviewer s
        WHERE i.id = :id AND j.companyId = :companyId
    """)
    Optional<Interview> findByIdAndCompanyId(
            @Param("id") UUID id,
            @Param("companyId") UUID companyId
    );

    @Query("SELECT COUNT(i) FROM Interview i JOIN i.application a JOIN a.job j WHERE j.companyId = :companyId")
    long countByCompanyId(@Param("companyId") UUID companyId);

    @Query("SELECT COUNT(i) FROM Interview i JOIN i.application a JOIN a.job j WHERE j.companyId = :companyId AND i.status = :status")
    long countByCompanyIdAndStatus(@Param("companyId") UUID companyId, @Param("status") InterviewStatus status);
}
