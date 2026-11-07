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
// 2026-11-07 대표 「zzend 스레드 글 올리는 방식대로 계속 자동 게시 · 적당한 간격으로」: 원글 → 답글을 2~8분 간격으로 이어 달기 → 링크는 마지막 답글에만.
// 하루 4칸(threads.yml), 칸마다 예약을 여러 번 걸어 두고 3시간 안에 올린 게 있으면 건너뛴다.
if (state.threads_text_at && Date.now() - state.threads_text_at < 3 * 36e5 && !process.argv.includes('--force')) { console.log('3시간 안에 올린 글이 있어 건너뜀'); process.exit(0); }
const seeds = JSON.parse(readFileSync(resolve(root, 'threads', 'seeds.json'), 'utf8'));
// 2026-11-07 대표 「스레드 글쓰기 스타일은 다르잖아」: 국내 스레드 인기 글처럼 원글은 글만(반말·구체적인 장면·질문으로 끝),
// 답글 1 = 짧은 덧붙임, 답글 2 = 사람 나온 사진 + 탑노트 한 줄 + 링크 + AI 안내. 원글은 가장 오래전에 쓴 것부터 돌린다.
state.threads_v2 ??= [];
const n = state.threads_v2.length;
const pick = (arr, k) => arr[(k % arr.length + arr.length) % arr.length];
const lastUse = new Map(state.threads_v2.map((i, k) => [i, k]));
const pi = [...seeds.series.keys()].sort((x, y) => (lastUse.get(x) ?? -1) - (lastUse.get(y) ?? -1))[0];
const s0 = seeds.series[pi];
const post = { text: s0.parts[0], topic: s0.topic };
const covers = readdirSync(resolve(root, 'docs', 'ai-reels')).filter((f) => f.endsWith('-cover.jpg') && !f.startsWith('us-')).sort();
const cover = `https://gimzimean.github.io/topnote-social/ai-reels/${pick(covers, n * 7 + 3)}`;
const replies = [
  ...s0.parts.slice(1).map((text) => ({ media_type: 'TEXT', text })),
  { media_type: 'IMAGE', image_url: cover, text: seeds.cta[s0.cta ?? n % seeds.cta.length] + '\n\n👉 https://topnote.app/th\n(사진 속 인물은 AI로 만든 이미지예요)' },
];
if (process.argv.includes('--dry')) { console.log(JSON.stringify({ post, replies }, null, 1)); process.exit(0); }
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
console.log('[스레드 글]', pi, id);
state.threads_v2.push(pi);
state.threads_text_at = Date.now();
writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
// 연재라 답글은 앞 답글에 이어 바로바로 단다(읽는 사람이 1/N을 한 번에 보게, 사이 5~15초).
let parent = id;
for (const r of replies) {
  await new Promise((r) => setTimeout(r, (5 + Math.random() * 10) * 1000));
  try { parent = await publish({ ...r, reply_to_id: parent }); console.log('[답글]', parent); }
  catch (e) { console.error(`[스레드 글] 답글 실패: ${e.message}`); break; }
}
