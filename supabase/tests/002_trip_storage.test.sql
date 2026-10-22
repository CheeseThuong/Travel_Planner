begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select plan(68);

insert into auth.users(id,is_anonymous) values ('b2000000-0000-4000-8000-000000000001',true),('b2000000-0000-4000-8000-000000000002',true);
-- Publication is a rolled-back synthetic test setup, never a seed promotion.
update destinations set status='published';
update places set status='published';

create function pg_temp.draft(p_id uuid default 'b2100000-0000-4000-8000-000000000001',p_version integer default 1,p_city text default 'nha-trang') returns jsonb language sql as $$
select jsonb_build_object('id',p_id,'version',p_version,'destination_slug',p_city,'title','Synthetic trip',
  'start_date','2026-12-01','end_date','2026-12-03','timezone','Asia/Ho_Chi_Minh','arrival_local_time','10:00','departure_local_time','16:00',
  'base_location',jsonb_build_object('label','Synthetic base','lat',12.24,'lng',109.19,'temporary',false),'transport_mode','walk','pace','balanced',
  'preferences',jsonb_build_object('day_start','08:00','day_end','21:00','lunch_buffer_minutes',60,'rest_buffer_minutes',15,'return_to_base',true),
  'stops',jsonb_build_array(
    jsonb_build_object('id',replace(p_id::text,'b2100000','b2200000'),'destination_slug',p_city,'user_title','Manual fixture',
      'location',jsonb_build_object('lat',12.25,'lng',109.19),'coordinate_provenance','user_entered','requested_duration_min',60,'is_required',true,
      'hours',jsonb_build_object('state','hours_unknown'),'transport_constraint','land'),
    jsonb_build_object('id',replace(p_id::text,'b2100000','b2300000'),'destination_slug',p_city,
      'catalog_place_id',(select p.id from places p join destinations d on d.id=p.destination_id where d.slug=p_city order by p.id limit 1),
      'user_title','Untrusted catalog override','location',jsonb_build_object('lat',89,'lng',179),'coordinate_provenance','user_entered',
      'requested_duration_min',90,'is_required',false,'hours',jsonb_build_object('state','hours_unknown'),'transport_constraint','land')));
$$;
grant usage on schema pg_temp to authenticated;
grant execute on function pg_temp.draft(uuid,integer,text) to authenticated;

select has_table('public','trips','trips exists');
select has_table('public','trip_stops','stops exists');
select has_table('public','trip_plan_runs','canonical trip_plan_runs exists');
select has_table('public','trip_shares','shares exists');
select has_table('public','trip_mutations','idempotency store exists');
select has_table('public','provider_usage_daily','provider ledger exists');
select ok((select not rolsuper and not rolcanlogin and not rolbypassrls and not rolcreaterole and not rolcreatedb and not rolinherit from pg_roles where rolname='trip_storage_writer'),'writer cannot login or bypass RLS');
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('trips'::regclass,'trip_stops'::regclass,'trip_plan_runs'::regclass,'trip_shares'::regclass,'trip_mutations'::regclass,'provider_usage_daily'::regclass)),'all private tables have RLS');
select ok(not has_table_privilege('authenticated','trips','INSERT') and not has_table_privilege('authenticated','trip_stops','UPDATE'),'direct owner writes cannot bypass version RPC');
select ok(not has_schema_privilege('trip_storage_writer','public','CREATE'),'writer cannot create schema objects');
select ok(has_function_privilege('authenticated','public.owner_save_trip(jsonb,integer,uuid,boolean)','EXECUTE') and not has_function_privilege('anon','public.owner_save_trip(jsonb,integer,uuid,boolean)','EXECUTE'),'save RPC only authenticated');
select ok(not has_function_privilege('authenticated','public.trip_store_replace_stops(public.trips,jsonb,boolean)','EXECUTE'),'internal stop helper not public RPC');
select ok(not has_column_privilege('authenticated','trip_shares','token_hash','SELECT'),'share hash not exposed in owner columns');
select ok((select prosecdef and proowner='trip_storage_writer'::regrole from pg_proc where oid='public.owner_save_trip(jsonb,integer,uuid,boolean)'::regprocedure),'save definer is the constrained writer');

