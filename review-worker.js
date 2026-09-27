/* 밸류스 «후기 받는 자리» — 2026-09-28
 *
 * 왜 새로 썼나 : 여기 있던 것이 «Hello World!» 빈 껍데기였다.
 *   그래서 손님이 후기를 쓰고 「보내기」를 눌러도 언제나
 *   「지금은 보내지지 않습니다」만 떴다. 후기가 0건이던 진짜 까닭이다.
 *
 * 지키는 것
 *   · 손님이 누구인지 묻지도, 남기지도 않는다. 주소(IP)를 저장하지 않는다.
 *   · 사장님이 「보이기」를 누른 것만 홈페이지에 나간다. 들어오자마자 뜨지 않는다.
 *   · 글을 고쳐 싣지 않는다. 별도 부풀리지 않는다.
 *   · 터져도 홈페이지는 그대로 돌아가야 한다.
 *
 * 쓰는 길
 *   POST /review              손님이 후기 보내기
 *   GET  /review/public?제품= 그 제품의 «보이기» 된 후기
 *   GET  /review/all          사장님만 — 전부 (머리글 x-owner-key)
 *   POST /review/judge        사장님만 — {번호, 정함:'보임'|'숨김'|'대기'}
 *   GET  /health              살아 있나
 */

const 허락한곳 = [
  'https://valuestools.kr',
  'https://www.valuestools.kr',
  'https://ranger7903.github.io',
];
const 칸 = 'reviews.json';   // 창고에 두는 열쇠 하나에 전부 담는다 (양이 적다)
const 최대보관 = 800;
const 글자한도 = 2000;

function 머리(origin) {
  const h = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,x-owner-key',
    'access-control-max-age': '86400',
  };
  if (origin && 허락한곳.indexOf(origin) >= 0) h['access-control-allow-origin'] = origin;
  else h['access-control-allow-origin'] = 허락한곳[0];
  return h;
}

function 답(obj, origin, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: 머리(origin) });
}

function 다듬기(v, 한도) {
  if (typeof v !== 'string') return '';
  let s = v.replace(/\u0000/g, '').trim();
  if (s.length > 한도) s = s.slice(0, 한도);
  return s;
}

async function 읽기(env) {
  try {
    const t = await env.REVIEWS.get(칸);
    const j = t ? JSON.parse(t) : [];
    return Array.isArray(j) ? j : [];
  } catch (e) { return []; }
}

async function 쓰기(env, 목록) {
  const 자를것 = 목록.slice(-최대보관);
  await env.REVIEWS.put(칸, JSON.stringify(자를것));
}

