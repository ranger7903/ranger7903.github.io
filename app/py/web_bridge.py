# -*- coding: utf-8 -*-
"""브라우저(Pyodide) 안에서 자료취합기 엔진을 돌리는 다리.
파일은 서버로 가지 않고 브라우저 메모리 안의 가상 폴더에만 잠깐 놓였다가 지워진다."""
import io
import os
import re
import shutil
import sys
import tempfile
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import smart_merge_v2 as sm  # noqa: E402

DEMO_MAX_FILES = 5
DEMO_MAX_ROWS = 300


# ---- PDF: pdfplumber(네이티브 라이브러리 필요)가 브라우저에는 없으므로 pdfminer.six 로 대체 ----
def _pdf_words_pdfminer(path):
    from pdfminer.high_level import extract_pages
    from pdfminer.layout import LTChar, LTTextContainer, LTTextLine, LAParams
    pages = []
    for layout in extract_pages(path, laparams=LAParams(char_margin=1.0, line_margin=0.3, word_margin=0.15)):
        page_h = layout.height
        words = []
        for el in layout:
            if not isinstance(el, LTTextContainer):
                continue
            for line in el:
                if not isinstance(line, LTTextLine):
                    continue
                cur, x0, x1, top = [], None, None, None
                for ch in line:
                    if isinstance(ch, LTChar):
                        c = ch.get_text()
                        if c.isspace():
                            if cur:
                                words.append({"text": "".join(cur), "x0": x0, "x1": x1, "top": top})
                                cur = []
                            continue
                        if not cur:
                            x0, top = ch.x0, page_h - ch.y1
                        cur.append(c)
                        x1 = ch.x1
                if cur:
                    words.append({"text": "".join(cur), "x0": x0, "x1": x1, "top": top})
        pages.append(words)
    return pages


class _FakePage:
    def __init__(self, words):
        self._words = words

    def extract_words(self):
        return self._words


def extract_tables_pdf_web(path):
    tables = []
    for words in _pdf_words_pdfminer(path):
        fb = sm._extract_table_by_position(_FakePage(words), x_gap=12, y_tol=3)
        if fb:
            tables.extend(sm._tidy_table(*fb))
    return tables


sm.EXTRACTORS[".pdf"] = extract_tables_pdf_web


def merge_uploaded(files, out_ext, demo=True):
    """files: [(이름, bytes), ...] -> dict(ok, data(bytes), filename, summary, skipped, flagged, error)"""
    work = tempfile.mkdtemp(prefix="vt_")
    try:
        if demo and len(files) > DEMO_MAX_FILES:
            files = files[:DEMO_MAX_FILES]
        for name, data in files:
            safe = re.sub(r"[\\/]", "_", name)
            with open(os.path.join(work, safe), "wb") as f:
                f.write(bytes(data))
        cols, rows, mappings, skipped = sm.merge_all(work)
        truncated = 0
        if demo and len(rows) > DEMO_MAX_ROWS:
            truncated = len(rows) - DEMO_MAX_ROWS
            rows = rows[:DEMO_MAX_ROWS]
        out = os.path.join(work, "통합결과" + out_ext)
        sm.WRITERS[out_ext](out, cols, rows, mappings, skipped)
        with open(out, "rb") as f:
            data = f.read()
        flagged = [(f, o) for f, m in mappings for o, (c, method, s) in m.items() if method != "사전매칭"]
        return {"ok": True, "data": data, "filename": "통합결과" + out_ext,
                "tables": len(mappings), "rows": len(rows), "cols": len(cols), "truncated": truncated,
                "flagged": len(flagged), "skipped": [list(x) for x in skipped]}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}", "trace": traceback.format_exc()}
    finally:
        shutil.rmtree(work, ignore_errors=True)


def preview_files(names):
    out = []
    for n in names:
        ext = os.path.splitext(n)[1].lower()
        if ext in sm.EXTRACTORS:
            out.append([n, "ok", ""])
        elif ext in sm.UNSUPPORTED_HINT:
            out.append([n, "skip", sm.UNSUPPORTED_HINT[ext]])
        else:
            out.append([n, "skip", "표가 있는 문서가 아니라서 건너뛰어요"])
    return out
