// 2026-11-08 대표 「완전 진짜 같이 ㄱㄱ · 1인칭 상황극·토킹헤드도 시도」: 새 릴스 3편 설정(대본 + Kling 명령문).
// 사용: node scripts/make-bench-configs-1108.mjs → ai-reels/bench/bench-street4·pov1·talk1.json
// 길거리 인터뷰는 1위(street2) 명령문 그대로: 다큐식 · 마이크 든 손 · 자연스럽게 예쁜/잘생긴 · 연기 지시 없음.
// 상황극·토킹헤드는 같은 사람이 4번 나와야 해서 기준 사진 1장(text_to_image) → image_to_video 4번.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const dir = resolve(import.meta.dirname, '..', 'ai-reels', 'bench');
const clip = (n) => `C:/topnote-social/ai-reels/bench/${n}.mp4`;

const ST = (loc, side, person, action, line) =>
  `Candid documentary-style street interview, vertical, slight natural handheld shake. Location: ${loc}; absolutely no signs, no letters, no text anywhere in the background. An interviewer's hand holds a small black microphone into the frame from the ${side}. ${person}, ${action} and answers in casual Korean: "${line}" Real-person feel, not posed, natural skin texture.`;
const HAN = 'Han River park in Seoul on a clear autumn afternoon, grass, trees and the river softly blurred behind';
const GINKGO = 'a quiet tree-lined residential street in Seoul with ginkgo trees turning yellow, brick walls, soft afternoon light';
const END = ' Real-person feel, not posed, natural skin texture.';

const street4 = {
  id: 'bench-street4', natural: true, format: '길거리 인터뷰(street2 명령문 그대로)',
  title: 'Q. 소개팅에서\n「나 마음에 들었구나」 티 나는 순간?',
  clips: [
    { file: clip('st4_1'), sub: '음... 질문이 계속 나올 때요?\n그거 티 나요.', prompt: ST(HAN, 'right', 'A naturally beautiful Korean woman in her late 20s, minimal makeup, long hair moving in the wind, oversized beige cardigan', 'thinks for a second, laughs naturally', '음... 질문이 계속 나올 때요? 그거 티 나요.') },
    { file: clip('st4_2'), sub: '끝나고 역까지\n데려다준다고 할 때요.', prompt: ST(GINKGO, 'left', 'A handsome Korean man around 30, natural look, short hair, grey sweatshirt under a black coat', 'smiles a bit shyly', '끝나고 역까지 데려다준다고 할 때요.') },
    { file: clip('st4_3'), sub: '폰을 아예 안 봐요.\n그게 제일 커요.', prompt: ST('a quiet park path in Seoul lined with autumn trees, fallen leaves, soft afternoon light', 'left', 'A naturally beautiful Korean woman around 30, minimal makeup, short bob hair, cream scarf and navy coat', 'nods and answers casually', '폰을 아예 안 봐요. 그게 제일 커요.') },
    { file: clip('st4_4'), sub: '다음에 언제 시간 되냐고\n먼저 물어볼 때요.', prompt: ST(`${HAN}, a bridge far in the distance`, 'right', 'A handsome Korean man in his early 30s, natural look, neat hair, beige trench coat', 'laughs naturally', '다음에 언제 시간 되냐고 먼저 물어볼 때요.') },
  ],
  end: { line1: '마음은, 3분이면 티 나요.', line2: '탑노트 · 사진 말고 목소리로 3분 먼저' },
  caption: '소개팅에서 「나 마음에 들었구나」 티 나는 순간, 물어봤습니다.\n\n여러분은 어떤 순간에 알아채요? 댓글로 👇\n\n#소개팅 #썸 #호감신호 #30대연애 #길거리인터뷰 #보이스소개팅 #AI연출',
  comment: '질문이 계속 / 역까지 데려다주기 / 폰 안 보기 / 다음 약속 먼저\n여러분은 몇 번? 👇\n먼저 3분 통화해 보고 싶다면 프로필 링크 👆',
  threads: '소개팅에서 나 마음에 들었구나 티 나는 순간\n\n질문이 계속 나올 때\n역까지 데려다준다고 할 때\n폰을 아예 안 볼 때\n다음 약속을 먼저 물어볼 때\n\n너는 어디서 알아채?',
  threads_reply: '마음은 3분이면 티 나요 👉 https://topnote.app/th\n검증된 사람과 사진 없이 목소리로 먼저 #AI연출',
  topic: '소개팅',
};

