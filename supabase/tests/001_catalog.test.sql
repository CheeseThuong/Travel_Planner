begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(42);

select has_table('public', 'destinations', 'destinations exists');
select has_table('public', 'places', 'places exists');
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.destinations'::regclass,'public.places'::regclass)), 'RLS enabled on both tables');
select is((select count(*)::integer from destinations), 2, 'two destinations');
select is((select count(*)::integer from places), 60, '60 original places');
select is((select count(*)::integer from places p join destinations d on d.id=p.destination_id where d.slug='nha-trang'), 30, 'Nha Trang has 30');
select is((select count(*)::integer from places p join destinations d on d.id=p.destination_id where d.slug='da-lat'), 30, 'Da Lat has 30');
select ok((select bool_and(status='draft') from places), 'seed preserves draft status');
select ok((select bool_and(hours_json is null and hours_source is null and hours_checked_at is null) from places), 'unknown hours remain null');
select ok((select bool_and(editorial_metadata ?& array['data_source','image','caution_notes','coordinate_quality','verification_scope']) from places), 'source and uncertainty metadata preserved');
select ok((select bool_and(id::text=editorial_metadata->>'id' and slug=editorial_metadata->>'slug' and lat=(editorial_metadata->>'lat')::numeric and lng=(editorial_metadata->>'lng')::numeric and image_key=editorial_metadata->'image'->>'path') from places), 'mapped fields preserve source values');
select ok((select bool_and(content_license='ODbL-1.0' and editorial_metadata->'data_source'->>'license'=content_license) from places), 'ODbL license retained');
select ok((select bool_and(provider_place_id is null) from places), 'no invented Google references');

create function pg_temp.insert_place(p_id uuid, p_dest uuid, p_slug text, p_lat numeric default 12, p_lng numeric default 109, p_duration integer default 60, p_status text default 'draft') returns void
language sql as $$
insert into public.places (id,destination_id,slug,title_vi,category,description_vi,lat,lng,recommended_duration_min,visit_priority,image_key,content_license,status,editorial_metadata)
values (p_id,p_dest,p_slug,'Test','park','Synthetic DB constraint fixture',p_lat,p_lng,p_duration,50,'fixture.svg','test-only',p_status,'{}');
$$;
select throws_ok($$select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001','a7100000-0000-4000-8000-000000000001','bad-lat',91)$$,'23514',null,'latitude bound rejects 91');
select throws_ok($$select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001','a7100000-0000-4000-8000-000000000001','bad-lng',12,181)$$,'23514',null,'longitude bound rejects 181');
select throws_ok($$select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001','a7100000-0000-4000-8000-000000000001','short',12,109,14)$$,'23514',null,'duration below 15 rejected');
select throws_ok($$select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001','a7100000-0000-4000-8000-000000000001','long',12,109,721)$$,'23514',null,'duration above 720 rejected');
select throws_ok($$select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001','a7100000-0000-4000-8000-000000000001','status',12,109,60,'private')$$,'23514',null,'unsupported status rejected');
select throws_ok($$select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001','a7100000-0000-4000-8000-000000000001','Bad Slug')$$,'23514',null,'unsafe slug rejected');
select throws_ok($$select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001','a7100000-0000-4000-8000-000000000099','missing-city')$$,'23503',null,'missing destination rejected');
select throws_ok($$select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001',destination_id,slug) from places limit 1$$,'23505',null,'duplicate slug within city rejected');
select throws_ok($$select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001',null,'null-city')$$,'23502',null,'null destination rejected');
select throws_ok($$update places set visit_priority=101$$,'23514',null,'priority bound enforced');
select throws_ok($$update places set category='unknown'$$,'23514',null,'category allowlist enforced');
select throws_ok($$update places set hours_source='source without hours'$$,'23514',null,'partial hours source rejected despite SQL null semantics');
select throws_ok($$update places set hours_json='{}',hours_source='fixture'$$,'23514',null,'hours require checked timestamp');
select throws_ok($$update destinations set timezone='UTC'$$,'23514',null,'destination timezone fixed');
select lives_ok($$
  select pg_temp.insert_place('a7200000-0000-4000-8000-000000000001','a7100000-0000-4000-8000-000000000001','cross-city-fixture',-90,-180,15);
  select pg_temp.insert_place('a7200000-0000-4000-8000-000000000002','a7100000-0000-4000-8000-000000000002','cross-city-fixture',90,180,720);
$$, 'same slug across cities and inclusive coordinate/duration bounds are valid');
select is((select count(*)::integer from places where slug='cross-city-fixture'), 2, 'city scope does not silently deduplicate places');
update places set updated_at='2000-01-01' where id=(select id from places order by id limit 1);
select ok((select updated_at>'2026-01-01'::timestamptz from places order by id limit 1), 'update trigger replaces caller timestamp');

set local role anon;
select is((select count(*)::integer from destinations), 0, 'anon cannot see draft destinations');
select is((select count(*)::integer from places), 0, 'anon cannot see draft places');
select throws_ok($$delete from places$$,'42501',null,'anon delete forbidden');
select throws_ok($$update destinations set status='published'$$,'42501',null,'anon publish forbidden');
select throws_ok($$insert into destinations(id) values(gen_random_uuid())$$,'42501',null,'anon insert forbidden');
reset role;

update places set status='published' where id=(select id from places where destination_id='a7100000-0000-4000-8000-000000000001' order by id limit 1);
set local role anon;
select is((select count(*)::integer from places), 0, 'published place hidden under draft destination');
reset role;
update destinations set status='published' where slug='nha-trang';
set local role anon;
select is((select count(*)::integer from places), 1, 'only published place under published destination visible');
select is((select count(*)::integer from places where destination_id='a7100000-0000-4000-8000-000000000002'), 0, 'other city drafts remain hidden');
reset role;

set local role authenticated;
select is((select count(*)::integer from places), 1, 'authenticated catalog read also respects publication');
select throws_ok($$update places set title_vi='forged'$$,'42501',null,'authenticated editorial write forbidden');
reset role;
select ok(not has_table_privilege('anon','public.places','INSERT') and not has_table_privilege('authenticated','public.places','DELETE'), 'no public role has catalog write grants');
select ok(not has_schema_privilege('anon','public','CREATE') and not has_schema_privilege('authenticated','public','CREATE'), 'public roles cannot create exposed schema objects');
select * from finish();
rollback;
