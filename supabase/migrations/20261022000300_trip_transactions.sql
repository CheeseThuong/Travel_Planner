-- P02-02 SQL repository. No public HTTP owner endpoint is opened by this migration.
create extension if not exists pgcrypto with schema extensions;

create function public.trip_store_replace_stops(p_trip public.trips,p_stops jsonb,p_confirm_locked_changes boolean)
returns void language plpgsql set search_path='' as $$
declare s jsonb; previous jsonb; old_stops jsonb; old_entry jsonb; old_id text;
  place public.places; cat_id uuid; stop_id uuid; stop_title text; lat numeric; lng numeric;
  provenance text; hours jsonb; transport text; provider_id text; locked boolean;
  scheduled_date date; scheduled_start time; scheduled_end time; position integer; selection_position integer; stop_status text; reason text;
begin
  if jsonb_typeof(p_stops) is distinct from 'array' or jsonb_array_length(p_stops)>30 then
    raise exception 'Invalid stop list' using errcode='22023';
  end if;
  select coalesce(jsonb_object_agg(id::text,to_jsonb(x)),'{}') into old_stops from public.trip_stops x where trip_id=p_trip.id;
  if not p_confirm_locked_changes then
    for old_id,old_entry in select * from jsonb_each(old_stops) loop
      if (old_entry->>'is_locked')::boolean then
        select value into s from jsonb_array_elements(p_stops) where value->>'id'=old_id;
        if s is null or s->'lock' is null or s->'lock'='null'::jsonb
          or (s->'lock'->>'plan_date')::date is distinct from (old_entry->>'plan_date')::date
          or (s->'lock'->>'start_local')::time is distinct from (old_entry->>'planned_start_local')::time
          or (s->'lock'->>'sort_index')::integer is distinct from (old_entry->>'sort_index')::integer
          or (s->>'requested_duration_min')::integer is distinct from (old_entry->>'requested_duration_min')::integer then
          raise exception 'Locked stop change needs explicit owner confirmation' using errcode='23514';
        end if;
      end if;
    end loop;
  end if;

  delete from public.trip_stops where trip_id=p_trip.id;
  for s,selection_position in select value,(ordinality-1)::integer from jsonb_array_elements(p_stops) with ordinality order by ordinality loop
    if jsonb_typeof(s) is distinct from 'object' or s ? 'owner_id'
      or jsonb_typeof(s->'id') is distinct from 'string' or jsonb_typeof(s->'requested_duration_min') is distinct from 'number'
      or jsonb_typeof(s->'is_required') is distinct from 'boolean'
      or (s ? 'destination_slug' and s->>'destination_slug' is distinct from (select slug from public.destinations where id=p_trip.destination_id)) then
      raise exception 'Invalid stop fields' using errcode='22023';
    end if;
    stop_id=(s->>'id')::uuid; cat_id=(s->>'catalog_place_id')::uuid;
    if cat_id is not null then
      select * into place from public.places where id=cat_id and destination_id=p_trip.destination_id and status='published';
      if not found then raise exception 'Catalog place unavailable for destination' using errcode='22023'; end if;
      stop_title=place.title_vi; lat=place.lat; lng=place.lng; provenance='editorial'; provider_id=place.provider_place_id;
      hours=case when place.hours_json is null then '{"state":"hours_unknown"}'::jsonb else
        jsonb_build_object('state','verified_editorial','source',place.hours_source,'checked_at',place.hours_checked_at,'intervals',coalesce(place.hours_json->'intervals','[]')) end;
      transport=case when place.editorial_metadata->>'transport_constraint'='manual_island_transfer_required' then 'manual_transfer'
        when place.editorial_metadata->>'transport_constraint'='land' then 'land' else 'access_unverified' end;
    else
      if jsonb_typeof(s->'location'->'lat') is distinct from 'number' or jsonb_typeof(s->'location'->'lng') is distinct from 'number'
        or s->>'coordinate_provenance' is distinct from 'user_entered' then
        raise exception 'Manual coordinates require explicit user provenance' using errcode='22023';
      end if;
      stop_title=s->>'user_title'; lat=(s->'location'->>'lat')::numeric; lng=(s->'location'->>'lng')::numeric;
      provenance='user_entered'; provider_id=s->>'provider_place_id'; hours='{"state":"hours_unknown"}'::jsonb;
      transport=s->>'transport_constraint';
    end if;
    previous=old_stops->(stop_id::text);
    locked=s ? 'lock' and s->'lock'<>'null'::jsonb;
    if locked then
      if jsonb_typeof(s->'lock') is distinct from 'object' then raise exception 'Invalid lock' using errcode='22023'; end if;
      scheduled_date=(s->'lock'->>'plan_date')::date; scheduled_start=(s->'lock'->>'start_local')::time;
      scheduled_end=(scheduled_start+make_interval(mins=>(s->>'requested_duration_min')::integer))::time;
      position=(s->'lock'->>'sort_index')::integer; stop_status=case when previous->>'status'='completed' then 'completed' else 'scheduled' end; reason=null;
    else
      scheduled_date=(previous->>'plan_date')::date; scheduled_start=(previous->>'planned_start_local')::time;
      scheduled_end=(previous->>'planned_end_local')::time; position=(previous->>'sort_index')::integer;
      stop_status=coalesce(previous->>'status','selected'); reason=previous->>'unscheduled_reason';
    end if;
    insert into public.trip_stops(id,trip_id,destination_id,catalog_place_id,provider_place_id,user_title,user_lat,user_lng,coordinate_provenance,
      requested_duration_min,is_required,is_locked,selection_index,hours_json,transport_constraint,plan_date,sort_index,planned_start_local,planned_end_local,status,unscheduled_reason,created_at)
    values(stop_id,p_trip.id,p_trip.destination_id,cat_id,provider_id,stop_title,lat,lng,provenance,
      (s->>'requested_duration_min')::integer,(s->>'is_required')::boolean,locked,selection_position,hours,transport,scheduled_date,position,scheduled_start,scheduled_end,stop_status,reason,
      coalesce((previous->>'created_at')::timestamptz,statement_timestamp()));
  end loop;
