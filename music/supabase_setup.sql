
-- ============================================================
-- DISNEY MUSIC QUEST – SUPABASE INSTALLATIE
-- Voer dit volledige bestand één keer uit in de SQL Editor.
-- Vervang EERST hieronder CHANGE-ME-4827 door je eigen beheer-PIN.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.dmq_app_settings (
  id boolean primary key default true check (id),
  admin_pin_hash text not null
);

insert into public.dmq_app_settings(id,admin_pin_hash)
values (true, crypt('CHANGE-ME-4827', gen_salt('bf')))
on conflict (id) do nothing;

create table if not exists public.dmq_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_user_id uuid not null,
  status text not null default 'lobby' check (status in ('lobby','playing','finished')),
  phase text not null default 'lobby' check (phase in ('lobby','claim','answer','review','standings','finished')),
  total_rounds integer not null default 10 check (total_rounds between 1 and 60),
  current_round_no integer not null default 0,
  game_mode text not null default 'mix',
  song_sequence integer[] not null default '{}',
  question_sequence text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dmq_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.dmq_rooms(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  color text not null default '#bb86ff',
  is_host boolean not null default false,
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  unique(room_id,user_id),
  unique(room_id,name)
);

create table if not exists public.dmq_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.dmq_rooms(id) on delete cascade,
  round_no integer not null,
  song_number integer not null,
  question_type text not null check (question_type in ('mix','full','film','title','year','artist')),
  phase text not null default 'claim' check (phase in ('claim','answer','review','standings')),
  claimed_by_user_id uuid,
  claimed_by_name text,
  claimed_at timestamptz,
  playing_confirmed_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(room_id,round_no)
);

create table if not exists public.dmq_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.dmq_rooms(id) on delete cascade,
  round_id uuid not null references public.dmq_rounds(id) on delete cascade,
  player_id uuid not null references public.dmq_players(id) on delete cascade,
  user_id uuid not null,
  answer jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  proposed_points integer,
  final_points integer,
  points_confirmed boolean not null default false,
  correction_note text,
  points_confirmed_at timestamptz,
  round_completed boolean not null default false,
  completed_at timestamptz,
  unique(round_id,user_id)
);

