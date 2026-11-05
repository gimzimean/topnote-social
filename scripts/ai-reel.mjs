// 사람 나오는 설렘 릴스(Kling AI 장면 + 실제 앱 화면 + 우리 문구·음악)를 만든다(2026-11-04 대표 「설레고 이 앱을 쓰고 싶게」).
// 규칙: 글자는 위쪽 한 칸에만(아래는 고정 「탑노트 · 지금 앱 받기」만), AI 장면엔 「AI로 만든 장면」 표시, 회원 후기처럼 쓰지 않는다.
// 실행: node scripts/ai-reel.mjs <spec.json>  → docs/ai-reels/<id>.mp4 · <id>-cover.jpg
// spec: { id, track, beats: [{ clip: 로컬 mp4, text } | { screen: 앱 캡처 png, text } | { end: 제목, sub }], cover: { from: beat 번호, at: 초, text } }
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(existsSync(resolve(root, 'node_modules/playwright')) ? resolve(root, 'package.json') : 'C:/topnote-app/package.json');
const { chromium } = require('playwright');
const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = resolve(root, 'docs/ai-reels');
mkdirSync(out, { recursive: true });
const tmp = resolve(tmpdir(), `ai-reel-${spec.id}`);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const b64 = (p) => readFileSync(p).toString('base64');
const font = `@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64(resolve(root, 'assets/fonts/SongMyung-Regular.ttf'))})}@font-face{font-family:'DM Serif Display';src:url(data:font/ttf;base64,${b64(resolve(root, 'assets/fonts/DMSerifDisplay-Regular.ttf'))})}`;
const W = 1080, H = 1920, CLIP = 5, STILL = 3.5, END = 3.5;

const base = `${font}*{margin:0;padding:0;box-sizing:border-box}body{width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:'Malgun Gothic','Noto Sans CJK KR',sans-serif}
.top{position:absolute;left:0;right:0;top:0;height:640px;padding:230px 80px 0;background:linear-gradient(180deg,rgba(23,20,17,.78) 0%,rgba(23,20,17,.45) 65%,rgba(23,20,17,0) 100%)}
.t{font-family:SongMyung;color:#F3EBDD;font-size:84px;line-height:1.28;word-break:keep-all;text-shadow:0 2px 18px rgba(0,0,0,.45)}.t em{font-style:normal;color:#E9B44C}
.ai{position:absolute;right:44px;top:150px;font-size:24px;color:rgba(243,235,221,.8);background:rgba(23,20,17,.45);padding:6px 14px;border-radius:99px}
.cta{position:absolute;left:0;right:0;bottom:210px;text-align:center;font-size:36px;font-weight:700;color:#F3EBDD;letter-spacing:.5px}.cta span{background:rgba(23,20,17,.62);border:1.5px solid rgba(233,180,76,.55);padding:16px 38px;border-radius:99px}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const shot = async (html, file, transparent = true) => {
  await page.setContent(`<style>${base}</style>${html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { for (const el of document.querySelectorAll('.t')) { el.style.whiteSpace = 'nowrap'; let s = parseFloat(getComputedStyle(el).fontSize); while (el.scrollWidth > el.clientWidth + 1 && s > 40) { s -= 2; el.style.fontSize = s + 'px'; } } }); // 글자 안 깨지게: 줄은 <br>에서만 바꾸고, 길면 글자를 줄인다(2026-11-04 대표)
  await page.screenshot({ path: file, omitBackground: transparent });
};
const CTA = '<div class="cta"><span>탑노트 · 지금 앱 받기</span></div>';

