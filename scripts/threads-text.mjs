// 스레드 전용 글. 구체적인 장면·경험을 사람 말투로 짧게 쓴다.
// 연애 경험담에는 링크나 홍보 답글을 붙이지 않는다.
// 별도의 셀소판에서만 프로필 링크를 자연스럽게 안내한다.
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
const selfIntro = JSON.parse(readFileSync(resolve(root, 'threads', 'selfintro.json'), 'utf8'));
// 2026-11-07 대표 「스레드 글쓰기 스타일은 다르잖아」: 국내 스레드 인기 글처럼 원글은 글만(반말·구체적인 장면·질문으로 끝),
// 답글 1 = 짧은 덧붙임, 답글 2 = 사람 나온 사진 + 탑노트 한 줄 + 링크 + AI 안내. 원글은 가장 오래전에 쓴 것부터 돌린다.
state.threads_v2 ??= [];
const n = state.threads_v2.length;
const pick = (arr, k) => arr[(k % arr.length + arr.length) % arr.length];
const covers = readdirSync(resolve(root, 'docs', 'ai-reels')).filter((f) => f.endsWith('-cover.jpg') && !f.startsWith('us-')).sort();
const cover = `https://gimzimean.github.io/topnote-social/ai-reels/${pick(covers, n * 7 + 3)}`;
// 2026-11-07 국내 인기 글 조사: 연재(정보)와 짧은 한 줄 글(역설·vs·질문, 댓글이 제일 많이 달림)을 번갈아 올린다.
state.threads_short ??= [];
state.threads_focus_short ??= [];
state.threads_selfintro ??= [];
// 플랫폼 분리 운영: 자동 게시에서는 인스타 영상 복붙과 연재형 광고를 빼고 짧은 경험담만 올린다.
// 영상과 연재는 검수용 수동 실행에만 남겨 둔다.
state.threads_video ??= [];
const forced = process.argv.find((x) => x.startsWith('--kind='))?.slice(7);
const kind = forced ?? 'short';
const isShort = kind === 'short';
const isSelfIntro = kind === 'selfintro';
const lru = (len, used) => { const m = new Map(used.map((i, k) => [i, k])); return [...Array(len).keys()].sort((x, y) => (m.get(x) ?? -1) - (m.get(y) ?? -1))[0]; };
let pi, post, replies;
if (kind === 'video') {
  const vi = lru(seeds.video.length, state.threads_video);
  pi = 'v' + vi;
  const v = seeds.video[vi];
  post = { media_type: 'VIDEO', video_url: `https://gimzimean.github.io/topnote-social/ai-reels/${v.id}.mp4`, text: v.text, topic: pick(['연애', '소개팅', '썸', '연애고민'], n) };
  replies = [];
} else if (isShort) {
  // focus_short는 결혼·연애·썸·썸붕·셀소를 고르게 돌리는 현재 편성이다.
  // --focus=3처럼 오늘 올릴 글을 바로 고를 수도 있다.
  const focusArg = process.argv.find((x) => x.startsWith('--focus='))?.slice(8);
  const wantS = process.argv.find((x) => x.startsWith('--pick=s'))?.slice(8);
  const useFocus = focusArg != null || (seeds.focus_short?.length && wantS == null);
  const source = useFocus ? seeds.focus_short : seeds.short;
  const used = useFocus ? state.threads_focus_short : state.threads_short;
  pi = (useFocus ? 'f' : 's') + (focusArg != null ? +focusArg : wantS != null ? +wantS : lru(source.length, used));
  const sh = source[+pi.slice(1)];
  post = { text: typeof sh === 'string' ? sh : sh.text, topic: typeof sh === 'object' && sh.topic ? sh.topic : pick(['연애', '소개팅', '썸', '연애고민'], n) };
  replies = [];
} else if (isSelfIntro) {
  const si = lru(selfIntro.length, state.threads_selfintro);
  pi = 'c' + si;
  post = { text: selfIntro[si].text, topic: '소개팅' };
  replies = [{ media_type: 'TEXT', text: selfIntro[si].reply }];
} else {
  const want = process.argv.find((x) => x.startsWith('--pick=') && !x.startsWith('--pick=s'))?.slice(7); // 특정 연재를 바로 올릴 때(번호)
  pi = want != null ? +want : lru(seeds.series.length, state.threads_v2.filter((x) => typeof x === 'number'));
  const s0 = seeds.series[pi];
  post = { text: s0.parts[0], topic: s0.topic };
  replies = [
    ...s0.parts.slice(1).map((x) => (typeof x === 'string' ? { media_type: 'TEXT', text: x } : { media_type: 'IMAGE', image_url: x.image, text: x.text })),
  ];
}
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
  // 영상은 메타 서버가 처리를 끝낼 때까지 기다린다(최대 5분).
  for (let i = 0; i < (params.media_type === 'VIDEO' ? 60 : 1); i++) {
    await new Promise((r) => setTimeout(r, params.media_type === 'VIDEO' ? 5000 : 3000));
    if (params.media_type !== 'VIDEO') break;
    const st = await json(await fetch(`${TH}/${box.id}?fields=status,error_message&access_token=${t.access_token}`));
    if (st.status === 'FINISHED') break;
    if (st.status === 'ERROR') throw new Error('영상 처리 실패: ' + st.error_message);
  }
  return (await call(`${t.user_id}/threads_publish`, { creation_id: box.id })).id;
};

const params = post.media_type === 'VIDEO' ? { media_type: 'VIDEO', video_url: post.video_url, text: post.text.slice(0, 500) } : { media_type: 'TEXT', text: post.text.slice(0, 500) };
if (post.topic) params.topic_tag = post.topic;
const id = await publish(params);
console.log('[스레드 글]', pi, id);
if (!forced) state.threads_v2.push(pi);
if (isShort && pi.startsWith('f')) state.threads_focus_short.push(+pi.slice(1));
else if (isShort) state.threads_short.push(+pi.slice(1));
if (kind === 'video') state.threads_video.push(+pi.slice(1));
if (isSelfIntro) state.threads_selfintro.push(+pi.slice(1));
state.threads_text_at = Date.now();
writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
// 연재라 답글은 앞 답글에 이어 바로바로 단다(읽는 사람이 1/N을 한 번에 보게, 사이 5~15초).
let parent = id;
for (const r of replies) {
  await new Promise((r) => setTimeout(r, (5 + Math.random() * 10) * 1000));
  try { parent = await publish({ ...r, reply_to_id: parent }); console.log('[답글]', parent); }
  catch (e) { console.error(`[스레드 글] 답글 실패: ${e.message}`); break; }
}
