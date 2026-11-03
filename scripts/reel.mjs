// 영상 한 편을 모든 곳에 올린다(2026-10-31 대표 「항상 썸네일 넣고, 게시물 올리면 스토리·스레드 등 다 올리기 — 무조건 규칙」).
// 순서: 인스타 릴스(표지 이미지 필수, 피드에도 보임) + 첫 댓글 → 인스타 스토리(같은 영상) → 스레드(같은 영상 + 해시태그 뺀 글) + 첫 답글(topnote.app/th)
//   → 틱톡(나만 보기 + 글·태그 포함, 대표는 전체 공개로만 바꿈). 환경변수 TIKTOK_QUESTION: 글에 질문이 없을 때 붙일 질문.
// 실행: node scripts/reel.mjs <영상 주소(https mp4)> <표지 주소(https jpg)> <캡션 파일> [인스타 첫 댓글] [--reel <이미 올린 릴스 id>]
//   --reel: 릴스는 이미 올렸으면 건너뛰고 스토리·스레드만 올린다.
import { readFileSync } from 'node:fs';
import { loadLocalEnv, loadTokens } from './tokens.mjs';
import { tiktokCaption } from './tiktok-caption.mjs';
import { postToTiktok } from './tiktok.mjs';

loadLocalEnv();
const args = process.argv.slice(2);
const ri = args.indexOf('--reel');
const doneReel = ri >= 0 ? args.splice(ri, 2)[1] : null;
const [url, cover, captionFile, comment = '여러분은 어땠나요? 댓글로 알려 주세요 👇'] = args;
if (!url || !cover || !captionFile) throw new Error('사용법: node scripts/reel.mjs <영상 주소> <표지 주소> <캡션 파일> [첫 댓글] [--reel id]');
const caption = readFileSync(captionFile, 'utf8').trim();
const tokens = loadTokens();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.error && body.error.code !== 'ok')) throw new Error(`${res.status} ${JSON.stringify(body.error ?? body)}`);
  return body;
}
for (const u of [url, cover]) {
  const head = await fetch(u, { method: 'HEAD' });
  if (!head.ok) throw new Error(`주소가 아직 안 열려요: ${u} (${head.status})`);
}

// ── 인스타 ──
const it = tokens.instagram;
const IG = it.access_token.startsWith('EAA') ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
const ig = async (path, params) => json(await fetch(`${IG}/${path}`, {
  method: 'POST', body: new URLSearchParams({ ...params, access_token: it.access_token }),
}));
const igPublish = async (params) => {
  const box = await ig(`${it.user_id}/media`, params);
  // 영상은 처리에 1~2분 걸린다.
  for (let i = 0; ; i++) {
    const s = await json(await fetch(`${IG}/${box.id}?fields=status_code,status&access_token=${it.access_token}`));
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || i > 60) throw new Error(`인스타 처리 실패: ${s.status ?? s.status_code}`);
    await sleep(5000);
  }
  return (await ig(`${it.user_id}/media_publish`, { creation_id: box.id })).id;
};

let failed = false;
const onlyTiktok = process.env.ONLY_TIKTOK === '1'; // 틱톡만 다시 보낼 때
const step = async (name, fn) => {
  if (onlyTiktok && name !== '틱톡') return;
  if (process.env.ONLY && name !== process.env.ONLY) return; // 한 곳만 다시 보낼 때(예: ONLY=스레드)
  try { console.log(`[${name}] ${await fn()}`); } catch (e) { failed = true; console.error(`[${name}] 실패: ${e.message}`); }
};

await step('릴스', async () => {
  if (doneReel) return `이미 올림 ${doneReel}`;
  const id = await igPublish({ media_type: 'REELS', video_url: url, cover_url: cover, caption, share_to_feed: 'true' });
  await ig(`${id}/comments`, { message: comment }).catch((e) => console.error(`[릴스] 댓글 실패: ${e.message}`));
  const link = await json(await fetch(`${IG}/${id}?fields=permalink&access_token=${it.access_token}`)).catch(() => ({}));
  return `${id} ${link.permalink ?? ''}`;
});
await step('스토리', () => igPublish({ media_type: 'STORIES', video_url: url }));

// ── 스레드: 해시태그 뺀 글(500자) + 스레드 전용 주소 ──
await step('스레드', async () => {
  const t = tokens.threads;
  const TH = 'https://graph.threads.net/v1.0';
  const call = async (path, params) => json(await fetch(`${TH}/${path}`, {
    method: 'POST', body: new URLSearchParams({ ...params, access_token: t.access_token }),
  }));
  const publish = async (params) => {
    const box = await call(`${t.user_id}/threads`, params);
    for (let i = 0; ; i++) {
      await sleep(5000);
      const s = await json(await fetch(`${TH}/${box.id}?fields=status,error_message&access_token=${t.access_token}`)).catch((e) => ({ status: i > 3 ? 'ERROR' : undefined, error_message: e.message }));
      if (s.status === 'FINISHED') break;
      if (s.status === 'ERROR' || i > 60) throw new Error(`스레드 처리 실패: ${s.error_message ?? s.status}`);
    }
    return (await call(`${t.user_id}/threads_publish`, { creation_id: box.id })).id;
  };
  const text = caption.replace(/\n*#[^\n]*$/, '').replace('프로필 링크에서 시작해요.', '').trim().slice(0, 500);
  const id = await publish({ media_type: 'VIDEO', video_url: url, text });
  await publish({ media_type: 'TEXT', text: '앱 받기 → https://topnote.app/th', reply_to_id: id })
    .catch((e) => console.error(`[스레드] 답글 실패: ${e.message}`));
  return id;
});
// ── 틱톡: 「나만 보기」 바로 게시 + 글·태그 포함(scripts/tiktok.mjs). 거절되면 초안으로. ──
await step('틱톡', async () => {
  if (!tokens.tiktok) return '토큰 없음 · 건너뜀';
  const name = process.env.REEL_NAME || url.split('/').pop().replace(/\.mp4$/, '');
  // 같은 영상을 틱톡에 두 번 보내지 않는다(미리 초안으로 보낸 편 · 2026-11-03).
  const sent = JSON.parse(readFileSync(new URL('../docs/tiktok/captions.json', import.meta.url), 'utf8')).some((x) => x.id === name);
  if (sent && process.env.TIKTOK_RESEND !== '1') return '이미 틱톡에 보냄 · 건너뜀'; // 대표가 초안을 지웠을 때만 TIKTOK_RESEND=1
  const text = tiktokCaption(caption, { seed: name, question: process.env.TIKTOK_QUESTION });
  return postToTiktok(tokens, { kind: 'video', urls: [url], caption: text, name, cover });
});
if (failed) process.exitCode = 1;
