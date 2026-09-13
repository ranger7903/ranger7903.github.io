# -*- coding: utf-8 -*-
"""번역 두뇌를 «우리 창고»에 담을 수 있게 zip 으로 묶는다.

── 왜 ─────────────────────────────────────────────────────────────
2026-09-13 사장님:
  "핫스팟도 고객의 지갑을 여는 행위입니다."
  "왜 자꾸 어려운 일을 벌이시는 거죠?"

맞는 말씀이다. 지금까지 손님이 번역 두뇌를 얻으려면 huggingface.co 라는
«남의 창고»에 가야 했다. 학교·회사가 그곳을 막아 두면 프로그램이 통째로
멈췄고, 그때마다 우리가 내놓은 답은 USB·둘째 컴퓨터·핫스팟 — 전부
손님의 시간과 돈을 쓰게 하는 것이었다.

고칠 것은 «창고 주소» 하나다.
설치파일이 오는 그 자리(우리 깃허브)에서 두뇌도 주면 된다.
거기가 막혔다면 애초에 프로그램도 못 받았을 테니까.

이 파일은 깃허브 일꾼(Actions)이 돌린다. 우리도 사장님도 4GB를 손으로
옮기지 않는다. 남의 창고에서 받아 zip 으로 묶어 우리 창고에 올린다.

zip 안은 «프로그램이 쓰는 폴더 그대로»다. 받아서 풀면 끝이다.
"""
import io
import os
import shutil
import sys
import zipfile

밖 = os.path.abspath('out')
임시 = os.path.abspath('tmp')

# ── 번역 두뇌 : 이미 다 만들어진 것이라 받아서 베끼기만 하면 된다 ──
#    판번호를 못 박아야 나중에 결과가 슬그머니 달라지지 않는다.
번역두뇌 = {
    'mt-ct2':     ('jncraton/m2m100_418M-ct2-int8',
                   '7c1b2620a4e58dacecbd8bf89cfd6da7eb9eb7b0'),
    'mt-ct2-12b': ('jncraton/m2m100_1.2B-ct2-int8',
                   'e50078df6be13a88592b70ea42f4d74c2082e448'),
}

# ── 여러 나라 말을 알아듣는 «공용 귀» : faster-whisper 가 제 방식으로 받는다 ──
공용귀 = {
    'whisper-turbo': 'Kernicterus/whisper-large-v3-turbo-ct2-int8',
    'whisper-small': 'Systran/faster-whisper-small',
}

# ── 나라별 귀 : 이미 만들어진 것 (받아서 베끼기만) ──
#    (저장소이름, 그 안의 하위폴더 또는 None)
만들어진귀 = {
    'whisper-vi-ct2': ('quocphu/PhoWhisper-ct2-FasterWhisper',
                       'PhoWhisper-small-ct2-fasterWhisper'),
}

# ── 나라별 귀 : 날것이라 int8 로 바꿔야 하는 것 ──
바꿀귀 = {
    'whisper-uz-ct2': 'OvozifyLabs/whisper-small-uz-v1',
    'whisper-ne-ct2': 'Dragneel/whisper-small-nepali',
    'whisper-mn-ct2': 'bayartsogt/whisper-small-mn-8',
}

# 귀를 열려면 이 설정 파일들이 같은 폴더에 있어야 한다
곁들이 = ['tokenizer.json', 'preprocessor_config.json', 'vocab.json',
        'merges.txt', 'normalizer.json', 'added_tokens.json',
        'special_tokens_map.json']


def 알림(글):
    print(글, flush=True)


def 도장(폴더):
    with io.open(os.path.join(폴더, '.준비완료'), 'w', encoding='utf-8') as f:
        f.write('ok')


def 묶기(폴더, 이름):
    """폴더를 out/<이름>.zip 으로 묶는다. 안에 폴더 한 겹을 더 두지 않는다."""
    갈곳 = os.path.join(밖, 이름 + '.zip')
    셈 = 0
    # 이미 int8 로 눌린 파일이라 다시 눌러도 안 줄어든다 → STORED 가 빠르다
    with zipfile.ZipFile(갈곳, 'w', zipfile.ZIP_STORED, allowZip64=True) as z:
        for r, _d, fs in os.walk(폴더):
            for n in fs:
                p = os.path.join(r, n)
                z.write(p, os.path.relpath(p, 폴더))
                셈 += 1
    알림('  → %s.zip  (%.1f MB, 파일 %d개)'
       % (이름, os.path.getsize(갈곳) / 1048576.0, 셈))
    shutil.rmtree(폴더, ignore_errors=True)


