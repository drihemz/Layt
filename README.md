# Laytime (Layt)

Multi-tenant SaaS for laytime & demurrage calculation and management.

This repository contains a Next.js (App Router) + TypeScript frontend that integrates with Supabase for auth and data storage. The project is multi-tenant and uses Row-Level Security (RLS) in the database.

**Quick summary**
- Frameworks: `Next.js` (App Router), `TypeScript`, `Tailwind CSS`
- Backend: `Supabase` (Postgres, RLS, migrations)
- Auth: `NextAuth.js` with Supabase session integration

## Quick Start

1. Install dependencies

```powershell
npm install
```

2. Create `.env.local` at project root and add at minimum:

```
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key-KEEP-SECRET
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM=noreply@example.com
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is required for some server-side mutation endpoints (used to bypass RLS). Keep it secret — do NOT commit or share it.
- If you don't set the service role key, client reads will work but some writes (lookup management) will be blocked by RLS.
 - Super-admin notes: `super_admin` can view and create across tenants. When logged in as `super_admin`, you can optionally filter voyages by adding `?tenantId=<id>` to the Voyages listing page or use the tenant selector on the Voyages page.
 - `is_public` items ("Visible to all tenants") are now only allowed to be created/marked by `super_admin`, and will not be associated with a `tenant_id` (i.e., `tenant_id` = NULL) so they are visible to all tenants.
- The authentication flow uses email-based magic links. You need to configure the `EMAIL_SERVER` and `EMAIL_FROM` environment variables for the emails to be sent. For development, you can use a tool like [MailHog](https://github.com/mailhog/MailHog) to catch the emails locally.


3. Run migrations (use Supabase SQL or migration scripts in `supabase/migrations`)

4. Create an initial super admin (script provided):

```powershell
node scripts/create-super-admin.mjs
```

5. Start the dev server

```powershell
npm run dev
```

## Development notes

- If you hit Tailwind build errors related to `@apply` or dynamic classes, try removing `.next` and local caches and restart:

```powershell
rimraf .next
rimraf node_modules/.cache
npm run dev
```

- The app uses tenant-scoped helpers in `src/lib/db-helpers.ts` for reads. Writes that need elevated privileges are routed through `src/app/api/lookup/route.ts` (server-side) and require `SUPABASE_SERVICE_ROLE_KEY`.

## Key files and locations

- App entry/layout: `src/app/layout.tsx`
- Dashboard: `src/app/page.tsx`
- Voyages list: `src/app/voyages/page.tsx`
- Create Voyage dialog: `src/components/voyages/CreateVoyageDialog.tsx`
- Lookup / Data management UI: `src/app/data/page.tsx`
- Server-side lookup mutation route: `src/app/api/lookup/route.ts`
- Supabase helpers: `src/lib/supabase.ts`, `src/lib/db-helpers.ts`

## Supabase & RLS guidance

- The database enforces tenant isolation via RLS. Client-side anonymous or tenant-scoped requests can be allowed by RLS policies, but some flows (admin-managed lookup inserts across tenants) use a server endpoint which executes queries with the service role.
- Recommended secure pattern:
  - Validate the user's session server-side (NextAuth) and retrieve their `tenant_id`.
  - Use the service-role client only after server-side validation and apply `tenant_id` when mutating lookup tables.

## Current Highlights (see TODO.md for full list)
- Voyages: create/edit/delete, type-ahead lookups + request-new, plan limits; port calls management (multi-port legs with ETA/ETD/activity/status/sequence + allowed hours for pooling).
- Claims: extended laytime fields, calculator with SOF events (edit/delete), audit trail, attachments (NOR/SOF), time-format toggle, reversible scope (load-only/discharge-only/all ports) with pooled totals across voyage claims, per-port breakdowns (including non-reversible), themed calculator, allowed-time preview in create, and persistent reversible pooling selection (set on claim page or during creation). Claim create is sectioned with clearer validation (operation/port required).
- Data Management: tenant/public lookups, plan-based tab gating, request-new flow.
- Plans/Billing: plan limits (voyages/claims/month/seats), tenant plan assignment, invoices list/mark paid, usage/limits displayed, seat enforcement on user creation, data tab toggles.
- Admin: dashboards, tenant page with usage vs limits, plans editable with data tab toggles.
- Fonts: uses Tailwind's sans stack locally (no external Google Fonts fetch) to keep builds working in restricted environments.
- Branding/theme: unified sapphire/teal palette across core, admin, and customer-admin pages; port-call timelines with status badges; dashboard shows claims by status, upcoming port calls, and usage vs limits.
- QC & collaboration: claims now store QC status/reviewer/notes and support claim-level comments/messaging (API + UI); migration `020_qc_and_comments` adds QC columns and `claim_comments`.
- Notifications: notifications table/policies (`022_notifications`, `023_notifications_policies`, `024_notifications_policy_update`), API `/api/notifications`, notification bell with per-item mark-read and claim deep links; QC, reviewer changes, and comments trigger notifications.
- Claims UX: status/reviewer chips, filters; voyage/port-call views show chips; non-reversible claims hide per-port breakdown; dashboard adds “My Queue” (assigned reviewer) and unread count.
- Attachments: uploads now notify assigned reviewer.
- Laytime foundations: added migration `025_laytime_foundations` for cargo, charter parties, laytime profiles, laytime calculations, port activities/deductions, cargo-port laytime rows with RLS; scaffolded `src/lib/laytime-engine` for a pure TypeScript calculation module.
- Laytime APIs scaffolded: `/api/laytime-calculations` (list/create), `/api/laytime-calculations/[calcId]` (fetch calc + related data), `/api/laytime-calculations/[calcId]/recalculate` (calls engine stub).
- Laytime test UI (sandbox) at `/laytime` and `/laytime/[calcId]` is disabled by default; set `NEXT_PUBLIC_ENABLE_LAYTIME_TEST=true` to access. Sandbox is isolated from live calculator.
- Sandbox status: opt-in only; creating/recalculating sandbox laytime calcs will not touch the live calculator or live claim data. Turn the env flag off to hide all sandbox UI/APIs after testing.
- Future roadmap ideas (not yet implemented): deeper QC approvals/validation, external sharing/third-party review, versioning/diffs, SOF parsing + master SOF data, contract-driven auto-calcs, AI assistance, and GDPR-focused audit/retention tooling.

## Pending / Planned (summary)
- PDF export of laytime statement (pending dependency install).
- Reversible scope enforcement across ports (deeper per-port breakdowns when pooling is off).
- Voyage port calls UI polish and claims-from-port-calls workflow.
- Holidays/terms library, bulk import/dedupe for lookups.
- Automated invoice scheduler; deeper laytime engine, collaboration, analytics.
- Supabase database schema: All tables and relations for tenants, users, voyages, claims, calculation events, lookup (vessels, charterers, cargo, etc.)
- Migration scripts: Run migrations via Supabase Management API with your access token.
- Scripts to clear all data, and to create your first super admin user.
- **Rebuilt global styles:** `globals.css` now uses only valid Tailwind and CSS variables. All dynamic Tailwind classes are used directly in JSX/TSX files for modern branding.
- **Layout updated:** The `<body>` in `layout.tsx` now uses Tailwind classes for background and text color, referencing CSS variables for a modern maritime look.

### Screens & Features
- **Authentication**: Modern login screen, session/tenant hooks, fully secure.
- **Dashboard**: Responsive hero/KPI cards, animated stats (voyages, claims, claims in progress, amount summary), recent voyages/claims widgets.
- **Navigation**: Maritime sidebar with role-based links (main, admin, super-admin sections).
- **Modern styles**: Opacity layers, blur, gradients, animated shimmer.
- **Data Management**:
  - KYC status is now a dropdown for data consistency.
  - `super_admin` can create voyages for specific tenants.
  - `super_admin` can create lookup data (parties, vessels, ports, cargo, charter parties) and make it visible to all tenants.
  - Tenant creation dialog UI has been improved.
- **Bare minimum Tailwind (for now)**: All custom classes removed temporarily to isolate/fix build bug.

---

## How to Run

1. Clone repo and install dependencies:
   ```bash
   npm install
   ```
2. Add `.env.local` with your Supabase and NextAuth credentials.
3. Create database schema:
   - Use the migration in `supabase/migrations/` (via Supabase SQL editor or provided script)
4. Create your first super admin user:
   ```bash
   node scripts/create-super-admin.mjs
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

