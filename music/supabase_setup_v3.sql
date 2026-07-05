-- Migration to support up to 6 players, unique cards, and custom cards count setting.

-- 1. Update dmq_join_room_v2 to allow up to 6 players instead of 5
create or replace function public.dmq_join_room_v2(p_code text,p_player_name text,p_color_id text,p_color text,p_avatar_id text)
returns table(room_id uuid,player_id uuid) language plpgsql security definer set search_path=public as $$
declare r dmq_rooms%rowtype;pid uuid;begin select * into r from dmq_rooms where code=upper(trim(p_code)) and status='lobby';if not found then raise exception 'Kamer bestaat niet of is al gestart.';end if;if(select count(*)from dmq_players where room_id=r.id)>=6 then raise exception 'Deze kamer is vol.';end if;if exists(select 1 from dmq_players where room_id=r.id and lower(name)=lower(trim(p_player_name)))then raise exception 'Deze naam is al bezet.';end if;if exists(select 1 from dmq_players where room_id=r.id and color_id=p_color_id)then raise exception 'Deze kleur is al gekozen.';end if;if exists(select 1 from dmq_players where room_id=r.id and avatar_id=p_avatar_id)then raise exception 'Deze avatar is al gekozen.';end if;insert into dmq_players(room_id,user_id,name,color,color_id,avatar_id,is_host)values(r.id,auth.uid(),trim(p_player_name),p_color,p_color_id,p_avatar_id,false)returning id into pid;return query select r.id,pid;end$$;

-- 2. Update dmq_start_game_v2 to support custom cards per player count, up to 6 players, and deal unique cards slice per player.
create or replace function public.dmq_start_game_v2(p_room_id uuid,p_total_rounds integer,p_game_mode text,p_song_sequence integer[],p_question_sequence text[],p_settings jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare 
  rid uuid;
  n integer;
  v_all_cards text[];
  v_player RECORD;
  v_idx integer := 1;
  v_cards_count integer;
begin 
  select count(*) into n from dmq_players where room_id=p_room_id;
  if not exists(select 1 from dmq_rooms where id=p_room_id and host_user_id=auth.uid() and status='lobby') then 
    raise exception 'Alleen de organisator kan starten.';
  end if;
  if n<2 or n>6 then 
    raise exception 'Er moeten 2 tot 6 spelers zijn.';
  end if;
  
  v_cards_count := coalesce((p_settings->>'cards_per_player')::integer, 3);
  if n * v_cards_count > 12 then
    raise exception 'Te weinig unieke krachten voor dit aantal spelers en kaarten (maximaal 12 in totaal). Stel minder kaarten per speler in.';
  end if;

  -- Shuffled deck of 12 unique cards (9 original + 3 new)
  v_all_cards := ARRAY(
    SELECT val 
    FROM unnest(ARRAY['hyperdrive','wild_ride','ghost_whisper','hidden_treasure','second_drop','lightspeed','small_world','ingredient_theft','laser_block','temple_run','spider_bot','turbo_boost']) as val
    ORDER BY random()
  );

  -- Distribute unique cards slice per player
  for v_player in 
    select id from dmq_players where room_id=p_room_id order by joined_at
  loop
    update dmq_players 
    set score=0,
        power_used=false,
        power_cards=v_all_cards[v_idx : v_idx + v_cards_count - 1],
        used_cards=array[]::text[]
    where id=v_player.id;
    
    v_idx := v_idx + v_cards_count;
  end loop;

  update dmq_rooms set status='playing',phase='claim',total_rounds=p_total_rounds,current_round_no=1,game_mode=p_game_mode,song_sequence=p_song_sequence,question_sequence=p_question_sequence,settings=p_settings,updated_at=now() where id=p_room_id;
  insert into dmq_rounds(room_id,round_no,song_number,question_type,phase)values(p_room_id,1,p_song_sequence[1],p_question_sequence[1],'claim')returning id into rid;
  return rid;
end$$;
