package com.recruitpro.service;

import com.recruitpro.dto.ResumeDataStructure;
import com.recruitpro.model.Resume;
import com.recruitpro.repository.ResumeRepository;
import com.recruitpro.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.UUID;

/**
 * Extracts resume PDF text and registers the resume node in the AI graph.
 *
 * <p>Flow:
 * <ol>
 *   <li>Fetch the raw PDF bytes from MinIO.</li>
 *   <li>Use Apache PDFBox to strip all text.</li>
 *   <li>Persist {@code parsedText} on the {@link Resume} entity.</li>
 *   <li>Call {@link AiServiceClient#addResumeNodeSync} with the extracted text.</li>
 * </ol>
 *
 * <p>The graph sync is strict: upload must not finish successfully unless the
 * resume node is registered in the AI graph.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResumePdfParser {

    /** Below this character count after PDFBox, the PDF is treated as scanned/image-based. */
    private static final int MIN_TEXT_CHARS = 100;

    private final StorageService storageService;
    private final ResumeRepository resumeRepository;
    private final AiServiceClient aiServiceClient;
    private final OpenAiResumeStructuringService openAiResumeStructuringService;

    /**
     * Extracts text from a PDF resume and blocks until graph registration succeeds.
     *
     * @param resumeId UUID of the persisted {@link Resume}
     * @param fileKey  MinIO storage key (e.g. {@code "resumes/abc123.pdf"})
     * @param fallback Fallback text to use if extraction fails (label or "resume")
     */
    @Transactional
    public void extractAndRegister(UUID resumeId, String fileKey, String fallback) {
        log.info("[PDF] Starting extraction: resumeId={}, key={}", resumeId, fileKey);

        String extractedText = fallback;

        // ── Step 1: download PDF bytes from MinIO ──────────────────────────────
        byte[] pdfBytes;
        try {
            pdfBytes = storageService.downloadAsBytes(fileKey);
        } catch (Exception e) {
            log.error("[PDF] Failed to download file from storage (resumeId={}, key={}): {}",
                    resumeId, fileKey, e.getMessage());
            // Still register the node with fallback text so the graph isn't missing the node
            resumeRepository.findById(resumeId).ifPresentOrElse(
                resume -> aiServiceClient.addResumeNodeSync(resumeId, fallback, resume.getJobSeekerId()),
                () -> aiServiceClient.addResumeNodeSync(resumeId, fallback, null)
            );
            return;
        }

        // ── Step 2: extract text with PDFBox ───────────────────────────────────
        try (PDDocument doc = PDDocument.load(new ByteArrayInputStream(pdfBytes))) {
            PDFTextStripper stripper = new PDFTextStripper();
            String raw = stripper.getText(doc);
            if (raw != null && !raw.isBlank()) {
                extractedText = sanitize(raw);
                log.info("[PDF] Extraction successful: resumeId={}, chars={}", resumeId, extractedText.length());
            } else {
                log.warn("[PDF] Extracted text is blank for resumeId={}", resumeId);
            }
        } catch (IOException e) {
            log.error("[PDF] PDFBox extraction failed (resumeId={}): {}", resumeId, e.getMessage());
        }

        // ── Step 2b: if PDFBox gave us too little text, fall back to OCR via AI service ─
        if (extractedText.length() < MIN_TEXT_CHARS) {
            log.info("[PDF] Text too short ({} < {} chars) — triggering OCR fallback for resumeId={}",
                    extractedText.length(), MIN_TEXT_CHARS, resumeId);
            String ocrText = aiServiceClient.parsePdfFallback(resumeId, Base64.getEncoder().encodeToString(pdfBytes));
            if (ocrText != null && !ocrText.isBlank()) {
                extractedText = ocrText;
                log.info("[PDF] OCR fallback returned {} chars for resumeId={}", ocrText.length(), resumeId);
            } else {
                log.warn("[PDF] OCR fallback returned empty text for resumeId={}, using label as last resort", resumeId);
                extractedText = fallback;
            }
        }

        // ── Step 3: persist parsedText + structured data back to the Resume entity ──
        final String finalText = extractedText;
        final UUID[] jobSeekerId = {null};
        log.info("[PDF] Final text length: resumeId={}, chars={}", resumeId, finalText.length());
        log.info("[PDF] Final text: {}", finalText);
        try {
            resumeRepository.findById(resumeId).ifPresent(resume -> {
                jobSeekerId[0] = resume.getJobSeekerId();
                resume.setParsedText(finalText);
                resumeRepository.save(resume);
                log.info("[PDF] parsedText saved: resumeId={}", resumeId);
            });
        } catch (Exception e) {
            log.error("[PDF] Failed to persist parsedText (resumeId={}): {}", resumeId, e.getMessage());
        }

        // ── Step 3b: call OpenAI to extract structured resume data ─────────────
        try {
            ResumeDataStructure dataStructure = openAiResumeStructuringService.structure(finalText);
            if (dataStructure != null) {
                resumeRepository.findById(resumeId).ifPresent(resume -> {
                    resume.setResumeDataStructure(dataStructure);
                    resumeRepository.save(resume);
                    log.info("[OpenAI] resume_data_structure saved: resumeId={}", resumeId);
                });
            }
        } catch (Exception e) {
            log.error("[OpenAI] Failed to persist resume_data_structure (resumeId={}): {}", resumeId, e.getMessage());
        }

        // ── Step 4: register resume node in the AI graph ───────────────────────
        aiServiceClient.addResumeNodeSync(resumeId, finalText, jobSeekerId[0]);
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