const POV = 'Vertical phone video, first-person point of view as if the viewer is her blind date sitting across the table, subtle handheld. Location: a quiet cozy cafe in Seoul, warm window light, wooden table with two coffee cups, background softly blurred; absolutely no signs, menus, letters or text anywhere. The same woman as in the reference image talks directly to the camera as if to her date, ';
const pov1 = {
  id: 'bench-pov1', natural: true, format: '1인칭 상황극 VS(기준 사진 1장 → image_to_video 4번)',
  ref_image_prompt: 'Photo taken on a phone across a cafe table: a naturally beautiful Korean woman around 30, minimal makeup, shoulder-length dark hair, cream knit sweater, sitting at a wooden table with a coffee cup, warm window light, cozy quiet cafe softly blurred behind with no signs, menus, letters or text, real-person feel, natural skin texture, vertical 9:16.',
  title: '소개팅 상대가\n마음에 들 때 VS 안 들 때',
  clips: [
    { file: clip('pv1'), sub: '💗 마음에 들 때\n「진짜요? 저도 그거 좋아해요!」', prompt: `${POV}leaning in with bright eyes and a genuine smile, saying in casual Korean: "진짜요? 저도 그거 좋아해요!"${END}` },
    { file: clip('pv2'), sub: '😐 안 들 때\n「아... 네. 그렇구나.」', prompt: `${POV}leaning back, polite but flat smile, glancing down at her phone on the table, saying in casual Korean: "아... 네. 그렇구나."${END}` },
    { file: clip('pv3'), sub: '💗 마음에 들 때\n「저 오늘 시간 괜찮은데요?」', prompt: `${POV}touching her hair a little, smiling shyly, saying in casual Korean: "저 오늘 시간 괜찮은데요?"${END}` },
    { file: clip('pv4'), sub: '😐 안 들 때\n「제가 내일 일찍 일어나야 돼서요.」', prompt: `${POV}already holding her bag, polite apologetic smile, saying in casual Korean: "제가 내일 일찍 일어나야 돼서요."${END}` },
  ],
  end: { line1: '두 시간 앉아 있기 전에, 3분.', line2: '탑노트 · 사진 말고 목소리로 3분 먼저' },
  caption: '소개팅 상대가 마음에 들 때 VS 안 들 때\n\n솔직히 다 티 나죠? 겪어본 거 댓글로 👇\n\n#소개팅 #소개팅현실 #썸 #30대연애 #공감 #보이스소개팅 #AI연출',
  comment: '「내일 일찍 일어나야 돼서요」 들어본 사람 👇\n두 시간 앉아 있기 전에 3분 먼저 통화해 보고 싶다면 프로필 링크 👆',
  threads: '소개팅 상대가 마음에 들 때 VS 안 들 때\n\n마음에 들 때: 진짜요? 저도 그거 좋아해요!\n안 들 때: 아... 네. 그렇구나.\n\n마음에 들 때: 저 오늘 시간 괜찮은데요?\n안 들 때: 제가 내일 일찍 일어나야 돼서요.\n\n들어본 적 있어?',
  threads_reply: '두 시간 앉아 있기 전에 3분 먼저 👉 https://topnote.app/th\n검증된 사람과 사진 없이 목소리로 #AI연출',
  topic: '소개팅',
};

const TH = 'Vertical selfie video filmed on a phone propped on a desk at home in the evening, warm lamp light, plain cream wall and a few plants softly blurred behind; absolutely no posters, book titles, letters or text anywhere. The same woman as in the reference image talks to the camera casually like a vlog, natural small gestures, ';
const talk1 = {
  id: 'bench-talk1', natural: true, format: '토킹헤드(기준 사진 1장 → image_to_video 4번)',
  ref_image_prompt: 'Phone selfie video frame at home in the evening: a naturally beautiful Korean woman around 31, minimal makeup, long dark hair tucked behind one ear, oversized grey sweatshirt, sitting at a desk, warm lamp light, plain cream wall and plants softly blurred behind with no posters or text, real-person feel, natural skin texture, vertical 9:16.',
  title: '소개팅에서\n바로 거르는 남자 3가지',
  clips: [
    { file: clip('th1'), sub: '소개팅 많이 해보니까\n딱 보이는 게 있더라고요.', prompt: `${TH}saying in casual Korean: "소개팅 많이 해보니까 딱 보이는 게 있더라고요."${END}` },
    { file: clip('th2'), sub: '첫째, 한 시간 내내\n자기 얘기만 하는 사람.', prompt: `${TH}raising one finger with a small laugh, saying in casual Korean: "첫째, 한 시간 내내 자기 얘기만 하는 사람."${END}` },
    { file: clip('th3'), sub: '둘째, 점원한테\n말 함부로 하는 사람.', prompt: `${TH}shaking her head slightly, saying in casual Korean: "둘째, 점원한테 말 함부로 하는 사람."${END}` },
    { file: clip('th4'), sub: '셋째, 사진이랑 다른 사람.\n그래서 요즘은 목소리부터 들어봐요.', prompt: `${TH}smiling knowingly, saying in casual Korean: "셋째, 사진이랑 다른 사람. 그래서 요즘은 목소리부터 들어봐요."${END}` },
  ],
  end: { line1: '거를 사람은, 3분이면 걸러져요.', line2: '탑노트 · 검증된 사람과 사진 없이 3분 통화' },
  caption: '소개팅에서 바로 거르는 남자 3가지\n\n여러분이 거르는 하나는? 댓글로 👇\n\n#소개팅 #거르는남자 #연애팁 #30대연애 #소개팅후기 #보이스소개팅 #AI연출',
  comment: '자기 얘기만 / 점원한테 막말 / 사진이랑 다름\n여러분이 추가할 4번째는? 👇\n목소리부터 들어보고 싶다면 프로필 링크 👆',
  threads: '소개팅에서 바로 거르는 남자 3가지\n\n1. 한 시간 내내 자기 얘기만\n2. 점원한테 말 함부로\n3. 사진이랑 다른 사람\n\n너라면 4번째로 뭐 넣을래?',
  threads_reply: '그래서 요즘은 목소리부터 👉 https://topnote.app/th\n검증된 사람과 사진 없이 3분 #AI연출',
  topic: '소개팅',
};

for (const c of [street4, pov1, talk1]) writeFileSync(resolve(dir, `${c.id}.json`), JSON.stringify(c, null, 1) + '\n');
console.log('ok');