function 사장님인가(req, env) {
  const 온것 = req.headers.get('x-owner-key') || '';
  let 푼것 = 온것;
  try { 푼것 = decodeURIComponent(온것); } catch (e) { /* 그대로 본다 */ }
  const 참값 = env.OWNER_KEY || '';
  if (!참값) return false;                 // 열쇠를 안 정해 두었으면 잠김
  if (푼것.length !== 참값.length) return false;
  let 다름 = 0;                             // 글자 수로 새어 나가지 않게 끝까지 본다
  for (let i = 0; i < 참값.length; i++) 다름 |= 푼것.charCodeAt(i) ^ 참값.charCodeAt(i);
  return 다름 === 0;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const url = new URL(request.url);
    const 길 = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: 머리(origin) });
    }

    if (길 === '/health') return 답({ 됐다: true, 살아있음: true }, origin);

    /* ── 손님이 보내기 ─────────────────────────────── */
    if (길 === '/review' && request.method === 'POST') {
      if (!env.REVIEWS) return 답({ 잘못: '후기 창고가 아직 준비되지 않았습니다.' }, origin, 503);
      let 온것;
      try { 온것 = await request.json(); }
      catch (e) { return 답({ 잘못: '보내 주신 글을 읽지 못했습니다.' }, origin, 400); }

      const 제품 = 다듬기(온것['제품'], 40);
      const 별 = Math.round(Number(온것['별']));
      const 좋은점 = 다듬기(온것['좋은점'], 글자한도);
      const 불편한점 = 다듬기(온것['불편한점'], 글자한도);
      const 바람 = 다듬기(온것['바람'], 글자한도);
      const 기계 = 다듬기(온것['기계'], 40);

      if (!제품) return 답({ 잘못: '어떤 것을 쓰셨는지 골라 주세요.' }, origin, 400);
      if (!(별 >= 1 && 별 <= 5)) return 답({ 잘못: '별을 하나 눌러 주세요.' }, origin, 400);
      if (!좋은점 && !불편한점 && !바람) {
        return 답({ 잘못: '세 칸 가운데 한 칸이라도 적어 주셔야 저희가 고칠 수 있습니다.' }, origin, 400);
      }

      const 목록 = await 읽기(env);
      const 이제 = new Date();
      const 한건 = {
        번호: 이제.getTime().toString(36) + Math.random().toString(36).slice(2, 8),
        제품: 제품,
        별: 별,
        좋은점: 좋은점,
        불편한점: 불편한점,
        바람: 바람,
        기계: 기계,
        때: 이제.toISOString().slice(0, 10),
        상태: '대기',
      };
      목록.push(한건);
      await 쓰기(env, 목록);
      return 답({ 됐다: true, 번호: 한건.번호 }, origin);
    }

    /* ── 홈페이지에 보여 줄 것 (사장님이 보이기 한 것만) ── */
    if (길 === '/review/public' && request.method === 'GET') {
      const 제품 = 다듬기(url.searchParams.get('제품') || '', 40);
      if (!env.REVIEWS) return 답({ 리뷰: [] }, origin);
      const 목록 = await 읽기(env);
      const 낼것 = 목록
        .filter(function (r) { return r && r.상태 === '보임' && (!제품 || r.제품 === 제품); })
        .slice(-20).reverse()
        .map(function (r) {
          return { 별: r.별, 때: r.때, 좋은점: r.좋은점, 불편한점: r.불편한점, 바람: r.바람 };
        });
      return 답({ 리뷰: 낼것 }, origin);
    }

    /* ── 사장님만 ──────────────────────────────────── */
    if (길 === '/review/all' && request.method === 'GET') {
      if (!사장님인가(request, env)) return 답({ 잘못: '열쇠가 맞지 않습니다.' }, origin, 401);
      const 목록 = await 읽기(env);
      const 뒤집은것 = 목록.slice().reverse();
      return 답({
        리뷰: 뒤집은것,
        대기: 뒤집은것.filter(function (r) { return r.상태 === '대기'; }).length,
      }, origin);
    }

    if (길 === '/review/judge' && request.method === 'POST') {
      if (!사장님인가(request, env)) return 답({ 잘못: '열쇠가 맞지 않습니다.' }, origin, 401);
      let 온것;
      try { 온것 = await request.json(); }
      catch (e) { return 답({ 잘못: '읽지 못했습니다.' }, origin, 400); }
      const 번호 = 다듬기(온것['번호'], 60);
      const 정함 = 다듬기(온것['정함'], 10);
      if (['보임', '숨김', '대기'].indexOf(정함) < 0) {
        return 답({ 잘못: '보임·숨김·대기 가운데 하나여야 합니다.' }, origin, 400);
      }
      const 목록 = await 읽기(env);
      let 찾음 = false;
      for (let i = 0; i < 목록.length; i++) {
        if (목록[i] && 목록[i].번호 === 번호) { 목록[i].상태 = 정함; 찾음 = true; break; }
      }
      if (!찾음) return 답({ 잘못: '그 후기를 찾지 못했습니다.' }, origin, 404);
      await 쓰기(env, 목록);
      return 답({ 됐다: true }, origin);
    }

    return 답({ 잘못: '없는 자리입니다.' }, origin, 404);
  },
};
