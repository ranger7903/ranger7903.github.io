# -*- coding: utf-8 -*-
"""밸류스 가게 아침 점검 — 매일 자동으로 돌아가는 검사표.

무엇을 보나:
  1. 홈페이지가 열리는가
  2. 홈페이지 안에 결제 열쇠(공개 토큰)와 상품 가격표(가격ID)가 전부 들어 있는가
  3. 홈페이지에 적힌 원화 가격이 가격표 원본(prices.json)과 같은가
  4. 손님(한국) 눈에 보이는 Paddle 가격이 가격표 원본과 같은가
  5. 결제창이 실제로 열리는가            <-- 2026-09-01에 통째로 막혔던 그 검사
  6. 정품 키 발급기(Cloudflare)가 살아 있는가
  7. 설치파일 조각이 하나도 안 빠지고 다 있는가
  8. 가짜 결제 페이지(buy.html)가 여전히 막혀 있는가

결과: 문제가 하나라도 있으면 프로그램이 1번으로 끝나고(=실패),
      깃허브가 「밸류스 아침 점검」 알림 글을 올려 메일로 알려 줍니다.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

SITE = "https://valuestools.kr"
RAW = "https://raw.githubusercontent.com/ranger7903/ranger7903.github.io/main"
UA = {"User-Agent": "valuestools-daily-check/1.0"}

문제 = []
경고 = []
잘됨 = []


def 알림(ok, 제목, 자세히=""):
    (잘됨 if ok else 문제).append(f"{제목}{(' — ' + 자세히) if 자세히 else ''}")


def 주의(제목, 자세히=""):
    경고.append(f"{제목}{(' — ' + 자세히) if 자세히 else ''}")


def 받기(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def 머리만(url, timeout=30):
    req = urllib.request.Request(url, headers=UA, method="HEAD")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, int(r.headers.get("Content-Length") or 0)


# ---------------------------------------------------------------- 가격표 원본
here = os.path.dirname(os.path.abspath(__file__))
표 = json.load(open(os.path.join(here, "prices.json"), encoding="utf-8"))
상품 = 표["상품"]

# ---------------------------------------------------------------- 1) 홈페이지
집 = ""
try:
    코드, 몸통 = 받기(SITE + "/")
    집 = 몸통.decode("utf-8", "replace")
    알림(코드 == 200 and len(집) > 10000, "홈페이지가 열립니다", f"{코드}, {len(집):,}글자")
except Exception as e:
    알림(False, "홈페이지가 안 열립니다", str(e))

try:
    코드, 몸통 = 받기(SITE + "/updates.html")
    업 = 몸통.decode("utf-8", "replace")
    알림(코드 == 200, "업데이트 받는 곳이 열립니다", str(코드))
    알림(표["정품키"]["공개키_b64"] in 업,
        "정품 키 확인용 공개키가 그대로 있습니다",
        "" if 표["정품키"]["공개키_b64"] in 업 else "공개키가 바뀌었거나 사라졌습니다")
except Exception as e:
    알림(False, "업데이트 받는 곳이 안 열립니다", str(e))

# ------------------------------------------------- 2) 결제 열쇠와 가격ID 확인
if 집:
    토큰 = 표["결제"]["paddle_공개토큰"]
    알림(토큰 in 집, "결제 열쇠(공개 토큰)가 홈페이지에 있습니다",
        "" if 토큰 in 집 else "토큰이 사라졌습니다 — 결제 단추가 전부 죽습니다")
    빠진 = [k for k, v in 상품.items() if v["paddle"] not in 집]
    알림(not 빠진, "상품 가격ID가 전부 있습니다", ("빠진 상품: " + ", ".join(빠진)) if 빠진 else "")

    # ------------------------------------------ 3) 홈페이지 표시가격 대조
    보이는 = re.findall(r'<span class="g-price"[^>]*>([\d,]+)<small>원</small></span>', 집)
    보이는 = {int(x.replace(",", "")) for x in 보이는}
    보이는.discard(0)   # 무료 도구(0원)는 가격표 대상이 아님
    있어야 = {v["원"] for v in 상품.values() if v["원"] > 0}
    없는값 = sorted(있어야 - 보이는)
    이상값 = sorted(보이는 - 있어야)
    알림(not 이상값, "홈페이지에 가격표에 없는 금액이 없습니다",
        ("가격표에 없는 금액이 보입니다: " + ", ".join(f"{x:,}원" for x in 이상값)) if 이상값 else "")
    if 없는값:
        주의("가격표에는 있는데 홈페이지에 안 보이는 금액",
            ", ".join(f"{x:,}원" for x in 없는값))

# ------------------------------------------------- 7) 설치파일 조각 전수 확인
try:
    코드, 몸통 = 받기(SITE + "/tools.manifest.json")
    목록 = json.loads(몸통.decode("utf-8"))
    상한 = 0
    빠진조각 = []
    for 이름, 정보 in 목록["files"].items():
        for p in 정보["parts"]:
            상한 += 1
            try:
                c, 길이 = 머리만(목록["base"] + p["name"])
                if c != 200 or (길이 and 길이 != p["size"]):
                    빠진조각.append(p["name"])
            except Exception:
                빠진조각.append(p["name"])
    알림(not 빠진조각, f"설치파일 조각 {상한}개가 전부 제자리에 있습니다",
        ("빠진 조각: " + ", ".join(빠진조각[:8])) if 빠진조각 else "")
except Exception as e:
    알림(False, "설치파일 목록(tools.manifest.json)을 못 읽었습니다", str(e))

# ------------------------------------------------- 8) 가짜 결제 페이지 차단 확인
try:
    코드, 몸통 = 받기(SITE + "/buy.html")
    바이 = 몸통.decode("utf-8", "replace")
    막힘 = "location.replace" in 바이 and "#products" in 바이
    알림(막힘, "옛날 결제 페이지(buy.html)가 막혀 있습니다",
        "" if 막힘 else "자동이동이 사라졌습니다 — 손님이 돈이 안 나가는 가짜 결제창을 볼 수 있습니다")
except Exception:
    주의("옛날 결제 페이지를 확인하지 못했습니다")

# ------------------------------------------------- 6) 정품 키 발급기 살아있나
발급기 = 표["정품키"]["발급기"]
try:
    req = urllib.request.Request(발급기 + "health", headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        살아있음 = r.status < 500
        알림(살아있음, "정품 키 발급기가 살아 있습니다", f"응답 {r.status}")
except urllib.error.HTTPError as e:
    # 405/404 도 "서버는 살아 있다"는 뜻이다
    알림(e.code < 500, "정품 키 발급기가 살아 있습니다", f"응답 {e.code}")
except Exception as e:
    알림(False, "정품 키 발급기에 연결하지 못했습니다", str(e))

# ------------------------------------------------- 4)(5) Paddle 실제 가격·결제창
try:
    from playwright.sync_api import sync_playwright
    쓸수있음 = True
except Exception:
    쓸수있음 = False
    주의("Paddle 실제 가격 검사를 건너뜀", "playwright 없음")

if 쓸수있음:
    JS = """
    async (arg) => {
      const out = {prices:{}, checkout:'안함', errors:[]};
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
        s.onload = res; s.onerror = () => rej(new Error('paddle.js 못 불러옴'));
        document.head.appendChild(s);
      });
      Paddle.Initialize({ token: arg.token, eventCallback: (e) => {
        if (e && e.name) out.errors.push(e.name);
      }});
      for (const [key, pid] of Object.entries(arg.ids)) {
        try {
          const r = await Paddle.PricePreview({ items:[{priceId: pid, quantity:1}],
                                                address:{ countryCode:'KR' } });
          out.prices[key] = r.data.details.lineItems[0].formattedTotals.total;
        } catch (e) { out.prices[key] = 'ERR:' + (e && e.message ? e.message : e); }
      }
      try {
        Paddle.Checkout.open({ items:[{priceId: arg.one, quantity:1}] });
        await new Promise(r => setTimeout(r, 9000));
        out.checkout = document.querySelector('iframe[src*="paddle"], .paddle-frame, #paddle-checkout-frame')
                       ? '열림' : '안열림';
      } catch (e) { out.checkout = 'ERR:' + e.message; }
      return out;
    }
    """
    ids = {k: v["paddle"] for k, v in 상품.items()}
    한개 = 상품["quick"]["paddle"]
    try:
        with sync_playwright() as pw:
            br = pw.chromium.launch()
            pg = br.new_page()
            pg.goto(SITE + "/", wait_until="domcontentloaded", timeout=60000)
            결과 = pg.evaluate(JS, {"token": 표["결제"]["paddle_공개토큰"], "ids": ids, "one": 한개})
            br.close()

        틀린가격 = []
        for k, v in 결과["prices"].items():
            숫자 = re.sub(r"[^\d]", "", v)
            if not 숫자:
                틀린가격.append(f"{상품[k]['이름']}: {v}")
            elif int(숫자) != 상품[k]["원"]:
                틀린가격.append(f"{상품[k]['이름']}: 손님화면 {v} / 가격표 {상품[k]['원']:,}원")
        알림(not 틀린가격, f"손님(한국) 화면 가격 {len(결과['prices'])}건이 가격표와 같습니다",
            " · ".join(틀린가격) if 틀린가격 else "")

        if 결과["checkout"] == "열림":
            잘됨.append("결제창이 실제로 열립니다")
        elif 결과["checkout"] == "안열림":
            문제.append("결제창이 안 열립니다 — Paddle 설정 > Checkout > Default payment link 부터 확인하세요")
        else:
            주의("결제창 열림 여부를 확인하지 못했습니다", str(결과["checkout"]))
    except Exception as e:
        주의("Paddle 검사 중 오류", str(e)[:200])

# ---------------------------------------------------------------- 결과 출력
print("=" * 60)
print("밸류스 아침 점검 결과")
print("=" * 60)
for x in 잘됨:
    print("  OK   " + x)
for x in 경고:
    print("  ...  " + x)
for x in 문제:
    print("  !!   " + x)
print("-" * 60)
print(f"잘됨 {len(잘됨)}건 · 확인필요 {len(경고)}건 · 문제 {len(문제)}건")

리포트 = os.environ.get("GITHUB_STEP_SUMMARY")
if 리포트:
    with open(리포트, "a", encoding="utf-8") as f:
        f.write("## 밸류스 아침 점검\n\n")
        for x in 잘됨:
            f.write(f"- 정상 — {x}\n")
        for x in 경고:
            f.write(f"- 확인 — {x}\n")
        for x in 문제:
            f.write(f"- **문제 — {x}**\n")

with open(os.path.join(here, "점검결과.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(["[문제] " + x for x in 문제] + ["[확인] " + x for x in 경고]) or "이상 없음")

sys.exit(1 if 문제 else 0)