select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is(owner_save_trip(pg_temp.draft(),0,'b2400000-0000-4000-8000-000000000001')->>'status','saved','owner A creates atomic trip');
select is((select version from trips),1,'created version one');
select is((select count(*)::integer from trip_stops),2,'both selected stops retained');
select ok((select bool_and(owner_id=auth.uid()) from trips),'owner always derives from auth');
select ok((select s.user_title=p.title_vi and s.user_lat=p.lat and s.user_lng=p.lng and s.coordinate_provenance='editorial' from trip_stops s join places p on p.id=s.catalog_place_id),'catalog coordinates/title/provenance cannot be forged');
select is((select hours_json->>'state' from trip_stops where catalog_place_id is not null),'hours_unknown','unknown editorial hours stay unknown');
select is(owner_save_trip(pg_temp.draft(),0,'b2400000-0000-4000-8000-000000000001')->>'version','1','exact idempotent retry returns original version');
select is((select count(*)::integer from trip_stops),2,'retry does not duplicate stops');
select is(owner_save_trip(pg_temp.draft()||'{"title":"Changed key request"}',0,'b2400000-0000-4000-8000-000000000001')->>'status','idempotency_conflict','key reuse with changed request conflicts');
select throws_ok($$update trips set title='bypass',version=version+1$$,'42501',null,'owner cannot bypass transaction layer');
select throws_ok($$select owner_save_trip(pg_temp.draft()||'{"owner_id":"b2000000-0000-4000-8000-000000000002"}',0,'b2400000-0000-4000-8000-000000000009')$$,'22023',null,'forged owner input rejected');
select throws_ok($$select owner_save_trip(pg_temp.draft()||'{"title":42}',0,'b2400000-0000-4000-8000-000000000009')$$,'22023',null,'wrong JSON title type rejected');

reset role;
update trip_stops set created_at='2000-01-01' where id='b2200000-0000-4000-8000-000000000001';
set local role authenticated;
select is(owner_save_trip(pg_temp.draft()||'{"title":"Updated trip"}',1,'b2400000-0000-4000-8000-000000000002')->>'version','2','owner save increments once');
select is((select created_at::date::text from trip_stops where id='b2200000-0000-4000-8000-000000000001'),'2000-01-01','stop replacement preserves creation metadata');
select is(owner_save_trip(pg_temp.draft(),1,'b2400000-0000-4000-8000-000000000003')->>'status','version_conflict','stale update conflicts');
select is((select title from trips),'Updated trip','stale update does not overwrite');
select throws_ok($$select owner_save_trip(jsonb_set(pg_temp.draft('b2100000-0000-4000-8000-000000000001',2),'{stops,0,requested_duration_min}','0'),2,'b2400000-0000-4000-8000-000000000004')$$,'23514',null,'invalid stop rejects entire save');
select is((select version from trips),2,'bad stop rolls back parent version');
select is((select count(*)::integer from trip_stops),2,'bad stop restores all original stops');
select throws_ok($$select owner_save_trip(jsonb_set(pg_temp.draft('b2100000-0000-4000-8000-000000000001',2),'{stops,1,catalog_place_id}',to_jsonb((select p.id::text from places p join destinations d on d.id=p.destination_id where d.slug='da-lat' limit 1))),2,'b2400000-0000-4000-8000-000000000005')$$,'22023',null,'cross-city catalog reference rejected');
select throws_ok($$select owner_save_trip(jsonb_set(pg_temp.draft('b2100000-0000-4000-8000-000000000001',2),'{stops,0,coordinate_provenance}','"editorial"'),2,'b2400000-0000-4000-8000-000000000005')$$,'22023',null,'manual stop cannot forge editorial provenance');
select throws_ok($$select owner_save_trip(pg_temp.draft('b2100000-0000-4000-8000-000000000001',2)||'{"end_date":"2026-12-08"}',2,'b2400000-0000-4000-8000-000000000006')$$,'23514',null,'eight-day trip rejected');
select throws_ok($$select owner_save_trip(pg_temp.draft('b2100000-0000-4000-8000-000000000001',2)||jsonb_build_object('stops',(select jsonb_agg(pg_temp.draft()->'stops'->0) from generate_series(1,31))),2,'b2400000-0000-4000-8000-000000000007')$$,'22023',null,'over30 selected stops rejected');
select is(owner_save_trip(jsonb_set(pg_temp.draft('b2100000-0000-4000-8000-000000000001',2),'{stops,0,lock}','{"plan_date":"2026-12-01","start_local":"09:00","sort_index":0}'),2,'b2400000-0000-4000-8000-000000000008')->>'version','3','explicit lock saves valid schedule');
select ok((select is_locked and planned_start_local='09:00'::time from trip_stops where id='b2200000-0000-4000-8000-000000000001'),'lock fields persist');
select throws_ok($$select owner_save_trip(pg_temp.draft('b2100000-0000-4000-8000-000000000001',3),3,'b2400000-0000-4000-8000-000000000009')$$,'23514',null,'implicit unlock rejected');
select is((select version from trips),3,'lock failure rolls back version');
select is(owner_save_trip(pg_temp.draft('b2100000-0000-4000-8000-000000000001',3),3,'b2400000-0000-4000-8000-000000000010',true)->>'version','4','explicit owner unlock permitted');
select ok((select not is_locked and status='scheduled' and planned_start_local='09:00'::time from trip_stops where id='b2200000-0000-4000-8000-000000000001'),'unlock preserves applied schedule metadata');

