// 릴스 표지만 다시 만든다(영상은 그대로): node scripts/ai-cover.mjs <spec.json>...
// 표지 글자는 얼굴을 가리지 않게 기본 아래쪽(top 1180), 스펙 cover.top 으로 바꿀 수 있다(2026-11-04).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(existsSync(resolve(root, 'node_modules/playwright')) ? resolve(root, 'package.json') : 'C:/topnote-app/package.json');
const { chromium } = require('playwright');
const b64 = (p) => readFileSync(p).toString('base64');
const font = `@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64(resolve(root, 'assets/fonts/SongMyung-Regular.ttf'))})}`;
const W = 1080, H = 1920;
const css = `${font}*{margin:0;padding:0;box-sizing:border-box}body{width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:'Malgun Gothic',sans-serif}
.t{font-family:SongMyung;color:#F3EBDD;word-break:keep-all;text-shadow:0 2px 18px rgba(0,0,0,.45)}.t em{font-style:normal;color:#E9B44C}
.ai{position:absolute;right:44px;top:150px;font-size:24px;color:rgba(243,235,221,.8);background:rgba(23,20,17,.45);padding:6px 14px;border-radius:99px}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const file of process.argv.slice(2)) {
  const spec = JSON.parse(readFileSync(file, 'utf8'));
  const c = spec.cover;
  const tmp = resolve(tmpdir(), `ai-cover-${spec.id}`); mkdirSync(tmp, { recursive: true });
  const frame = resolve(tmp, 'frame.jpg');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(c.at), '-i', (spec.beats[c.from].clip ?? resolve(root, "ai-reels/src", `${spec.id}-grid${c.from}.mp4`)), '-frames:v', '1', '-vf', `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`, frame]);
  await page.setContent(`<style>${css}</style><img src="data:image/jpeg;base64,${b64(frame)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  ${spec.beats[c.from].grid ? `<div style="position:absolute;left:0;right:0;top:780px;height:360px;display:flex;align-items:center;justify-content:center;text-align:center"><div class="t" style="font-size:84px;line-height:1.2">${c.text}</div></div>
  ` : `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,20,17,.15) 0%,rgba(23,20,17,.55) 45%,rgba(23,20,17,.85) 100%)"></div>
  <div style="position:absolute;left:80px;right:80px;top:${c.top ?? 1180}px"><div class="t" style="font-size:132px;line-height:1.18">${c.text}</div></div>
  `}<div class="ai">AI로 만든 장면</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { for (const el of document.querySelectorAll('.t')) { el.style.whiteSpace = 'nowrap'; let s = parseFloat(getComputedStyle(el).fontSize); while (el.scrollWidth > el.clientWidth + 1 && s > 40) { s -= 2; el.style.fontSize = s + 'px'; } } }); // 글자 안 깨지게: 줄은 <br>에서만 바꾸고, 길면 글자를 줄인다(2026-11-04 대표)
  await page.screenshot({ path: resolve(tmp, 'cover.png') });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(tmp, 'cover.png'), '-q:v', '2', resolve(root, 'docs/ai-reels', `${spec.id}-cover.jpg`)]);
  console.log('표지', spec.id);
}
await browser.close();
