// 틱톡 올리기(2026-11-03 대표 「나는 게시만 할 수 있게 무조건 글 적어줘」).
// 기본: 「나만 보기」(SELF_ONLY) 바로 게시 + 글(캡션·태그) 포함 → 대표는 틱톡에서 공개 범위만 「전체 공개」로 바꾼다.
//   앱 심사 전(Sandbox·미심사)에는 SELF_ONLY 만 허용된다. 앱 심사는 신청하지 않는다.
// 바로 게시가 거절되면(권한·한도 등) 예전처럼 받은 편지함 초안으로 보내고, 정확한 오류를 로그에 남긴다.
// TIKTOK_MODE: private(기본) | public(앱 심사 통과 뒤, 전체 공개) | inbox(예전 초안 방식)
import { saveTokens } from './tokens.mjs';
import { saveTiktokCaption } from './tiktok-caption.mjs';

const TT = 'https://open.tiktokapis.com/v2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.error?.code && body.error.code !== 'ok')) throw new Error(`${res.status} ${JSON.stringify(body.error ?? body)}`);
  return body;
}

async function client(tokens) {
  const t = tokens.tiktok;
  if (!t) throw new Error('틱톡 토큰 없음 (node scripts/auth.mjs tiktok)');
  // 접근 토큰은 24시간. 1시간 남으면 새로 받는다.
  if ((t.expires_at ?? 0) - Date.now() < 36e5) {
    const r = await json(await fetch(`${TT}/oauth/token/`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY, client_secret: process.env.TIKTOK_CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: t.refresh_token }),
    }));
    Object.assign(t, { access_token: r.access_token, refresh_token: r.refresh_token ?? t.refresh_token, expires_at: Date.now() + r.expires_in * 1000, scope: r.scope ?? t.scope });
    saveTokens(tokens);
  }
  return async (path, body) => json(await fetch(`${TT}/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${t.access_token}`, 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(body),
  }));
}

async function waitFor(call, publish_id, tries = 100) {
  let last;
  for (let i = 0; i < tries; i++) {
    last = (await call('post/publish/status/fetch/', { publish_id })).data;
    if (['PUBLISH_COMPLETE', 'SEND_TO_USER_INBOX'].includes(last.status)) return last;
    if (last.status === 'FAILED') throw new Error(`틱톡 실패: ${last.fail_reason}`);
    await sleep(3000);
  }
  throw new Error(`틱톡 처리 대기 시간 초과 (${publish_id}, 마지막 상태 ${last?.status})`);
}

// kind: 'video' | 'photo', urls: 영상 1개 또는 사진들, caption: tiktokCaption() 결과, title: 사진 게시물 제목(90자), name: 기록용 이름
export async function postToTiktok(tokens, { kind, urls, caption, title, name, cover }) {
  const call = await client(tokens);
  const mode = { direct: 'public', upload: 'inbox' }[process.env.TIKTOK_MODE] ?? process.env.TIKTOK_MODE ?? 'private';
  const source = kind === 'video'
    ? { source: 'PULL_FROM_URL', video_url: urls[0] }
    : { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: urls };
  const inbox = async () => {
    const r = kind === 'video'
      ? await call('post/publish/inbox/video/init/', { source_info: source })
      : await call('post/publish/content/init/', { post_info: { title: (title ?? '').slice(0, 90), description: caption.slice(0, 4000) }, media_type: 'PHOTO', post_mode: 'MEDIA_UPLOAD', source_info: source });
    const st = await waitFor(call, r.data.publish_id);
    saveTiktokCaption({ id: name, publishId: r.data.publish_id, caption, cover, mode: 'inbox' });
    return `${r.data.publish_id} ${st.status} (초안 · 글은 docs/tt.html 에서 복사)`;
  };
  if (mode === 'inbox') return inbox();

  let publish_id, privacy;
  try {
    const opts = (await call('post/publish/creator_info/query/', {})).data.privacy_level_options ?? [];
    privacy = mode === 'public' && opts.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY';
    if (!opts.includes(privacy)) throw new Error(`공개 범위 ${privacy} 를 쓸 수 없어요 (허용: ${opts.join(',')})`);
    const common = { privacy_level: privacy, disable_comment: false };
    const r = kind === 'video'
      ? await call('post/publish/video/init/', { post_info: { ...common, title: caption.slice(0, 2200), disable_duet: false, disable_stitch: false, video_cover_timestamp_ms: 1000 }, source_info: source })
      : await call('post/publish/content/init/', { post_info: { ...common, title: (title ?? '').slice(0, 90), description: caption.slice(0, 4000), auto_add_music: true }, media_type: 'PHOTO', post_mode: 'DIRECT_POST', source_info: source });
    publish_id = r.data.publish_id;
  } catch (e) {
    // video.publish 권한이 없거나 한도에 걸리면 여기로. 초안으로라도 보낸다.
    console.error(`[틱톡] 바로 게시 거절 → 초안으로 보냄: ${e.message}`);
    return inbox();
  }
  const st = await waitFor(call, publish_id);
  saveTiktokCaption({ id: name, publishId: publish_id, caption, cover, mode: privacy === 'SELF_ONLY' ? 'private' : 'public' });
  return `${publish_id} ${st.status} (${privacy === 'SELF_ONLY' ? '나만 보기 · 글 포함 · 전체 공개로 바꾸면 끝' : '전체 공개'})`;
}
