-- SI03-01 / ADR0034. Additive private submissions; never writes editorial records.
do $$
declare r record;
begin
  select * into r from pg_roles where rolname='contribution_writer';
  if found then
    if shobj_description(r.oid,'pg_authid') is distinct from 'travel-planner ADR0034 contribution writer'
      or r.rolsuper or r.rolcanlogin or r.rolbypassrls or r.rolcreaterole or r.rolcreatedb or r.rolreplication or r.rolinherit then
      raise exception 'Unexpected contribution role' using errcode='42501';
    end if;
  else
    create role contribution_writer nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
    comment on role contribution_writer is 'travel-planner ADR0034 contribution writer';
  end if;
end;
$$;
grant contribution_writer to postgres;
grant usage on schema public,extensions,trip_private to contribution_writer;
grant execute on function trip_private.current_user_id() to contribution_writer;

create schema contribution_private;
revoke all on schema contribution_private from public,anon,authenticated;
grant usage on schema contribution_private to contribution_writer,authenticated;
create table contribution_private.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default statement_timestamp()
);
revoke all on contribution_private.moderators from public,anon,authenticated,contribution_writer;
alter table contribution_private.moderators enable row level security;
create function contribution_private.is_moderator() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from contribution_private.moderators where user_id=trip_private.current_user_id());
$$;
revoke all on function contribution_private.is_moderator() from public,anon,authenticated;
grant execute on function contribution_private.is_moderator() to authenticated,contribution_writer;

