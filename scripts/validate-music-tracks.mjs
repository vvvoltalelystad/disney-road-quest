import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = path.join(root, 'public/music/song_library_100_spotify.csv');
const [headerLine, ...lines] = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const headers = headerLine.split(';');
const songs = lines.map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split(';')[index]])));
const normalize = (value) => value.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/&[^;]+;/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\bwan na\b/g, 'wanna')
  .replace(/\bsome day\b/g, 'someday')
  .trim();

const failures = [];
let cursor = 0;
async function worker() {
  while (cursor < songs.length) {
    const song = songs[cursor++];
    const response = await fetch(song.spotify_url, { redirect: 'follow' });
    const html = await response.text();
    const pageTitle = /<title>(.*?)<\/title>/i.exec(html)?.[1] ?? '';
    const expected = normalize(song.title).replace(/\breprise\b/g, '').trim();
    const actual = normalize(pageTitle);
    if (!response.ok || !pageTitle || !actual.includes(expected)) {
      failures.push({ number: song.song_number, title: song.title, status: response.status, pageTitle });
    }
  }
}

await Promise.all(Array.from({ length: 8 }, () => worker()));
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Validated ${songs.length} exact Spotify tracks.`);
}
