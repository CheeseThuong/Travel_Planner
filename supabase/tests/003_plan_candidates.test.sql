begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
insert into auth.users(id,is_anonymous) values('c4000000-0000-4000-8000-000000000001',true),('c4000000-0000-4000-8000-000000000002',true);
update destinations set status='published';
create function pg_temp.plan_draft() returns jsonb language sql as $$
select jsonb_build_object('id','c4100000-0000-4000-8000-000000000001','version',1,'destination_slug','nha-trang','title','Synthetic plan',
 'start_date','2026-11-06','end_date','2026-11-06','timezone','Asia/Ho_Chi_Minh','arrival_local_time','08:00','departure_local_time','18:00',
 'base_location',jsonb_build_object('label','Synthetic','lat',12.24,'lng',109.19,'temporary',false),'transport_mode','walk','pace','balanced','party_size',1,'planning_mode','assisted',
 'budget',jsonb_build_object('currency','VND','total_vnd',null,'known_costs_vnd',jsonb_build_object('lodging',0,'transport',0,'meals',0,'other',0)),
 'preferences',jsonb_build_object('day_start','08:00','day_end','21:00','lunch_buffer_minutes',60,'rest_buffer_minutes',15,'return_to_base',true),
 'stops',jsonb_build_array(jsonb_build_object('id','c4200000-0000-4000-8000-000000000001','destination_slug','nha-trang','user_title','Manual fixture','location',jsonb_build_object('lat',12.25,'lng',109.19),'coordinate_provenance','user_entered','requested_duration_min',60,'is_required',true,'hours',jsonb_build_object('state','hours_unknown'),'transport_constraint','land','cost_estimate',jsonb_build_object('provenance','unknown'))));
$$;
create function pg_temp.candidate() returns jsonb language sql as $$
select jsonb_build_object('plan_run_id','c4300000-0000-4000-8000-000000000001','input_version',1,'engine_version','planner-v1','seed',42,'warnings',jsonb_build_array('HOURS_UNVERIFIED'),'score','{}'::jsonb,'budget','{}'::jsonb,'diagnostics','{}'::jsonb,'unfulfilled_required','[]'::jsonb,'unscheduled','[]'::jsonb,
 'days',jsonb_build_array(jsonb_build_object('date','2026-11-06','breaks',jsonb_build_array(jsonb_build_object('start_local','12:00','end_local','13:00')),
 'stops',jsonb_build_array(jsonb_build_object('stop_id','c4200000-0000-4000-8000-000000000001','start_local','09:00','end_local','10:00','travel_departure_local','08:00','arrival_local','08:00','rest_before_minutes',0,'travel_from_previous_minutes',0,'estimate_source','approximate','warnings',jsonb_build_array('HOURS_UNVERIFIED'))),
 'return_leg',jsonb_build_object('departure_local','10:00','arrival_local','10:00','duration_minutes',0,'estimate_source','approximate'))));
