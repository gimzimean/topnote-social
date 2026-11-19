// 길거리 인터뷰 릴스 대기열(2026-11-07 대표 「릴스 더 만들어서 계속 올려줘」): ai-reels/bench/queue.json 의 아직 안 올린 편 하나를
// 인스타 릴스 + 스레드 영상으로 올린다. 올린 기록은 state.json 의 bench_posted. 하루 1편(bench-reels.yml).
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const statePath = resolve(root, 'state.json');
const state = JSON.parse(readFileSync(statePath, 'utf8'));
state.bench_posted ??= ['bench-street1', 'bench-vs1', 'bench-street2', 'bench-women1'];
const kstDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
// 외부 예약이 점심·저녁 두 번 깨워도 피드에는 하루 한 편만 올린다.
if (state.bench_last_day === kstDay && !process.argv.includes('--force')) {
  console.log('오늘 인터뷰 릴스는 이미 올림', kstDay);
  process.exit(0);
}
const queue = JSON.parse(readFileSync(resolve(root, 'ai-reels/bench/queue.json'), 'utf8'));
const id = queue.find((q) => !state.bench_posted.includes(q));
if (!id) { console.log('대기열 비어 있음'); process.exit(0); }
execFileSync('node', [resolve(root, 'scripts/post-bench-reel.mjs'), id, resolve(root, 'ai-reels/bench', `${id}.json`), '--story', '--instagram-only'], { stdio: 'inherit' });
state.bench_posted.push(id);
state.bench_last_day = kstDay;
writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
console.log('올림', id);
