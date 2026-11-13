// 심사 일지 흐린 프로필 카드(2026-11-13 대표).
// - 실제 회원 사진은 절대 쓰지 않는다. 무료 실사(assets/stock, 출처·성별·포즈는 sources.json)를 강하게 흐리고 필름 입자를 얹는다. AI 표시 없음.
// - 「남」/「여」로 나누고, 그 안에서 심사 중 → 검증된 사람 순서. 카드엔 큰 직업 + 「나이대 · 성별」만(칩·날짜 없음).
// - 포즈 규칙(대표 「남녀 포즈 다 다르게」 · 「얼굴이 보이는 자연스러운 일상 사진, 과하거나 모델 같은 포즈 금지」):
//   POSES 는 친구가 폰으로 찍어 준 듯한 얼굴 보이는 일상 컷만. 한 장 안에서 포즈가 겹치면 멈춘다(남녀 사이도). 포즈·사진을 비워 두면
//   최근 2번 게시(ai-reels/review-history.json)에 쓴 포즈·사진을 피해서 자동으로 고른다.
// 사용: node scripts/review-cards.mjs <payload.json>
//   payload: { id, kicker, title, endLine?, people: [심사 중 { g, job, age, shot?, face? }], ok: [검증된 사람, 같은 모양] }
// 결과: docs/posts/<id>/1.jpg(피드 1080×1350) · docs/stories/<id>.jpg(1080×1920) · docs/ai-reels/<id>-end.jpg(릴스 마지막 화면)
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const POSES = ['옆모습', '휴대폰 보는', '길에서 웃는 반신', '창가 반신', '어깨 너머 돌아보기', '가벼운 셀카', '커피 들고 웃는', '밤거리에 서서', '카페에 앉은', '걷다가 찍힌'];

const root = resolve(import.meta.dirname, '..');
const require = createRequire(existsSync(resolve(root, 'node_modules/playwright')) ? resolve(root, 'package.json') : 'C:/topnote-app/package.json');
const { chromium } = require('playwright');
const payloadPath = process.argv[2];
const p = JSON.parse(readFileSync(payloadPath, 'utf8'));
const b64 = (f) => readFileSync(resolve(root, f)).toString('base64');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const font = `@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64('assets/fonts/SongMyung-Regular.ttf')})}`;

// ── 포즈·사진 고르기 ──
const lib = JSON.parse(readFileSync(resolve(root, 'assets/stock/sources.json'), 'utf8')).photos;
const histPath = resolve(root, 'ai-reels/review-history.json');
const hist = existsSync(histPath) ? JSON.parse(readFileSync(histPath, 'utf8')) : [];
const recent = hist.filter((h) => h.id !== p.id).slice(-2);
const recentShots = new Set(recent.flatMap((h) => h.shots));
const recentPhotos = new Set(recent.flatMap((h) => h.photos));
const all = [...p.people.map((x) => ({ ...x, st: 'wait' })), ...(p.ok ?? []).map((x) => ({ ...x, st: 'ok' }))];
const used = new Set();
for (const x of all) {
  if (x.shot && !POSES.includes(x.shot)) throw new Error(`모르는 포즈: ${x.shot} (POSES 중에서)`);
  if (x.face && !x.shot) x.shot = lib[x.face.split('/').pop()]?.shot;
  if (x.shot) { if (used.has(x.shot)) throw new Error(`포즈가 겹쳐요: ${x.shot} — 한 장 안에서는 모두 달라야 해요`); used.add(x.shot); }
}
const photosFor = (g, shot) => Object.entries(lib).filter(([, v]) => v.g === g && v.shot === shot).map(([k]) => k);
for (const x of all) {
  if (!x.shot) {
    const cand = POSES.filter((s) => !used.has(s) && photosFor(x.g, s).length);
    const fresh = cand.filter((s) => !recentShots.has(s));
    x.shot = (fresh.length ? fresh : cand)[0];
    if (!x.shot) throw new Error(`${x.g} 사진이 모자라요 — assets/stock 에 더 넣어 주세요`);
    used.add(x.shot);
  }
  if (!x.face) {
    const ph = photosFor(x.g, x.shot);
    const f = ph.find((k) => !recentPhotos.has(k)) ?? ph[0];
    if (!f) throw new Error(`${x.g} · ${x.shot} 사진이 없어요`);
    x.face = `assets/stock/${f}`;
  }
  const meta = lib[x.face.split('/').pop()] ?? {};
  x.pos ??= meta.pos; x.size ??= meta.size;
  if (recentShots.has(x.shot)) console.log(`  ⚠ ${x.job}: 「${x.shot}」는 최근 게시에도 썼어요`);
}
hist.splice(0, hist.length, ...hist.filter((h) => h.id !== p.id), { id: p.id, shots: all.map((x) => x.shot), photos: all.map((x) => x.face.split('/').pop()) });
writeFileSync(histPath, JSON.stringify(hist.slice(-20), null, 1) + '\n');
console.log(all.map((x) => `${x.g} ${x.job}: ${x.shot}`).join(' · '));

