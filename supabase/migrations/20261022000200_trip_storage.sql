-- P02-02. Private tables are protected at creation; owner HTTP auth is P02-03.
do $$
declare r record;
begin
  select * into r from pg_roles where rolname='trip_storage_writer';
  if found then
    if shobj_description(r.oid,'pg_authid') is distinct from 'travel-planner ADR0020 transaction writer'
      or r.rolsuper or r.rolcanlogin or r.rolbypassrls or r.rolcreaterole or r.rolcreatedb or r.rolreplication or r.rolinherit then
      raise exception 'Unexpected trip writer role' using errcode='42501';
    end if;
  else
    create role trip_storage_writer nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
    comment on role trip_storage_writer is 'travel-planner ADR0020 transaction writer';
  end if;
end;
$$;
grant trip_storage_writer to postgres;
grant usage on schema public, extensions to trip_storage_writer;
-- Managed Auth ACLs cannot be delegated by postgres. Expose only the current UID,
-- following Supabase's supported custom-role helper pattern, not Auth table access.
create schema trip_private;
revoke all on schema trip_private from public,anon,authenticated;
grant usage on schema trip_private to authenticated,trip_storage_writer;
create function trip_private.current_user_id() returns uuid
language sql security definer stable set search_path='' as $$ select auth.uid(); $$;
revoke all on function trip_private.current_user_id() from public,anon,authenticated;
grant execute on function trip_private.current_user_id() to authenticated,trip_storage_writer;
grant select on public.destinations, public.places to trip_storage_writer;
alter policy destinations_public_read on public.destinations to anon, authenticated, trip_storage_writer;
alter policy places_public_read on public.places to anon, authenticated, trip_storage_writer;
alter table public.places add constraint places_id_destination_unique unique(id,destination_id);

create table public.trips (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  destination_id uuid not null references public.destinations(id),
  title text not null check (length(btrim(title)) between 1 and 120),
  start_date date not null,
  end_date date not null,
  timezone text not null check (timezone='Asia/Ho_Chi_Minh'),
  arrival_local_time time not null,
  departure_local_time time not null,
  base_lat numeric not null check (base_lat between -90 and 90),
  base_lng numeric not null check (base_lng between -180 and 180),
  base_label text not null check (length(btrim(base_label)) between 1 and 200),
  base_temporary boolean not null default false,
  transport_mode text not null check (transport_mode in ('walk','motorbike','drive')),
  pace text not null check (pace in ('relaxed','balanced','active')),
  preferences_json jsonb not null check (jsonb_typeof(preferences_json)='object'),
  state text not null default 'draft' check (state in ('draft','planned')),
  version integer not null default 1 check (version>=1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,destination_id),
  check (end_date between start_date and start_date+6),
  check (end_date>start_date or departure_local_time>arrival_local_time),
  check (extract(second from arrival_local_time)=0 and extract(second from departure_local_time)=0)
);
create index trips_owner_updated_idx on public.trips(owner_id,updated_at desc,id);

create table public.trip_stops (
  id uuid primary key,
  trip_id uuid not null,
  destination_id uuid not null,
  catalog_place_id uuid,
  provider_place_id text check (length(provider_place_id) between 1 and 500),
  user_title text not null check (length(btrim(user_title)) between 1 and 200),
  user_lat numeric not null check (user_lat between -90 and 90),
  user_lng numeric not null check (user_lng between -180 and 180),
  coordinate_provenance text not null check (coordinate_provenance in ('editorial','user_entered')),
  requested_duration_min integer not null check (requested_duration_min between 15 and 720),
  is_required boolean not null default false,
  is_locked boolean not null default false,
  selection_index integer not null check (selection_index between 0 and 29),
  hours_json jsonb not null default '{"state":"hours_unknown"}' check (
    jsonb_typeof(hours_json)='object' and hours_json ? 'state' and hours_json->>'state' in ('hours_unknown','verified_editorial')
  ),
  transport_constraint text not null default 'access_unverified' check (transport_constraint in ('land','manual_transfer','access_unverified')),
  plan_date date,
  sort_index integer check (sort_index>=0),
  planned_start_local time,
  planned_end_local time,
  status text not null default 'selected' check (status in ('selected','scheduled','unscheduled','completed')),
  unscheduled_reason text check (unscheduled_reason in ('CLOSED','TIME_WINDOW','TRAVEL_TOO_LONG','CAPACITY','UNREACHABLE','DUPLICATE','OUT_OF_AREA','LOCK_CONFLICT','UNKNOWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(trip_id,destination_id) references public.trips(id,destination_id) on delete cascade,
  foreign key(catalog_place_id,destination_id) references public.places(id,destination_id),
  unique(trip_id,plan_date,sort_index) deferrable initially deferred,
  constraint trip_stops_selection_unique unique(trip_id,selection_index) deferrable initially deferred,
  check (catalog_place_id is not null or coordinate_provenance='user_entered'),
  check ((status in ('scheduled','completed') and plan_date is not null and sort_index is not null and planned_start_local is not null and planned_end_local is not null)
    or (status in ('selected','unscheduled') and plan_date is null and sort_index is null and planned_start_local is null and planned_end_local is null)),
  check (not is_locked or status in ('scheduled','completed')),
  check (planned_end_local is null or (planned_end_local>planned_start_local and extract(second from planned_start_local)=0 and extract(second from planned_end_local)=0)),
  check ((status='unscheduled' and unscheduled_reason is not null) or (status<>'unscheduled' and unscheduled_reason is null))
);
create index trip_stops_trip_idx on public.trip_stops(trip_id,id);

create table public.trip_plan_runs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  input_version integer not null check (input_version>=1),
  engine_version text not null check (length(engine_version) between 1 and 64),
  seed bigint not null check (seed between -9007199254740991 and 9007199254740991),
  mode text not null check (mode in ('approximate','google_routes','mixed')),
  score_json jsonb not null default '{}' check (jsonb_typeof(score_json)='object'),
  candidate_json jsonb not null check (jsonb_typeof(candidate_json)='object'),
  warning_count integer not null default 0 check (warning_count>=0),
  created_at timestamptz not null default now()
);
create index trip_plan_runs_trip_created_idx on public.trip_plan_runs(trip_id,created_at desc,id);

create table public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  permission text not null default 'read' check (permission='read'),
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  check (expires_at is null or expires_at>created_at)
);
create index trip_shares_trip_idx on public.trip_shares(trip_id,created_at desc,id);

