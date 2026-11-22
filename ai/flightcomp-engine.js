/* 밸류스 AI 백화점 — 비행기 지연 보상 확인기 계산 (손님 브라우저 안에서만 돈다. 아무것도 밖으로 보내지 않는다.)
 * 2026-11-22. 기준은 아래 원문에서 다시 확인했다(확인한 날 2026-11-22):
 *  - Regulation (EC) No 261/2004 본문: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32004R0261
 *      제3조(적용 범위), 제4조(탑승 거부), 제5조(결항·14일·7일 규칙, 특별한 사정), 제7조(250/400/600유로, 절반, 대권거리)
 *  - EU 법원 Sturgeon(C-402/07): 도착 3시간 이상 늦음도 보상 https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62007CJ0402
 *  - EU 법원 Wallentin-Hermann(C-549/07)·van der Lans(C-257/14): 기계 고장은 특별한 사정 아님; Krüsemann(C-195/17)·SAS(C-28/20): 항공사 직원 파업도 아님\n *      https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62007CJ0549  https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62020CJ0028\n *  - EU 법원 Germanwings(C-452/13): 도착 = 문이 하나라도 열린 때 https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62013CJ0452\n *  - EU 안내 «Your Europe»(EU·아이슬란드·노르웨이·스위스, 바깥 지역 포함·페로 제도 제외): https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm
 *  - 영국 CAA(UK261, 220/350/520파운드, 3,500km 넘고 3~4시간이면 260): https://www.caa.co.uk/passengers/resolving-travel-problems/delays-and-cancellations/delays/\n *  - 영국 범위(영국 출발 모든 항공사 / 영국 도착 EU·영국 항공사 / EU 도착 영국 항공사): https://www.gov.uk/government/publications/air-passenger-travel-guide/air-passenger-travel-guide-summary-of-passenger-rights\n *  - 영국 기한(잉글랜드·웨일스 6년, 스코틀랜드 5년): https://www.caa.co.uk/air-passengers/travel-problems-and-rights/travel-complaints/how-the-caa-can-help/
 *  - 2026 개정: Regulation (EU) 2026/2202 https://eur-lex.europa.eu/eli/reg/2026/2202/oj — 2026-10-22 발효, 2027-10-23 부터 적용,\n *      새 제7조 9항: 출발일부터 9개월 안에 청구. Euronews 2026-07-21 https://www.euronews.com/my-europe/2026/07/21/air-passenger-rights-reform-what-the-new-rules-mean-for-you
 * (이 주석의 주소 목록은 flightcomp.html 의 「기준」 칸과 같다.) */
