"""OCR-based PDF text extraction for image-only / scanned resumes.

This module is used as a fallback when Apache PDFBox (on the Java side) extracts
very little text from a PDF — a strong signal that the file is scanned or
image-based.  Each page is rendered at 300 DPI and passed to the system Tesseract
binary (available inside the Docker container), making it an effective drop-in
replacement for pdfminer/pdfbox on hard PDFs.
"""

import logging
import subprocess
import tempfile

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

# MIN_TEXT_CHARS is the threshold below which we switch from native PDF text
# extraction to an OCR pass.  A typical resume is 1 000–5 000 characters; 100
# is a safe floor to avoid triggering OCR on PDFs that legitimately contain
# sparse content (tables, logos, etc.).
MIN_TEXT_CHARS = 100


def extract_text_with_ocr(pdf_bytes: bytes) -> tuple[str, str]:
    """
    Extract text from a PDF, falling back to Tesseract OCR when the native
    text layer is too short.

    Args:
        pdf_bytes: Raw PDF file bytes.

    Returns:
        A 2-tuple ``(extracted_text, method)`` where ``method`` is either
        ``"native"`` (native PDF text layer) or ``"ocr"`` (Tesseract OCR).

    Raises:
        ValueError: if pdf_bytes is empty or not a valid PDF.
    """
    if not pdf_bytes:
        raise ValueError("pdf_bytes must not be empty")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    try:
        # 1. Try the native text layer first (fast, no OCR cost).
        native_text = ""
        for page in doc:
            native_text += page.get_text("text")

        native_len = len(native_text.strip())
        logger.info(
            "[OCR] Native text extraction: %d chars from %d page(s)",
            native_len,
            len(doc),
        )

        if native_len >= MIN_TEXT_CHARS:
            return native_text.strip(), "native"

        # 2. Native layer too short — render each page and call Tesseract CLI.
        logger.info(
            "[OCR] Native text too short (%d < %d chars); running OCR pass",
            native_len,
            MIN_TEXT_CHARS,
        )

        ocr_text_parts: list[str] = []
        for page_num, page in enumerate(doc):
            # Render page at 300 DPI for good OCR quality.
            mat = fitz.Matrix(300 / 72, 300 / 72)
            pix = page.get_pixmap(matrix=mat, alpha=False)

            # Write rendered bitmap to a temp file that Tesseract can read.
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                tmp_path = tmp.name
                pix.save(tmp_path)

            try:
                result = subprocess.run(
                    ["tesseract", tmp_path, "stdout", "-l", "eng", "--psm", "1"],
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                if result.returncode == 0 and result.stdout:
                    page_text = result.stdout.strip()
                    ocr_text_parts.append(page_text)
                    logger.debug(
                        "[OCR] Page %d: %d OCR chars",
                        page_num + 1,
                        len(page_text),
                    )
                else:
                    logger.warning(
                        "[OCR] Page %d Tesseract returned exit code %d: %s",
                        page_num + 1,
                        result.returncode,
                        result.stderr[:200],
                    )
            except subprocess.TimeoutExpired:
                logger.warning("[OCR] Page %d Tesseract timed out after 60s", page_num + 1)
            except Exception as exc:
                logger.warning("[OCR] Page %d Tesseract call failed: %s", page_num + 1, exc)
            finally:
                # Clean up temp file.
                import os as _os
                try:
                    _os.unlink(tmp_path)
                except OSError:
                    pass

        ocr_combined = "\n".join(ocr_text_parts).strip()
        logger.info(
            "[OCR] OCR pass complete: %d total chars from %d page(s)",
            len(ocr_combined),
            len(ocr_text_parts),
        )

        return ocr_combined, "ocr"

    finally:
        doc.close()