// ── 그리기 ──
// 순서: ⏳ 심사 중 → ✓ 검증된 사람(0~8명, 없으면 칸 없음). 칸마다 남 | 여 를 한 줄에 나란히(한 줄 최대 5장, 넘치면 다음 줄).
const sections = [['wait', '⏳ 심사 중'], ['ok', '✓ 검증된 사람']].map(([st, label]) => ({ st, label, groups: ['남', '여'].map((g) => ({ g, list: all.filter((x) => x.st === st && x.g === g) })).filter((x) => x.list.length) })).filter((x) => x.groups.length);
const perRow = Math.min(5, Math.max(3, ...sections.map((x) => x.groups.reduce((a, g) => a + g.list.length, 0))));
const GAP = 16, DIV = 34; // 카드 사이, 남|여 사이
const cw = Math.floor((948 - (perRow - 1) * GAP - DIV) / perRow);
const big = cw >= 230;
// 얼굴이 칸 가운데(위쪽 40%)에 오게, 얼굴 폭이 칸 폭의 약 1/3이 되게 확대(sources.json 의 face 값, scripts/stock-faces.mjs).
const frame = (x, boxW, boxH) => {
  const m = lib[x.face.split('/').pop()] ?? {};
  if (!m.face || !m.w) return `background-position:${x.pos ?? '50% 40%'};background-size:${x.size ?? 'cover'}`;
  const iw = boxW * 1.24, ih = boxH * 1.24; // inset -12%
  let sc = (0.34 * boxW) / (m.face.fw * m.w);
  sc = Math.max(sc, iw / m.w, ih / m.h);
  const bw = m.w * sc, bh = m.h * sc;
  const px = Math.min(0, Math.max(iw - bw, iw / 2 - m.face.x * bw));
  const py = Math.min(0, Math.max(ih - bh, ih * 0.42 - m.face.y * bh));
  return `background-size:${bw.toFixed(0)}px ${bh.toFixed(0)}px;background-position:${px.toFixed(0)}px ${py.toFixed(0)}px`;
};
const card = (x, faceH) => `<div class="pc ${x.st}"><div class="face" style="height:${faceH}px"><i style="background-image:url(data:image/jpeg;base64,${b64(x.face)});${frame(x, cw, faceH)}"></i><s></s></div>
<div class="meta"><div class="job">${esc(x.job)}</div><div class="age">${esc(x.age)} · ${esc(x.g)}</div></div></div>`;
const body = (faceH) => sections.map((sec) => `<div class="sec ${sec.st}">${sec.label} <span>${sec.groups.reduce((a, g) => a + g.list.length, 0)}명</span></div>
<div class="row">${sec.groups.map((gr) => `<div class="gg"><div class="gl">${gr.g}</div><div class="cards">${gr.list.map((x) => card(x, faceH)).join('')}</div></div>`).join('<div class="dv"></div>')}</div>`).join('');
const html = (h, pad, faceH, head) => `<!doctype html><html><head><meta charset="utf-8"><style>${font}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:${h}px;overflow:hidden;background:#14100D;color:#F5ECDD;font-family:'Malgun Gothic','Noto Sans CJK KR',sans-serif;padding:${pad}px 66px;display:flex;flex-direction:column;justify-content:center}
.top{font-size:32px;color:#C9A86A;font-weight:800;letter-spacing:.08em}
h2{font-family:SongMyung;font-size:76px;line-height:1.2;margin:8px 0 14px;font-weight:400}
h2.end{font-size:70px}.sub{font-size:34px;color:#E9DCC6;margin:-4px 0 16px}.sub b{color:#E9B44C}
.sec{font-size:36px;font-weight:800;color:#E8C9A0;margin:14px 0 10px}.sec span{color:#BFAF98;font-weight:600;font-size:30px}.sec.ok{color:#BFD8AE}
.row{display:flex;flex-wrap:wrap;align-items:flex-start;row-gap:14px}
.gg{display:flex;flex-direction:column}.gl{font-family:SongMyung;font-size:44px;color:#C9A86A;line-height:1;margin:0 0 10px 4px}
.cards{display:flex;flex-wrap:wrap;gap:${GAP}px;max-width:948px}
.dv{width:2px;align-self:stretch;background:#4A3F33;margin:54px ${(DIV - 2) / 2}px 0}
.pc{width:${cw}px;background:#221B16;border:3px solid #4A3F33;border-radius:24px;overflow:hidden;display:flex;flex-direction:column}
.pc.ok{border-color:#3C5536}
.face{position:relative;overflow:hidden;background:#2B231D}
.face i{position:absolute;inset:-12%;background-repeat:no-repeat;filter:blur(${p.blur ?? 12}px) saturate(.85) brightness(.88)}
.face s{position:absolute;inset:0;opacity:.35;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.meta{padding:12px ${big ? 18 : 12}px 16px}
.job{font-size:${big ? 46 : 36}px;font-weight:800;line-height:1.12;word-break:keep-all}
.age{font-size:${big ? 30 : 23}px;color:#E9DCC6;margin-top:6px;font-weight:700;white-space:nowrap}
.foot{font-size:28px;color:#BFAF98;text-align:right;margin-top:16px}
</style></head><body>${head}
${body(faceH)}
<div class="foot">@topnote_official</div></body></html>`;
const head = `<div class="top">${esc(p.kicker)}</div><h2>${esc(p.title)}</h2>`;
const endHead = `<div class="top">${esc(p.title)}</div><h2 class="end">${esc(p.endLine ?? '검증을 통과한 사람만 들어와요.')}</h2><div class="sub">목소리로 3분 먼저 · <b>topnote.app</b></div>`;
const rows = sections.reduce((a, sec) => a + Math.ceil(sec.groups.reduce((n, g) => n + g.list.length, 0) / perRow), 0);
const fit = (avail) => Math.max(120, Math.min(Math.round(cw * 1.25), Math.floor(avail / rows) - (big ? 130 : 110) - 60));

