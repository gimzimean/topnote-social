// 심사 일지 카드(2026-11-10 대표 「인스타탭에서 완료 누르면 인스타에 바로 올라가게, 자동·수동 둘 다」).
// 운영실(탑노트 앱 「📸 인스타」 탭)이 journal.yml 을 부르며 카드 내용(payload)을 넘긴다. 여기서는:
//   node scripts/journal.mjs render <payload.json>   → docs/journal/<날짜>.jpg(피드 1080×1350) · <날짜>-story.jpg(1080×1920)
//   node scripts/journal.mjs post <payload.json>     → 인스타 피드 · 스토리 · 스레드에 올리고 결과를 탑노트 서버에 알림
// 환경변수: TOKEN_KEY, IG_JOURNAL_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { loadLocalEnv, loadTokens, saveTokens } from './tokens.mjs';

loadLocalEnv();
const root = resolve(import.meta.dirname, '..');
const [mode, payloadFile] = process.argv.slice(2);
const p = JSON.parse(readFileSync(payloadFile, 'utf8'));
const date = p.date;
// Pages 빌드가 자주 실패해서(저장소가 커서) 그림은 올린 커밋의 원본 주소로 넘긴다.
const sha = (() => { try { return execSync('git rev-parse HEAD', { cwd: root }).toString().trim(); } catch { return 'main'; } })();
const BASE = `https://raw.githubusercontent.com/gimzimean/topnote-social/${sha}/docs/journal`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const FOOT = '검증된 사람만, 안심하고 대화해요.';

async function render() {
  const require = createRequire(existsSync(resolve(root, 'node_modules/playwright')) ? resolve(root, 'package.json') : 'C:/topnote-app/package.json');
  const { chromium } = require('playwright');
  const b64 = (f) => readFileSync(f).toString('base64');
  const font = `@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64(resolve(root, 'assets/fonts/SongMyung-Regular.ttf'))})}`;
  const tag = (s) => `<span class="tag ${s === '승인' ? 'pass' : s === '반려' ? 'no' : 'wait'}">${esc(s)}</span>`;
  const col = (title, list) => `<div class="gcol"><div class="gh">${title}</div>${list.length ? list.map((r) => `<div class="item"><span class="job">${esc(r.job)}</span>${tag(r.status)}</div>`).join('') : '<div class="item empty">—</div>'}</div>`;
  const html = (w, h, top) => `<!doctype html><html><head><meta charset="utf-8"><style>${font}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;background:#1E1915;color:#F5ECDD;font-family:'Malgun Gothic','Noto Sans CJK KR',sans-serif;position:relative;padding:${top}px 84px 0}
.logo{position:absolute;top:${top - 4}px;right:84px;font-family:SongMyung;font-size:64px}.logo i{color:#B85F45;font-style:normal}
.kick{font-size:30px;letter-spacing:9px;color:#C9A86A}
.t{font-family:SongMyung;font-size:96px;line-height:1.2;margin-top:24px}
.cnt{font-size:40px;color:#D8CBB8;margin:22px 0 56px}.cnt b{color:#F5ECDD}
.cols{display:flex;gap:44px}.gcol{flex:1;min-width:0}
.gh{font-size:36px;color:#C9A86A;letter-spacing:6px;padding-bottom:16px;border-bottom:2px solid #C9A86A}
.item{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:30px 0;border-bottom:2px solid #3A322B;font-size:38px}
.item.empty{color:#6E6458}.job{min-width:0;word-break:keep-all}
.tag{font-size:28px;font-weight:800;padding:10px 20px;border-radius:40px;white-space:nowrap}
.pass{background:#2F5B46;color:#DDF3E6}.wait{background:#5A4A2A;color:#F5E6C8}.no{background:#5B2D2D;color:#F6DADA}
.foot{position:absolute;left:84px;right:84px;bottom:${top}px;font-size:42px;color:#E9DCC6;line-height:1.5}.foot small{display:block;color:#9E9282;font-size:30px;margin-top:6px}
</style></head><body><div class="logo">T<i>.</i></div><div class="kick">TOP NOTE</div><div class="t">${esc(p.title)}</div>
<div class="cnt">승인 <b>${p.approved}</b> · 반려 <b>${p.rejected}</b> · 지금까지 반려 <b>${p.rejected_total}</b>명</div>
<div class="cols">${col('남', p.men)}${col('여', p.women)}</div>
<div class="foot">${FOOT}<small>목소리로 3분 먼저 · topnote.app</small></div></body></html>`;
  mkdirSync(resolve(root, 'docs/journal'), { recursive: true });
  const b = await chromium.launch();
  for (const [w, h, top, name] of [[1080, 1350, 96, `${date}.jpg`], [1080, 1920, 240, `${date}-story.jpg`]]) {
    const page = await b.newPage({ viewport: { width: w, height: h } });
    await page.setContent(html(w, h, top));
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(root, 'docs/journal', name), type: 'jpeg', quality: 92 });
    await page.close();
  }
  await b.close();
  console.log(`그림 완료 · docs/journal/${date}.jpg`);
}

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`${res.status} ${JSON.stringify(body.error ?? body)}`);
  return body;
}