create function public.contribution_valid_payload(p jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare value jsonb; category text;
begin
  if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>8192
    or not p ?& array['destination_slug','title','description','address','location','categories','tags','suggested_duration_min','transport_constraint','source','rights_confirmed']
    or exists(select 1 from jsonb_object_keys(p) k where k not in ('destination_slug','title','description','address','location','categories','tags','suggested_duration_min','transport_constraint','source','rights_confirmed')) then return false; end if;
  if p->>'destination_slug' not in ('nha-trang','da-lat') or jsonb_typeof(p->'destination_slug')<>'string'
    or p->'rights_confirmed' is distinct from 'true'::jsonb or p->>'source' is distinct from 'original_user_contribution'
    or p->>'transport_constraint' not in ('access_unverified','manual_transfer') or jsonb_typeof(p->'transport_constraint')<>'string' then return false; end if;
  foreach category in array array['title','description'] loop
    if jsonb_typeof(p->category)<>'string' or char_length(btrim(p->>category))<1 or char_length(p->>category)>(case category when 'title' then 160 else 1000 end)
      or p->>category ~ '[[:cntrl:]]' then return false; end if;
  end loop;
  if p->'address'<>'null'::jsonb and (jsonb_typeof(p->'address')<>'string' or char_length(btrim(p->>'address')) not between 1 and 300 or p->>'address' ~ '[[:cntrl:]]') then return false; end if;
  value=p->'location';
  if jsonb_typeof(value)<>'object' or not value ?& array['lat','lng'] or exists(select 1 from jsonb_object_keys(value) k where k not in ('lat','lng')) then return false; end if;
  if jsonb_typeof(value->'lat')<>'number' or jsonb_typeof(value->'lng')<>'number' then return false; end if;
  if (value->>'lat')::numeric not between -90 and 90 or (value->>'lng')::numeric not between -180 and 180 then return false; end if;
  if jsonb_typeof(p->'categories')<>'array' or jsonb_typeof(p->'tags')<>'array' or jsonb_typeof(p->'suggested_duration_min')<>'number' then return false; end if;
  if jsonb_array_length(p->'categories') not between 1 and 5 or jsonb_array_length(p->'tags')>10
    or (select count(distinct x) from jsonb_array_elements(p->'categories') x)<>jsonb_array_length(p->'categories')
    or (select count(distinct x) from jsonb_array_elements(p->'tags') x)<>jsonb_array_length(p->'tags') then return false; end if;
  for value in select * from jsonb_array_elements(p->'categories') loop
    if jsonb_typeof(value)<>'string' or (value#>>'{}') not in ('food','cafe','lodging','landmarks','nature','outdoor','viewpoint','shopping','family','services') then return false; end if;
  end loop;
  for value in select * from jsonb_array_elements(p->'tags') loop
    if jsonb_typeof(value)<>'string' or char_length(btrim(value#>>'{}')) not between 1 and 32 or value#>>'{}' ~ '[[:cntrl:]]' then return false; end if;
  end loop;
  return (p->>'suggested_duration_min')::numeric between 15 and 720 and (p->>'suggested_duration_min')::numeric=trunc((p->>'suggested_duration_min')::numeric);
end;
$$;
revoke all on function public.contribution_valid_payload(jsonb) from public,anon,authenticated;
grant execute on function public.contribution_valid_payload(jsonb) to contribution_writer;

create table public.place_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb not null check(public.contribution_valid_payload(payload)),
  destination_slug text generated always as (payload->>'destination_slug') stored references public.destinations(slug),
  state text not null default 'submitted' check(state in ('submitted','verification','approved','rejected','withdrawn')),
  version integer not null default 1 check(version between 1 and 2147483646),
  duplicate_hints jsonb not null default '[]' check(jsonb_typeof(duplicate_hints)='array' and jsonb_array_length(duplicate_hints)<=10),
  created_at timestamptz not null default statement_timestamp(), updated_at timestamptz not null default statement_timestamp(),
  unique(owner_id,idempotency_key)
);
create index submissions_owner_time on public.place_submissions(owner_id,created_at desc);
create index submissions_review on public.place_submissions(state,created_at,id);
create table public.place_submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.place_submissions(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null check(action in ('submit','verify','approve','reject','restore','withdraw')),
  state text not null check(state in ('submitted','verification','approved','rejected','withdrawn')),
  version integer not null check(version>0),
  note text not null default '' check(char_length(note)<=1000 and note !~ '[[:cntrl:]]'),
  created_at timestamptz not null default statement_timestamp(),
  unique(submission_id,version)
);
alter table public.place_submissions enable row level security;
alter table public.place_submissions force row level security;
alter table public.place_submission_events enable row level security;
alter table public.place_submission_events force row level security;
revoke all on public.place_submissions,public.place_submission_events from public,anon,authenticated;
grant select on public.place_submissions,public.place_submission_events to authenticated;
grant select,insert,update on public.place_submissions to contribution_writer;
grant select,insert on public.place_submission_events to contribution_writer;
create policy submissions_private_read on public.place_submissions for select to authenticated
  using(owner_id=(select trip_private.current_user_id()) or (select contribution_private.is_moderator()));
create policy submissions_writer_read on public.place_submissions for select to contribution_writer
  using(state='approved' or owner_id=(select trip_private.current_user_id()) or (select contribution_private.is_moderator()));
create policy submissions_writer_insert on public.place_submissions for insert to contribution_writer
  with check(owner_id=(select trip_private.current_user_id()) and state='submitted' and version=1);
create policy submissions_writer_update on public.place_submissions for update to contribution_writer
  using(owner_id=(select trip_private.current_user_id()) or (select contribution_private.is_moderator()))
  with check(owner_id=(select trip_private.current_user_id()) or (select contribution_private.is_moderator()));
create policy submission_events_read on public.place_submission_events for select to authenticated,contribution_writer
  using(exists(select 1 from public.place_submissions s where s.id=submission_id and (s.owner_id=(select trip_private.current_user_id()) or (select contribution_private.is_moderator()))));
create policy submission_events_insert on public.place_submission_events for insert to contribution_writer
  with check(actor_id=(select trip_private.current_user_id()) and exists(select 1 from public.place_submissions s where s.id=submission_id and (s.owner_id=(select trip_private.current_user_id()) or (select contribution_private.is_moderator()))));

grant select on public.places,public.destinations to contribution_writer;
alter policy destinations_public_read on public.destinations to anon,authenticated,trip_storage_writer,contribution_writer;
alter policy places_public_read on public.places to anon,authenticated,trip_storage_writer,contribution_writer;

create function public.submit_place(p_payload jsonb,p_idempotency_key uuid) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid=trip_private.current_user_id(); prior public.place_submissions; fingerprint text; hints jsonb; record_id uuid;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_idempotency_key is null or not public.contribution_valid_payload(p_payload) then raise exception 'Invalid contribution input' using errcode='22023'; end if;
  fingerprint=encode(extensions.digest(p_payload::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('contribution:'||uid::text,0));
  select * into prior from public.place_submissions where owner_id=uid and idempotency_key=p_idempotency_key;
  if found then
    if prior.request_hash<>fingerprint then return jsonb_build_object('status','idempotency_conflict'); end if;
    return jsonb_build_object('status','replayed','id',prior.id,'version',prior.version,'state',prior.state);
  end if;
  select * into prior from public.place_submissions where owner_id=uid and request_hash=fingerprint order by created_at,id limit 1;
  if found then return jsonb_build_object('status','duplicate','id',prior.id,'version',prior.version,'state',prior.state); end if;
  if (select count(*) from public.place_submissions where owner_id=uid and created_at>statement_timestamp()-interval '24 hours')>=5
    or (select count(*) from public.place_submissions where owner_id=uid and state<>'withdrawn')>=20 then return jsonb_build_object('status','rate_limited'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'id',id,'certainty','suspected')),'[]') into hints from (
    select * from (
      select 'editorial'::text kind,p.id from public.places p join public.destinations d on d.id=p.destination_id
      where d.slug=p_payload->>'destination_slug' and p.status='published' and d.status='published'
        and lower(p.title_vi)=lower(btrim(p_payload->>'title')) and abs(p.lat-(p_payload->'location'->>'lat')::numeric)<=0.002 and abs(p.lng-(p_payload->'location'->>'lng')::numeric)<=0.002
      union all
      select 'community',s.id from public.place_submissions s where s.state='approved' and s.destination_slug=p_payload->>'destination_slug'
        and lower(s.payload->>'title')=lower(btrim(p_payload->>'title')) and abs((s.payload->'location'->>'lat')::numeric-(p_payload->'location'->>'lat')::numeric)<=0.002
        and abs((s.payload->'location'->>'lng')::numeric-(p_payload->'location'->>'lng')::numeric)<=0.002
    ) candidates order by kind,id limit 10
  ) bounded;
  insert into public.place_submissions(owner_id,idempotency_key,request_hash,payload,duplicate_hints)
    values(uid,p_idempotency_key,fingerprint,p_payload,hints) returning id into record_id;
  insert into public.place_submission_events(submission_id,actor_id,action,state,version) values(record_id,uid,'submit','submitted',1);
  return jsonb_build_object('status','submitted','id',record_id,'version',1,'state','submitted');
end;
$$;
revoke all on function public.submit_place(jsonb,uuid) from public,anon,authenticated;

create function public.transition_place_submission(p_id uuid,p_expected_version integer,p_action text,p_note text default '') returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid=trip_private.current_user_id(); s public.place_submissions; moderator boolean=contribution_private.is_moderator(); next_state text;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_id is null or p_expected_version is null or p_expected_version not between 1 and 2147483645 or p_action is null or p_note is null
    or char_length(p_note)>1000 or p_note ~ '[[:cntrl:]]' then raise exception 'Invalid transition input' using errcode='22023'; end if;
  select * into s from public.place_submissions where id=p_id and (owner_id=uid or moderator) for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if s.version<>p_expected_version then return jsonb_build_object('status','version_conflict','current_version',s.version); end if;
  if s.owner_id=uid and p_action='withdraw' and s.state<>'withdrawn' then next_state='withdrawn';
  elsif s.owner_id=uid and p_action='restore' and s.state in ('withdrawn','rejected') then next_state='submitted';
  elsif moderator and p_action='verify' and s.state='submitted' then next_state='verification';
  elsif moderator and p_action='approve' and s.state='verification' and char_length(btrim(p_note))>=10 then next_state='approved';
  elsif moderator and p_action='reject' and s.state in ('submitted','verification','approved') and char_length(btrim(p_note))>=10 then next_state='rejected';
  elsif moderator and p_action='restore' and s.state='rejected' then next_state='verification';
  else return jsonb_build_object('status','transition_denied'); end if;
  update public.place_submissions set state=next_state,version=version+1,updated_at=statement_timestamp() where id=s.id;
  insert into public.place_submission_events(submission_id,actor_id,action,state,version,note) values(s.id,uid,p_action,next_state,s.version+1,p_note);
  return jsonb_build_object('status','updated','id',s.id,'version',s.version+1,'state',next_state);
end;
$$;
revoke all on function public.transition_place_submission(uuid,integer,text,text) from public,anon,authenticated;

-- Deliberately enumerated public fields. No owner, note, event, key or fingerprint.
create function public.list_community_places(p_destination_slug text,p_limit integer default 20,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if p_destination_slug is null or p_destination_slug not in ('nha-trang','da-lat') or p_limit is null or p_limit not between 1 and 20 or p_offset is null or p_offset not between 0 and 1000 then raise exception 'Invalid community query' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'destination_slug',destination_slug,'title',payload->>'title','description',payload->>'description','address',payload->'address',
    'location',payload->'location','categories',payload->'categories','tags',payload->'tags','suggested_duration_min',payload->'suggested_duration_min','transport_constraint',payload->>'transport_constraint',
    'source','original_user_contribution','moderation','community_reviewed','coordinate_confidence','user_confirmed','hours',jsonb_build_object('state','hours_unknown'),'price',jsonb_build_object('state','unknown'),'accessibility','unknown')),'[]') into result
    from (select * from public.place_submissions where destination_slug=p_destination_slug and state='approved' order by created_at,id limit p_limit offset p_offset) bounded;
  return result;
end;
$$;
revoke all on function public.list_community_places(text,integer,integer) from public,anon,authenticated;

grant create on schema public to contribution_writer;
alter function public.submit_place(jsonb,uuid) owner to contribution_writer;
alter function public.transition_place_submission(uuid,integer,text,text) owner to contribution_writer;
alter function public.list_community_places(text,integer,integer) owner to contribution_writer;
revoke create on schema public from contribution_writer;
grant execute on function public.submit_place(jsonb,uuid),public.transition_place_submission(uuid,integer,text,text) to authenticated;
grant execute on function public.list_community_places(text,integer,integer) to anon,authenticated;
