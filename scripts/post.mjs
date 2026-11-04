// 다음 차례 게시물을 인스타·스토리·스레드·틱톡에 올린다. GitHub Actions 가 매일 20:00 KST 에 실행한다.
// 2026-11-03부터: docs/reels/<id>.mp4(scripts/card-reel.mjs, 음악 릴스)가 있으면 인스타 릴스(피드 공유)·스레드 영상·틱톡 영상 초안으로 올린다.
//   없으면 예전처럼 사진 묶음. 스토리는 그대로 세로 표지 사진.
// 실행: node scripts/post.mjs            → 올림
//       node scripts/post.mjs --dry      → 무엇을 올릴지만 보여줌
//       node scripts/post.mjs --only instagram|tiktok
// 환경변수: TOKEN_KEY, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_MODE(private 기본 = 나만 보기 + 글 포함 | public = 앱 심사 뒤 | inbox = 예전 초안)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadLocalEnv, loadTokens, saveTokens } from './tokens.mjs';
import { tiktokCaption } from './tiktok-caption.mjs';
import { postToTiktok } from './tiktok.mjs';

loadLocalEnv();
const root = resolve(import.meta.dirname, '..');
const BASE = 'https://gimzimean.github.io/topnote-social/posts';
const dry = process.argv.includes('--dry');
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx > 0 ? process.argv[onlyIdx + 1] : null;
// --id 020 → 차례와 상관없이 그 게시물만(아직 안 올린 플랫폼에만). 날짜 기록(last_day)은 건드리지 않는다.
const idIdx = process.argv.indexOf('--id');
const pickId = idIdx > 0 ? process.argv[idIdx + 1] : null;

const content = JSON.parse(readFileSync(resolve(root, 'content.json'), 'utf8'));
const statePath = resolve(root, 'state.json');
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : { instagram: [], tiktok: [] };
for (const k of ['instagram', 'story', 'threads', 'tiktok']) state[k] ??= [];
// 예약 실행은 하루(한국 시간) 한 번만: 여러 번 예약해 둔 것 중 먼저 돈 것만 올린다. 손으로 돌리면 언제든 올린다.
const today = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
if (process.env.EVENT === 'schedule' && state.last_day === today) { console.log(`오늘(${today}) 이미 올렸어요. 건너뜀.`); process.exit(0); }
const tokens = dry ? {} : loadTokens();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const imagesOf = (id) => {
  const dir = resolve(root, 'docs/posts', id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.jpg'))
    .sort((a, b) => parseInt(a) - parseInt(b)).map((f) => `${BASE}/${id}/${f}`);
};
// 스토리는 피드에 이미 올라간 게시물만(스토리 버튼이 「피드에서 보기」라서).
// 날짜 지정 게시물(on: 'YYYY-MM-DD', 빼빼로데이·크리스마스 등): 그날 전엔 안 올리고, 그날(놓쳤으면 다음 날)엔 차례보다 먼저 올린다.
const nextFor = (platform) => {
  const ok = content.posts.filter((p) => (!pickId || p.id === pickId) && !state[platform].includes(p.id) && (imagesOf(p.id).length || p.aiReel)
    && (platform !== 'story' || state.instagram.includes(p.id)) && (pickId || !p.on || p.on <= today));
  return ok.filter((p) => p.on).sort((a, b) => a.on.localeCompare(b.on))[0] ?? ok.find((p) => !p.on);
};
// 음악 릴스: 영상과 릴스 표지(안내 버튼 없는 세로 표지)
const REELS = BASE.replace(/posts$/, 'reels');
// 사람 나오는 AI 릴스(content.json 의 aiReel: docs/ai-reels/<이름>.mp4)가 있으면 카드 릴스 대신 그것(2026-11-04).
const AI = BASE.replace(/posts$/, 'ai-reels');
const aiOf = (id) => content.posts.find((p) => p.id === id)?.aiReel;
const reelOf = (id) => aiOf(id) ? `${AI}/${aiOf(id)}.mp4` : existsSync(resolve(root, 'docs/reels', `${id}.mp4`)) ? `${REELS}/${id}.mp4` : null;
const reelCoverOf = (id) => aiOf(id) ? `${AI}/${aiOf(id)}-cover.jpg` : `${REELS}/${id}-cover.jpg`;
// 스토리 표지도 사람 나오는 장면으로(2026-11-04 대표 「썸네일도 사람등장 무조건」).
const storyOf = (id) => aiOf(id) ? reelCoverOf(id) : `${BASE.replace(/posts$/, 'stories')}/${id}.jpg`;
const isVideo = (urls) => urls.length === 1 && urls[0].endsWith('.mp4');

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error?.code && body.error.code !== 'ok') {
    throw new Error(`${res.status} ${JSON.stringify(body.error ?? body)}`);
  }
  return body;
}

