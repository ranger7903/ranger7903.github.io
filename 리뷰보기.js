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
    '.밸류스리뷰 .꼬리{color:var(--ink2,#6B6259);font-size:13px;margin-top:12px}';
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

  function 없음(자리, 제품) {
    자리.innerHTML = '<div class="밸류스리뷰"><p class="꼬리">' +
      '아직 남겨 주신 리뷰가 없습니다. ' +
      '<a href="' + 쓰는곳(제품) + '">처음으로 한 줄 남겨 주시겠어요?</a></p></div>';
  }

  function 그리기(자리, 리뷰들, 제품) {
    if (!리뷰들.length) { 없음(자리, 제품); return; }
    var 합 = 리뷰들.reduce(function (s, r) { return s + (r.별 || 0); }, 0);
    var 평균 = (합 / 리뷰들.length);
    var h = '<div class="밸류스리뷰">' +
      '<p style="margin:0 0 10px"><b>별 ' + 평균.toFixed(1) + '</b>' +
      ' <span class="별">' + '★'.repeat(Math.round(평균)) + '</span>' +
      ' <span class="날">리뷰 ' + 리뷰들.length + '개</span></p>';
    리뷰들.slice(0, 8).forEach(function (r) {
      h += '<div class="한줄"><span class="별">' + '★'.repeat(r.별 || 0) + '</span>' +
        '<span class="날">' + 글막기(r.때) + '</span>';
      if (r.좋은점) h += '<p>' + 글막기(r.좋은점) + '</p>';
      if (r.불편한점) h += '<p>아쉬운 점 — ' + 글막기(r.불편한점) + '</p>';
      if (r.바람) h += '<p>바라는 것 — ' + 글막기(r.바람) + '</p>';
      h += '</div>';
    });
    h += '<p class="꼬리">쓰신 분이 누구인지는 저희도 모릅니다. 이름을 묻지 않기 때문입니다. ' +
      '<a href="' + 쓰는곳(제품) + '">나도 한 줄 남기기</a></p></div>';
    자리.innerHTML = h;
  }
})();
