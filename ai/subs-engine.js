/* 「잊은 구독 찾기」 속엔진 — 손님 브라우저 안에서만 돈다. 카드·통장 내역은 어디에도 보내지 않는다.
 * 표(CSV·붙여 넣은 표·xlsx)에서 날짜·가맹점·금액 칸을 찾아, 같은 곳에 비슷한 돈이 일정하게 나간 것을 모은다. */
(function (root) {
  "use strict";
  var KNOWN = [
    ["Netflix", /netflix|넷플릭스/], ["YouTube Premium", /youtube|유튜브/], ["Spotify", /spotify|스포티파이/], ["Disney+", /disney|디즈니/],
    ["TVING", /tving|티빙/], ["Wavve", /wavve|웨이브/], ["Watcha", /watcha|왓챠/], ["Coupang WOW", /쿠팡\s*(와우|wow)|coupang\s*wow|쿠팡와우/],
    ["Coupang Play", /쿠팡\s*플레이|coupang\s*play/], ["Naver Plus", /네이버\s*플러스|naver\s*plus|네이버멤버십/], ["Melon", /멜론|melon/], ["Genie", /지니뮤직|genie/],
    ["FLO", /\bflo\b|플로/], ["Millie", /밀리의\s*서재|millie/], ["Ridi", /리디|ridi/], ["Baemin Club", /배민\s*클럽|배민클럽/], ["Yogiyo Pass", /요기패스|요기요\s*패스/],
    ["Apple", /apple\.com\/bill|apple\s*services|itunes|애플/], ["Google Play", /google\s*\*|google\s*play|구글\s*플레이|google\s*one|구글원/],
    ["iCloud", /icloud/], ["Microsoft", /microsoft|msft|마이크로소프트|xbox/], ["Adobe", /adobe|어도비/], ["Canva", /canva|캔바/],
    ["ChatGPT / OpenAI", /openai|chatgpt/], ["Claude / Anthropic", /anthropic|claude\.ai/], ["Amazon Prime", /prime\s*video|amazon\s*prime|amzn\s*prime/],
    ["Hulu", /hulu/], ["Max", /\bhbo\b|\bmax\.com/], ["Paramount+", /paramount/], ["Audible", /audible/], ["Dropbox", /dropbox/], ["Notion", /notion/],
    ["Duolingo", /duolingo|듀오링고/], ["Patreon", /patreon/], ["Nintendo", /nintendo/], ["PlayStation", /playstation|sony\s*interactive/],
    ["Gym / fitness", /헬스|피트니스|fitness|\bgym\b|planet\s*fitness/], ["Mobile phone", /\bskt\b|kt\s*통신|lg\s*u\+|유플러스|에스케이텔레콤|verizon|t-?mobile|at&t/],
    ["Insurance", /보험|insurance/]
  ];
  var STORE = {
    "Apple": "https://apps.apple.com/account/subscriptions", "iCloud": "https://apps.apple.com/account/subscriptions",
    "Google Play": "https://play.google.com/store/account/subscriptions"
  };
  function known(s) { s = s.toLowerCase(); for (var i = 0; i < KNOWN.length; i++) if (KNOWN[i][1].test(s)) return KNOWN[i][0]; return ""; }

  /* ── 표 읽기 ── */
  function parseCSV(text) {
    text = String(text || "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    var first = text.split("\n").slice(0, 5).join("\n");
    var delim = (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? "\t" : (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ";" : ",";
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"' && cell === "") q = true;
      else if (c === delim) { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.map(function (r) { return r.map(function (x) { return x.trim(); }); }).filter(function (r) { return r.some(function (x) { return x; }); });
  }
  function excelDate(n) { var d = new Date(Math.round((n - 25569) * 864e5)); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
  function parseDate(s) {
    s = String(s || "").trim();
    var m;
    if (/^\d{5}(\.\d+)?$/.test(s)) { var n = +s; if (n > 30000 && n < 70000) return excelDate(n); }
    if ((m = s.match(/^(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(20\d{2})(\d{2})(\d{2})(?!\d)/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})(?![\d])/)) && +m[2] <= 12) return new Date(2000 + +m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})/))) {
      var a = +m[1], b = +m[2];
      return a > 12 ? new Date(+m[3], b - 1, a) : new Date(+m[3], a - 1, b);
    }
    var t = Date.parse(s);
    if (!isNaN(t) && /[a-z]/i.test(s)) { var d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
    return null;
  }
  function parseAmount(s) {
    s = String(s == null ? "" : s).trim();
    if (!s) return null;
    var neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s);
    var c = s.replace(/[^\d.,]/g, "");
    if (!c || !/\d/.test(c)) return null;
    if (/,\d{2}$/.test(c) && c.indexOf(".") < 0) c = c.replace(/\./g, "").replace(",", ".");
    else c = c.replace(/,/g, "");
    var v = parseFloat(c);
    if (isNaN(v)) return null;
    return neg ? -v : v;
  }
  var H_DATE = /이용\s*일|거래\s*일|승인\s*일|결제\s*일|사용\s*일|일자|날짜|일시|^date$|transaction\s*date|posted|posting\s*date|trans\.?\s*date/i;
  var H_NAME = /가맹점|이용\s*처|사용\s*처|이용\s*내역|내용|적요|거래\s*처|상호|기재\s*내용|^description$|merchant|payee|^name$|details|narrative|memo/i;
  var H_AMT = /이용\s*금액|결제\s*금액|승인\s*금액|청구\s*금액|출금|지급|찾으신|^금액$|amount|debit|charge|withdrawal|paid\s*out/i;
  var H_BAD = /잔액|balance|입금|맡기신|credit|deposit|환율|수수료|포인트|할부\s*개월|원금|이자/i;

  function pickCols(rows) {
    for (var r = 0; r < Math.min(rows.length, 20); r++) {
      var h = rows[r], di = -1, ni = -1, ai = -1;
      h.forEach(function (x, i) {
        if (di < 0 && H_DATE.test(x)) di = i;
        else if (ni < 0 && H_NAME.test(x) && !H_BAD.test(x)) ni = i;
        else if (ai < 0 && H_AMT.test(x) && !H_BAD.test(x)) ai = i;
      });
      if (di >= 0 && ai >= 0 && ni >= 0) return { head: r, d: di, n: ni, a: ai };
    }
    /* 머리글이 없으면 칸 내용으로 짐작 */
    var w = 0; rows.slice(0, 30).forEach(function (x) { if (x.length > w) w = x.length; });
    var score = [];
    for (var c = 0; c < w; c++) {
      var dd = 0, aa = 0, tt = 0;
      rows.slice(0, 60).forEach(function (x) {
        var v = x[c] || "";
        if (parseDate(v)) dd++;
        else if (parseAmount(v) != null && /^[\s\d.,()\-₩$원]+$/.test(v)) aa++;
        else if (/[a-z가-힣]/i.test(v)) tt++;
      });
      score.push([dd, aa, tt]);
    }
    function best(k, not) { var bi = -1, bv = 0; score.forEach(function (s, i) { if (not.indexOf(i) < 0 && s[k] > bv) { bv = s[k]; bi = i; } }); return bi; }
    var d = best(0, []), a = best(1, [d]), n = best(2, [d, a]);
    if (d < 0 || a < 0 || n < 0) return null;
    return { head: -1, d: d, n: n, a: a };
  }
  function normName(s) {
    return s.toLowerCase().replace(/\(주\)|㈜|주식회사|\binc\b\.?|\bllc\b|\bltd\b\.?|\bcorp\b\.?|\bco\b\.?|www\.|\.com\b|\.co\.kr\b/g, " ")
      .replace(/[*#]+\s*[a-z0-9]{4,}$/i, " ").replace(/\d+/g, " ").replace(/[^a-z가-힣]+/g, " ").trim().replace(/\s+/g, " ");
  }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }); var m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
  function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

  function analyse(rows) {
    var cols = pickCols(rows);
    if (!cols) return { error: "cols" };
    var raw = [], neg = 0, pos = 0;
    rows.forEach(function (r, i) {
      if (i <= cols.head) return;
      var d = parseDate(r[cols.d]), a = parseAmount(r[cols.a]), n = (r[cols.n] || "").trim();
      if (!d || a == null || !n || a === 0) return;
      if (a < 0) neg++; else pos++;
      raw.push({ d: d, a: a, n: n });
    });
    /* 은행 내역은 나간 돈이 음수인 경우가 많다 — 음수가 더 많으면 음수를 나간 돈으로 본다 */
    var spendNeg = neg > pos, tx = [];
    raw.forEach(function (x) {
      var a = spendNeg ? -x.a : x.a;
      if (a <= 0) return;
      tx.push({ date: x.d, amount: Math.round(a * 100) / 100, name: x.n, key: normName(x.n) || x.n.toLowerCase(), known: known(x.n) });
    });
    if (!tx.length) return { error: "rows", cols: cols };
    var groups = {};
    tx.forEach(function (t) { var k = t.known || t.key; (groups[k] = groups[k] || []).push(t); });
    var subs = [], once = [];
    Object.keys(groups).forEach(function (k) {
      var g = groups[k].sort(function (a, b) { return a.date - b.date; });
      var isKnown = !!g[0].known;
      /* 같은 날 같은 돈은 하나로 */
      var u = []; g.forEach(function (t) { if (!u.some(function (x) { return +x.date === +t.date && x.amount === t.amount; })) u.push(t); });
      var amts = u.map(function (t) { return t.amount; }), mid = median(amts);
      var names = {}; u.forEach(function (t) { names[t.name] = (names[t.name] || 0) + 1; });
      var shown = Object.keys(names).sort(function (a, b) { return names[b] - names[a]; })[0];
      if (u.length < 2) { if (isKnown) once.push({ name: shown, service: g[0].known, amount: u[0].amount, date: ymd(u[0].date) }); return; }
      var gaps = []; for (var i = 1; i < u.length; i++) gaps.push(Math.round((u[i].date - u[i - 1].date) / 864e5));
      var gm = median(gaps), every = "";
      var near = function (lo, hi) { return gaps.filter(function (x) { return x >= lo && x <= hi; }).length >= Math.max(1, Math.ceil(gaps.length * 0.7)); };
      if (gm >= 25 && gm <= 35 && near(24, 38)) every = "month";
      else if (gm >= 330 && gm <= 400 && near(320, 410)) every = "year";
      else if (gm >= 6 && gm <= 8 && near(5, 9)) every = "week";
      else if (gm >= 85 && gm <= 95 && near(80, 100)) every = "quarter";
      var spread = Math.max.apply(null, amts) / Math.max(0.01, Math.min.apply(null, amts));
      if (!every) { if (isKnown) once.push({ name: shown, service: g[0].known, amount: u[u.length - 1].amount, date: ymd(u[u.length - 1].date), count: u.length }); return; }
      if (spread > 1.3 && !isKnown) return;
      var lastD = u[u.length - 1].date;
      var next = every === "month" ? new Date(lastD.getFullYear(), lastD.getMonth() + 1, lastD.getDate()) : new Date(+lastD + gm * 864e5);
      var last = u[u.length - 1].amount;
      var perYear = last * (every === "month" ? 12 : every === "week" ? 52 : every === "quarter" ? 4 : 1);
      var rise = u.length >= 2 && last > u[0].amount * 1.02 ? { from: u[0].amount, to: last } : null;
      subs.push({ name: shown, service: g[0].known, every: every, count: u.length, amount: last, typical: mid, first: ymd(u[0].date), last: ymd(lastD),
                  next: ymd(next), perYear: perYear, rise: rise, store: STORE[g[0].known] || "" });
    });
    subs.sort(function (a, b) { return b.perYear - a.perYear; });
    var perMonth = subs.reduce(function (s, x) { return s + x.perYear / 12; }, 0);
    var span = tx.length ? [ymd(tx.reduce(function (a, b) { return a.date < b.date ? a : b; }).date), ymd(tx.reduce(function (a, b) { return a.date > b.date ? a : b; }).date)] : [];
    return { subs: subs, once: once, tx: tx.length, perMonth: perMonth, span: span, cols: cols, header: cols.head >= 0 ? rows[cols.head] : null };
  }

  /* ── xlsx 읽기 (브라우저 전용, 바깥 도구 없이) ── */
  function readXlsx(buf) {
    var dv = new DataView(buf), u8 = new Uint8Array(buf), eocd = -1;
    for (var i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) return Promise.reject(new Error("zip"));
    var n = dv.getUint16(eocd + 10, true), off = dv.getUint32(eocd + 16, true), files = {};
    for (var k = 0; k < n; k++) {
      var method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true), nl = dv.getUint16(off + 28, true),
          el = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true), lo = dv.getUint32(off + 42, true);
      var name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nl));
      files[name] = { method: method, csize: csize, lo: lo };
      off += 46 + nl + el + cl;
    }
    function get(name) {
      var f = files[name]; if (!f) return Promise.resolve("");
      var lnl = dv.getUint16(f.lo + 26, true), lel = dv.getUint16(f.lo + 28, true), start = f.lo + 30 + lnl + lel;
      var data = u8.subarray(start, start + f.csize);
      if (f.method === 0) return Promise.resolve(new TextDecoder().decode(data));
      var ds = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Response(ds).text();
    }
    var sheet = Object.keys(files).filter(function (x) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(x); }).sort()[0];
    if (!sheet) return Promise.reject(new Error("sheet"));
    return Promise.all([get("xl/sharedStrings.xml"), get(sheet)]).then(function (r) {
      var P = new DOMParser(), ss = [];
      if (r[0]) P.parseFromString(r[0], "application/xml").querySelectorAll("si").forEach(function (si) {
        var t = ""; si.querySelectorAll("t").forEach(function (x) { t += x.textContent; }); ss.push(t);
      });
      var doc = P.parseFromString(r[1], "application/xml"), rows = [];
      doc.querySelectorAll("sheetData > row").forEach(function (row) {
        var out = [];
        row.querySelectorAll("c").forEach(function (c) {
          var ref = c.getAttribute("r") || "", col = 0, m = ref.match(/^[A-Z]+/);
          if (m) for (var j = 0; j < m[0].length; j++) col = col * 26 + (m[0].charCodeAt(j) - 64);
          col = col ? col - 1 : out.length;
          var t = c.getAttribute("t"), v = c.querySelector("v"), val = "";
          if (t === "s" && v) val = ss[+v.textContent] || "";
          else if (t === "inlineStr") { var is = c.querySelector("is"); val = is ? is.textContent : ""; }
          else if (v) val = v.textContent;
          while (out.length < col) out.push("");
          out[col] = String(val).trim();
        });
        if (out.some(function (x) { return x; })) rows.push(out);
      });
      return rows;
    });
  }
  function decode(buf) {
    try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); }
    catch (e) { try { return new TextDecoder("euc-kr").decode(buf); } catch (e2) { return new TextDecoder().decode(buf); } }
  }
  var api = { parseCSV: parseCSV, analyse: analyse, readXlsx: readXlsx, decode: decode, parseDate: parseDate, parseAmount: parseAmount, known: known };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.SubsEngine = api;
})(this);
