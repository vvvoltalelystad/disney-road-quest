-- Disney Music Quest v2 upgrade. Voer eerst supabase_setup.sql uit, daarna dit bestand.
alter table public.dmq_rooms add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.dmq_players add column if not exists color_id text;
alter table public.dmq_players add column if not exists avatar_id text;
alter table public.dmq_players add column if not exists power_used boolean not null default false;
alter table public.dmq_rounds add column if not exists active_power text;
alter table public.dmq_rounds add column if not exists power_used_by_player_id uuid;
alter table public.dmq_rounds add column if not exists power_started_at timestamptz;
alter table public.dmq_answers add column if not exists revised_answer jsonb;
alter table public.dmq_answers add column if not exists correctness jsonb;
alter table public.dmq_answers add column if not exists tower_completed boolean not null default false;

-- Alter phase check constraints to allow power phases (power_phantom, power_tower)
alter table public.dmq_rounds drop constraint if exists dmq_rounds_phase_check;
alter table public.dmq_rounds add constraint dmq_rounds_phase_check check (phase in ('claim','answer','review','standings','power_phantom','power_tower'));

alter table public.dmq_rooms drop constraint if exists dmq_rooms_phase_check;
alter table public.dmq_rooms add constraint dmq_rooms_phase_check check (phase in ('lobby','claim','answer','review','standings','finished','power_phantom','power_tower'));

create unique index if not exists dmq_players_room_color_unique on public.dmq_players(room_id,color_id) where color_id is not null;
create unique index if not exists dmq_players_room_avatar_unique on public.dmq_players(room_id,avatar_id) where avatar_id is not null;

create or replace function public.dmq_create_host_room()
returns table(room_id uuid,room_code text) language plpgsql security definer set search_path=public as $$
declare rid uuid;code text;begin if auth.uid() is null then raise exception 'Niet ingelogd';end if;loop code:=upper(substr(encode(gen_random_bytes(6),'hex'),1,6));exit when not exists(select 1 from dmq_rooms where dmq_rooms.code=code);end loop;insert into dmq_rooms(code,host_user_id,settings)values(code,auth.uid(),'{}') returning id into rid;return query select rid,code;end$$;

create or replace function public.dmq_join_room_v2(p_code text,p_player_name text,p_color_id text,p_color text,p_avatar_id text)
returns table(room_id uuid,player_id uuid) language plpgsql security definer set search_path=public as $$
declare r dmq_rooms%rowtype;pid uuid;begin select * into r from dmq_rooms where code=upper(trim(p_code)) and status='lobby';if not found then raise exception 'Kamer bestaat niet of is al gestart.';end if;if(select count(*)from dmq_players where room_id=r.id)>=5 then raise exception 'Deze kamer is vol.';end if;if exists(select 1 from dmq_players where room_id=r.id and lower(name)=lower(trim(p_player_name)))then raise exception 'Deze naam is al bezet.';end if;if exists(select 1 from dmq_players where room_id=r.id and color_id=p_color_id)then raise exception 'Deze kleur is al gekozen.';end if;if exists(select 1 from dmq_players where room_id=r.id and avatar_id=p_avatar_id)then raise exception 'Deze avatar is al gekozen.';end if;insert into dmq_players(room_id,user_id,name,color,color_id,avatar_id,is_host)values(r.id,auth.uid(),trim(p_player_name),p_color,p_color_id,p_avatar_id,false)returning id into pid;return query select r.id,pid;end$$;

create or replace function public.dmq_current_leader(p_room_id uuid)
returns uuid language plpgsql stable security definer set search_path=public as $$
declare r dmq_rooms%rowtype;ids uuid[];begin select * into r from dmq_rooms where id=p_room_id;if coalesce(r.settings->>'leader_mode','rotating')='fixed' then return (r.settings->>'fixed_leader_player_id')::uuid;end if;select array_agg(id order by joined_at)into ids from dmq_players where room_id=p_room_id;if array_length(ids,1)is null then return null;end if;return ids[((greatest(r.current_round_no,1)-1)%array_length(ids,1))+1];end$$;
create or replace function public.dmq_is_leader(p_room_id uuid)returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from dmq_players where room_id=p_room_id and id=dmq_current_leader(p_room_id) and user_id=auth.uid())$$;

create or replace function public.dmq_start_game_v2(p_room_id uuid,p_total_rounds integer,p_game_mode text,p_song_sequence integer[],p_question_sequence text[],p_settings jsonb)
returns uuid language plpgsql security definer set search_path=public as $$declare rid uuid;n integer;begin select count(*)into n from dmq_players where room_id=p_room_id;if not exists(select 1 from dmq_rooms where id=p_room_id and host_user_id=auth.uid() and status='lobby')then raise exception 'Alleen de organisator kan starten.';end if;if n<2 or n>5 then raise exception 'Er moeten 2 tot 5 spelers zijn.';end if;update dmq_players set score=0,power_used=false where room_id=p_room_id;update dmq_rooms set status='playing',phase='claim',total_rounds=p_total_rounds,current_round_no=1,game_mode=p_game_mode,song_sequence=p_song_sequence,question_sequence=p_question_sequence,settings=p_settings,updated_at=now() where id=p_room_id;insert into dmq_rounds(room_id,round_no,song_number,question_type,phase)values(p_room_id,1,p_song_sequence[1],p_question_sequence[1],'claim')returning id into rid;return rid;end$$;

