#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
legacy_formats.py — 구버전(바이너리) 문서에서 표를 꺼내는 순수 파이썬 모듈
=====================================================================
외부 라이브러리 없이 (파이썬 기본 모듈만으로) 다음 파일 안의 표를 읽는다.

  * .hwp  — 한글 5.0 (한글 2002~2024 기본 .hwp)  : OLE 컨테이너 + zlib 압축 레코드
  * .xls  — 엑셀 97-2003 (BIFF8) / 엑셀 5·95 (BIFF5·7) : OLE 컨테이너 + BIFF 레코드
  * .doc  — 워드 97-2003                              : OLE 컨테이너 + 조각표(piece table) + PAPX

세 형식 모두 "OLE2 복합 문서(Compound File)"라는 같은 그릇에 담겨 있어서,
그 그릇을 여는 작은 판독기(OleFile)를 하나 만들고 셋이 같이 쓴다.

각 추출 함수는 smart_merge_v2 의 다른 추출기와 똑같이
[(헤더행, [데이터행, ...]), ...] 를 돌려준다.  (셀 값은 문자열/숫자/날짜)

읽을 수 없는 경우(암호 걸린 문서, 배포용 문서, 한글 3.0 등)에는 LegacyFormatError 를
던지고, 그 메시지가 그대로 '처리못한파일' 시트에 안내문으로 들어간다.
"""
import datetime
import io
import re
import struct
import zlib


class LegacyFormatError(Exception):
    """사용자에게 그대로 보여줄 수 있는 한국어 안내문을 담는 예외."""


# ===========================================================================
# 1. OLE2 / CFB (Compound File Binary) 최소 판독기
# ===========================================================================
OLE_SIGNATURE = b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"
ENDOFCHAIN = 0xFFFFFFFE
FREESECT = 0xFFFFFFFF
NOSTREAM = 0xFFFFFFFF


def is_ole_file(path):
    try:
        with open(path, "rb") as f:
            return f.read(8) == OLE_SIGNATURE
    except OSError:
        return False


class OleFile:
    """OLE2 복합 문서에서 스트림을 꺼낸다. (읽기 전용, 필요한 기능만 구현)"""

    def __init__(self, path_or_bytes):
        if isinstance(path_or_bytes, (bytes, bytearray)):
            self.data = bytes(path_or_bytes)
        else:
            with open(path_or_bytes, "rb") as f:
                self.data = f.read()
        d = self.data
        if len(d) < 512 or d[:8] != OLE_SIGNATURE:
            raise LegacyFormatError("OLE 문서 형식이 아닙니다 (파일이 손상되었거나 다른 형식입니다).")
        self.sector_size = 1 << struct.unpack_from("<H", d, 0x1E)[0]
        self.mini_sector_size = 1 << struct.unpack_from("<H", d, 0x20)[0]
        self.num_fat_sectors = struct.unpack_from("<I", d, 0x2C)[0]
        self.first_dir_sector = struct.unpack_from("<I", d, 0x30)[0]
        self.mini_cutoff = struct.unpack_from("<I", d, 0x38)[0]
        self.first_minifat_sector = struct.unpack_from("<I", d, 0x3C)[0]
        self.num_minifat_sectors = struct.unpack_from("<I", d, 0x40)[0]
        self.first_difat_sector = struct.unpack_from("<I", d, 0x44)[0]
        self.num_difat_sectors = struct.unpack_from("<I", d, 0x48)[0]
        if self.sector_size not in (512, 4096):
            raise LegacyFormatError("지원하지 않는 OLE 섹터 크기입니다.")
        self._load_fat()
        self._load_directory()
        self._load_minifat()

    # -- 섹터 접근 ----------------------------------------------------------
    def _sector(self, idx):
        start = (idx + 1) * self.sector_size
        return self.data[start:start + self.sector_size]

    def _load_fat(self):
        d = self.data
        difat = list(struct.unpack_from("<109I", d, 0x4C))
        sect = self.first_difat_sector
        per = self.sector_size // 4 - 1
        guard = 0
        while sect not in (ENDOFCHAIN, FREESECT) and guard < 100000:
            chunk = self._sector(sect)
            entries = struct.unpack("<%dI" % (self.sector_size // 4), chunk)
            difat.extend(entries[:per])
            sect = entries[per]
            guard += 1
        fat = []
        fmt = "<%dI" % (self.sector_size // 4)
        for s in difat[:self.num_fat_sectors]:
            if s in (FREESECT, ENDOFCHAIN):
                continue
            fat.extend(struct.unpack(fmt, self._sector(s)))
        self.fat = fat

    def _chain(self, start, table):
        chain = []
        sect = start
        seen = set()
        while sect not in (ENDOFCHAIN, FREESECT) and sect < len(table):
            if sect in seen:
                break
            seen.add(sect)
            chain.append(sect)
            sect = table[sect]
        return chain

    def _read_chain(self, start, size=None):
        out = bytearray()
        for s in self._chain(start, self.fat):
            out += self._sector(s)
        return bytes(out[:size]) if size is not None else bytes(out)

    def _load_directory(self):
        raw = self._read_chain(self.first_dir_sector)
        self.entries = []
        for off in range(0, len(raw) - 127, 128):
            e = raw[off:off + 128]
            name_len = struct.unpack_from("<H", e, 64)[0]
            name = e[:max(name_len - 2, 0)].decode("utf-16-le", errors="replace") if name_len >= 2 else ""
            etype = e[66]
            left, right, child = struct.unpack_from("<III", e, 68)
            start = struct.unpack_from("<I", e, 116)[0]
            size = struct.unpack_from("<Q", e, 120)[0]
            if self.sector_size == 512:
                size &= 0xFFFFFFFF
            self.entries.append({"name": name, "type": etype, "left": left, "right": right,
                                 "child": child, "start": start, "size": size})
        # 트리를 따라가며 전체 경로 만들기
        self.paths = {}
        if self.entries:
            self._walk(self.entries[0]["child"], "", set())

    def _walk(self, idx, prefix, seen):
        if idx == NOSTREAM or idx >= len(self.entries) or idx in seen:
            return
        seen.add(idx)
        e = self.entries[idx]
        self._walk(e["left"], prefix, seen)
        path = prefix + e["name"]
        if e["type"] == 1:  # storage(폴더)
            self._walk(e["child"], path + "/", seen)
        elif e["type"] == 2:  # stream(파일)
            self.paths[path] = idx
        self._walk(e["right"], prefix, seen)

    def _load_minifat(self):
        self.minifat = []
        if self.num_minifat_sectors and self.first_minifat_sector not in (ENDOFCHAIN, FREESECT):
            raw = self._read_chain(self.first_minifat_sector)
            self.minifat = list(struct.unpack("<%dI" % (len(raw) // 4), raw[:len(raw) // 4 * 4]))
        root = self.entries[0] if self.entries else None
        self.ministream = self._read_chain(root["start"], root["size"]) if root and root["size"] else b""

    # -- 공개 API ------------------------------------------------------------
    def list_streams(self):
        return list(self.paths.keys())

    def exists(self, path):
        return path in self.paths

    def read(self, path):
        if path not in self.paths:
            raise KeyError(path)
        e = self.entries[self.paths[path]]
        if e["size"] < self.mini_cutoff:
            out = bytearray()
            for s in self._chain(e["start"], self.minifat):
                out += self.ministream[s * self.mini_sector_size:(s + 1) * self.mini_sector_size]
            return bytes(out[:e["size"]])
        return self._read_chain(e["start"], e["size"])


# ===========================================================================
# 2. 공통 도우미 — 병합 셀이 있는 표를 빈칸 없는 격자(grid)로 복원
# ===========================================================================
def cells_to_grid(cells, row_cnt=0, col_cnt=0):
    """cells: [(row, col, rowspan, colspan, text), ...] -> [[text,...], ...]
    병합된 영역은 왼쪽 위 셀의 텍스트로 채운다(열 정렬을 지키는 것이 우선)."""
    if not cells:
        return []
    if row_cnt <= 0:
        row_cnt = max(r + max(rs, 1) for r, c, rs, cs, t in cells)
    if col_cnt <= 0:
        col_cnt = max(c + max(cs, 1) for r, c, rs, cs, t in cells)
    grid = [["" for _ in range(col_cnt)] for _ in range(row_cnt)]
    for r0, c0, rs, cs, text in cells:
        for r in range(r0, min(r0 + max(rs, 1), row_cnt)):
            for c in range(c0, min(c0 + max(cs, 1), col_cnt)):
                grid[r][c] = text
    return grid


# ===========================================================================
# 3. 한글 5.0 (.hwp)
# ===========================================================================
HWP_SIGNATURE = b"HWP Document File"
HWPTAG_BEGIN = 0x10
HWPTAG_PARA_HEADER = HWPTAG_BEGIN + 50   # 66
HWPTAG_PARA_TEXT = HWPTAG_BEGIN + 51     # 67
HWPTAG_CTRL_HEADER = HWPTAG_BEGIN + 55   # 71
HWPTAG_LIST_HEADER = HWPTAG_BEGIN + 56   # 72
HWPTAG_TABLE = HWPTAG_BEGIN + 61         # 77
CTRL_ID_TABLE = int.from_bytes(b"tbl ", "big")

# 문단 텍스트 안의 제어 문자: 8글자(16바이트)를 차지하는 것들
_HWP_EXTENDED_CTRL = {1, 2, 3, 11, 12, 14, 15, 16, 17, 18, 21, 22, 23}
_HWP_INLINE_CTRL = {4, 5, 6, 7, 8, 19, 20}


def _hwp_records(data):
    """레코드 스트림 -> [(tag, level, payload), ...]"""
    out = []
    pos = 0
    n = len(data)
    while pos + 4 <= n:
        header = struct.unpack_from("<I", data, pos)[0]
        pos += 4
        tag = header & 0x3FF
        level = (header >> 10) & 0x3FF
        size = (header >> 20) & 0xFFF
        if size == 0xFFF:
            if pos + 4 > n:
                break
            size = struct.unpack_from("<I", data, pos)[0]
            pos += 4
        payload = data[pos:pos + size]
        pos += size
        out.append((tag, level, payload))
    return out


def _hwp_para_text(payload):
    """PARA_TEXT 레코드(UTF-16LE + 제어문자) -> 사람이 읽는 문자열"""
    units = struct.unpack("<%dH" % (len(payload) // 2), payload[:len(payload) // 2 * 2])
    out = []
    i = 0
    n = len(units)
    while i < n:
        c = units[i]
        if c < 32:
            if c in _HWP_EXTENDED_CTRL or c in _HWP_INLINE_CTRL:
                i += 8
                continue
            if c == 9:
                out.append("\t")
            elif c == 10:
                out.append("\n")
            elif c in (24, 25, 26, 27, 28, 29):
                pass  # 하이픈/묶음 빈칸 등: 표시용 기호는 생략
            elif c in (30, 31):
                out.append(" ")
            i += 1
            continue
        # 서로게이트 쌍(이모지 등) 처리
        if 0xD800 <= c <= 0xDBFF and i + 1 < n and 0xDC00 <= units[i + 1] <= 0xDFFF:
            out.append(chr(0x10000 + ((c - 0xD800) << 10) + (units[i + 1] - 0xDC00)))
            i += 2
            continue
        out.append(chr(c))
        i += 1
    return "".join(out)


class _Node:
    __slots__ = ("tag", "level", "data", "children")

    def __init__(self, tag, level, data):
        self.tag, self.level, self.data, self.children = tag, level, data, []


def _hwp_tree(records):
    """레코드들의 level 값을 이용해 부모-자식 트리로 만든다."""
    root = _Node(-1, -1, b"")
    stack = [root]
    for tag, level, data in records:
        node = _Node(tag, level, data)
        while len(stack) > 1 and stack[-1].level >= level:
            stack.pop()
        stack[-1].children.append(node)
        stack.append(node)
    return root


def _hwp_node_text(node):
    """PARA_HEADER 노드 아래의 텍스트를 모은다 (표 안의 표 텍스트는 제외)."""
    parts = []
    for ch in node.children:
        if ch.tag == HWPTAG_PARA_TEXT:
            parts.append(_hwp_para_text(ch.data))
    return "".join(parts)


def _hwp_cell_positions(list_headers, row_cnt, col_cnt):
    """표 하나의 LIST_HEADER(셀) 레코드들에서 (row, col, rowspan, colspan) 목록을 읽는다.
    한글 버전에 따라 셀 정보 앞의 길이가 조금 다르므로(6 또는 8바이트), 표 전체가
    앞뒤가 맞게 읽히는 오프셋을 골라 쓴다 (셀 위치가 서로 겹치지 않고 표 크기 안에 들어와야 함)."""
    best = None
    for off in (6, 8, 4, 10):
        positions = []
        ok = True
        for lh in list_headers:
            data = lh.data
            if off + 8 > len(data):
                ok = False
                break
            col, row, colspan, rowspan = struct.unpack_from("<HHHH", data, off)
            if not (1 <= colspan <= 1024 and 1 <= rowspan <= 4096):
                ok = False
                break
            if row_cnt and row >= row_cnt:
                ok = False
                break
            if col_cnt and col >= col_cnt:
                ok = False
                break
            positions.append((row, col, rowspan, colspan))
        if not ok or not positions:
            continue
        distinct = len(set((r, c) for r, c, rs, cs in positions)) == len(positions)
        if distinct:
            return positions
        if best is None:
            best = positions
    return best


def _hwp_collect_tables(node, tables):
    """트리를 훑으며 표 컨트롤을 찾아 tables 에 (header, rows) 를 추가한다 (중첩 표 포함)."""
    for ch in node.children:
        if ch.tag == HWPTAG_CTRL_HEADER and len(ch.data) >= 4 and struct.unpack_from("<I", ch.data)[0] == CTRL_ID_TABLE:
            tbl = next((c for c in ch.children if c.tag == HWPTAG_TABLE), None)
            row_cnt = col_cnt = 0
            if tbl is not None and len(tbl.data) >= 8:
                row_cnt, col_cnt = struct.unpack_from("<HH", tbl.data, 4)
            cells = []
            list_headers = [c for c in ch.children if c.tag == HWPTAG_LIST_HEADER]
            positions = _hwp_cell_positions(list_headers, row_cnt, col_cnt) or []
            for lh, pos in zip(list_headers, positions):
                row, col, rowspan, colspan = pos
                lines = []
                for para in lh.children:
                    if para.tag == HWPTAG_PARA_HEADER:
                        t = _hwp_node_text(para).strip()
                        if t:
                            lines.append(t)
                        # 셀 안의 표(중첩 표)도 별도 표로 수집
                        _hwp_collect_tables(para, tables)
                cells.append((row, col, rowspan, colspan, "\n".join(lines)))
            grid = cells_to_grid(cells, row_cnt, col_cnt)
            if len(grid) >= 2:
                tables.append((grid[0], grid[1:]))
        else:
            _hwp_collect_tables(ch, tables)


def extract_tables_hwp(path):
    """한글 5.0(.hwp) 파일의 모든 표를 [(header, rows), ...] 로 돌려준다."""
    with open(path, "rb") as f:
        head = f.read(64)
    if head.startswith(b"HWP Document File V"):
        raise LegacyFormatError(
            "아주 오래된 한글 3.0 형식(.hwp)입니다. 한글에서 열어 '다른 이름으로 저장'으로 다시 저장한 뒤 넣어주세요.")
    if not head.startswith(OLE_SIGNATURE):
        raise LegacyFormatError("한글(.hwp) 파일 형식이 아니거나 파일이 손상되었습니다.")
    ole = OleFile(path)
    if not ole.exists("FileHeader"):
        raise LegacyFormatError("한글 문서 헤더(FileHeader)를 찾을 수 없습니다. 한글 5.0 형식이 아닌 것 같습니다.")
    fh = ole.read("FileHeader")
    if not fh.startswith(HWP_SIGNATURE):
        raise LegacyFormatError("한글 문서 서명이 맞지 않습니다. 파일이 손상되었을 수 있습니다.")
    flags = struct.unpack_from("<I", fh, 36)[0] if len(fh) >= 40 else 0
    compressed = bool(flags & 0x1)
    if flags & 0x2:
        raise LegacyFormatError("암호가 걸린 한글 문서입니다. 한글에서 암호를 해제한 뒤(다른 이름으로 저장) 넣어주세요.")
    if flags & 0x4:
        raise LegacyFormatError("배포용(편집 제한) 한글 문서라 내용을 읽을 수 없습니다. 원본 문서를 넣어주세요.")

    sections = sorted(
        [p for p in ole.list_streams() if p.startswith("BodyText/Section")],
        key=lambda p: int(re.sub(r"\D", "", p.split("Section")[-1]) or 0),
    )
    if not sections:
        raise LegacyFormatError("본문(BodyText)을 찾을 수 없습니다.")
    tables = []
    for sec in sections:
        raw = ole.read(sec)
        if compressed:
            try:
                raw = zlib.decompress(raw, -15)
            except zlib.error:
                try:
                    raw = zlib.decompressobj(-15).decompress(raw)
                except zlib.error as e:
                    raise LegacyFormatError(f"본문 압축을 풀지 못했습니다 ({e}).")
        tree = _hwp_tree(_hwp_records(raw))
        _hwp_collect_tables(tree, tables)
    return tables


# ===========================================================================
# 4. 엑셀 97-2003 (.xls, BIFF8) / 엑셀 5·95 (BIFF5·7)
# ===========================================================================
_BIFF_DATE_BUILTIN = {14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47}


def _rk_value(rk):
    """RK 숫자(4바이트 압축 숫자) -> 파이썬 숫자"""
    if rk & 2:  # 30비트 정수
        val = rk >> 2
        if val & 0x20000000:
            val -= 0x40000000
        val = float(val)
    else:       # 64비트 실수의 윗 30비트
        val = struct.unpack("<d", b"\x00\x00\x00\x00" + struct.pack("<I", rk & 0xFFFFFFFC))[0]
    if rk & 1:  # 100으로 나눠야 하는 값
        val /= 100.0
    return val


def _excel_serial_to_datetime(serial, datemode_1904=False):
    try:
        if datemode_1904:
            base = datetime.datetime(1904, 1, 1)
            return base + datetime.timedelta(days=float(serial))
        if serial < 61:  # 1900-02-29 버그 보정
            base = datetime.datetime(1899, 12, 31)
        else:
            base = datetime.datetime(1899, 12, 30)
        return base + datetime.timedelta(days=float(serial))
    except (OverflowError, ValueError):
        return serial


def _fmt_is_date(fmt_str):
    if not fmt_str:
        return False
    s = re.sub(r'"[^"]*"', "", fmt_str)        # 따옴표 안 글자 제거
    s = re.sub(r"\[[^\]]*\]", "", s)           # [$-412] 같은 로케일 태그 제거
    s = s.lower()
    if "#" in s or "0.0" in s:
        return False
    return any(t in s for t in ("yy", "mm", "dd", "hh", "ss", "m/d", "d/m", "년", "월", "일"))


def _number_to_cell(val, is_date, datemode_1904):
    if is_date:
        dt = _excel_serial_to_datetime(val, datemode_1904)
        if isinstance(dt, datetime.datetime):
            if dt.hour == 0 and dt.minute == 0 and dt.second == 0 and float(val).is_integer():
                return dt.date()
            return dt
        return dt
    if isinstance(val, float) and val.is_integer() and abs(val) < 1e15:
        return int(val)
    return val


class _BiffStream:
    def __init__(self, data):
        self.data = data
        self.pos = 0

    def records(self, start=0):
        """(id, payload, offset) 를 차례로 낸다. CONTINUE는 호출자가 처리."""
        d = self.data
        pos = start
        n = len(d)
        while pos + 4 <= n:
            rid, length = struct.unpack_from("<HH", d, pos)
            payload = d[pos + 4:pos + 4 + length]
            yield rid, payload, pos
            pos += 4 + length
            if rid == 0x0A:  # EOF
                return


def _biff8_read_unicode(buf, pos, cch, fmt_len_known=True):
    """BIFF8 유니코드 문자열 하나를 buf[pos:]에서 읽는다 (단일 레코드 안).
    반환: (문자열, 새 pos)"""
    flags = buf[pos]
    pos += 1
    high = flags & 0x01
    ext = flags & 0x04
    rich = flags & 0x08
    crun = 0
    cbext = 0
    if rich:
        crun = struct.unpack_from("<H", buf, pos)[0]
        pos += 2
    if ext:
        cbext = struct.unpack_from("<I", buf, pos)[0]
        pos += 4
    if high:
        s = buf[pos:pos + cch * 2].decode("utf-16-le", errors="replace")
        pos += cch * 2
    else:
        s = buf[pos:pos + cch].decode("latin-1")
        pos += cch
    pos += 4 * crun + cbext
    return s, pos


def _biff8_parse_sst(segments, total_strings):
    """SST + CONTINUE 조각들에서 문자열 목록을 만든다. 문자열이 조각 경계에서 잘리면
    다음 조각 첫 바이트에 새 flags 가 다시 나오는 규칙을 그대로 따라간다."""
    strings = []
    seg_i = 0
    buf = segments[0]
    pos = 8  # cstTotal, cstUnique
    remaining = total_strings

    def next_seg():
        nonlocal seg_i, buf, pos
        seg_i += 1
        if seg_i >= len(segments):
            return False
        buf = segments[seg_i]
        pos = 0
        return True

    while remaining > 0:
        if pos >= len(buf):
            if not next_seg():
                break
            continue
        if pos + 3 > len(buf):
            if not next_seg():
                break
            continue
        cch = struct.unpack_from("<H", buf, pos)[0]
        pos += 2
        flags = buf[pos]
        pos += 1
        high = flags & 0x01
        ext = flags & 0x04
        rich = flags & 0x08
        crun = cbext = 0
        if rich:
            crun = struct.unpack_from("<H", buf, pos)[0]
            pos += 2
        if ext:
            cbext = struct.unpack_from("<I", buf, pos)[0]
            pos += 4
        chars = []
        need = cch
        while need > 0:
            avail_bytes = len(buf) - pos
            if avail_bytes <= 0:
                if not next_seg():
                    break
                # 조각 경계: 새 flags 바이트 (압축 여부가 바뀔 수 있다)
                high = buf[pos] & 0x01
                pos += 1
                continue
            width = 2 if high else 1
            take = min(need, avail_bytes // width)
            if take == 0:
                if not next_seg():
                    break
                high = buf[pos] & 0x01
                pos += 1
                continue
            raw = buf[pos:pos + take * width]
            chars.append(raw.decode("utf-16-le", errors="replace") if high else raw.decode("latin-1"))
            pos += take * width
            need -= take
        # 서식 런 / 확장 정보 건너뛰기 (조각 경계를 넘을 수 있음)
        skip = 4 * crun + cbext
        while skip > 0:
            avail = len(buf) - pos
            if avail >= skip:
                pos += skip
                skip = 0
            else:
                skip -= avail
                if not next_seg():
                    break
        strings.append("".join(chars))
        remaining -= 1
    return strings


def extract_tables_xls(path):
    """엑셀 97-2003(.xls) 파일의 모든 시트를 [(header, rows), ...] 로 돌려준다.
    시트별로 값의 격자를 만든 뒤 smart_merge_v2 의 표 자동 감지(split_grid_into_tables)를
    쓰는 것은 호출 쪽 몫이다 — 여기서는 시트마다 (첫행, 나머지행) 그대로 돌려준다."""
    sheets = extract_grids_xls(path)
    out = []
    for name, grid in sheets:
        if len(grid) >= 1:
            out.append((grid[0], grid[1:]))
    return out


def extract_grids_xls(path):
    """[(시트이름, 격자), ...] — 격자는 [[값,...], ...] (빈 셀은 None)"""
    if not is_ole_file(path):
        # 확장자만 .xls 인 HTML/CSV/xlsx 파일 대비
        with open(path, "rb") as f:
            head = f.read(512)
        if head.startswith(b"PK"):
            raise LegacyFormatError("확장자는 .xls 이지만 실제로는 최신 엑셀(.xlsx) 형식입니다. 확장자를 .xlsx 로 바꿔 넣어주세요.")
        if b"<html" in head.lower() or b"<table" in head.lower():
            raise LegacyFormatError("확장자는 .xls 이지만 실제로는 웹 페이지(HTML) 형식입니다. 엑셀에서 열어 .xlsx 로 다시 저장해주세요.")
        raise LegacyFormatError("엑셀 97-2003(.xls) 형식이 아니거나 파일이 손상되었습니다.")
    ole = OleFile(path)
    stream_name = next((n for n in ("Workbook", "Book") if ole.exists(n)), None)
    if stream_name is None:
        if ole.exists("EncryptedPackage"):
            raise LegacyFormatError("암호가 걸린 엑셀 파일입니다. 암호를 해제한 뒤 넣어주세요.")
        raise LegacyFormatError("엑셀 통합문서(Workbook) 스트림을 찾을 수 없습니다.")
    data = ole.read(stream_name)
    bs = _BiffStream(data)

    # ---- 전역(워크북) 부분 ----
    biff_ver = 8
    codepage = "cp949"
    datemode_1904 = False
    sst = []
    xf_fmt = []          # XF index -> 숫자 서식 index
    formats = {}         # 서식 index -> 서식 문자열
    boundsheets = []     # (offset, name)
    sst_segments = None
    sst_total = 0
    encrypted = False
    for rid, payload, off in bs.records(0):
        if rid == 0x809 and off == 0:
            if len(payload) >= 2:
                v = struct.unpack_from("<H", payload)[0]
                biff_ver = 8 if v >= 0x600 else (5 if v >= 0x500 else 4)
        elif rid == 0x2F:  # FILEPASS
            encrypted = True
        elif rid == 0x42 and len(payload) >= 2:
            cp = struct.unpack_from("<H", payload)[0]
            codepage = {949: "cp949", 1200: "utf-16-le", 1252: "cp1252", 932: "cp932", 936: "gbk", 950: "big5",
                        10000: "mac_roman"}.get(cp, "cp949")
        elif rid == 0x22 and len(payload) >= 2:
            datemode_1904 = struct.unpack_from("<H", payload)[0] == 1
        elif rid == 0x41E and len(payload) >= 3:  # FORMAT
            idx = struct.unpack_from("<H", payload)[0]
            if biff_ver >= 8:
                cch = struct.unpack_from("<H", payload, 2)[0]
                s, _ = _biff8_read_unicode(payload, 4, cch)
            else:
                cch = payload[2]
                s = payload[3:3 + cch].decode(codepage, errors="replace")
            formats[idx] = s
        elif rid == 0xE0 and len(payload) >= 4:  # XF
            xf_fmt.append(struct.unpack_from("<H", payload, 2)[0])
        elif rid == 0x85 and len(payload) >= 6:  # BOUNDSHEET
            pos = struct.unpack_from("<I", payload)[0]
            sheet_type = payload[5]
            if biff_ver >= 8:
                cch = payload[6]
                name, _ = _biff8_read_unicode(payload, 7, cch)
            else:
                cch = payload[6]
                name = payload[7:7 + cch].decode(codepage, errors="replace")
            if sheet_type == 0:  # 워크시트만
                boundsheets.append((pos, name))
        elif rid == 0xFC:  # SST
            sst_total = struct.unpack_from("<I", payload, 4)[0]
            sst_segments = [payload]
        elif rid == 0x3C and sst_segments is not None:  # CONTINUE (SST 바로 뒤)
            sst_segments.append(payload)
        elif rid == 0x0A:  # 전역부 EOF
            break
    if encrypted:
        raise LegacyFormatError("암호가 걸린 엑셀 파일입니다. 암호를 해제한 뒤(다른 이름으로 저장) 넣어주세요.")
    if sst_segments:
        sst = _biff8_parse_sst(sst_segments, sst_total)

    # ---- 시트별 ----
    def is_date_xf(xf_idx):
        if xf_idx < len(xf_fmt):
            fi = xf_fmt[xf_idx]
            if fi in _BIFF_DATE_BUILTIN:
                return True
            return _fmt_is_date(formats.get(fi, ""))
        return False

    results = []
    if not boundsheets and biff_ver < 5:
        boundsheets = [(0, "Sheet1")]
    for sheet_off, sheet_name in boundsheets:
        cells = {}
        merged = []
        pending_string_cell = None
        for rid, payload, off in bs.records(sheet_off):
            if rid == 0x0A and off != sheet_off:
                break
            try:
                if rid == 0xFD and len(payload) >= 10:  # LABELSST
                    r, c, xf, idx = struct.unpack_from("<HHHI", payload)
                    cells[(r, c)] = sst[idx] if idx < len(sst) else ""
                elif rid == 0x204 and len(payload) >= 8:  # LABEL
                    r, c, xf = struct.unpack_from("<HHH", payload)
                    if biff_ver >= 8:
                        cch = struct.unpack_from("<H", payload, 6)[0]
                        s, _ = _biff8_read_unicode(payload, 8, cch)
                    else:
                        cch = struct.unpack_from("<H", payload, 6)[0]
                        s = payload[8:8 + cch].decode(codepage, errors="replace")
                    cells[(r, c)] = s
                elif rid == 0x203 and len(payload) >= 14:  # NUMBER
                    r, c, xf = struct.unpack_from("<HHH", payload)
                    v = struct.unpack_from("<d", payload, 6)[0]
                    cells[(r, c)] = _number_to_cell(v, is_date_xf(xf), datemode_1904)
                elif rid == 0x27E and len(payload) >= 10:  # RK
                    r, c, xf, rk = struct.unpack_from("<HHHI", payload)
                    cells[(r, c)] = _number_to_cell(_rk_value(rk), is_date_xf(xf), datemode_1904)
                elif rid == 0xBD and len(payload) >= 6:  # MULRK
                    r, c0 = struct.unpack_from("<HH", payload)
                    n = (len(payload) - 6) // 6
                    for k in range(n):
                        xf, rk = struct.unpack_from("<HI", payload, 4 + k * 6)
                        cells[(r, c0 + k)] = _number_to_cell(_rk_value(rk), is_date_xf(xf), datemode_1904)
                elif rid == 0x06 and len(payload) >= 14:  # FORMULA (계산된 값만 사용)
                    r, c, xf = struct.unpack_from("<HHH", payload)
                    res = payload[6:14]
                    if res[6:8] == b"\xFF\xFF":
                        kind = res[0]
                        if kind == 0:
                            pending_string_cell = (r, c)
                        elif kind == 1:
                            cells[(r, c)] = bool(res[2])
                        elif kind == 2:
                            cells[(r, c)] = "#ERR"
                        else:
                            cells[(r, c)] = ""
                    else:
                        v = struct.unpack("<d", res)[0]
                        cells[(r, c)] = _number_to_cell(v, is_date_xf(xf), datemode_1904)
                elif rid == 0x207 and pending_string_cell is not None:  # STRING (수식 문자열 결과)
                    if biff_ver >= 8:
                        cch = struct.unpack_from("<H", payload)[0]
                        s, _ = _biff8_read_unicode(payload, 2, cch)
                    else:
                        cch = struct.unpack_from("<H", payload)[0]
                        s = payload[2:2 + cch].decode(codepage, errors="replace")
                    cells[pending_string_cell] = s
                    pending_string_cell = None
                elif rid == 0x205 and len(payload) >= 8:  # BOOLERR
                    r, c, xf, val, is_err = struct.unpack_from("<HHHBB", payload)
                    cells[(r, c)] = ("#ERR" if is_err else bool(val))
                elif rid == 0x7E and len(payload) >= 10:  # RSTRING (BIFF5 서식 문자열)
                    r, c, xf, cch = struct.unpack_from("<HHHH", payload)
                    cells[(r, c)] = payload[8:8 + cch].decode(codepage, errors="replace")
                elif rid == 0xE5 and len(payload) >= 2:  # MERGEDCELLS
                    cnt = struct.unpack_from("<H", payload)[0]
                    for k in range(cnt):
                        if 2 + k * 8 + 8 <= len(payload):
                            merged.append(struct.unpack_from("<HHHH", payload, 2 + k * 8))
            except struct.error:
                continue
        if not cells:
            results.append((sheet_name, []))
            continue
        max_r = max(r for r, c in cells)
        max_c = max(c for r, c in cells)
        grid = [[None] * (max_c + 1) for _ in range(max_r + 1)]
        for (r, c), v in cells.items():
            grid[r][c] = v
        # 병합 셀: 왼쪽 위 값을 영역 전체에 채워 열이 밀리지 않게 한다
        for r1, r2, c1, c2 in merged:
            if r1 <= max_r and c1 <= max_c:
                v = grid[r1][c1]
                for r in range(r1, min(r2, max_r) + 1):
                    for c in range(c1, min(c2, max_c) + 1):
                        if grid[r][c] in (None, ""):
                            grid[r][c] = v
        results.append((sheet_name, grid))
    return results


# ===========================================================================
# 5. 워드 97-2003 (.doc)
# ===========================================================================
def _doc_pieces(word, table):
    """조각표(piece table)를 읽어 [(cp_start, cp_end, fc, compressed), ...] 를 만든다."""
    fc_clx, lcb_clx = struct.unpack_from("<II", word, 0x1A2)
    clx = table[fc_clx:fc_clx + lcb_clx]
    pos = 0
    while pos < len(clx):
        clxt = clx[pos]
        if clxt == 0x01:  # Prc
            cb = struct.unpack_from("<H", clx, pos + 1)[0]
            pos += 3 + cb
        elif clxt == 0x02:  # Pcdt
            lcb = struct.unpack_from("<I", clx, pos + 1)[0]
            plc = clx[pos + 5:pos + 5 + lcb]
            n = (lcb - 4) // 12
            cps = struct.unpack_from("<%dI" % (n + 1), plc, 0)
            pieces = []
            for i in range(n):
                base = 4 * (n + 1) + i * 8
                fc = struct.unpack_from("<I", plc, base + 2)[0]
                compressed = bool(fc & 0x40000000)
                fc &= 0x3FFFFFFF
                if compressed:
                    fc //= 2
                pieces.append((cps[i], cps[i + 1], fc, compressed))
            return pieces
        else:
            break
    raise LegacyFormatError("워드 문서의 조각표(piece table)를 읽지 못했습니다. 문서가 손상되었을 수 있습니다.")


_CP1252_SPECIAL = {0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡",
                   0x88: "ˆ", 0x89: "‰", 0x8A: "Š", 0x8B: "‹", 0x8C: "Œ", 0x91: "‘",
                   0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—",
                   0x98: "˜", 0x99: "™", 0x9A: "š", 0x9B: "›", 0x9C: "œ", 0x9F: "Ÿ"}


def _doc_text_and_fcs(word, pieces, cp_limit):
    """본문 문자열과, 각 문자의 파일 위치(fc) 목록을 함께 만든다."""
    chars = []
    fcs = []
    for cp0, cp1, fc, compressed in pieces:
        cp1 = min(cp1, cp_limit)
        if cp0 >= cp1:
            continue
        n = cp1 - cp0
        if compressed:
            raw = word[fc:fc + n]
            for i, b in enumerate(raw):
                chars.append(_CP1252_SPECIAL.get(b, chr(b)))
                fcs.append(fc + i)
        else:
            raw = word[fc:fc + n * 2]
            s = raw.decode("utf-16-le", errors="replace")
            for i, ch in enumerate(s):
                chars.append(ch)
                fcs.append(fc + i * 2)
    return chars, fcs


def _doc_papx_flags(word, table):
    """PAPX 를 읽어, 문단 끝(fc 범위)마다 (표 안 문단인가, 행 끝 표시인가) 를 알아낸다.
    반환: [(fc_start, fc_end, in_table, is_row_end), ...] (fc 기준 정렬)"""
    fc_bte, lcb_bte = struct.unpack_from("<II", word, 0x102)
    plc = table[fc_bte:fc_bte + lcb_bte]
    if len(plc) < 8:
        return []
    n = (len(plc) - 4) // 8
    fc_array = struct.unpack_from("<%dI" % (n + 1), plc, 0)
    pages = struct.unpack_from("<%dI" % n, plc, 4 * (n + 1))
    out = []
    for pn in pages:
        fkp = word[pn * 512:(pn + 1) * 512]
        if len(fkp) < 512:
            continue
        crun = fkp[511]
        rgfc = struct.unpack_from("<%dI" % (crun + 1), fkp, 0)
        for i in range(crun):
            bx_off = 4 * (crun + 1) + i * 13
            b = fkp[bx_off]
            in_table = row_end = False
            inner_cell = inner_row = False
            if b:
                p = b * 2
                cb = fkp[p]
                if cb == 0:
                    cb = fkp[p + 1] * 2
                    p += 2
                else:
                    cb = cb * 2 - 1
                    p += 1
                grpprl = fkp[p + 2:p + cb]  # istd 2바이트 건너뜀
                q = 0
                while q + 2 <= len(grpprl):
                    sprm = struct.unpack_from("<H", grpprl, q)[0]
                    q += 2
                    spra = (sprm >> 13) & 0x7
                    if spra == 0 or spra == 1:
                        size = 1
                    elif spra in (2, 4, 5):
                        size = 2
                    elif spra == 3:
                        size = 4
                    elif spra == 7:
                        size = 3
                    else:  # 6: 가변 길이
                        if q >= len(grpprl):
                            break
                        if sprm == 0xC615:  # sprmPChgTabs 는 특별 규칙
                            size = grpprl[q] + 1
                            if grpprl[q] == 255:
                                break
                        else:
                            size = grpprl[q] + 1
                    val = grpprl[q:q + size]
                    if sprm == 0x2417 and val and val[0]:   # sprmPFTtp: 행 끝 표시 문단
                        row_end = True
                    elif sprm == 0x2416 and val and val[0]: # sprmPFInTable: 표 안 문단
                        in_table = True
                    elif sprm == 0x244B and val and val[0]:
                        inner_cell = True
                    elif sprm == 0x244C and val and val[0]:
                        inner_row = True
                    q += size
            out.append((rgfc[i], rgfc[i + 1], in_table or inner_cell or row_end, row_end or inner_row))
    out.sort()
    return out


def extract_tables_doc(path):
    """워드 97-2003(.doc) 파일 본문의 모든 표를 [(header, rows), ...] 로 돌려준다."""
    if not is_ole_file(path):
        with open(path, "rb") as f:
            head = f.read(512)
        if head.startswith(b"PK"):
            raise LegacyFormatError("확장자는 .doc 이지만 실제로는 최신 워드(.docx) 형식입니다. 확장자를 .docx 로 바꿔 넣어주세요.")
        if head.startswith(b"{\\rtf"):
            raise LegacyFormatError("서식 있는 텍스트(RTF) 파일입니다. 워드에서 열어 .docx 로 다시 저장해주세요.")
        raise LegacyFormatError("워드 97-2003(.doc) 형식이 아니거나 파일이 손상되었습니다.")
    ole = OleFile(path)
    if not ole.exists("WordDocument"):
        raise LegacyFormatError("워드 문서 본문(WordDocument)을 찾을 수 없습니다.")
    word = ole.read("WordDocument")
    if len(word) < 0x200:
        raise LegacyFormatError("워드 문서가 너무 짧아 읽을 수 없습니다.")
    flags = struct.unpack_from("<H", word, 0x0A)[0]
    if flags & 0x0100:
        raise LegacyFormatError("암호가 걸린 워드 문서입니다. 암호를 해제한 뒤 넣어주세요.")
    table_name = "1Table" if flags & 0x0200 else "0Table"
    if not ole.exists(table_name):
        table_name = "0Table" if ole.exists("0Table") else "1Table"
        if not ole.exists(table_name):
            raise LegacyFormatError("워드 문서의 표 정보 스트림(Table)을 찾을 수 없습니다.")
    table = ole.read(table_name)
    ccp_text = struct.unpack_from("<I", word, 0x4C)[0]
    pieces = _doc_pieces(word, table)
    chars, fcs = _doc_text_and_fcs(word, pieces, ccp_text)
    papx = _doc_papx_flags(word, table)

    # fc -> (in_table, row_end) 를 빠르게 찾기 위한 이진 탐색
    import bisect
    papx_starts = [p[0] for p in papx]

    def para_flags(fc):
        i = bisect.bisect_right(papx_starts, fc) - 1
        if 0 <= i < len(papx) and papx[i][0] <= fc < papx[i][1]:
            return papx[i][2], papx[i][3]
        return False, False

    tables = []
    cur_rows = []
    cur_row = []
    cell_buf = []
    in_table_now = False
    i = 0
    n = len(chars)
    while i < n:
        ch = chars[i]
        if ch == "\x07":
            in_tbl, row_end = para_flags(fcs[i])
            if row_end:
                if cell_buf and any(c.strip() for c in cell_buf):
                    cur_row.append("".join(cell_buf).strip())
                cell_buf = []
                if cur_row:
                    cur_rows.append(cur_row)
                cur_row = []
                in_table_now = True
            else:
                cur_row.append("".join(cell_buf).strip())
                cell_buf = []
                in_table_now = True
        elif ch == "\r":
            in_tbl, row_end = para_flags(fcs[i])
            if in_tbl:
                cell_buf.append("\n")
            else:
                # 표 밖 문단: 진행 중이던 표를 마감
                if cur_rows:
                    tables.append(cur_rows)
                cur_rows, cur_row, cell_buf = [], [], []
                in_table_now = False
        elif ch == "\x0b":          # 워드의 '줄 바꿈'(Shift+Enter)
            cell_buf.append("\n")
        elif ch in ("\x0c", "\x0e"):
            pass
        elif ord(ch) < 32 and ch not in ("\t", "\n"):
            pass
        else:
            cell_buf.append(ch)
        i += 1
    if cur_rows:
        tables.append(cur_rows)

    out = []
    for rows in tables:
        width = max(len(r) for r in rows)
        rows = [r + [""] * (width - len(r)) for r in rows]
        if len(rows) >= 2:
            out.append((rows[0], rows[1:]))
    return out


# ===========================================================================
# 6. 자가 점검 (python legacy_formats.py 파일...)
# ===========================================================================
if __name__ == "__main__":
    import sys
    for p in sys.argv[1:]:
        ext = p.lower().rsplit(".", 1)[-1]
        fn = {"hwp": extract_tables_hwp, "xls": extract_tables_xls, "doc": extract_tables_doc}.get(ext)
        if not fn:
            print(f"{p}: 지원하지 않는 확장자")
            continue
        try:
            tables = fn(p)
            print(f"{p}: 표 {len(tables)}개")
            for h, rows in tables:
                print("  header:", h)
                for r in rows[:5]:
                    print("        ", r)
        except LegacyFormatError as e:
            print(f"{p}: [안내] {e}")