def 받아베끼기(저장소, 판, 하위폴더, 이름):
    from huggingface_hub import snapshot_download
    알림('· %s  ← %s' % (이름, 저장소))
    더 = {'revision': 판} if 판 else {}
    if 하위폴더:
        더['allow_patterns'] = ['%s/*' % 하위폴더]
    방 = snapshot_download(저장소, **더)
    옛 = os.path.join(방, 하위폴더) if 하위폴더 else 방
    새 = os.path.join(임시, 이름)
    shutil.rmtree(새, ignore_errors=True)
    shutil.copytree(옛, 새, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('.git*', 'README*', '*.md'))
    도장(새)
    묶기(새, 이름)


def 귀받기(저장소, 이름):
    from faster_whisper import WhisperModel
    알림('· %s  ← %s' % (이름, 저장소))
    새 = os.path.join(임시, 이름)
    shutil.rmtree(새, ignore_errors=True)
    os.makedirs(새, exist_ok=True)
    # 한 번 열어 보면 faster-whisper 가 알아서 받아 제 자리에 둔다
    WhisperModel(저장소, device='cpu', compute_type='int8', download_root=새)
    도장(새)
    묶기(새, 이름)


def 귀바꾸기(저장소, 이름):
    from ctranslate2.converters import TransformersConverter
    from huggingface_hub import hf_hub_download
    알림('· %s  ← %s  (int8 로 바꾸는 중)' % (이름, 저장소))
    새 = os.path.join(임시, 이름)
    shutil.rmtree(새, ignore_errors=True)
    TransformersConverter(저장소, load_as_float16=False).convert(
        새, quantization='int8', force=True)
    챙긴것 = 0
    for n in 곁들이:
        try:
            shutil.copy(hf_hub_download(저장소, n), os.path.join(새, n))
            챙긴것 += 1
        except Exception:
            pass
    if not 챙긴것:
        raise RuntimeError('%s : 곁들이 설정 파일을 하나도 못 받았습니다' % 저장소)
    도장(새)
    묶기(새, 이름)


def 목록적기():
    """무엇이 있고 지문이 무엇인지 적어 둔다 (프로그램이 받은 뒤 대조한다)."""
    import hashlib
    import json
    적을것 = {}
    for n in sorted(os.listdir(밖)):
        if not n.endswith('.zip'):
            continue
        p = os.path.join(밖, n)
        h = hashlib.sha256()
        with open(p, 'rb') as f:
            for 덩이 in iter(lambda: f.read(1 << 20), b''):
                h.update(덩이)
        적을것[n[:-4]] = {'파일': n, '크기': os.path.getsize(p),
                        'sha256': h.hexdigest()}
    with io.open(os.path.join(밖, '두뇌목록.json'), 'w', encoding='utf-8') as f:
        json.dump(적을것, f, ensure_ascii=False, indent=1)
    알림('두뇌목록.json 에 %d가지를 적었습니다.' % len(적을것))


if __name__ == '__main__':
    무엇 = sys.argv[1] if len(sys.argv) > 1 else '전부'
    os.makedirs(밖, exist_ok=True)
    os.makedirs(임시, exist_ok=True)

    if 무엇 in ('전부', '번역'):
        for 이름, (저장소, 판) in 번역두뇌.items():
            받아베끼기(저장소, 판, None, 이름)
    if 무엇 in ('전부', '귀'):
        for 이름, 저장소 in 공용귀.items():
            귀받기(저장소, 이름)
        for 이름, (저장소, 하위) in 만들어진귀.items():
            받아베끼기(저장소, None, 하위, 이름)
        for 이름, 저장소 in 바꿀귀.items():
            귀바꾸기(저장소, 이름)

    목록적기()
    for n in sorted(os.listdir(밖)):
        알림('  %s  %.1f MB' % (n, os.path.getsize(os.path.join(밖, n)) / 1048576.0))
