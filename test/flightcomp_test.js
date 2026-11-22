// 비행기 지연 보상 확인기 시험 — node test/flightcomp_test.js
// 거리 기준값은 엔진(haversine)과 다른 식(구면 코사인 법칙)으로 따로 계산해 적은 값이다. ±5km 안이어야 통과.
var path = require("path"), fs = require("fs");
var FC = require(path.join(__dirname, "..", "ai", "flightcomp-engine.js"));
var AP = {}; JSON.parse(fs.readFileSync(path.join(__dirname, "..", "ai", "airports.min.json"), "utf8")).forEach(function (a) { AP[a[0]] = a; });
var pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) pass++; else { fail++; console.log("✗", name, extra || ""); } }
function run(o) { o.from = AP[o.f]; o.to = AP[o.t]; return FC.check(o); }

// ── 1. 거리 (12가지)
var D = { "CDG-FCO": 1100.5, "ICN-CDG": 8926.7, "LHR-JFK": 5539.8, "LIS-HEL": 3363.9, "MAD-LPA": 1765.9, "CDG-RUN": 9369.6,
  "AMS-DXB": 5169.3, "KEF-OSL": 1781.4, "ZRH-BKK": 9054.4, "LHR-CDG": 347.6, "FRA-ICN": 8544.3, "NRT-FRA": 9367.5 };
Object.keys(D).forEach(function (k) { var p = k.split("-"), d = FC.distance(AP[p[0]], AP[p[1]]); ok("거리 " + k, Math.abs(d - D[k]) <= 5, d.toFixed(1) + " vs " + D[k]); });

