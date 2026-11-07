// 인스타 릴스 조회수 상위 형식 따라 만들기(2026-11-07 대표 「릴스 10만 터진 걸로 벤치마킹해서 업로드」).
// 사용: node scripts/bench-reel.mjs <설정.json>
// 설정: { id, title(위쪽 검정 상자, 줄바꿈 \n), clips:[{file, sub(가운데 자막)}], end:{line1, line2} }
// natural:true = 실제 인터뷰 릴스처럼 제목도 상자 없이 테두리 글씨(2026-11-07 대표 「완전 자연스럽게 진짜 같이」).
// 결과: docs/ai-reels/<id>.mp4 · <id>-cover.jpg (1080x1920, 클립 소리 그대로)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';

const cfg = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const root = resolve(import.meta.dirname, '..');
const tmp = resolve(root, 'ai-reels', 'bench-tmp', cfg.id);
mkdirSync(tmp, { recursive: true });
const FONT = 'C\\:/Windows/Fonts/malgunbd.ttf';
const txt = (name, s) => { const p = resolve(tmp, name); writeFileSync(p, s, 'utf8'); return p.replace(/\\/g, '/').replace(':', '\\:'); };
const ff = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

const titleFile = txt('title.txt', cfg.title);
const parts = [];
cfg.clips.forEach((c, i) => {
  const subFile = txt(`sub${i}.txt`, c.sub);
  const out = resolve(tmp, `p${i}.mp4`);
  const vf = [
    'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30',
    `drawtext=fontfile='${FONT}':textfile='${titleFile}':${cfg.natural ? 'fontsize=60:fontcolor=white:borderw=6:bordercolor=black@0.9' : 'fontsize=66:fontcolor=white:box=1:boxcolor=black@0.85:boxborderw=26'}:line_spacing=14:x=(w-text_w)/2:y=230`,
    `drawtext=fontfile='${FONT}':textfile='${subFile}':fontsize=58:fontcolor=white:borderw=5:bordercolor=black:line_spacing=12:x=(w-text_w)/2:y=h*0.62`,
  ].join(',');
  ff(['-i', c.file, '-vf', vf, '-af', 'aresample=44100,aformat=channel_layouts=stereo', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-ar', '44100', '-ac', '2', out]);
  parts.push(out);
});
// 끝 화면 2.5초
const e1 = txt('e1.txt', cfg.end.line1), e2 = txt('e2.txt', cfg.end.line2);
const endOut = resolve(tmp, 'end.mp4');
ff(['-f', 'lavfi', '-i', 'color=c=0x1A1512:s=1080x1920:d=2.5:r=30', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '2.5',
  '-vf', `drawtext=fontfile='${FONT}':textfile='${e1}':fontsize=76:fontcolor=0xF3ECE2:line_spacing=16:x=(w-text_w)/2:y=h*0.40,drawtext=fontfile='${FONT}':textfile='${e2}':fontsize=44:fontcolor=0xC9A27A:x=(w-text_w)/2:y=h*0.58`,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-shortest', endOut]);
parts.push(endOut);
const list = resolve(tmp, 'list.txt');
writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
const final = resolve(root, 'docs', 'ai-reels', `${cfg.id}.mp4`);
mkdirSync(dirname(final), { recursive: true });
ff(['-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', final]);
ff(['-ss', '1.2', '-i', parts[0], '-frames:v', '1', '-q:v', '3', resolve(root, 'docs', 'ai-reels', `${cfg.id}-cover.jpg`)]);
console.log(final);
