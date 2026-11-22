/* 밸류스 AI 백화점 — 홈 화면에 붙이기만 하는 서비스워커 (2026-11-22).
 * 아무것도 저장(캐시)하지 않고, 요청을 가로채지 않는다(fetch 처리 없음). 그래서 모든 방이 예전과 똑같이 인터넷에서 새로 읽힌다. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
