# Laytime and Demurrage Platform

**Multi-tenant SaaS tool for laytime and demurrage calculation and management (Next.js, Supabase, Tailwind).**

---

## What Has Been Accomplished

### Core Foundation
- Project initialized with Next.js (App Router) and TypeScript.
- Authentication: NextAuth.js with Supabase, safe multi-tenant session context, roles: `super_admin`, `customer_admin`, and `operator` (user isolation).
- Multi-tenant database: All tables filtered by tenant (with strict policies and helpers), role-based authorization middleware.
- Modern UI/UX: Maritime-inspired visuals (blue/teal gradients, wave pattern, glass effect, gradients, animated shimmer, custom sidebar, dashboard widgets).
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
- **Bare minimum Tailwind (for now)**: All custom classes removed temporarily to isolate/fix build bug.

---

## How to Run

1. Clone repo and install dependencies:
   ```bash
   npm install
   ```
2. Add `.env.local` with your Supabase and NextAuth credentials.
3. Create database schema:
   - Use the migration in `supabase/migrations/001_initial_schema.sql` (via Supabase SQL editor or provided script)
4. Create your first super admin user:
   ```bash
   node scripts/create-super-admin.mjs
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

---

## Known Issues

- **Build error with Tailwind custom CSS in `globals.css` and dynamic classes.**
   - Tailwind's `@apply` cannot be used with dynamic or arbitrary value classes (e.g., `bg-[hsl(var(--primary))]`).
   - All such classes are now used directly in React components' `className` attributes.
   - `globals.css` contains only static CSS and valid Tailwind usage.
   - The build error may still appear in some environments due to caching or other issues. If so, clear `.next` and `node_modules/.cache` and restart the dev server.

## Next Steps

- Gradually restore custom styles (track which section/file causes build error)
- Continue with: Voyages screen, Claims screen, Calculation UI, Data screen, Admin panels
- Refine UX/UI based on current market tools for laytime management.

---

_All bugs, CSS, and configs tracked in this README for clear handoff!_