// 틱톡 글(2026-11-02 대표 「올릴 때 글도 쓰고, 나는 게시만」).
// - 영상 링크는 안드로이드 앱만 고를 수 있어(아이폰 앱이 목록에 안 나옴) 글 끝에 아이폰 안내 줄을 붙인다.
// - 영상 초안(받은 편지함)에는 틱톡 API가 글을 실어 주지 않는다 → docs/tiktok/captions.json 에 남기고
//   docs/tt.html(복사 페이지)에서 한 번 눌러 복사 → 틱톡에 붙여 넣기.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const TIKTOK_APP_LINE = '📱 안드로이드는 영상 링크, 아이폰은 프로필 링크에서 「탑노트」 받아요.';

export function tiktokCaption(caption) {
  const body = caption.replace(/\s*프로필 링크에서 시작해요\./g, '').trim();
  const tags = body.match(/\n\n(#[^\n]+)$/);
  const main = tags ? body.slice(0, tags.index) : body;
  return `${main}\n\n${TIKTOK_APP_LINE}${tags ? `\n\n${tags[1]}` : ''}`;
}

// 틱톡 초안을 보내는 모든 경로(광고 영상·숏폼·카드 릴스·사진)가 반드시 부른다(2026-11-03 대표 「틱톡은 항상 글과 함께」).
// id: 사람이 알아보는 이름(예: 「광고 ad01 · tn1031_01_tn1029-callB」, 「카드 003 · 제목」), publishId: 틱톡 내부 번호.
export function saveTiktokCaption({ id, publishId, caption, cover }) {
  if (!id || !caption || !cover) throw new Error('틱톡 글 저장: id·caption·cover 모두 필요해요');
  const dir = resolve(import.meta.dirname, '..', 'docs', 'tiktok');
  mkdirSync(dir, { recursive: true });
  const f = resolve(dir, 'captions.json');
  const list = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
  list.unshift({ id, publish_id: publishId ?? null, at: new Date().toISOString(), cover, caption: tiktokCaption(caption) });
  writeFileSync(f, JSON.stringify(list.slice(0, 30), null, 1) + '\n');
}
