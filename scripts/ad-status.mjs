// 메타 광고 현황 한 장(docs/ad-status.html)을 지금 메타 숫자로 다시 만든다(2026-11-06 대표 「계속 업데이트 되는거야?」 → .github/workflows/ad-status.yml 1시간마다).
// 키: 환경변수 META_ADS_TOKEN(GitHub 비밀) 또는 C:/zzend-keys/topnote-meta-ads.env
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
let T = process.env.META_ADS_TOKEN;
if (!T && existsSync('C:/zzend-keys/topnote-meta-ads.env')) T = readFileSync('C:/zzend-keys/topnote-meta-ads.env', 'utf8').match(/META_ADS_TOKEN=(.+)/)[1].trim();
const G = 'https://graph.facebook.com/v23.0', ACT = 'act_1669114048255983';
const get = async (url) => { const out = []; while (url) { const j = await (await fetch(url)).json(); if (j.error) throw new Error(j.error.message); out.push(...j.data); url = j.paging?.next; } return out; };
const ads = (await get(`${G}/${ACT}/ads?fields=name,effective_status,adset{name,daily_budget,effective_status},creative{body,title,object_story_spec}&limit=100&effective_status=${encodeURIComponent(JSON.stringify(['ACTIVE', 'PENDING_REVIEW', 'ADSET_PAUSED', 'IN_PROCESS']))}&access_token=${T}`))
  .map((a) => { const vd = a.creative?.object_story_spec?.video_data || {}; return { set: a.adset.name, setStatus: a.adset.effective_status, budget: +a.adset.daily_budget, body: a.creative?.body || vd.message || '', title: a.creative?.title || vd.title || '', vid: a.name.replace(/^ai2_/, '').replace('_' + a.adset.name, '') }; });
const ins = {};
for (const p of ['today', 'last_7d']) ins[p] = Object.fromEntries((await get(`${G}/${ACT}/insights?level=adset&fields=adset_name,spend,impressions,clicks,actions&date_preset=${p}&limit=100&access_token=${T}`))
  .map((d) => [d.adset_name, { spend: +d.spend, clk: +d.clicks, inst: +(d.actions?.find((a) => a.action_type === 'mobile_app_install')?.value || 0) }]));
