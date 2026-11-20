/* 밸류스 AI 백화점 — AI 두뇌를 쓰는 방이 함께 쓰는 조각 (2026-11-19)
 * 이름표 칸(이 브라우저에만 기억) · 남은 횟수 · 두뇌 일꾼 부르기 · 복사하기 · 다시 쓰기
 * 쓰는 법: VTB.mount({room, payload: () => ({text, opt}) 또는 문자열(오류 열쇠), render: answer => html, copy: answer => 글}) */
(function () {
  "use strict";
  var API = "https://values-ai-brain.ranger7903.workers.dev";
  var KEYSTORE = "vt_ai_key";
  VT.add({
    b_privacy: {
      en: "🌐 Your text (and photo, if you add one) is sent to an AI company (Anthropic) to make the answer. VALUES does not store it. Anthropic does not train its AI on it and deletes it within 30 days (longer only if it needs a usage-policy check).",
      ko: "🌐 붙여 넣은 글(사진을 올리면 사진도)은 AI 회사(Anthropic)로 보내 답을 만들고, 밸류스는 저장하지 않습니다. Anthropic 은 이것으로 AI 를 학습시키지 않고 30일 안에 지웁니다(이용 정책 위반 확인이 필요한 것만 더 오래 둘 수 있음)."
    },
    b_trial: { en: "Free tries left today: {n} of 3 (all AI rooms together)", ko: "오늘 남은 맛보기: {n}/3번 (AI 방 모두 합쳐서)" },
    b_sub: { en: "Today in this room: {n}/100", ko: "오늘 이 방 {n}/100" },
    b_owner: { en: "Owner test mode", ko: "사장님 시험 중" },
    b_key_q: { en: "Have a subscription license key?", ko: "구독 이름표가 있으신가요?" },
    b_key_ph: { en: "Paste the key from your email (starts with VALUES.)", ko: "메일로 받은 이름표(VALUES.로 시작)를 붙여 넣으세요" },
    b_key_save: { en: "Use this key", ko: "이 이름표 쓰기" },
    b_key_del: { en: "Remove key", ko: "이름표 지우기" },
    b_key_on: { en: "🔑 Using your license key on this browser.", ko: "🔑 이 브라우저에 넣어 둔 이름표로 쓰고 있어요." },
    b_key_note: { en: "The key is kept only in this browser. Keys from the AI Store plan or the 'VALUES Everything' plan both work here.", ko: "이름표는 이 브라우저에만 기억해요. 「AI 백화점 구독」이나 「밸류스 전부」 구독 이름표를 넣으시면 됩니다." },
    b_thinking: { en: "Writing… (a few seconds)", ko: "만드는 중… (몇 초)" },
    b_copy: { en: "Copy", ko: "복사하기" },
    b_copied: { en: "Copied.", ko: "복사했어요." },
    b_again: { en: "Write again", ko: "다시 쓰기" },
    b_again_note: { en: "Writing again counts as one more try (a failed try is never counted).", ko: "다시 쓰기도 한 번으로 세요(실패한 것은 세지 않아요)." },
    b_check: { en: "An AI wrote this. Please read it once before you use it.", ko: "AI 가 쓴 초안이에요. 쓰시기 전에 한 번 읽어 봐 주세요." },
    b_net: { en: "Could not reach the AI helper. Check your internet and try again. This try was not counted.", ko: "AI 일꾼에 닿지 못했어요. 인터넷을 확인하고 다시 해 주세요. 이번은 세지 않았어요." },
    b_plans: { en: "See plans", ko: "구독 보기" },
    b_more: { en: "Free tries come back tomorrow. The AI Store plan ($5.99 a month) lets you use each room up to 100 times a day.", ko: "맛보기는 내일 다시 생겨요. AI 백화점 구독(달마다 7,900원)이면 방마다 하루 100번까지 쓰실 수 있어요." }
  });

  function getKey() { try { return localStorage.getItem(KEYSTORE) || ""; } catch (e) { return ""; } }
  function setKey(k) { try { if (k) localStorage.setItem(KEYSTORE, k); else localStorage.removeItem(KEYSTORE); } catch (e) {} }
  /* [2026-11-21] 구독 이름표가 끝났으면 열쇠 발급소에서 새 이름표를 저절로 받아 온다(윈도우 프로그램과 같은 길).
     보내는 것은 이름표 전체가 아니라 그 지문(SHA-256 앞 24글자)뿐이다. */
  var RENEW = "https://sparkling-bird-2599.ranger7903.workers.dev/renew";
  var renewTried = false;
  function renewKey() {
    var k = getKey();
    if (!k || renewTried || !(window.crypto && crypto.subtle)) return Promise.resolve(false);
    renewTried = true;
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(k)).then(function (h) {
      var id = Array.prototype.map.call(new Uint8Array(h), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("").slice(0, 24);
      return fetch(RENEW, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ id: id }) });
    }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) {
      if (j && typeof j.key === "string" && /^VALUES\./.test(j.key) && j.key !== k) { setKey(j.key); return true; }
      return false;
    }).catch(function () { return false; });
  }
  function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }

  function call(path, body) {
    return fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, code: "net" }; }); });
  }

  var VTB = window.VTB = {};
  VT.add({ v_none: { en: "Nothing here.", ko: "없어요." }, v_me: { en: "🙋 You", ko: "🙋 나" }, v_them: { en: "🧑 Them", ko: "🧑 상대" },
    p_add: { en: "📷 Add a photo", ko: "📷 사진 올리기" }, p_del: { en: "Remove photo", ko: "사진 빼기" },
    p_note: { en: "One photo. It is made smaller in your browser before sending. Cover names, ID or account numbers you do not want to send.",
      ko: "사진은 한 장이에요. 보내기 전에 이 브라우저에서 작게 줄여요. 보내고 싶지 않은 이름·주민번호·계좌번호는 가리고 찍어 주세요." },
    p_bad: { en: "That file could not be opened as a photo.", ko: "이 파일은 사진으로 열 수 없어요." } });

  /* 사진 한 장 (2026-11-20 오후) — 긴 변을 줄여 JPG 로 만든 뒤 VTB.photo = {type, data(base64)} 에 둔다 */
  VTB.photo = null;
  VTB.photoBox = function (el) {
    el.innerHTML = '<div class="row" style="margin-top:0"><label class="btn ghost" style="cursor:pointer"><span data-i="p_add"></span>' +
      '<input id="pFile" type="file" accept="image/*" style="display:none"></label>' +
      '<button class="btn ghost hidden" type="button" id="pDel" data-i="p_del"></button></div>' +
      '<img id="pPrev" alt="" class="hidden" style="display:block;max-width:100%;max-height:260px;margin-top:10px;border-radius:10px;border:1px solid var(--line)">' +
      '<p class="note" id="pNote" data-i="p_note"></p>';
    var f = document.getElementById("pFile"), prev = document.getElementById("pPrev"), del = document.getElementById("pDel");
    function clear() { VTB.photo = null; f.value = ""; prev.classList.add("hidden"); prev.removeAttribute("src"); del.classList.add("hidden"); }
    del.onclick = clear;
    f.onchange = function () {
      var file = f.files && f.files[0]; if (!file) return;
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1400, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        if (w * s * h * s > 1150000) s = Math.sqrt(1150000 / (w * h)); // AI 가 보는 크기(약 115만 화소)보다 크게 보내지 않는다
        var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        var d = c.toDataURL("image/jpeg", 0.85);
        URL.revokeObjectURL(url);
        VTB.photo = { type: "image/jpeg", data: d.slice(d.indexOf(",") + 1) };
        prev.src = d; prev.classList.remove("hidden"); del.classList.remove("hidden");
      };
      img.onerror = function () { URL.revokeObjectURL(url); clear(); alert(VT.t("p_bad")); };
      img.src = url;
    };
    VTB.photoClear = clear;
  };

  /* 답 보여 주기 틀 (2026-11-20) — 방마다 spec 만 적으면 된다.
   * spec 한 줄: {k:답 칸, t:"text"|"note"|"list"|"cards"|"copies"|"dialog", label:낱말 열쇠, cols:[[칸,낱말 열쇠],…], labels:[…]} */
  function E(s) { return VT.esc(s == null ? "" : s).replace(/\n/g, "<br>"); }
  function lab(x) { return x ? VT.t(x) : ""; }
  VTB.view = function (spec, a) {
    return spec.map(function (s) {
      var v = a[s.k];
      if (s.t === "copies" && typeof v === "string") v = [v];
      var h = s.label ? '<h2 style="margin-top:18px">' + lab(s.label) + "</h2>" : "";
      if (s.t === "text") return '<div class="box" style="margin-top:12px">' + (s.label ? "<b>" + lab(s.label) + "</b>" : "") + '<p style="margin:8px 0 0">' + E(v) + "</p></div>";
      if (s.t === "note") return '<p class="note" style="margin-top:12px"><b>' + lab(s.label) + ":</b> " + E(v) + "</p>";
      if (!v || !v.length) return h + '<p class="note">' + VT.t("v_none") + "</p>";
      if (s.t === "list") return h + '<ul class="steps">' + v.map(function (x) { return "<li>" + E(x) + "</li>"; }).join("") + "</ul>";
      if (s.t === "cards") return h + '<ul class="signals">' + v.map(function (o) {
        return "<li>" + s.cols.map(function (c, i) {
          var t = E(o[c[0]]);
          if (i === 0) return "<b>" + t + "</b>";
          return c[1] ? '<span class="note" style="display:block">' + lab(c[1]) + ": " + t + "</span>" : "<span style=\"display:block\">" + t + "</span>";
        }).join("") + "</li>";
      }).join("") + "</ul>";
      if (s.t === "copies") return v.map(function (x, i) {
        return '<div class="box" style="margin-top:12px"><b>' + lab((s.labels || [])[i]) + '</b><p style="margin:8px 0 0">' + E(x) + "</p>" +
          '<div class="row"><button class="btn ghost" type="button" data-copy="' + VT.esc(x) + '">' + VT.t("b_copy") + '</button><span class="note"></span></div></div>';
      }).join("");
      if (s.t === "dialog") return h + '<ul class="signals">' + v.map(function (o) {
        var me = o.who === "me";
        return '<li style="' + (me ? "border-left:5px solid var(--sage)" : "border-left:5px solid var(--mustard)") + '"><span class="note">' + VT.t(me ? "v_me" : "v_them") + "</span>" +
          "<b>" + E(o.say) + "</b>" + (o.roman ? '<span class="note" style="display:block">' + E(o.roman) + "</span>" : "") +
          '<span style="display:block">' + E(o.meaning) + "</span></li>";
      }).join("") + "</ul>";
      return "";
    }).join("");
  };
  VTB.plain = function (spec, a) {
    return spec.map(function (s) {
      var v = a[s.k];
      if (v == null) return "";
      if (typeof v === "string") return (s.label ? lab(s.label) + ": " : "") + v;
      var head = s.label ? lab(s.label) + "\n" : "";
      return head + v.map(function (o) {
        if (typeof o === "string") return "- " + o;
        if (s.t === "dialog") return (o.who === "me" ? VT.t("v_me") : VT.t("v_them")) + ": " + o.say + (o.roman ? " (" + o.roman + ")" : "") + " — " + o.meaning;
        return "- " + s.cols.map(function (c) { return o[c[0]]; }).join(" / ");
      }).join("\n");
    }).filter(Boolean).join("\n\n");
  };
  VTB.mount = function (cfg) {
    var wrap = document.getElementById("brain");
    wrap.innerHTML =
      '<p class="privacy" style="margin:0 0 12px" data-i="b_privacy"></p>' +
      '<p class="note" id="bLeft" style="font-weight:700;color:var(--ink-2)"></p>' +
      '<details id="bKeyBox" class="box" style="padding:12px 16px;margin-top:10px"><summary data-i="b_key_q" style="cursor:pointer"></summary>' +
      '<div id="bKeyOff"><input id="bKey" type="text" autocomplete="off" spellcheck="false" style="width:100%;margin-top:10px;font:inherit;font-size:14px;padding:10px;border:1px solid var(--line);border-radius:10px;box-sizing:border-box" data-i-ph="b_key_ph">' +
      '<div class="row"><button class="btn" type="button" id="bKeySave" data-i="b_key_save"></button><a class="note" href="./plans.html" data-i="b_plans"></a></div></div>' +
      '<div id="bKeyOn" class="hidden"><p class="note" data-i="b_key_on"></p><button class="btn ghost" type="button" id="bKeyDel" data-i="b_key_del"></button></div>' +
      '<p class="note" data-i="b_key_note"></p></details>';
    var last = null, lastAnswer = null, busy = false;
    var out = document.getElementById("out");

    function showLeft(left) {
      var el = document.getElementById("bLeft");
      if (!left) { el.textContent = ""; return; }
      if (left.kind === "owner") el.textContent = VT.t("b_owner");
      else if (left.kind === "sub") el.textContent = fill(VT.t("b_sub"), { n: left.used });
      else el.textContent = fill(VT.t("b_trial"), { n: Math.max(0, left.limit - left.used) });
      last = left;
    }
    function keyUI() {
      var k = getKey();
      document.getElementById("bKeyOff").classList.toggle("hidden", !!k);
      document.getElementById("bKeyOn").classList.toggle("hidden", !k);
      if (k) document.getElementById("bKeyBox").open = true;
    }
    function refreshLeft() {
      var body = { room: cfg.room }; var k = getKey(); if (k) body.key = k;
      call("/left", body).then(function (j) {
        if (!j.ok && j.code === "key_expired") return renewKey().then(function (got) { if (got) refreshLeft(); else if (j.msg) document.getElementById("bLeft").textContent = j.msg[VT.lang] || j.msg.en; });
        if (j.ok) showLeft(j.left);
        else if (j.msg) { document.getElementById("bLeft").textContent = j.msg[VT.lang] || j.msg.en; }
      }).catch(function () {});
    }
    function err(m) {
      out.innerHTML = '<div class="verdict mid">' + VT.esc(m) + "</div>";
      out.classList.remove("hidden");
    }
    function draw() {
      if (!lastAnswer) return;
      out.innerHTML = '<div class="verdict low">' + VT.esc(VT.t("b_check")) + "</div>" + cfg.render(lastAnswer) +
        '<div class="row no-print"><button class="btn" type="button" id="bCopy">' + VT.t("b_copy") + '</button>' +
        '<button class="btn ghost" type="button" id="bAgain">' + VT.t("b_again") + '</button><span class="note" id="bCopied"></span></div>' +
        '<p class="note">' + VT.t("b_again_note") + "</p>";
      out.classList.remove("hidden");
      document.getElementById("bCopy").onclick = function () { copyText(cfg.copy(lastAnswer), document.getElementById("bCopied")); };
      document.getElementById("bAgain").onclick = function () { VTB.ask(); };
      out.querySelectorAll("[data-copy]").forEach(function (b) {
        b.onclick = function () { copyText(b.getAttribute("data-copy"), b.nextElementSibling); };
      });
    }
    function copyText(t, okEl) {
      var done = function () { if (okEl) okEl.textContent = VT.t("b_copied"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { prompt("", t); });
      else prompt("", t);
    }
    VTB.ask = function () {
      if (busy) return;
      var p = cfg.payload();
      if (typeof p === "string") { err(VT.t(p)); return; }
      var body = { room: cfg.room, text: p.text, lang: VT.lang };
      if (p.opt) body.opt = p.opt;
      if (p.image) body.image = p.image;
      var k = getKey(); if (k) body.key = k;
      busy = true;
      var go = document.getElementById("go"); if (go) go.disabled = true;
      out.innerHTML = '<div class="verdict low">' + VT.t("b_thinking") + "</div>"; out.classList.remove("hidden");
      var again = false;
      call("/ask", body).then(function (j) {
        if (!j.ok && j.code === "key_expired") return renewKey().then(function (got) {
          if (got) { again = true; busy = false; VTB.ask(); return "retry"; }
          return j;
        });
        return j;
      }).then(function (j) {
        if (j === "retry") return;
        if (j.left) showLeft(j.left);
        if (j.ok) { lastAnswer = j.answer; draw(); }
        else {
          err(j.msg ? (j.msg[VT.lang] || j.msg.en) : VT.t("b_net"));
          /* 맛보기를 다 쓴 손님에게 구독 길을 바로 보여 준다 (2026-11-21) */
          var l = j.left || last;
          if (l && l.kind === "trial" && l.used >= l.limit && !getKey())
            out.insertAdjacentHTML("beforeend", '<div class="row"><a class="btn" href="./plans.html">' + VT.t("b_plans") + '</a>' +
              '<span class="note">' + VT.esc(VT.t("b_more")) + "</span></div>");
        }
      }).catch(function () { err(VT.t("b_net")); })
        .then(function () { if (again) return; busy = false; if (go) go.disabled = false; });
    };
    document.getElementById("bKeySave").onclick = function () {
      var v = document.getElementById("bKey").value.trim();
      if (!v) return;
      setKey(v); keyUI(); refreshLeft();
    };
    document.getElementById("bKeyDel").onclick = function () { setKey(""); document.getElementById("bKey").value = ""; keyUI(); refreshLeft(); };
    VT.onLang = function () { showLeft(last); draw(); if (cfg.onLang) cfg.onLang(); };
    VT.mountChrome(); VT.apply(); keyUI(); refreshLeft();
  };
})();
