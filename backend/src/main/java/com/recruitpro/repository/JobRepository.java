package com.recruitpro.repository;

import com.recruitpro.model.Job;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID>, JpaSpecificationExecutor<Job> {

    @Query("SELECT j FROM Job j WHERE j.companyId = :companyId AND j.deletedAt IS NULL ORDER BY j.title")
    List<Job> findSelectOptionsByCompanyId(@Param("companyId") UUID companyId);

    Page<Job> findAllByCompanyId(UUID companyId, Pageable pageable);

    @Query("SELECT j FROM Job j WHERE j.deletedAt IS NULL AND " +
           "(cast(:status as string) IS NULL OR j.status = :status) AND " +
           "(cast(:keyword as string) IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', cast(:keyword as string), '%')))")
    Page<Job> findAllForAdmin(
            @Param("status") JobStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    long countByStatus(JobStatus status);

    long countByCompanyIdAndStatus(UUID companyId, JobStatus status);

    List<Job> findTop10ByCompanyIdAndStatusOrderByCreatedAtDesc(UUID companyId, JobStatus status);

    @Query("SELECT j FROM Job j WHERE j.status = 'PUBLISHED' AND j.id IN :ids AND " +
           "EXISTS (SELECT 1 FROM Company c WHERE c.id = j.companyId AND c.blocked = false)")
    List<Job> findAllPublicByIdIn(@Param("ids") List<UUID> ids);

    @Query("SELECT j FROM Job j WHERE j.status = 'PUBLISHED' AND j.id = :id AND " +
           "EXISTS (SELECT 1 FROM Company c WHERE c.id = j.companyId AND c.blocked = false)")
    Optional<Job> findPublicById(@Param("id") UUID id);

    @Query("SELECT DISTINCT j FROM Job j WHERE j.status = 'PUBLISHED' AND " +
           "EXISTS (SELECT 1 FROM Company c WHERE c.id = j.companyId AND c.blocked = false) AND " +
           "(cast(:keyword as string) IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', cast(:keyword as string), '%'))) AND " +
           "(cast(:jobType as string) IS NULL OR j.jobType = :jobType) AND " +
           "(cast(:location as string) IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', cast(:location as string), '%'))) AND " +
           "(:salaryMin IS NULL OR (j.salaryMax IS NOT NULL AND j.salaryMax >= :salaryMin)) AND " +
           "(:salaryMax IS NULL OR (j.salaryMin IS NOT NULL AND j.salaryMin <= :salaryMax)) AND " +
           "(cast(:cityId as long) IS NULL OR " +
           "  EXISTS (SELECT 1 FROM CompanyAddress ca WHERE ca.id = j.companyAddressId AND ca.cityId = :cityId)) AND " +
           "(cast(:countryId as long) IS NULL OR " +
           "  EXISTS (SELECT 1 FROM CompanyAddress ca WHERE ca.id = j.companyAddressId AND ca.countryId = :countryId))")
    Page<Job> findPublishedJobs(
            @Param("keyword") String keyword,
            @Param("jobType") JobType jobType,
            @Param("location") String location,
            @Param("salaryMin") Double salaryMin,
            @Param("salaryMax") Double salaryMax,
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            Pageable pageable
    );

    @Query("SELECT DISTINCT j FROM Job j JOIN j.experienceLevels el WHERE j.status = 'PUBLISHED' AND " +
           "EXISTS (SELECT 1 FROM Company c WHERE c.id = j.companyId AND c.blocked = false) AND " +
           "(cast(:keyword as string) IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', cast(:keyword as string), '%'))) AND " +
           "(cast(:jobType as string) IS NULL OR j.jobType = :jobType) AND " +
           "el IN :experienceLevels AND " +
           "(cast(:location as string) IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', cast(:location as string), '%'))) AND " +
           "(:salaryMin IS NULL OR (j.salaryMax IS NOT NULL AND j.salaryMax >= :salaryMin)) AND " +
           "(:salaryMax IS NULL OR (j.salaryMin IS NOT NULL AND j.salaryMin <= :salaryMax)) AND " +
           "(cast(:cityId as long) IS NULL OR " +
           "  EXISTS (SELECT 1 FROM CompanyAddress ca WHERE ca.id = j.companyAddressId AND ca.cityId = :cityId)) AND " +
           "(cast(:countryId as long) IS NULL OR " +
           "  EXISTS (SELECT 1 FROM CompanyAddress ca WHERE ca.id = j.companyAddressId AND ca.countryId = :countryId))")
    Page<Job> findPublishedJobsWithLevels(
            @Param("keyword") String keyword,
            @Param("jobType") JobType jobType,
            @Param("experienceLevels") java.util.Set<ExperienceLevel> experienceLevels,
            @Param("location") String location,
            @Param("salaryMin") Double salaryMin,
            @Param("salaryMax") Double salaryMax,
            @Param("cityId") Long cityId,
            @Param("countryId") Long countryId,
            Pageable pageable
    );
}
