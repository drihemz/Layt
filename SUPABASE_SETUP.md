# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: Laytime Platform
   - **Database Password**: (choose a strong password and save it)
   - **Region**: Choose the closest region to your users
5. Click "Create new project"

## 2. Get Your Supabase Credentials

Once your project is created:

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → "anon public")
   - **service_role key** (under "Project API keys" → "service_role" - keep this secret!)

## 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## 4. Database Schema

The database schema will be set up using SQL migrations. The main tables needed are:

- **tenants** - Multi-tenant organization data
- **users** - User accounts with roles
- **voyages** - Voyage information
- **claims** - Claims linked to voyages
- **calculation_events** - SOF events for calculations
- **lookup_data** - Dropdown data (vessels, charter parties, etc.)

SQL migration files will be created in the `supabase/migrations/` directory.

## 5. Next Steps

After setting up your Supabase project and environment variables:

1. Run the database migrations (will be created)
2. Test the connection by running the app
3. Set up authentication (NextAuth.js with Supabase)

