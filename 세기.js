/* 밸류스 «방문자 세기» — 2026-09-28
 *
 * 무엇을 세나 : 어느 쪽이 몇 번 열렸는지, 어디서 들어왔는지(검색·직접).
 * 무엇을 안 모으나 : 쿠키를 심지 않습니다. 손님이 누구인지 알아내지 않습니다.
 *   이름·메일·주소를 남기지 않고, 손님을 따라다니며 이어 붙이지 않습니다.
 * 어디서 보나 : 클라우드플레어 > Web Analytics.
 *
 * 이 조각이 따로 있는 까닭 : 홈페이지 본문과 섞지 않으려는 것입니다.
 *   세는 것을 그만두고 싶으면 이 파일을 부르는 한 줄만 지우시면 됩니다.
 */
(function () {
  try {
    var s = document.createElement("script");
    s.defer = true;
    s.src = "https://static.cloudflareinsights.com/beacon.min.js";
    s.setAttribute("data-cf-beacon", JSON.stringify({ token: "426b0a9eaf394336beb2fa80415c6b98" }));
    document.head.appendChild(s);
  } catch (e) { /* 세는 것이 안 되어도 홈페이지는 그대로 돌아가야 한다 */ }
})();
