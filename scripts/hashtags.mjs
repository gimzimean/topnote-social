// 해시태그 고르기(2026-11-03 대표 「태그도 다른 거여야지」).
// 글 내용에 맞는 주제 묶음에서 5~7개를 고르고, 마지막은 항상 #탑노트.
// 바로 앞 게시물과 겹치는 태그는 #탑노트 빼고 최대 2개(합쳐서 3개)까지만.
// 넓은 태그(#연애 #소개팅 …) 1~2개 + 좁은 태그(#소개팅꿀팁 #썸타는중 #퇴근후 …)를 섞는다. #fyp 같은 태그 더미는 쓰지 않는다.

const B = (t) => ({ t, broad: true });
const N = (t) => ({ t, broad: false });
const M = (t) => ({ t, broad: false, must: true }); // 글에 그 주제가 나오면 꼭 넣는 태그(시즌·제도)

// [주제, 글에서 찾을 말, 태그]
export const POOLS = [
  ['소개팅', /소개팅|첫 ?만남|애프터|첫 ?데이트|면접/g, [B('#소개팅'), N('#첫만남'), N('#소개팅꿀팁'), N('#소개팅질문'), N('#첫데이트'), N('#애프터신청')]],
  ['썰', /깼|썰|상황극|나갔더니|식었|반말|한숨/g, [N('#소개팅썰'), N('#소개팅후기'), N('#공감'), N('#현실연애')]],
  ['팁', /팁|하세요|이유|신호|하는 법|가지/g, [N('#연애꿀팁'), N('#소개팅꿀팁'), N('#연애상담')]],
  ['연애', /연애|썸|설렘|설레|호감|이상형|마음/g, [B('#연애'), B('#썸'), N('#썸타는중'), N('#연애고민'), N('#설렘'), N('#연애중')]],
  ['연락', /연락(?!처)|카톡|답이 늦|답장|끊겼/g, [N('#카톡답장'), N('#연락문제'), N('#연락두절'), N('#밀당')]],
  ['직장인', /직장인|퇴근|회사|출근|월요일|점심|평일/g, [B('#직장인'), N('#퇴근후'), N('#직장인일상'), N('#직장인연애'), N('#회사생활')]],
  ['목소리', /목소리|통화|3분|말투|말이 통|대화|듣는/g, [N('#목소리'), N('#3분통화'), N('#보이스소개팅'), N('#말투'), N('#티키타카'), B('#대화'), N('#말통하는사람')]],
  ['4인수다', /4인|넷이|넷|모임|단체|여럿/g, [M('#4인수다'), B('#모임'), N('#새로운만남'), N('#수다타임'), N('#친목')]],
  ['친구', /친구/g, [N('#친구만들기'), N('#새친구'), B('#친구')]],
  ['빼빼로', /빼빼로|1111|11월 ?11일/g, [M('#빼빼로데이'), N('#1111'), N('#11월11일'), N('#솔로')]],
  ['앱', /데이팅 ?앱|소개팅 ?앱|앱은|프로필|스펙/g, [B('#데이팅앱'), N('#소개팅앱'), N('#데이팅앱후기')]],
  ['사진', /사진|얼굴/g, [N('#사진말고목소리'), N('#첫인상'), N('#외모보다대화')]],
  ['안심', /간편인증|지인|아는 사람|연락처|회사 선배/g, [M('#간편인증'), N('#지인피하기'), N('#안심소개팅')]],
  ['매너', /매너|예의|반말|직원/g, [N('#매너'), N('#첫인상'), N('#소개팅매너')]],
  ['30대', /서른|30대/g, [N('#30대연애'), N('#30대')]],
  ['이별', /그만 만나|이별|헤어/g, [N('#이별'), N('#연애고민')]],
  ['데이트비용', /비용|계산|더치/g, [N('#데이트비용'), N('#더치페이'), B('#데이트')]],
  ['시간', /준비 ?2시간|시간 ?낭비|피곤/g, [N('#시간낭비없음'), N('#퇴근후'), N('#현실연애')]],
];
const GENERAL = [N('#만나기전에'), B('#연애'), B('#소개팅'), N('#새로운만남'), B('#대화'), N('#설렘')];
export const BRAND = '#탑노트';