(function (root) {
  "use strict";
  // EU 27개 나라 + 바깥 지역(레위니옹·과들루프·마르티니크·프랑스령 기아나·마요트·생마르탱: OurAirports 가 따로 적는 코드)
  // + 생바르텔레미 + 아이슬란드·노르웨이·스위스. 출처: Your Europe 안내(위 주소). 페로 제도(FO)·그린란드(GL)는 넣지 않음.
  var EU = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE RE GP MQ GF YT MF BL IS NO CH".split(" ");
  var UK = ["GB"]; // 영국 본토(채널 제도 JE·GG, 맨섬 IM, 지브롤터 GI 는 넣지 않음)
  // 흔한 항공사 코드 → 면허 나라 갈래 (eu = EU·EEA·스위스, uk = 영국, other = 그 밖). 모르는 코드는 손님이 고른다.
  var AIRLINES = {
    LH: ["Lufthansa", "eu"], AF: ["Air France", "eu"], KL: ["KLM", "eu"], IB: ["Iberia", "eu"], VY: ["Vueling", "eu"], UX: ["Air Europa", "eu"],
    AZ: ["ITA Airways", "eu"], FR: ["Ryanair", "eu"], EI: ["Aer Lingus", "eu"], W6: ["Wizz Air", "eu"], SK: ["SAS", "eu"], AY: ["Finnair", "eu"],
    OS: ["Austrian", "eu"], SN: ["Brussels Airlines", "eu"], LX: ["SWISS", "eu"], LO: ["LOT Polish", "eu"], TP: ["TAP Air Portugal", "eu"],
    A3: ["Aegean", "eu"], OK: ["Czech Airlines", "eu"], RO: ["TAROM", "eu"], FB: ["Bulgaria Air", "eu"], OU: ["Croatia Airlines", "eu"],
    BT: ["airBaltic", "eu"], DY: ["Norwegian", "eu"], D8: ["Norwegian", "eu"], FI: ["Icelandair", "eu"], EW: ["Eurowings", "eu"], DE: ["Condor", "eu"],
    X3: ["TUIfly", "eu"], HV: ["Transavia", "eu"], TO: ["Transavia France", "eu"], V7: ["Volotea", "eu"], LG: ["Luxair", "eu"], EC: ["easyJet Europe", "eu"],
    BA: ["British Airways", "uk"], VS: ["Virgin Atlantic", "uk"], U2: ["easyJet (UK)", "uk"], LS: ["Jet2", "uk"], BY: ["TUI Airways", "uk"], W9: ["Wizz Air UK", "uk"], LM: ["Loganair", "uk"],
    KE: ["Korean Air", "other"], OZ: ["Asiana Airlines", "other"], "7C": ["Jeju Air", "other"], LJ: ["Jin Air", "other"], TW: ["T'way Air", "other"],
    BX: ["Air Busan", "other"], RS: ["Air Seoul", "other"], ZE: ["Eastar Jet", "other"], JL: ["Japan Airlines", "other"], NH: ["ANA", "other"],
    CA: ["Air China", "other"], MU: ["China Eastern", "other"], CZ: ["China Southern", "other"], CX: ["Cathay Pacific", "other"], SQ: ["Singapore Airlines", "other"],
    TG: ["Thai Airways", "other"], VN: ["Vietnam Airlines", "other"], EK: ["Emirates", "other"], QR: ["Qatar Airways", "other"], EY: ["Etihad", "other"],
    TK: ["Turkish Airlines", "other"], PC: ["Pegasus", "other"], DL: ["Delta", "other"], AA: ["American Airlines", "other"], UA: ["United", "other"],
    AC: ["Air Canada", "other"], QF: ["Qantas", "other"], AI: ["Air India", "other"], ET: ["Ethiopian", "other"], MS: ["EgyptAir", "other"]
  };
  var EXTRA = { weather: 1, atc: 1, security: 1, airport_strike: 1, bird: 1, political: 1 }; // 대개 «특별한 사정»
  var NOT_EXTRA = { technical: 1, crew: 1, airline_strike: 1, none: 1 };                    // 대개 항공사 책임

  function rad(d) { return d * Math.PI / 180; }
  // 대권거리(구면, 지구 반지름 6371 km) — 261/2004 제7조 4항 «great circle route method»
  function distance(a, b) {
    var p1 = rad(a[3]), p2 = rad(b[3]), dp = p2 - p1, dl = rad(b[4] - a[4]);
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function band(km, intraEU) {
    if (km <= 1500) return 1;
    if (km <= 3500 || intraEU) return 2; // EU 안 1,500km 넘는 비행은 모두 400유로(제7조 1항 b)
    return 3;
  }
  var EUR = [0, 250, 400, 600], GBP = [0, 220, 350, 520];
  function airlineOf(code) { code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); var k = code.slice(0, 2); return AIRLINES[k] ? { code: k, name: AIRLINES[k][0], kind: AIRLINES[k][1] } : null; }

  /* 규칙 하나: law = "eu" | "uk".  돌려줌 {applies, why} — why 는 화면 말 열쇠 */
  function scope(law, fromC, toC, kind) {
    var IN = law === "eu" ? EU : UK;
    var fromIn = IN.indexOf(fromC) >= 0, toIn = IN.indexOf(toC) >= 0;
    if (fromIn) return { applies: "yes", why: law + "_from" };
    // EU 규칙: EU 밖 → EU 도착은 EU 항공사만. 영국 규칙: 영국 도착은 영국·EU 항공사, EU 도착은 영국 항공사.
    var ok = law === "eu" ? (toIn && kind === "eu")
                          : ((toIn && (kind === "uk" || kind === "eu")) || (EU.indexOf(toC) >= 0 && kind === "uk"));
    var could = law === "eu" ? toIn : (toIn || EU.indexOf(toC) >= 0);
    if (ok) return { applies: "yes", why: law + "_to_own" };
    if (could && kind === "unknown") return { applies: "maybe", why: law + "_to_unknown" };
    if (could) return { applies: "no", why: law + "_to_foreign" };
    return { applies: "no", why: law + "_outside" };
  }
  var NEW_RULES = "2027-10-23"; // Regulation (EU) 2026/2202 적용 시작

  /* 입력: {from, to: 공항 줄 [iata,이름,나라,위도,경도], airline: "eu"|"uk"|"other"|"unknown",
   *        event: "delay"|"cancel"|"denied", delayH(도착이 늦은 시간), noticeDays(결항 통보가 출발 며칠 전),
   *        rerouted: true/false, reDepEarlyH(대체편이 얼마나 일찍 떠났나), reArrLateH(대체편이 얼마나 늦게 도착했나),
   *        voluntary(탑승 거부에 스스로 응함), reason: "none"|"weather"|"atc"|"security"|"airport_strike"|"airline_strike"|"technical"|"crew"|"bird"|"political"|"unknown"} */
  function check(x) {
    var out = { km: 0, band: 0, laws: [], verdict: "none", lines: [], money: null };
    if (!x.from || !x.to) { out.verdict = "input"; out.lines.push({ ok: false, k: "need_airports" }); return out; }
    if (x.from[0] === x.to[0]) { out.verdict = "input"; out.lines.push({ ok: false, k: "same_airport" }); return out; }
    var km = distance(x.from, x.to), fromC = x.from[2], toC = x.to[2];
    out.km = Math.round(km);
    var kind = x.airline || "unknown";
    var eu = scope("eu", fromC, toC, kind), uk = scope("uk", fromC, toC, kind);
    var laws = [];
    if (eu.applies !== "no") laws.push({ law: "eu", applies: eu.applies, why: eu.why });
    if (uk.applies !== "no") laws.push({ law: "uk", applies: uk.applies, why: uk.why });
    if (!laws.length) { out.verdict = "none"; out.lines.push({ ok: false, k: eu.why }); out.lines.push({ ok: false, k: uk.why }); return out; }
    out.laws = laws;
    var main = laws[0];
    out.lines.push({ ok: main.applies === "yes", k: main.why });

    // 일이 보상 거리에 드나
    var ev = x.event, half = false, eventOK = true, arrLate = null;
    var intra = EU.indexOf(fromC) >= 0 && EU.indexOf(toC) >= 0;
    out.band = band(km, intra && main.law === "eu");
    if (ev === "delay") {
      arrLate = +x.delayH || 0;
      if (arrLate >= 3) out.lines.push({ ok: true, k: "delay_3h" });
      else { eventOK = false; out.lines.push({ ok: false, k: "delay_under3" }); }
    } else if (ev === "cancel") {
      var nd = x.noticeDays == null || x.noticeDays === "" ? 0 : +x.noticeDays;
      var re = !!x.rerouted, early = +x.reDepEarlyH || 0, late = +x.reArrLateH || 0;
      if (nd >= 14) { eventOK = false; out.lines.push({ ok: false, k: "cancel_14" }); }
      else if (nd >= 7 && re && early <= 2 && late < 4) { eventOK = false; out.lines.push({ ok: false, k: "cancel_7_reroute" }); }
      else if (nd < 7 && re && early <= 1 && late < 2) { eventOK = false; out.lines.push({ ok: false, k: "cancel_lt7_reroute" }); }
      else { out.lines.push({ ok: true, k: nd >= 7 ? "cancel_7_13" : "cancel_lt7" }); if (re) arrLate = late; }
    } else if (ev === "denied") {
      if (x.voluntary) { eventOK = false; out.lines.push({ ok: false, k: "denied_vol" }); }
      else { out.lines.push({ ok: true, k: "denied_invol" }); if (x.rerouted) arrLate = +x.reArrLateH || 0; }
    } else { out.verdict = "input"; out.lines.push({ ok: false, k: "need_event" }); return out; }

    // 대체편으로 조금만 늦었으면 절반(제7조 2항). 지연은 3,500km 넘는 비행의 3~4시간(Sturgeon).
    if (eventOK && arrLate != null) {
      if (ev === "delay") half = out.band === 3 && arrLate < 4;
      else half = (out.band === 1 && arrLate <= 2) || (out.band === 2 && arrLate <= 3) || (out.band === 3 && arrLate <= 4);
      if (half) out.lines.push({ ok: true, k: ev === "delay" ? "half_delay" : "half_reroute" });
    }

    // 항공사가 말한 까닭
    var reason = x.reason || "unknown", extra = false;
    if (eventOK && ev !== "denied") {
      if (EXTRA[reason]) { extra = true; out.lines.push({ ok: false, k: "reason_extra" }); }
      else if (NOT_EXTRA[reason]) out.lines.push({ ok: true, k: reason === "none" ? "reason_none" : "reason_airline" });
      else out.lines.push({ ok: true, k: "reason_unknown" });
    }

    var tbl = main.law === "uk" ? GBP : EUR;
    var full = tbl[out.band];
    out.money = { cur: main.law === "uk" ? "GBP" : "EUR", full: full, half: half ? full / 2 : null };
    if (laws.length > 1) out.money.alt = { cur: laws[1].law === "uk" ? "GBP" : "EUR", full: (laws[1].law === "uk" ? GBP : EUR)[band(km, false)] };
    out.newRules = main.law === "eu" && !!x.date && String(x.date) >= NEW_RULES;
    if (!eventOK) out.verdict = "none";
    else if (extra || main.applies === "maybe") out.verdict = "low";
    else out.verdict = "high";
    return out;
  }

  var api = { NEW_RULES: NEW_RULES, EU: EU, UK: UK, AIRLINES: AIRLINES, distance: distance, band: band, check: check, airlineOf: airlineOf, EUR: EUR, GBP: GBP };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.FlightComp = api;
})(this);
