// 한 영상 안에서 같은 장면(같은 원본 파일)이 두 번 나오지 않게(2026-11-05 대표 「앞에 나온 영상들이 중복」).
// 다시 나오는 4명 화면은 4인 수다 앱 화면(같은 문구)으로, 다시 나오는 단독·남녀 장면은 뺀다. 표지 장면 번호도 맞춘다.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const TALKROOM = 'C:/topnote-app/store-assets/mix-template/captures/talkroom.png';
let changed = 0;
for (const f of readdirSync(resolve(root, 'ai-reels')).filter((x) => x.endsWith('.json'))) {
  const p = resolve(root, 'ai-reels', f);
  const s = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(s.beats)) continue;
  const used = new Set();
  const out = [];
  let coverFrom = s.cover?.from ?? 0, newCover = null;
  s.beats.forEach((b, i) => {
    const files = [b.clip, ...(b.grid ?? []), ...(b.pair ?? [])].filter((x) => x && !/-grid\d|-pair\d/.test(x));
    const dup = files.some((x) => used.has(x));
    let keep = b;
    if (dup) {
      if (b.grid) keep = { screen: TALKROOM, text: b.text };
      else keep = null;
      changed++;
    } else files.forEach((x) => used.add(x));
    if (keep) { if (i === coverFrom) newCover = out.length; out.push(keep); }
  });
  // 같은 앱 화면은 한 번만(「다 같이 연결」 문구가 있는 쪽을 남김)
  const final = out.filter((b, i) => { if (!b.screen) return true; const same = out.map((x, j) => [x, j]).filter(([x]) => x.screen === b.screen); if (same.length < 2) return true; const keep = (same.find(([x]) => /다 같이/.test(x.text)) ?? same[same.length - 1])[1]; return i === keep; });
  s.beats = final;
  if (s.cover) {
    if (newCover === null || !(final[newCover]?.clip || final[newCover]?.grid || final[newCover]?.pair)) newCover = final.findIndex((b) => b.clip || b.grid || b.pair);
    s.cover.from = newCover;
  }
  writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
}
console.log('중복 장면 고침', changed);
