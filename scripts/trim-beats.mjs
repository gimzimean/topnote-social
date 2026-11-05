// 영상 길이 15~20초(2026-11-05 대표 「너무 길어」): 앱 화면은 최대 2개, 장면은 끝 화면 포함 최대 7개. 첫 장면(후킹)·끝 화면은 그대로.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
for (const f of readdirSync(resolve(root, 'ai-reels')).filter((x) => x.endsWith('.json'))) {
  const p = resolve(root, 'ai-reels', f);
  const s = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(s.beats)) continue;
  const coverBeat = s.beats[s.cover?.from ?? 0];
  let screens = 0;
  // 앱 화면: 「다 같이 연결」·4인 수다 화면을 먼저 남기고 나머지는 앞에서부터 2개까지
  const keepScreen = new Set();
  const prio = s.beats.map((b, i) => [b, i]).filter(([b]) => b.screen).sort(([a], [b]) => (/다 같이/.test(b.text) - /다 같이/.test(a.text)));
  for (const [, i] of prio) if (screens++ < 2) keepScreen.add(i);
  let beats = s.beats.filter((b, i) => !b.screen || keepScreen.has(i));
  // 사람 장면이 너무 많으면 첫 장면·표지 장면은 두고 뒤에서부터 줄이기
  while (beats.length > 7) {
    const i = beats.map((b, j) => j).reverse().find((j) => j > 0 && !beats[j].end && !beats[j].screen && beats[j] !== coverBeat);
    if (i === undefined) break;
    beats.splice(i, 1);
  }
  s.beats = beats;
  if (s.cover) { const ci = beats.indexOf(coverBeat); s.cover.from = ci >= 0 ? ci : beats.findIndex((b) => b.clip || b.grid || b.pair); }
  writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
}
