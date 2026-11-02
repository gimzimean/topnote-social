// 숏폼 대기열: shorts/epN.txt 중 아직 안 올린 첫 편을 하루 한 편 올린다(2026-11-02 「바이럴 계속」).
// 영상·표지는 docs/shorts/epN.mp4 · epN-cover.jpg (GitHub Pages). 올린 기록은 state.json 의 reels.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const statePath = resolve(root, 'state.json');
const state = JSON.parse(readFileSync(statePath, 'utf8'));
state.reels ??= [];
const today = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
if (state.reels_last_day === today && !process.argv.includes('--force') && !process.argv.some((a) => /^ep[0-9]+$/.test(a)) && !process.env.EP) { console.log('오늘은 이미 올렸어요'); process.exit(0); }
const eps = readdirSync(resolve(root, 'shorts')).filter((f) => /^ep\d+\.txt$/.test(f)).map((f) => f.slice(0, -4)).sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
// shorts/order.txt 가 있으면 그 순서가 먼저(나머지는 번호 순)
const orderFile = resolve(root, 'shorts', 'order.txt');
try { const ord = readFileSync(orderFile, 'utf8').split(/s+/).filter(Boolean); eps.sort((a, b) => ((ord.indexOf(a) + 1) || 999) - ((ord.indexOf(b) + 1) || 999) || Number(a.slice(2)) - Number(b.slice(2))); } catch {}
const pick = process.argv.find((a) => /^ep[0-9]+$/.test(a)) ?? process.env.EP;
const next = pick || eps.find((e) => !state.reels.includes(e));
if (!next) { console.log('대기열이 비었어요'); process.exit(0); }
const base = 'https://gimzimean.github.io/topnote-social/shorts';
const capFile = resolve(root, 'shorts', `${next}.txt`);
const cap = readFileSync(capFile, 'utf8');
const q = cap.split('👇')[1]?.split('댓글로')[0].trim() ?? '여러분은 어땠나요?';
const comment = `${q}\n댓글로 골라 주세요 👇\n먼저 3분 통화해 보고 싶다면 프로필 링크 👆`;
execFileSync('node', [resolve(root, 'scripts/reel.mjs'), `${base}/${next}.mp4`, `${base}/${next}-cover.jpg`, capFile, comment], { stdio: 'inherit' });
if (!state.reels.includes(next)) state.reels.push(next);
state.reels_last_day = today;
writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
console.log('올림', next);
