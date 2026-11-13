// 심사 일지 카드 릴스(2026-11-13 대표): 카드와 같은 흐린 실사(assets/stock)를 한 장씩 천천히 당기며 보여준다.
// 글자는 위쪽 칸에만(아래 알약 자막 없음), 심사 중 → 검증된 사람 → 끝 문구·링크. AI 표시 없음.
// 사용: node scripts/review-reel.mjs <카드 payload.json> [track.mp3]  → docs/ai-reels/<id>-reel.mp4 · <id>-reel-cover.jpg
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(existsSync(resolve(root, 'node_modules/playwright')) ? resolve(root, 'package.json') : 'C:/topnote-app/package.json');
const { chromium } = require('playwright');
const p = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const tracks = JSON.parse(readFileSync(resolve(root, 'music/tracks.json'), 'utf8'));
const track = tracks.find((t) => t.file === (process.argv[3] ?? 'last-message-first.mp3')) ?? tracks[0];
const b64 = (f) => readFileSync(resolve(root, f)).toString('base64');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const W = 1080, H = 1920, BW = 1242, BH = 2208, FPS = 30;
const tmp = resolve(tmpdir(), `review-reel-${p.id}`);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const font = `@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64('assets/fonts/SongMyung-Regular.ttf')})}`;
const css = `${font}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Malgun Gothic','Noto Sans CJK KR',sans-serif;overflow:hidden;background:transparent}`;

// 장면: 제목 → 심사 중 카드들 → 검증된 사람 → 끝
const mood = (x) => ({ img: x.face, pos: x.pos, size: x.size });
const scenes = [
  { d: 2.2, bg: mood(p.people[0]), html: `<div class="k">TOP NOTE · 심사 일지</div><div class="h">${esc(p.title)}</div>` },
  ...p.people.map((x, i) => ({ d: 2.1, bg: mood(x), html: `${i === 0 ? '' : ''}<div class="sec">⏳ 지금 심사 중인 사람</div><div><div class="job">${esc(x.job)}</div></div><div class="age">${esc(x.age)} · ${esc(x.g)}</div>` })),
  ...(p.ok ?? []).map((x) => ({ d: 2.4, bg: mood(x), html: `<div class="sec ok">✓ 검증된 사람</div><div><div class="job">${esc(x.job)}</div></div><div class="age">${esc(x.age)} · ${esc(x.g)}</div>` })),
  { d: 2.8, bg: null, html: `<div class="h small">검증을 통과한<br>사람만 들어와요.</div><div class="sub">목소리로 3분 먼저 · 탑노트</div><div class="link">topnote.app</div>` },
];

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: BW, height: BH } });
for (const [i, s] of scenes.entries()) {
  // 배경: 흐린 실사 + 필름 입자 + 위쪽 어둡게(글자 칸)
  const bgHtml = s.bg
    ? `<style>${css}body{width:${BW}px;height:${BH}px;background:#14100D;position:relative}
i{position:absolute;inset:-6%;background:url(data:image/jpeg;base64,${b64(s.bg.img)}) ${s.bg.pos ?? '50% 40%'}/${s.bg.size ? s.bg.size.replace(' auto', ' auto') : 'cover'} no-repeat;filter:blur(${p.reelBlur ?? 55}px) saturate(.85) brightness(.8)}
u{position:absolute;inset:0;opacity:.35;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
q{position:absolute;left:0;right:0;top:0;height:1150px;background:linear-gradient(180deg,rgba(20,16,13,.85) 0%,rgba(20,16,13,.55) 60%,rgba(20,16,13,0) 100%)}</style><i></i><u></u><q></q>`
    : `<style>${css}body{width:${BW}px;height:${BH}px;background:radial-gradient(circle at 50% 30%,#3A2A20,#14100D 70%)}</style>`;
  await page.setViewportSize({ width: BW, height: BH });
  await page.setContent(bgHtml);
  await page.screenshot({ path: resolve(tmp, `bg${i}.png`) });
  // 글자: 위쪽 칸(260~900px)만
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(`<style>${css}body{width:${W}px;height:${H}px;color:#F5ECDD;text-align:center;padding-top:300px}
.k{font-size:40px;letter-spacing:.1em;color:#C9A86A;font-weight:800}
.h{font-family:SongMyung;font-size:120px;line-height:1.2;margin-top:24px;text-shadow:0 4px 30px rgba(0,0,0,.5)}.h.small{font-size:104px}
.sec{font-size:46px;font-weight:800;color:#E8C9A0}.sec.ok{color:#BFD8AE}
.job{display:inline-block;font-size:150px;font-weight:800;line-height:1.15;margin-top:30px;white-space:nowrap;text-shadow:0 4px 30px rgba(0,0,0,.5)}
.age{font-size:70px;font-weight:700;color:#E9DCC6;margin-top:16px;text-shadow:0 4px 24px rgba(0,0,0,.5)}
.sub{font-size:48px;color:#E9DCC6;margin-top:40px}.link{font-size:58px;font-weight:800;color:#E9B44C;margin-top:30px}</style>${s.html}`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { for (const el of document.querySelectorAll('.job')) { let f = parseFloat(getComputedStyle(el).fontSize); while (el.offsetWidth > 960 && f > 60) { f -= 4; el.style.fontSize = f + 'px'; } } });
  await page.screenshot({ path: resolve(tmp, `tx${i}.png`), omitBackground: true });
}
await b.close();

// 장면마다: 배경을 천천히 당기기(번갈아 위/아래로 살짝) + 글자 살짝 나타나기
const parts = [];
for (const [i, s] of scenes.entries()) {
  const n = Math.round(s.d * FPS);
  const out = resolve(tmp, `s${i}.mp4`);
  const dy = i % 2 ? `(ih-ih/zoom)/2+20*on/${n}` : `(ih-ih/zoom)/2-20*on/${n}`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(tmp, `bg${i}.png`), '-loop', '1', '-t', String(s.d), '-i', resolve(tmp, `tx${i}.png`),
    '-filter_complex', `[0]zoompan=z='1+0.06*on/${n}':x='(iw-iw/zoom)/2':y='${dy}':d=${n}:s=${W}x${H}:fps=${FPS},trim=end_frame=${n}[bg];[1]format=rgba,fade=t=in:st=0:d=0.35:alpha=1,trim=duration=${s.d}[t];[bg][t]overlay=0:0:shortest=1,format=yuv420p[v]`,
    '-map', '[v]', '-frames:v', String(n), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', out]);
  parts.push(out);
}
const total = scenes.reduce((a, s) => a + s.d, 0);
const list = resolve(tmp, 'list.txt');
writeFileSync(list, parts.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
mkdirSync(resolve(root, 'docs/ai-reels'), { recursive: true });
const outMp4 = resolve(root, 'docs/ai-reels', `${p.id}-reel.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ss', String(track.start), '-t', String(total), '-i', resolve(root, 'music', track.file),
  '-filter_complex', `[1:a]afade=t=in:d=0.6,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outMp4]);
// 표지: 제목 장면 그대로
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.2', '-i', outMp4, '-frames:v', '1', '-q:v', '2', resolve(root, 'docs/ai-reels', `${p.id}-reel-cover.jpg`)]);
console.log(`${p.id}-reel: ${scenes.length}장면 ${total.toFixed(1)}초 · ${track.title} → docs/ai-reels/${p.id}-reel.mp4`);
