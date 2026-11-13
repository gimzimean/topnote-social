// assets/stock 사진마다 얼굴 위치·크기를 한 번 재서 sources.json 에 적는다(카드가 얼굴을 칸 가운데로 맞추는 데 씀). 2026-11-13
// 사용: node scripts/stock-faces.mjs   (이미 잰 사진은 건너뜀, --all 이면 다시)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { faceBoxes } from './face-boxes.mjs';
const root = resolve(import.meta.dirname, '..');
const file = resolve(root, 'assets/stock/sources.json');
const d = JSON.parse(readFileSync(file, 'utf8'));
for (const [name, v] of Object.entries(d.photos)) {
  if (v.shot?.startsWith('(옛)') || (v.face && !process.argv.includes('--all'))) continue;
  const path = resolve(root, 'assets/stock', name);
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path]).toString().trim().split(',').map(Number);
  const boxes = await faceBoxes(readFileSync(path), w, h);
  const f = boxes.sort((a, b) => (b.right - b.left) - (a.right - a.left))[0];
  v.w = w; v.h = h;
  if (f) v.face = { x: +((f.left + f.right) / 2 / w).toFixed(3), y: +((f.top + f.bottom) / 2 / h).toFixed(3), fw: +((f.right - f.left) / w).toFixed(3) };
  console.log(name, v.face ?? '얼굴 못 찾음');
}
writeFileSync(file, JSON.stringify(d, null, 1) + '\n');
