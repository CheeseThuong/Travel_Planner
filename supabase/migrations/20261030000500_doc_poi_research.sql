-- Additive research/verification queue. Does not replace existing contributions schema.
-- DO NOT deploy automatically; verify staging roles/grants and backups first.
create table if not exists public.doc_poi_research (
 id uuid primary key default gen_random_uuid(),
 destination_slug text not null check (destination_slug in ('da-lat','nha-trang')),
 slug text not null,
 title text not null check(length(title) between 1 and 160),
 category text not null check(length(category) between 1 and 50),
 description_original text not null default '' check(length(description_original) <= 1000),
 lat double precision check(lat between -90 and 90),
 lng double precision check(lng between -180 and 180),
 source_kind text not null check(source_kind in ('osm','editorial','community')),
 source_reference text not null check(length(source_reference) between 1 and 400),
 license_note text not null default '',
 quality text not null default 'unverified' check(quality in ('unverified','reviewed','verified')),
 moderation text not null default 'pending' check(moderation in ('pending','approved','rejected')),
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(destination_slug,slug),
 constraint doc_poi_coordinates_pair check((lat is null and lng is null) or (lat is not null and lng is not null)),
 constraint doc_poi_published_gate check(moderation <> 'approved' or (quality='verified' and lat is not null and lng is not null and verified_at is not null))
);
create index if not exists doc_poi_research_lookup on public.doc_poi_research (destination_slug, category, moderation);
alter table public.doc_poi_research enable row level security;
-- Only approved + verified results are readable by visitors; all writes service-side only.
-- Policy creation is idempotent, no broad write access for public/anonymous users.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='doc_poi_research' and policyname='doc_poi_public_verified') then
    create policy doc_poi_public_verified on public.doc_poi_research for select to anon,authenticated
      using (moderation='approved' and quality='verified' and verified_at is not null);
  end if;
end $$;
revoke all on public.doc_poi_research from public, anon, authenticated;
grant select on public.doc_poi_research to anon, authenticated;
-- Ingest rows through reviewed server/admin workflows; never expose service-role secret.
