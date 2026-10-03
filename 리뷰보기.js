/* 밸류스 「리뷰 보여 주기」 — 제품 쪽에 손님 리뷰를 붙인다.
 *
 * 쓰는 법 : 제품 쪽 아무 데나 이 한 줄을 넣으면 그 자리에 붙습니다.
 *   <div data-리뷰="garifile"></div>
 *   <script src="리뷰보기.js"></script>
 *
 * 지키는 것
 *   · 사장님이 «보이기»로 정한 것만 나옵니다. 들어오자마자 뜨지 않습니다.
 *   · 별을 부풀리지 않습니다. 낮은 별도 그대로 셉니다.
 *   · 리뷰가 없으면 «없다»고 적습니다. 있는 척하지 않습니다.
 *   · 글자를 고쳐 싣지 않습니다.
 */
(function () {
  'use strict';
  if (window.__밸류스리뷰보기) return;
  window.__밸류스리뷰보기 = true;

  var 자리들 = document.querySelectorAll('[data-리뷰]');
  if (!자리들.length) return;

  /* 2026-10-03 고침 — 손님 눈으로 다시 봄.
   * 영어 쪽(dolbom·meter·yakbong·receipt·send-safely)에도 이 조각이 붙어 있는데
   * 여기서 만드는 글이 전부 우리말이었다. 영어로 보시는 손님에게 한글이 그대로 떴다.
   * 그래서 쪽의 <html lang="…"> 을 보고 그 나라 말로 적는다. */
  var 영어 = (document.documentElement.getAttribute('lang') || 'ko')
    .toLowerCase().indexOf('en') === 0;
  function 말(ko, en) { return 영어 ? en : ko; }

  function 글막기(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var 꾸밈 = document.createElement('style');
  꾸밈.textContent =
    '.밸류스리뷰{margin-top:10px}' +
    '.밸류스리뷰 .한줄{border-top:1px solid var(--line,#E6DCCE);padding:12px 0}' +
    '.밸류스리뷰 .한줄:first-child{border-top:0}' +
    '.밸류스리뷰 .별{color:var(--accent,#C0603C);font-size:15px}' +
    '.밸류스리뷰 .날{color:var(--ink2,#6B6259);font-size:13px;margin-left:8px}' +
    '.밸류스리뷰 p{margin:5px 0 0;font-size:15px;line-height:1.7}' +
    '.밸류스리뷰 .꼬리{display:block;color:var(--ink2,#6B6259);font-size:13px;margin-top:10px}' +
    '.밸류스리뷰 .약속{border:1px solid var(--line,#EAD9BE);border-radius:10px;' +
      'padding:12px 14px;font-size:14px;line-height:1.7}' +
    '.밸류스리뷰 .약속 ul{margin:8px 0 0;padding-left:18px}' +
    '.밸류스리뷰 .약속 li{margin:3px 0}';
  document.head.appendChild(꾸밈);

  fetch('리뷰설정.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (설정) {
      if (!설정 || !설정.켜짐 || !설정.받개) throw new Error('꺼짐');
      var 받개 = 설정.받개.replace(/\/+$/, '');
      Array.prototype.forEach.call(자리들, function (자리) {
        var 제품 = 자리.getAttribute('data-리뷰') || '';
        fetch(받개 + '/review/public?제품=' + encodeURIComponent(제품), { cache: 'no-store' })
          .then(function (r) { return r.json(); })
          .then(function (j) { 그리기(자리, j.리뷰 || [], 제품); })
          .catch(function () { 없음(자리, 제품); });
      });
    })
    .catch(function () {
      Array.prototype.forEach.call(자리들, function (자리) {
        없음(자리, 자리.getAttribute('data-리뷰') || '');
      });
    });

  function 쓰는곳(제품) {
    return '리뷰.html' + (제품 ? '?제품=' + encodeURIComponent(제품) : '');
  }

  /* 2026-09-28 고침 — 손님 눈으로 다시 봄.
   * 전에는 카드마다 «아직 리뷰가 없습니다»가 열여덟 번 떴다.
   * 사지도 않은 손님에게 리뷰를 조르는 꼴이었고, 「아무도 안 쓰나 보다」로만 읽혔다.
   * 그래서 없을 때는 «조르는 말» 대신 «우리가 실제로 지키는 약속»을 적는다.
   * 여기 적는 것은 전부 환불 정책(refund.html)에 이미 적혀 있는 것뿐이다. 부풀리지 않는다. */
  function 없음(자리, 제품) {
    자리.innerHTML =
      '<div class="밸류스리뷰"><div class="약속">' +
      말('<b>아직 후기가 없습니다.</b> 그래서 이렇게 해 두었습니다.',
         '<b>Nobody has written one yet.</b> So here is what we do instead.') +
      '<ul>' +
      말('<li>사기 전에 <a href="free.html">공짜 도구</a>로 저희 솜씨를 먼저 보실 수 있습니다.</li>',
         '<li>Before you buy, try one of our <a href="free.html">free tools</a> and see the work for yourself.</li>') +
      말('<li>사신 뒤 <b>7일 안</b>에, 정품 키를 아직 넣지 않으셨다면 <b>그냥 물러 드립니다.</b></li>',
         '<li><b>Within 7 days</b> of buying, if you have not yet entered the licence key, <b>we refund it, no questions.</b></li>') +
      말('<li>설치가 안 되거나 설명과 다르면 <b>기간과 상관없이</b> 돌려드립니다.</li>',
         '<li>If it will not install, or it is not what the page said, we refund it <b>however long it has been.</b></li>') +
      '</ul>' +
      '<span class="꼬리">' +
      말('자세한 것은 <a href="refund.html">환불 정책</a>에 적어 두었습니다. ' +
        '이미 쓰고 계신 분이라면 <a href="' + 쓰는곳(제품) + '">한 줄 남겨 주세요</a> — 다음 판에서 고칩니다.',
         'The details are in our <a href="refund.html">refund policy</a>. ' +
         'If you are already using it, <a href="' + 쓰는곳(제품) + '">please leave us a line</a> — we fix things in the next build.') +
      '</span>' +
      '</div></div>';
  }

  function 그리기(자리, 리뷰들, 제품) {
    if (!리뷰들.length) { 없음(자리, 제품); return; }
    var 합 = 리뷰들.reduce(function (s, r) { return s + (r.별 || 0); }, 0);
    var 평균 = (합 / 리뷰들.length);
    var h = '<div class="밸류스리뷰">' +
      '<p style="margin:0 0 10px"><b>' +
      말('별 ' + 평균.toFixed(1), 평균.toFixed(1) + ' out of 5') + '</b>' +
      ' <span class="별">' + '★'.repeat(Math.round(평균)) + '</span>' +
      ' <span class="날">' +
      말('리뷰 ' + 리뷰들.length + '개',
         리뷰들.length + (리뷰들.length === 1 ? ' review' : ' reviews')) +
      '</span></p>';
    리뷰들.slice(0, 8).forEach(function (r) {
      h += '<div class="한줄"><span class="별">' + '★'.repeat(r.별 || 0) + '</span>' +
        '<span class="날">' + 글막기(r.때) + '</span>';
      if (r.좋은점) h += '<p>' + 글막기(r.좋은점) + '</p>';
      if (r.불편한점) h += '<p>' + 말('아쉬운 점 — ', 'Could be better — ') + 글막기(r.불편한점) + '</p>';
      if (r.바람) h += '<p>' + 말('바라는 것 — ', 'Wished for — ') + 글막기(r.바람) + '</p>';
      h += '</div>';
    });
    h += '<p class="꼬리">' +
      말('쓰신 분이 누구인지는 저희도 모릅니다. 이름을 묻지 않기 때문입니다. ' +
        '<a href="' + 쓰는곳(제품) + '">나도 한 줄 남기기</a>',
         'We do not know who wrote these — we never ask for a name. ' +
         '<a href="' + 쓰는곳(제품) + '">Leave a line yourself</a>') +
      '</p></div>';
    자리.innerHTML = h;
  }
})();
