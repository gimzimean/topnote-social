// 카드(content.json)를 검색용 글로 바꾼다(2026-11-01 대표 「SEO·GEO·AEO」).
// 실행: node scripts/web.mjs <topnote 사이트 저장소 폴더>  → tips/<id>.html · tips/index.html · sitemap.xml 갱신
// 올린 카드(state.json.instagram)만 글로 만든다(아직 안 올린 카드는 SNS에서 먼저 공개).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const site = process.argv[2];
if (!site || !existsSync(site)) throw new Error('사용법: node scripts/web.mjs <사이트 폴더>');
const SITE = 'https://topnote.app';
const IOS = 'https://apps.apple.com/kr/app/id6813747102';
const AND = 'https://play.google.com/store/apps/details?id=com.topnote.app';
const raw = JSON.parse(readFileSync(resolve(root, 'content.json'), 'utf8'));
const posts = raw.posts || raw;
const state = JSON.parse(readFileSync(resolve(root, 'state.json'), 'utf8'));
// 이미 사이트에 있는 팁 글도 유지한다(state.json 이 초기화돼도 글이 사이트맵에서 빠지지 않게, 2026-11-04).
const posted = new Set(process.argv.includes('--all') ? posts.map((p) => p.id) : [...(state.instagram ?? []), ...posts.map((p) => p.id).filter((id) => existsSync(resolve(site, 'tips', `${id}.html`)))]);
const plain = (h) => h.replace(/<br>/g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const cap = (p) => p.caption.replace(/^\[[^\]]*\]\n/, '').split('\n\n')[0].replace(/\n/g, ' ');

const CSS = `<style>body{margin:0;background:#F5EEE3;color:#1F1B24;font-family:"Noto Sans KR","Apple SD Gothic Neo",sans-serif;line-height:1.75}main,footer,header{max-width:720px;margin:0 auto;padding:22px}header a{font-weight:800;text-decoration:none;color:#1F1B24;font-size:22px}header a i{color:#B85F45;font-style:normal}h1{font-size:30px;line-height:1.35;margin:10px 0 12px}h2{font-size:21px;margin:34px 0 6px}p,li{font-size:16.5px}.lead{font-size:18px;color:#4A4352}.cover{width:100%;border-radius:16px;margin:12px 0}.cta{display:flex;gap:10px;flex-wrap:wrap;margin:28px 0}.cta a{background:#1F1B24;color:#fff;text-decoration:none;padding:13px 18px;border-radius:12px;font-weight:700}footer{font-size:13px;color:#6B6573;border-top:1px solid #DCD3C6}footer a{color:#4A4352}ul.list{padding:0;list-style:none}ul.list li{margin:14px 0}ul.list a{color:#1F1B24;font-weight:700}.box{background:#fff;border-radius:14px;padding:6px 18px;margin-top:20px}</style>`;
const FOOT = `<footer><p><a href="/">탑노트 홈</a> · <a href="/tips/">연애·소개팅 팁</a> · <a href="/guide/voice-dating.html">보이스 소개팅</a> · <a href="/guide/group-talk.html">4인 수다</a> · <a href="/faq.html">자주 묻는 질문</a></p><p>몬타나 주식회사 (Montana CO.,Ltd) · 대표자 김석 · 사업자등록번호 148-87-01772 · 통신판매업 제2026-부산동래-0486호 · support@zzend.app</p></footer>`;
const CTA = `<div class="box"><p><b>탑노트</b> — 만나기 전에 목소리로 3분 먼저. 말이 통하면 사진, 그다음 번호.</p><div class="cta"><a href="${IOS}">App Store</a><a href="${AND}">Google Play</a></div></div>`;
const head = (title, desc, path, image, ld) => `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | 탑노트</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="article"><meta property="og:url" content="${SITE}${path}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${image}"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="탑노트">
${ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('\n')}${CSS}</head>`;

mkdirSync(resolve(site, 'tips'), { recursive: true });
const done = posts.filter((p) => posted.has(p.id) && p.cover && p.slides);
for (const p of done) {
  const title = plain(p.cover[0]);
  const desc = `${plain(p.cover[1])} ${cap(p)}`.slice(0, 150);
  const path = `/tips/${p.id}.html`;
  const image = `https://gimzimean.github.io/topnote-social/posts/${p.id}/1.jpg`;
  const steps = p.slides.map(([h, b]) => Array.isArray(b)
    ? `<h2>${plain(h)}</h2><ul>${b.map(([l, s]) => `<li><b>${l}</b> — ${s}</li>`).join('')}</ul>`
    : `<h2>${plain(h)}</h2><p>${b.replace(/<br>/g, ' ')}</p>`).join('\n');
  const check = p.slides.at(-1)[1];
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc, image, inLanguage: 'ko', datePublished: '2026-11-01', author: { '@type': 'Organization', name: '탑노트' }, publisher: { '@type': 'Organization', name: '몬타나 주식회사' }, mainEntityOfPage: SITE + path },
    ...(Array.isArray(check) ? [{ '@context': 'https://schema.org', '@type': 'HowTo', name: title, step: check.map(([l, s], i) => ({ '@type': 'HowToStep', position: i + 1, name: l.replace(/^\d+\.\s*/, ''), text: s })) }] : []),
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: '탑노트', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: '연애·소개팅 팁', item: SITE + '/tips/' }, { '@type': 'ListItem', position: 3, name: title, item: SITE + path }] },
  ];
  writeFileSync(resolve(site, `tips/${p.id}.html`), `${head(title, desc, path, image, ld)}<body><header><a href="/">T<i>.</i> 탑노트</a></header><main>
<p><a href="/tips/">연애·소개팅 팁</a></p><h1>${title}</h1><p class="lead">${plain(p.cover[1])}</p>
<img class="cover" src="${image}" alt="${esc(title)}" loading="lazy">
${steps}
${CTA}</main>${FOOT}</body></html>
`);
}
const list = done.map((p) => `<li><a href="/tips/${p.id}.html">${plain(p.cover[0])}</a><br>${plain(p.cover[1])}</li>`).reverse().join('');
writeFileSync(resolve(site, 'tips/index.html'), `${head('연애·소개팅 팁 모음', '소개팅 첫 대화, 애프터, 첫 만남 장소, 연락 빈도까지. 직장인을 위한 짧고 쉬운 연애·소개팅 팁 모음이에요.', '/tips/', `${SITE}/assets/og-3min.jpg`, [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: '연애·소개팅 팁 모음', url: SITE + '/tips/' }])}<body><header><a href="/">T<i>.</i> 탑노트</a></header><main><h1>연애·소개팅 팁 모음</h1><p class="lead">소개팅 첫 대화부터 애프터까지, 짧고 쉽게 정리했어요.</p><ul class="list">${list}</ul>${CTA}</main>${FOOT}</body></html>
`);
// 사이트맵: 기존 주소 + 팁 글
const sm = resolve(site, 'sitemap.xml');
const base = existsSync(sm) ? [...readFileSync(sm, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => !u.includes('/tips/')) : [];
const urls = [...base, `${SITE}/tips/`, ...done.map((p) => `${SITE}/tips/${p.id}.html`)];
writeFileSync(sm, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>`).join('\n')}\n</urlset>\n`);
console.log(`팁 글 ${done.length}개 · 사이트맵 ${urls.length}개`);
console.log(JSON.stringify(urls.filter((u) => u.includes('/tips/'))));
