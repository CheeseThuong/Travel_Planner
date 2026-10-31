-- SI03-01: enforce the active cap on restore as well as initial submission.
-- Prior migration was already applied locally; retain it and correct forward.
create or replace function public.transition_place_submission(p_id uuid,p_expected_version integer,p_action text,p_note text default '') returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare uid uuid=trip_private.current_user_id(); s public.place_submissions; moderator boolean=contribution_private.is_moderator(); next_state text;
begin
  if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if p_id is null or p_expected_version is null or p_expected_version not between 1 and 2147483645 or p_action is null or p_note is null
    or char_length(p_note)>1000 or p_note ~ '[[:cntrl:]]' then raise exception 'Invalid transition input' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('contribution:'||uid::text,0));
  select * into s from public.place_submissions where id=p_id and (owner_id=uid or moderator) for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if s.version<>p_expected_version then return jsonb_build_object('status','version_conflict','current_version',s.version); end if;
  if s.owner_id=uid and p_action='withdraw' and s.state<>'withdrawn' then next_state='withdrawn';
  elsif s.owner_id=uid and p_action='restore' and s.state in ('withdrawn','rejected') then
    if s.state='withdrawn' and (select count(*) from public.place_submissions where owner_id=uid and state<>'withdrawn')>=20 then
      return jsonb_build_object('status','rate_limited');
    end if;
    next_state='submitted';
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
grant execute on function public.transition_place_submission(uuid,integer,text,text) to authenticated;
