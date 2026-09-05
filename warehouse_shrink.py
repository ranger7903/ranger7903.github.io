# -*- coding: utf-8 -*-
"""
창고 줄이기 — 안전 점검기

하는 일 (파일을 지우지는 않고, '무엇을 남기고 무엇을 버릴지'만 정해서 알려줍니다)
 1) 홈페이지가 실제로 쓰는 조각 목록을 모읍니다.
      - main 가지의 tools.manifest.json  (도구 8개)
      - dist 가지의 download/*.manifest.json  (AI 사무직원)
 2) 그 조각들이 dist 창고에 진짜 있는지, 크기와 지문(sha256)이 맞는지 하나하나 확인합니다.
 3) 조각을 도로 붙였을 때 원래 설치파일과 지문이 같은지까지 확인합니다.
 4) 아무도 안 쓰는 파일 목록을 뽑습니다.

한 군데라도 어긋나면 0이 아닌 값으로 끝납니다 → 워크플로가 거기서 멈추고 창고는 그대로 둡니다.
"""

import argparse
import hashlib
import json
import os
import sys

부분크기 = 1024 * 1024


def 지문(경로):
    h = hashlib.sha256()
    with open(경로, "rb") as f:
        while True:
            덩이 = f.read(부분크기)
            if not 덩이:
                break
            h.update(덩이)
    return h.hexdigest()


def 표읽기(경로):
    with open(경로, encoding="utf-8") as f:
        return json.load(f)


def 모으기(main경로, dist경로):
    """돌려주는 것: (묶음목록, 오류목록)  묶음 = {'이름', '조각들'(dist 안 상대경로), '전체지문', '전체크기'}"""
    묶음들 = []
    오류 = []

    도구표 = os.path.join(main경로, "tools.manifest.json")
    if os.path.exists(도구표):
        표 = 표읽기(도구표)
        for 키, 값 in (표.get("files") or {}).items():
            조각들 = []
            for p in 값.get("parts") or []:
                이름 = p["name"]
                if not 이름.startswith("dist/"):
                    오류.append("tools.manifest.json 의 %s 조각 이름이 이상해요: %s" % (키, 이름))
                    continue
                조각들.append((이름[len("dist/"):], p.get("size"), p.get("sha256")))
            묶음들.append({
                "이름": "도구 " + 키,
                "조각들": 조각들,
                "전체지문": 값.get("sha256"),
                "전체크기": 값.get("totalSize"),
            })
    else:
        오류.append("main 가지에 tools.manifest.json 이 없어요")

    내려받기칸 = os.path.join(dist경로, "download")
    표파일들 = []
    if os.path.isdir(내려받기칸):
        표파일들 = sorted(n for n in os.listdir(내려받기칸) if n.endswith(".manifest.json"))
    if not 표파일들:
        오류.append("dist 가지 download 칸에 manifest 가 하나도 없어요")
    for n in 표파일들:
        표 = 표읽기(os.path.join(내려받기칸, n))
        조각들 = [("download/parts/" + p["name"], p.get("size"), p.get("sha256"))
                for p in (표.get("parts") or [])]
        묶음들.append({
            "이름": "사무직원 " + n,
            "조각들": 조각들,
            "전체지문": 표.get("sha256"),
            "전체크기": 표.get("totalSize"),
        })

    return 묶음들, 오류


def 확인하기(dist경로, 묶음들):
    """조각 하나하나 + 도로 붙인 결과까지 확인. 돌려주는 것: (쓰는파일집합, 오류목록)"""
    쓰는것 = set()
    오류 = []

    for 묶음 in 묶음들:
        if not 묶음["조각들"]:
            오류.append("%s: 조각 목록이 비어 있어요" % 묶음["이름"])
            continue
        h = hashlib.sha256()
        합계 = 0
        성함 = True
        for 상대, 적힌크기, 적힌지문 in 묶음["조각들"]:
            길 = os.path.join(dist경로, 상대)
            if not os.path.exists(길):
                오류.append("%s: 조각이 창고에 없어요 → %s" % (묶음["이름"], 상대))
                성함 = False
                continue
            실제크기 = os.path.getsize(길)
            if 적힌크기 is not None and 실제크기 != 적힌크기:
                오류.append("%s: 조각 크기가 달라요 → %s (적힌 것 %s, 실제 %s)"
                          % (묶음["이름"], 상대, 적힌크기, 실제크기))
                성함 = False
            실제지문 = 지문(길)
            if 적힌지문 and 실제지문 != 적힌지문:
                오류.append("%s: 조각 지문이 달라요 → %s" % (묶음["이름"], 상대))
                성함 = False
            with open(길, "rb") as f:
                while True:
                    덩이 = f.read(부분크기)
                    if not 덩이:
                        break
                    h.update(덩이)
            합계 += 실제크기
            쓰는것.add(상대)

        if not 성함:
            continue
        if 묶음["전체크기"] is not None and 합계 != 묶음["전체크기"]:
            오류.append("%s: 다 붙였더니 크기가 달라요 (적힌 것 %s, 붙인 것 %s)"
                      % (묶음["이름"], 묶음["전체크기"], 합계))
        if 묶음["전체지문"] and h.hexdigest() != 묶음["전체지문"]:
            오류.append("%s: 다 붙였더니 지문이 달라요 — 손님이 받으면 열리지 않아요" % 묶음["이름"])

    return 쓰는것, 오류


