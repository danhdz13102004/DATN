package com.recruitpro.service;

import com.recruitpro.config.AiServiceConfig;
import com.recruitpro.dto.AiMatchingResult;
import com.recruitpro.dto.ResumeDataStructure;
import com.recruitpro.model.Job;
import com.recruitpro.model.enums.InteractionEventType;
import com.recruitpro.repository.ApplicationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
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
    private final RestTemplate ocrRestTemplate;
    private final AiServiceConfig aiServiceConfig;
    private final ApplicationRepository applicationRepository;

    public AiServiceClient(
            @Qualifier("aiRestTemplate") RestTemplate restTemplate,
            @Qualifier("ocrRestTemplate") RestTemplate ocrRestTemplate,
            AiServiceConfig aiServiceConfig,
            ApplicationRepository applicationRepository) {
        this.restTemplate = restTemplate;
        this.ocrRestTemplate = ocrRestTemplate;
        this.aiServiceConfig = aiServiceConfig;
        this.applicationRepository = applicationRepository;
    }

    // ── Add Node ─────────────────────────────────────────────────────────────

    /**
     * Registers a resume node in the AI graph by encoding its parsed text.
     * The jobSeekerId is passed so the AI service can build a resume_to_user map,
     * enabling user-level behavioral signals for click/save interactions.
     *
     * @param resumeId UUID of the resume (used as node_id)
     * @param text    Parsed or raw text to embed
     * @param jobSeekerId UUID of the resume owner (job seeker)
     */
    @Async
    public void addResumeNode(UUID resumeId, String text, UUID jobSeekerId) {
        sendAddNode(resumeId.toString(), text, "resume", jobSeekerId.toString());
    }

    /**
     * Registers a job node in the AI graph by encoding the job description.
     *
     * @param jobId UUID of the job (used as node_id)
     * @param text  Combined text representation of the job (title + description + skills)
     */
    @Async
    public void addJobNode(UUID jobId, String text) {
        sendAddNode(jobId.toString(), text, "job", null);
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
     * Syncs an apply interaction to the AI recommendation server with explicit single resume.
     * This is treated as a ground truth signal with weight = 1.0.
     *
     * @param resumeId   UUID of the job seeker's resume (graph node)
     * @param jobId      UUID of the job (graph node)
     * @param actionType should be "apply"
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

    /**
     * Syncs a click/save interaction as a user-level behavioral signal.
     *
     * <p>Unlike apply events which create graph edges and update GraphSAGE embeddings,
     * click/save events are stored as behavioral signals only and used in the
     * preference-vector logic. The jobSeekerId is passed via the X-User-ID header.
     *
     * @param jobSeekerId UUID of the job seeker (user)
     * @param jobId      UUID of the job (graph node)
     * @param eventType should be "click" or "save"
     */
    @Async
    public void recordBehavioralSignal(UUID jobSeekerId, UUID jobId, InteractionEventType eventType) {
        String url = aiServiceConfig.getAiServiceUrl() + "/api/v1/interact";
        HttpHeaders hdrs = new HttpHeaders();
        hdrs.set("X-User-ID", jobSeekerId.toString());
        Map<String, Object> body = Map.of(
                "job_id",      jobId.toString(),
                "action_type", eventType.name()
        );
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, hdrs);
        try {
            ResponseEntity<Map<String, Object>> response =
                    restTemplate.postForEntity(url, entity, generify(Map.class));
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[AI] Behavioral signal recorded: seeker={}, job={}, action={}",
                        jobSeekerId, jobId, eventType.name());
            } else {
                log.warn("[AI] Unexpected status {} for behavioral signal (seeker={}, job={}, action={})",
                        response.getStatusCode(), jobSeekerId, jobId, eventType.name());
            }
        } catch (RestClientException ex) {
            log.error("[AI] Failed to record behavioral signal (seeker={}, job={}, action={}): {}",
                    jobSeekerId, jobId, eventType.name(), ex.getMessage());
        }
    }


    // ── Private helpers ───────────────────────────────────────────────────────

    private void sendAddNode(String nodeId, String text, String nodeType, String userId) {
        String url = aiServiceConfig.getAiServiceUrl() + "/api/v1/add_node";
        Map<String, Object> body = new HashMap<>();
        body.put("node_id", nodeId);
        body.put("text", text);
        body.put("node_type", nodeType);
        if (userId != null) {
            body.put("user_id", userId);
        }

        try {
            ResponseEntity<Map<String, Object>> response =
                    restTemplate.postForEntity(url, body, generify(Map.class));
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[AI] Node registered: id={}, type={}, userId={}", nodeId, nodeType, userId);
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

    // ── PDF / OCR fallback ──────────────────────────────────────────────────────

    /**
     * Calls the AI service's OCR endpoint to extract text from a job posting file
     * (PDF or image). The {@code jobId} parameter is used only for logging/tracing.
     *
     * @param jobId     UUID of the job (used for logging/tracing only)
     * @param fileBase64 Base64-encoded file bytes
     * @return Extracted text, or empty string if the OCR call fails
     */
    @SuppressWarnings("unchecked")
    public String parseJobPosting(UUID jobId, String fileBase64) {
        String url = aiServiceConfig.getAiServiceUrl() + "/api/v1/parse-pdf";
        Map<String, Object> body = Map.of(
                "resume_id",   jobId.toString(),
                "pdf_base64",  fileBase64
        );

        try {
            ResponseEntity<Map<String, Object>> response =
                    ocrRestTemplate.postForEntity(url, body, generify(Map.class));
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body_ = response.getBody();
                Boolean success = (Boolean) body_.get("success");
                if (Boolean.TRUE.equals(success)) {
                    Map<String, Object> data = (Map<String, Object>) body_.get("data");
                    if (data != null) {
                        String text = (String) data.get("text");
                        String method = (String) data.getOrDefault("method", "unknown");
                        Integer chars = (Integer) data.getOrDefault("chars_extracted", 0);
                        log.info(
                                "[AI] Job posting OCR result: jobId={} method={} chars={}",
                                jobId, method, chars
                        );
                        return text != null ? text : "";
                    }
                } else {
                    Map<String, Object> error = (Map<String, Object>) body_.get("error");
                    log.warn(
                            "[AI] OCR endpoint returned success=false: jobId={} error={}",
                            jobId, error
                    );
                }
            } else {
                log.warn(
                        "[AI] Unexpected status {} from /parse-pdf: jobId={}",
                        response.getStatusCode(), jobId
                );
            }
        } catch (RestClientException ex) {
            log.error("[AI] Job posting OCR failed: jobId={}: {}", jobId, ex.getMessage());
        }
        return "";
    }

    /**
     * Calls the AI service's OCR endpoint to extract text from a scanned PDF
     * (one whose native text layer is too short for PDFBox).
     *
     * @param resumeId  UUID of the resume (used for logging/tracing only)
     * @param pdfBase64 Base64-encoded PDF bytes
     * @return Extracted text, or empty string if the OCR call fails
     */
    @SuppressWarnings("unchecked")
    public String parsePdfFallback(UUID resumeId, String pdfBase64) {
        String url = aiServiceConfig.getAiServiceUrl() + "/api/v1/parse-pdf";
        Map<String, Object> body = Map.of(
                "resume_id",   resumeId.toString(),
                "pdf_base64",  pdfBase64
        );

        try {
            ResponseEntity<Map<String, Object>> response =
                    ocrRestTemplate.postForEntity(url, body, generify(Map.class));
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body_ = response.getBody();
                Boolean success = (Boolean) body_.get("success");
                if (Boolean.TRUE.equals(success)) {
                    Map<String, Object> data = (Map<String, Object>) body_.get("data");
                    if (data != null) {
                        String text = (String) data.get("text");
                        String method = (String) data.getOrDefault("method", "unknown");
                        Integer chars = (Integer) data.getOrDefault("chars_extracted", 0);
                        log.info(
                                "[AI] OCR parse result: resumeId={} method={} chars={}",
                                resumeId, method, chars
                        );
                        return text != null ? text : "";
                    }
                } else {
                    Map<String, Object> error = (Map<String, Object>) body_.get("error");
                    log.warn(
                            "[AI] OCR endpoint returned success=false: resumeId={} error={}",
                            resumeId, error
                    );
                }
            } else {
                log.warn(
                        "[AI] Unexpected status {} from /parse-pdf: resumeId={}",
                        response.getStatusCode(), resumeId
                );
            }
        } catch (RestClientException ex) {
            log.error("[AI] OCR fallback failed: resumeId={}: {}", resumeId, ex.getMessage());
        }
        return "";
    }

    // ── Recommendations ─────────────────────────────────────────────────────────

    /**
     * Calls the AI service's /recommend endpoint to get ranked job recommendations
     * for a given resume, excluding already-applied jobs.
     *
     * @param resumeId        Resume node ID (UUID string)
     * @param topK            Maximum number of recommendations
     * @param excludedJobIds  Comma-separated job IDs to exclude, or empty string
     * @return List of recommendation maps with "job_id" and "score" keys; empty list on failure
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getRecommendations(String resumeId, int topK, String excludedJobIds) {
        StringBuilder urlBuilder = new StringBuilder();
        urlBuilder.append(aiServiceConfig.getAiServiceUrl())
                  .append("/api/v1/recommend/")
                  .append(resumeId)
                  .append("?top_k=").append(topK);
        if (!excludedJobIds.isEmpty()) {
            urlBuilder.append("&excluded_job_ids=").append(excludedJobIds);
        }

        try {
            ResponseEntity<Map<String, Object>> response =
                    restTemplate.getForEntity(urlBuilder.toString(), generify(Map.class));
            Map<String, Object> body = response.getBody();
            if (response.getStatusCode().is2xxSuccessful() && body != null) {
                Object success = body.get("success");
                if (Boolean.TRUE.equals(success)) {
                    Map<String, Object> data = (Map<String, Object>) body.get("data");
                    if (data != null) {
                        List<Map<String, Object>> recs = (List<Map<String, Object>>) data.get("recommendations");
                        return recs != null ? recs : List.of();
                    }
                }
            }
            log.warn("[AI] Unexpected response from /recommend: status={}", response.getStatusCode());
            return List.of();
        } catch (RestClientException ex) {
            log.error("[AI] Failed to get recommendations: {}", ex.getMessage());
            return List.of();
        }
    }
}
