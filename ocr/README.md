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

You need system packages `poppler` (for pdf2image) and `tesseract-ocr`. On Debian/Ubuntu these are installed via `apt` (see Dockerfile).

## Docker
```bash
cd ocr
docker build -t layt-sof-ocr .
docker run --rm -p 8000:8000 layt-sof-ocr
```

## Endpoint
- `POST /extract` with `multipart/form-data` and field `file` (PDF or image)
- Response: `{ events, boxes, warnings, meta }` as described in `docs/sof-schema.md`

## Notes
- OCR defaults: DPI 250 (raise to 300 if scans are faint), `--oem 1 --psm 6`, `lang="eng"`.
- Returns per-line bounding boxes for overlays; keeps low-confidence lines instead of dropping them.
- Adjust CORS in `main.py` to restrict origins for production.
