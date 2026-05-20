package com.recruitpro.service;

import com.recruitpro.exception.ResourceNotFoundException;
import com.recruitpro.model.JobInteraction;
import com.recruitpro.model.Resume;
import com.recruitpro.model.enums.InteractionEventType;
import com.recruitpro.repository.JobInteractionRepository;
import com.recruitpro.repository.JobRepository;
import com.recruitpro.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Centralises interaction logging (click / save / apply) and async AI sync.
 *
 * <p>Debounce window per event type (prevents spam):
 * <ul>
 *   <li>click → 5 minutes</li>
 *   <li>save  → no debounce (toggle action)</li>
 *   <li>apply → no debounce (already guarded by duplicate-application check)</li>
 * </ul>
 *
 * <p>Graph edge policy:
 * <ul>
 *   <li>apply events: create a graph edge and update GraphSAGE embedding (ground truth).</li>
 *   <li>click/save events: record as user-level behavioral signals only. NO graph edge is
 *       created. NO GraphSAGE update. Signals feed into the preference vector only.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobInteractionService {

    private static final Duration CLICK_DEBOUNCE = Duration.ofMinutes(5);

    private final JobInteractionRepository interactionRepository;
    private final ResumeRepository resumeRepository;
    private final JobRepository jobRepository;
    private final AiServiceClient aiServiceClient;

    /**
     * Logs an apply interaction with a single explicit resume_id.
     *
     * <p>Apply events are treated as ground truth signals with weight = 1.0.
     * The explicit resume_id is always used for AI sync and creates a graph edge.
     *
     * @param jobSeekerId job seeker performing the action
     * @param jobId       job being interacted with
     * @param eventType   type of interaction (must be apply)
     * @param resumeId    explicit resume ID for this application
     * @param metadata    optional extra payload
     */
    @Transactional
    public void logWithSingleResume(
            UUID jobSeekerId,
            UUID jobId,
            InteractionEventType eventType,
            UUID resumeId,
            Map<String, Object> metadata
    ) {
        if (!jobRepository.existsById(jobId)) {
            throw new ResourceNotFoundException("Job not found: " + jobId);
        }

        JobInteraction interaction = JobInteraction.builder()
                .jobSeekerId(jobSeekerId)
                .jobId(jobId)
                .eventType(eventType)
                .metadata(metadata)
                .build();

        interactionRepository.save(interaction);
        log.info("[Interaction] seeker={} job={} event={} (single resume={})",
                jobSeekerId, jobId, eventType.name(), resumeId);

        // Async AI sync with explicit resume
        if (resumeId != null) {
            aiServiceClient.syncInteraction(resumeId, jobId, eventType.name());
        } else {
            log.warn("[Interaction] Apply event without explicit resume_id for seeker={}", jobSeekerId);
        }
    }

    /**
     * Logs a click/save interaction as a user-level behavioral signal.
     *
     * <p>Unlike apply events, click/save do NOT create graph edges.
     * They are recorded as behavioral signals in the AI service's behavioral_store,
     * where they feed into the preference vector for recommendations.
     *
     * @param jobSeekerId job seeker performing the action
     * @param jobId       job being interacted with
     * @param eventType   type of interaction (click or save)
     * @param resumeIds   resume IDs (kept for DB metadata only; not sent to AI service)
     * @param metadata    optional extra payload
     */
    @Transactional
    public void logWithMultipleResumes(
            UUID jobSeekerId,
            UUID jobId,
            InteractionEventType eventType,
            List<UUID> resumeIds,
            Map<String, Object> metadata
    ) {
        if (!jobRepository.existsById(jobId)) {
            throw new ResourceNotFoundException("Job not found: " + jobId);
        }

        // Debounce: skip duplicate click within window
        if (eventType == InteractionEventType.click) {
            Instant cutoff = Instant.now().minus(CLICK_DEBOUNCE);
            if (interactionRepository.existsByJobSeekerIdAndJobIdAndEventTypeAndCreatedAtAfter(
                    jobSeekerId, jobId, InteractionEventType.click, cutoff)) {
                log.debug("Skipping duplicate click interaction for seeker={} job={}", jobSeekerId, jobId);
                return;
            }
        }

        // Save interaction record (one row per user+job, not per resume)
        JobInteraction interaction = JobInteraction.builder()
                .jobSeekerId(jobSeekerId)
                .jobId(jobId)
                .eventType(eventType)
                .metadata(metadata)
                .build();

        interactionRepository.save(interaction);
        log.info("[Interaction] seeker={} job={} event={} (behavioral signal)", jobSeekerId, jobId, eventType.name());

        // Route to AI service: apply creates graph edge, click/save records behavioral signal
        if (eventType.isGraphEdge()) {
            // Apply: sync as graph edge (defensive — apply normally goes through logWithSingleResume)
            if (resumeIds != null && !resumeIds.isEmpty()) {
                for (UUID resumeId : resumeIds) {
                    aiServiceClient.syncInteraction(resumeId, jobId, eventType.name());
                }
            }
        } else {
            // Click/save: record as user-level behavioral signal (no resume IDs needed)
            aiServiceClient.recordBehavioralSignal(jobSeekerId, jobId, eventType);
        }
    }

    /**
     * Resolves resumes for a job seeker, optionally filtering by provided resume IDs.
     *
     * @param jobSeekerId the job seeker's ID
     * @param resumeIds   optional list of specific resume IDs to include
     * @return list of resume IDs to use for interaction
     */
    public List<UUID> resolveResumes(UUID jobSeekerId, List<UUID> resumeIds) {
        if (resumeIds != null && !resumeIds.isEmpty()) {
            return resumeIds;
        }

        // Fall back to all resumes for this seeker
        List<Resume> resumes = resumeRepository.findAllByJobSeekerId(jobSeekerId);
        return resumes.stream().map(Resume::getId).toList();
    }
}
