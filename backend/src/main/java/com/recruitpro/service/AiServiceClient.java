package com.recruitpro.service;

import com.recruitpro.config.AiServiceConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

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
@RequiredArgsConstructor
public class AiServiceClient {

    private final @Qualifier("aiRestTemplate") RestTemplate restTemplate;
    private final AiServiceConfig aiServiceConfig;

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
