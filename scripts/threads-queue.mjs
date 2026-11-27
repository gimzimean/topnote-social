// 정해 둔 시각에 스레드 연재(원글 + 답글)를 하나씩 올린다. 대표가 검수한 글만 넣는다.
// node scripts/threads-queue.mjs threads/queue-2026-11-27.json        (로컬: 끝날 때까지 기다리며 올림)
// node scripts/threads-queue.mjs --once threads/queue-*.json           (서버: 시각 지난 글만 올리고 끝, .github/workflows/threads-queue.yml)
// 큐 파일에서 글을 지우거나 "skip": true 로 바꾸면 그 글은 안 올라간다(올릴 차례마다 파일을 다시 읽음).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadLocalEnv, loadTokens } from './tokens.mjs';
import { checkExternalCopy } from './check-external-copy.mjs';

loadLocalEnv();
const once = process.argv.includes('--once');
const files = process.argv.slice(2).filter((a) => a !== '--once').map((f) => resolve(f));
const TH = 'https://graph.threads.net/v1.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = async (r) => { const b = await r.json(); if (!r.ok || b.error) throw new Error(`${r.status} ${JSON.stringify(b.error ?? b)}`); return b; };
const t = loadTokens().threads;
const call = async (path, params) => json(await fetch(`${TH}/${path}`, { method: 'POST', body: new URLSearchParams({ ...params, access_token: t.access_token }) }));
const publish = async (params) => { const box = await call(`${t.user_id}/threads`, params); await sleep(3000); return (await call(`${t.user_id}/threads_publish`, { creation_id: box.id })).id; };

for (const file of files) for (;;) {
  const q = JSON.parse(readFileSync(file, 'utf8'));
  const next = q.find((x) => !x.posted && !x.skip);
  if (!next) { console.log('큐 끝', file); break; }
  const wait = new Date(next.at).getTime() - Date.now();
  if (wait > 0 && once) { console.log(`[아직] ${next.key} → ${next.at}`); break; }
  if (wait > 0) { console.log(`[대기] ${next.key} → ${next.at} (${Math.round(wait / 60000)}분)`); await sleep(Math.min(wait, 10 * 60000)); continue; }
  const bad = checkExternalCopy(next.parts.join('\n'), { where: next.key });
  if (bad.length) { console.error('[검사 걸림 · 안 올림]', bad.join(' / ')); const f2 = JSON.parse(readFileSync(file, 'utf8')); Object.assign(f2.find((x) => x.key === next.key), { skip: true, blocked: bad }); writeFileSync(file, JSON.stringify(f2, null, 2) + '\n'); continue; }
  const id = await publish({ media_type: 'TEXT', text: next.parts[0].slice(0, 500), topic_tag: next.topic });
  console.log('[원글]', next.key, id);
  let parent = id;
  for (const text of next.parts.slice(1)) {
    await sleep((5 + Math.random() * 10) * 1000);
    try { parent = await publish({ media_type: 'TEXT', text: text.slice(0, 500), reply_to_id: parent }); console.log('[답글]', parent); }
    catch (e) { console.error('[답글 실패]', e.message); break; }
  }
  const fresh = JSON.parse(readFileSync(file, 'utf8'));
  Object.assign(fresh.find((x) => x.key === next.key), { posted: new Date().toISOString(), id });
  writeFileSync(file, JSON.stringify(fresh, null, 2) + '\n');
}
