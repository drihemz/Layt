# Project Report (Laytime Platform)

## Recent Work
- Notifications: Added `notifications` table and RLS policies (`022`, `023`, `024`). API `/api/notifications` supports fetch, per-item mark-read, pagination support, and claim deep links; bell UI shows unread count and errors. QC assignment/status changes, comments, and attachments create notifications.
- QC/Comments: Claims store `qc_status`, `qc_reviewer_id`, `qc_notes`; reviewer dropdown loads tenant users; only assigned reviewer/super_admin can change QC fields; claim comments API/UI.
- Claims UX: Status/reviewer chips and filters on claims list; voyage/port-call views show chips; dashboard has “My Queue” (claims where user is reviewer) and unread notifications; per-port breakdown hidden for non-reversible claims; reversible pooling fixes.
- Dashboard: Claims-by-status, upcoming port calls, usage vs limits, My Queue + unread badge.

## Migrations
- `020_qc_and_comments.sql`: QC fields, `claim_comments`.
- `021_claim_status_extension.sql`: Expanded claim_status values.
- `022_notifications.sql`: Notifications table (user_id, tenant_id, claim_id, title/body/level/read_at).
- `023_notifications_policies.sql`: Enable RLS and select/update/insert policies.
- `024_notifications_policy_update.sql`: Broaden insert policy to authenticated/service_role.

## Open/Next Steps
- Extend notifications to attachments; add pagination.
- Add status/reviewer chips and filters to voyage/port-call summaries.
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