create table if not exists public.dmq_songs (
  id bigint generated always as identity primary key,
  song_number integer not null unique check (song_number between 1 and 99),
  label text not null,
  spotify_url text,
  code_image_url text,
  title text,
  film text,
  year integer,
  artist text,
  film_aliases text[] not null default '{}',
  title_aliases text[] not null default '{}',
  artist_aliases text[] not null default '{}',
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 60 vaste songposities.
insert into public.dmq_songs(song_number,label)
select n, 'Song ' || lpad(n::text,2,'0')
from generate_series(1,60) n
on conflict(song_number) do nothing;

-- Voorbeelden. Voeg zelf de Spotify-links of codeafbeeldingen toe via Songbeheer.
update public.dmq_songs set title='Let It Go',film='Frozen',year=2013,artist='Idina Menzel',film_aliases=array['Frozen – De IJskoningin'] where song_number=1;
update public.dmq_songs set title='Hakuna Matata',film='The Lion King',year=1994,artist='Nathan Lane, Ernie Sabella, Jason Weaver, Joseph Williams',film_aliases=array['De Leeuwenkoning'] where song_number=2;
update public.dmq_songs set title='A Whole New World',film='Aladdin',year=1992,artist='Brad Kane, Lea Salonga' where song_number=3;
update public.dmq_songs set title='Under the Sea',film='The Little Mermaid',year=1989,artist='Samuel E. Wright',film_aliases=array['De Kleine Zeemeermin'] where song_number=4;
update public.dmq_songs set title='Be Our Guest',film='Beauty and the Beast',year=1991,artist='Jerry Orbach, Angela Lansbury',film_aliases=array['Belle en het Beest'] where song_number=5;
update public.dmq_songs set title='You''ve Got a Friend in Me',film='Toy Story',year=1995,artist='Randy Newman' where song_number=6;
update public.dmq_songs set title='How Far I''ll Go',film='Moana',year=2016,artist='Auliʻi Cravalho',film_aliases=array['Vaiana'] where song_number=7;
update public.dmq_songs set title='We Don''t Talk About Bruno',film='Encanto',year=2021,artist='Encanto cast' where song_number=8;
update public.dmq_songs set title='Remember Me',film='Coco',year=2017,artist='Coco cast' where song_number=9;
update public.dmq_songs set title='I''ll Make a Man Out of You',film='Mulan',year=1998,artist='Donny Osmond' where song_number=10;
update public.dmq_songs set title='I See the Light',film='Tangled',year=2010,artist='Mandy Moore, Zachary Levi',film_aliases=array['Rapunzel'] where song_number=11;
update public.dmq_songs set title='Friend Like Me',film='Aladdin',year=1992,artist='Robin Williams' where song_number=12;
update public.dmq_songs set title='Part of Your World',film='The Little Mermaid',year=1989,artist='Jodi Benson',film_aliases=array['De Kleine Zeemeermin'] where song_number=13;
update public.dmq_songs set title='Circle of Life',film='The Lion King',year=1994,artist='Carmen Twillie, Lebo M',film_aliases=array['De Leeuwenkoning'] where song_number=14;
update public.dmq_songs set title='Into the Unknown',film='Frozen II',year=2019,artist='Idina Menzel, AURORA' where song_number=15;
update public.dmq_songs set title='Surface Pressure',film='Encanto',year=2021,artist='Jessica Darrow' where song_number=16;
update public.dmq_songs set title='You''re Welcome',film='Moana',year=2016,artist='Dwayne Johnson',film_aliases=array['Vaiana'] where song_number=17;
update public.dmq_songs set title='Go the Distance',film='Hercules',year=1997,artist='Roger Bart' where song_number=18;
update public.dmq_songs set title='Colors of the Wind',film='Pocahontas',year=1995,artist='Judy Kuhn' where song_number=19;
update public.dmq_songs set title='Almost There',film='The Princess and the Frog',year=2009,artist='Anika Noni Rose',film_aliases=array['De Prinses en de Kikker'] where song_number=20;
update public.dmq_songs set title='When You Wish Upon a Star',film='Pinocchio',year=1940,artist='Cliff Edwards' where song_number=21;
update public.dmq_songs set title='The Bare Necessities',film='The Jungle Book',year=1967,artist='Phil Harris, Bruce Reitherman' where song_number=22;
update public.dmq_songs set title='Everybody Wants to Be a Cat',film='The Aristocats',year=1970,artist='The Aristocats cast' where song_number=23;
update public.dmq_songs set title='I Won''t Say I''m in Love',film='Hercules',year=1997,artist='Susan Egan' where song_number=24;
update public.dmq_songs set title='For the First Time in Forever',film='Frozen',year=2013,artist='Kristen Bell, Idina Menzel' where song_number=25;
update public.dmq_songs set title='Un Poco Loco',film='Coco',year=2017,artist='Anthony Gonzalez, Gael García Bernal' where song_number=26;
update public.dmq_songs set title='Shiny',film='Moana',year=2016,artist='Jemaine Clement',film_aliases=array['Vaiana'] where song_number=27;
update public.dmq_songs set title='Gaston',film='Beauty and the Beast',year=1991,artist='Jesse Corti, Richard White',film_aliases=array['Belle en het Beest'] where song_number=28;
update public.dmq_songs set title='Cruella De Vil',film='One Hundred and One Dalmatians',year=1961,artist='Bill Lee',film_aliases=array['101 Dalmatiërs','101 Dalmatians'] where song_number=29;
update public.dmq_songs set title='Zero to Hero',film='Hercules',year=1997,artist='The Muses' where song_number=30;

-- ============================================================
-- FUNCTIES
-- ============================================================

create or replace function public.dmq_create_room(p_host_name text,p_color text)
returns table(room_id uuid,room_code text,player_id uuid)
language plpgsql security definer set search_path=public
as $$
declare v_room_id uuid;v_code text;v_player_id uuid;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  loop
    v_code:=upper(substr(encode(gen_random_bytes(6),'hex'),1,6));
    exit when not exists(select 1 from dmq_rooms where code=v_code);
  end loop;
  insert into dmq_rooms(code,host_user_id) values(v_code,auth.uid()) returning id into v_room_id;
  insert into dmq_players(room_id,user_id,name,color,is_host)
  values(v_room_id,auth.uid(),trim(p_host_name),p_color,true) returning id into v_player_id;
  return query select v_room_id,v_code,v_player_id;
end $$;

create or replace function public.dmq_join_room(p_code text,p_player_name text,p_color text)
returns table(room_id uuid,player_id uuid)
language plpgsql security definer set search_path=public
as $$
declare v_room dmq_rooms%rowtype;v_player_id uuid;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  select * into v_room from dmq_rooms where code=upper(trim(p_code)) and status='lobby';
  if not found then raise exception 'Deze spelkamer bestaat niet of is al gestart.'; end if;
  select id into v_player_id from dmq_players where room_id=v_room.id and user_id=auth.uid();
  if found then return query select v_room.id,v_player_id;return;end if;
  if (select count(*) from dmq_players where room_id=v_room.id)>=3 then raise exception 'Deze spelkamer is vol.';end if;
  if exists(select 1 from dmq_players where room_id=v_room.id and lower(name)=lower(trim(p_player_name))) then
    raise exception 'Deze spelersnaam is al bezet.';
  end if;
  insert into dmq_players(room_id,user_id,name,color)
  values(v_room.id,auth.uid(),trim(p_player_name),p_color) returning id into v_player_id;
  return query select v_room.id,v_player_id;
end $$;

create or replace function public.dmq_start_game(
  p_room_id uuid,p_total_rounds integer,p_game_mode text,
  p_song_sequence integer[],p_question_sequence text[]
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare v_round_id uuid;
begin
  if not exists(select 1 from dmq_rooms where id=p_room_id and host_user_id=auth.uid() and status='lobby') then
    raise exception 'Alleen de spelleider kan starten.';
  end if;
  if (select count(*) from dmq_players where room_id=p_room_id)<>3 then raise exception 'Er moeten precies drie spelers zijn.';end if;
  if array_length(p_song_sequence,1)<>p_total_rounds or array_length(p_question_sequence,1)<>p_total_rounds then
    raise exception 'De songvolgorde klopt niet.';
  end if;
  update dmq_players set score=0 where room_id=p_room_id;
  update dmq_rooms set status='playing',phase='claim',total_rounds=p_total_rounds,current_round_no=1,
    game_mode=p_game_mode,song_sequence=p_song_sequence,question_sequence=p_question_sequence,updated_at=now()
    where id=p_room_id;
  insert into dmq_rounds(room_id,round_no,song_number,question_type,phase)
  values(p_room_id,1,p_song_sequence[1],p_question_sequence[1],'claim') returning id into v_round_id;
  return v_round_id;
end $$;

create or replace function public.dmq_claim_song(p_round_id uuid)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_name text;v_count integer;
begin
  select p.name into v_name from dmq_rounds r join dmq_players p on p.room_id=r.room_id
  where r.id=p_round_id and p.user_id=auth.uid();
  if not found then 
    if exists(select 1 from dmq_rounds r join dmq_rooms rm on rm.id=r.room_id where r.id=p_round_id and rm.host_user_id=auth.uid()) then
      v_name := 'Organisator';
    else
      raise exception 'Je hoort niet bij deze spelkamer.';
    end if;
  end if;
  update dmq_rounds set claimed_by_user_id=auth.uid(),claimed_by_name=v_name,claimed_at=now()
  where id=p_round_id and phase='claim' and claimed_by_user_id is null;
  get diagnostics v_count=row_count;
  return v_count=1;
end $$;

create or replace function public.dmq_release_song(p_round_id uuid)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_room_id uuid;v_count integer;
begin
  select room_id into v_room_id from dmq_rounds where id=p_round_id;
  update dmq_rounds set claimed_by_user_id=null,claimed_by_name=null,claimed_at=null
  where id=p_round_id and phase='claim' and
   (claimed_by_user_id=auth.uid() or exists(select 1 from dmq_rooms where id=v_room_id and host_user_id=auth.uid()));
  get diagnostics v_count=row_count;
  return v_count=1;
end $$;

create or replace function public.dmq_confirm_playing(p_round_id uuid)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_room_id uuid;v_count integer;
begin
  update dmq_rounds set phase='answer',playing_confirmed_at=now()
  where id=p_round_id and phase='claim' and claimed_by_user_id=auth.uid()
  returning room_id into v_room_id;
  get diagnostics v_count=row_count;
  if v_count=1 then update dmq_rooms set phase='answer',updated_at=now() where id=v_room_id;end if;
  return v_count=1;
end $$;

create or replace function public.dmq_confirm_points(p_answer_id uuid,p_final_points integer,p_note text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_answer dmq_answers%rowtype;
begin
  select * into v_answer from dmq_answers where id=p_answer_id for update;
  if not found or v_answer.user_id<>auth.uid() then raise exception 'Dit is niet jouw antwoord.';end if;
  if v_answer.points_confirmed then return false;end if;
  if p_final_points<0 or p_final_points>5 then raise exception 'Ongeldig puntenaantal.';end if;
  update dmq_answers set final_points=p_final_points,points_confirmed=true,
    correction_note=nullif(trim(p_note),''),points_confirmed_at=now() where id=p_answer_id;
  update dmq_players set score=score+p_final_points where id=v_answer.player_id;
  return true;
end $$;

create or replace function public.dmq_complete_round(p_answer_id uuid)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_answer dmq_answers%rowtype;v_total integer;v_done integer;
begin
  select * into v_answer from dmq_answers where id=p_answer_id for update;
  if not found or v_answer.user_id<>auth.uid() then raise exception 'Dit is niet jouw antwoord.';end if;
  if not v_answer.points_confirmed then raise exception 'Bevestig eerst je punten.';end if;
  update dmq_answers set round_completed=true,completed_at=now() where id=p_answer_id;
  select count(*) into v_total from dmq_players where room_id=v_answer.room_id;
  select count(*) into v_done from dmq_answers where round_id=v_answer.round_id and round_completed;
  if v_done=v_total then
    update dmq_rounds set phase='standings' where id=v_answer.round_id;
    update dmq_rooms set phase='standings',updated_at=now() where id=v_answer.room_id;
  end if;
  return true;
end $$;

create or replace function public.dmq_next_round(p_room_id uuid)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_room dmq_rooms%rowtype;v_next integer;v_round_id uuid;
begin
  select * into v_room from dmq_rooms where id=p_room_id for update;
  if not found or v_room.host_user_id<>auth.uid() then raise exception 'Alleen de spelleider kan doorgaan.';end if;
  if v_room.phase<>'standings' then raise exception 'De ronde is nog niet door iedereen afgerond.';end if;
  if v_room.current_round_no>=v_room.total_rounds then
    update dmq_rooms set status='finished',phase='finished',updated_at=now() where id=p_room_id;
    return null;
  end if;
  v_next:=v_room.current_round_no+1;
  insert into dmq_rounds(room_id,round_no,song_number,question_type,phase)
  values(p_room_id,v_next,v_room.song_sequence[v_next],v_room.question_sequence[v_next],'claim')
  returning id into v_round_id;
  update dmq_rooms set current_round_no=v_next,phase='claim',updated_at=now() where id=p_room_id;
  return v_round_id;
end $$;

create or replace function public.dmq_admin_upsert_song(
  p_pin text,p_song_number integer,p_title text,p_film text,p_year integer,p_artist text,
  p_spotify_url text,p_code_image_url text,p_film_aliases text[],p_title_aliases text[],
  p_artist_aliases text[],p_enabled boolean
) returns boolean
language plpgsql security definer set search_path=public
as $$
declare v_hash text;
begin
  select admin_pin_hash into v_hash from dmq_app_settings where id=true;
  if v_hash is null or crypt(p_pin,v_hash)<>v_hash then raise exception 'Onjuiste beheer-PIN.';end if;
  insert into dmq_songs(song_number,label,title,film,year,artist,spotify_url,code_image_url,
    film_aliases,title_aliases,artist_aliases,enabled,updated_at)
  values(p_song_number,'Song '||lpad(p_song_number::text,2,'0'),nullif(trim(p_title),''),
    nullif(trim(p_film),''),p_year,nullif(trim(p_artist),''),nullif(trim(p_spotify_url),''),
    nullif(trim(p_code_image_url),''),coalesce(p_film_aliases,'{}'),coalesce(p_title_aliases,'{}'),
    coalesce(p_artist_aliases,'{}'),p_enabled,now())
  on conflict(song_number) do update set title=excluded.title,film=excluded.film,year=excluded.year,
    artist=excluded.artist,spotify_url=excluded.spotify_url,code_image_url=excluded.code_image_url,
    film_aliases=excluded.film_aliases,title_aliases=excluded.title_aliases,
    artist_aliases=excluded.artist_aliases,enabled=excluded.enabled,updated_at=now();
  return true;
end $$;


create or replace function public.dmq_is_room_member(p_room_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from dmq_players where room_id=p_room_id and user_id=auth.uid()) $$;

create or replace function public.dmq_is_room_host(p_room_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from dmq_rooms where id=p_room_id and host_user_id=auth.uid()) $$;

-- ============================================================
-- RLS EN RECHTEN
-- ============================================================

alter table dmq_app_settings enable row level security;
alter table dmq_rooms enable row level security;
alter table dmq_players enable row level security;
alter table dmq_rounds enable row level security;
alter table dmq_answers enable row level security;
alter table dmq_songs enable row level security;

drop policy if exists "rooms_select" on dmq_rooms;
create policy "rooms_select" on dmq_rooms for select to authenticated using(
  status='lobby' or dmq_is_room_member(id)
);
drop policy if exists "rooms_host_update" on dmq_rooms;
create policy "rooms_host_update" on dmq_rooms for update to authenticated
using(dmq_is_room_host(id)) with check(dmq_is_room_host(id));

drop policy if exists "players_select" on dmq_players;
create policy "players_select" on dmq_players for select to authenticated using(
  dmq_is_room_member(room_id)
);
drop policy if exists "players_own_update" on dmq_players;
create policy "players_own_update" on dmq_players for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists "players_delete_own_or_host" on dmq_players;
create policy "players_delete_own_or_host" on dmq_players for delete to authenticated
using(user_id=auth.uid() or exists(select 1 from dmq_rooms r where r.id=room_id and r.host_user_id=auth.uid()));

drop policy if exists "rounds_select" on dmq_rounds;
create policy "rounds_select" on dmq_rounds for select to authenticated using(
  dmq_is_room_member(room_id)
);
drop policy if exists "rounds_host_insert" on dmq_rounds;
create policy "rounds_host_insert" on dmq_rounds for insert to authenticated with check(
  dmq_is_room_host(room_id)
);
drop policy if exists "rounds_host_update" on dmq_rounds;
create policy "rounds_host_update" on dmq_rounds for update to authenticated using(
  dmq_is_room_host(room_id)
);

drop policy if exists "answers_select" on dmq_answers;
create policy "answers_select" on dmq_answers for select to authenticated using(
  dmq_is_room_member(room_id)
);
drop policy if exists "answers_insert_own" on dmq_answers;
create policy "answers_insert_own" on dmq_answers for insert to authenticated with check(
  user_id=auth.uid() and exists(select 1 from dmq_players p where p.id=player_id and p.user_id=auth.uid() and p.room_id=room_id)
);
drop policy if exists "answers_update_own_or_host" on dmq_answers;
create policy "answers_update_own_or_host" on dmq_answers for update to authenticated using(
  user_id=auth.uid() or dmq_is_room_host(room_id)
);

drop policy if exists "songs_select" on dmq_songs;
create policy "songs_select" on dmq_songs for select to authenticated using(true);

grant select,update on dmq_rooms to authenticated;
grant select,update,delete on dmq_players to authenticated;
grant select,insert,update on dmq_rounds to authenticated;
grant select,insert,update on dmq_answers to authenticated;
grant select on dmq_songs to authenticated;

grant execute on function dmq_is_room_member(uuid) to authenticated;
grant execute on function dmq_is_room_host(uuid) to authenticated;
grant execute on function dmq_create_room(text,text) to authenticated;
grant execute on function dmq_join_room(text,text,text) to authenticated;
grant execute on function dmq_start_game(uuid,integer,text,integer[],text[]) to authenticated;
grant execute on function dmq_claim_song(uuid) to authenticated;
grant execute on function dmq_release_song(uuid) to authenticated;
grant execute on function dmq_confirm_playing(uuid) to authenticated;
grant execute on function dmq_confirm_points(uuid,integer,text) to authenticated;
grant execute on function dmq_complete_round(uuid) to authenticated;
grant execute on function dmq_next_round(uuid) to authenticated;
grant execute on function dmq_admin_upsert_song(text,integer,text,text,integer,text,text,text,text[],text[],text[],boolean) to authenticated;

-- Realtime activeren.
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='dmq_rooms') then
    alter publication supabase_realtime add table dmq_rooms;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='dmq_players') then
    alter publication supabase_realtime add table dmq_players;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='dmq_rounds') then
    alter publication supabase_realtime add table dmq_rounds;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='dmq_answers') then
    alter publication supabase_realtime add table dmq_answers;
  end if;
end $$;
