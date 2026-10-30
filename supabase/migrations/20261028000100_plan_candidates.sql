-- P04-04 / ADR0029. Caller identity and existing writer RLS remain authoritative.
create function public.trip_store_validate_plan(t public.trips,c jsonb)
returns void language plpgsql set search_path='' as $$
declare d jsonb; v jsonb; u jsonb; s public.trip_stops; plan_day date; starts time; ends time;
  departure time; arrival time; lower_bound time; upper_bound time; previous_end time; position integer;
  duration integer; rest integer; ids uuid[]='{}'; dates date[]='{}'; stop_id uuid;
begin
  if jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>131072
    or not c ?& array['plan_run_id','input_version','engine_version','seed','days','unscheduled','warnings','score','budget','diagnostics','unfulfilled_required']
    or exists(select 1 from jsonb_object_keys(c) k where k not in ('plan_run_id','input_version','engine_version','seed','days','unscheduled','warnings','score','budget','diagnostics','unfulfilled_required'))
    or c->>'engine_version' is distinct from 'planner-v1' or jsonb_typeof(c->'input_version') is distinct from 'number' or jsonb_typeof(c->'seed') is distinct from 'number' or (c->>'input_version')::integer<>t.version
    or jsonb_typeof(c->'plan_run_id') is distinct from 'string' or c->>'input_version' !~ '^[0-9]+$' or c->>'seed' !~ '^-?[0-9]+$'
    or jsonb_typeof(c->'budget') is distinct from 'object' or jsonb_typeof(c->'diagnostics') is distinct from 'object' or jsonb_typeof(c->'unfulfilled_required') is distinct from 'array'
    or jsonb_typeof(c->'days') is distinct from 'array' or jsonb_typeof(c->'unscheduled') is distinct from 'array'
    or jsonb_typeof(c->'warnings') is distinct from 'array' or jsonb_typeof(c->'score') is distinct from 'object'
    or jsonb_array_length(c->'days')<>t.end_date-t.start_date+1 or jsonb_array_length(c->'unscheduled')>30
    or exists(select 1 from jsonb_array_elements_text(c->'warnings') w where w !~ '^[A-Z][A-Z0-9_]{0,79}$') then
    raise exception 'Invalid candidate contract' using errcode='22023';
  end if;
  for d in select value from jsonb_array_elements(c->'days') loop
    if jsonb_typeof(d->'date') is distinct from 'string' or jsonb_typeof(d->'stops') is distinct from 'array' then raise exception 'Invalid candidate day' using errcode='22023'; end if;
    plan_day=(d->>'date')::date;
    if plan_day<t.start_date or plan_day>t.end_date or plan_day=any(dates) or jsonb_array_length(d->'stops')>(case t.pace when 'relaxed' then 2 when 'balanced' then 3 else 4 end) then raise exception 'Invalid day bounds or capacity' using errcode='22023'; end if;
    dates=array_append(dates,plan_day);
    lower_bound=greatest((t.preferences_json->>'day_start')::time,case when plan_day=t.start_date then t.arrival_local_time else '00:00'::time end);
    upper_bound=least((t.preferences_json->>'day_end')::time,case when plan_day=t.end_date then t.departure_local_time else '24:00'::time end);
    previous_end=lower_bound; position=0;
    for v in select value from jsonb_array_elements(d->'stops') loop
      if not v ?& array['stop_id','start_local','end_local','travel_departure_local','arrival_local','rest_before_minutes','travel_from_previous_minutes','estimate_source','warnings']
        or jsonb_typeof(v->'stop_id') is distinct from 'string' or jsonb_typeof(v->'start_local') is distinct from 'string' or jsonb_typeof(v->'end_local') is distinct from 'string'
        or jsonb_typeof(v->'travel_departure_local') is distinct from 'string' or jsonb_typeof(v->'arrival_local') is distinct from 'string'
        or v->>'travel_departure_local' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or v->>'arrival_local' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or jsonb_typeof(v->'warnings') is distinct from 'array' or jsonb_typeof(v->'travel_from_previous_minutes') is distinct from 'number'
        or v->>'start_local' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        or v->>'end_local' !~ '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$'
        or v->>'estimate_source' is distinct from 'approximate'
        or jsonb_typeof(v->'rest_before_minutes') is distinct from 'number'
        or v->>'rest_before_minutes' !~ '^[0-9]+$'
        or v->>'travel_from_previous_minutes' !~ '^[0-9]+$' then raise exception 'Invalid candidate visit' using errcode='22023'; end if;
      stop_id=(v->>'stop_id')::uuid;
      select * into s from public.trip_stops where id=stop_id and trip_id=t.id;
      if not found or stop_id=any(ids) then raise exception 'Unknown or duplicate candidate stop' using errcode='22023'; end if;
      ids=array_append(ids,stop_id);
      starts=(v->>'start_local')::time; ends=(v->>'end_local')::time;
      departure=(v->>'travel_departure_local')::time; arrival=(v->>'arrival_local')::time;
      duration=(v->>'travel_from_previous_minutes')::integer;
      rest=case when position=0 then 0 else (t.preferences_json->>'rest_buffer_minutes')::integer end;
      if starts<lower_bound or ends>upper_bound or ends<=starts or starts<previous_end or extract(epoch from (ends-starts))/60<>s.requested_duration_min
        or departure<previous_end+make_interval(mins=>rest) or arrival<departure or extract(epoch from (arrival-departure))/60<>duration or starts<arrival
        or (v->>'rest_before_minutes')::integer<>rest or s.transport_constraint='manual_transfer'
        or ((t.preferences_json->>'lunch_buffer_minutes')::integer>0 and (
          (starts<'12:00'::time+make_interval(mins=>(t.preferences_json->>'lunch_buffer_minutes')::integer) and ends>'12:00'::time)
          or (arrival>departure and departure<'12:00'::time+make_interval(mins=>(t.preferences_json->>'lunch_buffer_minutes')::integer) and arrival>'12:00'::time))) then
        raise exception 'Candidate violates day feasibility' using errcode='23514';
      end if;
      if s.is_locked and (s.plan_date<>plan_day or s.planned_start_local<>starts or s.sort_index<>position) then raise exception 'Candidate changes locked stop' using errcode='23514'; end if;
      previous_end=ends; position=position+1;
    end loop;
    if position>0 and (t.preferences_json->>'return_to_base')::boolean then
      if jsonb_typeof(d->'return_leg') is distinct from 'object' or d->'return_leg'->>'estimate_source' is distinct from 'approximate'
        or not (d->'return_leg') ?& array['departure_local','arrival_local','duration_minutes','estimate_source']
        or jsonb_typeof(d->'return_leg'->'departure_local') is distinct from 'string' or jsonb_typeof(d->'return_leg'->'arrival_local') is distinct from 'string' or jsonb_typeof(d->'return_leg'->'duration_minutes') is distinct from 'number'
        or d->'return_leg'->>'duration_minutes' !~ '^[0-9]+$'
        or (d->'return_leg'->>'arrival_local')::time<(d->'return_leg'->>'departure_local')::time
        or (d->'return_leg'->>'departure_local')::time<previous_end or (d->'return_leg'->>'arrival_local')::time>upper_bound
        or ((t.preferences_json->>'lunch_buffer_minutes')::integer>0 and (d->'return_leg'->>'arrival_local')::time>(d->'return_leg'->>'departure_local')::time and (d->'return_leg'->>'departure_local')::time<'12:00'::time+make_interval(mins=>(t.preferences_json->>'lunch_buffer_minutes')::integer) and (d->'return_leg'->>'arrival_local')::time>'12:00'::time)
        or extract(epoch from ((d->'return_leg'->>'arrival_local')::time-(d->'return_leg'->>'departure_local')::time))/60<>(d->'return_leg'->>'duration_minutes')::integer then
        raise exception 'Invalid return to base' using errcode='23514';
      end if;
    end if;
  end loop;
  for u in select value from jsonb_array_elements(c->'unscheduled') loop
    if jsonb_typeof(u->'stop_id') is distinct from 'string' or jsonb_typeof(u->'message') is distinct from 'string' or u->>'message' !~ '^[A-Z][A-Z0-9_]{0,79}$' then raise exception 'Invalid unscheduled contract' using errcode='22023'; end if;
    stop_id=(u->>'stop_id')::uuid;
    select * into s from public.trip_stops where id=stop_id and trip_id=t.id;
    if not found or stop_id=any(ids) or s.is_locked or jsonb_typeof(u->'reason') is distinct from 'string' or u->>'reason' not in ('CLOSED','TIME_WINDOW','TRAVEL_TOO_LONG','CAPACITY','UNREACHABLE','DUPLICATE','OUT_OF_AREA','LOCK_CONFLICT','UNKNOWN') then raise exception 'Invalid unscheduled stop' using errcode='22023'; end if;
    ids=array_append(ids,stop_id);
  end loop;
  if cardinality(ids)<>(select count(*) from public.trip_stops where trip_id=t.id) then raise exception 'Candidate loses selected stops' using errcode='23514'; end if;
