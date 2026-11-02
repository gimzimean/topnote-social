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

// 5) 자동 게시 진행
const state = JSON.parse(readFileSync(resolve(root, 'state.json'), 'utf8'));
const content = JSON.parse(readFileSync(resolve(root, 'content.json'), 'utf8'));
out.queue = { cards_posted: state.instagram?.length ?? 0, cards_total: (content.posts ?? content).length, reels_posted: state.reels ?? [] };
out.not_collected = ['틱톡 광고(API 연결 없음 — 틱톡 광고 관리자에서 확인)', '인스타 조회수(토큰 권한 없음)'];

mkdirSync(resolve(root, 'reports'), { recursive: true });
writeFileSync(resolve(root, 'reports', `${day}.json`), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out).slice(0, 1500));
