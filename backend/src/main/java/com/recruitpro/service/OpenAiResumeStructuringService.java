package com.recruitpro.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.recruitpro.config.OpenAiConfig;
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

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
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
