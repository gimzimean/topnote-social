// 2026-11-05 대표: 4명 화면은 처음엔 설레고 나중엔 행복하게 · 1:1(다른 성별)은 남녀 나란히 · 친구(같은 성별)는 여자끼리 나란히 · 4인 수다 뒤 「다 같이 연결」.
// 스펙(ai-reels/*.json)만 고친다. 같은 스펙에 두 번 돌려도 같은 결과(이미 넣은 장면은 다시 안 넣음).
// 실행: node scripts/apply-people-scenes.mjs [id ...]   (없으면 전부)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const S = 'C:/topnote-social/ai-reels/src';
// 2026-11-05 대표 「다 설레지 말고 행복·설렘·웃김·유쾌 섞어 · 이전 표정이 더 좋아」: 시작은 예전 4인 수다 장면, 마무리는 예전·새 장면을 섞어서
const GA = ['talk-ai1-1', 'talk-ai1-2', 'talk-ai1-3', 'talk-ai1-4'].map((n) => `${S}/${n}.mp4`);
const GB = ['bar-ai2-3', 'bar-ai1-4', 'xmas-ai4-3', 'people-g2b'].map((n) => `${S}/${n}.mp4`); // 유쾌·웃김·행복·크게 웃음
const MW = [['people-pm1', 'people-pw1'], ['rot-ai1-4', 'rot-ai1-3'], ['rot-ai3-3', 'rot-ai2-3'], ['people-pm3', 'people-pw3']].map(([m, w]) => [`${S}/${m}.mp4`, `${S}/${w}.mp4`]); // 설렘·행복·웃김·유쾌
const WW = [1, 2].map((i) => [`${S}/people-ff${i}a.mp4`, `${S}/people-ff${i}b.mp4`]);
const MW_TEXT = ['얼굴 몰라도<br>목소리에 <em>설렘</em>.', '말이 이렇게<br>잘 <em>통할</em> 줄이야.', '같은 데서<br><em>빵</em> 터졌다.', '3분이 이렇게<br><em>짧았나</em>?'];
const CONNECT = '끝나고 셋 이상 원하면<br>넷이 <em>다 같이</em> 연결.';
const FRIEND = '친구로 고르면<br>같은 성별끼리 <em>수다</em>.';
const only = process.argv.slice(2);
const files = readdirSync(resolve(root, 'ai-reels')).filter((f) => f.endsWith('.json'));
let n = 0;
for (const [k, f] of files.entries()) {
  const path = resolve(root, 'ai-reels', f);
  const spec = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(spec.beats) || spec.manual || (only.length && !only.includes(spec.id))) continue; // manual: 손으로 고른 광고 편은 건드리지 않음
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
  } else if (B.some((b) => b.clip && MW.flat().includes(b.clip))) {
    // 남녀를 따로따로(남 → 여) 보여 주는 편: 그대로 둔다
  } else if (B.some((b) => b.pair)) {
    const pb = B.find((b) => b.pair); pb.pair = MW[k % 4]; pb.text = MW_TEXT[k % 4];
  } else {
    // 1:1(다른 성별): 남녀 나란히 한 장면 — 첫 화면 캡처 뒤에
    const sc = B.findIndex((b) => b.screen);
    insert(sc >= 0 ? sc + 1 : Math.min(2, endAt()), { pair: MW[k % 4], text: MW_TEXT[k % 4] });
  }
  writeFileSync(path, JSON.stringify(spec, null, 2) + '\n');
  n++;
}
console.log('고친 스펙', n);
