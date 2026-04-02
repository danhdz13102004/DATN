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
          AND (cast(:from as string) IS NULL OR i.scheduledTime >= :from)
          AND (cast(:to as string) IS NULL OR i.scheduledTime <= :to)
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

    // ── Job Seeker scoped queries ──────────────────────

    @Query("""
        SELECT i FROM Interview i
        JOIN FETCH i.application a
        JOIN FETCH a.job j
        WHERE a.jobSeekerId = :seekerId
          AND (cast(:status as string) IS NULL OR i.status = :status)
          AND (cast(:meetingType as string) IS NULL OR i.meetingType = :meetingType)
        ORDER BY i.scheduledTime DESC
    """)
    Page<Interview> findByJobSeekerIdAndFilters(
            @Param("seekerId") UUID seekerId,
            @Param("status") InterviewStatus status,
            @Param("meetingType") com.recruitpro.model.enums.MeetingType meetingType,
            Pageable pageable
    );

    @Query("""
        SELECT COUNT(i) FROM Interview i
        JOIN i.application a
        WHERE a.jobSeekerId = :seekerId AND i.status = :status
    """)
    long countByJobSeekerIdAndStatus(@Param("seekerId") UUID seekerId, @Param("status") InterviewStatus status);

    @Query("""
        SELECT i FROM Interview i
        JOIN FETCH i.application a
        JOIN FETCH a.job j
        WHERE a.jobSeekerId = :seekerId
          AND i.status = 'PENDING'
          AND i.scheduledTime >= :now
        ORDER BY i.scheduledTime ASC
    """)
    Page<Interview> findUpcomingByJobSeekerId(
            @Param("seekerId") UUID seekerId,
            @Param("now") Instant now,
            Pageable pageable
    );
}