// ── 2. 상황 (아래 하나하나가 한 가지)
var C = [
  // 이름, 입력, 바라는 판정, 바라는 돈(통화·금액·절반)
  ["유럽 단거리 3시간10분 → 250유로", { f: "CDG", t: "FCO", airline: "eu", event: "delay", delayH: 3.17, reason: "technical" }, "high", ["EUR", 250, null]],
  ["서울→파리 대한항공 지연 → 해당 없음", { f: "ICN", t: "CDG", airline: "other", event: "delay", delayH: 5 }, "none", null],
  ["파리→서울 대한항공 지연 → 해당 600", { f: "CDG", t: "ICN", airline: "other", event: "delay", delayH: 5, reason: "none" }, "high", ["EUR", 600, null]],
  ["서울→파리 에어프랑스 지연 → 해당 600", { f: "ICN", t: "CDG", airline: "eu", event: "delay", delayH: 6, reason: "technical" }, "high", ["EUR", 600, null]],
  ["런던→뉴욕 → 파운드 520", { f: "LHR", t: "JFK", airline: "other", event: "delay", delayH: 5, reason: "none" }, "high", ["GBP", 520, null]],
  ["날씨 → 낮음", { f: "CDG", t: "FCO", airline: "eu", event: "delay", delayH: 4, reason: "weather" }, "low", ["EUR", 250, null]],
  ["관제 → 낮음", { f: "LIS", t: "HEL", airline: "eu", event: "delay", delayH: 4, reason: "atc" }, "low", ["EUR", 400, null]],
  ["공항 직원 파업 → 낮음", { f: "CDG", t: "FCO", airline: "eu", event: "delay", delayH: 3.5, reason: "airport_strike" }, "low", null],
  ["항공사 직원 파업 → 높음", { f: "CDG", t: "FCO", airline: "eu", event: "delay", delayH: 3.5, reason: "airline_strike" }, "high", null],
  ["결항 20일 전 통보 → 해당 없음", { f: "CDG", t: "FCO", airline: "eu", event: "cancel", noticeDays: 20 }, "none", null],
  ["결항 14일 전 딱 → 해당 없음", { f: "CDG", t: "FCO", airline: "eu", event: "cancel", noticeDays: 14 }, "none", null],
  ["결항 10일 전, 대체편 1시간 일찍·3시간 늦게 → 해당 없음", { f: "CDG", t: "FCO", airline: "eu", event: "cancel", noticeDays: 10, rerouted: true, reDepEarlyH: 1, reArrLateH: 3 }, "none", null],
  ["결항 10일 전, 대체편 5시간 늦게 → 해당", { f: "CDG", t: "FCO", airline: "eu", event: "cancel", noticeDays: 10, rerouted: true, reDepEarlyH: 0, reArrLateH: 5, reason: "none" }, "high", ["EUR", 250, null]],
  ["결항 3일 전, 대체편 1시간 늦게 → 해당 없음", { f: "CDG", t: "FCO", airline: "eu", event: "cancel", noticeDays: 3, rerouted: true, reDepEarlyH: 0, reArrLateH: 1 }, "none", null],
  ["결항 당일, 대체편 없음 → 해당", { f: "CDG", t: "FCO", airline: "eu", event: "cancel", noticeDays: 0, reason: "technical" }, "high", ["EUR", 250, null]],
  ["결항 당일, 단거리 대체편 2시간 늦게 → 절반 125", { f: "CDG", t: "FCO", airline: "eu", event: "cancel", noticeDays: 0, rerouted: true, reDepEarlyH: 0, reArrLateH: 2, reason: "none" }, "high", ["EUR", 250, 125]],
  ["3,600km 넘는 비행 3시간30분 늦음 → 절반 안내", { f: "AMS", t: "DXB", airline: "eu", event: "delay", delayH: 3.5, reason: "none" }, "high", ["EUR", 600, 300]],
  ["3,600km·대체편 3시간30분 → 절반", { f: "AMS", t: "DXB", airline: "eu", event: "cancel", noticeDays: 1, rerouted: true, reArrLateH: 3.5, reason: "none" }, "high", ["EUR", 600, 300]],
  ["먼 비행 5시간 늦음 → 600 그대로", { f: "AMS", t: "DXB", airline: "eu", event: "delay", delayH: 5, reason: "none" }, "high", ["EUR", 600, null]],
  ["2시간 50분 늦음 → 해당 없음", { f: "CDG", t: "FCO", airline: "eu", event: "delay", delayH: 2.83 }, "none", null],
  ["딱 3시간 → 해당", { f: "CDG", t: "FCO", airline: "eu", event: "delay", delayH: 3, reason: "none" }, "high", ["EUR", 250, null]],
  ["EU 안 3,500km 넘는 비행(파리→레위니옹) → 400", { f: "CDG", t: "RUN", airline: "eu", event: "delay", delayH: 5, reason: "none" }, "high", ["EUR", 400, null]],
  ["EU 안 1,500km 넘는 비행(마드리드→그란카나리아) → 400", { f: "MAD", t: "LPA", airline: "eu", event: "delay", delayH: 4, reason: "none" }, "high", ["EUR", 400, null]],
  ["아이슬란드→노르웨이 → 400", { f: "KEF", t: "OSL", airline: "eu", event: "delay", delayH: 4, reason: "none" }, "high", ["EUR", 400, null]],
  ["스위스→방콕 → 600", { f: "ZRH", t: "BKK", airline: "other", event: "delay", delayH: 4, reason: "none" }, "high", ["EUR", 600, null]],
  ["페로 제도 출발, 다른 항공사 → 해당 없음", { f: "FAE", t: "CPH", airline: "other", event: "delay", delayH: 4 }, "none", null],
  ["페로 제도 출발, EU 항공사 → 해당", { f: "FAE", t: "CPH", airline: "eu", event: "delay", delayH: 4, reason: "none" }, "high", ["EUR", 250, null]],
  ["도쿄→프랑크푸르트 항공사 모름 → 낮음(항공사 확인)", { f: "NRT", t: "FRA", airline: "unknown", event: "delay", delayH: 4, reason: "none" }, "low", ["EUR", 600, null]],
  ["서울→도쿄 → 해당 없음", { f: "ICN", t: "NRT", airline: "eu", event: "delay", delayH: 6 }, "none", null],
  ["탑승 거부(원치 않음) → 해당", { f: "CDG", t: "FCO", airline: "eu", event: "denied", voluntary: false }, "high", ["EUR", 250, null]],
  ["탑승 거부(스스로 양보) → 해당 없음", { f: "CDG", t: "FCO", airline: "eu", event: "denied", voluntary: true }, "none", null],
  ["탑승 거부엔 날씨 까닭 안 봄", { f: "CDG", t: "FCO", airline: "eu", event: "denied", reason: "weather" }, "high", null],
  ["런던→파리 영국항공 → 둘 다(EU 아님·UK) 파운드 220", { f: "LHR", t: "CDG", airline: "uk", event: "delay", delayH: 3.5, reason: "none" }, "high", ["GBP", 220, null]],
  ["파리→런던 영국항공 → EU 규칙 250", { f: "CDG", t: "LHR", airline: "uk", event: "delay", delayH: 3.5, reason: "none" }, "high", ["EUR", 250, null]],
  ["뉴욕→런던 대한항공 → 해당 없음", { f: "JFK", t: "LHR", airline: "other", event: "delay", delayH: 5 }, "none", null],
  ["뉴욕→런던 영국항공 → 파운드 520", { f: "JFK", t: "LHR", airline: "uk", event: "delay", delayH: 5, reason: "none" }, "high", ["GBP", 520, null]],
  ["뉴욕→런던 에어프랑스(EU) → 영국 규칙 520", { f: "JFK", t: "LHR", airline: "eu", event: "delay", delayH: 5, reason: "none" }, "high", ["GBP", 520, null]],
  ["두바이→런던 에미레이트 → 해당 없음", { f: "DXB", t: "LHR", airline: "other", event: "delay", delayH: 5 }, "none", null],
  ["뉴욕→파리 영국항공(UK) → 영국 규칙", { f: "JFK", t: "CDG", airline: "uk", event: "delay", delayH: 5, reason: "none" }, "high", ["GBP", 520, null]],
  ["런던→뉴욕 3시간30분 → 260파운드 절반", { f: "LHR", t: "JFK", airline: "uk", event: "delay", delayH: 3.5, reason: "none" }, "high", ["GBP", 520, 260]],
  ["맨체스터→알리칸테 → 350파운드", { f: "MAN", t: "ALC", airline: "uk", event: "delay", delayH: 3.5, reason: "none" }, "high", ["GBP", 350, null]],
  ["같은 공항 → 입력 확인", { f: "CDG", t: "CDG", airline: "eu", event: "delay", delayH: 4 }, "input", null],
  ["무슨 일 안 고름 → 입력 확인", { f: "CDG", t: "FCO", airline: "eu", event: "" }, "input", null],
  ["까닭 모름 → 높음(까닭 물어보기)", { f: "CDG", t: "FCO", airline: "eu", event: "delay", delayH: 4, reason: "unknown" }, "high", null],
  ["2027-10-23 뒤 비행은 새 규칙 알림", { f: "CDG", t: "FCO", airline: "eu", event: "delay", delayH: 4, reason: "none", date: "2027-11-01" }, "high", null],
];
C.forEach(function (c) {
  var r = run(c[1]);
  ok(c[0] + " 판정", r.verdict === c[2], "→ " + r.verdict + " " + JSON.stringify(r.lines));
  if (c[3]) ok(c[0] + " 돈", r.money && r.money.cur === c[3][0] && r.money.full === c[3][1] && r.money.half === c[3][2], JSON.stringify(r.money));
});
ok("새 규칙 표시", run(C[C.length - 1][1]).newRules === true);
ok("옛 규칙 표시", run(C[0][1]).newRules === false);
ok("런던→파리 영국항공 은 EU·UK 둘 중 하나", (function () { var r = run({ f: "LHR", t: "CDG", airline: "eu", event: "delay", delayH: 4, reason: "none" }); return r.laws.length === 2 && r.money.alt && r.money.alt.cur === "GBP"; })());
ok("편명 KE901 → 대한항공 other", FC.airlineOf("KE901").kind === "other");
ok("편명 lh 712 → Lufthansa eu", FC.airlineOf("lh 712").kind === "eu");
ok("편명 BA1 → uk", FC.airlineOf("BA1").kind === "uk");
ok("모르는 편명 → null", FC.airlineOf("ZZ12") === null);
ok("공항 자료 1MB 아래", fs.statSync(path.join(__dirname, "..", "ai", "airports.min.json")).size < 1024 * 1024);
console.log("상황 " + C.length + "가지 · 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
