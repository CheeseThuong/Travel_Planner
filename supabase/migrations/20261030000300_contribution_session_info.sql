-- SI03-02. Expose only the current verified user's moderation capability.
create function public.contribution_session_info() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if trip_private.current_user_id() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  return jsonb_build_object('moderator',contribution_private.is_moderator());
end;
$$;
revoke all on function public.contribution_session_info() from public,anon,authenticated;
grant create on schema public to contribution_writer;
alter function public.contribution_session_info() owner to contribution_writer;
revoke create on schema public from contribution_writer;
grant execute on function public.contribution_session_info() to authenticated;
