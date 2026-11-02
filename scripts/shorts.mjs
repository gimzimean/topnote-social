// 공감 상황극 숏폼(1080×1920, 30fps) 만들기 — topnote-app/scripts/viral-shorts.mjs 에서 옮김(2026-11-02 「바이럴 쉬지 않고」).
// 실행: node scripts/shorts.mjs [epN] [--all]  → docs/shorts/<id>.mp4 · <id>-cover.jpg (이미 있으면 건너뜀, --all 이면 다시)
// GitHub Actions render-shorts.yml 이 episodes.json 이 바뀌면 자동으로 돌린다(playwright · ffmpeg · 한글 글꼴).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'docs/shorts');
mkdirSync(out, { recursive: true });
const FPS = 30;
const music = resolve(root, 'video/music.wav');
const b64 = (p) => readFileSync(resolve(root, p)).toString('base64');

// 목소리: 내레이션 · 여자 · 남자 · 여자2(높은 톤) · 남자2
const VOICE = {
  N: ['ko-KR-HyunsuMultilingualNeural', '+8%', '+0Hz'],
  W: ['ko-KR-SunHiNeural', '+12%', '+0Hz'],
  M: ['ko-KR-InJoonNeural', '+12%', '+0Hz'],
  W2: ['ko-KR-SunHiNeural', '+15%', '+25Hz'],
  M2: ['ko-KR-InJoonNeural', '+8%', '-20Hz'],
};

// 장면: text(큰 자막) · sub(작은 줄) · chat([말한 사람, 화면 글, 읽을 글?]) · say([목소리, 읽을 글]) · hold(목소리 뒤 쉬는 초) · min(최소 초) · end(마지막 브랜드 장면)
// 대본은 shorts/episodes.json(클로드 루틴이 매일 채움). 캡션은 각 편의 caption → shorts/<id>.txt
const EPISODES = JSON.parse(readFileSync(resolve(root, 'shorts/episodes.json'), 'utf8'));

const css = `
@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64('assets/fonts/SongMyung-Regular.ttf')})}
@font-face{font-family:DMSerif;src:url(data:font/ttf;base64,${b64('assets/fonts/DMSerifDisplay-Regular.ttf')})}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;background:#1b1414;color:#F3EBDD;font-family:'Malgun Gothic','Noto Sans CJK KR','Noto Sans KR',sans-serif;-webkit-font-smoothing:antialiased}
.scene{position:absolute;inset:0;padding:260px 90px 420px;display:flex;flex-direction:column;justify-content:center}
.scene.light{background:#F3EBDD;color:#1b1414}
.scene.endc{background:#B85F45;color:#FBF3EA}
h1{font-family:SongMyung;font-weight:400;font-size:132px;line-height:1.22;word-break:keep-all}
.sub{font-size:52px;line-height:1.5;color:#cbb8a8;margin-top:44px;word-break:keep-all}
.kicker{font-size:40px;letter-spacing:6px;color:#9a7b5b;font-weight:700;margin-bottom:40px}
.accent{color:#E08A6A}
.bub{font-size:60px;font-weight:700;padding:30px 42px;border-radius:44px;margin:16px 0;max-width:82%;background:#fff;color:#1b1414;align-self:flex-start;opacity:0}
.bub.r{align-self:flex-end;background:#FEE500}
.who{font-size:30px;color:#9a7b5b;margin:18px 10px 0;opacity:0}
.who.r{align-self:flex-end}
.brand{font-size:56px;font-weight:800;letter-spacing:4px;margin-top:60px}
.mark{position:absolute;left:90px;top:150px;font-family:DMSerif;font-size:64px;opacity:.85}
.mark i{font-style:normal;color:#E08A6A}
.endc .mark i{color:#1b1414}
.up{opacity:0;animation:up .45s ease-out forwards}
@keyframes up{from{opacity:0;transform:translateY(36px)}to{opacity:1;transform:none}}
.zoom{animation:zoom 20s linear forwards;transform-origin:50% 45%}
@keyframes zoom{from{transform:scale(1)}to{transform:scale(1.08)}}
`;
const coverCss = `
@font-face{font-family:SongMyung;src:url(data:font/ttf;base64,${b64('assets/fonts/SongMyung-Regular.ttf')})}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;background:#1b1414;color:#F3EBDD;font-family:'Malgun Gothic','Noto Sans CJK KR','Noto Sans KR',sans-serif;display:flex;flex-direction:column;justify-content:center;padding:0 90px}
h1{font-family:SongMyung;font-weight:400;font-size:150px;line-height:1.16;word-break:keep-all}
h1 em{font-style:normal;color:#E08A6A}
.sub{margin-top:56px;display:inline-block;align-self:flex-start;background:#F3EBDD;color:#1b1414;font-size:52px;font-weight:800;padding:18px 34px;border-radius:999px}
.mark{position:absolute;left:90px;top:300px;font-size:40px;letter-spacing:8px;color:#b89c88;font-weight:700}`;