async function igClient() {
  const t = tokens.instagram;
  // 시스템 사용자 토큰(EAA…)은 graph.facebook.com, 인스타 로그인 토큰(IGAA…)은 graph.instagram.com.
  const fb = t.access_token.startsWith('EAA');
  const IG = fb ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
  // 인스타 로그인 장기 토큰은 60일. 7일마다 새로 받아 둔다.
  if (!fb && Date.now() - (t.refreshed_at ?? 0) > 7 * 864e5) {
    const r = await json(await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${t.access_token}`));
    t.access_token = r.access_token;
    t.refreshed_at = Date.now();
    saveTokens(tokens);
  }
  const call = async (path, params) => json(await fetch(`${IG}/${path}`, {
    method: 'POST', body: new URLSearchParams({ ...params, access_token: t.access_token }),
  }));
  const ready = async (id) => {
    // 영상은 처리에 1~3분 걸린다 → 최대 5분.
    for (let i = 0; i < 100; i++) {
      const s = await json(await fetch(`${IG}/${id}?fields=status_code,status&access_token=${t.access_token}`));
      if (s.status_code === 'FINISHED') return;
      if (s.status_code === 'ERROR') throw new Error(`인스타 처리 실패: ${s.status ?? ''}`);
      await sleep(3000);
    }
  };
  return { t, call, ready };
}

async function postInstagram(post, urls) {
  const { t, call, ready } = await igClient();
  let box;
  if (isVideo(urls)) {
    // 음악 릴스: 표지 필수, 피드에도 보이게. 영상의 음악은 그대로(소리를 끄는 옵션 안 씀).
    box = await call(`${t.user_id}/media`, { media_type: 'REELS', video_url: urls[0], cover_url: reelCoverOf(post.id), caption: post.caption, share_to_feed: 'true' });
  } else {
    const children = [];
    for (const url of urls) children.push((await call(`${t.user_id}/media`, { image_url: url, is_carousel_item: 'true' })).id);
    box = await call(`${t.user_id}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: post.caption });
  }
  await ready(box.id);
  const id = (await call(`${t.user_id}/media_publish`, { creation_id: box.id })).id;
  // 첫 댓글. 실패해도 게시물은 올라간 것으로 둔다.
  await call(`${id}/comments`, { message: commentOf(post, 'instagram') }).catch((e) => console.error(`[instagram] 댓글 실패: ${e.message}`));
  return id;
}

// 첫 댓글: 게시물에 comment 가 있으면 그것, 없으면 기본 문구.
const commentOf = (post, platform) => (typeof post.comment === 'string' ? post.comment : post.comment?.[platform]) ?? (platform === 'threads'
  ? '3분 통화로 먼저 확인하는 소개, 탑노트 → https://topnote.app/th'
  : '여러분은 어땠나요? 댓글로 알려 주세요.\n먼저 3분 통화해 보고 싶다면 프로필 링크 👆');