// 4인 수다: { grid: [클립 4개], text } → 2×2 한 화면(ai-reels/src/<id>-grid<i>.mp4)으로 합쳐 일반 클립처럼 쓴다(2026-11-04 대표 「4명 동시에 나오는 화면」).
for (const [i, b] of spec.beats.entries()) {
  if (!b.grid) continue;
  const g = resolve(root, 'ai-reels/src', `${spec.id}-grid${i}.mp4`);
  const cell = `scale=${W / 2}:${H / 2}:force_original_aspect_ratio=increase,crop=${W / 2}:${H / 2},fps=30,trim=0:${CLIP},setpts=PTS-STARTPTS`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...b.grid.flatMap((p) => ['-i', p]), '-filter_complex',
    `[0:v]${cell}[a];[1:v]${cell}[b];[2:v]${cell}[c];[3:v]${cell}[d];[a][b][c][d]xstack=inputs=4:layout=0_0|540_0|0_1140|540_1140:fill=0x171411,drawbox=x=537:y=0:w=6:h=1920:color=0x171411:t=fill[o]`,
    '-map', '[o]', '-t', String(CLIP), '-an', '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', g]);
  b.clip = g;
}
// 1:1 남녀 나란히: { pair: [왼쪽 남, 오른쪽 여], text } → 좌우 반씩 한 화면(2026-11-05 대표 「다른 성별 통화는 항상 남녀가 나란히」).
for (const [i, b] of spec.beats.entries()) {
  if (!b.pair) continue;
  const g = resolve(root, 'ai-reels/src', `${spec.id}-pair${i}.mp4`);
  // layout tb: 위 남·아래 여로 쌓아 꽉 채움 · lr: 좌우 나란히, 위아래는 블러 대신 앱 통화 화면처럼 짙은 갈색(2026-11-05 대표)
  const tb = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},crop=${W}:${H / 2}:0:400,fps=30,trim=0:${CLIP},setpts=PTS-STARTPTS`;
  const lr = `scale=${W / 2}:-2,fps=30,trim=0:${CLIP},setpts=PTS-STARTPTS`;
  const graph = b.layout === 'lr'
    ? `[0:v]${lr}[l];[1:v]${lr}[r];[l][r]hstack=inputs=2,pad=${W}:${H}:0:560:color=0x171411,drawbox=x=538:y=560:w=4:h=960:color=0x171411:t=fill,drawbox=x=0:y=556:w=${W}:h=4:color=0xE9B44C@0.5:t=fill,drawbox=x=0:y=1520:w=${W}:h=4:color=0xE9B44C@0.5:t=fill[o]`
    : `[0:v]${tb}[t];[1:v]${tb}[d];[t][d]vstack=inputs=2,drawbox=x=0:y=958:w=${W}:h=4:color=0x171411:t=fill[o]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...b.pair.flatMap((p) => ['-i', p]), '-filter_complex', graph,
    '-map', '[o]', '-t', String(CLIP), '-an', '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', g]);
  b.clip = g;
}
const parts = [];
for (const [i, b] of spec.beats.entries()) {
  const seg = resolve(tmp, `seg${i}.mp4`);
  if (b.clip) {
    const ov = resolve(tmp, `ov${i}.png`);
    await shot(b.grid ? `<div style="position:absolute;left:0;right:0;top:780px;height:360px;display:flex;align-items:center;justify-content:center;text-align:center"><div class="t" style="font-size:76px">${b.text}</div></div><div class="ai" style="top:800px">AI로 만든 장면</div>` : `<div class="top"><div class="t">${b.text}</div></div><div class="ai">AI로 만든 장면</div>${CTA}`, ov);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', b.clip, '-loop', '1', '-i', ov, '-filter_complex',
      `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,trim=0:${CLIP},setpts=PTS-STARTPTS[v];[v][1:v]overlay=0:0,format=yuv420p,setsar=1[o]`,
      '-map', '[o]', '-t', String(CLIP), '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', seg]);
  } else {
    const png = resolve(tmp, `st${i}.png`);
    const inner = b.screen
      ? `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 70%,#3a1f20 0%,#171411 70%)"></div>
         <div style="position:absolute;left:50%;top:500px;transform:translateX(-50%);width:500px;height:1082px;border-radius:56px;border:12px solid #2b2522;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6)"><img src="data:image/png;base64,${b64(b.screen)}" style="width:100%;height:100%;object-fit:cover"></div>
         <div class="top" style="background:none"><div class="t">${b.text}</div></div>${CTA}`
      : `<div style="position:absolute;inset:0;background:linear-gradient(160deg,#4a1f22 0%,#171411 75%)"></div>
         <div style="position:absolute;left:80px;right:80px;top:640px"><div class="t" style="font-size:104px">${b.end}</div><div style="margin-top:56px;font-size:46px;color:#E7D2C4;line-height:1.6">${b.sub}</div></div>
         <div style="position:absolute;left:80px;top:230px;font-family:'DM Serif Display',serif;font-size:72px;color:#F3EBDD">T<span style="color:#B85F45">.</span></div>${CTA}`;
    await shot(inner, png, false);
    const dur = b.end ? END : STILL;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-i', png, '-vf',
      `fps=30,format=yuv420p,setsar=1`,
      '-t', String(dur), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', seg]);
  }
  parts.push(seg);
}

