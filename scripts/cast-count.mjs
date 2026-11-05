// 영상마다 나오는 사람 수 세기(2026-11-05 대표 「한 영상에 2~6명」). 같은 사람: people-gNa/gNb, talk-ai1-N(4명 화면과 단독 장면)
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
// 결혼 커플 장면(wed-c1~4·6)은 같은 두 사람 → 'wed-couple' 하나로 묶고 셀 때 2명으로
export const person = (p) => { const n = p.split('/').pop().replace('.mp4', '').replace(/^people-(g\d)[ab]$/, 'people-$1'); return /^wed-c[1-46]$/.test(n) ? 'wed-couple' : n; };
export function cast(spec) {
  const set = new Set();
  for (const b of spec.beats ?? []) for (const p of [b.clip, ...(b.grid ?? []), ...(b.pair ?? [])].filter(Boolean)) if (!/-grid\d|-pair\d/.test(p)) set.add(person(p));
  return set;
}
if (process.argv[1]?.endsWith('cast-count.mjs')) {
  for (const f of readdirSync(resolve(root, 'ai-reels')).filter((x) => x.endsWith('.json'))) {
    const s = JSON.parse(readFileSync(resolve(root, 'ai-reels', f), 'utf8'));
    if (!Array.isArray(s.beats)) continue;
    const n = cast(s).size + ([...cast(s)].includes('wed-couple') ? 1 : 0);
    if (n > 6 || n < 2 || process.argv.includes('--all')) console.log(s.id, n);
  }
}