// 스레드: 같은 사진 묶음 + 해시태그 뺀 글(500자) + 스레드 전용 주소. 장기 토큰 60일 → 7일마다 새로.
const TH = 'https://graph.threads.net/v1.0';
const threadsText = (caption) => caption.replace(/\n*#[^\n]*$/, '').replace('프로필 링크에서 시작해요.', 'https://topnote.app/th').slice(0, 500);
async function postThreads(post, urls) {
  const t = tokens.threads;
  if (Date.now() - (t.refreshed_at ?? 0) > 7 * 864e5) {
    const r = await json(await fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${t.access_token}`));
    Object.assign(t, { access_token: r.access_token, refreshed_at: Date.now() });
    saveTokens(tokens);
  }
  const call = async (path, params) => json(await fetch(`${TH}/${path}`, {
    method: 'POST', body: new URLSearchParams({ ...params, access_token: t.access_token }),
  }));
  const ready = async (id) => {
    for (let i = 0; i < 100; i++) {
      await sleep(3000);
      // 막 만든 항목은 몇 초 동안 「없음」으로 나올 수 있다.
      const s = await json(await fetch(`${TH}/${id}?fields=status,error_message&access_token=${t.access_token}`)).catch(() => ({}));
      if (s.status === 'FINISHED') return;
      if (s.status === 'ERROR') throw new Error(`스레드 처리 실패: ${s.error_message}`);
    }
  };
  let id;
  if (isVideo(urls)) {
    const box = await call(`${t.user_id}/threads`, { media_type: 'VIDEO', video_url: urls[0], text: threadsText(post.caption) });
    await ready(box.id);
    id = (await call(`${t.user_id}/threads_publish`, { creation_id: box.id })).id;
  } else {
  const children = [];
  for (const url of urls) children.push((await call(`${t.user_id}/threads`, { media_type: 'IMAGE', image_url: url, is_carousel_item: 'true' })).id);
  for (const id of children) await ready(id);
  const box = await call(`${t.user_id}/threads`, { media_type: 'CAROUSEL', children: children.join(','), text: threadsText(post.caption) });
  await ready(box.id);
  id = (await call(`${t.user_id}/threads_publish`, { creation_id: box.id })).id;
  }
  // 첫 댓글(답글). threads_manage_replies 권한이 없으면 글만 올리고 넘어간다.
  try {
    const reply = await call(`${t.user_id}/threads`, { media_type: 'TEXT', text: commentOf(post, 'threads'), reply_to_id: id });
    await ready(reply.id);
    await call(`${t.user_id}/threads_publish`, { creation_id: reply.id });
  } catch (e) { console.error(`[threads] 댓글 실패: ${e.message}`); }
  return id;
}

// 인스타 스토리: 세로 표지 한 장(docs/stories/<id>.jpg).
async function postStory(post) {
  const { t, call, ready } = await igClient();
  const box = await call(`${t.user_id}/media`, { media_type: 'STORIES', image_url: storyOf(post.id) });
  await ready(box.id);
  return (await call(`${t.user_id}/media_publish`, { creation_id: box.id })).id;
}

// 틱톡: 음악 릴스 영상이 있으면 영상, 없으면 사진 묶음. 둘 다 「나만 보기」 바로 게시 + 글·태그 포함(scripts/tiktok.mjs).
async function postTiktok(post, urls) {
  const name = `카드 ${post.id} · ${post.title}`;
  const caption = tiktokCaption(post.caption, { seed: `카드 ${post.id}` });
  // 틱톡은 카드를 사진 묶음으로 보낸다(2026-11-03 대표 「이전에는 캡션 붙여서 줬잖아」): 사진 초안은 글·태그가 같이 붙고, 영상 초안은 글이 안 붙는다. 음악은 auto_add_music.
  const photos = imagesOf(post.id);
  // AI 릴스는 틱톡에도 영상으로(글은 docs/tt.html 에서 복사)
  if (aiOf(post.id)) return postToTiktok(tokens, { kind: 'video', urls: [reelOf(post.id)], caption, name, cover: reelCoverOf(post.id) });
  return postToTiktok(tokens, { kind: 'photo', urls: photos, caption, title: post.title, name, cover: photos[0] });
}

let failed = false;
// story·threads 는 인스타 토큰·스레드 토큰을 쓴다.
const tokenOf = { instagram: 'instagram', story: 'instagram', threads: 'threads', tiktok: 'tiktok' };
for (const [platform, fn] of [['instagram', postInstagram], ['story', postStory], ['threads', postThreads], ['tiktok', postTiktok]]) {
  if (only && only !== platform) continue;
  const post = nextFor(platform);
  if (!post) { console.log(`[${platform}] 올릴 게시물이 없어요. content.json 에 새 게시물을 넣으세요.`); continue; }
  const urls = platform === 'story' ? [storyOf(post.id)] : reelOf(post.id) ? [reelOf(post.id)] : imagesOf(post.id);
  if (dry) { console.log(`[${platform}] ${post.id} ${post.title}\n  ${urls.join('\n  ')}`); continue; }
  if (!tokens[tokenOf[platform]]) { console.log(`[${platform}] 토큰이 없어 건너뜀 (node scripts/auth.mjs ${tokenOf[platform]})`); continue; }
  try {
    const head = await fetch(urls[0], { method: 'HEAD' });
    if (!head.ok) throw new Error(`주소가 아직 안 열려요: ${urls[0]} (${head.status})`);
    const id = await fn(post, urls);
    state[platform].push(post.id);
    if (!pickId) state.last_day = today;
    writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
    console.log(`[${platform}] ${post.id} 올림 → ${id}`);
  } catch (e) {
    failed = true;
    console.error(`[${platform}] ${post.id} 실패: ${e.message}`);
  }
}
if (failed) process.exit(1);
