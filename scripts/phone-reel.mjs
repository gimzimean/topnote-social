// 「폰팅」 형식 릴스: 검은 통화 화면(탑노트 통화 화면 모양) + 상황극 통화 목소리(AI) + 큰 자막(2026-11-04 대표 「ㄱㄱㄱ」).
// 벤치마크: KBS 「폰팅」(검은 화면+통화 음성+자막), 위피 랜덤 통화 리액션. 회원 실제 통화가 아닌 상황극임을 표시한다.
// 실행: node scripts/phone-reel.mjs <spec.json>  → docs/ai-reels/<id>.mp4 · <id>-cover.jpg
// spec: { id, track, top, peer: { name, info }, lines: [[ 'M'|'W', 자막, 말(없으면 자막) ]], ending: { title, sub }, cover }
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(existsSync(resolve(root, 'node_modules/playwright')) ? resolve(root, 'package.json') : 'C:/topnote-app/package.json');
const { chromium } = require('playwright');
const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = resolve(root, 'docs/ai-reels');
mkdirSync(out, { recursive: true });
const tmp = resolve(tmpdir(), `phone-reel-${spec.id}`);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const b64 = (p) => readFileSync(p).toString('base64');
const W = 1080, H = 1920, FPS = 30, GAP = 0.45, LEAD = 1.2, TAIL_GAP = 0.6;
const VOICE = { M: ['ko-KR-InJoonNeural', '-4%', '-6Hz'], W: ['ko-KR-SunHiNeural', '-2%', '+8Hz'] };
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

// 1) 대사 음성
const lines = [];
let t = LEAD;
for (const [i, [who, shown, spoken]] of spec.lines.entries()) {
  const raw = resolve(tmp, `l${i}.mp3`), wav = resolve(tmp, `l${i}.wav`);
  const [voice, rate, pitch] = VOICE[who];
  execFileSync('python', ['-m', 'edge_tts', '--voice', voice, `--rate=${rate}`, `--pitch=${pitch}`, '--text', spoken ?? shown.replace(/<[^>]+>/g, ''), '--write-media', raw]);
  // 앞뒤 빈 소리 자르고, 전화 느낌(대역 제한)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,highpass=f=280,lowpass=f=3600,volume=1.6', '-ar', '44100', '-ac', '2', wav]);
  const d = dur(wav);
  lines.push({ who, shown, start: t, end: t + d, wav });
  t += d + GAP;
}
const talkEnd = t - GAP;
const ENDING_AT = talkEnd + TAIL_GAP; // 「둘 다 눌렀어요」
const TOTAL = ENDING_AT + 5.5;

