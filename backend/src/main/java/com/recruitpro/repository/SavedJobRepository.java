package com.recruitpro.repository;

import com.recruitpro.model.SavedJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface SavedJobRepository extends JpaRepository<SavedJob, UUID> {

    boolean existsByJobSeekerIdAndJobId(UUID jobSeekerId, UUID jobId);

    Optional<SavedJob> findByJobSeekerIdAndJobId(UUID jobSeekerId, UUID jobId);

    @Query(
            value = "SELECT s FROM SavedJob s WHERE s.jobSeekerId = :jobSeekerId AND EXISTS (SELECT j.id FROM Job j WHERE j.id = s.jobId)",
            countQuery = "SELECT COUNT(s) FROM SavedJob s WHERE s.jobSeekerId = :jobSeekerId AND EXISTS (SELECT j.id FROM Job j WHERE j.id = s.jobId)"
    )
    Page<SavedJob> findAllExistingByJobSeekerId(@Param("jobSeekerId") UUID jobSeekerId, Pageable pageable);

    void deleteByJobSeekerIdAndJobId(UUID jobSeekerId, UUID jobId);

    @Query("SELECT s.jobId FROM SavedJob s WHERE s.jobSeekerId = :seekerId")
    Set<UUID> findJobIdsByJobSeekerId(@Param("seekerId") UUID seekerId);
}
