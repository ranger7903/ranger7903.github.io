/* 「학교 알림 한 장」 속엔진 — 손님 브라우저 안에서만 돈다.
 * 붙여 넣은 공지에서 날짜·시간·마감, 낼 돈, 준비물, 낼 서류를 뽑고 같은 공지는 하나로 합친다. */
(function (root) {
  "use strict";
  var MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
  var MONRE = "(jan|feb|mar|apr|may|jun|jul|aug|sept|sep|oct|nov|dec)[a-z]*\\.?";
  function norm(s) { return s.toLowerCase().replace(/[\s .,!?·:;'"“”‘’()\[\]{}<>~\-–—_*#/\\|]+/g, ""); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function fixYear(m, d, y, today) {
    if (y) { if (y < 100) y += 2000; return new Date(y, m - 1, d); }
    var c = new Date(today.getFullYear(), m - 1, d);
    if (c - today < -60 * 864e5) c = new Date(today.getFullYear() + 1, m - 1, d);
    else if (c - today > 300 * 864e5) c = new Date(today.getFullYear() - 1, m - 1, d);
    return c;
  }
  function valid(m, d) { return m >= 1 && m <= 12 && d >= 1 && d <= 31; }

  /* 한 줄에서 날짜들을 찾는다. ctxMonth: 앞에서 본 달(「25일(화)」처럼 달이 없을 때 씀) */
  function findDates(line, today, ctx) {
    var out = [], used = [];
    function push(idx, len, m, d, y, endM, endD) {
      for (var i = 0; i < used.length; i++) if (idx < used[i][1] && idx + len > used[i][0]) return;
      if (!valid(m, d)) return;
      used.push([idx, idx + len]);
      var s = fixYear(m, d, y, today), e = null;
      if (endD && valid(endM || m, endD)) { e = fixYear(endM || m, endD, y, today); if (e < s) e = null; }
      ctx.month = m;
      out.push({ idx: idx, len: len, start: s, end: e });
    }
    var m, re;
    var RANGE = "(?:\\s*[~∼〜\\-–]\\s*(?:(\\d{1,2})\\s*(?:월|\\.|/)\\s*)?(\\d{1,2})\\s*일?(?:\\s*\\([월화수목금토일]\\))?)?";
    re = new RegExp("(20\\d{2}|\\d{2})\\s*[.\\-/년]\\s*(\\d{1,2})\\s*[.\\-/월]\\s*(\\d{1,2})\\s*일?\\.?(?:\\s*\\([월화수목금토일]\\))?" + RANGE, "g");
    while ((m = re.exec(line))) push(m.index, m[0].length, +m[2], +m[3], +m[1], m[4] && +m[4], m[5] && +m[5]);
    re = new RegExp("(\\d{1,2})\\s*월\\s*(\\d{1,2})\\s*일(?:\\s*\\([월화수목금토일]\\))?" + RANGE, "g");
    while ((m = re.exec(line))) push(m.index, m[0].length, +m[1], +m[2], 0, m[3] && +m[3], m[4] && +m[4]);
    re = new RegExp("(\\d{1,2})\\s*\\.\\s*(\\d{1,2})\\s*\\.?\\s*\\(([월화수목금토일])\\)" + RANGE, "g");
    while ((m = re.exec(line))) push(m.index, m[0].length, +m[1], +m[2], 0, m[4] && +m[4], m[5] && +m[5]);
    re = new RegExp("\\b" + MONRE + "\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(20\\d{2}))?(?:\\s*[-–]\\s*(\\d{1,2})(?:st|nd|rd|th)?)?\\b", "gi");
    while ((m = re.exec(line))) push(m.index, m[0].length, MON[m[1].toLowerCase()], +m[2], m[3] && +m[3], 0, m[4] && +m[4]);
    re = new RegExp("\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?" + MONRE + "(?:,?\\s*(20\\d{2}))?\\b", "gi");
    while ((m = re.exec(line))) push(m.index, m[0].length, MON[m[2].toLowerCase()], +m[1], m[3] && +m[3]);
    re = /(?:^|[^\d/])(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}|\d{2}))?(?![\d/])/g;
    while ((m = re.exec(line))) push(m.index + (m[0].length - m[0].replace(/^[^\d]/, "").length), m[0].replace(/^[^\d]/, "").length, +m[1], +m[2], m[3] && +m[3]);
    re = /(?:^|[^\d.월/])(\d{1,2})\s*일\s*\(([월화수목금토일])\)/g;
    while ((m = re.exec(line))) if (ctx.month) push(m.index, m[0].length, ctx.month, +m[1], 0);
    out.sort(function (a, b) { return a.idx - b.idx; });
    return out;
  }
  function findTime(line) {
    var m = line.match(/(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*반)?/);
    if (m) { var h = +m[2] % 12 + (m[1] === "오후" ? 12 : 0); return pad(h) + ":" + (m[3] ? pad(+m[3]) : /반/.test(m[0]) ? "30" : "00"); }
    m = line.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/i);
    if (m) { var hh = +m[1] % 12 + (/p/i.test(m[3]) ? 12 : 0); return pad(hh) + ":" + (m[2] || "00"); }
    m = line.match(/(?:^|[^\d])([01]?\d|2[0-3]):([0-5]\d)(?!\d)/);
    if (m) return pad(+m[1]) + ":" + m[2];
    m = line.match(/(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/);
    if (m && +m[1] <= 24) return pad(+m[1] < 7 ? +m[1] + 12 : +m[1]) + ":" + (m[2] ? pad(+m[2]) : "00");
    return "";
  }
  var DUE = /까지|마감|제출|신청|회신|접수|due|deadline|by\s+(mon|tue|wed|thu|fri|sat|sun|\w+\s+\d)|until|no\s+later|return\s+by/i;
  var BRING = /준비물|지참|챙겨|가져\s*(오|와|가)|가지고\s*(오|와)|복장|입고\s*(오|와)|bring|pack\b|please\s+wear|dress\s+code|send\s+(in|with)/i;
  var FORM = /동의서|신청서|회신서|참가\s*신청|서명|확인서|permission\s+slip|consent\s+form|sign(ed)?\s+(and\s+)?return|return\s+the\s+form|form\s+(by|due)|sign\s+up/i;
  var MONEY_KO = /(\d{1,3}(?:,\d{3})+|\d+)\s*원|(\d+(?:\.\d+)?)\s*만\s*원/g;
  var MONEY_EN = /(?:\$|£|€)\s?(\d+(?:\.\d{2})?)/g;

  function splitLines(text) {
    var out = [];
    String(text || "").replace(/\r/g, "").split(/\n+/).forEach(function (l) {
      l = l.trim();
      if (!l) return;
      if (l.length > 160) l.replace(/([다요]\.)\s+/g, "$1\n").replace(/([a-z]\.)\s+(?=[A-Z])/g, "$1\n").split("\n").forEach(function (p) { if (p.trim()) out.push(p.trim()); });
      else out.push(l);
    });
    return out;
  }
  function clean(line, cut) {
    var s = line;
    if (cut) { cut.slice().sort(function (a, b) { return b.idx - a.idx; }).forEach(function (c) { s = s.slice(0, c.idx) + " " + s.slice(c.idx + c.len); }); }
    s = s.replace(/^[\s\-•·*▶▷■□◆◇○●①-⑳]+/, "").replace(/^\d{1,2}\s*[.)]\s+(?!\d)/, "").replace(/\(\s*\)/g, "").replace(/\s+\)/g, ")").replace(/\s{2,}/g, " ").replace(/^[,:\s]+|[,:\s]+$/g, "").trim();
    return s.length > 90 ? s.slice(0, 88) + "…" : s;
  }

  var HEAD = /안내|알림|공지|통신문|소식|일정|notice|newsletter|reminder|update|announcement/i;
  var FIELD = /^(\d+\s*[.)]\s*)?(일시|일자|날짜|때|기간|시간|장소|date|when|time|where)\s*[:：]/i;
  function sentences(line) { return line.replace(/([.!?。])\s+/g, "$1\n").split("\n"); }
  function similar(a, b) { a = norm(a); b = norm(b); return a && b && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0); }

  function parse(text, today) {
    today = today || new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var lines = splitLines(text), seen = {}, dupes = 0, ctx = { month: 0 }, head = "";
    var events = [], money = [], bring = [], forms = [];
    lines.forEach(function (line) {
      var k = norm(line);
      if (k.length > 6) { if (seen[k]) { dupes++; return; } seen[k] = 1; }
      var ds = findDates(line, today, ctx);
      if (!ds.length && line.length <= 60 && HEAD.test(line) && !/[:：]\s*\S/.test(line.replace(/^\[[^\]]*\]/, ""))) {
        head = clean(line.replace(/^\[[^\]]*\]\s*/, "").replace(/^(dear\s+\w+,?\s*)/i, "")) || head;
      }
      var time = findTime(line);
      ds.forEach(function (d, i) {
        var title = clean(line);
        if (FIELD.test(line) && head) title = head + " · " + title.replace(/^(일시|일자|날짜|때|기간|시간|date|when|time)\s*[:：]\s*/i, "");
        var after = line.slice(d.idx + d.len, d.idx + d.len + 22), before = line.slice(Math.max(0, d.idx - 10), d.idx);
        var due = /^\s*(\([월화수목금토일]\))?\s*(오전|오후)?\s*(\d{1,2}\s*(시|:\d{2}))?\s*(\d{1,2}\s*분|반)?\s*(까지|이내|마감)/.test(after) || /(by|due|until|before|deadline)\s*:?\s*$/i.test(before) ||
                  (ds.length === 1 && /마감|제출|회신|신청\s*기간|deadline|due\b|return\s+by/i.test(line));
        var raw = norm(line);
        var dup = events.some(function (e) { return e.date === ymd(d.start) && (similar(e.title, title) || e.raw.indexOf(raw) >= 0 || raw.indexOf(e.raw) >= 0); });
        if (dup) { dupes++; return; }
        events.push({ raw: raw, date: ymd(d.start), end: d.end ? ymd(d.end) : "", time: i === 0 ? time : "", title: title, due: due, past: d.start < today });
      });
      var m;
      MONEY_KO.lastIndex = 0;
      while ((m = MONEY_KO.exec(line))) {
        var v = m[1] ? +m[1].replace(/,/g, "") : Math.round(+m[2] * 10000);
        if (v >= 100 && v <= 5000000) money.push({ amount: v, cur: "KRW", line: clean(line) });
      }
      MONEY_EN.lastIndex = 0;
      while ((m = MONEY_EN.exec(line))) {
        var sym = m[0].trim()[0];
        money.push({ amount: +m[1], cur: sym === "£" ? "GBP" : sym === "€" ? "EUR" : "USD", line: clean(line) });
      }
      sentences(line).forEach(function (sn) {
        if (!BRING.test(sn)) return;
        var body = sn.indexOf(":") >= 0 || sn.indexOf("：") >= 0 ? sn.split(/[:：]/).slice(1).join(":")
                 : sn.replace(/^.*?\b(bring|pack|wear)\b/i, "").replace(/^.*?(준비물|지참물)\s*(은|는)?/, "");
        body.split(/[,，、·\/]|\s및\s|\band\b|\bor\b/).forEach(function (p) {
          p = p.replace(/(을|를)?\s*(꼭\s*)?(챙겨|가져|지참|준비|입고|가지고)[^,]*$/, "")
               .replace(/\b(please|bring|pack|wear|with you|to school)\b/gi, "").replace(/[.!()]+/g, "").trim();
          if (p.length >= 1 && p.length <= 30 && !/^\d+$/.test(p)) bring.push(p);
        });
      });
      if (FORM.test(line)) forms.push({ line: clean(line), due: ds.length ? ymd(ds[ds.length - 1].start) : "" });
    });
    events.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time || "99") < (b.time || "99") ? -1 : 1; });
    var bset = {}, b2 = [];
    bring.forEach(function (b) { var k = norm(b); if (k && !bset[k]) { bset[k] = 1; b2.push(b); } });
    var mset = {}, m2 = [];
    money.forEach(function (x) { var k = x.cur + x.amount + norm(x.line).slice(0, 20); if (!mset[k]) { mset[k] = 1; m2.push(x); } });
    var f2 = [];
    forms.forEach(function (x) { if (!f2.some(function (y) { return similar(y.line, x.line); })) f2.push(x); });
    return { events: events, money: m2, bring: b2, forms: f2, dupes: dupes, lines: lines.length };
  }

  function ics(events) {
    var now = new Date(), stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VALUES//School Notices//EN", "CALSCALE:GREGORIAN"];
    events.forEach(function (e, i) {
      var d = e.date.replace(/-/g, "");
      var t = (e.title || "").replace(/[\\;,]/g, function (c) { return "\\" + c; });
      L.push("BEGIN:VEVENT", "UID:" + d + "-" + i + "-" + Math.random().toString(36).slice(2) + "@valuestools.kr", "DTSTAMP:" + stamp);
      if (e.time) {
        var hm = e.time.replace(":", "");
        L.push("DTSTART:" + d + "T" + hm + "00");
        var h = Math.min(23, +e.time.slice(0, 2) + 1);
        L.push("DTEND:" + d + "T" + pad(h) + e.time.slice(3) + "00");
      } else {
        L.push("DTSTART;VALUE=DATE:" + d);
        var ps = (e.end || e.date).split("-"), endD = new Date(+ps[0], +ps[1] - 1, +ps[2]);
        endD.setDate(endD.getDate() + 1);
        L.push("DTEND;VALUE=DATE:" + ymd(endD).replace(/-/g, ""));
      }
      L.push("SUMMARY:" + (e.due ? "⏰ " : "") + t, "END:VEVENT");
    });
    L.push("END:VCALENDAR");
    return L.join("\r\n");
  }
  var api = { parse: parse, ics: ics, findDates: findDates, findTime: findTime };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.SchoolEngine = api;
})(this);
