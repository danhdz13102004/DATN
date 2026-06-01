package com.recruitpro.service;

import com.recruitpro.dto.JobAutoFillDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.UUID;

/**
 * Orchestrates file upload → OCR text extraction → OpenAI structured extraction
 * for the auto-fill job posting feature.
 *
 * <p>All failures are swallowed and return {@code null}, enabling graceful
 * degradation in the UI — the user can still fill the form manually.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobAutoFillService {

    private final AiServiceClient aiServiceClient;
    private final OpenAiResumeStructuringService openAiService;

    /**
     * Extracts structured job data from an uploaded file (PDF or image).
     *
     * <ol>
     *   <li>Encode the file as base64.</li>
     *   <li>Send to AI-service OCR endpoint to get raw text.</li>
     *   <li>Send raw text to OpenAI for structured extraction.</li>
     *   <li>Return the {@link JobAutoFillDto}, or {@code null} on any failure.</li>
     * </ol>
     *
     * @param file The uploaded file (PDF or image)
     * @return Structured job data, or {@code null} if extraction failed
     */
    public JobAutoFillDto autoFill(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.warn("[JobAutoFill] Received empty file");
            return null;
        }

        String fileName = file.getOriginalFilename();
        String contentType = file.getContentType();
        log.info("[JobAutoFill] Processing file: name={}, contentType={}, size={}",
                 fileName, contentType, file.getSize());

        // Step 1 — base64 encode the file
        String base64;
        try {
            base64 = Base64.getEncoder().encodeToString(file.getBytes());
        } catch (IOException ex) {
            log.error("[JobAutoFill] Failed to read file bytes: {}", ex.getMessage());
            return null;
        }

        // Step 2 — call AI service OCR to extract raw text
        UUID traceId = UUID.randomUUID();
        String rawText = aiServiceClient.parseJobPosting(traceId, base64);
        if (rawText == null || rawText.isBlank()) {
            log.warn("[JobAutoFill] OCR returned empty text for file: {}", fileName);
            return null;
        }

        log.debug("[JobAutoFill] OCR extracted {} chars from {}", rawText.length(), fileName);
        log.debug("[JobAutoFill] Raw text: {}", rawText);
        // Step 3 — send raw text to OpenAI for structured extraction
        JobAutoFillDto result = openAiService.structureJob(rawText);
        if (result == null) {
            log.warn("[JobAutoFill] OpenAI structuring returned null for file: {}", fileName);
            return null;
        }

        log.info("[JobAutoFill] Auto-fill successful — title='{}', file={}",
                 result.getJobTitle(), fileName);
        return result;
    }
}
