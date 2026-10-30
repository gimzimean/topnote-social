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

const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1350px;overflow:hidden;font-family:'Malgun Gothic',sans-serif;-webkit-font-smoothing:antialiased}
.page{position:relative;width:1080px;height:1350px;padding:110px 90px;display:flex;flex-direction:column}
.cover{background:radial-gradient(circle at 70% 25%,#3a3a3a 0%,#111 60%,#000 100%);color:#fff;justify-content:flex-end}
.cover .tag{font-size:30px;letter-spacing:4px;color:${c.accent};font-weight:700}
.cover h1{font-size:100px;line-height:1.22;font-weight:800;margin-top:28px;word-break:keep-all;letter-spacing:-2px}
.cover .sub{font-size:36px;color:#bbb;margin-top:36px}
.white{background:#fff;color:#111}
.num{font-size:28px;font-weight:700;color:${c.accent};letter-spacing:3px}
h2{font-size:72px;line-height:1.3;font-weight:800;margin-top:24px;word-break:keep-all;letter-spacing:-1.5px}
p{font-size:40px;line-height:1.65;margin-top:56px;color:#333;word-break:keep-all}
.list{margin-top:56px;display:flex;flex-direction:column;gap:40px}
.list div{font-size:44px;font-weight:700;border-top:2px solid #eee;padding-top:32px}
.list span{display:block;font-size:34px;font-weight:400;color:#666;margin-top:12px}
.foot{margin-top:auto;display:flex;justify-content:space-between;font-size:26px;color:#999;letter-spacing:1px}
.cover .foot{margin-top:80px;color:#777}
.end{background:#111;color:#fff;justify-content:center;align-items:center;text-align:center}
.end h2{font-size:80px}
.end p{color:#bbb}
.end .btn{margin-top:70px;border:3px solid ${c.accent};color:#fff;border-radius:999px;padding:24px 60px;font-size:38px;font-weight:700}
`;

const pagesOf = (post) => {
  const foot = `<div class="foot"><span>${c.name}</span><span>${c.handle}</span></div>`;
  const body = (b) => Array.isArray(b)
    ? `<div class="list">${b.map(([t, s]) => `<div>${t}<span>${s}</span></div>`).join('')}</div>`
    : `<p>${b}</p>`;
  const end = post.end ?? c.end;
  return [
    `<div class="page cover"><div class="tag">${post.tag ?? c.tag}</div><h1>${post.cover[0]}</h1><div class="sub">${post.cover[1]}</div>${foot}</div>`,
    ...post.slides.map(([t, b], i) => `<div class="page white"><div class="num">${String(i + 1).padStart(2, '0')}</div><h2>${t}</h2>${body(b)}${foot}</div>`),
    `<div class="page end"><h2>${end[0]}</h2><p>${end[1]}</p><div class="btn">팔로우 ${c.handle}</div></div>`,
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
    await page.screenshot({ path: resolve(out, `${i + 1}.jpg`), type: 'jpeg', quality: 92 });
  }
  console.log(post.id, post.title);
}
await browser.close();
