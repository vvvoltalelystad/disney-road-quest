-- Music Match: laat een finale-inzet als negatieve rondecorrectie meetellen,
-- zonder dat de totale spelersscore ooit onder nul kan komen.
create or replace function public.dmq_confirm_points(
  p_answer_id uuid,
  p_final_points integer,
  p_note text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_answer public.dmq_answers%rowtype;
  v_current_score integer;
begin
  select * into v_answer from public.dmq_answers where id=p_answer_id for update;
  if not found or v_answer.user_id<>auth.uid() then
    raise exception 'Dit is niet jouw antwoord.';
  end if;
  if v_answer.points_confirmed then return false; end if;

  select score into v_current_score from public.dmq_players where id=v_answer.player_id for update;
  if p_final_points < -coalesce(v_current_score,0) or p_final_points > 50 then
    raise exception 'Ongeldig puntenaantal.';
  end if;

  update public.dmq_answers
  set final_points=p_final_points,
      points_confirmed=true,
      correction_note=nullif(trim(p_note),''),
      points_confirmed_at=now()
  where id=p_answer_id;

  update public.dmq_players
  set score=greatest(0,score+p_final_points)
  where id=v_answer.player_id;
  return true;
end $$;

grant execute on function public.dmq_confirm_points(uuid,integer,text) to authenticated;

-- Ken de Music Match-eindbeloning exact één keer toe aan de gedeelde profielbank.
create or replace function public.dmq_award_coco_reward(
  p_receipt text,
  p_profile_key text,
  p_amount integer
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_store public.rooms%rowtype;
  v_state jsonb;
  v_balance integer;
begin
  if nullif(trim(p_receipt),'') is null or nullif(trim(p_profile_key),'') is null or p_amount <= 0 then
    raise exception 'Ongeldige Coco Coin-beloning.';
  end if;
  select * into v_store from public.rooms where code='COCO-PROFILES-V1' for update;
  if not found then raise exception 'Profielopslag niet gevonden.'; end if;
  v_state := coalesce(v_store.current_task_state,'{}'::jsonb);
  if coalesce(v_state->'coco_reward_receipts','{}'::jsonb) ? p_receipt then return false; end if;
  v_balance := coalesce((v_state->'coco_bank'->>p_profile_key)::integer,0) + p_amount;
  v_state := jsonb_set(v_state,array['coco_bank',p_profile_key],to_jsonb(v_balance),true);
  v_state := jsonb_set(v_state,array['coco_reward_receipts',p_receipt],to_jsonb(now()::text),true);
  v_state := jsonb_set(v_state,array['updated_at'],to_jsonb(now()::text),true);
  update public.rooms set current_task_state=v_state where id=v_store.id;
  return true;
end $$;

grant execute on function public.dmq_award_coco_reward(text,text,integer) to authenticated;

-- Vastgepinde originele animatiefilm-soundtracks; geen Spotify-zoekresultaten.
update public.dmq_songs set artist='Donny Osmond & Chorus - Mulan',spotify_url='https://open.spotify.com/track/40lNlmrek40tfBOiQzf6qK' where song_number in (52,130);
update public.dmq_songs set artist='Lea Salonga, Beth Fowler, Marni Nixon & Chorus - Mulan',spotify_url='https://open.spotify.com/track/78EMhiyAcalWWtnpk20Eoo' where song_number=54;
update public.dmq_songs set artist='Chorus - Beauty and the Beast & Richard White',spotify_url='https://open.spotify.com/track/5Us0yEljTVRRQoO7vuIuU9' where song_number=91;
