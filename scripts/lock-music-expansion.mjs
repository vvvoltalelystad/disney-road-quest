import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expansionPath = path.join(root, 'public/music/supabase_songs_150_expansion.sql');
const hotfixPath = path.join(root, 'public/music/supabase_hotfix_v5_exact_soundtracks.sql');
const ids = {
  101:'52xJxFP6TqMuO4Yt0eOkMz',102:'760jhRscwGbIIe1m1IIQpU',103:'4b1yxSdlumA8N4fEk4UOZp',104:'5DJgVGikMm9NKyJO2wvDF6',105:'7I1QMEyw5T3nddOBbvoT9u',106:'1XHc1VYAdV3iwLDpMbLNEy',107:'0inaxid9CcJYsu9CdF0s4m',108:'6gF8tPWPRoPt2j4SZWOUXC',109:'4xUzgBNEzJCVerZZLwRRSH',110:'1N3dZ7TTWO6VcD4Y3hHYLZ',
  111:'3c1ItvzDDDpmDgLH9SIUp4',112:'5yyqx4brn6Bm9U1Rj9ENnz',113:'03xWMkKEbeO4SnylA53ipj',114:'0TCt7OFRdD8PQ6vTRQxNgQ',115:'2GLyruWagsv8o7aGNXboH1',116:'14mNTV7rsvzkVfBmRepX1X',117:'7kh64k3P9Fk4EsA6vOdwmj',118:'40oaXWRJALmKVIryVTSgyI',119:'5cAr657iTXwdYnyT4alvsX',120:'3xGDZyWQ8bICKb1NlN5fd2',
  121:'73nQWdQVd6hLrW8MPTQpP7',122:'6pO5svQbrKKLZS08tIiEUA',123:'45cku3eLTd5hObrNM8q8PA',124:'6Uj1B88LmhTcYSvAVdAYum',125:'3VNVHB1pa63RIokenb7EKt',126:'3T74kgnbHw8JqkYGJKD4Tl',127:'1LhFadk0aWYczltTjIbFlI',128:'3icOFPIciIN8FQSyVlpYSF',129:'2AILbz83cBnrAMAG06rZts',130:'40lNlmrek40tfBOiQzf6qK',
  131:'3wjgPeXocinhLyPL37p70e',132:'0D1OY0M5A0qD5HGBvFmFid',133:'4zDfgax6Ihb0UWdour1ZEs',134:'0PKmDncVOiNQLO6D1P6PXi',135:'1O841LULHXexH8W7fqtctA',136:'3SZXvtZabmTK2oRmdSjfBO',137:'5KLCfUQh7sgWek4C0lbmvs',138:'67KymXb4OUQtUlO31EFOjS',139:'7cX2nwvVfWW3bfScg2f15K',140:'4rp9YObc6Q5xc6X1S8c7m9',
  141:'7rRT1F75dJjTIu4fZp3eXx',142:'0yURuYmnz9tl4K04e5Y6aQ',143:'2xS0Aybg4e8cQ8xiv3DeoH',144:'4FrfQdZaZnudSHPwgliazB',145:'64lQ4g5QiFNDC7gTUCe3DY',146:'4VF8YWqMsY3Y1UcKJBg5XO',147:'0fzcz7acLp523Dyrd43Sm3',148:'517vxmOFgKFJvuucKuUdar',149:'5J554vlWIKAZMlAnsrBpRQ',150:'7fImDWw5bcUhRbZ0w1ny4J'
};

let expansion = fs.readFileSync(expansionPath, 'utf8');
for (const [number, id] of Object.entries(ids)) {
  const row = new RegExp(`(\\(${number},[^\\r\\n]*?')https://open\\.spotify\\.com\\/(?:search|track)/[^']+(')`);
  if (!row.test(expansion)) throw new Error(`Could not find expansion song ${number}`);
  expansion = expansion.replace(row, `$1https://open.spotify.com/track/${id}$2`);
}
fs.writeFileSync(expansionPath, expansion, 'utf8');

let hotfix = fs.readFileSync(hotfixPath, 'utf8');
const rows = Object.entries(ids).map(([number, id], index, all) =>
  `  (${number}, 'https://open.spotify.com/track/${id}')${index === all.length - 1 ? '' : ','}`
).join('\n');
const block = `\n-- Exacte links voor uitbreidingslijst 101-150.\nwith exact_expansion (song_number, spotify_url) as (\n  values\n${rows}\n)\nupdate public.dmq_songs as target\nset spotify_url = exact_expansion.spotify_url, code_image_url = null, enabled = true, updated_at = now()\nfrom exact_expansion\nwhere target.song_number = exact_expansion.song_number;\n`;
hotfix = hotfix.replace(/\n-- Exacte links voor uitbreidingslijst 101-150\.[\s\S]*?where target\.song_number = exact_expansion\.song_number;\n/, '\n');
hotfix = hotfix.replace(/\ncommit;\n/, `${block}\ncommit;\n`)
  .replace('where song_number between 1 and 100;', 'where song_number between 1 and 150;');
fs.writeFileSync(hotfixPath, hotfix, 'utf8');
console.log('Locked Music Match expansion songs 101-150.');
