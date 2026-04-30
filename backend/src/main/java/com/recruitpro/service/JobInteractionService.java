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
import java.util.Optional;
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
     * Logs an interaction and asynchronously syncs it to the AI recommendation server.
     *
     * @param jobSeekerId job seeker performing the action
     * @param jobId       job being interacted with
     * @param eventType   type of interaction
     * @param resumeId    optional specific resume; if null, primary resume is resolved
     * @param metadata    optional extra payload (source page, device, etc.)
     */
    @Transactional
    public void log(UUID jobSeekerId, UUID jobId, InteractionEventType eventType,
                    UUID resumeId, Map<String, Object> metadata) {

        // Validate job exists
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

        JobInteraction interaction = JobInteraction.builder()
                .jobSeekerId(jobSeekerId)
                .jobId(jobId)
                .eventType(eventType)
                .metadata(metadata)
                .build();

        interactionRepository.save(interaction);
        log.info("[Interaction] seeker={} job={} event={}", jobSeekerId, jobId, eventType.name());

        // Async AI sync — resolve resume for graph embedding update
        UUID resolvedResume = resolveResume(jobSeekerId, resumeId);
        if (resolvedResume != null) {
            aiServiceClient.syncInteraction(resolvedResume, jobId, eventType.name());
        } else {
            log.debug("[Interaction] No resume found for seeker={}, skipping AI sync", jobSeekerId);
        }
    }

    /** Returns the provided resumeId if non-null, otherwise the seeker's primary resume. */
    private UUID resolveResume(UUID jobSeekerId, UUID resumeId) {
        if (resumeId != null) return resumeId;

        List<Resume> resumes = resumeRepository.findAllByJobSeekerId(jobSeekerId);
        Optional<Resume> primary = resumes.stream().filter(Resume::getIsPrimary).findFirst();
        if (primary.isPresent()) return primary.get().getId();
        if (!resumes.isEmpty()) return resumes.get(0).getId();
        return null;
    }
}
