// 틱톡 글(2026-11-02 대표 「올릴 때 글도 쓰고, 나는 게시만」, 11-03 「캡션 다 달아줘 · 태그도 다른 거」).
// - 영상 링크는 안드로이드 앱만 고를 수 있어(아이폰 앱이 목록에 안 나옴) 글 끝에 아이폰 안내 줄을 붙인다.
// - 2026-11-03부터 틱톡은 「나만 보기」 바로 게시(글 포함)로 올린다 → scripts/tiktok.mjs.
//   docs/tiktok/captions.json · docs/tt.html 은 예비용(초안으로 떨어졌을 때 복사).
// - 태그는 scripts/hashtags.mjs 로 게시물마다 다르게(바로 앞 틱톡 글과 #탑노트 빼고 2개 이하 겹침).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pickHashtags, splitTags, tagsOk } from './hashtags.mjs';

export const TIKTOK_APP_LINE = '📱 안드로이드는 영상 링크, 아이폰은 프로필 링크에서 「탑노트」 받아요.';
const captionsFile = resolve(import.meta.dirname, '..', 'docs', 'tiktok', 'captions.json');
const readList = () => (existsSync(captionsFile) ? JSON.parse(readFileSync(captionsFile, 'utf8')) : []);

// 바로 앞에 올린 틱톡 글의 태그
export function lastTiktokTags() {
  const last = readList()[0];
  return last ? splitTags(last.caption).tags : [];
}

// caption: 인스타용 글, seed: 게시물 이름(태그 고르기), question: 글에 질문이 없으면 붙일 질문(광고 영상)
export function tiktokCaption(caption, { seed, question, avoid = lastTiktokTags() } = {}) {
  const { body: raw, tags } = splitTags(String(caption).replace(/\s*프로필 링크에서 시작해요\./g, ''));
  let main = raw.trim();
  if (question && !/[?？]/.test(main)) main += `\n\n👇 ${question}\n댓글로 알려 주세요.`;
  const finalTags = tagsOk(tags, avoid) ? tags : pickHashtags(main, { seed: seed ?? main, avoid });
  return `${main}\n\n${TIKTOK_APP_LINE}\n\n${finalTags.join(' ')}`;
}

// 틱톡에 보내는 모든 경로(광고 영상·숏폼·카드 릴스·사진)가 반드시 부른다(2026-11-03 대표 「틱톡은 항상 글과 함께」).
// id: 사람이 알아보는 이름(예: 「광고 ad01 · tn1031_01_tn1029-callB」, 「카드 003 · 제목」), publishId: 틱톡 내부 번호.
// caption: 틱톡에 실제로 실은 글(tiktokCaption 결과). mode: 'private'(나만 보기로 글과 함께 올라감) | 'inbox'(초안, 글은 복사해서 붙여 넣기)
export function saveTiktokCaption({ id, publishId, caption, cover, mode = 'inbox' }) {
  if (!id || !caption || !cover) throw new Error('틱톡 글 저장: id·caption·cover 모두 필요해요');
  mkdirSync(resolve(captionsFile, '..'), { recursive: true });
  const list = readList();
  list.unshift({ id, publish_id: publishId ?? null, at: new Date().toISOString(), mode, cover, caption });
  writeFileSync(captionsFile, JSON.stringify(list.slice(0, 30), null, 1) + '\n');
}
