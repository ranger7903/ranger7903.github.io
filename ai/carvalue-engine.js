/* 밸류스 AI 백화점 — 사고 차값 떨어진 돈(자동차 시세하락손해) 계산. 손님 브라우저 안에서만 돈다.
 * 기준: 자동차보험 표준약관 <별표 2> 대물배상 지급 기준 6. 자동차시세 하락손해 (보험업감독업무시행세칙 별표15)
 *   가. 지급대상: 사고로 인한 자동차(출고 후 5년 이하인 자동차에 한함)의 수리비용이 사고 직전 자동차가액의 20%를 초과하는 경우
 *   나. 인정기준액: 출고 후 1년 이하 수리비용의 20% · 1년 초과 2년 이하 15% · 2년 초과 5년 이하 10%
 * 원문 확인(2026-11-22): 금융감독원 보도자료 「주요 분쟁사례로 알아보는 소비자 유의사항 - 자동차 시세하락 손해 관련 -」(2025-11-24 조간)
 *   https://www.fss.or.kr/fss/bbs/B0000188/view.do?nttId=207527&menuNo=200218  (참고에 약관 원문, 사례: 실제 500만 원 하락 · 약관 120만 원)
 *   세칙 현행판: https://www.law.go.kr/행정규칙/보험업감독업무시행세칙 ([시행 2026. 9. 10.])
 *   «초과»는 넘을 때만(20%와 같으면 해당 없음) — 같은 보도자료 사례 2.  나이는 «사고 당시» 출고 후 기간.
 *   과실상계: 약관 「과실상계 등」 — 대물배상 금액은 피해자측 과실비율만큼 줄인다. */
(function (root) {
  "use strict";
  function d(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addY(dt, y) { var x = new Date(dt.getFullYear() + y, dt.getMonth(), dt.getDate()); if (x.getMonth() !== dt.getMonth()) x.setDate(0); return x; }
  /* x: {made:"YYYY-MM-DD"(출고일), crash:"YYYY-MM-DD"(사고일), value(사고 직전 차값, 원), repair(수리비, 원), fault(내 잘못 %, 0~100)} */
  function calc(x) {
    var out = { ok: false, reason: "", rate: 0, base: 0, amount: 0, ageBand: 0, ratio: 0 };
    var value = +x.value, repair = +x.repair, fault = x.fault === "" || x.fault == null ? 0 : +x.fault;
    if (!x.made || !x.crash || !(value > 0) || !(repair > 0)) { out.reason = "input"; return out; }
    if (fault < 0 || fault > 100 || isNaN(fault)) { out.reason = "fault"; return out; }
    var m = d(x.made), c = d(x.crash);
    if (c < m) { out.reason = "dates"; return out; }
    out.ratio = repair / value;
    if (c <= addY(m, 1)) { out.ageBand = 1; out.rate = 0.20; }
    else if (c <= addY(m, 2)) { out.ageBand = 2; out.rate = 0.15; }
    else if (c <= addY(m, 5)) { out.ageBand = 3; out.rate = 0.10; }
    else { out.ageBand = 4; out.reason = "old"; return out; }
    if (!(repair > value * 0.2)) { out.reason = "small"; return out; }
    if (fault >= 100) { out.reason = "myfault"; return out; }
    out.ok = true;
    out.base = Math.round(repair * out.rate);
    out.amount = Math.round(out.base * (100 - fault) / 100);
    return out;
  }
  var api = { calc: calc };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.CarValue = api;
})(this);