def 창고파일들(dist경로):
    모두 = []
    for 뿌리, 칸들, 파일들 in os.walk(dist경로):
        칸들[:] = [c for c in 칸들 if c != ".git"]
        for f in 파일들:
            상대 = os.path.relpath(os.path.join(뿌리, f), dist경로).replace(os.sep, "/")
            모두.append(상대)
    return sorted(모두)


def 사람크기(바이트):
    단위 = ["B", "KB", "MB", "GB"]
    x = float(바이트)
    for u in 단위:
        if x < 1024 or u == "GB":
            return "%.1f%s" % (x, u)
        x /= 1024


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--main", required=True, help="main 가지를 받아 둔 칸")
    ap.add_argument("--dist", required=True, help="dist 창고를 받아 둔 칸")
    ap.add_argument("--buril", default="buril.txt", help="버릴 파일 목록을 적을 곳")
    ap.add_argument("--report", default="", help="사람이 읽을 보고서를 적을 곳")
    a = ap.parse_args()

    묶음들, 오류1 = 모으기(a.main, a.dist)
    쓰는것, 오류2 = 확인하기(a.dist, 묶음들)
    오류 = 오류1 + 오류2

    지켜야할표 = set()
    내려받기칸 = os.path.join(a.dist, "download")
    if os.path.isdir(내려받기칸):
        for n in os.listdir(내려받기칸):
            if n.endswith(".manifest.json"):
                지켜야할표.add("download/" + n)

    남길것 = set(쓰는것) | 지켜야할표
    모두 = 창고파일들(a.dist)
    버릴것 = [f for f in 모두 if f not in 남길것]

    남긴크기 = sum(os.path.getsize(os.path.join(a.dist, f)) for f in 모두 if f in 남길것)
    버릴크기 = sum(os.path.getsize(os.path.join(a.dist, f)) for f in 버릴것)

    줄 = []
    줄.append("창고에 있는 파일: %d개 (%s)" % (len(모두), 사람크기(남긴크기 + 버릴크기)))
    줄.append("홈페이지가 쓰는 묶음: %d개" % len(묶음들))
    for 묶음 in 묶음들:
        줄.append("  · %s — 조각 %d개" % (묶음["이름"], len(묶음["조각들"])))
    줄.append("남길 파일: %d개 (%s)" % (len(남길것 & set(모두)), 사람크기(남긴크기)))
    줄.append("아무도 안 쓰는 파일: %d개 (%s)" % (len(버릴것), 사람크기(버릴크기)))
    for f in 버릴것[:50]:
        줄.append("  - %s" % f)
    if len(버릴것) > 50:
        줄.append("  ... 그리고 %d개 더" % (len(버릴것) - 50))
    if 오류:
        줄.append("")
        줄.append("!! 어긋난 곳 %d군데 — 창고는 그대로 둡니다 !!" % len(오류))
        for e in 오류:
            줄.append("  x %s" % e)
    else:
        줄.append("")
        줄.append("확인 끝 — 손님이 받는 파일은 전부 지문까지 맞습니다.")

    보고 = "\n".join(줄)
    print(보고)
    if a.report:
        with open(a.report, "w", encoding="utf-8") as f:
            f.write(보고 + "\n")

    with open(a.buril, "w", encoding="utf-8") as f:
        for x in 버릴것:
            f.write(x + "\n")

    if 오류:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
