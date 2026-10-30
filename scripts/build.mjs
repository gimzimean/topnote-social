// content.json의 게시물을 docs/posts/<id>/1.jpg … 로 만든다(인스타는 JPEG만 받음).
// 실행(로컬): node scripts/build.mjs        → 아직 없는 게시물만
//             node scripts/build.mjs all    → 전부 다시
// playwright는 C:\topnote-app 에 설치된 것을 빌려 쓴다.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire('C:/topnote-app/package.json');
const { chromium } = require('playwright');

const root = resolve(import.meta.dirname, '..');
const c = JSON.parse(readFileSync(resolve(root, 'content.json'), 'utf8'));

// 탑노트 인스타(@topnote_official) 기존 게시물과 같은 디자인: 크림·짙은 와인, 송명 제목, 「T.」
const b64 = (p) => readFileSync(p).toString('base64');
const css = `
@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64('C:/topnote-app/assets/fonts/SongMyung-Regular.ttf')})}
@font-face{font-family:DMSerif;src:url(data:font/ttf;base64,${b64('C:/topnote-app/assets/fonts/DMSerifDisplay-Regular.ttf')})}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;font-family:'Malgun Gothic',sans-serif;-webkit-font-smoothing:antialiased}
.page{position:relative;width:1080px;height:1350px;padding:110px 96px;display:flex;flex-direction:column}
.dark{background:linear-gradient(150deg,#4a1f22 0%,#2a1a19 55%,#171411 100%);color:#F2ECE1}
.light{background:#F2ECE1;color:#171411}
.mark{font-family:DMSerif;font-size:64px;line-height:1;color:#2A241F}
.mark i{font-style:normal;color:#BA5F48}
.dark .mark{color:#F2ECE1}
.kicker{font-size:30px;letter-spacing:6px;font-weight:700;color:#9B5B44;margin-top:72px}
.dark .kicker{color:#C9A56C}
.cover .kicker{margin-top:auto}
h1{font-family:SongMyung;font-weight:400;font-size:96px;line-height:1.28;margin-top:28px;word-break:keep-all}
h2{font-family:SongMyung;font-weight:400;font-size:80px;line-height:1.3;margin-top:24px;word-break:keep-all}
p{font-size:38px;line-height:1.65;margin-top:48px;color:#746B63;word-break:keep-all}
.dark p{color:#D8BDB0}
.list{margin-top:56px;display:flex;flex-direction:column;gap:36px}
.list div{font-size:42px;font-weight:700;border-top:1px solid #E1D7C8;padding-top:32px}
.list span{display:block;font-size:32px;font-weight:400;color:#746B63;margin-top:10px}
.foot{margin-top:auto;display:flex;justify-content:space-between;font-size:26px;letter-spacing:4px;color:#746B63}
.dark .foot{color:#B3A79D}
.cover .foot{margin-top:72px}
.end{justify-content:center}
.end .btn{margin-top:64px;align-self:flex-start;border:2px solid #C9A56C;color:#F2ECE1;border-radius:999px;padding:20px 48px;font-size:34px}
`;

const pagesOf = (post) => {
  const mark = '<div class="mark">T<i>.</i></div>';
  const foot = `<div class="foot"><span>${c.name}</span><span>${c.handle}</span></div>`;
  const body = (b) => Array.isArray(b)
    ? `<div class="list">${b.map(([t, s]) => `<div>${t}<span>${s}</span></div>`).join('')}</div>`
    : `<p>${b}</p>`;
  const end = post.end ?? c.end;
  return [
    `<div class="page dark cover">${mark}<div class="kicker">${post.tag ?? c.tag}</div><h1>${post.cover[0]}</h1><p>${post.cover[1]}</p>${foot}</div>`,
    ...post.slides.map(([t, b], i) => `<div class="page light">${mark}<div class="kicker">${String(i + 1).padStart(2, '0')}</div><h2>${t}</h2>${body(b)}${foot}</div>`),
    `<div class="page dark">${mark}<div class="end page" style="padding:0;height:auto;flex:1"><h2>${end[0]}</h2><p>${end[1]}</p><div class="btn">팔로우 ${c.handle}</div></div>${foot}</div>`,
  ];
};

const all = process.argv[2] === 'all';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
for (const post of c.posts) {
  const out = resolve(root, 'docs/posts', post.id);
  if (!all && existsSync(resolve(out, '1.jpg'))) continue;
  mkdirSync(out, { recursive: true });
  for (const [i, html] of pagesOf(post).entries()) {
    await page.setContent(`<html><head><style>${css}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(out, `${i + 1}.jpg`), type: 'jpeg', quality: 92 });
  }
  console.log(post.id, post.title);
}
await browser.close();
