// 인스타 하이라이트 채우기 스토리(2026-11-07 대표 「하이라이트 다 채워줘」): AI 장면 한 컷(글자 없는 원본 클립) + 아래쪽 글.
// 얼굴을 안 가리게 글은 화면 아래(1180~1700)에만, (2026-11-13 대표: #AI연출 표시 안 함).
// 실행: node scripts/highlight-stories.mjs → docs/highlights/stories/<key>.jpg
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
const root = resolve(import.meta.dirname, '..');
const require = createRequire('C:/topnote-app/package.json');
const { chromium } = require('playwright');
const S = JSON.parse(readFileSync(resolve(root, 'docs/highlights/stories.json'), 'utf8'));
const b64 = (p) => readFileSync(p).toString('base64');
const font = `@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64(resolve(root, 'assets/fonts/SongMyung-Regular.ttf'))})}`;
const css = `${font}*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:'Malgun Gothic',sans-serif;background:#1A1512}
img{position:absolute;inset:0;width:1080px;height:1920px;object-fit:cover}
.g{position:absolute;left:0;right:0;bottom:0;height:1000px;background:linear-gradient(0deg,rgba(23,20,17,.94) 0%,rgba(23,20,17,.78) 45%,rgba(23,20,17,0) 100%)}
.box{position:absolute;left:80px;right:80px;bottom:250px}
.tag{display:inline-block;font-size:30px;font-weight:700;color:#1A1512;background:#E9B44C;padding:8px 22px;border-radius:99px;margin-bottom:30px}
.q{font-family:SongMyung;font-size:70px;line-height:1.3;color:#F3EBDD;word-break:keep-all;margin-bottom:26px}
.a{font-size:40px;line-height:1.55;color:#E8DCCB;word-break:keep-all;font-weight:600}.a em{font-style:normal;color:#E9B44C}
.src{font-size:26px;color:rgba(243,235,221,.6);margin-top:18px}
.ai{position:absolute;left:0;right:0;bottom:120px;text-align:center;font-size:24px;color:rgba(243,235,221,.55)}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
for (const s of S) {
  const fr = resolve(tmpdir(), `hl-${s.key}.jpg`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(s.at ?? 1.5), '-i', resolve(root, 'ai-reels/src', s.clip), '-frames:v', '1', '-q:v', '2', '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920', fr]);
  await page.setContent(`<style>${css}</style><img src="data:image/jpeg;base64,${b64(fr)}"><div class="g"></div><div class="box"><div class="tag">${s.tag}</div><div class="q">${s.q}</div><div class="a">${s.a}</div>${s.src ? `<div class="src">${s.src}</div>` : ''}</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(root, 'docs/highlights/stories', `${s.key}.jpg`), type: 'jpeg', quality: 90 });
  console.log(s.key);
}
await browser.close();
