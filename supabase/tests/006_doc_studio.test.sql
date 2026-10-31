begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok((select relrowsecurity from pg_class where oid='public.doc_poi_research'::regclass),'research RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.doc_plan_vault'::regclass),'vault RLS enabled');
select ok(not has_table_privilege(role_name,'doc_poi_research',privilege_name),role_name||' has no research '||privilege_name)
 from unnest(array['anon','authenticated']) role_name cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE']) privilege_name;
select ok(not has_table_privilege(role_name,'doc_plan_vault',privilege_name),role_name||' has no vault '||privilege_name)
 from unnest(array['anon','authenticated']) role_name cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) privilege_name;

insert into doc_poi_research(destination_slug,slug,title,category,source_kind,source_reference)
 values('da-lat','fixture-pending','Private research','nature','editorial','Independent fixture');
select is((select lat from doc_poi_research where slug='fixture-pending'),null::float8,'research keeps unknown coordinates null');
select throws_ok($$update doc_poi_research set lat=12 where slug='fixture-pending'$$,'23514',null,'requires paired coordinates');
select throws_ok($$update doc_poi_research set moderation='approved' where slug='fixture-pending'$$,'23514',null,'unverified research cannot be approved');
select throws_ok($$update doc_poi_research set quality='verified',moderation='approved',lat=12,lng=108 where slug='fixture-pending'$$,'23514',null,'approval requires verification timestamp');
insert into doc_poi_research(destination_slug,slug,title,category,source_kind,source_reference,quality,moderation,lat,lng,verified_at)
 values('da-lat','fixture-verified','Public verified fixture','nature','editorial','Independent fixture','verified','approved',12,108,now());
set local role anon;
select is((select count(*)::integer from doc_poi_research),1,'anon sees approved verified only');
select is((select title from doc_poi_research),'Public verified fixture','public positive visibility');
select throws_ok($$insert into doc_poi_research(destination_slug,slug,title,category,source_kind,source_reference) values('da-lat','forged','Forged','nature','community','fixture')$$,'42501',null,'anon cannot insert');
reset role;
set local role authenticated;
select is((select count(*)::integer from doc_poi_research),1,'authenticated sees approved verified only');
select throws_ok($$update doc_poi_research set title='Forged'$$,'42501',null,'authenticated cannot edit research');
select throws_ok($$delete from doc_poi_research$$,'42501',null,'authenticated cannot delete research');
reset role;
select * from finish();
rollback;
