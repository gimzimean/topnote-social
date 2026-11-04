// 예약 게시물 미리보기 페이지(docs/preview.html): 날짜순 영상 + 게시물마다 「글 복사」 버튼(2026-11-04 대표).
// 실행: node scripts/preview.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const c = JSON.parse(readFileSync(resolve(root, 'content.json'), 'utf8'));
const s = JSON.parse(readFileSync(resolve(root, 'state.json'), 'utf8'));
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const W = ['일', '월', '화', '수', '목', '금', '토'];
const ps = c.posts.filter((p) => p.aiReel && p.on && !s.instagram.includes(p.id)).sort((a, b) => a.on.localeCompare(b.on));
const cards = ps.map((p, i) => {
  const d = new Date(`${p.on}T12:00:00Z`);
  const tt = p.comment?.tiktok;
  return `<div class=c><div class=d>${p.on.slice(5).replace('-', '/')} (${W[d.getUTCDay()]}) · 20:00${p.redoOf ? ' · <b>다시 올림</b>' : ''}</div>
<video src="ai-reels/${p.aiReel}.mp4" poster="ai-reels/${p.aiReel}-cover.jpg" controls playsinline preload=none></video>
<div class=t>${esc(p.title)}</div>
<textarea id=g${i} readonly>${esc(p.caption)}</textarea><button data-t=g${i}>글 복사</button>
${tt ? `<textarea id=k${i} readonly class=small>${esc(tt)}</textarea><button data-t=k${i} class=sub>첫 댓글 복사</button>` : ''}</div>`;
}).join('\n');
writeFileSync(resolve(root, 'docs/preview.html'), `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex>
<meta property="og:title" content="탑노트 11~12월 게시물 미리보기"><meta property="og:description" content="빼빼로데이부터 크리스마스 이브까지, 사람 나오는 영상 ${ps.length}편"><meta property="og:image" content="https://gimzimean.github.io/topnote-social/ai-reels/talk-ai1-cover.jpg">
<title>탑노트 예약 게시물 미리보기</title>
<style>body{margin:0;background:#171411;color:#F3EBDD;font-family:system-ui,sans-serif}h1{font-size:20px;padding:18px 16px 4px}p{padding:0 16px;color:#b9ad9c;font-size:13px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;padding:16px}.c{background:#241f1b;border-radius:14px;padding:10px}
.d{font-size:13px;color:#E9B44C;margin-bottom:6px}.d b{color:#fff;background:#8a3b2e;padding:1px 6px;border-radius:6px;font-weight:600}
video{width:100%;aspect-ratio:9/16;border-radius:10px;background:#000;object-fit:cover}.t{font-weight:700;margin:8px 0 6px}
textarea{width:100%;height:120px;box-sizing:border-box;background:#171411;color:#d8cdbd;border:1px solid #3a322b;border-radius:10px;padding:8px;font-size:12px}textarea.small{height:60px;margin-top:8px}
button{width:100%;margin-top:6px;padding:11px;border:0;border-radius:10px;background:#E9B44C;color:#171411;font-size:15px;font-weight:800}button.sub{background:#3a322b;color:#F3EBDD}</style>
<h1>예약 게시물 ${ps.length}개</h1><p>표지를 누르면 영상이 재생돼요. 「글 복사」를 누르면 그 게시물 글이 통째로 복사돼요.</p>
<div class=g>${cards}</div>
<script>document.querySelectorAll('button[data-t]').forEach(b=>b.onclick=async()=>{const t=document.getElementById(b.dataset.t);const l=b.textContent;try{await navigator.clipboard.writeText(t.value)}catch(e){t.select();t.setSelectionRange(0,99999);document.execCommand('copy')}b.textContent='복사됐어요';setTimeout(()=>b.textContent=l,1800)})</script>`);
console.log('미리보기', ps.length);