reset role;
insert into trip_shares(trip_id,token_hash,created_by) values('b2100000-0000-4000-8000-000000000001',repeat('a',64),'b2000000-0000-4000-8000-000000000001');
insert into trip_plan_runs(trip_id,input_version,engine_version,seed,mode,candidate_json) values('b2100000-0000-4000-8000-000000000001',4,'fixture-only',42,'approximate','{}');
insert into provider_usage_daily(usage_date,provider,operation) values('2026-12-01','fixture','test');
set local role authenticated;
select is((select count(*)::integer from trip_shares),1,'owner can read own share metadata');
select throws_ok($$select token_hash from trip_shares$$,'42501',null,'owner read cannot expose hashes');
select throws_ok($$select * from provider_usage_daily$$,'42501',null,'owner cannot read provider ledger');
select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000002',true);
select is((select count(*)::integer from trips),0,'B cannot read A trips');
select is((select count(*)::integer from trip_stops),0,'B cannot read A stops');
select is((select count(*)::integer from trip_shares),0,'B cannot read A share metadata');
select is((select count(*)::integer from trip_plan_runs),0,'B cannot read A candidates');
select is(owner_save_trip(pg_temp.draft('b2100000-0000-4000-8000-000000000001',1),1,'b2400000-0000-4000-8000-000000000001')->>'status','not_found','foreign save hides existence/version even with A key');
select ok(not owner_save_trip(pg_temp.draft('b2100000-0000-4000-8000-000000000001',1),1,'b2400000-0000-4000-8000-000000000001') ? 'current_version','foreign version not disclosed');
select is(owner_delete_trip('b2100000-0000-4000-8000-000000000001',4)->>'status','not_found','B cannot delete A trip');
select is(owner_save_trip(pg_temp.draft('b2100000-0000-4000-8000-000000000002',1,'da-lat'),0,'b2400000-0000-4000-8000-000000000001')->>'status','saved','B creates separate Da Lat trip using same owner-scoped key');
select is((select count(*)::integer from trips),1,'B sees only own trip');
reset role;
set local role trip_storage_writer;
select is((select count(*)::integer from trips where id='b2100000-0000-4000-8000-000000000001'),0,'writer itself obeys A/B RLS');
select throws_ok($$insert into trips(id,owner_id,destination_id,title,start_date,end_date,timezone,arrival_local_time,departure_local_time,base_lat,base_lng,base_label,transport_mode,pace,preferences_json)
  select 'b2100000-0000-4000-8000-000000000003','b2000000-0000-4000-8000-000000000001',destination_id,title,start_date,end_date,timezone,arrival_local_time,departure_local_time,base_lat,base_lng,base_label,transport_mode,pace,preferences_json from trips where owner_id=auth.uid()$$,'42501',null,'writer RLS rejects a forged owner even outside RPC');
select throws_ok($$select * from provider_usage_daily$$,'42501',null,'writer has no unrelated provider ledger access');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
select throws_ok($$select owner_save_trip(pg_temp.draft(),0,'b2400000-0000-4000-8000-000000000011')$$,'28000',null,'null identity rejected inside definer');
select is((select count(*)::integer from trips),0,'null identity reads no trip');
reset role;
set local role anon;
select throws_ok($$select * from trips$$,'42501',null,'unsigned anon cannot read private table');
select throws_ok($$select owner_delete_trip('b2100000-0000-4000-8000-000000000001',4)$$,'42501',null,'unsigned anon cannot execute owner RPC');
reset role;
select set_config('request.jwt.claim.sub','b2000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is(owner_delete_trip('b2100000-0000-4000-8000-000000000001',3)->>'status','version_conflict','stale delete conflicts');
select is(owner_delete_trip('b2100000-0000-4000-8000-000000000001',4)->>'status','removed','owner delete succeeds at correct version');
reset role;
select is((select count(*)::integer from trip_stops where trip_id='b2100000-0000-4000-8000-000000000001'),0,'delete cascades stops');
select is((select count(*)::integer from trip_shares),0,'delete cascades shares');
select is((select count(*)::integer from trip_plan_runs),0,'delete cascades candidates');
select is((select count(*)::integer from trips),1,'deleting A preserves B data');
select * from finish();
rollback;
