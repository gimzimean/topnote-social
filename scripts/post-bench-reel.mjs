// 벤치마킹 릴스 한 편을 인스타 릴스(+첫 댓글) · 스레드 영상(+링크 답글)으로 바로 올린다.
// 사용: node scripts/post-bench-reel.mjs <id> <설정.json>  (설정의 caption · threads · comment 사용)
import { readFileSync } from 'node:fs';
import { loadLocalEnv, loadTokens, saveTokens } from './tokens.mjs';
loadLocalEnv();
const [id, cfgPath] = process.argv.slice(2);
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const tokens = loadTokens();
const json = async (r) => { const b = await r.json(); if (!r.ok || b.error) throw new Error(`${r.status} ${JSON.stringify(b.error ?? b)}`); return b; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const video = `https://gimzimean.github.io/topnote-social/ai-reels/${id}.mp4`;
const cover = `https://gimzimean.github.io/topnote-social/ai-reels/${id}-cover.jpg`;

if (!process.argv.includes('--threads-only')) {
  const t = tokens.instagram;
  const fb = t.access_token.startsWith('EAA');
  const IG = fb ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
  const call = async (path, p) => json(await fetch(`${IG}/${path}`, { method: 'POST', body: new URLSearchParams({ ...p, access_token: t.access_token }) }));
  const box = await call(`${t.user_id}/media`, { media_type: 'REELS', video_url: video, cover_url: cover, caption: cfg.caption, share_to_feed: 'true' });
  for (let i = 0; i < 100; i++) {
    const s = await json(await fetch(`${IG}/${box.id}?fields=status_code,status&access_token=${t.access_token}`));
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR') throw new Error('인스타 처리 실패 ' + s.status);
    await sleep(3000);
  }
  const mid = (await call(`${t.user_id}/media_publish`, { creation_id: box.id })).id;
  console.log('[instagram]', mid);
  await call(`${mid}/comments`, { message: cfg.comment }).catch((e) => console.error('[instagram] 댓글 실패', e.message));
}

const th = tokens.threads;
const TH = 'https://graph.threads.net/v1.0';
const tcall = async (path, p) => json(await fetch(`${TH}/${path}`, { method: 'POST', body: new URLSearchParams({ ...p, access_token: th.access_token }) }));
const tbox = await tcall(`${th.user_id}/threads`, { media_type: 'VIDEO', video_url: video, text: cfg.threads, topic_tag: cfg.topic ?? '소개팅' });
for (let i = 0; i < 60; i++) {
  await sleep(5000);
  const s = await json(await fetch(`${TH}/${tbox.id}?fields=status,error_message&access_token=${th.access_token}`));
  if (s.status === 'FINISHED') break;
  if (s.status === 'ERROR') throw new Error('스레드 처리 실패 ' + s.error_message);
}
const tid = (await tcall(`${th.user_id}/threads_publish`, { creation_id: tbox.id })).id;
console.log('[threads]', tid);
await sleep(8000);
const r = await tcall(`${th.user_id}/threads`, { media_type: 'TEXT', text: cfg.threads_reply, reply_to_id: tid });
await sleep(3000);
console.log('[threads 답글]', (await tcall(`${th.user_id}/threads_publish`, { creation_id: r.id })).id);
saveTokens(tokens);
