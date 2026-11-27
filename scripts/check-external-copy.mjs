// 밖에 내는 글(블라인드·스레드·인스타·광고) 올리기 전 검사기. 걸리면 종료 코드 1.
// 원본: topnote-app/scripts/check-external-copy.mjs (서버에서 스레드 큐가 쓰려고 복사, 원본을 고치면 같이 복사)
// 2026-11-27 대표 「왜 자꾸 실수해?」: 옛 이름·옛 문구·금지 표현을 사람 기억 대신 기계가 막는다.
//   node scripts/check-external-copy.mjs <파일(.txt/.json/.html)> ...
//   node scripts/check-external-copy.mjs --text "글"
// 다른 스크립트에서: import { checkExternalCopy } from 'C:/topnote-app/scripts/check-external-copy.mjs'
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const TAGLINE = '검증된 사람과 3분 통화 소개팅부터';

// [정규식, 이유] — 이유는 지금 기준(docs/지금_기준.md 맨 위)과 대표 지시.
const RULES = [
  [/탑노트|TOP ?NOTE|topnote\.app/i, '옛 이름 → 「비트」(beet.my)'],
  [/4인 ?(수다|토크)/, '옛 이름 → 「2:2 미팅」'],
  [/정부\s?기관|정부\s?인증|실시간 정부/, '옛 문구 → 「전자서명으로 검증된」'],
  [/간편\s?인증|본인\s?인증된|인증된 사람/, '→ 「검증된 사람」'],
  [/통화권|연장권|3분 더/, '없어진 상품·기능'],
  [/무료|공짜|\d[\d,]*\s?원|₩\s?\d|\$\s?\d/, '금액·「무료」 쓰지 않기'],
  [/만든 사람|직접 만든|만들었어|만들어 봤|운영자인데/, '「앱 만든 사람」 시점 금지(블라인드)'],
  [/성비|남초|여초|남녀 비율/, '성비는 외부 문구에 쓰지 않기'],
  [/로소|로테(?!이션)/, '줄임말 → 「로테이션 소개팅」'],
  [/#AI|AI ?연출|AI로 만든|AI 영상/, 'AI 안내 문구 금지'],
  [/마감 ?임박|오늘까지만|곧 마감/, '가짜 마감 금지'],
];

export function checkExternalCopy(text, { where = '' } = {}) {
  const problems = [];
  const lines = String(text).split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [re, why] of RULES) {
      const m = line.match(re);
      if (m) problems.push(`${where}${where ? ':' : ''}${i + 1} 「${m[0]}」 ${why} — ${line.trim().slice(0, 60)}`);
    }
  });
  if (/비트/.test(text) && !text.replace(/\s+/g, ' ').includes(TAGLINE)) problems.push(`${where} 「비트」를 소개하는데 「${TAGLINE}.」가 없음`);
  return problems;
}

// JSON(스레드 큐 등)은 글자만 모아 한 글씩 검사한다.
function textsOf(file) {
  const raw = readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    const out = [];
    const walk = (v, path) => {
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out.push([path, v.join('\n')]);
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
      else if (v && typeof v === 'object') { if (v.posted || v.skip) return; for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`); }
      else if (typeof v === 'string' && v.length > 20) out.push([path, v]);
    };
    walk(JSON.parse(raw), file);
    return out;
  }
  if (file.endsWith('.html')) return [[file, raw.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<div class="(rules|why|sub)"[\s\S]*?<\/div>/g, '').replace(/<br>/g, '\n').replace(/<[^>]+>/g, '')]];
  return [[file, raw]];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const items = args[0] === '--text' ? [['글', args.slice(1).join(' ')]] : args.flatMap(textsOf);
  if (!items.length) { console.log('사용법: node scripts/check-external-copy.mjs <파일> | --text "글"'); process.exit(2); }
  const all = items.flatMap(([where, t]) => checkExternalCopy(t, { where }));
  if (all.length) { console.log(`✗ 걸린 곳 ${all.length}개\n` + all.map((x) => '  - ' + x).join('\n')); process.exit(1); }
  console.log(`✓ 통과 (${items.length}개 글)`);
}
