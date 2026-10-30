// 영상 한 편을 인스타 릴스(피드에도 보임)로 바로 올린다. 광고 전에 피드 반응부터 볼 때 쓴다(2026-10-31 대표 「일단 피드에 먼저 올려봐」).
// 실행: node scripts/reel.mjs <영상 주소(https, mp4)> <캡션 파일> [첫 댓글]
import { readFileSync } from 'node:fs';
import { loadLocalEnv, loadTokens } from './tokens.mjs';

loadLocalEnv();
const [url, captionFile, comment] = process.argv.slice(2);
if (!url || !captionFile) throw new Error('사용법: node scripts/reel.mjs <영상 주소> <캡션 파일> [첫 댓글]');
const caption = readFileSync(captionFile, 'utf8').trim();
const t = loadTokens().instagram;
const IG = t.access_token.startsWith('EAA') ? 'https://graph.facebook.com/v23.0' : 'https://graph.instagram.com/v23.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(`${res.status} ${JSON.stringify(body.error ?? body)}`);
  return body;
}
const call = async (path, params) => json(await fetch(`${IG}/${path}`, {
  method: 'POST', body: new URLSearchParams({ ...params, access_token: t.access_token }),
}));

const head = await fetch(url, { method: 'HEAD' });
if (!head.ok) throw new Error(`영상 주소가 아직 안 열려요: ${url} (${head.status})`);
const box = await call(`${t.user_id}/media`, { media_type: 'REELS', video_url: url, caption, share_to_feed: 'true' });
// 영상은 처리에 1~2분 걸린다.
for (let i = 0; ; i++) {
  const s = await json(await fetch(`${IG}/${box.id}?fields=status_code,status&access_token=${t.access_token}`));
  if (s.status_code === 'FINISHED') break;
  if (s.status_code === 'ERROR' || i > 60) throw new Error(`인스타 처리 실패: ${s.status ?? s.status_code}`);
  await sleep(5000);
}
const id = (await call(`${t.user_id}/media_publish`, { creation_id: box.id })).id;
if (comment) await call(`${id}/comments`, { message: comment }).catch((e) => console.error(`댓글 실패: ${e.message}`));
const link = await json(await fetch(`${IG}/${id}?fields=permalink&access_token=${t.access_token}`)).catch(() => ({}));
console.log(`올림 → ${id} ${link.permalink ?? ''}`);
