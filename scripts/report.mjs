// 아침 보고용 숫자 모으기(2026-11-02 대표 「매일 아침 8시 실적 보고」). 매일 07:30 KST, reports/<어제>.json 에 저장.
// 클로드 루틴(08:00 KST)이 이 파일을 읽어 한국어 보고를 쓴다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadLocalEnv, loadTokens } from './tokens.mjs';

loadLocalEnv();
const root = resolve(import.meta.dirname, '..');
const kst = new Date(Date.now() + 9 * 36e5);
kst.setUTCDate(kst.getUTCDate() - 1);
const day = kst.toISOString().slice(0, 10);
const out = { day, collected_at: new Date().toISOString() };
const safe = async (key, fn) => { try { out[key] = await fn(); } catch (e) { out[key] = { error: String(e.message ?? e).slice(0, 200) }; } };
const j = async (url, init) => { const r = await fetch(url, init); const b = await r.json(); if (b.error) throw new Error(JSON.stringify(b.error)); return b; };

// 1) 앱: 방문·가입·통화·결제 (Supabase get_daily_report)
await safe('app', async () => {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch('https://rtedhhpfynmrldnaddxl.supabase.co/rest/v1/rpc/get_daily_report', {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_day: day }) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
});

// 2) 인스타: 팔로워 · 최근 게시물 좋아요·댓글
const tokens = loadTokens();
await safe('instagram', async () => {
  const t = tokens.instagram;
  const G = t.access_token.startsWith('EAA') ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
  const acc = await j(`${G}/${t.user_id}?fields=followers_count,media_count&access_token=${t.access_token}`);
  const media = await j(`${G}/${t.user_id}/media?fields=caption,media_type,timestamp,like_count,comments_count,permalink&limit=12&access_token=${t.access_token}`);
  return { followers: acc.followers_count, posts: acc.media_count,
    recent: media.data.map((m) => ({ at: m.timestamp, type: m.media_type, likes: m.like_count, comments: m.comments_count, title: (m.caption ?? '').split('\n').slice(0, 2).join(' ').slice(0, 50), url: m.permalink })) };
});

// 3) 스레드: 최근 글 조회·좋아요(권한 없으면 오류만 남김)
await safe('threads', async () => {
  const t = tokens.threads;
  const list = await j(`https://graph.threads.net/v1.0/me/threads?fields=id,text,timestamp,permalink&limit=6&access_token=${t.access_token}`);
  const rows = [];
  for (const p of list.data) {
    let ins = {};
    try { const i = await j(`https://graph.threads.net/v1.0/${p.id}/insights?metric=views,likes,replies,reposts&access_token=${t.access_token}`); ins = Object.fromEntries(i.data.map((d) => [d.name, d.values?.[0]?.value ?? d.total_value?.value])); } catch (e) { ins = { error: 'insights' }; }
    rows.push({ at: p.timestamp, text: (p.text ?? '').slice(0, 40), ...ins });
  }
  return rows;
});

// 4) 메타 광고: 어제 캠페인별 비용·노출·클릭·설치
await safe('meta_ads', async () => {
  const tr = JSON.stringify({ since: day, until: day });
  const r = await j(`https://graph.facebook.com/v23.0/act_1669114048255983/insights?level=campaign&fields=campaign_name,spend,impressions,clicks,ctr,actions&time_range=${encodeURIComponent(tr)}&access_token=${process.env.META_ADS_TOKEN}`);
  return r.data.map((c) => ({ campaign: c.campaign_name, spend: Number(c.spend), impressions: Number(c.impressions), clicks: Number(c.clicks), ctr: Number(c.ctr),
    installs: Number(c.actions?.find((a) => a.action_type === 'mobile_app_install')?.value ?? 0),
    link_clicks: Number(c.actions?.find((a) => a.action_type === 'link_click')?.value ?? 0) }));
});

// 4-2) 메타 계정 지출 한도(spend_cap)와 한도를 건 뒤 쓴 돈(amount_spent) — 한도에 닿으면 광고가 전부 멈춘다
await safe('meta_cap', async () => {
  const a = await j(`https://graph.facebook.com/v23.0/act_1669114048255983?fields=amount_spent,spend_cap&access_token=${process.env.META_ADS_TOKEN}`);
  const cap = Number(a.spend_cap), spent = Number(a.amount_spent);
  return { spend_cap: cap, spent_since_cap: spent, left: cap ? cap - spent : null };
});

// 4-3) 검색 성과(구글 서치 콘솔, 2026-11-05 대표 「성과도 같이 측정해」): 데이터가 2~3일 늦으므로 최근 7일(3일 전까지).
// 한국판(/us/ 밖)과 미국판(/us/)을 나눠 노출·클릭·평균 순위, 많이 나온 페이지·검색어. 서비스 계정 GSC_SA_JSON(읽기 전용).
await safe('seo', async () => {
  const sa = JSON.parse(process.env.GSC_SA_JSON || 'null');
  if (!sa) throw new Error('GSC_SA_JSON 없음');
  const { createSign } = await import('node:crypto');
  const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'RS256', typ: 'JWT' });
  const body = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000 });
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(sa.private_key).toString('base64url');
  const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${body}.${sig}` }) })).json();
  if (!tok.access_token) throw new Error('token ' + JSON.stringify(tok).slice(0, 150));
  const end = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const start = new Date(Date.now() - 9 * 864e5).toISOString().slice(0, 10);
  const q = async (dimensions, filters, rowLimit = 10) => {
    const r = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites/' + encodeURIComponent('https://topnote.app/') + '/searchAnalytics/query', {
      method: 'POST', headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions, rowLimit, ...(filters ? { dimensionFilterGroups: [{ filters }] } : {}) }) });
    const b = await r.json(); if (b.error) throw new Error(JSON.stringify(b.error).slice(0, 200));
    return (b.rows ?? []).map((x) => ({ key: x.keys?.join(' | '), clicks: x.clicks, impressions: x.impressions, ctr: Math.round(x.ctr * 1000) / 10, position: Math.round(x.position * 10) / 10 }));
  };
  const us = [{ dimension: 'page', operator: 'contains', expression: '/us/' }];
  const kr = [{ dimension: 'page', operator: 'notContains', expression: '/us/' }];
  const total = async (f) => (await q([], f, 1))[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: null };
  return {
    range: `${start}~${end}`,
    kr: { total: await total(kr), pages: await q(['page'], kr), queries: await q(['query'], kr) },
    us: { total: await total(us), pages: await q(['page'], us), queries: await q(['query'], us) },
  };
});

// 5) 자동 게시 진행
const state = JSON.parse(readFileSync(resolve(root, 'state.json'), 'utf8'));
const content = JSON.parse(readFileSync(resolve(root, 'content.json'), 'utf8'));
out.queue = { cards_posted: state.instagram?.length ?? 0, cards_total: (content.posts ?? content).length, reels_posted: state.reels ?? [] };
out.not_collected = ['틱톡 광고(API 연결 없음 — 틱톡 광고 관리자에서 확인)', '인스타 조회수(토큰 권한 없음)'];

mkdirSync(resolve(root, 'reports'), { recursive: true });
writeFileSync(resolve(root, 'reports', `${day}.json`), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out).slice(0, 1500));
