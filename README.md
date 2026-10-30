# 탑노트 소셜 자동 업로드

- 내용: `content.json` (게시물 추가 → `node scripts/build.mjs` → push)
- 사진: `docs/posts/<id>/1.jpg…` → https://gimzimean.github.io/topnote-social/posts/
- 올리기: `.github/workflows/post.yml` 월·수·금 20:00 KST, `state.json`에 올린 번호 기록
- 계정 연결(한 번): `node scripts/auth.mjs instagram` → 코드 → `node scripts/auth.mjs instagram <코드>` → push (틱톡도 같음)
- 토큰은 `tokens.enc`(암호화), 키는 GitHub 비밀 `TOKEN_KEY`와 `C:\zzend-keys\topnote-social.env`
- 틱톡은 앱 심사 전 `upload`(틱톡 앱 알림으로 초안 → 눌러서 올림), 심사 뒤 저장소 변수 `TIKTOK_MODE=direct`
