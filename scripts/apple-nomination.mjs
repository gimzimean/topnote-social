// 애플 「추천 앱」 신청을 달마다 낸다(2026-11-27 대표 「광고 없이 전국민이 알게 · 다 자동화」).
// 다음 달 시즌(아래 THEMES)으로, 3주 뒤부터 한 달 기간. 같은 기간에 이미 낸 신청이 있으면 건너뛴다.
//   ASC_KEY_ID · ASC_ISSUER_ID · ASC_KEY_P8 (GitHub 비밀)
import { createPrivateKey, sign } from 'node:crypto';

const APP = '6813747102';
const b64 = (v) => Buffer.from(v).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const un = `${b64(JSON.stringify({ alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' }))}.${b64(JSON.stringify({ iat: now - 30, exp: now + 1000, aud: 'appstoreconnect-v1', iss: process.env.ASC_ISSUER_ID }))}`;
const tok = `${un}.${sign('sha256', Buffer.from(un), { key: createPrivateKey(process.env.ASC_KEY_P8), dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
const asc = async (method, path, body) => {
  const r = await fetch('https://api.appstoreconnect.apple.com' + path, { method, headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); const j = t ? JSON.parse(t) : {};
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${JSON.stringify(j.errors ?? j).slice(0, 500)}`);
  return j;
};

const BASE = '검증된 사람과 3분 통화 소개팅부터. 사진 없이 목소리로 3분 먼저 만나는 한국의 전화 소개팅 앱입니다. 전자서명으로 검증된 사람과 1:1로 3분 통화하고, 대화가 통한 사람끼리만 사진이 열리며, 둘 다 동의해야 번호를 주고받습니다. 처음 만난 넷이 10분 동안 이야기하는 2:2 미팅도 매일 저녁 열립니다. 지인은 자동으로 피하고, 통화는 녹음하지 않으며, 모든 화면에서 바로 신고·차단할 수 있습니다.';
// 시작 달(1~12) → 시즌 한 줄
const THEMES = {
  1: '새해에 새 사람을 만나고 싶은 직장인을 위한 전화 소개팅', 2: '설 연휴 뒤, 잔소리 대신 3분 통화로 시작하는 소개팅',
  3: '봄 시작, 퇴근 후 집에서 3분이면 되는 소개팅', 4: '벚꽃 시즌 전에 말이 통하는 사람 먼저 찾기',
  5: '가정의 달, 외모보다 대화가 먼저인 만남', 6: '여름 휴가 전에 같이 보낼 사람 찾기',
  7: '더운 여름, 나가지 않고 집에서 하는 소개팅', 8: '휴가철 끝, 새 사람과 3분 통화',
  9: '추석 연휴 전, 목소리로 먼저 만나는 소개팅', 10: '가을, 넷이서 10분 2:2 미팅으로 새 친구와 인연',
  11: '연말을 앞두고 혼자인 2030·40을 위한 전화 솔로파티', 12: '크리스마스·연말, 같이 보낼 사람을 3분 통화로',
};

const start = new Date(Date.now() + 21 * 864e5); start.setUTCHours(0, 0, 0, 0);
const end = new Date(start.getTime() + 30 * 864e5);
const kst = new Date(start.getTime() + 9 * 36e5); const m = kst.getUTCMonth() + 1;

const list = await asc('GET', `/v1/nominations?filter[state]=SUBMITTED&limit=50`);
const overlap = (list.data ?? []).find((n) => new Date(n.attributes.publishStartDate) < end && new Date(n.attributes.publishEndDate ?? n.attributes.publishStartDate) > start);
if (overlap) { console.log('같은 기간 신청이 이미 있어 건너뜀:', overlap.id, overlap.attributes.publishStartDate); process.exit(0); }

const r = await asc('POST', '/v1/nominations', { data: { type: 'nominations', attributes: {
  name: `비트 — ${THEMES[m]}`.slice(0, 60), type: 'APP_ENHANCEMENTS', description: BASE, submitted: true,
  publishStartDate: start.toISOString(), publishEndDate: end.toISOString(), deviceFamilies: ['IPHONE'], locales: ['ko'],
  hasInAppEvents: false, preOrderEnabled: false,
  notes: `${THEMES[m]}. 한국 전용 서비스이며 모든 회원은 전자서명으로 검증받습니다. 문의: 김석 대표 jimi8167@naver.com`,
}, relationships: { relatedApps: { data: [{ type: 'apps', id: APP }] }, supportedTerritories: { data: [{ type: 'territories', id: 'KOR' }] } } } });
console.log('추천 신청 제출', r.data.id, r.data.attributes.state, start.toISOString().slice(0, 10), '~', end.toISOString().slice(0, 10));
