package com.recruitpro.repository;

import com.recruitpro.model.JobInteraction;
import com.recruitpro.model.enums.InteractionEventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface JobInteractionRepository extends JpaRepository<JobInteraction, UUID> {

    /** Used to detect recent duplicate interactions (debounce). */
    boolean existsByJobSeekerIdAndJobIdAndEventTypeAndCreatedAtAfter(
            UUID jobSeekerId, UUID jobId, InteractionEventType eventType, Instant after);
}
