-- P02-03 / ADR0022. Extend the owner transaction without granting direct writes.
alter table public.trips
  add column party_size integer not null default 1 check (party_size between 1 and 30),
  add column planning_mode text not null default 'assisted' check (planning_mode in ('assisted','manual')),
  add column budget_total_vnd bigint check (budget_total_vnd between 0 and 1000000000000),
  add column budget_costs_json jsonb not null default '{"lodging":0,"transport":0,"meals":0,"other":0}'::jsonb check (
    jsonb_typeof(budget_costs_json)='object'
    and budget_costs_json ?& array['lodging','transport','meals','other']
    and budget_costs_json-'lodging'-'transport'-'meals'-'other'='{}'::jsonb
    and (budget_costs_json->>'lodging') ~ '^[0-9]+$' and (budget_costs_json->>'lodging')::numeric<=1000000000000
    and (budget_costs_json->>'transport') ~ '^[0-9]+$' and (budget_costs_json->>'transport')::numeric<=1000000000000
    and (budget_costs_json->>'meals') ~ '^[0-9]+$' and (budget_costs_json->>'meals')::numeric<=1000000000000
    and (budget_costs_json->>'other') ~ '^[0-9]+$' and (budget_costs_json->>'other')::numeric<=1000000000000
  );

alter table public.trip_stops
  add column estimated_cost_vnd bigint check (estimated_cost_vnd between 0 and 1000000000000),
  add column cost_provenance text not null default 'unknown' check (cost_provenance in ('user_entered','unknown')),
  add column cost_applies_to text check (cost_applies_to in ('group','per_person')),
  add constraint trip_stops_cost_consistency check (
    (cost_provenance='unknown' and estimated_cost_vnd is null and cost_applies_to is null)
    or (cost_provenance='user_entered' and estimated_cost_vnd is not null and cost_applies_to is not null)
  );

-- The legacy atomic save increments the public version exactly once. The new
-- outer writer then enriches only ADR0022 columns in the same transaction.
-- This exception is unavailable to authenticated callers and rejects any
-- change outside the new fields.
create or replace function public.trip_identity_immutable() returns trigger language plpgsql set search_path='' as $$
begin
  if new.id<>old.id or new.owner_id<>old.owner_id or new.destination_id<>old.destination_id then
    raise exception 'Trip identity is immutable' using errcode='23514';
  end if;
  if current_user='trip_storage_writer' and new.version=old.version
    and (to_jsonb(new)-'party_size'-'planning_mode'-'budget_total_vnd'-'budget_costs_json')
      =(to_jsonb(old)-'party_size'-'planning_mode'-'budget_total_vnd'-'budget_costs_json') then
    return new;
  end if;
  if new.version<>old.version+1 then raise exception 'Trip version must increment once' using errcode='23514'; end if;
  return new;
end;
$$;
revoke all on function public.trip_identity_immutable() from public,anon,authenticated;

alter function public.owner_save_trip(jsonb,integer,uuid,boolean) rename to owner_save_trip_legacy;
revoke all on function public.owner_save_trip_legacy(jsonb,integer,uuid,boolean) from public,anon,authenticated;