end;
$$;
revoke all on function public.trip_store_replace_stops(public.trips,jsonb,boolean) from public,anon,authenticated;

create function public.owner_save_trip(p_draft jsonb,p_expected_version integer,p_idempotency_key uuid,p_confirm_locked_changes boolean default false)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid=trip_private.current_user_id(); trip_id uuid; destination uuid; stored public.trips; saved public.trips;
  fingerprint text; prior public.trip_mutations; response jsonb; prefs jsonb; base jsonb;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_draft is null or jsonb_typeof(p_draft)<>'object' or octet_length(p_draft::text)>65536
    or p_expected_version is null or p_expected_version<0 or p_expected_version>=2147483647 or p_idempotency_key is null
    or p_confirm_locked_changes is null then raise exception 'Invalid save input' using errcode='22023'; end if;
  if not p_draft ?& array['id','version','destination_slug','title','start_date','end_date','timezone','arrival_local_time','departure_local_time','base_location','transport_mode','pace','preferences','stops']
    or exists(select 1 from jsonb_object_keys(p_draft) k where k not in ('id','version','destination_slug','title','start_date','end_date','timezone','arrival_local_time','departure_local_time','base_location','transport_mode','pace','preferences','stops')) then
    raise exception 'Invalid draft fields' using errcode='22023';
  end if;
  if exists(select 1 from unnest(array['id','destination_slug','title','start_date','end_date','timezone','arrival_local_time','departure_local_time','transport_mode','pace']) k
      where jsonb_typeof(p_draft->k) is distinct from 'string')
    or jsonb_typeof(p_draft->'version') is distinct from 'number' then raise exception 'Invalid draft field types' using errcode='22023'; end if;
  if jsonb_typeof(p_draft->'stops') is distinct from 'array' then raise exception 'Invalid stops' using errcode='22023'; end if;
  if jsonb_array_length(p_draft->'stops')>30 then raise exception 'Too many stops' using errcode='22023'; end if;
  if (p_draft->>'version')::integer<>greatest(p_expected_version,1) then raise exception 'Draft version mismatch' using errcode='22023'; end if;
  if p_draft->>'start_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or p_draft->>'end_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or p_draft->>'arrival_local_time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or p_draft->>'departure_local_time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Invalid local calendar' using errcode='22023';
  end if;
  prefs=p_draft->'preferences'; base=p_draft->'base_location';
  if jsonb_typeof(prefs) is distinct from 'object' or not prefs ?& array['day_start','day_end','lunch_buffer_minutes','rest_buffer_minutes','return_to_base']
    or jsonb_typeof(base) is distinct from 'object' or jsonb_typeof(base->'lat') is distinct from 'number'
    or jsonb_typeof(base->'lng') is distinct from 'number' or jsonb_typeof(base->'temporary') is distinct from 'boolean' or jsonb_typeof(base->'label') is distinct from 'string'
    or jsonb_typeof(prefs->'day_start') is distinct from 'string' or jsonb_typeof(prefs->'day_end') is distinct from 'string'
    or jsonb_typeof(prefs->'lunch_buffer_minutes') is distinct from 'number' or jsonb_typeof(prefs->'rest_buffer_minutes') is distinct from 'number'
    or jsonb_typeof(prefs->'return_to_base') is distinct from 'boolean'
    or exists(select 1 from jsonb_object_keys(base) k where k not in ('lat','lng','label','temporary'))
    or exists(select 1 from jsonb_object_keys(prefs) k where k not in ('day_start','day_end','lunch_buffer_minutes','rest_buffer_minutes','return_to_base')) then raise exception 'Invalid preferences or base' using errcode='22023'; end if;
  if prefs->>'day_start' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or prefs->>'day_end' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or (prefs->>'day_end')::time<=(prefs->>'day_start')::time
    or prefs->>'lunch_buffer_minutes' !~ '^[0-9]+$' or (prefs->>'lunch_buffer_minutes')::integer not between 0 and 180
    or prefs->>'rest_buffer_minutes' !~ '^[0-9]+$' or (prefs->>'rest_buffer_minutes')::integer not between 0 and 180 then
    raise exception 'Invalid daily preferences' using errcode='22023';
  end if;
  trip_id=(p_draft->>'id')::uuid;
  fingerprint=encode(extensions.digest(p_draft::text||':'||p_expected_version::text||':'||p_confirm_locked_changes::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_idempotency_key::text,0));
  select * into prior from public.trip_mutations where owner_id=uid and idempotency_key=p_idempotency_key;
  if found then
    if prior.request_hash<>fingerprint then return jsonb_build_object('status','idempotency_conflict'); end if;
    return prior.response_json;
  end if;
  select * into stored from public.trips where id=trip_id and owner_id=uid for update;
  if p_expected_version>0 then
    if not found then return jsonb_build_object('status','not_found'); end if;
    if stored.version<>p_expected_version then return jsonb_build_object('status','version_conflict','current_version',stored.version); end if;
  elsif found then return jsonb_build_object('status','id_conflict'); end if;
  select id into destination from public.destinations where slug=p_draft->>'destination_slug' and status='published';
  if not found then raise exception 'Destination unavailable' using errcode='22023'; end if;
  if p_expected_version>0 and stored.destination_id<>destination then raise exception 'Destination is immutable' using errcode='23514'; end if;
  if p_expected_version=0 then
    insert into public.trips(id,owner_id,destination_id,title,start_date,end_date,timezone,arrival_local_time,departure_local_time,
      base_lat,base_lng,base_label,base_temporary,transport_mode,pace,preferences_json)
    values(trip_id,uid,destination,p_draft->>'title',(p_draft->>'start_date')::date,(p_draft->>'end_date')::date,p_draft->>'timezone',
      (p_draft->>'arrival_local_time')::time,(p_draft->>'departure_local_time')::time,(base->>'lat')::numeric,(base->>'lng')::numeric,base->>'label',
      (base->>'temporary')::boolean,p_draft->>'transport_mode',p_draft->>'pace',prefs) returning * into saved;
  else
    update public.trips set title=p_draft->>'title',start_date=(p_draft->>'start_date')::date,end_date=(p_draft->>'end_date')::date,
      timezone=p_draft->>'timezone',arrival_local_time=(p_draft->>'arrival_local_time')::time,departure_local_time=(p_draft->>'departure_local_time')::time,
      base_lat=(base->>'lat')::numeric,base_lng=(base->>'lng')::numeric,base_label=base->>'label',base_temporary=(base->>'temporary')::boolean,
      transport_mode=p_draft->>'transport_mode',pace=p_draft->>'pace',preferences_json=prefs,version=stored.version+1
      where id=trip_id and owner_id=uid and version=p_expected_version returning * into saved;
  end if;
  perform public.trip_store_replace_stops(saved,p_draft->'stops',p_confirm_locked_changes);
  -- Force deferred schedule/FK/order validation before recording success or idempotency.
  set constraints public.trips_schedule,public.stops_schedule,public.trip_stops_trip_id_plan_date_sort_index_key,public.trip_stops_selection_unique immediate;
  set constraints public.trips_schedule,public.stops_schedule,public.trip_stops_trip_id_plan_date_sort_index_key,public.trip_stops_selection_unique deferred;
  response=jsonb_build_object('status','saved','id',saved.id,'version',saved.version,'state',saved.state);
  insert into public.trip_mutations(owner_id,idempotency_key,request_hash,response_json) values(uid,p_idempotency_key,fingerprint,response);
  return response;
