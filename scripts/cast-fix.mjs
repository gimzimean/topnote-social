// 4명 화면은 항상 「모두 폰 들고 통화하며 행복·재밌게·설레게」(2026-11-05 대표): 통화 묶음 X·Y(남2·여2) 중 하나만 쓰고, 시작·마무리 같은 묶음.
// 한 영상 2~6명: 4인 편은 그 영상 이야기 장면 사람 최대 2명 + 4명 묶음 = 6명. 나머지 단독 장면은 4명 묶음 사람으로.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { cast, person } from './cast-count.mjs';
const root = resolve(import.meta.dirname, '..');
const S = 'C:/topnote-social/ai-reels/src';
const SETS = [['cx1', 'cx2', 'cx3', 'cx4'], ['cy1', 'cy2', 'cy3', 'cy4']].map((s) => s.map((n) => `${S}/people-${n}.mp4`));
const files = readdirSync(resolve(root, 'ai-reels')).filter((f) => f.endsWith('.json'));
let g = 0;
files.forEach((f, k) => {
  const p = resolve(root, 'ai-reels', f);
  const s = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(s.beats)) return;
  s.beats.filter((b) => b.pair).forEach((b, i) => { b.layout = (k + i) % 2 ? 'lr' : 'tb'; });
  const grids = s.beats.filter((b) => b.grid);
  if (grids.length) {
    const set = SETS[g++ % 2];
    // 첫 4명 화면 순서와 마무리 순서를 바꿔 같은 사람이지만 다른 배치로
    grids[0].grid = set; if (grids.length > 1) grids[grids.length - 1].grid = [set[2], set[3], set[0], set[1]];
    const ppl = new Set(set.map(person));
    const story = [];
    let r = 0;
    for (const b of s.beats) {
      if (!b.clip || /-grid|-pair/.test(b.clip) || ppl.has(person(b.clip))) continue;
      const who = person(b.clip);
      if (story.includes(who) || story.length < 2) { if (!story.includes(who)) story.push(who); continue; }
      b.clip = set[r++ % 4]; // 3번째 이야기 인물부터는 4명 묶음 사람으로
    }
    // 친구(같은 성별) 나란히 장면은 6명 넘으면 뺌
    while (cast(s).size > 6) { const i = s.beats.findIndex((b) => b.pair); if (i < 0) break; s.beats.splice(i, 1); if (s.cover && s.cover.from > i) s.cover.from -= 1; }
  }
  writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
});
