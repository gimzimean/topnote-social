// 스레드 전용 글(2026-11-03 대표 「스레드에도 스레드 스타일에 맞게 계속 업로드 · 바이럴되게」).
// 스레드는 글이 먼저인 곳이라 사진 없이 짧은 글 + 질문 하나로 댓글을 부른다.
// 본문엔 링크를 넣지 않고(노출이 줄어듦) 첫 답글에만 앱 받기 주소를 단다. 주제 태그는 1개.
// 대기열: threads/posts.json (위에서부터 하나씩), 올린 기록: state.json 의 threads_text.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadLocalEnv, loadTokens, saveTokens } from './tokens.mjs';

loadLocalEnv();
const root = resolve(import.meta.dirname, '..');
const statePath = resolve(root, 'state.json');
const state = JSON.parse(readFileSync(statePath, 'utf8'));
state.threads_text ??= [];
const posts = JSON.parse(readFileSync(resolve(root, 'threads', 'posts.json'), 'utf8'));
const post = posts.find((p) => !state.threads_text.includes(p.id));
if (!post) { console.log('스레드 글 대기열이 비었어요 · threads/posts.json 에 새 글을 추가하세요'); process.exit(0); }

const tokens = loadTokens();
const t = tokens.threads;
if (!t) throw new Error('스레드 토큰 없음');
const TH = 'https://graph.threads.net/v1.0';
const json = async (r) => { const b = await r.json(); if (!r.ok || b.error) throw new Error(`${r.status} ${JSON.stringify(b.error ?? b)}`); return b; };

// 토큰은 7일마다 새로 받는다(60일 만료).
if (!t.refreshed_at || Date.now() - t.refreshed_at > 7 * 864e5) {
  const r = await json(await fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${t.access_token}`));
  t.access_token = r.access_token; t.refreshed_at = Date.now(); saveTokens(tokens);
}
const call = async (path, params) => json(await fetch(`${TH}/${path}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: t.access_token }) }));
const publish = async (params) => {
  const box = await call(`${t.user_id}/threads`, params);
  await new Promise((r) => setTimeout(r, 3000));
  return (await call(`${t.user_id}/threads_publish`, { creation_id: box.id })).id;
};

const params = { media_type: 'TEXT', text: post.text.slice(0, 500) };
if (post.topic) params.topic_tag = post.topic;
const id = await publish(params);
console.log('[스레드 글]', post.id, id);
await publish({ media_type: 'TEXT', text: '탑노트 받기 → https://topnote.app/th', reply_to_id: id })
  .catch((e) => console.error(`[스레드 글] 답글 실패: ${e.message}`));

state.threads_text.push(post.id);
writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