---

## SOF OCR (self-hosted)

- FastAPI + **PaddleOCR (CPU)** service lives in `ocr/`; PDFs stay in your infra. Requirements pin PaddleOCR 2.7.0 / PaddlePaddle 2.6.2 with PyMuPDF renders.
- Quick start with Docker: `docker compose -f docker-compose.ocr.yml up --build`
- Or run locally: `cd ocr && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port 8000`
- The Next.js proxy `/api/sof-extract` defaults to `http://localhost:8000/extract`. Override with `SOF_OCR_ENDPOINT` (current AWS test: `http://51.20.12.235:8000/extract`). Confidence floor is controlled by `SOF_CONFIDENCE_FLOOR` (default `0.35`).
- Parser highlights: dotted/ordinal dates (e.g., `22.01.2017`, `April 22nd 2024`), default date context pre-scan, cleaner header vs timeline separation (vessel/terminal/cargo), and longer API/batch timeouts (10 minutes) to reduce aborted large scans.
- Sample curl (replace path as needed):
  ```bash
  curl -X POST -F "file=@/path/to/sofs/Tailwinds - SOF - Santos.pdf" \
    http://51.20.12.235:8000/extract
  ```

---

## Known Issues

- **Build error with Tailwind custom CSS in `globals.css` and dynamic classes.**
   - Tailwind's `@apply` cannot be used with dynamic or arbitrary value classes (e.g., `bg-[hsl(var(--primary))]`).
   - All such classes are now used directly in React components' `className` attributes.
   - `globals.css` contains only static CSS and valid Tailwind usage.
   - The build error may still appear in some environments due to caching or other issues. If so, clear `.next` and `node_modules/.cache` and restart the dev server.

## Next Steps

- See [TODO.md](TODO.md) for the project roadmap.

---

_All bugs, CSS, and configs tracked in this README for clear handoff!_
