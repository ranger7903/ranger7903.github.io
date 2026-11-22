/* 밸류스 AI 백화점 — 내가 받을 수 있는 돈 찾기: 질문 10개의 답(예/아니오/모름) → 따라 할 카드. 손님 브라우저 안에서만 돈다.
 * 카드의 사이트 주소·메뉴 이름은 2026-11-22 에 각 공식 사이트를 열어 확인했다(쪽 안 «출처» 칸과 같음). */
(function (root) {
  "use strict";
  var Q = ["ins", "bank", "stock", "free33", "work", "hosp", "car", "contract", "life", "family"];
  // 질문 → 카드 (앞의 것이 먼저 보인다)
  var MAP = {
    ins: ["ins"], bank: ["acct", "sleep", "points"], stock: ["fine"], free33: ["onetax"], work: ["onetax"],
    hosp: ["silson"], car: ["carv"], contract: ["c1372"], life: ["gov24", "bokji"], family: ["inherit"]
  };
  var BASIC = ["ins", "acct", "gov24"]; // 모두 «아니오»여도 누구나 한 번 볼 것
  /* a: {ins:"y"|"n"|"?", ...}  → {cards:[{id, level:"y"|"?", from:[질문]}], basic:bool, carLink:bool, answered:n} */
  function cards(a) {
    a = a || {};
    var seen = {}, list = [], answered = 0;
    ["y", "?"].forEach(function (lv) {
      Q.forEach(function (q) {
        if (a[q] !== lv) return;
        MAP[q].forEach(function (c) {
          if (seen[c]) { if (seen[c].from.indexOf(q) < 0) seen[c].from.push(q); return; }
          seen[c] = { id: c, level: lv, from: [q] }; list.push(seen[c]);
        });
      });
    });
    Q.forEach(function (q) { if (a[q] === "y" || a[q] === "n" || a[q] === "?") answered++; });
    var basic = false;
    if (!list.length && answered) { basic = true; list = BASIC.map(function (c) { return { id: c, level: "basic", from: [] }; }); }
    return { cards: list, basic: basic, carLink: a.car === "y" || a.car === "?", answered: answered };
  }
  var api = { Q: Q, MAP: MAP, BASIC: BASIC, cards: cards };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ClaimKR = api;
})(this);
