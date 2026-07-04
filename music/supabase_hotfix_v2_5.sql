-- Disney Music Quest v2.5: vrije kleuren en avatars veilig ophalen
-- Voer dit bestand één keer uit in Supabase SQL Editor.

create or replace function public.dmq_get_lobby_choices(p_code text)
returns table(
  player_id uuid,
  player_name text,
  color_id text,
  color text,
  avatar_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.color_id,
    p.color,
    p.avatar_id
  from public.dmq_rooms r
  join public.dmq_players p on p.room_id = r.id
  where r.code = upper(trim(p_code))
    and r.status = 'lobby'
  order by p.joined_at;
$$;

revoke all on function public.dmq_get_lobby_choices(text) from public;
grant execute on function public.dmq_get_lobby_choices(text) to authenticated;
