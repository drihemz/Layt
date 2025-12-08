-- SOF canonical events mapping tables
create table if not exists public.sof_canonical_events (
  id text primary key,
  label text,
  keywords text[] default '{}',
  confidence numeric,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sof_unmapped_labels (
  label text primary key,
  count integer default 0,
  last_seen_at timestamptz default now(),
  sample_file text
);

-- Basic indexes
create index if not exists idx_sof_unmapped_labels_count on public.sof_unmapped_labels(count desc);

-- Optional: RLS off by default; enable and add policies as needed.
-- alter table public.sof_canonical_events enable row level security;
-- alter table public.sof_unmapped_labels enable row level security;
