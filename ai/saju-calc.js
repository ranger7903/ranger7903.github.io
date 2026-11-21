/* 밸류스 AI 백화점 — 사주·별자리 계산 (브라우저 안에서만, 2026-11-21)
 * 년주: 입춘(태양 황경 315°) 기준 · 월주: 절기(황경 30°마다) 기준 · 일주: 율리우스 날수 · 시주: 일간 + 2시간 칸(자시 23시 시작)
 * 태양 황경은 천문 근사식(오차 0.01° 안팎 = 15분쯤). 태어난 시각은 한국 시각(UTC+9)으로 본다. */
(function () {
  "use strict";
  var STEM = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var STEM_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  var BR = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var BR_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  var ANIMAL_KO = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
  var ANIMAL_EN = ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];
  var STEM_EL = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
  var BR_EL = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
  var EL_KO = { wood: "목(나무)", fire: "화(불)", earth: "토(흙)", metal: "금(쇠)", water: "수(물)" };
  var EL_EN = { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" };
  var YANG = [true, false, true, false, true, false, true, false, true, false];
  var SIGN_EN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  var SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
  var SIGN_SYM = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
  var SIGN_EL = ["fire", "earth", "air", "water"];
  var SIGN_EL_KO = { fire: "불", earth: "흙", air: "공기", water: "물" };
  var SIGN_EL_EN = { fire: "Fire", earth: "Earth", air: "Air", water: "Water" };

  function jdUTC(ms) { return ms / 864e5 + 2440587.5; }
  // 태양 겉보기 황경 (도) — Meeus 간단식
  function sunLon(ms) {
    var T = (jdUTC(ms) - 2451545.0) / 36525, r = Math.PI / 180;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * r) + (0.019993 - 0.000101 * T) * Math.sin(2 * M * r) + 0.000289 * Math.sin(3 * M * r);
    var om = 125.04 - 1934.136 * T;
    var lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om * r);
    return ((lam % 360) + 360) % 360;
  }
  function mod(a, n) { return ((a % n) + n) % n; }
  function pillar(s, b) { return { s: s, b: b, han: STEM[s] + BR[b], ko: STEM_KO[s] + BR_KO[b] }; }

  /* y,m,d: 양력 날짜(한국), hh,mm: 태어난 시각(없으면 null) */
  function saju(y, m, d, hh, mm) {
    var known = hh != null && !isNaN(hh);
    var h = known ? hh : 12, mi = known ? (mm || 0) : 0;
    var ms = Date.UTC(y, m - 1, d, h, mi) - 9 * 3600e3; // 한국 시각 → UTC
    var lam = sunLon(ms);
    // 년주: 1·2월에 아직 입춘 전(황경 270°~315°)이면 지난해
    var yy = y; if (m <= 2 && lam >= 270 && lam < 315) yy = y - 1;
    var yi = mod(yy - 4, 60), ys = yi % 10, yb = yi % 12;
    // 월주: 寅월은 황경 315°에서 시작, 30°마다 한 달
    var mo = Math.floor(mod(lam - 315, 360) / 30);          // 0=寅 … 11=丑
    var mb = mod(mo + 2, 12), ms_ = mod(ys * 2 + 2 + mo, 10);
    // 일주: 자시(23시)부터는 다음 날로 본다
    var dd = Date.UTC(y, m - 1, d) / 864e5 + 2440588; // 그날 정오의 율리우스 날수(정수)
    if (known && h >= 23) dd += 1;
    var di = mod(dd + 49, 60), ds = di % 10, db = di % 12;
    var out = { year: pillar(ys, yb), month: pillar(ms_, mb), day: pillar(ds, db), hour: null, animal: { ko: ANIMAL_KO[yb], en: ANIMAL_EN[yb] } };
    if (known) { var hb = Math.floor(mod(h + 1, 24) / 2); out.hour = pillar(mod(ds * 2 + hb, 10), hb); }
    var cnt = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    [out.year, out.month, out.day, out.hour].forEach(function (p) { if (p) { cnt[STEM_EL[p.s]]++; cnt[BR_EL[p.b]]++; } });
    out.elements = cnt;
    out.dayMaster = { han: STEM[ds], ko: STEM_KO[ds], el: STEM_EL[ds], yang: YANG[ds] };
    // 별자리: 태양 황경 30°마다 (태어난 순간의 실제 태양 자리)
    var si = Math.floor(sunLon(ms) / 30);
    out.sign = { i: si, en: SIGN_EN[si], ko: SIGN_KO[si], sym: SIGN_SYM[si], el: SIGN_EL[si % 4] };
    out.timeKnown = known;
    return out;
  }

  /* 음력 → 양력: 브라우저의 중국력(Intl)으로 그해 앞뒤 날을 하나씩 맞춰 본다. 찾지 못하면 null */
  function lunarToSolar(ly, lm, ld, leap) {
    var f;
    try { f = new Intl.DateTimeFormat("en-u-ca-chinese", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric" }); } catch (e) { return null; }
    for (var t = Date.UTC(ly, 0, 1); t < Date.UTC(ly + 1, 3, 1); t += 864e5) {
      var p = {}; f.formatToParts(new Date(t + 3 * 3600e3)).forEach(function (x) { p[x.type] = x.value; });
      var ry = +(p.relatedYear || p.year), mon = String(p.month || ""), isLeap = /bis|閏|闰/.test(mon), mn = parseInt(mon, 10);
      if (ry === ly && mn === lm && +p.day === ld && isLeap === !!leap) { var dt = new Date(t); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }; }
    }
    return null;
  }

  window.SAJU = { saju: saju, lunarToSolar: lunarToSolar, sunLon: sunLon, EL_KO: EL_KO, EL_EN: EL_EN, SIGN_EL_KO: SIGN_EL_KO, SIGN_EL_EN: SIGN_EL_EN };
})();
