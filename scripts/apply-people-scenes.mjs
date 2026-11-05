// 2026-11-05 대표: 4명 화면은 처음엔 설레고 나중엔 행복하게 · 1:1(다른 성별)은 남녀 나란히 · 친구(같은 성별)는 여자끼리 나란히 · 4인 수다 뒤 「다 같이 연결」.
// 스펙(ai-reels/*.json)만 고친다. 같은 스펙에 두 번 돌려도 같은 결과(이미 넣은 장면은 다시 안 넣음).
// 실행: node scripts/apply-people-scenes.mjs [id ...]   (없으면 전부)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const S = 'C:/topnote-social/ai-reels/src';
const GA = ['g1a', 'g2a', 'g3a', 'g4a'].map((n) => `${S}/people-${n}.mp4`); // 설레는 시작
const GB = ['g1b', 'g2b', 'g3b', 'g4b'].map((n) => `${S}/people-${n}.mp4`); // 행복한 마무리
const MW = [1, 2, 3, 4].map((i) => [`${S}/people-pm${i}.mp4`, `${S}/people-pw${i}.mp4`]);
const WW = [1, 2].map((i) => [`${S}/people-ff${i}a.mp4`, `${S}/people-ff${i}b.mp4`]);
const MW_TEXT = ['얼굴 몰라도<br>목소리에 <em>설렘</em>.', '사진 없이<br>말이 <em>통하는</em> 순간.', '3분이 이렇게<br><em>짧았나</em>?', '목소리만 들었는데<br><em>설렜다</em>.'];
const CONNECT = '끝나고 셋 이상 원하면<br>넷이 <em>다 같이</em> 연결.';
const FRIEND = '친구로 고르면<br>같은 성별끼리 <em>수다</em>.';
const only = process.argv.slice(2);
const files = readdirSync(resolve(root, 'ai-reels')).filter((f) => f.endsWith('.json'));
let n = 0;
for (const [k, f] of files.entries()) {
  const path = resolve(root, 'ai-reels', f);
  const spec = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(spec.beats) || (only.length && !only.includes(spec.id))) continue;
  const B = spec.beats;
  const insert = (at, beat) => { B.splice(at, 0, beat); if (spec.cover && spec.cover.from >= at) spec.cover.from += 1; };
  const endAt = () => { const i = B.findIndex((b) => b.end); return i < 0 ? B.length : i; };
  const txt = B.map((b) => (b.text || b.end || '').replace(/<[^>]+>/g, '')).join(' ');
  const four = /4인 수다|넷이|넷이서/.test(txt) || B.some((b) => b.grid);
  const grids = B.filter((b) => b.grid);
  if (four) {
    // 4명 화면: 첫 장면은 설렘, 마지막은 행복 + 다 같이 연결
    if (!grids.length) {
      const room = B.findIndex((b) => b.screen?.includes('talkroom'));
      insert(room >= 0 ? room + 1 : 1, { grid: GA, text: '처음 만난 <em>넷이서</em>,<br>살짝 설레는 10분.' });
    } else grids[0].grid = GA;
    const g2 = B.filter((b) => b.grid);
    if (g2.length >= 2) { const last = g2[g2.length - 1]; last.grid = GB; last.text = CONNECT; }
    else if (!B.some((b) => b.text === CONNECT)) insert(endAt(), { grid: GB, text: CONNECT });
    // 친구로도 고를 수 있다고 말하는 편엔 여자끼리 나란히
    const fi = B.findIndex((b) => /친구로/.test(b.text || ''));
    if (fi >= 0 && !B.some((b) => b.pair && b.text === FRIEND)) insert(fi + 1, { pair: WW[k % 2], text: FRIEND });
  } else if (!B.some((b) => b.pair)) {
    // 1:1(다른 성별): 남녀 나란히 한 장면 — 첫 화면 캡처 뒤에
    const sc = B.findIndex((b) => b.screen);
    insert(sc >= 0 ? sc + 1 : Math.min(2, endAt()), { pair: MW[k % 4], text: MW_TEXT[k % 4] });
  }
  writeFileSync(path, JSON.stringify(spec, null, 2) + '\n');
  n++;
}
console.log('고친 스펙', n);
