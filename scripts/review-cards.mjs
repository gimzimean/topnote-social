// 「지금 심사 중인 사람」 흐린 프로필 카드(2026-11-13 대표 승인 목업 C:\topnote-app\marketing\mockups\blurred-member-cards.html 의 「⏳ 심사 중」 칸).
// 실제 회원 사진은 절대 쓰지 않는다: 얼굴은 저장소의 AI 장면(ai-reels/faces)에서 성별만 맞춰 고르고 강하게 흐린다.
// 직업군·나이대는 공개 심사 일지 범위만(회사·학교·정확한 나이 없음).
// 사용: node scripts/review-cards.mjs <payload.json>
//   payload: { id, kicker, title, people: [심사 중 { g:'남'|'여', job, age, face:'ai-reels/faces/x.jpg', pos:'50% 30%' }], ok: [검증된 사람, 같은 모양] }
// 결과: docs/posts/<id>/1.jpg (피드 1080×1350) · docs/stories/<id>.jpg (1080×1920)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(existsSync(resolve(root, 'node_modules/playwright')) ? resolve(root, 'package.json') : 'C:/topnote-app/package.json');
const { chromium } = require('playwright');
const p = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const b64 = (f) => readFileSync(resolve(root, f)).toString('base64');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const font = `@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64('assets/fonts/SongMyung-Regular.ttf')})}`;

const ok = p.ok ?? [];
const cols = ok.length ? 4 : [2, 4].includes(p.people.length) ? 2 : 3; // 검증된 사람 칸이 있으면 한 줄 4장(목업처럼 두 칸)
const cw = Math.floor((948 - (cols - 1) * 20) / cols);
const card = (x, st = 'wait') => `<div class="pc ${st}"><div class="face"><i style="background-image:url(data:image/jpeg;base64,${b64(x.face)});background-position:${x.pos ?? '50% 34%'}"></i></div>
<div class="meta"><div class="job">${esc(x.job)}</div><div class="age">${esc(x.age)} · ${esc(x.g)}</div><div class="seals"><span class="seal">${st === 'ok' ? '검증 완료' : '서류 확인 중'}</span></div></div></div>`;

const html = (h, padTop) => `<!doctype html><html><head><meta charset="utf-8"><style>${font}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:${h}px;overflow:hidden;background:#14100D;color:#F5ECDD;font-family:'Malgun Gothic','Noto Sans CJK KR',sans-serif;padding:${padTop}px 66px;display:flex;flex-direction:column;justify-content:center}
.top{font-size:34px;color:#C9A86A;font-weight:800;letter-spacing:.08em}
h2{font-family:SongMyung;font-size:80px;line-height:1.2;margin:10px 0 22px;font-weight:400}
.sec{font-size:34px;font-weight:800;color:#E8C9A0;margin:0 0 20px}.sec span{color:#BFAF98;font-weight:600}
.grid{display:flex;flex-wrap:wrap;justify-content:${ok.length ? 'flex-start' : 'center'};gap:20px}
.pc{width:${cw}px;background:#221B16;border:3px solid #4A3F33;border-radius:28px;overflow:hidden;display:flex;flex-direction:column}
.face{position:relative;height:${ok.length ? 230 : 255}px;overflow:hidden;background:#2B231D}
.face i{position:absolute;inset:-12%;background-size:170% auto;filter:blur(17px) saturate(.9) brightness(.85)}
.meta{padding:${ok.length ? '14px 16px 18px' : '16px 22px 20px'}}
.sec.ok{color:#BFD8AE;margin-top:40px}.pc.ok .seal{background:#1F2A1E;color:#BFD8AE;border-color:#3C5536}
.job{font-size:${ok.length ? 31 : 40}px;font-weight:800;white-space:nowrap}
.age{font-size:${ok.length ? 25 : 30}px;color:#BFAF98;margin-top:6px}
.seals{margin-top:12px}
.seal{font-size:${ok.length ? 22 : 26}px;font-weight:800;padding:6px 16px;border-radius:40px;background:#3A2E18;color:#E8C9A0;border:2px solid #6B5530}
.foot{font-size:30px;color:#BFAF98;margin-top:24px;text-align:right}
</style></head><body>
<div class="top">${esc(p.kicker)}</div><h2>${esc(p.title).replace(/\n/g, '<br>')}</h2>
<div class="sec">⏳ 심사 중 <span>${p.people.length}명</span></div>
<div class="grid">${p.people.map((x) => card(x)).join('')}</div>
${ok.length ? `<div class="sec ok">✓ 검증된 사람 <span>${ok.length}명</span></div><div class="grid">${ok.map((x) => card(x, 'ok')).join('')}</div>` : ''}
<div class="foot">@topnote_official</div></body></html>`;

mkdirSync(resolve(root, 'docs/posts', p.id), { recursive: true });
mkdirSync(resolve(root, 'docs/stories'), { recursive: true });
const b = await chromium.launch();
for (const [h, pad, out] of [[1350, 60, `docs/posts/${p.id}/1.jpg`], [1920, 200, `docs/stories/${p.id}.jpg`]]) {
  const page = await b.newPage({ viewport: { width: 1080, height: h } });
  await page.setContent(html(h, pad));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(root, out), type: 'jpeg', quality: 90 });
  console.log('→', out);
}
await b.close();
