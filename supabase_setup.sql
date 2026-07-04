-- Disney Road Quest Supabase Setup SQL
-- Paste this script into the Supabase SQL Editor (https://supabase.com) for your project.

-- 1. Clean up existing tables (if needed)
DROP TABLE IF EXISTS score_history CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- 2. Create the 'rooms' table to store active game rooms
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby', -- 'lobby', 'playing', 'ended'
  game_mode TEXT NOT NULL DEFAULT 'mix', -- 'mix', 'Quiz', 'Samen', etc.
  game_version INT4 NOT NULL DEFAULT 1,
  rounds_per_player INT4 NOT NULL DEFAULT 10,
  current_player_index INT4 NOT NULL DEFAULT 0,
  current_task_id TEXT,
  current_task_state JSONB DEFAULT '{}'::jsonb NOT NULL,
  round INT4 NOT NULL DEFAULT 0,
  total_rounds INT4 NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the 'players' table to store players in each room
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  score INT4 NOT NULL DEFAULT 0,
  knowledge INT4 NOT NULL DEFAULT 0,
  creative INT4 NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create the 'score_history' table to log all score changes
CREATE TABLE score_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  player_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  delta INT4 NOT NULL,
  reason TEXT NOT NULL,
  bucket TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Supabase Realtime for these tables
-- This allows clients to listen to changes on these tables in real-time.
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE score_history;

-- 6. Disable Row Level Security (RLS) to allow anonymous read/write access
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE score_history DISABLE ROW LEVEL SECURITY;

-- 7. Grant explicit table access privileges to anon and authenticated roles
GRANT ALL ON TABLE rooms TO anon, authenticated;
GRANT ALL ON TABLE players TO anon, authenticated;
GRANT ALL ON TABLE score_history TO anon, authenticated;
