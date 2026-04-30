package com.recruitpro.service;

import com.recruitpro.config.AiServiceConfig;
import com.recruitpro.dto.AiMatchingResult;
import com.recruitpro.dto.ResumeDataStructure;
import com.recruitpro.model.Job;
import com.recruitpro.repository.ApplicationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Single integration point for all calls to the AI / recommendation service.
 *
 * <p>Rules:
 * <ul>
 *   <li>Every method is {@code @Async} — callers are never blocked by AI latency.</li>
 *   <li>All exceptions are caught and logged — AI failures must NOT break user-facing flows.</li>
 *   <li>Uses the dedicated {@code aiRestTemplate} bean (timeouts configured in AiServiceConfig).</li>
 * </ul>
 */
@Slf4j
@Service
public class AiServiceClient {

    private final RestTemplate restTemplate;
    private final AiServiceConfig aiServiceConfig;
    private final ApplicationRepository applicationRepository;

    public AiServiceClient(
            @Qualifier("aiRestTemplate") RestTemplate restTemplate,
            AiServiceConfig aiServiceConfig,
            ApplicationRepository applicationRepository) {
        this.restTemplate = restTemplate;
        this.aiServiceConfig = aiServiceConfig;
        this.applicationRepository = applicationRepository;
    }

    // ── Add Node ─────────────────────────────────────────────────────────────

    /**
     * Registers a resume node in the AI graph by encoding its parsed text.
     *
     * @param resumeId UUID of the resume (used as node_id)
     * @param text     Parsed or raw text to embed
     */
    @Async
    public void addResumeNode(UUID resumeId, String text) {
        sendAddNode(resumeId.toString(), text, "resume");
    }

    /**
     * Registers a job node in the AI graph by encoding the job description.
     *
     * @param jobId UUID of the job (used as node_id)
     * @param text  Combined text representation of the job (title + description + skills)
     */
    @Async
    public void addJobNode(UUID jobId, String text) {
        sendAddNode(jobId.toString(), text, "job");
    }

    // ── Apply Edge ───────────────────────────────────────────────────────────

