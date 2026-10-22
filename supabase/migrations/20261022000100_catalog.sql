-- P02-01: editorial catalog only. Owner/trip schemas follow in later tasks.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

create table public.destinations (
  id uuid primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_vi text not null check (length(name_vi) between 1 and 120),
  name_en text not null check (length(name_en) between 1 and 120),
  timezone text not null check (timezone = 'Asia/Ho_Chi_Minh'),
  center_lat numeric not null check (center_lat between -90 and 90),
  center_lng numeric not null check (center_lng between -180 and 180),
  cover_image_key text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  database_license text not null,
  attribution text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.places (
  id uuid primary key,
  destination_id uuid not null references public.destinations(id),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title_vi text not null check (length(title_vi) between 1 and 200),
  category text not null check (category in ('culture', 'museum', 'beach', 'park', 'market', 'attraction')),
  description_vi text not null,
  lat numeric not null check (lat between -90 and 90),
  lng numeric not null check (lng between -180 and 180),
  recommended_duration_min integer not null check (recommended_duration_min between 15 and 720),
  visit_priority integer not null check (visit_priority between 0 and 100),
  hours_json jsonb,
  hours_source text,
  hours_checked_at timestamptz,
  image_key text not null,
  content_license text not null,
  provider_place_id text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  editorial_metadata jsonb not null check (jsonb_typeof(editorial_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (destination_id, slug),
  constraint places_hours_provenance check (
    (hours_json is null and hours_source is null and hours_checked_at is null)
    or (hours_json is not null and jsonb_typeof(hours_json) = 'object' and hours_source is not null and hours_checked_at is not null)
  )
);

create index places_destination_category_idx on public.places(destination_id, category, id);
create index places_published_idx on public.places(destination_id, slug) where status = 'published';

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;
create trigger destinations_updated_at before update on public.destinations
  for each row execute function public.set_updated_at();
create trigger places_updated_at before update on public.places
  for each row execute function public.set_updated_at();

alter table public.destinations enable row level security;
alter table public.places enable row level security;
revoke all on public.destinations, public.places from public, anon, authenticated;
grant select on public.destinations, public.places to anon, authenticated;
create policy destinations_public_read on public.destinations
  for select to anon, authenticated using (status = 'published');
create policy places_public_read on public.places
  for select to anon, authenticated using (
    status = 'published' and exists (
      select 1 from public.destinations d where d.id = destination_id and d.status = 'published'
    )
  );