end;
$$;
revoke all on function public.owner_save_trip(jsonb,integer,uuid,boolean) from public,anon,authenticated;

create function public.owner_delete_trip(p_trip_id uuid,p_expected_version integer) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid=trip_private.current_user_id(); stored public.trips;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_expected_version is null or p_expected_version<1 then raise exception 'Expected version required' using errcode='22023'; end if;
  select * into stored from public.trips where id=p_trip_id and owner_id=uid for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if stored.version<>p_expected_version then return jsonb_build_object('status','version_conflict','current_version',stored.version); end if;
  delete from public.trips where id=stored.id and owner_id=uid;
  return jsonb_build_object('status','removed');
end;
$$;
revoke all on function public.owner_delete_trip(uuid,integer) from public,anon,authenticated;

-- ALTER OWNER requires temporary CREATE on schema, removed before this migration ends.
grant create on schema public to trip_storage_writer;
alter function public.trip_store_replace_stops(public.trips,jsonb,boolean) owner to trip_storage_writer;
alter function public.owner_save_trip(jsonb,integer,uuid,boolean) owner to trip_storage_writer;
alter function public.owner_delete_trip(uuid,integer) owner to trip_storage_writer;
revoke create on schema public from trip_storage_writer;
grant execute on function public.owner_save_trip(jsonb,integer,uuid,boolean),public.owner_delete_trip(uuid,integer) to authenticated;
