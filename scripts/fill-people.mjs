// 중복을 뺀 뒤 사람 장면이 3개보다 적은 영상: 그 영상에 안 나온 「편하게 즐기며 통화」 단독 장면을 앱 화면 사이에 끼워 넣는다(한 영상 6명 이하).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { cast, person } from './cast-count.mjs';
const root = resolve(import.meta.dirname, '..');
const S = 'C:/topnote-social/ai-reels/src';
const POOL = ['da1', 'da4', 'da2', 'db2', 'cz3', 'da3', 'db1', 'cz1', 'db4', 'cz4'].map((n) => `${S}/people-${n}.mp4`);
const TEXT = ['퇴근하고 집에서,<br><em>편하게</em> 통화.', '맥주 한 캔 따고<br>이어폰 <em>꽂고</em>.', '밥 먹으면서<br><em>수다</em> 한 판.', '야식 먹으면서<br><em>3분</em>.', '소파에 누워서<br><em>목소리</em>로 먼저.'];
let n = 0;
readdirSync(resolve(root, 'ai-reels')).filter((x) => x.endsWith('.json')).forEach((f, k) => {
  const p = resolve(root, 'ai-reels', f);
  const s = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(s.beats)) return;
  const peopleBeats = () => s.beats.filter((b) => b.clip || b.grid || b.pair).length;
  const used = new Set(s.beats.flatMap((b) => [b.clip, ...(b.grid ?? []), ...(b.pair ?? [])].filter(Boolean)));
  let t = k;
  for (const c of POOL) {
    if (peopleBeats() >= 3) break;
    if (used.has(c)) continue;
    const test = { beats: [...s.beats, { clip: c }] };
    if (cast(test).size > 6) continue;
    // 앱 화면이 두 번 이어지는 자리 사이(없으면 끝 화면 앞)에 넣기
    let at = s.beats.findIndex((b, i) => b.screen && s.beats[i + 1]?.screen) + 1;
    if (at <= 0) at = s.beats.findIndex((b) => b.end);
    if (at < 0) at = s.beats.length;
    s.beats.splice(at, 0, { clip: c, text: TEXT[t++ % TEXT.length] });
    if (s.cover && s.cover.from >= at) s.cover.from += 1;
    used.add(c); n++;
  }
  writeFileSync(p, JSON.stringify(s, null, 2) + '\n');
});
console.log('사람 장면 채움', n);
