package com.recruitpro.repository;

import com.recruitpro.model.Job;
import com.recruitpro.model.enums.ExperienceLevel;
import com.recruitpro.model.enums.JobStatus;
import com.recruitpro.model.enums.JobType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID> {

    Page<Job> findAllByCompanyId(UUID companyId, Pageable pageable);

    @Query("SELECT DISTINCT j FROM Job j WHERE j.status = 'PUBLISHED' AND " +
           "(cast(:keyword as string) IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', cast(:keyword as string), '%'))) AND " +
           "(cast(:jobType as string) IS NULL OR j.jobType = :jobType) AND " +
           "(cast(:location as string) IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', cast(:location as string), '%')))")
    Page<Job> findPublishedJobs(
            @Param("keyword") String keyword,
            @Param("jobType") JobType jobType,
            @Param("location") String location,
            Pageable pageable
    );

    @Query("SELECT DISTINCT j FROM Job j JOIN j.experienceLevels el WHERE j.status = 'PUBLISHED' AND " +
           "(cast(:keyword as string) IS NULL OR LOWER(j.title) LIKE LOWER(CONCAT('%', cast(:keyword as string), '%'))) AND " +
           "(cast(:jobType as string) IS NULL OR j.jobType = :jobType) AND " +
           "el IN :experienceLevels AND " +
           "(cast(:location as string) IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', cast(:location as string), '%')))")
    Page<Job> findPublishedJobsWithLevels(
            @Param("keyword") String keyword,
            @Param("jobType") JobType jobType,
            @Param("experienceLevels") java.util.Set<ExperienceLevel> experienceLevels,
            @Param("location") String location,
            Pageable pageable
    );

    @Query("SELECT j FROM Job j WHERE j.companyId = :companyId AND j.deletedAt IS NULL ORDER BY j.title")
    List<Job> findSelectOptionsByCompanyId(@Param("companyId") UUID companyId);
}
