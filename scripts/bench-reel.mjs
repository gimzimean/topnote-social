// 인스타 릴스 조회수 상위 형식 따라 만들기(2026-11-07 대표 「릴스 10만 터진 걸로 벤치마킹해서 업로드」).
// 사용: node scripts/bench-reel.mjs <설정.json>
// 설정: { id, title(위쪽 검정 상자, 줄바꿈 \n), clips:[{file, sub(가운데 자막)}], end:{line1, line2} }
// natural:true = 실제 인터뷰 릴스처럼 제목도 상자 없이 테두리 글씨(2026-11-07 대표 「완전 자연스럽게 진짜 같이」).
// 결과: docs/ai-reels/<id>.mp4 · <id>-cover.jpg (1080x1920, 클립 소리 그대로)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';

const cfg = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const root = resolve(import.meta.dirname, '..');
const tmp = resolve(root, 'ai-reels', 'bench-tmp', cfg.id);
mkdirSync(tmp, { recursive: true });
const FONT = 'C\\:/Windows/Fonts/malgunbd.ttf';
const txt = (name, s) => { const p = resolve(tmp, name); writeFileSync(p, s, 'utf8'); return p.replace(/\\/g, '/').replace(':', '\\:'); };
// 2026-11-07 대표 「글자 잘린 거 양쪽 보완」: 줄 길이에 맞춰 글자 크기를 줄여 좌우 90px 안에 들게 하고, 줄마다 가운데 정렬.
const fit = (t, base, max = 900) => { const w = Math.max(...t.split(String.fromCharCode(10)).map((l) => [...l].reduce((a, c) => a + (c.charCodeAt(0) < 128 ? 0.56 : 1), 0))); return Math.min(base, Math.floor(max / w)); };
const ff = (args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

const titleFile = txt('title.txt', cfg.title);
const parts = [];
// 2026-11-08 tight:true(시험, 기본 끔 — 대표 「1위(street2)에서 확장, 이 우물을 파자」라 기본은 street2 편집 그대로): 실제 인터뷰 편집처럼
// ① 말 앞뒤 빈 시간을 잘라 바로 말하게 ② 자막은 말하는 동안 한 줄씩 바뀌게 ③ 짝수 번째는 살짝 당겨 찍은 듯(1.07배)
// ④ 폰 카메라처럼 옅은 입자 ⑤ 끝 화면은 검은 판 대신 마지막 장면을 흐리게 깔고 글자.
const span = (file) => {
  const err = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=n=-35dB:d=0.25', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const dur = Number((err.match(/Duration: (\d+):(\d+):([\d.]+)/) || []).slice(1).reduce((a, v, i) => a + Number(v) * [3600, 60, 1][i], 0)) || 5;
  const starts = [...err.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...err.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  let a = 0, b = dur;
  if (starts[0] !== undefined && starts[0] < 0.05 && ends[0] !== undefined) a = ends[0];
  const lastStart = starts[starts.length - 1];
  if (lastStart !== undefined && lastStart > a + 1 && (ends.length < starts.length || ends[ends.length - 1] > dur - 0.2)) b = lastStart;
  return { from: Math.max(0, a - 0.2), to: Math.min(dur, b + 0.3), talkFrom: a, talkTo: b };
};
cfg.clips.forEach((c, i) => {
  const out = resolve(tmp, `p${i}.mp4`);
  const title = `drawtext=fontfile='${FONT}':textfile='${titleFile}':${cfg.natural ? `fontsize=${fit(cfg.title, 60)}:fontcolor=white:borderw=6:bordercolor=black@0.9` : `fontsize=${fit(cfg.title, 66, 840)}:fontcolor=white:box=1:boxcolor=black@0.85:boxborderw=26`}:line_spacing=14:text_align=C:x=(w-text_w)/2:y=230`;
  if (!cfg.tight) {
    const subFile = txt(`sub${i}.txt`, c.sub);
    const vf = ['scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30', title,
      `drawtext=fontfile='${FONT}':textfile='${subFile}':fontsize=${fit(c.sub, 58)}:fontcolor=white:borderw=5:bordercolor=black:line_spacing=12:text_align=C:x=(w-text_w)/2:y=h*0.62`].join(',');
    ff(['-i', c.file, '-vf', vf, '-af', 'aresample=44100,aformat=channel_layouts=stereo', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-ar', '44100', '-ac', '2', out]);
    parts.push(out);
    return;
  }
  const sp = span(c.file);
  const len = sp.to - sp.from;
  const lines = c.sub.split(String.fromCharCode(10));
  const weights = lines.map((l) => [...l].length);
  const total = weights.reduce((a, b) => a + b, 0);
  const t0 = sp.talkFrom - sp.from, t1 = sp.talkTo - sp.from;
  let acc = 0;
  const subs = lines.map((l, k) => {
    const st = k === 0 ? 0 : t0 + (t1 - t0) * (acc / total);
    acc += weights[k];
    const en = k === lines.length - 1 ? len + 1 : t0 + (t1 - t0) * (acc / total);
    const f = txt(`sub${i}_${k}.txt`, l);
    return `drawtext=fontfile='${FONT}':textfile='${f}':fontsize=${fit(l, 62)}:fontcolor=white:borderw=5:bordercolor=black:x=(w-text_w)/2:y=h*0.64:enable='between(t,${st.toFixed(2)},${en.toFixed(2)})'`;
  });
  const zoom = i % 2 === 1 ? 'scale=iw*1.07:ih*1.07,crop=1080:1920,' : '';
  const vf = ['scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,' + zoom + 'setsar=1,fps=30', 'noise=alls=5:allf=t', title, ...subs].join(',');
  const af = `aresample=44100,aformat=channel_layouts=stereo,afade=t=in:d=0.05,afade=t=out:st=${(len - 0.08).toFixed(2)}:d=0.08`;
  ff(['-ss', sp.from.toFixed(2), '-t', len.toFixed(2), '-i', c.file, '-vf', vf, '-af', af, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-ar', '44100', '-ac', '2', out]);
  parts.push(out);
});
// 끝 화면 2.5초
const e1 = txt('e1.txt', cfg.end.line1), e2 = txt('e2.txt', cfg.end.line2);
const endOut = resolve(tmp, 'end.mp4');
if (cfg.tight) {
  const last = cfg.clips[cfg.clips.length - 1].file;
  const still = resolve(tmp, 'last.png');
  ff(['-sseof', '-0.3', '-i', last, '-frames:v', '1', still]);
  ff(['-loop', '1', '-t', '2.3', '-i', still, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '2.3',
    '-vf', `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,boxblur=24:2,eq=brightness=-0.28:saturation=0.7,fade=t=in:d=0.25,drawtext=fontfile='${FONT}':textfile='${e1}':fontsize=${fit(cfg.end.line1, 72)}:fontcolor=white:borderw=3:bordercolor=black@0.6:x=(w-text_w)/2:y=h*0.42,drawtext=fontfile='${FONT}':textfile='${e2}':fontsize=${fit(cfg.end.line2, 42)}:fontcolor=0xF1D9B5:x=(w-text_w)/2:y=h*0.53`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-shortest', endOut]);
} else ff(['-f', 'lavfi', '-i', 'color=c=0x1A1512:s=1080x1920:d=2.5:r=30', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '2.5',
  '-vf', `drawtext=fontfile='${FONT}':textfile='${e1}':fontsize=${fit(cfg.end.line1, 76)}:fontcolor=0xF3ECE2:line_spacing=16:x=(w-text_w)/2:y=h*0.40,drawtext=fontfile='${FONT}':textfile='${e2}':fontsize=${fit(cfg.end.line2, 44)}:fontcolor=0xC9A27A:x=(w-text_w)/2:y=h*0.58`,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-shortest', endOut]);
parts.push(endOut);
const list = resolve(tmp, 'list.txt');
writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
const final = resolve(root, 'docs', 'ai-reels', `${cfg.id}.mp4`);
mkdirSync(dirname(final), { recursive: true });
ff(['-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', final]);
ff(['-ss', '1.2', '-i', parts[0], '-frames:v', '1', '-q:v', '3', resolve(root, 'docs', 'ai-reels', `${cfg.id}-cover.jpg`)]);
console.log(final);