end;
$$;
revoke all on function public.trip_store_validate_plan(public.trips,jsonb) from public,anon,authenticated;

create function public.owner_store_plan(p_trip_id uuid,p_expected_version integer,p_idempotency_key uuid,p_candidate jsonb)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid=trip_private.current_user_id(); t public.trips; prior public.trip_mutations; fingerprint text; response jsonb; run_id uuid;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_expected_version is null or p_expected_version<1 or p_idempotency_key is null or p_candidate is null then raise exception 'Invalid generate input' using errcode='22023'; end if;
  fingerprint=encode(extensions.digest('generate:'||p_trip_id::text||':'||p_expected_version::text||':'||(p_candidate-'plan_run_id')::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_idempotency_key::text,0));
  select * into t from public.trips where id=p_trip_id and owner_id=uid for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  select * into prior from public.trip_mutations where owner_id=uid and idempotency_key=p_idempotency_key;
  if found then if prior.request_hash<>fingerprint then return jsonb_build_object('status','idempotency_conflict'); end if; return prior.response_json; end if;
  if t.version<>p_expected_version then return jsonb_build_object('status','version_conflict','current_version',t.version); end if;
  if t.planning_mode<>'assisted' then raise exception 'Manual mode cannot generate' using errcode='22023'; end if;
  perform public.trip_store_validate_plan(t,p_candidate);
  run_id=(p_candidate->>'plan_run_id')::uuid;
  insert into public.trip_plan_runs(id,trip_id,input_version,engine_version,seed,mode,score_json,candidate_json,warning_count)
    values(run_id,t.id,t.version,'planner-v1',(p_candidate->>'seed')::bigint,'approximate',p_candidate->'score',p_candidate,jsonb_array_length(p_candidate->'warnings'));
  response=jsonb_build_object('status','candidate','plan_run_id',run_id,'input_version',t.version);
  insert into public.trip_mutations(owner_id,idempotency_key,request_hash,response_json) values(uid,p_idempotency_key,fingerprint,response);
  return response;
