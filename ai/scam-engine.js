/* 「이거 사기예요?」 속엔진 — 손님 브라우저 안에서만 돈다. 아무 데도 보내지 않는다.
 * 하는 일: 글 속 위험 신호를 찾고, 링크마다 진짜 주소(도메인)를 꺼내 보인다.
 * 원칙: 「안전합니다」라고 말하지 않는다. 신호가 없으면 「못 찾았다」고만 한다. */
(function (root) {
  "use strict";
  var SHORT = ["bit.ly","t.ly","tinyurl.com","goo.gl","han.gl","me2.do","url.kr","vo.la","buly.kr","c11.kr","lrl.kr","ow.ly","is.gd","cutt.ly","rb.gy","shorturl.at","t.co","s.id","rebrand.ly","tiny.cc","bitly.kr","naver.me","zrr.kr","asq.kr","yun.kr","link24.kr","ii.ad"];
  var BADTLD = ["xyz","top","icu","click","shop","live","site","online","info","cc","vip","tk","ml","ga","cf","gq","buzz","rest","cyou","sbs","cfd","bond","quest","monster","work","link","support","help","fun","lat","vin","pw","ws","asia"];
  /* 브랜드 낱말 → 진짜 도메인 끝 */
  var BRANDS = [
    ["kakao",["kakao.com","kakaocorp.com","kakaobank.com","kakaopay.com","daum.net"]],["naver",["naver.com","naver.me","navercorp.com"]],
    ["coupang",["coupang.com"]],["cjlogistics",["cjlogistics.com"]],["cj",["cjlogistics.com","cj.net","cjone.com"]],["epost",["epost.go.kr"]],
    ["hanjin",["hanjin.com","hanjin.co.kr"]],["lotte",["lotteglogis.com","lotte.com","lotteon.com"]],["toss",["toss.im","tossbank.com"]],
    ["kbstar",["kbstar.com"]],["shinhan",["shinhan.com","shinhancard.com"]],["woori",["wooribank.com","wooricard.com"]],["hana",["hanabank.com","hanacard.co.kr"]],
    ["nonghyup",["nonghyup.com"]],["samsung",["samsung.com","samsungcard.com"]],["hipass",["hipass.co.kr","ex.co.kr"]],["hometax",["hometax.go.kr"]],
    ["usps",["usps.com"]],["fedex",["fedex.com"]],["dhl",["dhl.com"]],["ups",["ups.com"]],["royalmail",["royalmail.com"]],["amazon",["amazon.com","amazon.co.uk","amazon.co.jp","amzn.to"]],
    ["apple",["apple.com","icloud.com"]],["icloud",["icloud.com"]],["paypal",["paypal.com"]],["netflix",["netflix.com"]],["microsoft",["microsoft.com","live.com","office.com"]],
    ["google",["google.com","youtube.com","goo.gl"]],["ezpass",["e-zpassny.com","ezpassnj.com","e-zpassiag.com"]],["irs",["irs.gov"]],["wellsfargo",["wellsfargo.com"]],
    ["chase",["chase.com"]],["bankofamerica",["bankofamerica.com"]],["evri",["evri.com"]]
  ];
  var URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"'()]+|(?:[a-z0-9-]+\.)+(?:com|net|org|kr|co\.kr|go\.kr|me|ly|gl|do|io|xyz|top|icu|click|shop|live|site|online|info|cc|vip|tk|ml|ga|cf|gq|buzz|cyou|sbs|cfd|bond|link|support|help|fun|pw|ws|asia|im|to|uk|jp|us|at|id|gd|kr)\/?[^\s<>"'()]*)/gi;

  function hostOf(u) {
    var s = u.replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "");
    s = s.split(/[\/?#]/)[0].split("@").pop().split(":")[0].toLowerCase().replace(/[.,;!]+$/, "");
    return s;
  }
  function endsWithAny(h, list) { return list.some(function (d) { return h === d || h.slice(-(d.length + 1)) === "." + d; }); }

  var S = function (id, en, ko, tests) { return { id: id, en: en, ko: ko, tests: tests }; };
  /* 글로 찾는 신호. 각 tests 는 정규식 배열 — 하나라도 맞으면 그 신호가 켜진다 */
  var TEXT = [
    S("urgent", ["Pressure to act right now","Scammers rush you so you don't stop to check."],
      ["지금 당장 하라고 재촉해요","사기꾼은 확인할 틈을 안 주려고 서두르게 만듭니다."],
      [/오늘\s*(까지|중|안에|자정)|즉시|지금\s*바로|당일\s*(내|중)|24\s*시간\s*(이내|안|내)|48\s*시간|기한\s*(내|만료)|마지막\s*(안내|통보|기회)|정지\s*(예정|됩니다|처리)|차단\s*(예정|됩니다)|압류|연체\s*(료|시)|미납\s*시/,
       /\b(immediately|urgent(ly)?|within\s+(24|48)\s+hours|final\s+(notice|warning)|act\s+now|today\s+only|will\s+be\s+(suspended|locked|closed|terminated)|account\s+(suspended|locked|on\s+hold)|last\s+chance)\b/i]),
    S("money", ["Asks for money in an unusual way","Gift cards, coins or a transfer to a person are hard to get back."],
      ["이상한 방법으로 돈을 달라고 해요","상품권·코인·개인 계좌 이체는 돌려받기 어렵습니다."],
      [/(문화|구글\s*플레이|기프트|백화점|편의점|모바일)\s*(상품권|카드)|상품권\s*(번호|핀)|핀\s*번호|코인|비트코인|테더|가상\s*(자산|화폐)|(대신|먼저)\s*(송금|이체|결제)|(송금|이체)\s*(해|부탁|좀)|계좌\s*(로|번호)\s*(보내|알려|입금)|급하게\s*돈/,
       /\b(gift\s*cards?|itunes\s*card|google\s*play\s*card|steam\s*card|bitcoin|crypto|usdt|wire\s+(the\s+)?(money|transfer)|zelle|venmo|cash\s*app|western\s+union|money\s*gram)\b/i]),
    S("family", ["Someone says they are family on a new number","Call the old number or ask a question only your family would know."],
      ["가족이라며 새 번호로 연락해요","예전 번호로 전화해 보거나 가족만 아는 것을 물어보세요."],
      [/(엄마|아빠|어머니|아버지|아들|딸|할머니|할아버지|이모|삼촌)[^\n]{0,30}(폰|휴대폰|핸드폰|번호)[^\n]{0,20}(고장|깨|바꿨|바뀌|새로|수리|잃어)|(액정|폰)\s*(이|가)?\s*(깨져|고장|수리\s*중)|(이\s*번호로|새\s*번호)\s*(저장|연락)/,
       /\b(hi|hey|hello)\s+(mum|mom|dad|mother|father)\b|\b(new\s+(phone\s+)?number|my\s+phone\s+(is\s+)?(broke|broken|damaged|lost|in\s+repair)|this\s+is\s+my\s+new\s+number|save\s+this\s+number)\b/i]),
    S("delivery", ["A parcel problem with a link","Real couriers rarely ask you to pay or fix an address through a text link."],
      ["택배 문제라며 링크를 보내요","진짜 택배사는 문자 링크로 돈이나 주소 고치기를 거의 요구하지 않습니다."],
      [/(택배|배송|소포|우체국|물품|상품)[^\n]{0,40}(주소\s*(불일치|불명|오류|확인|수정)|보관\s*(중|료)|반송|미배송|배송\s*불가|도로명\s*주소|재배송|통관|관세)/,
       /\b(parcel|package|delivery|shipment)\b[^\n]{0,60}\b(address|redeliver(y)?|on\s+hold|failed|undeliverable|customs|fee|pending)\b/i]),
    S("fine", ["Unpaid toll, fine or tax","Look the amount up yourself on the official site or app, not through the link."],
      ["안 낸 통행료·과태료·세금이라고 해요","링크 말고 공식 사이트나 앱에서 직접 찾아보세요."],
      [/(통행료|하이패스|과태료|범칙금|교통\s*위반|벌금|세금|국세|지방세|건강보험료|국민연금)[^\n]{0,30}(미납|체납|연체|납부\s*(기한|요청|하지)|미\s*납부)/,
       /\b(unpaid|outstanding|overdue)\s+(toll|tolls|fine|tax|balance|invoice)\b|\b(toll\s+(service|road)|e-?z\s*pass|sunpass|fastrak)\b/i]),
    S("authority", ["Claims to be police, prosecutors, court or tax office","Real agencies do not ask for money or app installs by text."],
      ["경찰·검찰·법원·국세청이라고 해요","진짜 기관은 문자로 돈이나 앱 설치를 요구하지 않습니다."],
      [/(검찰|검사|경찰|수사관|금융감독원|금감원|국세청|법원|법무부|출입국|건강보험공단|국민연금공단)[^\n]{0,40}(사건|조사|연루|출석|소환|명의\s*도용|범죄|확인\s*필요|연락\s*바람|안내)/,
       /\b(irs|police|sheriff|court|warrant|federal\s+agent|immigration|social\s+security\s+administration|hmrc)\b[^\n]{0,50}\b(case|arrest|suspended|investigation|warrant|penalty|call)/i]),
    S("prize", ["You won, or money is waiting for you","Prizes and refunds you didn't apply for are a common bait."],
      ["당첨됐다거나 돈을 돌려준대요","신청하지 않은 당첨·환급은 흔한 미끼입니다."],
      [/당첨|경품|환급\s*(금|대상|신청)|지원금\s*(대상|신청|지급)|재난\s*지원|무료\s*(지급|증정)|미수령|포인트\s*(소멸|지급)/,
       /\b(you(\'ve| have)?\s+won|winner|prize|reward\s+points|claim\s+(your|now)|refund\s+(is\s+)?(waiting|available|pending)|tax\s+refund|stimulus)\b/i]),
    S("secret", ["Asks for a code, password or ID number","Never tell anyone a verification code, password or your ID number."],
      ["인증번호·비밀번호·주민번호를 달라고 해요","인증번호·비밀번호·주민번호는 누구에게도 알려 주지 마세요."],
      [/(인증\s*번호|인증\s*코드|OTP|비밀\s*번호|카드\s*번호|주민\s*(등록)?\s*번호|보안\s*카드|CVC|CVV)[^\n]{0,20}(알려\s*(주세요|주시면|주십|주실|줘|달라)|보내\s*(주세요|주시면|줘|달라)|회신|말씀해|불러\s*(주|줘)|전달해)/i,
       /\b(send|tell|give|share|reply\s+with|confirm)\b[^\n]{0,30}\b(code|otp|password|pin|ssn|social\s+security|card\s+number|cvv)\b/i]),
    S("app", ["Asks you to install an app or allow remote control","Remote-control and unknown apps can read your banking."],
      ["앱을 깔라거나 원격 조종을 하재요","원격 조종 앱·모르는 앱은 은행 정보를 읽어 갈 수 있습니다."],
      [/\.apk\b|앱\s*(을|를)?\s*(설치|깔|다운)|원격\s*(지원|조종|제어)|팀뷰어|애니데스크|보안\s*(앱|프로그램)\s*(설치|다운)/i,
       /\.apk\b|\b(install|download)\s+(this|the|our)?\s*app\b|\b(teamviewer|anydesk|remote\s+(access|support|control))\b/i]),
    S("reply", ["Tries to start a chat with a stranger","'Wrong number' friendly chats often turn into investment or romance scams."],
      ["모르는 사람이 말을 걸어와요","「잘못 보냈어요」로 시작한 다정한 대화가 투자·연애 사기로 이어지는 일이 많습니다."],
      [/(잘못\s*(보냈|보낸|연락)|번호\s*(를|가)?\s*잘못|혹시\s*[가-힣]{1,4}\s*(씨|님)\s*(맞|아니)|(Y|예|네)\s*(를|라고)?\s*(답장|회신|보내))/,
       /\b(wrong\s+number|is\s+this\s+[a-z]+\?|sorry,?\s+i\s+(thought|must\s+have)|reply\s+(y|yes)\s+to|text\s+back)\b/i]),
    S("intl", ["Sent from or asks you to call an overseas number","An unexpected overseas number is worth a second look."],
      ["해외 번호이거나 해외로 전화하래요","생각지 못한 해외 번호는 한 번 더 의심해 보세요."],
      [/\[(국제|해외)\s*발신\]|\[Web발신\][^\n]{0,5}\+(?!82)\d|(?:^|\s)\+(?!82\b)(?!1\b)\d{1,3}[\s-]?\d{2,}|(?:^|\s)00[1-9]\d{0,2}[\s-]\d/])
  ];

  function analyse(text) {
    text = String(text || "");
    var found = [], links = [];
    TEXT.forEach(function (s) {
      if (s.tests.some(function (re) { re.lastIndex = 0; return re.test(text); })) found.push(s.id);
    });
    var m, seen = {};
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      var raw = m[1];
      if (/@/.test(raw.split("/")[0])) continue; /* 메일 주소는 건너뜀 */
      var h = hostOf(raw);
      if (!h || h.indexOf(".") < 0 || seen[h]) continue;
      seen[h] = 1;
      var why = [];
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) why.push("ip");
      if (endsWithAny(h, SHORT)) why.push("short");
      if (/^xn--|\.xn--/.test(h)) why.push("puny");
      var tld = h.split(".").pop();
      if (BADTLD.indexOf(tld) >= 0) why.push("tld");
      var flat = h.replace(/[-.]/g, "");
      BRANDS.forEach(function (b) {
        if (flat.indexOf(b[0]) >= 0 && !endsWithAny(h, b[1]) && why.indexOf("brand") < 0) { why.push("brand"); why.brand = b[0]; }
      });
      if ((h.match(/-/g) || []).length >= 2) why.push("dash");
      links.push({ raw: raw, host: h, why: why, brand: why.brand || "" });
    }
    var badLinks = links.filter(function (l) { return l.why.length; });
    if (badLinks.length) found.push("badlink");
    else if (links.length && found.length) found.push("link");
    return { signals: found, links: links, level: found.length >= 2 ? "high" : found.length === 1 ? "mid" : "low" };
  }

  var LINKWHY = {
    ip: ["The address is only numbers, not a company name.", "주소가 회사 이름이 아니라 숫자뿐이에요."],
    short: ["A shortened link hides where it really goes.", "줄인 주소라 진짜 어디로 가는지 숨겨져 있어요."],
    puny: ["The address uses look-alike letters.", "비슷하게 생긴 글자로 만든 주소예요."],
    tld: ["The ending is common in throw-away scam sites.", "사기 사이트가 자주 쓰는 끝자리예요."],
    brand: ["It uses a company's name, but it is not that company's real address.", "회사 이름을 넣었지만 그 회사의 진짜 주소가 아니에요."],
    dash: ["Many dashes, often used to imitate real sites.", "줄표가 많아요. 진짜 사이트를 흉내 낼 때 흔해요."]
  };
  var EXTRA = {
    badlink: { en: ["A link looks suspicious", "Don't tap it. Open the company's app or type their address yourself."], ko: ["링크가 수상해요", "누르지 마세요. 그 회사 앱을 직접 열거나 주소를 손으로 쳐서 들어가세요."] },
    link: { en: ["It asks you to tap a link", "Together with the sign above, a link is a reason to stop."], ko: ["링크를 누르라고 해요", "위 신호와 함께 링크가 있으면 멈추셔야 할 까닭이 됩니다."] }
  };
  function signalText(id, lang) {
    var i = lang === "ko" ? "ko" : "en";
    if (EXTRA[id]) return EXTRA[id][i];
    for (var k = 0; k < TEXT.length; k++) if (TEXT[k].id === id) return TEXT[k][i];
    return [id, ""];
  }
  /* 「답장해도 돼요?」 (2026-11-21) — 찾은 신호로 답장 여부 한 줄 */
  var REPLY = {
    code: ["No. Never send a code or password by reply.", "Even a real company never asks for a verification code by text or email.",
           "아니요. 인증번호·비밀번호는 답장으로 절대 보내지 마세요.", "진짜 회사도 문자나 메일로 인증번호를 달라고 하지 않아요."],
    stranger: ["No. Don't start a chat with a stranger.", "A friendly 'wrong number' message is a common start of investment and romance scams. Just delete it.",
           "아니요. 모르는 사람과 대화를 시작하지 마세요.", "「잘못 보냈어요」로 시작하는 다정한 말은 투자·연애 사기의 흔한 시작이에요. 그냥 지우세요."],
    family: ["Not to this number. Call the old number first.", "Call your family member on the number you already have, or ask something only they would know.",
           "이 번호로는 하지 마세요. 예전 번호로 먼저 전화하세요.", "원래 알던 번호로 전화하거나, 가족만 아는 것을 물어보세요."],
    no: ["No. Don't reply at all.", "A reply tells them your number is real, and more scam messages will follow.",
           "아니요. 답장하지 마세요.", "답장하면 진짜 쓰는 번호라고 알려 주는 셈이라 사기 문자가 더 와요."],
    stop: ["Only if you know the company.", "If it is a shop you signed up with, replying STOP or using the opt-out is fine. If you don't know them, even STOP is a reply. Just delete it.",
           "아는 회사일 때만 하세요.", "가입한 가게 광고라면 수신거부를 해도 돼요. 모르는 곳이면 수신거부도 답장이니 그냥 지우세요."],
    check: ["Not yet. Check first.", "Contact them through their own app or a number you look up yourself, then decide.",
           "아직은 하지 마세요. 먼저 확인하세요.", "그 회사 앱이나 직접 찾은 번호로 확인한 뒤에 정하세요."],
    ok: ["Yes, if you know who sent it.", "We found no warning signs. If the number is new to you, think once more before replying.",
           "보낸 사람을 안다면 해도 돼요.", "위험 신호를 찾지 못했어요. 처음 보는 번호라면 답장 전에 한 번 더 생각하세요."]
  };
  var STOP_RE = /(수신\s*거부|무료\s*거부|080[\s-]?\d{3,4}[\s-]?\d{4}|\breply\s+stop\b|\btext\s+stop\b|\bstop\s+to\s+(opt|end|unsubscribe|cancel)|\bunsubscribe\b)/i;
  function replyAdvice(r, text) {
    var has = function (id) { return r.signals.indexOf(id) >= 0; };
    var k = has("secret") ? "code" : has("reply") ? "stranger" : has("family") ? "family" : r.level === "high" ? "no"
          : STOP_RE.test(String(text || "")) ? "stop" : r.level === "mid" ? "check" : "ok";
    return { key: k, en: [REPLY[k][0], REPLY[k][1]], ko: [REPLY[k][2], REPLY[k][3]] };
  }
  var api = { replyAdvice: replyAdvice, analyse: analyse, signalText: signalText, LINKWHY: LINKWHY, hostOf: hostOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.ScamEngine = api;
})(this);