const probe = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
// 음악만(2026-11-01 대표 「목소리 어색하면 음악으로」): 목소리 없이 읽는 시간만큼 장면을 둔다.
const MUSIC_ONLY = !process.argv.includes('--voice');
const tts = (dir, key, who, text) => {
  if (MUSIC_ONLY) return { file: null, dur: 0.55 + Array.from(text.replace(/\s/g, '')).length * 0.075 };
  const [voice, rate, pitch] = VOICE[who];
  const raw = resolve(dir, `${key}.mp3`);
  const f = resolve(dir, `${key}.wav`);
  if (!existsSync(f)) {
    execFileSync('python', ['-m', 'edge_tts', '--voice', voice, `--rate=${rate}`, `--pitch=${pitch}`, '--text', text, '--write-media', raw]);
    // edge-tts 는 앞뒤에 빈 소리가 붙는다(끝에 약 0.9초): 잘라낸다.
    const trim = 'silenceremove=start_periods=1:start_threshold=-45dB';
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', `${trim},areverse,${trim},areverse`, f]);
  }
  return { file: f, dur: probe(f) };
};

const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
for (const [id, ep] of Object.entries(EPISODES)) {
  if (only && only !== id) continue;
  if (ep.caption && !existsSync(resolve(root, 'shorts', `${id}.txt`))) writeFileSync(resolve(root, 'shorts', `${id}.txt`), ep.caption.trim() + '\n');
  if (!only && !process.argv.includes('--all') && existsSync(resolve(out, `${id}.mp4`))) continue;
  const work = resolve(tmpdir(), `topnote-short-${id}`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(resolve(work, 'f'), { recursive: true });
  // 1) 목소리를 먼저 만들고 장면 길이를 목소리에 맞춘다.
  const clips = []; // {file, at}
  let t = 0;
  const timeline = ep.scenes.map((s, si) => {
    const start = t;
    let cur = 0.25;
    const lines = (s.chat ?? []).map(([who, shown, spoken], li) => {
      const a = tts(work, `${si}c${li}`, who, spoken ?? shown);
      const at = cur; if (a.file) clips.push({ file: a.file, at: start + at }); cur += a.dur + 0.25;
      return { who, shown, at };
    });
    for (const [li, [who, text]] of (s.say ?? []).entries()) {
      const a = tts(work, `${si}s${li}`, who, text);
      if (a.file) clips.push({ file: a.file, at: start + cur }); cur += a.dur + 0.15;
    }
    const dur = Math.max(s.min ?? 0, cur + (s.hold ?? 0.3));
    t += dur;
    return { ...s, start, dur, lines };
  });
  const total = t;
  // 2) 장면 그리기
  const sceneHtml = (s) => {
    const mark = '<div class="mark">T<i>.</i></div>';
    if (s.end) return `<div class="scene endc zoom">${mark}<h1 class="up">${s.end[0]}</h1><div class="brand up" style="animation-delay:.35s">${s.end[1]}</div></div>`;
    if (s.chat) return `<div class="scene light">${mark}${s.kicker ? `<div class="kicker up">${s.kicker}</div>` : ''}${s.lines.map((l, i) => {
      const r = l.who === 'M' || l.who === 'M2' ? ' r' : '';
      return `<div class="bub${r}" style="animation:up .35s ease-out ${l.at}s forwards">${l.shown}</div>`;
    }).join('')}</div>`;
    return `<div class="scene zoom">${mark}<h1 class="up">${s.text}</h1>${s.sub ? `<div class="sub up" style="animation-delay:.5s">${s.sub}</div>` : ''}</div>`;
  };
  let frame = 0;
  for (const s of timeline) {
    await page.setContent(`<style>${css}</style>${sceneHtml(s)}`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    const n = Math.round(s.dur * FPS);
    for (let k = 0; k < n; k++) {
      await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.currentTime = ms; }), (k / FPS) * 1000);
      await page.screenshot({ path: resolve(work, 'f', `${String(frame++).padStart(4, '0')}.png`) });
    }
  }
  // 3) 소리: 목소리는 제 시각에, 음악은 작게 깔고 끝에서 줄인다.
  const ins = clips.flatMap((c) => ['-i', c.file]);
  const fc = clips.map((c, i) => `[${i + 1}:a]adelay=${Math.round(c.at * 1000)}|${Math.round(c.at * 1000)},volume=1.6[v${i}]`).join(';')
    + (clips.length ? ';' : '') + `[0:a]volume=${clips.length ? 0.13 : 0.6},afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2[bg];[bg]${clips.map((_, i) => `[v${i}]`).join('')}amix=inputs=${clips.length + 1}:normalize=0:duration=first[a]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', resolve(work, 'f', '%04d.png'),
    '-stream_loop', '-1', '-t', total.toFixed(2), '-i', music, ...ins,
    '-filter_complex', fc.replace(/\[(\d+):a\]/g, (_, n) => `[${Number(n) + 1}:a]`).replace('[1:a]volume=0.13', '[1:a]volume=0.13'),
    '-map', '0:v', '-map', '[a]', '-t', total.toFixed(2), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', resolve(out, `${id}.mp4`)]);
  // 4) 표지(후킹 썸네일 필수)
  await page.setContent(`<style>${coverCss}</style><div class="mark">TOP NOTE · 탑노트</div><h1>${ep.cover.slice(0, 3).join('<br>')}</h1><div class="sub">${ep.cover[3]}</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(out, `${id}-cover.jpg`), type: 'jpeg', quality: 92 });
  rmSync(work, { recursive: true, force: true });
  console.log(`saved ${id}.mp4 (${total.toFixed(1)}초) + cover`);
}
await browser.close();