for (const d of ['docs/posts/' + p.id, 'docs/stories', 'docs/ai-reels']) mkdirSync(resolve(root, d), { recursive: true });
const b = await chromium.launch();
for (const [h, pad, faceH, hd, out] of [
  [1350, 50, fit(1350 - 100 - 150 - 60 - sections.length * 60), head, `docs/posts/${p.id}/1.jpg`],
  [1920, 170, fit(1920 - 340 - 150 - 60 - sections.length * 60), head, `docs/stories/${p.id}.jpg`],
  [1920, 170, fit(1920 - 340 - 220 - 60 - sections.length * 60), endHead, `docs/ai-reels/${p.id}-end.jpg`],
]) {
  const page = await b.newPage({ viewport: { width: 1080, height: h } });
  await page.setContent(html(h, pad, faceH, hd));
  await page.evaluate(() => document.fonts.ready);
  // 나이 줄만 한 줄에 맞게 줄인다(직업은 같은 크기로 두 줄까지 허용).
  await page.evaluate(() => { for (const el of document.querySelectorAll('.age')) { let f = parseFloat(getComputedStyle(el).fontSize); while (el.scrollWidth > el.clientWidth + 1 && f > 20) { f -= 2; el.style.fontSize = f + 'px'; } } });
  const over = await page.evaluate(() => document.body.scrollHeight > innerHeight + 1);
  if (over) console.log(`  ⚠ ${out}: 내용이 화면보다 길어요`);
  await page.screenshot({ path: resolve(root, out), type: 'jpeg', quality: 90 });
  console.log('→', out);
}
await b.close();
// 릴스(scripts/review-reel.mjs)가 같은 사진·포즈를 쓰도록 고른 결과를 payload 에 적어 둔다.
p.people = all.filter((x) => x.st === 'wait').map(({ st, ...x }) => x);
p.ok = all.filter((x) => x.st === 'ok').map(({ st, ...x }) => x);
writeFileSync(payloadPath, JSON.stringify(p, null, 1) + '\n');