const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed) => { let a = hash(seed); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const shuffle = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export const tagsOf = (text) => (String(text ?? '').match(/#[^\s#]+/g) ?? []);

// text: 글 본문(태그 줄 빼고), seed: 게시물 이름, avoid: 바로 앞 게시물 태그
export function pickHashtags(text, { seed = text, avoid = [] } = {}) {
  const r = rng(seed);
  // 「다음 편 ▶ …」 예고 줄과 「탑노트 — …」 줄은 이 글의 주제가 아니라서 빼고 본다.
  text = String(text).split(/\n/).filter((l) => !/^다음 편|^탑노트 —|^출처/.test(l.trim())).join(' ');
  const avoidSet = new Set(avoid.filter((t) => t !== BRAND));
  const hits = POOLS.map(([name, re, tags]) => ({ name, n: (String(text).match(re) ?? []).length, tags }))
    .filter((p) => p.n > 0)
    .sort((a, b) => b.n - a.n || r() - 0.5);
  const total = 5 + Math.floor(r() * 3); // 5~7개(#탑노트 포함)
  const want = total - 1;
  // 많이 걸린 주제부터 돌아가며 한 개씩(한 주제 태그만 몰리지 않게). 맨 위 주제는 앞에 하나 더. 일반 태그는 맨 끝 채우기용.
  const queues = hits.map((p) => shuffle(p.tags, r));
  const order = [];
  if (queues[0]?.length > 1) order.push(queues[0].shift());
  while (queues.some((q) => q.length)) for (const q of queues) if (q.length) order.push(q.shift());
  order.push(...shuffle(GENERAL, r));
  const out = [];
  let shared = 0;
  const has = (t) => out.some((x) => x.t === t);
  const add = (x, allowShared) => {
    if (out.length >= want || has(x.t) || x.t === BRAND) return;
    if (avoidSet.has(x.t)) { if (!allowShared || shared >= 2) return; shared++; }
    out.push(x);
  };
  // 0) 꼭 넣을 태그(빼빼로데이·간편인증·4인수다)
  for (const p of hits) for (const x of p.tags) if (x.must) add(x, true);
  // 1) 넓은 태그 하나(가능하면 앞 게시물과 다른 것)
  const broad = order.filter((x) => x.broad && (hits.slice(0, 3).some((p) => p.tags.some((y) => y.t === x.t)) || ['#연애', '#소개팅'].includes(x.t)));
  (broad.find((x) => !avoidSet.has(x.t)) ? add(broad.find((x) => !avoidSet.has(x.t)), false) : broad[0] && add(broad[0], true));
  // 2) 겹치지 않는 좁은 태그 위주로 채움(넓은 태그는 최대 2개)
  for (const x of order) { if (x.broad && out.filter((y) => y.broad).length >= 2) continue; add(x, false); }
  // 3) 그래도 모자라면 겹치는 것 최대 2개까지
  for (const x of order) add(x, true);
  return [...out.map((x) => x.t), BRAND];
}

// 글 끝 태그 줄을 갈아 끼운다(태그 줄이 없으면 붙인다).
export function splitTags(caption) {
  const c = String(caption).replace(/\s+$/, '');
  const m = c.match(/\n\n(#[^\n]+)$/);
  return m ? { body: c.slice(0, m.index), tags: tagsOf(m[1]) } : { body: c, tags: [] };
}
export function withHashtags(caption, opts = {}) {
  const { body } = splitTags(caption);
  return `${body}\n\n${pickHashtags(body, opts).join(' ')}`;
}
// 이미 붙은 태그가 규칙에 맞는지(5~7개, 마지막 #탑노트, 앞 게시물과 #탑노트 빼고 2개 이하 겹침)
export function tagsOk(tags, avoid = []) {
  const a = new Set(avoid.filter((t) => t !== BRAND));
  return tags.length >= 5 && tags.length <= 7 && tags.at(-1) === BRAND && new Set(tags).size === tags.length
    && tags.filter((t) => a.has(t)).length <= 2;
}