create or replace function public.dmq_release_song_v2(p_round_id uuid)returns boolean language plpgsql security definer set search_path=public as $$declare room uuid;n integer;begin select room_id into room from dmq_rounds where id=p_round_id;update dmq_rounds set claimed_by_user_id=null,claimed_by_name=null,claimed_at=null where id=p_round_id and phase='claim' and(claimed_by_user_id=auth.uid() or dmq_is_leader(room));get diagnostics n=row_count;return n=1;end$$;
create or replace function public.dmq_activate_power(p_round_id uuid,p_power text)returns boolean language plpgsql security definer set search_path=public as $$declare r dmq_rounds%rowtype;p dmq_players%rowtype;begin select * into r from dmq_rounds where id=p_round_id for update;select * into p from dmq_players where room_id=r.room_id and user_id=auth.uid() for update;if not found then raise exception 'Je bent geen speler.';end if;if p.power_used then raise exception 'Je kracht is al gebruikt.';end if;if r.active_power is not null then raise exception 'Er is al een kracht actief.';end if;update dmq_rounds set active_power=p_power,power_used_by_player_id=p.id,power_started_at=now()where id=p_round_id;update dmq_players set power_used=true where id=p.id;return true;end$$;
create or replace function public.dmq_begin_power_phase(p_round_id uuid,p_phase text)returns boolean language plpgsql security definer set search_path=public as $$declare room uuid;begin select room_id into room from dmq_rounds where id=p_round_id;if not dmq_is_leader(room) and not exists(select 1 from dmq_rooms where id=room and host_user_id=auth.uid())then raise exception 'Alleen de spelleider of organisator kan doorgaan.';end if;update dmq_rounds set phase=p_phase where id=p_round_id;update dmq_rooms set phase=p_phase,updated_at=now()where id=room;return true;end$$;
create or replace function public.dmq_set_phase(p_round_id uuid,p_phase text)returns boolean language plpgsql security definer set search_path=public as $$declare room uuid;begin select room_id into room from dmq_rounds where id=p_round_id;if not dmq_is_leader(room) and not exists(select 1 from dmq_rooms where id=room and host_user_id=auth.uid())then raise exception 'Alleen de spelleider of organisator kan doorgaan.';end if;update dmq_rounds set phase=p_phase,revealed_at=case when p_phase='review'then now()else revealed_at end where id=p_round_id;update dmq_rooms set phase=p_phase,updated_at=now()where id=room;return true;end$$;
create or replace function public.dmq_finalize_phantom(p_round_id uuid)returns boolean language plpgsql security definer set search_path=public as $$declare room uuid;begin select room_id into room from dmq_rounds where id=p_round_id;if not dmq_is_leader(room)then return false;end if;update dmq_answers set answer=coalesce(revised_answer,answer)where round_id=p_round_id;return true;end$$;
create or replace function public.dmq_finalize_tower(p_round_id uuid)returns boolean language plpgsql security definer set search_path=public as $$declare room uuid;begin select room_id into room from dmq_rounds where id=p_round_id;if not dmq_is_leader(room)then return false;end if;update dmq_answers set answer=coalesce(revised_answer,answer)where round_id=p_round_id;return true;end$$;
create or replace function public.dmq_next_round_v2(p_room_id uuid)returns uuid language plpgsql security definer set search_path=public as $$declare r dmq_rooms%rowtype;n integer;rid uuid;begin select * into r from dmq_rooms where id=p_room_id for update;if not dmq_is_leader(p_room_id) and not exists(select 1 from dmq_rooms where id=p_room_id and host_user_id=auth.uid())then raise exception 'Alleen de spelleider of organisator kan doorgaan.';end if;if r.phase<>'standings'then raise exception 'Ronde nog niet klaar.';end if;if r.current_round_no>=r.total_rounds then update dmq_rooms set status='finished',phase='finished',updated_at=now()where id=p_room_id;return null;end if;n:=r.current_round_no+1;insert into dmq_rounds(room_id,round_no,song_number,question_type,phase)values(p_room_id,n,r.song_sequence[n],r.question_sequence[n],'claim')returning id into rid;update dmq_rooms set current_round_no=n,phase='claim',updated_at=now()where id=p_room_id;return rid;end$$;

grant execute on function dmq_create_host_room() to authenticated;
grant execute on function dmq_join_room_v2(text,text,text,text,text) to authenticated;
grant execute on function dmq_current_leader(uuid) to authenticated;
grant execute on function dmq_is_leader(uuid) to authenticated;
grant execute on function dmq_start_game_v2(uuid,integer,text,integer[],text[],jsonb) to authenticated;
grant execute on function dmq_release_song_v2(uuid) to authenticated;
grant execute on function dmq_activate_power(uuid,text) to authenticated;
grant execute on function dmq_begin_power_phase(uuid,text) to authenticated;
grant execute on function dmq_set_phase(uuid,text) to authenticated;
grant execute on function dmq_finalize_phantom(uuid) to authenticated;
grant execute on function dmq_finalize_tower(uuid) to authenticated;
grant execute on function dmq_next_round_v2(uuid) to authenticated;
