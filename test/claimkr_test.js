// 내가 받을 수 있는 돈 찾기 시험(답 → 카드) — node test/claimkr_test.js
var CK = require(require("path").join(__dirname, "..", "ai", "claimkr-engine.js"));
var pass = 0, fail = 0;
function t(name, ans, want, extra) {
  var r = CK.cards(ans), ids = r.cards.map(function (c) { return c.id; }).join(",");
  var good = ids === want.join(",") && (!extra || extra(r));
  if (good) pass++; else { fail++; console.log("✗", name, ids, JSON.stringify(r)); }
}
function all(v) { var o = {}; CK.Q.forEach(function (q) { o[q] = v; }); return o; }
t("아무것도 안 답함 → 카드 없음", {}, [], function (r) { return !r.basic && r.answered === 0; });
t("모두 아니오 → 누구나 볼 셋", all("n"), ["ins", "acct", "gov24"], function (r) { return r.basic; });
t("보험 예", { ins: "y" }, ["ins"]);
t("오래 안 쓴 통장 예 → 셋", { bank: "y" }, ["acct", "sleep", "points"]);
t("주식 예 → 파인", { stock: "y" }, ["fine"]);
t("3.3% 예 → 원클릭 환급", { free33: "y" }, ["onetax"]);
t("직장 공제 예 → 원클릭 환급", { work: "y" }, ["onetax"]);
t("3.3%·직장 둘 다 예 → 카드 하나, 질문 둘", { free33: "y", work: "y" }, ["onetax"], function (r) { return r.cards[0].from.join() === "free33,work"; });
t("병원비 예 → 실손24", { hosp: "y" }, ["silson"]);
t("사고 예 → 차값 카드 + 방 잇기", { car: "y" }, ["carv"], function (r) { return r.carLink; });
t("사고 모름 → 차값 카드(확인) + 방 잇기", { car: "?" }, ["carv"], function (r) { return r.carLink && r.cards[0].level === "?"; });
t("사고 아니오 → 방 안 잇기", { car: "n", ins: "y" }, ["ins"], function (r) { return !r.carLink; });
t("약정 예 → 1372", { contract: "y" }, ["c1372"]);
t("생활 변화 예 → 보조금24·복지멤버십", { life: "y" }, ["gov24", "bokji"]);
t("가족 돌아가심 예 → 안심상속", { family: "y" }, ["inherit"]);
t("예가 모름보다 먼저", { ins: "?", hosp: "y" }, ["silson", "ins"], function (r) { return r.cards[0].level === "y" && r.cards[1].level === "?"; });
t("모두 예 → 카드 열셋, 겹침 없음", all("y"), ["ins", "acct", "sleep", "points", "fine", "onetax", "silson", "carv", "c1372", "gov24", "bokji", "inherit"]);
t("모두 모름 → 같은 카드, 모두 확인", all("?"), ["ins", "acct", "sleep", "points", "fine", "onetax", "silson", "carv", "c1372", "gov24", "bokji", "inherit"], function (r) { return r.cards.every(function (c) { return c.level === "?"; }); });
t("섞임: 통장 예·보험 모름·나머지 아니오", Object.assign(all("n"), { bank: "y", ins: "?" }), ["acct", "sleep", "points", "ins"], function (r) { return !r.basic; });
t("한 개만 아니오 → 기본 셋(답한 게 있으니)", { ins: "n" }, ["ins", "acct", "gov24"], function (r) { return r.basic && r.answered === 1; });
t("이상한 값은 안 셈", { ins: "maybe", bank: "" }, [], function (r) { return r.answered === 0; });
t("직장 모름·3.3% 예 → 예로 한 번", { work: "?", free33: "y" }, ["onetax"], function (r) { return r.cards[0].level === "y" && r.cards[0].from.join() === "free33,work"; });
console.log("답→카드 " + (pass + fail) + "가지 · 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
