-- Disney Music Quest v2.9 — gecombineerde Supabase-herstelupdate
-- Voer dit HELE bestand één keer uit in Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.dmq_host_update_player(
  p_room_id uuid,
  p_player_id uuid,
  p_name text,
  p_color_id text,
  p_color text,
  p_avatar_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;

  if not exists (
    select 1
    from public.dmq_rooms r
    where r.id = p_room_id
      and r.host_user_id = auth.uid()
  ) then
    raise exception 'Alleen de organisator kan spelers wijzigen.';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Naam mag niet leeg zijn.';
  end if;

  if exists (
    select 1 from public.dmq_players p
    where p.room_id = p_room_id
      and p.id <> p_player_id
      and lower(p.name) = lower(trim(p_name))
  ) then
    raise exception 'Deze naam is al in gebruik.';
  end if;

  if exists (
    select 1 from public.dmq_players p
    where p.room_id = p_room_id
      and p.id <> p_player_id
      and p.color_id = p_color_id
  ) then
    raise exception 'Deze kleur is al in gebruik.';
  end if;

  if exists (
    select 1 from public.dmq_players p
    where p.room_id = p_room_id
      and p.id <> p_player_id
      and p.avatar_id = p_avatar_id
  ) then
    raise exception 'Deze avatar is al in gebruik.';
  end if;

  update public.dmq_players
  set
    name = trim(p_name),
    color_id = p_color_id,
    color = p_color,
    avatar_id = p_avatar_id
  where id = p_player_id
    and room_id = p_room_id;

  return found;
end;
$$;

create or replace function public.dmq_host_remove_player(
  p_room_id uuid,
  p_player_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;

  if not exists (
    select 1 from public.dmq_rooms r
    where r.id = p_room_id
      and r.host_user_id = auth.uid()
  ) then
    raise exception 'Alleen de organisator kan spelers verwijderen.';
  end if;

  delete from public.dmq_players
  where id = p_player_id
    and room_id = p_room_id;

  return found;
end;
$$;

create or replace function public.dmq_host_regenerate_code(
  p_room_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;

  if not exists (
    select 1 from public.dmq_rooms r
    where r.id = p_room_id
      and r.host_user_id = auth.uid()
  ) then
    raise exception 'Alleen de organisator kan de kamercode vernieuwen.';
  end if;

  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 6));
    exit when not exists (
      select 1 from public.dmq_rooms r where r.code = v_code
    );
  end loop;

  update public.dmq_rooms
  set code = v_code,
      updated_at = now()
  where id = p_room_id;

  return v_code;
end;
$$;

create or replace function public.dmq_host_reset_room(
  p_room_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd.';
  end if;

  if not exists (
    select 1 from public.dmq_rooms r
    where r.id = p_room_id
      and r.host_user_id = auth.uid()
  ) then
    raise exception 'Alleen de organisator kan de kamer herstellen.';
  end if;

  delete from public.dmq_rounds
  where room_id = p_room_id;

  update public.dmq_players
  set score = 0,
      power_used = false
  where room_id = p_room_id;

  update public.dmq_rooms
  set status = 'lobby',
      phase = 'lobby',
      current_round_no = 0,
      total_rounds = 10,
      song_sequence = '{}',
      question_sequence = '{}',
      settings = '{}'::jsonb,
      updated_at = now()
  where id = p_room_id;

  return true;
end;
$$;

grant execute on function public.dmq_host_update_player(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function public.dmq_host_remove_player(uuid,uuid) to authenticated;
grant execute on function public.dmq_host_regenerate_code(uuid) to authenticated;
grant execute on function public.dmq_host_reset_room(uuid) to authenticated;

-- Laat Supabase/PostgREST de nieuwe functies direct opnieuw inlezen.
notify pgrst, 'reload schema';

-- Controleoverzicht
select
  p.proname as functie,
  pg_get_function_identity_arguments(p.oid) as argumenten
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'dmq_host_update_player',
    'dmq_host_remove_player',
    'dmq_host_regenerate_code',
    'dmq_host_reset_room'
  )
order by p.proname;
