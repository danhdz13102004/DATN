"""PDF parsing API — OCR-based fallback for image-only / scanned resume PDFs.

This endpoint is invoked by the Java backend (ResumePdfParser) only when
Apache PDFBox extracts fewer than 100 characters — a strong indicator that
the PDF is scanned or has no extractable text layer.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.models.schemas import ParsePdfRequest, ParsePdfResponse
from app.services.ocr_service import extract_text_with_ocr

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/parse-pdf", response_model=ParsePdfResponse)
def parse_pdf(req: ParsePdfRequest):
    """
    Extract text from a PDF using OCR (PyMuPDF + Tesseract).

    This endpoint is intentionally lightweight (no ML models loaded) so it can
    run on any AI-service replica without GPU / model initialisation overhead.

    Request body
    -------------
    resume_id : str
        UUID of the resume being processed (for logging/tracing only).
    pdf_base64 : str
        Base64-encoded PDF file bytes.

    Response
    --------
    text : str
        Extracted text (may be empty if even OCR fails).
    method : "native" | "ocr"
        Which extraction method was used.
    chars_extracted : int
        Character count of the returned text.
    """
    if not req.pdf_base64:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "error": {"code": "EMPTY_PAYLOAD", "message": "pdf_base64 must not be empty."},
                "meta": None,
            },
        )

    try:
        import base64

        pdf_bytes = base64.b64decode(req.pdf_base64)
    except Exception as exc:
        logger.warning("[parse-pdf] Base64 decode failed for resume_id=%s: %s", req.resume_id, exc)
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "error": {"code": "INVALID_BASE64", "message": f"Failed to decode pdf_base64: {exc}"},
                "meta": None,
            },
        )

    try:
        text, method = extract_text_with_ocr(pdf_bytes)
    except Exception as exc:
        logger.error("[parse-pdf] OCR extraction failed for resume_id=%s: %s", req.resume_id, exc)
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "data": None,
                "error": {"code": "OCR_FAILED", "message": f"OCR extraction failed: {exc}"},
                "meta": None,
            },
        )

    chars = len(text)
    logger.info(
        "[parse-pdf] Completed: resume_id=%s method=%s chars=%d",
        req.resume_id,
        method,
        chars,
    )

    return ParsePdfResponse(
        success=True,
        data={
            "resume_id": req.resume_id,
            "text": text,
            "method": method,
            "chars_extracted": chars,
        },
        error=None,
        meta=None,
    )