end;
$$;
revoke all on function public.owner_store_plan(uuid,integer,uuid,jsonb) from public,anon,authenticated;

create function public.owner_apply_plan(p_trip_id uuid,p_plan_run_id uuid,p_expected_version integer,p_idempotency_key uuid,p_confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid=trip_private.current_user_id(); t public.trips; r public.trip_plan_runs; prior public.trip_mutations; fingerprint text; response jsonb; d jsonb; v jsonb; u jsonb; position integer;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_expected_version is null or p_expected_version<1 or p_idempotency_key is null or p_plan_run_id is null or p_confirmed is distinct from true then raise exception 'Explicit confirmed version required' using errcode='22023'; end if;
  fingerprint=encode(extensions.digest('apply:'||p_trip_id::text||':'||p_plan_run_id::text||':'||p_expected_version::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_idempotency_key::text,0));
  select * into t from public.trips where id=p_trip_id and owner_id=uid for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  select * into prior from public.trip_mutations where owner_id=uid and idempotency_key=p_idempotency_key;
  if found then if prior.request_hash<>fingerprint then return jsonb_build_object('status','idempotency_conflict'); end if; return prior.response_json; end if;
  select * into r from public.trip_plan_runs where id=p_plan_run_id and trip_id=t.id;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if r.input_version<>t.version then return jsonb_build_object('status','plan_run_stale','current_version',t.version); end if;
  if t.version<>p_expected_version then return jsonb_build_object('status','version_conflict','current_version',t.version); end if;
  if t.planning_mode<>'assisted' then raise exception 'Manual mode cannot apply generated plan' using errcode='22023'; end if;
  perform public.trip_store_validate_plan(t,r.candidate_json);
  update public.trip_stops set status='selected',plan_date=null,sort_index=null,planned_start_local=null,planned_end_local=null,unscheduled_reason=null where trip_id=t.id and not is_locked;
  for d in select value from jsonb_array_elements(r.candidate_json->'days') loop
    position=0;
    for v in select value from jsonb_array_elements(d->'stops') loop
      update public.trip_stops set status='scheduled',plan_date=(d->>'date')::date,sort_index=position,planned_start_local=(v->>'start_local')::time,planned_end_local=(v->>'end_local')::time,unscheduled_reason=null where trip_id=t.id and id=(v->>'stop_id')::uuid;
      position=position+1;
    end loop;
  end loop;
  for u in select value from jsonb_array_elements(r.candidate_json->'unscheduled') loop
    update public.trip_stops set status='unscheduled',unscheduled_reason=u->>'reason' where trip_id=t.id and id=(u->>'stop_id')::uuid and not is_locked;
  end loop;
  update public.trips set version=t.version+1,state='planned' where id=t.id and owner_id=uid and version=p_expected_version;
  set constraints public.trips_schedule,public.stops_schedule,public.trip_stops_trip_id_plan_date_sort_index_key,public.trip_stops_selection_unique immediate;
  set constraints public.trips_schedule,public.stops_schedule,public.trip_stops_trip_id_plan_date_sort_index_key,public.trip_stops_selection_unique deferred;
  response=jsonb_build_object('status','applied','id',t.id,'version',t.version+1,'state','planned');
  insert into public.trip_mutations(owner_id,idempotency_key,request_hash,response_json) values(uid,p_idempotency_key,fingerprint,response);
  return response;
end;
$$;
revoke all on function public.owner_apply_plan(uuid,uuid,integer,uuid,boolean) from public,anon,authenticated;
grant create on schema public to trip_storage_writer;
alter function public.trip_store_validate_plan(public.trips,jsonb) owner to trip_storage_writer;
alter function public.owner_store_plan(uuid,integer,uuid,jsonb) owner to trip_storage_writer;
alter function public.owner_apply_plan(uuid,uuid,integer,uuid,boolean) owner to trip_storage_writer;
revoke create on schema public from trip_storage_writer;
grant execute on function public.owner_store_plan(uuid,integer,uuid,jsonb),public.owner_apply_plan(uuid,uuid,integer,uuid,boolean) to authenticated;