// 2) 화면(프레임마다)
const font = `@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64(resolve(root, 'assets/fonts/SongMyung-Regular.ttf'))})}@font-face{font-family:DMSerif;src:url(data:font/ttf;base64,${b64(resolve(root, 'assets/fonts/DMSerifDisplay-Regular.ttf'))})}`;
const css = `${font}*{margin:0;padding:0;box-sizing:border-box}body{width:${W}px;height:${H}px;background:#171411;color:#F2ECE1;font-family:'Malgun Gothic',sans-serif;overflow:hidden;position:relative}
.top{position:absolute;left:80px;right:80px;top:200px;font-family:SongMyung;font-size:64px;line-height:1.3;word-break:keep-all}.top em{font-style:normal;color:#E9B44C}
.tag{position:absolute;right:44px;top:130px;font-size:24px;color:rgba(242,236,225,.75);border:1px solid rgba(242,236,225,.3);padding:6px 14px;border-radius:99px}
.peer{position:absolute;left:0;right:0;top:470px;text-align:center}.peer b{font-family:SongMyung;font-weight:400;font-size:64px}.peer p{font-size:30px;color:#B3A79D;margin-top:10px}
.ring{position:absolute;left:50%;top:700px;width:460px;height:460px;margin-left:-230px}
.time{position:absolute;left:0;right:0;top:830px;text-align:center;font-family:DMSerif;font-size:150px}
.wave{position:absolute;left:0;right:0;top:1010px;display:flex;gap:12px;justify-content:center;align-items:center;height:80px}.wave i{width:10px;background:#C7A874;border-radius:5px;display:block}
.sub{position:absolute;left:70px;right:70px;top:1250px;text-align:center;font-size:62px;font-weight:800;line-height:1.4;word-break:keep-all;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.sub.M{color:#F2ECE1}.sub.W{color:#F6D7C8}.who{display:block;font-size:30px;font-weight:700;color:#C7A874;margin-bottom:12px}
.cta{position:absolute;left:0;right:0;bottom:210px;text-align:center;font-size:40px;font-weight:800;color:#171411}.cta span{background:#F2ECE1;padding:18px 40px;border-radius:99px}
.both{position:absolute;left:90px;right:90px;top:1250px;text-align:center;background:#C7A874;color:#171411;border-radius:28px;padding:34px 20px;font-size:58px;font-weight:900}
.both small{display:block;font-size:30px;font-weight:700;margin-top:8px}
.end{position:absolute;inset:0;background:linear-gradient(160deg,#4a1f22 0%,#171411 75%);padding:640px 80px 0}.end h1{font-family:SongMyung;font-weight:400;font-size:104px;line-height:1.25}.end h1 em{font-style:normal;color:#E9B44C}.end p{font-size:46px;color:#E7D2C4;margin-top:50px;line-height:1.6}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<style>${css}</style><div id="root"></div>`);
await page.evaluate(() => document.fonts.ready);
const frames = resolve(tmp, 'f');
mkdirSync(frames);
const n = Math.ceil(TOTAL * FPS);
for (let f = 0; f < n; f++) {
  const s = f / FPS;
  const cur = lines.find((l) => s >= l.start - 0.05 && s < l.end + 0.35);
  const talking = lines.find((l) => s >= l.start && s < l.end);
  // 타이머: 3:00 에서 줄어들다가, 둘 다 누르면 3:00 으로 다시
  const remain = s < ENDING_AT ? Math.max(0, 180 - Math.floor(s)) : 180;
  const mm = `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')}`;
  const prog = s < ENDING_AT ? (180 - (180 - s)) / 180 : 0;
  const bars = Array.from({ length: 9 }, (_, i) => {
    const h = talking ? 14 + Math.abs(Math.sin(s * 9 + i * 1.7)) * 62 : 10;
    return `<i style="height:${h.toFixed(0)}px;opacity:${talking ? 1 : 0.45}"></i>`;
  }).join('');
  const C = 2 * Math.PI * 220;
  let html = `<div class="tag">상황극 · AI 목소리</div><div class="top">${spec.top}</div>
    <div class="peer"><b>${spec.peer.name}</b><p>${spec.peer.info}</p></div>
    <svg class="ring" viewBox="0 0 460 460"><circle cx="230" cy="230" r="220" fill="none" stroke="#3a332e" stroke-width="4"/><circle cx="230" cy="230" r="220" fill="none" stroke="#C7A874" stroke-width="4" stroke-dasharray="${C}" stroke-dashoffset="${(C * prog).toFixed(1)}" transform="rotate(-90 230 230)"/></svg>
    <div class="time">${mm}</div><div class="wave">${bars}</div>`;
  if (s >= ENDING_AT && s < ENDING_AT + 3) html += `<div class="both">둘 다 눌렀어요 · 3분 더<small>누가 먼저 눌렀는지는 서로 몰라요</small></div>`;
  else if (cur) html += `<div class="sub ${cur.who}"><span class="who">${cur.who === 'M' ? '그' : '그녀'}</span>${cur.shown}</div>`;
  html += '<div class="cta"><span>탑노트 · 지금 앱 받기</span></div>';
  if (s >= ENDING_AT + 3) html = `<div class="end"><div style="position:absolute;left:80px;top:230px;font-family:DMSerif;font-size:72px">T<span style="color:#B85F45">.</span></div><h1>${spec.ending.title}</h1><p>${spec.ending.sub}</p></div><div class="cta"><span>탑노트 · 지금 앱 받기</span></div>`;
  await page.evaluate((h) => { document.getElementById('root').innerHTML = h; }, html);
  await page.screenshot({ path: resolve(frames, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 88 });
}

// 3) 표지
await page.evaluate((h) => { document.getElementById('root').innerHTML = h; }, `<div class="tag">상황극 · AI 목소리</div>
  <svg class="ring" viewBox="0 0 460 460" style="top:420px;opacity:.5"><circle cx="230" cy="230" r="220" fill="none" stroke="#C7A874" stroke-width="4"/></svg>
  <div class="time" style="top:550px;opacity:.5">2:58</div>
  <div class="top" style="top:1020px;font-size:120px;line-height:1.2">${spec.cover}</div>`);
await page.screenshot({ path: resolve(tmp, 'cover.png') });
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', resolve(tmp, 'cover.png'), '-q:v', '2', resolve(out, `${spec.id}-cover.jpg`)]);

// 4) 소리: 대사 + 연결음 느낌 없이 잔잔한 음악(낮게) + 「띵」 대신 음악 크게
const tracks = JSON.parse(readFileSync(resolve(root, 'music/tracks.json'), 'utf8'));
const track = tracks.find((x) => x.file === spec.track) ?? tracks[0];
const inputs = lines.flatMap((l) => ['-i', l.wav]);
const delays = lines.map((l, i) => `[${i}:a]adelay=${Math.round(l.start * 1000)}|${Math.round(l.start * 1000)}[d${i}]`).join(';');
const mix = `${lines.map((_, i) => `[d${i}]`).join('')}amix=inputs=${lines.length}:normalize=0[v]`;
const mi = lines.length;
const music = `[${mi}:a]volume='if(lt(t,${ENDING_AT.toFixed(2)}),0.12,0.55)':eval=frame,afade=t=in:d=1,afade=t=out:st=${(TOTAL - 1.5).toFixed(2)}:d=1.5[m]`;
const wav = resolve(tmp, 'mix.wav');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-ss', String(track.start), '-t', String(TOTAL), '-i', resolve(root, 'music', track.file),
  '-filter_complex', `${delays};${mix};${music};[v][m]amix=inputs=2:normalize=0:duration=longest[a]`, '-map', '[a]', '-t', String(TOTAL), wav]);
const mp4 = resolve(out, `${spec.id}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', resolve(frames, '%05d.jpg'), '-i', wav,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mp4]);
writeFileSync(resolve(tmp, 'timeline.json'), JSON.stringify(lines.map(({ who, shown, start, end }) => ({ who, shown, start, end })), null, 1));
console.log(`${spec.id}: 대사 ${lines.length}줄 ${TOTAL.toFixed(1)}초 · ${track.title} → docs/ai-reels/${spec.id}.mp4`);
