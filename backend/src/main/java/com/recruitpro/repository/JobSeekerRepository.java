package com.recruitpro.repository;

import com.recruitpro.model.JobSeeker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobSeekerRepository extends JpaRepository<JobSeeker, UUID> {

    Optional<JobSeeker> findByUserId(UUID userId);
}
