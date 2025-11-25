# Project TODO

This file tracks the development progress of the Laytime Platform. It is designed to be detailed and comprehensible for any team member, including AI agents, to understand the project's status.

## Phase 1: Core Functionality and UI

### Completed Tasks

- [x] **Initial Setup and Configuration:**
  - [x] Initialized Next.js project with TypeScript.
  - [x] Integrated Supabase for database and authentication.
  - [x] Set up NextAuth.js for session management.
  - [x] Configured Tailwind CSS for styling.

- [x] **User Interface and Layout:**
  - [x] Implemented a modern, maritime-inspired UI/UX.
  - [x] Created a responsive sidebar for navigation.
  - [x] Designed a dashboard with KPI cards and widgets.
  - [x] Addressed and fixed Tailwind CSS build errors.

- [x] **Data Management and Multi-Tenancy:**
  - [x] **KYC Status Dropdown:**
    - [x] Replaced the free text input for KYC status in the `PartyDialog` with a dropdown menu.
    - [x] Defined a predefined list of statuses ('Pending', 'Verified', 'Rejected') to ensure data consistency.
  - [x] **Super Admin Voyage Creation:**
    - [x] Enabled `super_admin` users to select a tenant when creating a new voyage.
    - [x] Implemented a tenant selection dropdown in the `CreateVoyageDialog`.
    - [x] Updated the `/api/voyages` API to handle voyage creation for the selected tenant.
  - [x] **"Visible for All" for Lookup Data:**
    - [x] Added an `is_public` boolean flag to all lookup tables (`parties`, `vessels`, `ports`, `cargo_names`, `charter_parties`).
    - [x] Allowed `super_admin` to create lookup data visible to all tenants via a checkbox in all data dialogs.
    - [x] Updated RLS policies to allow all users to read records where `is_public` is true.
  - [x] **Tenant Creation Dialog UI:**
    - [x] Increased the width of the `CreateTenantDialog` for a better user experience.

- [x] **Bug Fixes and Migrations:**
  - [x] **Fixed Tenant Dropdown in Voyage Creation:**
    - [x] Added a `GET` handler to the `/api/admin/tenants` API route to fetch all tenants.
    - [x] Ensured the tenant selection dropdown in `CreateVoyageDialog` is populated with data.
  - [x] **Database Migrations:**
    - [x] Created and applied a database migration to add the `is_public` column and update RLS policies.
    - [x] Resolved migration errors related to permissions and function existence.
    - [x] Created roles for `customer_admin` and `operator` and granted them to the `authenticator` role.
  - [x] **Fixed Missing Checkbox Component:**
    - [x] Created the `src/components/ui/checkbox.tsx` file.
    - [x] Installed the missing `@radix-ui/react-checkbox` dependency.
  - [x] **Fixed `400 Bad Request` on Data Creation:**
    - [x] Corrected the `table` name in the payload in `CargoDialog.tsx` and `CharterPartyDialog.tsx`.
  - [x] **Fixed Authentication and Data Fetching:**
    - [x] Reverted to `CredentialsProvider` and implemented a secure way to generate Supabase JWTs.
    - [x] Simplified the data fetching logic in the Data Management page to rely on RLS policies.

### To Be Done

- [ ] **Refine UI/UX:**
  - [ ] Continuously improve the user interface and user experience based on feedback.
  - [ ] Review and enhance the responsiveness of all components.

- [ ] **Build out remaining screens:**
  - [ ] **Claims Screen:**
    - [ ] Design and implement the UI for listing and managing claims.
    - [ ] Create a dialog for creating new claims.
  - [ ] **Calculation UI:**
    - [ ] Design and implement the UI for laytime and demurrage calculations.
    - [ ] Integrate the calculation engine.
  - [ ] **Admin Panels:**
    - [ ] Enhance the `super_admin` dashboard with more features.
    - [ ] Implement user management for `customer_admin`.

- [ ] **Restore Custom Styles:**
  - [ ] Gradually restore custom styles that were removed to fix build errors.
  - [ ] Isolate and fix any remaining Tailwind CSS issues.

- [ ] **Add Automated Tests:**
  - [ ] Implement unit tests for critical components and utility functions.
  - [ ] Add integration tests for key user flows, such as voyage creation and claim submission.

- [ ] **API Hardening:**
  - [ ] Add session checks to all protected API routes.
  - [ ] Implement robust error handling and logging.