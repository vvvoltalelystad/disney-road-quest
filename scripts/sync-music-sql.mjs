import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(root, 'public/music/song_library_100_spotify.csv');
const seedPath = path.join(root, 'public/music/supabase_songs_100_spotify.sql');
const hotfixPath = path.join(root, 'public/music/supabase_hotfix_v5_exact_soundtracks.sql');

const escapeSql = (value) => String(value ?? '').replaceAll("'", "''");
const lines = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const headers = lines.shift().split(';');
const songs = lines.map((line) => {
  const values = line.split(';');
  return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
});

if (songs.length !== 100) throw new Error(`Expected 100 songs, found ${songs.length}`);
if (songs.some((song) => !/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/.test(song.spotify_url))) {
  throw new Error('Every song must use an exact Spotify track URL');
}

const tuples = songs.map((song, index) => {
  const suffix = index === songs.length - 1 ? '' : ',';
  return `(${Number(song.song_number)}, '${escapeSql(song.label)}', '${escapeSql(song.title)}', '${escapeSql(song.film)}', ${Number(song.year)}, '${escapeSql(song.artist)}', '${escapeSql(song.spotify_url)}', true)${suffix}`;
}).join('\n');

const seed = fs.readFileSync(seedPath, 'utf8');
const valuesMatch = /values\r?\n/.exec(seed);
const conflictMatch = /\r?\non conflict \(song_number\)/.exec(seed.slice(valuesMatch?.index ?? 0));
if (!valuesMatch || !conflictMatch) throw new Error('Could not find seed values block');
const start = valuesMatch.index + valuesMatch[0].length;
const end = (valuesMatch.index + conflictMatch.index);
fs.writeFileSync(seedPath, `${seed.slice(0, start)}${tuples}${seed.slice(end)}`, 'utf8');

const hotfix = `-- Music Match v5: uitsluitend vaste originele soundtracktracks (songs 1-100)\n-- Uitvoeren in Supabase SQL Editor. Veilig opnieuw uitvoerbaar.\n\nbegin;\n\nwith exact_songs (song_number, label, title, film, year, artist, spotify_url, enabled) as (\n  values\n${tuples.split('\n').map((line) => `  ${line}`).join('\n')}\n)\nupdate public.dmq_songs as target\nset\n  label = exact_songs.label,\n  title = exact_songs.title,\n  film = exact_songs.film,\n  year = exact_songs.year,\n  artist = exact_songs.artist,\n  spotify_url = exact_songs.spotify_url,\n  code_image_url = null,\n  enabled = exact_songs.enabled,\n  updated_at = now()\nfrom exact_songs\nwhere target.song_number = exact_songs.song_number;\n\ncommit;\n\nselect\n  count(*) filter (where spotify_url like 'https://open.spotify.com/track/%') as exacte_tracks,\n  count(*) filter (where spotify_url like 'https://open.spotify.com/search/%') as zoeklinks\nfrom public.dmq_songs\nwhere song_number between 1 and 100;\n`;
fs.writeFileSync(hotfixPath, hotfix, 'utf8');

console.log(`Synced ${songs.length} exact soundtrack tracks.`);
