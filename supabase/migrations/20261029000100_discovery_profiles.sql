-- SD01-02 / ADR0031. Preserve all legacy rows and rights; profiles start draft.
create function public.discovery_category(c text) returns text language sql immutable set search_path='' as $$
 select case c when 'culture' then 'landmarks' when 'museum' then 'landmarks' when 'attraction' then 'landmarks' when 'beach' then 'nature' when 'park' then 'nature' when 'market' then 'shopping' else c end;
$$;
revoke all on function public.discovery_category(text) from public,anon,authenticated;

create function public.discovery_sources_valid(s jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;
begin
 if jsonb_typeof(s) is distinct from 'array' or octet_length(s::text)>32768 then return false; end if;
 if jsonb_array_length(s) not between 1 and 8 then return false; end if;
 for item in select value from jsonb_array_elements(s) loop
  if jsonb_typeof(item) is distinct from 'object' or not item ?& array['provider','provider_id','url','license','retrieved_at','retention'] then return false; end if;
  if exists(select 1 from jsonb_object_keys(item) k where k not in ('provider','provider_id','url','license','retrieved_at','retention')) then return false; end if;
  if item->>'provider' not in ('openstreetmap','editorial','user') or item->>'provider' is null
    or jsonb_typeof(item->'license') is distinct from 'string' or length(btrim(item->>'license')) not between 1 and 200
    or jsonb_typeof(item->'retrieved_at') is distinct from 'string' or item->>'retrieved_at' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or (item->>'retrieved_at')::date::text<>item->>'retrieved_at'
    or (jsonb_typeof(item->'url') is distinct from 'null' and (jsonb_typeof(item->'url') is distinct from 'string' or item->>'url' !~ '^https://' or length(item->>'url')>2048))
    or (jsonb_typeof(item->'provider_id') is distinct from 'null' and (jsonb_typeof(item->'provider_id') is distinct from 'string' or length(item->>'provider_id') not between 1 and 500))
    or (case when item->>'provider'='user' then item->>'retention' is distinct from 'user_owned' else item->>'retention' is distinct from 'open_license' end)
    or (item->>'provider'='openstreetmap' and item->>'license' is distinct from 'ODbL-1.0') then return false; end if;
 end loop;
 return true;
exception when invalid_datetime_format or datetime_field_overflow then return false;
end;
$$;
revoke all on function public.discovery_sources_valid(jsonb) from public,anon,authenticated;

create function public.discovery_scores_valid(s jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item record;
begin
 if jsonb_typeof(s) is distinct from 'object' or octet_length(s::text)>4096 then return false; end if;
 for item in select key,value from jsonb_each(s) loop
  if length(item.key) not between 1 and 80 or jsonb_typeof(item.value) is distinct from 'number' then return false; end if;
  if (item.value::text)::numeric not between 0 and 1 then return false; end if;
 end loop;
 return true;
end;
$$;
revoke all on function public.discovery_scores_valid(jsonb) from public,anon,authenticated;

alter table public.places drop constraint places_category_check;
alter table public.places add constraint places_category_check check (category in ('culture','museum','beach','park','market','attraction','food','cafe','lodging','landmarks','nature','outdoor','viewpoint','shopping','family','services'));

create table public.place_discovery_profiles (
 place_id uuid primary key,
 destination_id uuid not null,
 categories text[] not null check (cardinality(categories) between 1 and 10 and array_position(categories,null) is null and categories <@ array['food','cafe','lodging','landmarks','nature','outdoor','viewpoint','shopping','family','services']),
 tags text[] not null default '{}' check (cardinality(tags)<=32 and array_position(tags,null) is null and octet_length(tags::text)<=4096),
 alternate_names text[] not null default '{}' check (cardinality(alternate_names)<=20 and array_position(alternate_names,null) is null and octet_length(alternate_names::text)<=4096),
 address text check (length(btrim(address)) between 1 and 500),
 coordinate_confidence text not null check (coordinate_confidence in ('community_point','geometry_center_not_entrance','provider_unverified','user_confirmed','verified_entrance')),
 sources jsonb not null check (public.discovery_sources_valid(sources)),
 coordinate_source_index integer not null default 0 check (coordinate_source_index>=0 and coordinate_source_index<jsonb_array_length(sources)),
 accessibility text not null default 'unknown' check (accessibility in ('unknown','step_free','restricted')),
 transport_constraint text not null default 'access_unverified' check (transport_constraint in ('land','manual_transfer','access_unverified')),
 moderation_status text not null default 'draft' check (moderation_status in ('draft','submitted','approved','rejected')),
 interest_scores jsonb not null default '{}' check (public.discovery_scores_valid(interest_scores)),
 price_min_vnd bigint, price_max_vnd bigint, price_checked_at timestamptz, price_source jsonb,
 foreign key (place_id,destination_id) references public.places(id,destination_id) on delete cascade,
 check ((price_min_vnd is null and price_max_vnd is null and price_checked_at is null and price_source is null)
   or (price_min_vnd is not null and price_max_vnd is not null and price_checked_at is not null and price_source is not null
     and price_min_vnd between 0 and 1000000000000 and price_max_vnd between price_min_vnd and 1000000000000 and public.discovery_sources_valid(jsonb_build_array(price_source))))
);
create index place_discovery_categories_idx on public.place_discovery_profiles using gin(categories);
alter table public.place_discovery_profiles enable row level security;
revoke all on public.place_discovery_profiles from public,anon,authenticated;
grant select on public.place_discovery_profiles to anon,authenticated;
create policy discovery_approved_read on public.place_discovery_profiles for select to anon,authenticated using (
 moderation_status='approved' and exists(select 1 from public.places p join public.destinations d on d.id=p.destination_id where p.id=place_id and p.destination_id=place_discovery_profiles.destination_id and p.status='published' and d.status='published')
);

create function public.discovery_profile_category_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='places' then
  if exists(select 1 from public.place_discovery_profiles p where p.place_id=new.id and not public.discovery_category(new.category)=any(p.categories)) then raise exception 'Parent category must remain in discovery groups' using errcode='23514'; end if;
 else
  if not (select public.discovery_category(p.category)=any(new.categories) from public.places p where p.id=new.place_id) then raise exception 'Discovery groups must include parent category' using errcode='23514'; end if;
 end if;
 return new;
end;
$$;
revoke all on function public.discovery_profile_category_guard() from public,anon,authenticated;
create trigger discovery_category_guard before insert or update on public.place_discovery_profiles for each row execute function public.discovery_profile_category_guard();
create trigger discovery_parent_category_guard before update of category on public.places for each row execute function public.discovery_profile_category_guard();

create function public.discovery_legacy_profile(p public.places) returns public.place_discovery_profiles language sql immutable set search_path='' as $$
 select p.id,p.destination_id,array[public.discovery_category(p.category)],array['legacy:'||p.category],array[]::text[],null::text,
  coalesce(p.editorial_metadata->>'coordinate_quality','provider_unverified'),
  jsonb_build_array(jsonb_build_object('provider','openstreetmap','provider_id',(p.editorial_metadata->'data_source'->>'object_type')||'/'||(p.editorial_metadata->'data_source'->>'object_id'),
   'url',p.editorial_metadata->'data_source'->>'url','license',p.editorial_metadata->'data_source'->>'license','retrieved_at',p.editorial_metadata->'data_source'->>'retrieved_on','retention','open_license')),
  0,'unknown',case when p.editorial_metadata->>'transport_constraint'='manual_island_transfer_required' then 'manual_transfer' else 'access_unverified' end,
  'draft','{}'::jsonb,null::bigint,null::bigint,null::timestamptz,null::jsonb;
$$;
revoke all on function public.discovery_legacy_profile(public.places) from public,anon,authenticated;
insert into public.place_discovery_profiles select (public.discovery_legacy_profile(p)).* from public.places p where p.editorial_metadata->'data_source'->>'provider'='openstreetmap';

create function public.discovery_bootstrap_profile() returns trigger language plpgsql set search_path='' as $$
begin
 insert into public.place_discovery_profiles select (public.discovery_legacy_profile(new)).*;
 return new;
end;
$$;
revoke all on function public.discovery_bootstrap_profile() from public,anon,authenticated;
create trigger discovery_seed_profile after insert on public.places for each row when (new.editorial_metadata->'data_source'->>'provider'='openstreetmap') execute function public.discovery_bootstrap_profile();