// 앱 화면·끝 카드는 확대 효과 없이 멈춘 화면(확대하면 떨려 보였다, 2026-11-04 대표). 앱 화면은 폰을 줄여 아래 「지금 앱 받기」와 안 겹치게, 알약은 어두운 반투명 + 금색 테두리.
// 이어 붙이기(장면 사이 0.35초 디졸브) + 음악
const durs = spec.beats.map((b) => (b.clip ? CLIP : b.end ? END : STILL));
const F = 0.35;
let chain = '', last = '[0:v]', off = 0;
for (let i = 1; i < parts.length; i++) {
  off += durs[i - 1] - F;
  chain += `${last}[${i}:v]xfade=transition=fade:duration=${F}:offset=${off.toFixed(2)}[x${i}];`;
  last = `[x${i}]`;
}
const total = durs.reduce((a, b) => a + b, 0) - F * (parts.length - 1);
const tracks = JSON.parse(readFileSync(resolve(root, 'music/tracks.json'), 'utf8'));
const track = tracks.find((t) => t.file === spec.track) ?? tracks[0];
const mp4 = resolve(out, `${spec.id}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...parts.flatMap((p) => ['-i', p]), '-ss', String(track.start), '-t', String(total), '-i', resolve(root, 'music', track.file),
  '-filter_complex', `${chain}[${parts.length}:a]afade=t=in:d=0.8,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5[a]`,
  '-map', last, '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', mp4]);

// 릴스 표지: 지정한 장면의 한 프레임 + 훅 문구
const c = spec.cover;
const frame = resolve(tmp, 'frame.jpg');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(c.at), '-i', spec.beats[c.from].clip ?? parts[c.from], '-frames:v', '1', '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`, frame]); // 글자 없는 원본에서
await shot(`<img src="data:image/jpeg;base64,${b64(frame)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  ${spec.beats[c.from].grid ? `<div style="position:absolute;left:0;right:0;top:780px;height:360px;display:flex;align-items:center;justify-content:center;text-align:center"><div class="t" style="font-size:84px;line-height:1.2">${c.text}</div></div>
  ` : `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,20,17,.15) 0%,rgba(23,20,17,.55) 45%,rgba(23,20,17,.85) 100%)"></div>
  <div style="position:absolute;left:80px;right:80px;top:${c.top ?? 1180}px"><div class="t" style="font-size:132px;line-height:1.18">${c.text}</div></div>
  `}<div class="ai">AI로 만든 장면</div>`, resolve(tmp, 'cover.png'), false);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(tmp, 'cover.png'), '-q:v', '2', resolve(out, `${spec.id}-cover.jpg`)]);
await browser.close();
console.log(`${spec.id}: ${parts.length}장면 ${total.toFixed(1)}초 · ${track.title} → docs/ai-reels/${spec.id}.mp4`);
