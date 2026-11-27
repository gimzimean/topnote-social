// 검색 키워드(2026-11-21 대표 「릴스나 캡션에도 저 키워드 다 넣어줘」)
// 모든 게시 글에 전화 소개팅 계열 + 솔크·크리스마스 키워드 줄과 해시태그를 붙인다. 이미 붙은 글은 그대로.
export const KW_LINE = '전화 소개팅 · 전화 로테이션 소개팅 · 전화 미팅 · 전화 단체 미팅 · 전화 솔로파티 · 퇴근길 소개팅\n올해 크리스마스는 솔크 탈출.';
export const KW_TAGS = ['#전화소개팅', '#전화로테이션소개팅', '#전화미팅', '#전화단체미팅', '#전화솔로파티', '#퇴근길소개팅', '#틈새소개팅', '#솔크', '#솔크탈출', '#크리스마스'];

export function withKeywords(caption = '') {
  if (caption.includes('#전화솔로파티') && caption.includes('전화 로테이션 소개팅')) return caption;
  const m = caption.match(/\n*((?:#[^\s#]+[ \t]*)+)\s*$/);
  const body = (m ? caption.slice(0, m.index) : caption).trimEnd();
  const tags = [...new Set([...(m ? m[1].trim().split(/\s+/) : []), ...KW_TAGS])].slice(0, 30);
  return `${body}\n\n${KW_LINE}\n\n${tags.join(' ')}`;
}
