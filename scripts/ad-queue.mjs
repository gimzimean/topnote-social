// 광고 영상 대기열(2026-11-03 대표 「광고 영상 전부 릴스·틱톡에 일반 게시물로」).
// ads/ads.json 순서대로, 하루 두 번(12:30 · 20:00 KST) 한 편씩 scripts/reel.mjs 로 올린다
// (릴스 + 표지 + 피드 공유 + 첫 댓글 topnote.app/ig → 스토리 → 스레드 영상 + 답글 topnote.app/th → 틱톡 초안).
// 영상·표지는 docs/ads/adNN.mp4 · adNN-cover.jpg (GitHub Pages). 올린 기록은 state.json 의 ads · ads_last_slot.
// 실행: node scripts/ad-queue.mjs [ad05]   (편을 주면 시간 칸 확인 없이 그 편을 올림, 환경변수 AD 도 같음)
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const statePath = resolve(root, 'state.json');
const state = JSON.parse(readFileSync(statePath, 'utf8'));
state.ads ??= [];
const kst = new Date(Date.now() + 9 * 36e5);
const slot = `${kst.toISOString().slice(0, 10)}-${kst.getUTCHours() < 16 ? 'noon' : 'evening'}`;
const pick = process.argv.find((a) => /^ad\d+$/.test(a)) ?? process.env.AD;
if (!pick && state.ads_last_slot === slot) { console.log(`이번 시간(${slot})은 이미 올렸어요`); process.exit(0); }

const ads = JSON.parse(readFileSync(resolve(root, 'ads', 'ads.json'), 'utf8'));
const ad = pick ? ads.find((a) => a.id === pick) : ads.find((a) => !state.ads.includes(a.id));
if (!ad) { console.log(pick ? `없는 편: ${pick}` : '광고 영상 대기열이 비었어요'); process.exit(pick ? 1 : 0); }

const base = 'https://gimzimean.github.io/topnote-social/ads';
const capFile = join(tmpdir(), `${ad.id}-caption.txt`);
writeFileSync(capFile, ad.caption);
const comment = `${ad.question} 댓글로 알려 주세요 👇\n3분 통화 시작 → topnote.app/ig`;
console.log(`올릴 편: ${ad.id} (${ad.theme})`);
for (const u of [`${base}/${ad.id}.mp4`, `${base}/${ad.id}-cover.jpg`]) {
  const head = await fetch(u, { method: 'HEAD' });
  if (!head.ok) { console.error(`주소가 아직 안 열려요: ${u} (${head.status}) · 다음 시도에 올려요`); process.exit(1); }
}
let ok = true;
try {
  execFileSync('node', [resolve(root, 'scripts/reel.mjs'), `${base}/${ad.id}.mp4`, `${base}/${ad.id}-cover.jpg`, capFile, comment], { stdio: 'inherit' });
} catch { ok = false; }
// 일부만 실패해도 다시 올리면 릴스가 겹치므로 올린 것으로 남긴다(실패한 곳은 로그 보고 ONLY=스레드 등으로 다시 보냄).
if (!state.ads.includes(ad.id)) state.ads.push(ad.id);
state.ads_last_slot = slot;
writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
console.log('올림', ad.id, ok ? '' : '(일부 실패 · 위 로그 확인)');
if (!ok) process.exitCode = 1;
