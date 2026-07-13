-- Mickey's Music Match v3.3
-- Run this file once in the Supabase SQL Editor.
-- It changes new room codes to four digits and excludes time-based powers
-- when the host chooses "Geen tijdsdruk".

create or replace function public.dmq_create_host_room()
returns table(room_id uuid, room_code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_room_id uuid;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Niet ingelogd';
  end if;

  loop
    v_code := lpad((floor(random() * 10000)::integer)::text, 4, '0');
    exit when not exists (
      select 1 from public.dmq_rooms r where r.code = v_code
    );
  end loop;

  insert into public.dmq_rooms(code, host_user_id, settings)
  values (v_code, auth.uid(), '{}'::jsonb)
  returning id into v_room_id;

  return query select v_room_id, v_code;
end;
$$;

create or replace function public.dmq_start_game_v2(
  p_room_id uuid,
  p_total_rounds integer,
  p_game_mode text,
  p_song_sequence integer[],
  p_question_sequence text[],
  p_settings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  n integer;
  v_cards_count integer;
  v_no_time boolean;
  v_individual text[];
  v_special text[];
  v_ind_pool text[];
  v_remaining text[];
  v_combined_pool text[];
  v_player_cards text[];
  v_player record;
  v_idx integer := 1;
  v_available integer;
begin
  select count(*) into n from dmq_players where room_id = p_room_id;
  if not exists (
    select 1 from dmq_rooms
    where id = p_room_id and host_user_id = auth.uid() and status = 'lobby'
  ) then
    raise exception 'Alleen de organisator kan starten.';
  end if;
  if n < 2 or n > 6 then
    raise exception 'Er moeten 2 tot 6 spelers zijn.';
  end if;

  v_cards_count := coalesce((p_settings->>'cards_per_player')::integer, 3);
  v_no_time := coalesce(p_settings->>'answer_time_limit', 'auto') = 'none';

  if v_no_time then
    -- The three timing cards are intentionally omitted.
    v_individual := array['hyperdrive','wild_ride','temple_run','hidden_treasure','small_world','spider_bot'];
    v_special := array['ghost_whisper','ingredient_theft','laser_block'];
  else
    v_individual := array['hyperdrive','wild_ride','temple_run','lightspeed','hidden_treasure','small_world'];
    v_special := array['ghost_whisper','second_drop','ingredient_theft','laser_block','spider_bot','turbo_boost'];
  end if;

  v_available := cardinality(v_individual) + cardinality(v_special);
  if v_cards_count < 1 or n * v_cards_count > v_available then
    raise exception 'Te weinig passende krachten voor dit aantal spelers en kaarten. Kies minder kaarten per speler.';
  end if;

  select array_agg(val) into v_ind_pool
  from (select unnest(v_individual) as val order by random()) shuffled;
  v_remaining := coalesce(v_ind_pool[n + 1 : cardinality(v_ind_pool)], array[]::text[]);
  select array_agg(val) into v_combined_pool
  from (
    select unnest(v_remaining || v_special) as val
    order by random()
  ) shuffled;

  for v_player in
    select id from dmq_players where room_id = p_room_id order by joined_at
  loop
    if v_cards_count = 1 then
      v_player_cards := array[v_ind_pool[v_idx]];
    elsif v_cards_count = 2 then
      v_player_cards := array[v_ind_pool[v_idx], v_combined_pool[v_idx]];
    else
      v_player_cards := array[
        v_ind_pool[v_idx],
        v_combined_pool[(v_idx - 1) * 2 + 1],
        v_combined_pool[(v_idx - 1) * 2 + 2]
      ];
    end if;

    update dmq_players
    set score = 0,
        power_used = false,
        power_cards = v_player_cards,
        used_cards = array[]::text[]
    where id = v_player.id;

    v_idx := v_idx + 1;
  end loop;

  update dmq_rooms
  set status = 'playing', phase = 'claim', total_rounds = p_total_rounds,
      current_round_no = 1, game_mode = p_game_mode,
      song_sequence = p_song_sequence, question_sequence = p_question_sequence,
      settings = p_settings, updated_at = now()
  where id = p_room_id;

  insert into dmq_rounds(room_id, round_no, song_number, question_type, phase)
  values (p_room_id, 1, p_song_sequence[1], p_question_sequence[1], 'claim')
  returning id into rid;

  return rid;
end;
$$;

grant execute on function public.dmq_create_host_room() to authenticated;
grant execute on function public.dmq_start_game_v2(uuid, integer, text, integer[], text[], jsonb) to authenticated;
