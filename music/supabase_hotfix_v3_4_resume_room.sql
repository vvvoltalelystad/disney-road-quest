-- Mickey's Music Match v3.4
-- Run this file once in the Supabase SQL Editor.
-- It lets an organiser or an existing player continue a room from another
-- device using the room code. The game state, round, scores and answers stay
-- in the existing room and are not reset.

create or replace function public.dmq_resume_host(p_code text)
returns table(room_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.dmq_rooms%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  select r.* into v_room
  from public.dmq_rooms r
  where r.code = upper(trim(p_code));

  if not found then
    raise exception 'Deze kamercode bestaat niet.';
  end if;

  update public.dmq_rooms
  set host_user_id = auth.uid(), updated_at = now()
  where id = v_room.id;

  return query select v_room.id;
end;
$$;

create or replace function public.dmq_resume_player(
  p_code text,
  p_player_name text
)
returns table(room_id uuid, player_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.dmq_rooms%rowtype;
  v_player_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  select r.* into v_room
  from public.dmq_rooms r
  where r.code = upper(trim(p_code));

  if not found then
    raise exception 'Deze kamercode bestaat niet.';
  end if;

  select p.id into v_player_id
  from public.dmq_players p
  where p.room_id = v_room.id
    and lower(p.name) = lower(trim(p_player_name));

  if not found then
    raise exception 'Dit Disney-profiel speelt niet mee in deze kamer.';
  end if;

  update public.dmq_players
  set user_id = auth.uid()
  where id = v_player_id;

  return query select v_room.id, v_player_id;
end;
$$;

grant execute on function public.dmq_resume_host(text) to authenticated;
grant execute on function public.dmq_resume_player(text, text) to authenticated;
