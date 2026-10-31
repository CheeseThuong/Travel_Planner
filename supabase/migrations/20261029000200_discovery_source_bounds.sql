-- SD01-02: validate scalar/null sources without evaluating array length first.
alter table public.place_discovery_profiles drop constraint place_discovery_profiles_check;
alter table public.place_discovery_profiles add constraint place_discovery_profiles_coordinate_source_index_check check (
 coordinate_source_index>=0 and coordinate_source_index<(case when jsonb_typeof(sources)='array' then jsonb_array_length(sources) else 0 end)
);
