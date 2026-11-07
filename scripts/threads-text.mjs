// 스레드 전용 글(2026-11-03 대표 「스레드에도 스레드 스타일에 맞게 계속 업로드 · 바이럴되게」).
// 스레드는 글이 먼저인 곳이라 사진 없이 짧은 글 + 질문 하나로 댓글을 부른다.
// 본문엔 링크를 넣지 않고(노출이 줄어듦) 첫 답글에만 앱 받기 주소를 단다. 주제 태그는 1개.
// 대기열: threads/posts.json (위에서부터 하나씩), 올린 기록: state.json 의 threads_text.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadLocalEnv, loadTokens, saveTokens } from './tokens.mjs';

loadLocalEnv();
const root = resolve(import.meta.dirname, '..');
const statePath = resolve(root, 'state.json');
const state = JSON.parse(readFileSync(statePath, 'utf8'));
state.threads_text ??= [];
// 2026-11-07 대표 「zzend 스레드 글 올리는 방식대로 계속 자동 게시 · 적당한 간격으로」:
// ZZEND 방식 = 원글(사람 나온 표지 + 짧은 훅, 링크·해시태그 없음) → 답글 3개를 2~8분 간격으로 이어 달기 → 링크는 마지막 답글에만.
// 손으로 쓴 대기열(threads/posts.json)을 먼저 쓰고, 다 쓰면 threads/seeds.json 조합으로 끝없이 만든다(같은 훅은 가장 오래전에 쓴 것부터).
// 하루 4칸(threads.yml), 칸마다 예약을 여러 번 걸어 두고 3시간 안에 올린 게 있으면 건너뛴다.
if (state.threads_text_at && Date.now() - state.threads_text_at < 3 * 36e5 && !process.argv.includes('--force')) { console.log('3시간 안에 올린 글이 있어 건너뜀'); process.exit(0); }
const posts = JSON.parse(readFileSync(resolve(root, 'threads', 'posts.json'), 'utf8'));
const seeds = JSON.parse(readFileSync(resolve(root, 'threads', 'seeds.json'), 'utf8'));
state.threads_gen ??= [];
const n = state.threads_text.length + state.threads_gen.length;
const pick = (arr, k) => arr[(k % arr.length + arr.length) % arr.length];
// 2026-11-07 대표 「스레드 글쓰기 스타일은 다르잖아」: 옛 대기열(존댓말·마침표)은 쓰지 않고 seeds.json(반말 혼잣말)만 쓴다.
let post = null; void posts;
const used = new Set(state.threads_gen.map((g) => g.join('.')));
if (!post) {
  const last = new Map(state.threads_gen.map((g, i) => [g[0], i]));
  const h = [...seeds.hooks.keys()].sort((a, b) => (last.get(a) ?? -1) - (last.get(b) ?? -1))[0];
  let combo;
  for (let k = 0; k < 500 && !combo; k++) { const c = [h, (n + k) % seeds.insights.length, (n * 3 + k) % seeds.questions.length, (n + k) % seeds.app.length]; if (!used.has(c.join('.'))) combo = c; }
  post = { id: 'g' + combo.join('.'), combo, text: seeds.hooks[combo[0]], topic: pick(seeds.topics, n) };
}
const ins = post.combo ? seeds.insights[post.combo[1]] : pick(seeds.insights, n);
const replies = [
  ins.join('\n'),
  post.combo ? seeds.questions[post.combo[2]] : pick(seeds.questions, n),
  (post.combo ? seeds.app[post.combo[3]] : pick(seeds.app, n)) + '\n\n앱 받기 👉 https://topnote.app/th\n(사진 속 인물은 AI로 만든 이미지예요)',
];
// 표지: 사람이 나온 국내 광고 영상 표지를 돌려 쓴다(게시물에는 사람이 꼭 나온다).
const covers = readdirSync(resolve(root, 'docs', 'ai-reels')).filter((f) => f.endsWith('-cover.jpg') && !f.startsWith('us-')).sort();
const cover = `https://gimzimean.github.io/topnote-social/ai-reels/${pick(covers, n * 7)}`;

if (process.argv.includes('--dry')) { console.log(JSON.stringify({ post, cover, replies }, null, 1)); process.exit(0); }
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

const params = { media_type: 'IMAGE', image_url: cover, text: post.text.slice(0, 500) };
if (post.topic) params.topic_tag = post.topic;
const id = await publish(params);
console.log('[스레드 글]', post.id, id, cover);
if (post.combo) state.threads_gen.push(post.combo); else state.threads_text.push(post.id);
state.threads_text_at = Date.now();
writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
// 답글은 앞 답글에 이어 단다. 사이마다 2~8분 무작위로 기다린다.
let parent = id;
for (const text of replies) {
  await new Promise((r) => setTimeout(r, (120 + Math.random() * 360) * 1000));
  try { parent = await publish({ media_type: 'TEXT', text, reply_to_id: parent }); console.log('[답글]', parent); }
  catch (e) { console.error(`[스레드 글] 답글 실패: ${e.message}`); break; }
}
