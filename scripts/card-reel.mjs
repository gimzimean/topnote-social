// 카드뉴스를 음악 릴스(9:16 영상)로 만든다(2026-11-03 대표 「카드뉴스도 음악 릴스로」).
// 릴스 표지(docs/reels/<id>-cover.jpg, build.mjs) → 카드 2장째부터 끝까지, 장마다 2.5초 + 0.4초 겹쳐 넘기기.
// 음악: music/tracks.json 을 게시물 번호 순서로 돌려 쓰고, 곡마다 정한 지점(start)부터 페이드 인·아웃.
// 결과: docs/reels/<id>.mp4 (GitHub Pages). 이미 올린 게시물(인스타·스레드·틱톡 모두 올림)은 만들지 않는다.
// 실행: node scripts/card-reel.mjs [id …] [--force]
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const content = JSON.parse(readFileSync(resolve(root, 'content.json'), 'utf8'));
const state = JSON.parse(readFileSync(resolve(root, 'state.json'), 'utf8'));
const tracks = JSON.parse(readFileSync(resolve(root, 'music/tracks.json'), 'utf8'));
const args = process.argv.slice(2);
const force = args.includes('--force');
const ids = args.filter((a) => /^\d+$/.test(a));
const SLIDE = Number(process.env.SLIDE ?? 4.5), FADE = 0.4; // 2026-11-04 대표 「천천히」 → 기본 4.5초
const outDir = resolve(root, 'docs/reels');
mkdirSync(outDir, { recursive: true });

export const trackOf = (id) => tracks[Number(id) % tracks.length];
const posted = (id) => ['instagram', 'threads', 'tiktok'].every((k) => (state[k] ?? []).includes(id));

for (const post of content.posts) {
  const { id } = post;
  if (ids.length ? !ids.includes(id) : posted(id)) continue;
  const out = resolve(outDir, `${id}.mp4`);
  if (existsSync(out) && !force) continue;
  const cardDir = resolve(root, 'docs/posts', id);
  const cover = resolve(root, 'docs/reels', `${id}-cover.jpg`); // build.mjs 가 만든 릴스 표지
  if (!existsSync(cardDir) || !existsSync(cover)) { console.log(`${id}: 카드 이미지가 아직 없어요`); continue; }
  const cards = readdirSync(cardDir).filter((f) => f.endsWith('.jpg')).sort((a, b) => parseInt(a) - parseInt(b))
    .map((f) => resolve(cardDir, f)).slice(1); // 1.jpg 는 표지(세로 표지로 대신)
  const images = [cover, ...cards];
  const n = images.length;
  const total = SLIDE * n + FADE;
  const track = trackOf(id);
  const inputs = images.flatMap((p) => ['-loop', '1', '-framerate', '30', '-t', String(SLIDE + FADE), '-i', p]);
  inputs.push('-ss', String(track.start), '-t', String(total), '-i', resolve(root, 'music', track.file));
  const f = [];
  images.forEach((_, i) => {
    // 4:5 카드는 같은 카드를 흐리게 깔고 가운데에 둔다. 세로 표지는 그대로.
    f.push(`[${i}:v]split[a${i}][b${i}]`,
      `[a${i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:2,eq=brightness=-0.04[bg${i}]`,
      `[b${i}]scale=1080:1920:force_original_aspect_ratio=decrease[fg${i}]`,
      `[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1,fps=30[v${i}]`);
  });
  let last = 'v0';
  for (let i = 1; i < n; i++) {
    f.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${(SLIDE * i).toFixed(2)}[x${i}]`);
    last = `x${i}`;
  }
  f.push(`[${n}:a]volume=-3dB,afade=t=in:st=0:d=0.8,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5[a]`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', f.join(';'), '-map', `[${last}]`, '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-t', total.toFixed(2), '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log(`${id}: ${n}장 ${total.toFixed(1)}초 · ${track.title} ${track.start}s~ → docs/reels/${id}.mp4`);
}
