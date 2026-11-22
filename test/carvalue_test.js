// 사고 차값 떨어진 돈 계산 시험 — node test/carvalue_test.js
var CV = require(require("path").join(__dirname, "..", "ai", "carvalue-engine.js"));
var pass = 0, fail = 0;
function t(name, x, want) {
  var r = CV.calc(x), good = Object.keys(want).every(function (k) { return r[k] === want[k]; });
  if (good) pass++; else { fail++; console.log("✗", name, JSON.stringify(r)); }
}
// 금감원 2025-11 사례 1: 출고 1년 안, 수리비 600만 → 120만
t("금감원 사례 1(차값은 보도자료에 없어 2,500만으로)", { made: "2024-03-01", crash: "2025-01-10", value: 25000000, repair: 6000000, fault: 0 }, { ok: true, rate: 0.2, amount: 1200000 });
// 금감원 사례 2: 수리비 200만, 차값 3천만 → 20%(600만) 안 넘음 → 해당 없음
t("금감원 사례 2", { made: "2024-03-01", crash: "2025-01-10", value: 30000000, repair: 2000000 }, { ok: false, reason: "small" });
t("수리비가 차값보다 큼 → 그래도 계산", { made: "2025-01-01", crash: "2025-06-01", value: 5000000, repair: 7000000 }, { ok: true, amount: 1400000 });
t("600만/3천만 = 딱 20% → 해당 없음", { made: "2024-03-01", crash: "2025-01-10", value: 30000000, repair: 6000000 }, { ok: false, reason: "small" });
t("정확히 20% → 해당 없음", { made: "2024-03-01", crash: "2025-01-10", value: 25000000, repair: 5000000 }, { ok: false, reason: "small" });
t("20% 조금 넘음 → 해당", { made: "2024-03-01", crash: "2025-01-10", value: 25000000, repair: 5000001 }, { ok: true, amount: 1000000 });
t("출고 딱 1년 날 → 20%", { made: "2024-03-01", crash: "2025-03-01", value: 20000000, repair: 5000000 }, { ok: true, rate: 0.2, amount: 1000000 });
t("1년 하루 지남 → 15%", { made: "2024-03-01", crash: "2025-03-02", value: 20000000, repair: 5000000 }, { ok: true, rate: 0.15, amount: 750000 });
t("딱 2년 → 15%", { made: "2023-03-01", crash: "2025-03-01", value: 20000000, repair: 5000000 }, { ok: true, rate: 0.15 });
t("2년 넘음 → 10%", { made: "2023-03-01", crash: "2025-03-05", value: 20000000, repair: 5000000 }, { ok: true, rate: 0.1, amount: 500000 });
t("딱 5년 → 10%", { made: "2020-03-01", crash: "2025-03-01", value: 10000000, repair: 3000000 }, { ok: true, rate: 0.1, amount: 300000 });
t("5년 넘음 → 해당 없음", { made: "2020-03-01", crash: "2025-03-02", value: 10000000, repair: 3000000 }, { ok: false, reason: "old" });
t("내 잘못 30% → 70%만", { made: "2024-03-01", crash: "2025-01-10", value: 25000000, repair: 6000000, fault: 30 }, { ok: true, base: 1200000, amount: 840000 });
t("내 잘못 100% → 해당 없음", { made: "2024-03-01", crash: "2025-01-10", value: 30000000, repair: 9000000, fault: 100 }, { ok: false, reason: "myfault" });
t("사고일이 출고일보다 앞 → 날짜 확인", { made: "2025-03-01", crash: "2024-01-10", value: 30000000, repair: 9000000 }, { ok: false, reason: "dates" });
t("빈칸 → 입력 확인", { made: "", crash: "2025-01-10", value: 30000000, repair: 9000000 }, { ok: false, reason: "input" });
t("2월 29일 출고, 1년 뒤 2월 28일 → 20%", { made: "2024-02-29", crash: "2025-02-28", value: 20000000, repair: 5000000 }, { ok: true, rate: 0.2 });
t("내 잘못 15% 반올림", { made: "2023-06-01", crash: "2024-12-01", value: 23000000, repair: 4700000, fault: 15 }, { ok: true, base: 705000, amount: 599250 });
console.log("계산 " + (pass + fail) + "가지 · 통과 " + pass + " · 실패 " + fail);
process.exit(fail ? 1 : 0);
