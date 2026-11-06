// 사진(jpg 버퍼)에서 얼굴 위치(px)를 찾는다 — AWS Rekognition DetectFaces(앱 face-match와 같은 키). 2026-11-06 대표 「인물 얼굴 가리면 절대 안 돼」
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
const env = Object.fromEntries(readFileSync('C:/zzend-keys/aws-rekognition.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const { AWS_ACCESS_KEY_ID: ak, AWS_SECRET_ACCESS_KEY: sk, AWS_REGION: region } = env;
const sha = (s) => createHash('sha256').update(s).digest('hex');
const hm = (k, s) => createHmac('sha256', k).update(s).digest();
async function call(action, body) {
  const host = `rekognition.${region}.amazonaws.com`, payload = JSON.stringify(body);
  const amz = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), day = amz.slice(0, 8);
  const h = { 'content-type': 'application/x-amz-json-1.1', host, 'x-amz-date': amz, 'x-amz-target': `RekognitionService.${action}` };
  const names = Object.keys(h).sort(), signed = names.join(';');
  const creq = ['POST', '/', '', names.map((n) => `${n}:${h[n]}\n`).join(''), signed, sha(payload)].join('\n');
  const scope = `${day}/${region}/rekognition/aws4_request`;
  const sig = createHmac('sha256', hm(hm(hm(hm(`AWS4${sk}`, day), region), 'rekognition'), 'aws4_request')).update(['AWS4-HMAC-SHA256', amz, scope, sha(creq)].join('\n')).digest('hex');
  const { host: _, ...sent } = h;
  const r = await fetch(`https://${host}/`, { method: 'POST', headers: { ...sent, authorization: `AWS4-HMAC-SHA256 Credential=${ak}/${scope}, SignedHeaders=${signed}, Signature=${sig}` }, body: payload });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j)); return j;
}
export async function faceBoxes(buf, w = 1080, h = 1920) {
  const r = await call('DetectFaces', { Image: { Bytes: buf.toString('base64') }, Attributes: ['DEFAULT'] });
  return (r.FaceDetails ?? []).filter((f) => (f.Confidence ?? 0) >= 80).map((f) => ({ top: Math.round(f.BoundingBox.Top * h), bottom: Math.round((f.BoundingBox.Top + f.BoundingBox.Height) * h), left: Math.round(f.BoundingBox.Left * w), right: Math.round((f.BoundingBox.Left + f.BoundingBox.Width) * w) }));
}
if (process.argv[1]?.endsWith('face-boxes.mjs')) console.log(await faceBoxes(readFileSync(process.argv[2])));