    /**
     * Registers an application edge between a resume and a job in the AI graph,
     * triggering a GraphSAGE embedding update for that resume.
     *
     * @param resumeId UUID of the applicant's resume
     * @param jobId    UUID of the job applied to
     */
    @Async
    public void registerApplication(UUID resumeId, UUID jobId) {
        String url = aiServiceConfig.getAiServiceUrl() + "/api/v1/apply";
        Map<String, Object> body = Map.of(
                "resume_id", resumeId.toString(),
                "job_id",    jobId.toString(),
                "weight",    1.0
        );

        try {
            ResponseEntity<Map<String, Object>> response =
                    restTemplate.postForEntity(url, body, generify(Map.class));
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[AI] Application edge registered: resume={} → job={}", resumeId, jobId);
            } else {
                log.warn("[AI] Unexpected status {} for /apply (resume={}, job={})",
                        response.getStatusCode(), resumeId, jobId);
            }
        } catch (RestClientException ex) {
            log.error("[AI] Failed to register application edge (resume={}, job={}): {}",
                    resumeId, jobId, ex.getMessage());
            // Graceful degradation — do not rethrow; application was already saved in DB
        }
    }

    // ── AI Matching ───────────────────────────────────────────────────────────

    /**
     * Calls the AI service to compute a detailed matching score between a resume
     * and a job description, then persists the result in the application record.
     * This method is {@code @Async} — it never blocks the user-facing apply flow.
     *
     * @param applicationId ID of the application to update after scoring
     * @param resumeData    Structured resume data extracted by OpenAI
     * @param job           The job entity (provides must-have skills, responsibilities, etc.)
     */
    @Async
    public void matchApplication(UUID applicationId, ResumeDataStructure resumeData, Job job) {
        String url = aiServiceConfig.getAiServiceUrl() + "/api/v1/match";

        // Build resume payload
        Map<String, Object> resumePayload = new HashMap<>();
        resumePayload.put("skills",              resumeData.getSkills());
        resumePayload.put("experience_bullets",  resumeData.getExperienceBullets());
        resumePayload.put("seniority",           resumeData.getSeniority());
        resumePayload.put("industry",            resumeData.getIndustry());

        // Build job payload — must-have skills come from the job_skills junction (job.getSkills())
        List<String> mustHaveSkills = job.getSkills() != null
                ? job.getSkills().stream().map(s -> s.getName()).collect(Collectors.toList())
                : List.of();

        List<String> niceToHaveSkills = job.getNiceToHaveSkills() != null
                ? Arrays.asList(job.getNiceToHaveSkills())
                : List.of();

        List<String> responsibilities = job.getResponsibilities() != null
                ? Arrays.asList(job.getResponsibilities())
                : List.of();

        List<String> seniorities = job.getExperienceLevels() != null
                ? job.getExperienceLevels().stream().map(Enum::name).collect(Collectors.toList())
                : List.of();

        String industryName = job.getIndustry() != null ? job.getIndustry().getName() : null;

        Map<String, Object> jobPayload = new HashMap<>();
        jobPayload.put("must_have_skills",    mustHaveSkills);
        jobPayload.put("nice_to_have_skills", niceToHaveSkills);
        jobPayload.put("responsibilities",    responsibilities);
        jobPayload.put("seniority",           seniorities);
        jobPayload.put("industry",            industryName);

        Map<String, Object> body = new HashMap<>();
        body.put("application_id", applicationId.toString());
        body.put("resume",         resumePayload);
        body.put("job",            jobPayload);

        try {
            ResponseEntity<AiMatchingResult> response =
                    restTemplate.postForEntity(url, body, AiMatchingResult.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                AiMatchingResult result = response.getBody();
                applicationRepository.findById(applicationId).ifPresent(app -> {
                    app.setJsonMatching(result);
                    app.setAiScore(result.getOverallScore());
                    applicationRepository.save(app);
                    log.info("[AI] Match scored: application={} overall={}", applicationId, result.getOverallScore());
                });
            } else {
                log.warn("[AI] Unexpected status {} for /match (application={})",
                        response.getStatusCode(), applicationId);
            }
        } catch (RestClientException ex) {
            log.error("[AI] Failed to compute match score (application={}): {}", applicationId, ex.getMessage());
            // Graceful degradation — application was already saved; score remains null
        }
    }

    // ── Interaction Sync ─────────────────────────────────────────────────────

    /**
     * Syncs a user→job interaction to the AI recommendation server so that
     * GraphSAGE embeddings can be updated accordingly.
     *
     * @param resumeId   UUID of the job seeker's resume (graph node)
     * @param jobId      UUID of the job (graph node)
     * @param actionType one of: "apply", "save", "view", "click"
     */
    @Async
    public void syncInteraction(UUID resumeId, UUID jobId, String actionType) {
        String url = aiServiceConfig.getAiServiceUrl() + "/api/v1/interact";
        Map<String, Object> body = Map.of(
                "resume_id",   resumeId.toString(),
                "job_id",      jobId.toString(),
                "action_type", actionType
        );

        try {
            ResponseEntity<Map<String, Object>> response =
                    restTemplate.postForEntity(url, body, generify(Map.class));
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[AI] Interaction synced: resume={}, job={}, action={}", resumeId, jobId, actionType);
            } else {
                log.warn("[AI] Unexpected status {} for /interact (resume={}, job={}, action={})",
                        response.getStatusCode(), resumeId, jobId, actionType);
            }
        } catch (RestClientException ex) {
            log.error("[AI] Failed to sync interaction (resume={}, job={}, action={}): {}",
                    resumeId, jobId, actionType, ex.getMessage());
            // Graceful degradation — do not rethrow
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void sendAddNode(String nodeId, String text, String nodeType) {
        String url = aiServiceConfig.getAiServiceUrl() + "/api/v1/add_node";
        Map<String, Object> body = Map.of(
                "node_id",   nodeId,
                "text",      text,
                "node_type", nodeType
        );

        try {
            ResponseEntity<Map<String, Object>> response =
                    restTemplate.postForEntity(url, body, generify(Map.class));
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[AI] Node registered: id={}, type={}", nodeId, nodeType);
            } else {
                log.warn("[AI] Unexpected status {} for /add_node (id={}, type={})",
                        response.getStatusCode(), nodeId, nodeType);
            }
        } catch (RestClientException ex) {
            log.error("[AI] Failed to register node (id={}, type={}): {}", nodeId, nodeType, ex.getMessage());
            // Graceful degradation — do not rethrow
        }
    }

    @SuppressWarnings("unchecked")
    private static <T> Class<T> generify(Class<?> cls) {
        return (Class<T>) cls;
    }
}