$$;
grant execute on function pg_temp.plan_draft(),pg_temp.candidate() to authenticated;
select has_function('public','owner_store_plan',array['uuid','integer','uuid','jsonb'],'store RPC exists');
select ok(not has_table_privilege('authenticated','trip_plan_runs','INSERT'),'no direct candidate write grant');
select ok(not has_function_privilege('anon','public.owner_store_plan(uuid,integer,uuid,jsonb)','EXECUTE'),'anon cannot store candidate');
select ok(not has_function_privilege('authenticated','public.trip_store_validate_plan(public.trips,jsonb)','EXECUTE'),'validation helper is not exposed');
select set_config('request.jwt.claim.sub','c4000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is(owner_save_trip(pg_temp.plan_draft(),0,'c4400000-0000-4000-8000-000000000001')->>'status','saved','create owner fixture');
select throws_ok($$select owner_store_plan('c4100000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000002',jsonb_set(pg_temp.candidate(),'{days,0,stops}','[]'))$$,'23514',null,'candidate cannot silently drop a selected stop');
select throws_ok($$select owner_store_plan('c4100000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000002',jsonb_set(pg_temp.candidate(),'{days,0,stops,0,start_local}','"07:00"'))$$,'23514',null,'candidate cannot violate day bounds');
select throws_ok($$select owner_store_plan('c4100000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000002',jsonb_set(pg_temp.candidate(),'{days,0,stops,0,start_local}','null'))$$,'22023',null,'null local time cannot pass SQL three-valued validation');
select throws_ok($$select owner_store_plan('c4100000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000002',jsonb_set(pg_temp.candidate(),'{days,0,stops}',(pg_temp.candidate()->'days'->0->'stops')||(pg_temp.candidate()->'days'->0->'stops')))$$,'22023',null,'candidate cannot duplicate selected identity');
select throws_ok($$select owner_store_plan('c4100000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000002',jsonb_set(pg_temp.candidate(),'{days,0,return_leg,duration_minutes}','-1'))$$,'23514',null,'negative return duration is rejected');
select is(owner_store_plan('c4100000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000002',pg_temp.candidate())->>'status','candidate','generate stores candidate');
select is((select version from trips),1,'generate does not mutate trip version');
select is((select status from trip_stops),'selected','generate does not apply any schedule');
select is((select count(*)::integer from trip_plan_runs),1,'one private candidate');
select is(owner_store_plan('c4100000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000002',pg_temp.candidate())->>'status','candidate','exact generation retry replays');
select is((select count(*)::integer from trip_plan_runs),1,'generation retry does not duplicate');
select is(owner_store_plan('c4100000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000002',jsonb_set(pg_temp.candidate(),'{seed}','43'))->>'status','idempotency_conflict','same key changed request conflicts');
select throws_ok($$select owner_apply_plan('c4100000-0000-4000-8000-000000000001','c4300000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000003',false)$$,'22023',null,'apply requires explicit confirmation');
select set_config('request.jwt.claim.sub','c4000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from trip_plan_runs),0,'B cannot read A candidate');
select is(owner_apply_plan('c4100000-0000-4000-8000-000000000001','c4300000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000003',true)->>'status','not_found','B cannot apply A candidate');
select is(owner_store_plan('c4100000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000002',pg_temp.candidate())->>'status','not_found','B cannot store A candidate or discover version');
select set_config('request.jwt.claim.sub','c4000000-0000-4000-8000-000000000001',true);
reset role;
create function pg_temp.fail_apply() returns trigger language plpgsql as $$
begin raise exception 'Synthetic late apply failure' using errcode='23514'; end;
$$;
create trigger synthetic_apply_failure before update on public.trips for each row when (new.state='planned') execute function pg_temp.fail_apply();
set local role authenticated;
select throws_ok($$select owner_apply_plan('c4100000-0000-4000-8000-000000000001','c4300000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000003',true)$$,'23514','Synthetic late apply failure','late failure rolls back the entire apply');
select is((select version from trips),1,'failed apply leaves version unchanged');
select is((select status from trip_stops),'selected','failed apply rolls back earlier stop updates');
reset role;
select is((select count(*)::integer from trip_mutations where idempotency_key='c4400000-0000-4000-8000-000000000003'),0,'failed apply does not reserve retry key');
drop trigger synthetic_apply_failure on public.trips;
set local role authenticated;
select is(owner_apply_plan('c4100000-0000-4000-8000-000000000001','c4300000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000003',true)->>'version','2','confirmed atomic apply increments once');
select is((select status from trip_stops),'scheduled','selected stop is now scheduled');
select is((select planned_start_local::text from trip_stops),'09:00:00','exact candidate time applied');
select is((select state from trips),'planned','trip state applied');
select is(owner_apply_plan('c4100000-0000-4000-8000-000000000001','c4300000-0000-4000-8000-000000000001',1,'c4400000-0000-4000-8000-000000000003',true)->>'version','2','apply idempotent replay stays version2');
select is((select version from trips),2,'replay does not increment');
select is(owner_apply_plan('c4100000-0000-4000-8000-000000000001','c4300000-0000-4000-8000-000000000001',2,'c4400000-0000-4000-8000-000000000004',true)->>'status','plan_run_stale','old candidate rejected against new input version');
select is((select version from trips),2,'stale apply has no side effects');
select is(owner_save_trip(jsonb_set(jsonb_set(pg_temp.plan_draft(),'{version}','2'),'{stops,0,lock}','{"plan_date":"2026-11-06","start_local":"14:00","sort_index":0}'),2,'c4400000-0000-4000-8000-000000000006')->>'version','3','owner explicitly locks existing stop');
select throws_ok($$select owner_store_plan('c4100000-0000-4000-8000-000000000001',3,'c4400000-0000-4000-8000-000000000007',jsonb_set(pg_temp.candidate(),'{input_version}','3'))$$,'23514',null,'candidate cannot rewrite a lock time');
select is((select version from trips),3,'failed locked candidate leaves version unchanged');
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select owner_store_plan('c4100000-0000-4000-8000-000000000001',2,'c4400000-0000-4000-8000-000000000005',pg_temp.candidate())$$,'28000',null,'null identity rejected within definer');
reset role;
select ok((select bool_and(proowner='trip_storage_writer'::regrole and prosecdef) from pg_proc where oid in ('public.owner_store_plan(uuid,integer,uuid,jsonb)'::regprocedure,'public.owner_apply_plan(uuid,uuid,integer,uuid,boolean)'::regprocedure)),'RPC definer retains constrained RLS writer');
select ok(not has_schema_privilege('trip_storage_writer','public','CREATE'),'writer CREATE revoked after migration');
select * from finish();
rollback;
