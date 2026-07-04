-- Disney Music Quest v2.6: organisatorbeheer
create or replace function public.dmq_host_regenerate_code(p_room_id uuid)
returns text language plpgsql security definer set search_path=public,extensions as $$
declare v_code text;
begin
  if not exists(select 1 from public.dmq_rooms where id=p_room_id and host_user_id=auth.uid()) then raise exception 'Alleen de organisator kan dit doen.'; end if;
  loop
    v_code:=upper(substr(encode(extensions.gen_random_bytes(6),'hex'),1,6));
    exit when not exists(select 1 from public.dmq_rooms where code=v_code);
  end loop;
  update public.dmq_rooms set code=v_code,updated_at=now() where id=p_room_id;
  return v_code;
end $$;

create or replace function public.dmq_host_remove_player(p_room_id uuid,p_player_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.dmq_rooms where id=p_room_id and host_user_id=auth.uid()) then raise exception 'Alleen de organisator kan dit doen.'; end if;
  delete from public.dmq_players where id=p_player_id and room_id=p_room_id;
  return found;
end $$;

create or replace function public.dmq_host_update_player(p_room_id uuid,p_player_id uuid,p_name text,p_color_id text,p_color text,p_avatar_id text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.dmq_rooms where id=p_room_id and host_user_id=auth.uid()) then raise exception 'Alleen de organisator kan dit doen.'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'Naam mag niet leeg zijn.'; end if;
  if exists(select 1 from public.dmq_players where room_id=p_room_id and id<>p_player_id and lower(name)=lower(trim(p_name))) then raise exception 'Deze naam is al in gebruik.'; end if;
  if exists(select 1 from public.dmq_players where room_id=p_room_id and id<>p_player_id and color_id=p_color_id) then raise exception 'Deze kleur is al in gebruik.'; end if;
  if exists(select 1 from public.dmq_players where room_id=p_room_id and id<>p_player_id and avatar_id=p_avatar_id) then raise exception 'Deze avatar is al in gebruik.'; end if;
  update public.dmq_players set name=trim(p_name),color_id=p_color_id,color=p_color,avatar_id=p_avatar_id where id=p_player_id and room_id=p_room_id;
  return found;
end $$;

create or replace function public.dmq_host_reset_room(p_room_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.dmq_rooms where id=p_room_id and host_user_id=auth.uid()) then raise exception 'Alleen de organisator kan dit doen.'; end if;
  delete from public.dmq_rounds where room_id=p_room_id;
  update public.dmq_players set score=0,power_used=false where room_id=p_room_id;
  update public.dmq_rooms set status='lobby',phase='lobby',current_round_no=0,total_rounds=10,song_sequence='{}',question_sequence='{}',settings='{}'::jsonb,updated_at=now() where id=p_room_id;
  return true;
end $$;

grant execute on function public.dmq_host_regenerate_code(uuid) to authenticated;
grant execute on function public.dmq_host_remove_player(uuid,uuid) to authenticated;
grant execute on function public.dmq_host_update_player(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function public.dmq_host_reset_room(uuid) to authenticated;