const mock = readFileSync(resolve(root, 'docs/mock-safe.html'), 'utf8');
const v = (mock.match(/\?v=(\d+)/) || [])[1] || '1';
const titles = {};
for (const p of mock.split('<h2>').slice(1)) { const m = p.match(/ai-reels\/([^"?]+)\.mp4/); if (m) titles[m[1]] = p.slice(0, p.indexOf('</h2>')); }
const NAMES = { main: '본 세트', threads: '본 세트 · 스레드', pepero: '빼빼로데이', solk: '솔크 탈출', talk: '4인 수다', wed: '결혼', best: '옛 세트 베스트' };
const ORDER = ['main', 'pepero', 'solk', 'talk', 'wed', 'best', 'threads'];
const topicOf = (s) => (s.startsWith('tn_threads') ? 'threads' : s.replace(/^tn_(android|ios)_/, ''));
const g = {};
for (const a of ads) { const t = topicOf(a.set); g[t] ??= { sets: {}, vids: [], body: a.body, title: a.title }; g[t].sets[a.set] = { b: a.budget, s: a.setStatus }; if (!g[t].vids.includes(a.vid)) g[t].vids.push(a.vid); }
const order = [...ORDER.filter((t) => g[t]), ...Object.keys(g).filter((t) => !ORDER.includes(t))];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');
const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
const st = (n) => { const a = ins.today[n] || {}, b = ins.last_7d[n] || {}; const f = (k) => (a[k] || 0) + (b[k] || 0); return { spend: f('spend'), clk: f('clk'), inst: f('inst'), td: a.spend || 0 }; };
const T0 = { spend: 0, inst: 0, day: 0 };
const sec = order.map((t) => {
  const x = g[t];
  const rows = Object.entries(x.sets).sort().map(([n, o]) => {
    const s = st(n); T0.spend += s.spend; T0.inst += s.inst; if (o.s === 'ACTIVE') T0.day += o.b; const ios = n.includes('ios');
    return `<tr class=${o.s === 'ACTIVE' ? '' : 'off'}><td>${ios ? '아이폰' : '안드로이드'}</td><td>${o.s === 'ACTIVE' ? '<b class=on>켜짐</b>' : '일시정지'}</td><td>${won(o.b)}</td><td>${won(s.td)}</td><td>${won(s.spend)}</td><td>${s.clk}</td><td>${ios && !s.inst ? '<span class=dim>집계 늦음</span>' : s.inst + (s.inst ? ` <small>(${won(s.spend / s.inst)})</small>` : '')}</td></tr>`;
  }).join('');
  return `<section id=${t}><h2>${NAMES[t] ?? t} <small>영상 ${x.vids.length}편</small></h2><div class=top><div class=copy><div class=lb>광고 제목</div><div class=ti>${esc(x.title)}</div><div class=lb>광고 본문</div><div class=bd>${esc(x.body)}</div></div><table><tr><th>기기</th><th>상태</th><th>하루 예산</th><th>오늘</th><th>누적</th><th>클릭</th><th>설치(1건당)</th></tr>${rows}</table></div><div class=vids>${x.vids.map((id) => `<figure><video src="ai-reels/${id}.mp4?v=${v}" poster="ai-reels/${id}-cover.jpg?v=${v}" controls playsinline preload=none></video><figcaption>${titles[id] || id}</figcaption></figure>`).join('')}</div></section>`;
}).join('');
const now = new Date(Date.now() + 9 * 36e5).toISOString().slice(5, 16).replace('T', ' ');
const css = 'body{margin:0;padding:20px;background:#F3EBDD;color:#171411;font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;word-break:keep-all}h1{font-size:22px;margin:0 0 4px}.sum{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 6px}.sum div{background:#171411;color:#fff;border-radius:12px;padding:10px 14px;font-size:13px}.sum b{display:block;font-size:20px}.note{font-size:12px;color:#8a7e70;margin-bottom:8px}nav{position:sticky;top:0;background:#F3EBDDee;padding:8px 0;display:flex;gap:6px;flex-wrap:wrap;z-index:2}nav a{background:#fff;color:#171411;text-decoration:none;font-size:13px;border-radius:99px;padding:6px 12px}section{background:#fff;border-radius:16px;padding:16px;margin:14px 0}h2{font-size:18px;margin:0 0 10px}h2 small{font-size:13px;color:#8a7e70;font-weight:400}.top{display:flex;gap:16px;flex-wrap:wrap}.copy{flex:1 1 320px}.lb{font-size:11px;color:#8a7e70;margin-top:6px}.ti{font-weight:700;font-size:15px}.bd{font-size:13px;line-height:1.6;background:#F7F2EA;border-radius:10px;padding:10px 12px;margin-top:2px}table{flex:1 1 420px;border-collapse:collapse;font-size:12.5px;align-self:flex-start}th,td{padding:6px 7px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap}th:first-child,td:first-child,th:nth-child(2),td:nth-child(2){text-align:left}th{color:#8a7e70;font-weight:500}tr.off td{color:#aaa}.on{color:#1d7a3a}.dim{color:#aaa;font-size:11px}small{color:#8a7e70}.vids{display:flex;gap:10px;overflow-x:auto;margin-top:14px;padding-bottom:4px}figure{margin:0;flex:0 0 160px}video{width:160px;height:284px;background:#000;border-radius:10px;object-fit:cover;display:block}figcaption{font-size:11.5px;margin-top:4px;line-height:1.35}';
writeFileSync(resolve(root, 'docs/ad-status.html'), `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta http-equiv=refresh content=900><title>메타 광고 현황 · 세트별</title><style>${css}</style><h1>메타 광고 현황 · 세트별</h1><div class=note>${now} KST 기준 · 1시간마다 자동 갱신 · 누적은 최근 7일+오늘</div><div class=sum><div>켜진 세트 하루 예산<b>${won(T0.day)}</b></div><div>누적 지출<b>${won(T0.spend)}</b></div><div>설치(안드로이드 집계)<b>${T0.inst}건</b></div><div>광고 수<b>${ads.length}개</b></div></div><div class=note>아이폰 설치는 애플(SKAdNetwork) 집계가 1~3일 늦어 0으로 보일 수 있어요. 영상은 눌러서 재생.</div><nav>${order.map((t) => `<a href=#${t}>${NAMES[t] ?? t}</a>`).join('')}</nav>${sec}`);
console.log('ad-status', now, ads.length, '광고');