create function public.owner_save_trip(p_draft jsonb,p_expected_version integer,p_idempotency_key uuid,p_confirm_locked_changes boolean default false)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid=trip_private.current_user_id(); prior public.trip_mutations; fingerprint text; legacy_draft jsonb; response jsonb;
  budget jsonb; costs jsonb; s jsonb; clean_stops jsonb; cost jsonb; stop_id uuid;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_draft is null or jsonb_typeof(p_draft)<>'object' or octet_length(p_draft::text)>65536
    or not p_draft ?& array['party_size','planning_mode','budget']
    or exists(select 1 from jsonb_object_keys(p_draft) k where k not in ('id','version','destination_slug','title','start_date','end_date','timezone','arrival_local_time','departure_local_time','base_location','transport_mode','pace','party_size','planning_mode','budget','preferences','stops'))
    or jsonb_typeof(p_draft->'party_size') is distinct from 'number' or (p_draft->>'party_size') !~ '^[0-9]+$'
    or (p_draft->>'party_size')::integer not between 1 and 30
    or jsonb_typeof(p_draft->'planning_mode') is distinct from 'string' or p_draft->>'planning_mode' not in ('assisted','manual') then
    raise exception 'Invalid party or planning mode' using errcode='22023';
  end if;
  budget=p_draft->'budget'; costs=budget->'known_costs_vnd';
  if jsonb_typeof(budget) is distinct from 'object' or not budget ?& array['currency','total_vnd','known_costs_vnd']
    or exists(select 1 from jsonb_object_keys(budget) k where k not in ('currency','total_vnd','known_costs_vnd'))
    or budget->>'currency' is distinct from 'VND' or jsonb_typeof(costs) is distinct from 'object'
    or not costs ?& array['lodging','transport','meals','other']
    or exists(select 1 from jsonb_object_keys(costs) k where k not in ('lodging','transport','meals','other'))
    or exists(select 1 from jsonb_each_text(costs) entry where entry.value !~ '^[0-9]+$' or entry.value::numeric>1000000000000)
    or (budget->'total_vnd'<>'null'::jsonb and (jsonb_typeof(budget->'total_vnd') is distinct from 'number'
      or budget->>'total_vnd' !~ '^[0-9]+$' or (budget->>'total_vnd')::numeric>1000000000000)) then
    raise exception 'Invalid VND budget' using errcode='22023';
  end if;
  if jsonb_typeof(p_draft->'stops') is distinct from 'array' then raise exception 'Invalid stops' using errcode='22023'; end if;
  clean_stops='[]'::jsonb;
  for s in select value from jsonb_array_elements(p_draft->'stops') loop
    cost=s->'cost_estimate';
    if jsonb_typeof(cost) is distinct from 'object' or not cost ? 'provenance'
      or (cost->>'provenance'='unknown' and (exists(select 1 from jsonb_object_keys(cost) k where k<>'provenance')))
      or (cost->>'provenance'='user_entered' and (
        not cost ?& array['amount_vnd','applies_to']
        or exists(select 1 from jsonb_object_keys(cost) k where k not in ('provenance','amount_vnd','applies_to'))
        or jsonb_typeof(cost->'amount_vnd') is distinct from 'number' or cost->>'amount_vnd' !~ '^[0-9]+$'
        or (cost->>'amount_vnd')::numeric>1000000000000 or cost->>'applies_to' not in ('group','per_person')))
      or cost->>'provenance' not in ('unknown','user_entered') then
      raise exception 'Invalid stop cost estimate' using errcode='22023';
    end if;
    clean_stops=clean_stops||jsonb_build_array(s-'cost_estimate');
  end loop;

  fingerprint=encode(extensions.digest(p_draft::text||':'||p_expected_version::text||':'||p_confirm_locked_changes::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_idempotency_key::text,0));
  select * into prior from public.trip_mutations where owner_id=uid and idempotency_key=p_idempotency_key;
  if found then
    if prior.request_hash<>fingerprint then return jsonb_build_object('status','idempotency_conflict'); end if;
    return prior.response_json;
  end if;
  legacy_draft=(p_draft-'party_size'-'planning_mode'-'budget')||jsonb_build_object('stops',clean_stops);
  response=public.owner_save_trip_legacy(legacy_draft,p_expected_version,p_idempotency_key,p_confirm_locked_changes);
  if response->>'status'='saved' then
    update public.trips set party_size=(p_draft->>'party_size')::integer,planning_mode=p_draft->>'planning_mode',
      budget_total_vnd=case when budget->'total_vnd'='null'::jsonb then null else (budget->>'total_vnd')::bigint end,
      budget_costs_json=costs where id=(response->>'id')::uuid and owner_id=uid;
    for s in select value from jsonb_array_elements(p_draft->'stops') loop
      stop_id=(s->>'id')::uuid; cost=s->'cost_estimate';
      update public.trip_stops set cost_provenance=cost->>'provenance',
        estimated_cost_vnd=case when cost->>'provenance'='user_entered' then (cost->>'amount_vnd')::bigint else null end,
        cost_applies_to=case when cost->>'provenance'='user_entered' then cost->>'applies_to' else null end
        where id=stop_id and trip_id=(response->>'id')::uuid;
    end loop;
    update public.trip_mutations set request_hash=fingerprint where owner_id=uid and idempotency_key=p_idempotency_key;
  end if;
  return response;
end;
$$;
revoke all on function public.owner_save_trip(jsonb,integer,uuid,boolean) from public,anon,authenticated;
grant create on schema public to trip_storage_writer;
alter function public.owner_save_trip(jsonb,integer,uuid,boolean) owner to trip_storage_writer;
revoke create on schema public from trip_storage_writer;
grant execute on function public.owner_save_trip(jsonb,integer,uuid,boolean) to authenticated;
