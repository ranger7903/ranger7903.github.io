/* 밸류스 AI 백화점 — 함께 쓰는 조각 (말 바꾸기 · 위쪽 줄 · 바닥 · 진열장 목록)
 * 영어가 기본이고, 브라우저 말이 한국어면 한국어로 연다. 고른 말은 이 브라우저에만 기억한다. */
(function () {
  "use strict";
  var KEY = "vt_ai_lang";
  function pick() {
    var q = new URLSearchParams(location.search).get("lang");
    if (q === "ko" || q === "en") { try { localStorage.setItem(KEY, q); } catch (e) {} return q; }
    try { var s = localStorage.getItem(KEY); if (s === "ko" || s === "en") return s; } catch (e) {}
    var n = (navigator.languages && navigator.languages[0]) || navigator.language || "en";
    return /^ko/i.test(n) ? "ko" : "en";
  }
  var VT = window.VT = { lang: pick(), dict: {} };

  VT.t = function (k) {
    var d = VT.dict[k];
    if (!d) return k;
    return d[VT.lang] != null ? d[VT.lang] : d.en;
  };
  VT.add = function (o) { for (var k in o) VT.dict[k] = o[k]; };
  VT.apply = function (root) {
    root = root || document;
    root.querySelectorAll("[data-i]").forEach(function (el) { el.innerHTML = VT.t(el.getAttribute("data-i")); });
    root.querySelectorAll("[data-i-ph]").forEach(function (el) { el.setAttribute("placeholder", VT.t(el.getAttribute("data-i-ph"))); });
    root.querySelectorAll("[data-i-aria]").forEach(function (el) { el.setAttribute("aria-label", VT.t(el.getAttribute("data-i-aria"))); });
    document.documentElement.lang = VT.lang;
    var tt = document.querySelector("[data-i-title]");
    if (tt) document.title = VT.t(tt.getAttribute("data-i-title"));
  };
  VT.setLang = function (l) {
    VT.lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    VT.apply();
    if (typeof VT.onLang === "function") VT.onLang();
  };
  VT.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };

  VT.add({
    brand: { en: "VALUES <small>AI Store</small>", ko: "밸류스 <small>AI 백화점</small>" },
    nav_store: { en: "All rooms", ko: "모든 방" },
    nav_plans: { en: "Plans", ko: "구독" },
    nav_programs: { en: "Windows programs", ko: "윈도우 프로그램" },
    nav_lang: { en: "한국어", ko: "English" },
    foot_line: { en: "Rooms marked 🔒 read your text or file only inside your own browser. Nothing is sent to us. Rooms without 🔒 send your text to an AI company to make the answer; we do not store it.",
                 ko: "🔒 표시가 있는 방은 손님 브라우저 안에서만 읽습니다. 저희 쪽으로 아무것도 보내지 않습니다. 🔒 가 없는 방은 답을 만들려고 글을 AI 회사로 보내며, 밸류스는 저장하지 않습니다." },
    foot_biz: { en: "Business info (Korean)", ko: "사업자 정보" },
    foot_terms: { en: "Terms", ko: "이용약관" },
    foot_priv: { en: "Privacy", ko: "개인정보 처리방침" },
    foot_refund: { en: "Refunds", ko: "환불 안내" },
    foot_mail: { en: "Questions: ranger7903@nate.com", ko: "문의: ranger7903@nate.com" }
  });

  VT.mountChrome = function () {
    var nav = document.createElement("nav");
    nav.className = "top no-print";
    nav.innerHTML =
      '<div class="shell"><a class="brand" href="./" data-i="brand"></a>' +
      '<div class="navlinks"><a href="./#rooms" data-i="nav_store"></a><a href="./plans.html" data-i="nav_plans"></a>' +
      '<a id="vtProg" href="../index.html#products" data-i="nav_programs"></a>' +
      '<button type="button" class="lang" id="vtLang" data-i="nav_lang"></button></div></div>';
    document.body.insertBefore(nav, document.body.firstChild);
    var f = document.createElement("footer");
    f.className = "no-print";
    f.innerHTML = '<div class="shell"><p data-i="foot_line"></p><p>' +
      '<a href="../사업자정보.html" data-i="foot_biz"></a><a href="../terms.html" data-i="foot_terms"></a>' +
      '<a href="../privacy.html" data-i="foot_priv"></a><a href="../refund.html" data-i="foot_refund"></a></p>' +
      '<p data-i="foot_mail"></p><p>© 2026 VALUES (사재기)</p></div>';
    document.body.appendChild(f);
    document.getElementById("vtLang").addEventListener("click", function () { VT.setLang(VT.lang === "ko" ? "en" : "ko"); });
    var prog = document.getElementById("vtProg");
    var fixProg = function () { prog.href = VT.lang === "ko" ? "../index.html#products" : "../en.html"; };
    var prev = VT.onLang;
    VT.onLang = function () { fixProg(); if (prev) prev(); };
    fixProg();
  };

  /* ── 진열장 목록 ── status: open = 지금 쓸 수 있음 · soon = 곧 나옴 */
  VT.CATS = [
    { id: "safety", ico: "🛡️", en: "Scams & Safety", ko: "사기·안전" },
    { id: "money", ico: "🧾", en: "Money & Paperwork", ko: "돈·서류" },
    { id: "home", ico: "🍳", en: "Home & Kitchen", ko: "집·살림" },
    { id: "family", ico: "👨‍👩‍👧", en: "Family Care", ko: "가족 돌봄" },
    { id: "learn", ico: "📚", en: "Learning & Languages", ko: "공부·외국어" },
    { id: "work", ico: "💼", en: "Work & Office", ko: "일·사무" },
    { id: "shop", ico: "🏪", en: "Small Shop", ko: "가게" },
    { id: "travel", ico: "🧳", en: "Travel", ko: "여행" },
    { id: "romance", ico: "💌", en: "Letters & Memories", ko: "낭만·추억" }
  ];
  function R(id, cat, ico, en, ko, den, dko, kw, status, href, local) {
    return { id: id, cat: cat, ico: ico, en: en, ko: ko, den: den, dko: dko, kw: kw, status: status || "soon", href: href || "", local: !!local };
  }
  VT.ROOMS = [
    R("scam", "safety", "🚨", "Is This a Scam?", "이거 사기예요?", "Paste a text or email. See the warning signs and the real address behind every link.", "문자·메일을 붙여 넣으면 위험 신호와 링크의 진짜 주소를 보여 드려요.", "scam fraud text sms phishing link 사기 문자 스미싱 링크 택배 피싱 메일", "open", "scam.html", true),
    R("clicked", "safety", "🆘", "I Clicked It — Now What?", "눌렀어요, 어떻게 해요?", "Step-by-step what to do first if you already tapped or typed something.", "이미 눌렀거나 입력했을 때 무엇부터 할지 차례대로.", "clicked hacked stolen 눌렀어요 해킹 돈 빠짐", "open", "scam.html#clicked", true),
    R("askfam", "safety", "👪", "Ask My Family", "자녀에게 물어보기", "One button sends the message and the warning signs to your family.", "단추 하나로 문자와 위험 신호를 가족에게 보내요.", "family parent 가족 부모님 자녀", "soon"),
    R("subs", "money", "🔁", "Forgotten Subscription Finder", "잊은 구독 찾기", "Drop in your card statement. See every charge that repeats, with next date and yearly cost.", "카드 내역 파일을 넣으면 달마다 나가는 돈을 다음 날짜·1년 값과 함께 모아 드려요.", "subscription recurring charge cancel card statement 구독 정기결제 해지 카드 내역 자동결제", "open", "subs.html", true),
    R("paper", "money", "📄", "What Does This Paper Mean?", "이 종이 무슨 뜻이에요", "A photo of a bill or statement, explained line by line in plain words.", "고지서·명세서 사진을 줄마다 쉬운 말로 풀어 드려요.", "bill statement explain 고지서 명세서 관리비 병원비", "soon"),
    R("lease", "money", "🏠", "Before You Sign a Lease", "집 계약 전 점검", "Marks the lines to check in a property record and makes a checklist.", "등기부등본에서 살펴볼 줄을 표시하고 확인표를 만들어 드려요.", "lease rent deed 전세 등기부 계약", "soon"),
    R("fridge", "home", "🥕", "Fridge-Photo Dinner", "냉장고 한 장 밥상", "One photo of your fridge, three dishes you can make right now.", "냉장고 사진 한 장으로 지금 만들 요리 세 가지.", "fridge cook recipe dinner 냉장고 요리 반찬 저녁", "soon"),
    R("week", "home", "🗓️", "Zero-Leftover Week", "남는 것 없는 일주일 밥", "A week of meals that uses up the half onion too, plus a shopping list.", "양파 반 개까지 다 쓰는 일주일 식단과 장볼 목록.", "meal plan grocery 식단 장보기", "open", "week.html"),
    R("swap", "home", "🔄", "Can I Swap This?", "이걸로 바꿔도 돼요?", "What to use instead of a missing ingredient.", "없는 재료 대신 쓸 것을 바로 알려 드려요.", "substitute ingredient 대체 재료 양념", "open", "swap.html"),
    R("school", "family", "🏫", "School Notices on One Page", "학교 알림 한 장", "Paste notices from apps, email or paper. Get dates, things to bring, money and forms on one page.", "앱·메일·가정통신문을 붙여 넣으면 날짜·준비물·낼 돈·낼 서류만 한 장으로.", "school notice newsletter parent 학교 가정통신문 알림 준비물 학부모", "open", "school.html", true),
    R("notice", "family", "🌏", "Notices in My Language", "우리말 공지 풀어 주기", "The same notice, explained in the parent's own language.", "같은 공지를 부모님 나라 말로 쉽게 풀어 드려요.", "translate notice 번역 공지 다문화", "open", "notice.html"),
    R("care", "family", "💊", "Parent Care on One Page", "부모님 돌봄 한 장", "Medicines and appointments from photos, shared with your siblings.", "약봉지·처방전 사진으로 약 목록과 진료 달력을, 형제와 함께.", "parent care medicine 부모님 돌봄 약 진료", "soon"),
    R("careshare", "family", "🤝", "Share the Caring", "돌봄 나누기표", "Who does what this week, and a one-line weekly update.", "누가 무엇을 맡는지와 주마다 한 줄 보고.", "siblings share 형제 나누기", "open", "careshare.html"),
    R("speak", "learn", "🗣️", "Practice Tomorrow's Conversation", "내일 쓸 말 연습", "Describe a real situation. Get the conversation both ways, key phrases and replies to surprises.", "실제 상황을 적으면 주고받을 대화·꼭 쓸 말·뜻밖의 말에 받아칠 말까지.", "speaking practice conversation 회화 말하기 연습", "open", "speak.html"),
    R("myvideo", "learn", "🎬", "Learn From Videos You Love", "좋아하는 영상으로", "Two-language subtitles side by side, slow replay, your own word list.", "두 말 자막을 나란히, 천천히 다시 듣기, 내 낱말장.", "subtitle video 자막 영상", "soon"),
    R("korean", "learn", "🇰🇷", "Korean for Daily Life", "한국 생활 한국어", "Bank, clinic, immigration office, landlord: practise before you go.", "은행·병원·출입국·집주인과 할 말을 미리 연습.", "korean foreigner student 한국어 유학생 외국인", "open", "korean.html"),
    R("grammar", "learn", "✏️", "One-Line Grammar Fix", "문법 한 줄 풀이", "Why your sentence is wrong, in one line, with three better ones.", "왜 틀렸는지 한 줄, 비슷한 바른 문장 세 개.", "grammar 문법 교정", "open", "grammar.html"),
    R("reply", "work", "✉️", "Three-Line Reply", "답장 세 줄", "Paste an email, choose yes, no or ask more. Get a polite draft.", "메일을 붙여 넣고 수락·거절·더 묻기를 고르면 예의 바른 초안.", "email reply draft 메일 답장 회신", "open", "reply.html"),
    R("meeting", "work", "📝", "Meeting on One Page", "회의 끝 한 장", "Decisions, owners and deadlines from your notes or recording.", "메모·녹음에서 정한 것·할 사람·기한을 한 장으로.", "meeting minutes 회의록", "soon"),
    R("table", "work", "📊", "Move That Table", "표 옮기기", "Tables inside PDFs, photos or emails, into a spreadsheet.", "PDF·사진·메일 속 표를 엑셀로.", "pdf table excel 표 엑셀", "soon"),
    R("gongmun", "work", "🏛️", "Official Letter Check", "공문 한 번 보기", "Checks dates, attachment numbers and spelling before you send.", "보내기 전 날짜·붙임 번호·맞춤법을 점검.", "official letter 공문 기안", "open", "gongmun.html"),
    R("review", "shop", "⭐", "Review Reply Helper", "리뷰 답글 대신 쓰기", "Paste a review, get two calm short replies. You choose and post.", "리뷰를 붙여 넣으면 차분하고 짧은 답글 두 가지. 사장님이 골라 붙여요.", "review reply 리뷰 답글 별점", "open", "review.html"),
    R("reviewmonth", "shop", "📈", "This Month's Reviews", "이번 달 리뷰 한 장", "Three praises, three complaints and one thing to fix.", "칭찬 3 · 불만 3 · 고칠 것 1.", "review summary 리뷰 요약", "open", "reviewmonth.html"),
    R("shopmini", "shop", "🧑‍🍳", "Shop Assistant Taster", "가게 비서 맛보기", "Two short replies to a customer question, using only your shop facts.", "손님 문의에 보낼 짧은 답장 두 가지. 적어 주신 가게 정보만 써요.", "shop assistant 가게 비서", "open", "shopmini.html"),
    R("trip", "travel", "🗺️", "Trip on One Page", "여행 한 장", "A plan that fits your energy and walking distance, with official links.", "체력과 걷는 거리에 맞춘 일정표, 곳마다 공식 링크.", "trip itinerary 여행 일정", "soon"),
    R("tripcost", "travel", "💵", "True Trip Cost", "진짜 총비용 계산기", "Flights, stay, fees and taxes added up, with what is missing.", "항공·숙소·수수료·세금을 다 합치고 빠진 항목까지.", "trip cost budget 여행 비용", "open", "tripcost.html"),
    R("around", "travel", "📍", "Around My Stay", "숙소 둘레 한 장", "Cash machines, shops, pharmacies and food within 10 minutes' walk.", "걸어서 10분 안의 현금인출기·편의점·약국·식당.", "hotel nearby 숙소 주변", "soon"),
    R("slowletter", "romance", "💌", "Slow Letter", "느린 편지", "A letter that arrives on the day you choose. Sealed until then.", "내가 고른 날에 도착하는 편지. 그날까지 봉인돼요.", "letter future 편지 미래 1년 뒤", "soon"),
    R("rolling", "romance", "🎉", "Group Card", "함께 쓰는 롤링페이퍼", "One link, many writers, opens on the day.", "링크 하나로 여러 사람이 쓰고, 정한 날 열려요.", "group card graduation 롤링페이퍼 졸업 퇴임", "soon"),
    R("nightsky", "romance", "🌌", "The Night Sky That Day", "그날 밤하늘", "The stars and moon over your place on your date.", "그날 그곳의 별자리와 달 모양.", "stars sky anniversary 별자리 밤하늘 기념일", "soon"),
    R("daily", "romance", "🌅", "One Small Romance Today", "오늘의 낭만 한 줄", "Sunset time, the moon, the seasonal term and one small thing to do today.", "해 지는 시각·달·절기와 오늘 해 볼 작은 일 하나.", "sunset moon season 노을 달 절기", "open", "daily.html"),
    R("song", "romance", "🎵", "Our Story Song", "우리 이야기 노래", "Your story turned into lyrics and a song.", "우리 이야기를 노랫말과 노래로.", "song lyrics 노래 노랫말", "soon"),
    R("parentbook", "romance", "📖", "Parents' Story Book", "부모님 이야기 책", "One question a week, answered by voice, a book after a year.", "매주 질문 하나, 목소리로 답하면 1년 뒤 책.", "memoir parents 부모님 자서전 이야기 책", "soon"),
    R("couple", "romance", "💬", "Questions for Two", "둘만의 질문", "A daily question both of you answer before you see each other's.", "둘 다 답해야 서로 보이는 하루 질문.", "couple questions 연인 질문", "soon"),
    R("memorymap", "romance", "🗾", "Memory Map", "추억 지도", "Your photo folder becomes a map and timeline, on your own computer.", "사진 폴더로 지도와 연표를, 내 컴퓨터 안에서.", "photo map memory 사진 지도 추억", "soon"),
    R("skyletter", "romance", "🕊️", "Letter to the Sky", "하늘로 보내는 편지", "A letter to someone who has passed. The AI only helps you write.", "떠난 분께 쓰는 편지. AI는 쓰는 것만 거들어요.", "grief letter 그리움 편지", "open", "skyletter.html"),
    R("season", "romance", "🍂", "Season Postcard", "계절 엽서", "A short seasonal verse you edit and send to friends.", "절기마다 짧은 시 초안, 고쳐서 친구에게.", "season postcard 계절 엽서", "open", "season.html"),
    R("penpal", "romance", "✈️", "Slow Pen Pal", "느린 펜팔", "Letters across languages that take their time.", "다른 나라 사람과 천천히 오가는 편지.", "pen pal 펜팔", "soon"),
    R("picturebook", "romance", "🖍️", "Picture-Book Love Letter", "그림책 연애편지", "A small picture book starring the two of you.", "두 사람이 주인공인 작은 그림책.", "picture book 그림책", "soon")
  ];

  VT.card = function (r) {
    var L = VT.lang, name = L === "ko" ? r.ko : r.en, desc = L === "ko" ? r.dko : r.den;
    // 2026-11-19 AI 두뇌 방(🔒 아님)은 공짜가 아니라 맛보기 하루 3번
    var tags = r.status === "open"
      ? '<span class="tag open">' + (r.local ? (L === "ko" ? "지금 쓰기 · 공짜" : "Open now · Free")
                                         : (L === "ko" ? "지금 쓰기 · 맛보기 하루 3번" : "Open now · 3 free tries a day")) + "</span>"
      : '<span class="tag soon">' + (L === "ko" ? "곧 나와요" : "Coming soon") + "</span>";
    if (r.local) tags += '<span class="tag lock">' + (L === "ko" ? "🔒 내 화면 안에서만" : "🔒 Stays in your browser") + "</span>";
    var inner = '<span class="ico">' + r.ico + "</span><b>" + VT.esc(name) + "</b><p>" + VT.esc(desc) + '</p><span class="meta">' + tags + "</span>";
    return r.status === "open"
      ? '<a class="card" href="' + r.href + '">' + inner + "</a>"
      : '<div class="card soon" aria-disabled="true">' + inner + "</div>";
  };
})();
