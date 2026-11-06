// 메타 광고(인스타 노출)마다 앱 설치 유도 댓글 1개(2026-11-06 대표 「댓글로 앱 설치 유도」). 이미 단 광고는 건너뜀(ad-comments.json).
// 인스타 게시 토큰(tokens.enc instagram)으로 단다. 페이스북 페이지 댓글은 페이지 권한이 없어 못 단다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadLocalEnv, loadTokens } from './tokens.mjs';
loadLocalEnv?.();
const root = resolve(import.meta.dirname, '..');
const IGT = loadTokens().instagram.access_token, G = 'https://graph.facebook.com/v23.0';
const env = Object.fromEntries(readFileSync('C:/zzend-keys/topnote-meta-ads.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const AT = env.META_ADS_TOKEN;
const MSG = '📲 위 「설치하기」를 누르거나 스토어에서 「탑노트」를 검색해 보세요.\n사진 말고 목소리로 3분 먼저 · 매일 한 명 무료 · 4인 수다 첫 1회 무료예요.';
const logPath = resolve(root, 'ad-comments.json');
const done = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : {};
const ads = (await (await fetch(`${G}/act_1669114048255983/ads?fields=id,name,effective_status,creative{effective_instagram_media_id}&limit=200&effective_status=${encodeURIComponent(JSON.stringify(['ACTIVE', 'PENDING_REVIEW', 'ADSET_PAUSED']))}&access_token=${AT}`)).json()).data;
let n = 0, fail = 0;
for (const a of ads) {
  const m = a.creative?.effective_instagram_media_id;
  if (!m || done[m]) continue;
  const r = await (await fetch(`${G}/${m}/comments`, { method: 'POST', body: new URLSearchParams({ message: MSG, access_token: IGT }) })).json();
  if (r.id) { done[m] = { ad: a.id, comment: r.id, at: new Date().toISOString() }; n++; writeFileSync(logPath, JSON.stringify(done, null, 2)); }
  else { fail++; console.log('실패', a.name, r.error?.message); }
  await new Promise((s) => setTimeout(s, 1500));
}
console.log(`댓글 ${n}개 달음 · 실패 ${fail} · 인스타 미디어 없는 광고 ${ads.filter((a) => !a.creative?.effective_instagram_media_id).length}`);
