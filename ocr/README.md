# Internal SOF OCR Service

Self-hosted FastAPI + Tesseract service for SOF extraction so PDFs never leave our infra.

## Quick start (local)
```bash
cd ocr
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

The service now uses **PaddleOCR** (CPU) with PyMuPDF rendering; no Tesseract is required. PaddleOCR and PaddlePaddle are installed via `requirements.txt`.

## Endpoint
- `POST /extract` with `multipart/form-data` and field `file` (PDF or image)
- Response: `{ events, boxes, warnings, meta }` as described in `docs/sof-schema.md`

## Notes
- OCR defaults: grayscale render at configurable DPI (default 150) to keep PaddleOCR fast; per-call timeout and global budgets enforced.
- Returns per-line bounding boxes for overlays; keeps low-confidence lines instead of dropping them.
- Adjust CORS in `main.py` to restrict origins for production.
- Tunables (env): `SOF_OCR_DPI`, `SOF_PREVIEW_DPI`, `SOF_MAX_SECONDS`, `SOF_PAGE_SECONDS`, `SOF_MAX_PDF_PAGES`, `SOF_MIN_TEXT_CHARS`, `SOF_PADDLE_LANG`, `SOF_PADDLE_THREADS`, `SOF_TESS_TIMEOUT` (per-call Paddle timeout guard). The server auto-uses the PDF text layer when present to skip OCR.
- Example test (replace path as needed, current AWS test host):
  ```bash
  curl -X POST -F "file=@/path/to/Tailwinds - SOF - Santos.pdf" \
    http://51.20.12.235:8000/extract
  ```
