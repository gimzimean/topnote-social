// 대표가 좋아한 남자 얼굴(ai-reels/favorites.json)을 남녀 장면의 남자 자리에 먼저 쓴다. 한 영상 안 중복은 피함.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const S = 'C:/topnote-social/ai-reels/src';
const fav = JSON.parse(readFileSync(resolve(root, 'ai-reels/favorites.json'), 'utf8')).men.map((n) => `${S}/${n}.mp4`);
const callers = fav.filter((f) => !/xmas-ai10-2|xmas-ai8-1/.test(f)); // 남녀 통화 장면엔 통화 중인 얼굴만
let k = 0, n = 0;
for (const f of readdirSync(resolve(root, 'ai-reels')).filter((x) => x.endsWith('.json') && x !== 'favorites.json')) {
  const p = resolve(root, 'ai-reels', f);
  const s = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(s.beats)) continue;
  const used = () => new Set(s.beats.flatMap((b) => [b.clip, ...(b.grid ?? []), ...(b.pair ?? [])].filter(Boolean)));
  for (const b of s.beats) {
    if (!b.pair || /같은 성별/.test(b.text ?? '')) continue;
    if (callers.includes(b.pair[0])) continue;
    for (let t = 0; t < callers.length; t++) { const c = callers[(k + t) % callers.length]; if (!used().has(c)) { b.pair[0] = c; n++; break; } }
    k++;
  }
  writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
}
console.log('남자 자리 바꿈', n);
