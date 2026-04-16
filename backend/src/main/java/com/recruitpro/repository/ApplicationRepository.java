package com.recruitpro.repository;

import com.recruitpro.model.Application;
import com.recruitpro.model.enums.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    @Query("""
        SELECT a FROM Application a
        JOIN a.job j
        JOIN a.jobSeeker js
        JOIN js.user u
        WHERE j.companyId = :companyId
          AND a.deletedAt IS NULL
          AND (cast(:status as string) IS NULL OR a.status = :status)
          AND (cast(:jobId as string) IS NULL OR a.jobId = :jobId)
          AND (cast(:search as string) IS NULL OR :search = '' OR LOWER(u.email) LIKE LOWER(CONCAT('%', cast(:search as string), '%')))
        ORDER BY a.createdAt DESC
    """)
    Page<Application> findByCompanyFilters(
            @Param("companyId") UUID companyId,
            @Param("status") ApplicationStatus status,
            @Param("jobId") UUID jobId,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("""
        SELECT a FROM Application a
        JOIN FETCH a.job j
        JOIN FETCH a.jobSeeker js
        JOIN FETCH js.user u
        WHERE a.id = :id AND j.companyId = :companyId AND a.deletedAt IS NULL
    """)
    Optional<Application> findByIdAndCompanyId(
            @Param("id") UUID id,
            @Param("companyId") UUID companyId
    );

    @Query("SELECT COUNT(a) FROM Application a JOIN a.job j WHERE j.companyId = :companyId AND a.status = :status AND a.deletedAt IS NULL")
    long countByCompanyIdAndStatus(@Param("companyId") UUID companyId, @Param("status") ApplicationStatus status);

    @Query("SELECT COUNT(a) FROM Application a JOIN a.job j WHERE j.companyId = :companyId AND a.deletedAt IS NULL")
    long countByCompanyId(@Param("companyId") UUID companyId);

    @Query("""
        SELECT CASE WHEN COUNT(i) > 0 THEN true ELSE false END
        FROM Interview i WHERE i.applicationId = :applicationId
    """)
    boolean hasScheduledInterview(@Param("applicationId") UUID applicationId);

    @Query("""
        SELECT a FROM Application a
        JOIN a.job j
        JOIN a.jobSeeker js
        JOIN js.user u
        WHERE j.companyId = :companyId AND a.deletedAt IS NULL
        ORDER BY a.createdAt DESC
    """)
    Page<Application> findRecentByCompanyId(@Param("companyId") UUID companyId, Pageable pageable);

    @Query("""
        SELECT a FROM Application a
        JOIN a.job j
        WHERE j.companyId = :companyId AND a.deletedAt IS NULL
        ORDER BY a.createdAt DESC
    """)
    List<Application> findSelectOptionsByCompanyId(@Param("companyId") UUID companyId);

    // ── Job Seeker scoped queries ──────────────────────

    @Query("""
        SELECT a FROM Application a
        JOIN FETCH a.job j
        WHERE a.jobSeekerId = :seekerId
          AND a.deletedAt IS NULL
          AND (cast(:status as string) IS NULL OR a.status = :status)
          AND (cast(:search as string) IS NULL OR :search = '' OR LOWER(j.title) LIKE LOWER(CONCAT('%', cast(:search as string), '%')))
        ORDER BY a.createdAt DESC
    """)
    Page<Application> findByJobSeekerIdFilters(
            @Param("seekerId") UUID seekerId,
            @Param("status") ApplicationStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("""
        SELECT a FROM Application a
        JOIN FETCH a.job j
        LEFT JOIN FETCH j.skills
        WHERE a.id = :id AND a.jobSeekerId = :seekerId AND a.deletedAt IS NULL
    """)
    Optional<Application> findDetailByIdAndJobSeekerId(
            @Param("id") UUID id,
            @Param("seekerId") UUID seekerId
    );

    @Query("SELECT COUNT(a) FROM Application a WHERE a.jobSeekerId = :seekerId AND a.status = :status AND a.deletedAt IS NULL")
    long countByJobSeekerIdAndStatus(@Param("seekerId") UUID seekerId, @Param("status") ApplicationStatus status);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.jobSeekerId = :seekerId AND a.deletedAt IS NULL")
    long countByJobSeekerId(@Param("seekerId") UUID seekerId);

    boolean existsByJobIdAndJobSeekerIdAndDeletedAtIsNull(UUID jobId, UUID jobSeekerId);

    @Query("""
        SELECT a FROM Application a
        JOIN FETCH a.job j
        WHERE a.jobSeekerId = :seekerId AND a.deletedAt IS NULL
        ORDER BY a.createdAt DESC
    """)
    Page<Application> findRecentByJobSeekerId(@Param("seekerId") UUID seekerId, Pageable pageable);

    // ── Admin scoped queries ──────────────────────

    @Query(value = """
        SELECT a FROM Application a
        JOIN FETCH a.job j
        WHERE a.deletedAt IS NULL
          AND (cast(:status as string) IS NULL OR a.status = :status)
          AND (cast(:search as string) IS NULL OR :search = ''
               OR LOWER(j.title) LIKE LOWER(CONCAT('%', cast(:search as string), '%')))
        ORDER BY a.createdAt DESC
    """, countQuery = """
        SELECT COUNT(a) FROM Application a
        JOIN a.job j
        WHERE a.deletedAt IS NULL
          AND (cast(:status as string) IS NULL OR a.status = :status)
          AND (cast(:search as string) IS NULL OR :search = ''
               OR LOWER(j.title) LIKE LOWER(CONCAT('%', cast(:search as string), '%')))
    """)
    Page<Application> findAllForAdmin(
            @Param("status") ApplicationStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    long countByStatus(ApplicationStatus status);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.jobId = :jobId AND a.deletedAt IS NULL")
    long countByJobId(@Param("jobId") UUID jobId);
}
