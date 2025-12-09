# Project Report (Laytime Platform)

## Recent Work
- Notifications: Added `notifications` table and RLS policies (`022`, `023`, `024`, `026` ensures `claim_id` exists). API `/api/notifications` supports fetch, per-item mark-read, pagination, and claim deep links; bell shows unread count and claim links, refreshes after mark-all-read. QC assignment/status changes, comments, and attachments now notify reviewers; inserts fall back gracefully if schema cache is stale.
- QC/Comments: Claims store `qc_status`, `qc_reviewer_id`, `qc_notes`; reviewer dropdown loads tenant users; only assigned reviewer/super_admin can change QC fields; claim comments API/UI; attachments/comments trigger reviewer notifications.
- Claims calculator: Status/reviewer chips and filters on claims list; non-reversible events strictly scoped to claim port call with clearer warnings; reversible pooling fixes; once-on-demurrage badge and quick edit timings panel; per-port breakdown hidden for non-reversible claims.
- Dashboard: Claims-by-status, upcoming port calls, usage vs limits, My Queue + unread badge.
- Laytime foundations: Migration `025_laytime_foundations` adds cargo, charter parties, laytime profiles, laytime calculations, port activities/deductions, cargo-port laytime rows (with RLS); scaffolded `src/lib/laytime-engine` as a pure TS module (currently stubbed).
- Laytime APIs scaffolded: `/api/laytime-calculations` (list/create), `/api/laytime-calculations/[calcId]` (fetch calc + related data), `/api/laytime-calculations/[calcId]/recalculate` (engine stub call).
- SOF extractor hardening: moved SOF tab into a client component with summary/preview/timeline, added low-confidence filtering on `/api/sof-extract` (env `SOF_CONFIDENCE_FLOOR`), and surfaced warnings/bad rows counts in the UI. Parser now normalizes split months, captures ports from loading/discharge lines, vessel/IMO/terminal more strictly, backfills cargo quantity from best match, and attaches dates to end times.
- SOF parser recent tweaks: end-times now inherit dates (roll +24h if needed), low-confidence rows are kept (flagged) instead of dropped, and terminals are cleaned when they look noisy. Batch tool remains available for Super Admin under Data Management.
- OCR server doc refreshed: main.py/Dockerfile now include CORS, higher DPI OCR (250–300), Tesseract `--oem 1 --psm 6`, and notes on keeping low-confidence rows. Use `/api/sof-extract` proxy by default to avoid CORS, and ensure the Render OCR host is responsive.
- SOF parser resiliency: added dotted/ordinal date parsing (`22.01.2017`, `April 22nd 2024`), pre-scan to set a default date context when times lack dates, stricter header vs timeline separation (clean vessel/terminal/cargo, strip suffixes), and longer API/batch timeouts (10 minutes) to reduce aborted large scans. Batch7 shows clean timelines for structured PDFs; remaining gaps: FOXTROT needs better date anchoring; `SOF HT UNITE.pdf` and `MV Taihakusan - Signed SOF.pdf` previously aborted and should be re-run with the new timeouts and checked in OCR logs.
- SOF UX: SOF tab shows signed attachment links/preview, click to jump pages, inline edit/delete/manual add (with page), “Create port call from SOF” (auto-creates claim + saves events), and “Save to claim events.” Preview has “open in new tab.” Timeline scrolls to keep preview visible.
- SOF batch: Super Admin “SOF Batch” tab under Data Management to upload multiple PDFs, run through `/api/sof-extract` proxy (avoids CORS), show per-file status, and download JSONs.
- Attachments signing: `/api/claims/[claimId]/attachments` now signs storage URLs (using `SUPABASE_SERVICE_ROLE_KEY`) and returns `signed_url` for reliable PDF embedding.
- OCR service sample: provided an updated FastAPI extractor that returns per-line bounding boxes, page/line, confidence, and boxes array for overlay; still basic date/time parsing.
- SOF highlights: Implemented client-side pdf.js renderer with aligned bbox overlays (when pdf.js loads); falls back to iframe if pdf.js fails. Local pdf.js assets expected at `public/pdfjs-dist/build/pdf.min.js` and `pdf.worker.min.js`.
- SOF mapping/admin: Added Super Admin mapper page with DB-backed canonical events, edit/delete/import/export, unmapped labels capture/export, and seeded canonical enum list in migrations `027/028`. Timeline events show original SOF text with mapped tags.
- Laytime workspace: Timeline selection now uses two-click start/end with mapped-event picker and comment; manual spans create single additions/deductions and feed totals (used/over-under/despatch/demurrage). Events with start/end are split into start/end rows for precise anchoring.
- Attachments panel moved to sit directly below Claim Details; Add Event form now above the SOF timeline and defaults to 100% rate (percent is chosen in the selection modal instead).

## Migrations
- `020_qc_and_comments.sql`: QC fields, `claim_comments`.
- `021_claim_status_extension.sql`: Expanded claim_status values.
- `022_notifications.sql`: Notifications table (user_id, tenant_id, claim_id, title/body/level/read_at).
- `023_notifications_policies.sql`: Enable RLS and select/update/insert policies.
- `024_notifications_policy_update.sql`: Broaden insert policy to authenticated/service_role.
- `026_notifications_claim_id.sql`: Ensures `claim_id` column exists on notifications.

## Open/Next Steps
- Add status/reviewer chips and filters to voyage/port-call summaries (partial in lists, extend to more screens).
- Laytime foundations: introduce cargo, charter_party, laytime_profile, laytime_calculation, port_activity, port_deduction, cargo_port_laytime_row tables with RLS.
- Laytime engine module (pure TS): derive laytime start, compute allowed/used, reversible/proration/cargo-match, once-on-demurrage.
- API: `/api/laytime-calculations`, `/recalculate`, `/statement`; HTML/JSON statement for PDF.
- Workspace UI: panels for port calls, SOF events, deductions/additions, cargo laytime grid, summary with Recalculate/Statement; validation gates (estimate-only, missing L/D, reversible/proration checks).
- Tests: unit tests for engine scenarios (single-port, reversible, proration, weather/holiday, once-on-demurrage); integration tests for create/recalc/statement; snapshots for statements.

## Stack (current/target)
- Frontend: Next.js (App Router), TypeScript, Tailwind, shadcn/Radix; notification bell integrated.
- Backend: Next.js API routes with Supabase/Postgres; RLS enforced; service-role for system tasks.
- Engine: planned pure TypeScript module in `src/lib/laytime-engine` (deterministic, testable).
- Testing: Vitest/Jest for unit; Playwright/Supertest for API; snapshots for statements.
