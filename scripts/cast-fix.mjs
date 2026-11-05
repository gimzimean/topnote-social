// 한 영상 2~6명(2026-11-05 대표): 4명 화면은 그 영상에 이미 나온 사람으로 채우고(모자라면 고정 4인 묶음에서),
// 시작·마무리 4명 화면은 같은 사람(설렘 a → 행복 b), 남녀 장면은 위아래(tb)·좌우(lr)를 번갈아.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { cast, person } from './cast-count.mjs';
const root = resolve(import.meta.dirname, '..');
const S = 'C:/topnote-social/ai-reels/src';
const G = (n, m) => `${S}/people-g${n}${m}.mp4`;
const TALK = [1, 2, 3, 4].map((n) => `${S}/talk-ai1-${n}.mp4`);
const files = readdirSync(resolve(root, 'ai-reels')).filter((f) => f.endsWith('.json'));
files.forEach((f, k) => {
  const p = resolve(root, 'ai-reels', f);
  const s = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(s.beats)) return;
  const pairs = s.beats.filter((b) => b.pair);
  pairs.forEach((b, i) => { b.layout = (k + i) % 2 ? 'lr' : 'tb'; });
  const grids = s.beats.filter((b) => b.grid);
  if (grids.length) {
    const pairPeople = new Set(pairs.flatMap((b) => b.pair.map(person)));
    const own = [...new Set(s.beats.filter((b) => b.clip && !/-grid|-pair/.test(b.clip)).map((b) => b.clip))].filter((c) => !pairPeople.has(person(c)));
    const useTalk = own.some((c) => /talk-ai1-/.test(c));
    let a, z;
    if (useTalk) { a = TALK; z = TALK; }
    else {
      const keep = own.slice(0, 2); // 그 영상 사람 2명 + 고정 4인 묶음 중 2명
      const fill = [1, 2, 3, 4].filter((n) => (n + k) % 2 === 0 || keep.length + 0 < 2).slice(0, 4 - keep.length);
      a = [...keep, ...fill.map((n) => G(n, 'a'))];
      z = [...keep, ...fill.map((n) => G(n, 'b'))];
      while (a.length < 4) { const n = [1, 2, 3, 4].find((x) => !a.includes(G(x, 'a'))); a.push(G(n, 'a')); z.push(G(n, 'b')); }
      // 나머지 단독 장면은 4명 화면에 나온 사람으로 바꿔 사람 수를 줄인다
      const allowed = new Set([...a, ...z].map(person).concat([...pairPeople]));
      let r = 0;
      for (const b of s.beats) if (b.clip && !/-grid|-pair/.test(b.clip) && !allowed.has(person(b.clip))) { b.clip = keep[r % Math.max(1, keep.length)] ?? a[r % 4]; r++; }
    }
    grids[0].grid = a; if (grids.length > 1) grids[grids.length - 1].grid = z;
  }
  // 그래도 6명 넘으면 친구(같은 성별) 장면을 뺀다
  if (cast(s).size > 6) { const i = s.beats.findIndex((b) => b.pair && /같은 성별/.test(b.text)); if (i >= 0) { s.beats.splice(i, 1); if (s.cover && s.cover.from > i) s.cover.from -= 1; } }
  writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
});