async function report(status, media, error) {
  const url = process.env.SUPABASE_URL; const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return console.log('서버 주소가 없어 결과를 못 알렸어요');
  await fetch(`${url}/rest/v1/rpc/ig_journal_report`, {
    method: 'POST', headers: { apikey: anon, authorization: `Bearer ${anon}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_date: date, p_key: process.env.IG_JOURNAL_KEY, p_status: status, p_media: media ?? null, p_error: error ?? null }),
  }).then((r) => console.log(`결과 알림 ${r.status}`)).catch((e) => console.log(`결과 알림 실패 ${e.message}`));
}

const caption = `${p.title}
승인 ${p.approved} · 반려 ${p.rejected} · 지금까지 반려 ${p.rejected_total}명

${FOOT}
목소리로 3분 먼저, 탑노트.

#탑노트 #보이스소개팅 #소개팅 #검증된만남 #심사일지`;

async function post() {
  const tokens = loadTokens();
  const feedUrl = `${BASE}/${date}.jpg`; const storyUrl = `${BASE}/${date}-story.jpg`;
  // 원본 주소에 그림이 열릴 때까지 최대 1분.
  for (let i = 0; i < 12; i++) { const h = await fetch(feedUrl, { method: 'HEAD' }); const s = await fetch(storyUrl, { method: 'HEAD' }); if (h.ok && s.ok) break; await sleep(5000); }
  const t = tokens.instagram;
  const fb = t.access_token.startsWith('EAA');
  const IG = fb ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
  if (!fb && Date.now() - (t.refreshed_at ?? 0) > 7 * 864e5) {
    const r = await json(await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${t.access_token}`));
    Object.assign(t, { access_token: r.access_token, refreshed_at: Date.now() }); saveTokens(tokens);
  }
  const call = async (path, params) => json(await fetch(`${IG}/${path}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: t.access_token }) }));
  const ready = async (id) => { for (let i = 0; i < 60; i++) { const s = await json(await fetch(`${IG}/${id}?fields=status_code&access_token=${t.access_token}`)); if (s.status_code === 'FINISHED') return; if (s.status_code === 'ERROR') throw new Error('인스타 처리 실패'); await sleep(3000); } };
  let mediaId;
  try {
    const box = await call(`${t.user_id}/media`, { image_url: feedUrl, caption });
    await ready(box.id);
    // 인스타가 올려 놓고도 403(Application request limit)을 돌려줄 때가 있어, 실패하면 방금 올라간 게시물이 있는지 본다.
    mediaId = await call(`${t.user_id}/media_publish`, { creation_id: box.id }).then((r) => r.id).catch(async (e) => {
      await sleep(5000);
      const m = await json(await fetch(`${IG}/${t.user_id}/media?fields=timestamp,caption&limit=1&access_token=${t.access_token}`));
      const last = m.data?.[0];
      if (last && Date.now() - Date.parse(last.timestamp) < 5 * 60e3 && (last.caption ?? "").startsWith(p.title)) return last.id;
      throw e;
    });
    console.log(`[instagram] 올림 → ${mediaId}`);
    await call(`${mediaId}/comments`, { message: '여러분은 어떤 인증을 할 수 있나요?\n먼저 3분 통화해 보고 싶다면 프로필 링크 👆' }).catch((e) => console.error(`[instagram] 댓글 실패: ${e.message}`));
  } catch (e) { await report('failed', null, `인스타 피드: ${e.message}`); throw e; }
  try {
    const sb = await call(`${t.user_id}/media`, { media_type: 'STORIES', image_url: storyUrl });
    await ready(sb.id);
    console.log(`[story] 올림 → ${(await call(`${t.user_id}/media_publish`, { creation_id: sb.id })).id}`);
  } catch (e) { console.error(`[story] 실패: ${e.message}`); }
  try {
    const th = tokens.threads;
    if (th) {
      const TH = 'https://graph.threads.net/v1.0';
      const tcall = async (path, params) => json(await fetch(`${TH}/${path}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: th.access_token }) }));
      const box = await tcall(`${th.user_id}/threads`, { media_type: 'IMAGE', image_url: feedUrl, text: `${p.title}\n승인 ${p.approved} · 반려 ${p.rejected} · 지금까지 반려 ${p.rejected_total}명\n\n${FOOT}` });
      await sleep(8000);
      const id = (await tcall(`${th.user_id}/threads_publish`, { creation_id: box.id })).id;
      console.log(`[threads] 올림 → ${id}`);
      const reply = await tcall(`${th.user_id}/threads`, { media_type: 'TEXT', text: '보이스 소개팅, 탑노트 · 목소리로 3분 먼저 → https://topnote.app/th', reply_to_id: id });
      await sleep(5000);
      await tcall(`${th.user_id}/threads_publish`, { creation_id: reply.id }).catch(() => {});
    }
  } catch (e) { console.error(`[threads] 실패: ${e.message}`); }
  await report('posted', mediaId, null);
}

if (mode === 'render') await render();
else if (mode === 'post') await post();
else { console.log('render 또는 post'); process.exit(1); }
