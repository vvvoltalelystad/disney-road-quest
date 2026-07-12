-- Disney Music Quest v3.2 hotfix
-- Herstelt het aansluiten van spelers: het outputveld room_id en de tabelkolom
-- room_id kregen in de vorige functie dezelfde naam en waren daardoor dubbelzinnig.
-- Veilig opnieuw uit te voeren in de Supabase SQL Editor.

create or replace function public.dmq_join_room_v2(
  p_code text,
  p_player_name text,
  p_color_id text,
  p_color text,
  p_avatar_id text
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
  from public.dmq_rooms as r
  where r.code = upper(trim(p_code))
    and r.status = 'lobby';

  if not found then
    raise exception 'Kamer bestaat niet of is al gestart.';
  end if;

  if (select count(*) from public.dmq_players as p where p.room_id = v_room.id) >= 6 then
    raise exception 'Deze kamer heeft al zes spelers.';
  end if;

  if exists (
    select 1 from public.dmq_players as p
    where p.room_id = v_room.id
      and lower(p.name) = lower(trim(p_player_name))
  ) then
    raise exception 'Deze naam is al bezet.';
  end if;

  if exists (
    select 1 from public.dmq_players as p
    where p.room_id = v_room.id and p.color_id = p_color_id
  ) then
    raise exception 'Deze kleur is al gekozen.';
  end if;

  if exists (
    select 1 from public.dmq_players as p
    where p.room_id = v_room.id and p.avatar_id = p_avatar_id
  ) then
    raise exception 'Deze attractie-avatar is al gekozen.';
  end if;

  insert into public.dmq_players(
    room_id, user_id, name, color, color_id, avatar_id, is_host
  ) values (
    v_room.id, auth.uid(), trim(p_player_name), p_color, p_color_id, p_avatar_id, false
  ) returning id into v_player_id;

  return query select v_room.id, v_player_id;
end;
$$;

grant execute on function public.dmq_join_room_v2(text, text, text, text, text) to authenticated;
