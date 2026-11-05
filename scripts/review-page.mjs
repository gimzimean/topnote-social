// 광고 검수 페이지(docs/review.html): 세트별 영상·문구·예산. 2026-11-05 대표 「수정한 것까지 보고 올리자」.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const v = Date.now();
const label = { 'talk-ai1': '4인 수다 특별편', 'xmas-ai4': '소개팅 2시간 vs 3분', 'xmas-ai1': '솔크 탈출 1화', 'redo-ai16': '퇴근 후 피곤한 소개팅', 'pair-ai1': '목소리만 들었는데 설렜다 (새 1:1)',
  'pepero-ai1': '빼빼로 진열대 앞', 'pepero-ai3': '오늘 SNS는 온통 빼빼로', 'xmas-ai2': '솔크 탈출 2화 · 연말 약속', 'xmas-ai3': '솔크 탈출 3화 · 소모임 3시간', 'xmas-ai5': '솔크 탈출 5화 · 친구 한 명',
  'bar-ai1': '혼술바 옆자리', 'xmas-ai8': '퇴근 혼밥 말고 넷이 수다', 'xmas-ai13': '크리스마스 전 4인 수다' };
const fresh = (k) => existsSync(resolve(root, 'docs/ai-reels', `${k}.mp4`)) && statSync(resolve(root, 'docs/ai-reels', `${k}.mp4`)).mtimeMs > Date.parse('2026-11-05T05:00:00Z');
const card = (k) => fresh(k)
  ? `<figure><video src="ai-reels/${k}.mp4?v=${v}" poster="ai-reels/${k}-cover.jpg?v=${v}" controls playsinline preload="none"></video><figcaption>${label[k]}<br><span class="ok">수정 완료</span></figcaption></figure>`
  : `<figure><div class="wait">만드는 중</div><figcaption>${label[k]}</figcaption></figure>`;
const MAIN = '만나기 전에, 3분 먼저. 간편인증한 사람과 목소리로 3분 통화하고, 넷이 하는 4인 수다도 있어요. 연락처 지인은 연결되지 않아요. (영상 속 인물은 AI로 만든 장면이에요)';
const sets = [
  { t: '① 본 세트 (안드로이드·아이폰 각 8,000원 · 스레드 2개 각 3,500원)', s: '지금 켜져 있음 · 승인하면 수정 영상으로 교체', vids: ['talk-ai1', 'xmas-ai4', 'xmas-ai1', 'redo-ai16', 'pair-ai1'], copy: MAIN, note: '남녀 나란히 새 1:1 편(맨 끝)은 추가 제안' },
  { t: '② 빼빼로데이 세트 (안드로이드·아이폰 각 3,000원 · 11/11까지)', s: '만들어 둠 · 일시정지', vids: ['pepero-ai1', 'pepero-ai3'], copy: '빼빼로데이, 줄 사람 없다면. 간편인증한 사람과 목소리로 3분 먼저 통화해 보세요. 말이 통하면 그때 사진. (영상 속 인물은 AI로 만든 장면이에요)' },
  { t: '③ 솔크 탈출 세트 (안드로이드·아이폰 각 3,000원 · 12/24까지)', s: '만들어 둠 · 일시정지', vids: ['xmas-ai1', 'xmas-ai2', 'xmas-ai3', 'xmas-ai5'], copy: '솔크 탈출, 올해는 다르게. 간편인증한 사람과 목소리로 3분 먼저 통화하고, 넷이 하는 4인 수다도 있어요. 크리스마스 전에 말 통하는 사람 만나요. (영상 속 인물은 AI로 만든 장면이에요)' },
  { t: '④ 4인 수다 세트 (안드로이드·아이폰 각 3,000원 · 12/24까지)', s: '승인하면 만듦', vids: ['talk-ai1', 'bar-ai1', 'xmas-ai8', 'xmas-ai13'], copy: '처음 만난 넷이 목소리로 10분 수다. 첫 4인 수다는 무료, 끝나고 서로 고르면 둘이 3분 더 이야기해요. 셋 이상 원하면 다 같이 연결돼요. (영상 속 인물은 AI로 만든 장면이에요)' },
];
const body = sets.map((x) => `<section><h2>${x.t}</h2><p class="sub">${x.s}${x.note ? ' · ' + x.note : ''}</p><div class="copy">광고 문구: ${x.copy}</div><div class="row">${x.vids.map(card).join('')}</div></section>`).join('');
writeFileSync(resolve(root, 'docs/review.html'), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>광고 검수 · 탑노트</title>
<style>body{word-break:keep-all;margin:0;background:#171411;color:#F3EBDD;font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;padding:18px 14px 60px}h1{font-size:22px;margin:0 0 6px}.top{color:#b9ad9a;font-size:14px;line-height:1.6}h2{font-size:16px;margin:28px 0 2px;color:#E9B44C}.sub{color:#b9ad9a;font-size:13px;margin:0 0 8px}.copy{background:#221d19;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.6;margin-bottom:10px}.row{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}figure{margin:0;flex:0 0 160px}video{width:160px;height:284px;object-fit:cover;border-radius:12px;background:#2b2522}.wait{width:160px;height:284px;border-radius:12px;background:#2b2522;display:flex;align-items:center;justify-content:center;color:#8a7f70;font-size:14px}figcaption{font-size:12px;margin-top:4px;line-height:1.4}.ok{color:#9fd49a}</style>
<h1>광고 검수</h1><div class="top">영상은 눌러서 소리와 함께 보세요. 4명 화면(처음 설렘 → 마지막 행복 + 「다 같이 연결」) · 1:1 남녀 나란히 · 친구 편 여자끼리 나란히가 들어갔어요.<br>틱톡: 안드로이드 이의 신청 중 · 승인 뒤 같은 영상으로 교체</div>${body}</html>`);
console.log('검수 페이지');
