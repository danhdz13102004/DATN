package com.recruitpro.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recruitpro.config.OpenAiConfig;
import com.recruitpro.dto.JobAutoFillDto;
import com.recruitpro.dto.ResumeDataStructure;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Calls the OpenAI Chat Completions API to extract structured information
 * from raw resume text and returns a {@link ResumeDataStructure}.
 *
 * <p>The response is requested as a strict JSON object so it can be directly
 * parsed without any markdown stripping.
 */
@Slf4j
@Service
public class OpenAiResumeStructuringService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final RestTemplate restTemplate;
    private final OpenAiConfig openAiConfig;

    public OpenAiResumeStructuringService(
            @Qualifier("openAiRestTemplate") RestTemplate restTemplate,
            OpenAiConfig openAiConfig) {
        this.restTemplate = restTemplate;
        this.openAiConfig = openAiConfig;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Prompt
    // ─────────────────────────────────────────────────────────────────────────

    private static final String SYSTEM_PROMPT = """
            You are a professional resume parser. Extract structured information \
            from the resume text provided by the user and return it as a single \
            JSON object — no markdown fences, no explanation, only JSON.

            The JSON must conform exactly to this schema:
            {
              "role":               "<primary job title, e.g. Software Engineer>",
              "seniority":          "<one of: Intern | Junior | Mid-level | Senior | Lead | Manager | Director | Executive>",
              "years_experience":   <integer, total years of professional experience>,
              "industry":           "<primary industry, e.g. Technology | Finance | Healthcare | Education | Other>",
              "skills":             "<comma-separated list of technical and soft skills>",
              "summary":            "<2–4 sentence professional summary written in third person>",
              "experience_bullets": "<key achievements / responsibilities from all roles, joined by '; '>"\
            }

            Rules:
            - If a field cannot be determined, use null for numbers and "" for strings.
            - years_experience must be an integer (round half-years down).
            - Do NOT invent information that is not present in the resume.
            - Skills must include both technical skills and tools/frameworks found in the text.
            - experience_bullets should contain the 5–10 most impactful bullet points.
            """;

    private static final String JOB_SYSTEM_PROMPT = """
            You are a job description parser. Extract structured job posting information \
            from the text and return a single JSON object — no markdown fences, no explanation, only JSON.

            JSON schema:
            {
              "job_title":           "<primary job title>",
              "description":         "<full job description>",
              "job_type":            "<FULLTIME|PARTTIME|REMOTE|HYBRID>",
              "experience_levels":   ["<INTERN|FRESHER|JUNIOR|MIDDLE|SENIOR|LEADER>", ...],
              "location":            "<city or remote>",
              "salary_min":          <integer USD>,
              "salary_max":          <integer USD>,
              "industry":            "<one of the allowed industry names below>",
              "responsibilities":    ["bullet 1", "bullet 2", ...],
              "requirements":        ["bullet 1", "bullet 2", ...],
              "must_have_skills":   ["skill 1", "skill 2", ...],
              "nice_to_have_skills": ["skill 1", "skill 2", ...]
            }

            Rules:
            - Use null for numbers and [] for empty arrays when not determinable.
            - Infer job_type from keywords (remote, part-time, etc.).
            - experience_levels is an ARRAY — a job posting may hire multiple levels \
            (e.g. ["JUNIOR","MIDDLE","SENIOR"]). Include every level mentioned in the text.
            - Infer experience levels from seniority keywords (e.g. "3+ years" -> JUNIOR/MIDDLE, \
            "5+ years" -> MIDDLE/SENIOR).
            - skills should be technical and professional only.
            - industry MUST be one of these exact values (case-sensitive):
              Technology & IT | Finance & Banking | Healthcare & Medical | Education | \
              Manufacturing | Retail & E-commerce | Marketing & Advertising | Legal & Compliance | \
              Real Estate | Media & Entertainment | Transportation & Logistics | Food & Beverage | \
              Construction | Government & Public Sector | Non-profit & NGO | Energy & Utilities | \
              Telecommunications | Consulting | Human Resources | Agriculture
              Pick the closest match. If no match at all, use null.
            """;

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Sends {@code resumeText} to OpenAI and returns a structured {@link ResumeDataStructure}.
     * Returns {@code null} if the call fails or the response cannot be parsed.
     *
     * @param resumeText Raw text extracted from the resume PDF
     */
    public ResumeDataStructure structure(String resumeText) {
        if (resumeText == null || resumeText.isBlank()) {
            log.warn("[OpenAI] Skipping structuring — resume text is blank");
            return null;
        }

        if (openAiConfig.getApiKey() == null || openAiConfig.getApiKey().isBlank()) {
            log.warn("[OpenAI] Skipping structuring — OPENAI_API_KEY is not configured");
            return null;
        }

        String baseUrl = openAiConfig.getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank() || !baseUrl.startsWith("http")) {
            log.warn("[OpenAI] Skipping structuring — base-url is not configured or not absolute: '{}'", baseUrl);
            return null;
        }

        // Truncate to ~12 000 chars to stay within token limits for gpt-4o-mini
        String truncated = resumeText.length() > 12_000
                ? resumeText.substring(0, 12_000)
                : resumeText;

        Map<String, Object> requestBody = buildRequestBody(truncated);
        String url = baseUrl + "/chat/completions";

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, requestBody, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("[OpenAI] Unexpected status {}: {}", response.getStatusCode(), response.getBody());
                return null;
            }

            return parseResponse(response.getBody());

        } catch (RestClientException ex) {
            log.error("[OpenAI] HTTP call failed: {}", ex.getMessage());
            return null;
        }
    }

    /**
     * Sends {@code rawText} (extracted from a job posting file) to OpenAI and returns
     * a structured {@link JobAutoFillDto}.
     * Returns {@code null} if the call fails or the response cannot be parsed.
     *
     * @param rawText Raw text extracted from the job posting file via OCR
     */
    public JobAutoFillDto structureJob(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            log.warn("[OpenAI] Skipping job structuring — text is blank");
            return null;
        }

        if (openAiConfig.getApiKey() == null || openAiConfig.getApiKey().isBlank()) {
            log.warn("[OpenAI] Skipping job structuring — OPENAI_API_KEY is not configured");
            return null;
        }

        String baseUrl = openAiConfig.getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank() || !baseUrl.startsWith("http")) {
            log.warn("[OpenAI] Skipping job structuring — base-url is not configured or not absolute: '{}'", baseUrl);
            return null;
        }

        // Truncate to ~12 000 chars to stay within token limits
        String truncated = rawText.length() > 12_000
                ? rawText.substring(0, 12_000)
                : rawText;

        Map<String, Object> requestBody = buildJobRequestBody(truncated);
        String url = baseUrl + "/chat/completions";

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, requestBody, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("[OpenAI] Unexpected status {} for job structuring: {}",
                         response.getStatusCode(), response.getBody());
                return null;
            }

            return parseJobResponse(response.getBody());

        } catch (RestClientException ex) {
            log.error("[OpenAI] Job structuring HTTP call failed: {}", ex.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers — job path
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, Object> buildJobRequestBody(String userContent) {
        return Map.of(
                "model", openAiConfig.getModel(),
                "temperature", 0,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", JOB_SYSTEM_PROMPT),
                        Map.of("role", "user",   "content", userContent)
                )
        );
    }

    private JobAutoFillDto parseJobResponse(String responseBody) {
        try {
            JsonNode root    = MAPPER.readTree(responseBody);
            String   content = root.path("choices").get(0)
                                   .path("message").path("content").asText();

            JobAutoFillDto result = MAPPER.readValue(content, JobAutoFillDto.class);
            log.info("[OpenAI] Job structuring successful — title={}", result.getJobTitle());
            return result;

        } catch (JsonProcessingException | NullPointerException e) {
            log.error("[OpenAI] Failed to parse job structuring response: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers — resume path
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, Object> buildRequestBody(String userContent) {
        return Map.of(
                "model", openAiConfig.getModel(),
                "temperature", 0,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user",   "content", userContent)
                )
        );
    }

    private ResumeDataStructure parseResponse(String responseBody) {
        try {
            JsonNode root    = MAPPER.readTree(responseBody);
            String   content = root.path("choices").get(0)
                                   .path("message").path("content").asText();

            ResumeDataStructure result = MAPPER.readValue(content, ResumeDataStructure.class);
            log.info("[OpenAI] Structuring successful — role={}, seniority={}",
                     result.getRole(), result.getSeniority());
            return result;

        } catch (JsonProcessingException | NullPointerException e) {
            log.error("[OpenAI] Failed to parse structuring response: {}", e.getMessage());
            return null;
        }
    }
}
