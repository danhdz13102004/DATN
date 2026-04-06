package com.recruitpro.service;

import com.recruitpro.model.Resume;
import com.recruitpro.repository.ResumeRepository;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.UUID;

/**
 * Runs PDF text-extraction in a separate thread ({@code @Async}) so the
 * resume-upload HTTP response is never delayed by parsing or AI latency.
 *
 * <p>Flow (background thread):
 * <ol>
 *   <li>Fetch the raw PDF bytes from MinIO.</li>
 *   <li>Use Apache PDFBox to strip all text.</li>
 *   <li>Persist {@code parsedText} on the {@link Resume} entity.</li>
 *   <li>Call {@link AiServiceClient#addResumeNode} with the real extracted text.</li>
 * </ol>
 *
 * <p>Any exception is caught and logged — failures must NOT affect the user-facing flow.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResumePdfParser {

    private final StorageService storageService;
    private final ResumeRepository resumeRepository;
    private final AiServiceClient aiServiceClient;

    /**
     * Extracts text from a PDF resume and sends it to the AI service.
     * This method runs in Spring's async task executor thread pool.
     *
     * @param resumeId UUID of the persisted {@link Resume}
     * @param fileKey  MinIO storage key (e.g. {@code "resumes/abc123.pdf"})
     * @param fallback Fallback text to use if extraction fails (label or "resume")
     */
    @Async
    @Transactional
    public void extractAndRegister(UUID resumeId, String fileKey, String fallback) {
        log.info("[PDF] Starting async extraction: resumeId={}, key={}", resumeId, fileKey);

        String extractedText = fallback;

        // ── Step 1: download PDF bytes from MinIO ──────────────────────────────
        byte[] pdfBytes;
        try {
            pdfBytes = storageService.downloadAsBytes(fileKey);
        } catch (Exception e) {
            log.error("[PDF] Failed to download file from storage (resumeId={}, key={}): {}",
                    resumeId, fileKey, e.getMessage());
            // Still register the node with fallback text so the graph isn't missing the node
            aiServiceClient.addResumeNode(resumeId, fallback);
            return;
        }

        // ── Step 2: extract text with PDFBox ───────────────────────────────────
        try (PDDocument doc = PDDocument.load(new ByteArrayInputStream(pdfBytes))) {
            PDFTextStripper stripper = new PDFTextStripper();
            String raw = stripper.getText(doc);
            if (raw != null && !raw.isBlank()) {
                // Sanitize: remove null bytes (0x00) and other control characters
                // that PostgreSQL's UTF-8 encoding rejects
                extractedText = sanitize(raw);
                log.info("[PDF] Extraction successful: resumeId={}, chars={}", resumeId, extractedText.length());
            } else {
                log.warn("[PDF] Extracted text is empty for resumeId={}, using fallback", resumeId);
            }
        } catch (IOException e) {
            log.error("[PDF] PDFBox extraction failed (resumeId={}): {}", resumeId, e.getMessage());
            // Continue with fallback — the AI node will still be registered
        }

        // ── Step 3: persist parsedText back to the Resume entity ───────────────
        final String finalText = extractedText;
        try {
            resumeRepository.findById(resumeId).ifPresent(resume -> {
                resume.setParsedText(finalText);
                resumeRepository.save(resume);
                log.info("[PDF] parsedText saved: resumeId={}", resumeId);
            });
        } catch (Exception e) {
            log.error("[PDF] Failed to persist parsedText (resumeId={}): {}", resumeId, e.getMessage());
        }

        // ── Step 4: register resume node in the AI graph ───────────────────────
        aiServiceClient.addResumeNode(resumeId, finalText);
    }

    /**
     * Strips characters that PostgreSQL's UTF-8 encoding rejects:
     * <ul>
     *   <li>Null bytes ({@code \x00}) — hard rejected by PostgreSQL</li>
     *   <li>Other C0/C1 ASCII control chars except tab, newline, carriage-return</li>
     * </ul>
     */
    private static String sanitize(String text) {
        if (text == null) return null;
        // Remove null bytes and non-printable control characters
        // Keep \t (0x09), \n (0x0A), \r (0x0D) which are valid in text columns
        return text.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "").trim();
    }
}
