// 인스타 시스템 사용자 토큰 바꾸기(2026-11-15, 통계 권한 instagram_manage_insights 추가용).
// 대표가 새 토큰을 C:\zzend-keys\ig-new-token.txt 에 붙여 넣고 저장 → node scripts/set-ig-token.mjs → git push
import { readFileSync, unlinkSync } from 'node:fs';
import { loadLocalEnv, loadTokens, saveTokens } from './tokens.mjs';
loadLocalEnv();
const FILE = 'C:/zzend-keys/ig-new-token.txt';
const token = readFileSync(FILE, 'utf8').trim();
const p = await (await fetch(`https://graph.facebook.com/v23.0/me/permissions?access_token=${token}`)).json();
if (p.error) throw new Error(`토큰이 안 맞아요: ${p.error.message}`);
const granted = p.data.filter((x) => x.status === 'granted').map((x) => x.permission);
const need = ['instagram_basic', 'instagram_content_publish', 'instagram_manage_comments', 'instagram_manage_insights'];
const missing = need.filter((x) => !granted.includes(x));
if (missing.length) throw new Error(`빠진 권한: ${missing.join(', ')} — 토큰을 만들 때 체크해 주세요`);
const t = loadTokens();
t.instagram = { ...t.instagram, access_token: token, refreshed_at: new Date().toISOString() };
saveTokens(t);
unlinkSync(FILE);
console.log('인스타 토큰 교체 완료 · 권한', granted.join(', '));