create table public.trip_mutations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  response_json jsonb not null check (jsonb_typeof(response_json)='object'),
  created_at timestamptz not null default now(),
  primary key(owner_id,idempotency_key)
);

create table public.provider_usage_daily (
  usage_date date not null,
  provider text not null check (length(provider) between 1 and 64),
  operation text not null check (length(operation) between 1 and 64),
  count bigint not null default 0 check (count>=0),
  estimated_cost_minor bigint not null default 0 check (estimated_cost_minor>=0),
  primary key(usage_date,provider,operation)
);

alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;
alter table public.trip_plan_runs enable row level security;
alter table public.trip_shares enable row level security;
alter table public.trip_mutations enable row level security;
alter table public.provider_usage_daily enable row level security;
revoke all on public.trips,public.trip_stops,public.trip_plan_runs,public.trip_shares,public.trip_mutations,public.provider_usage_daily from public,anon,authenticated;
grant select on public.trips,public.trip_stops,public.trip_plan_runs to authenticated;
grant select(id,trip_id,permission,created_by,expires_at,revoked_at,created_at,last_accessed_at) on public.trip_shares to authenticated;
grant select,insert,update,delete on public.trips,public.trip_stops,public.trip_plan_runs,public.trip_shares,public.trip_mutations to trip_storage_writer;
create policy trips_owner on public.trips for all to authenticated,trip_storage_writer
  using (owner_id=(select trip_private.current_user_id())) with check (owner_id=(select trip_private.current_user_id()));
create policy stops_owner on public.trip_stops for all to authenticated,trip_storage_writer
  using (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select trip_private.current_user_id())))
  with check (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select trip_private.current_user_id())));
create policy runs_owner on public.trip_plan_runs for all to authenticated,trip_storage_writer
  using (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select trip_private.current_user_id())))
  with check (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select trip_private.current_user_id())));
create policy shares_owner on public.trip_shares for all to authenticated,trip_storage_writer
  using (exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select trip_private.current_user_id())))
  with check (created_by=(select trip_private.current_user_id()) and exists(select 1 from public.trips t where t.id=trip_id and t.owner_id=(select trip_private.current_user_id())));
create policy mutations_owner on public.trip_mutations for all to trip_storage_writer
  using (owner_id=(select trip_private.current_user_id())) with check (owner_id=(select trip_private.current_user_id()));
-- Provider ledger intentionally has no policy/grant until its bounded adapter exists.

create function public.trip_identity_immutable() returns trigger language plpgsql set search_path='' as $$
begin
  if new.id<>old.id or new.owner_id<>old.owner_id or new.destination_id<>old.destination_id then
    raise exception 'Trip identity is immutable' using errcode='23514';
  end if;
  if new.version<>old.version+1 then raise exception 'Trip version must increment once' using errcode='23514'; end if;
  return new;
end;
$$;
revoke all on function public.trip_identity_immutable() from public,anon,authenticated;
create trigger trips_identity before update on public.trips for each row execute function public.trip_identity_immutable();
create trigger trips_updated_at before update on public.trips for each row execute function public.set_updated_at();
create trigger trip_stops_updated_at before update on public.trip_stops for each row execute function public.set_updated_at();

create function public.trip_schedule_integrity() returns trigger language plpgsql set search_path='' as $$
declare target uuid; t public.trips;
begin
  if tg_table_name='trips' then target=new.id; else target=coalesce(new.trip_id,old.trip_id); end if;
  select * into t from public.trips where id=target;
  if not found then return null; end if;
  if (select count(*) from public.trip_stops where trip_id=target)>30 then
    raise exception 'Trip supports at most 30 selected stops' using errcode='23514';
  end if;
  if exists(select 1 from public.trip_stops where trip_id=target and (plan_date<t.start_date or plan_date>t.end_date)) then
    raise exception 'Schedule outside trip dates' using errcode='23514';
  end if;
  if exists(select 1 from public.trip_stops where trip_id=target and status in ('scheduled','completed') group by plan_date having count(*)>8) then
    raise exception 'Day supports at most eight scheduled stops' using errcode='23514';
  end if;
  return null;
end;
$$;
revoke all on function public.trip_schedule_integrity() from public,anon,authenticated;
create constraint trigger trips_schedule after insert or update on public.trips deferrable initially deferred for each row execute function public.trip_schedule_integrity();
create constraint trigger stops_schedule after insert or update or delete on public.trip_stops deferrable initially deferred for each row execute function public.trip_schedule_integrity();
