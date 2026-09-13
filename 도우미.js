/* 밸류스 「곁에 있는 도우미」
 *
 * 2026-09-13 사장님:
 *   "손님이 파일을 받았을때 어려운 점이 있으면 상황에 맞게 답해주는 상담원을
 *    설치해 주세요."
 *
 * 지금까지 손님이 막히면 «무엇이 안 되는지 글로 설명하고 → 메일 보내고 →
 * 하루 기다림» 이었다. 그런데 우리 화면은 이미 알고 있다. 어느 물건인지,
 * 몇 번째 조각에서 끊겼는지. 그래서 이 도우미는 손님에게 묻지 않고
 * «먼저 알아채고 답을 내민다».
 *
 * 지키는 것
 *   · 서버가 없다. 이 파일 하나가 손님 브라우저 안에서만 돈다.
 *   · 지어내지 않는다. 우리가 적어 둔 답만 내놓는다. 모르면 메일로 넘긴다.
 *   · 손님 자료가 밖으로 안 나간다. 실행로그도 브라우저 안에서만 읽는다.
 */
(function () {
  'use strict';
  if (window.__밸류스도우미) return;
  window.__밸류스도우미 = true;

  var 메일 = 'ranger7903@nate.com';

  /* ── 색 (홈페이지와 같은 것) ────────────────────────────── */
  var 색 = {
    크림: '#FFF8F2', 종이: '#F2E9DA', 잉크: '#2D251C', 흐린잉크: '#91826D',
    세이지: '#8CAA7E', 주황: '#E89574', 테두리: '#E6DCCB'
  };

  /* ── 답 꾸러미 ──────────────────────────────────────────
   * 하나하나가 「손님이 겪는 일」이고, 그 자리에서 할 일만 적는다.
   */
  var 답들 = [
    {
      키: '끊김',
      물음: '받다가 끊겼어요 / 「다시 받기」가 떠요',
      답: [
        ['왜 그런가요',
         '회사·학교 인터넷이 큰 파일 받기를 끊는 일이 가장 많습니다. 고장이 아닙니다.'],
        ['이렇게 해 보세요',
         '① 「다시 받기」를 한 번 더 눌러 주세요. 받던 자리에서 이어서 받습니다.\n' +
         '② 그래도 끊기면 집이나 휴대폰 인터넷에서 한 번만 받아 보세요.\n' +
         '③ 받은 파일은 한 번만 받으면 되고, 그다음부터는 인터넷이 필요 없습니다.'],
        ['세 번 해도 안 되면', '아래 「메일로 물어보기」를 눌러 주세요. 파일을 직접 보내 드립니다.']
      ]
    },
    {
      키: '키',
      물음: '정품키가 안 맞다고 나와요',
      답: [
        ['가장 흔한 까닭', '키가 중간에 잘려서 붙여넣어진 경우입니다.'],
        ['이렇게 해 보세요',
         '① 메일을 엽니다.\n' +
         '② `VALUES.` 로 시작하는 글자부터 «맨 끝까지» 통째로 끕니다.\n' +
         '③ 줄바꿈이나 빈칸이 섞이지 않게 붙여넣습니다.\n' +
         '④ 키는 점(.)이 두 개 들어 있는 긴 글자입니다. 두 개가 아니면 잘린 것입니다.']
      ]
    },
    {
      키: '메일',
      물음: '결제했는데 메일이 안 왔어요',
      답: [
        ['먼저 볼 곳', '스팸함(광고 메일함)을 봐 주세요. 처음 오는 메일은 자주 그리로 갑니다.'],
        ['그래도 없으면',
         '결제하실 때 적은 메일 주소가 맞는지 봐 주세요. 한 글자만 달라도 안 갑니다.\n' +
         '아래 「메일로 물어보기」로 알려 주시면 바로 다시 보내 드립니다.']
      ]
    },
    {
      키: '준비중',
      물음: '통역책상이 「준비 중」에서 안 넘어가요',
      답: [
        ['왜 그런가요',
         '처음 한 번은 「번역 두뇌」라는 큰 파일을 받아야 합니다. ' +
         '학교·회사 인터넷이 그 받는 곳을 막아 두면 거기서 멈춥니다.'],
        ['2026년 9월 13일 판부터는',
         '두뇌를 «우리 홈페이지»에서 받습니다. 이 홈페이지가 열렸다면 두뇌도 받아집니다. ' +
         '「내려받기」에서 새 설치파일을 받아 다시 깔아 주세요.'],
        ['우즈벡·베트남·네팔·몽골에서 멈춘 것처럼 보이면',
         '그 네 가지는 «없어도 프로그램이 돕니다». 조금 기다리면 스스로 건너뜁니다. ' +
         '한국어·영어·중국어는 바로 쓰실 수 있습니다.'],
        ['무엇이 문제인지 정확히 보고 싶으면',
         '아래 「기록 파일 읽어 보기」에 `실행로그.txt` 를 끌어다 놓으세요. ' +
         '어디서 멈췄는지 이 자리에서 알려 드립니다. (파일은 밖으로 안 나갑니다)']
      ],
      로그읽기: true
    },
    {
      키: '윈도우막음',
      물음: '윈도우가 「PC를 보호했습니다」라고 막아요',
      답: [
        ['고장이 아닙니다', '윈도우는 처음 보는 프로그램을 모두 이렇게 막습니다.'],
        ['이렇게 하세요',
         '① 그 창에서 「추가 정보」를 누릅니다.\n' +
         '② 아래에 나타나는 「실행」을 누릅니다.\n' +
         '그러면 설치가 이어집니다.']
      ]
    },
    {
      키: '램',
      물음: '내 컴퓨터에서 통역책상이 될까요?',
      답: [
        ['램(기억 공간)을 보는 법',
         '① 키보드에서 Ctrl + Shift + Esc 를 함께 누릅니다.\n' +
         '② 「작업 관리자」가 뜨면 「성능」 → 「메모리」를 누릅니다.\n' +
         '③ 오른쪽 위에 「8.0GB」처럼 적혀 있습니다.'],
        ['숫자에 따라',
         '4GB 미만 — 사지 마세요. 돌지 않습니다.\n' +
         '4GB 이상 — 돌아갑니다.\n' +
         '6GB 이상 — 알아듣는 솜씨가 좋아집니다.\n' +
         '8GB 이상 — 번역이 한 단계 좋아집니다.'],
        ['처음 한 번', '번역 두뇌를 1~3.5GB 받습니다. 그다음부터는 인터넷을 안 씁니다.']
      ]
    },
    {
      키: '두뇌바꾸기',
      물음: '번역 두뇌를 바꾸고 싶어요',
      답: [
        ['어디에 있나요',
         '통역책상을 켜고, 한국어 창 «아래쪽»의 「🧠 번역 두뇌」를 누르세요.'],
        ['고르고 나면',
         '「이걸로 하기」를 누르면 «지금 바로 다시 켤까요?» 하고 물어봅니다. ' +
         '「예」를 누르면 프로그램이 스스로 다시 켜지면서 새 두뇌를 받습니다.'],
        ['어느 것을 고를까요',
         '그냥 「자동」으로 두시는 것이 가장 좋습니다. 컴퓨터 크기에 맞춰 알아서 고릅니다.\n' +
         '「큰 두뇌(시험용)」는 재 보니 우즈베크어·베트남어에서 엉뚱한 문장이 나올 때가 있어, ' +
         '꼭 필요할 때만 고르시길 권합니다.']
      ]
    },
    {
      키: '설치어디',
      물음: '산 프로그램을 어디서 받나요',
      답: [
        ['받는 곳', '홈페이지 위쪽 「🔄 업데이트」(또는 「받는 곳」)를 누르세요.'],
        ['그다음',
         '① 메일로 받은 정품키를 칸에 붙여넣고 「확인」을 누릅니다.\n' +
         '② 사신 물건의 단추가 나타납니다.\n' +
         '③ 단추를 누르면 받기 시작합니다. 다 받으면 저절로 저장됩니다.']
      ]
    }
  ];

  /* ── 실행로그 읽기 ──────────────────────────────────────
   * 브라우저 안에서만 읽는다. 어디로도 보내지 않는다.
   */
  function 로그풀이(글) {
    var 줄 = 글.split(/\r?\n/).filter(function (l) { return l.trim(); });
    var 끝 = 줄.slice(-60).join('\n');
    var 모두 = 글;
    var 결과 = [];

    var 램 = 모두.match(/이 컴퓨터 램 ([\d.]+)GB → 두뇌 「([^」]+)」/);
    if (램) 결과.push(['이 컴퓨터', '램 약 ' + 램[1] + 'GB, 쓰는 두뇌는 「' + 램[2] + '」입니다.']);

    if (/준비 완료/.test(줄.slice(-3).join('\n'))) {
      결과.push(['좋습니다', '마지막 줄이 「준비 완료」입니다. 준비가 끝난 상태입니다. ' +
        '그래도 화면이 이상하면 프로그램을 껐다가 다시 켜 보세요.']);
      return 결과;
    }
    if (/우리 창고에서 받았습니다/.test(끝)) {
      결과.push(['잘 되고 있습니다', '우리 홈페이지 창고에서 받고 있습니다. 그대로 두세요.']);
    }
    if (/우리 창고에 못 닿았습니다/.test(끝)) {
      결과.push(['우리 창고에 못 닿았습니다',
        '이 컴퓨터의 인터넷이 우리 홈페이지까지 막고 있습니다. ' +
        '휴대폰 인터넷으로 한 번만 받아 보시거나, 아래 메일로 알려 주세요. USB로 보내 드립니다.']);
    }
    if (/한 발짝도 못 나갔습니다|안 움직임/.test(끝)) {
      결과.push(['받기가 멈춰 있습니다',
        '인터넷이 그 파일 받는 곳을 막고 있을 가능성이 큽니다.']);
    }
    if (/mkl_malloc|failed to allocate memory|메모리가 부족/.test(모두)) {
      결과.push(['램이 모자랍니다',
        '지금 고른 두뇌가 이 컴퓨터에는 무겁습니다. ' +
        '「🧠 번역 두뇌」에서 한 단계 가벼운 것을 골라 주세요.']);
    }
    if (/준비 못한 언어/.test(끝)) {
      var m = 끝.match(/준비 못한 언어: ([^·\n]+)/);
      결과.push(['일부 말만 준비가 안 됐습니다',
        (m ? m[1].trim() + ' 는 준비하지 못했습니다. ' : '') +
        '나머지 말은 지금 바로 쓰실 수 있습니다. 고장이 아닙니다.']);
    }
    var 마지막단계 = null;
    for (var i = 줄.length - 1; i >= 0 && i > 줄.length - 40; i--) {
      var s = 줄[i].match(/\[(\d)\/4\]/);
      if (s) { 마지막단계 = s[1]; break; }
    }
    if (마지막단계 && !/준비 완료/.test(끝)) {
      var 이름 = { '1': '번역 두뇌 받기', '2': '말 사전 받기',
                   '3': '여러 나라 말을 알아듣는 귀 받기',
                   '4': '나라별 귀 받기' }[마지막단계];
      결과.push(['멈춘 자리', (마지막단계) + '번째 단계 — ' + 이름 + ' 에서 멈췄습니다.']);
      if (마지막단계 === '4') {
        결과.push(['이 경우는 괜찮습니다',
          '나라별 귀(우즈벡·베트남·네팔·몽골)는 없어도 프로그램이 돕니다. ' +
          '조금 기다리면 스스로 건너뜁니다.']);
      }
    }
    var 받음 = 끝.match(/…(\d+)%\s*\((\d+)MB \/ (\d+)MB\)/g);
    if (받음 && 받음.length) {
      결과.push(['받은 양', '마지막으로 적힌 것 : ' + 받음[받음.length - 1].replace('…', '')]);
    }
    if (!결과.length) {
      결과.push(['아직 딱 집어내지 못했습니다',
        '아래 「메일로 물어보기」를 눌러 주세요. 이 기록을 함께 보내 주시면 바로 봐 드립니다.']);
    }
    return 결과;
  }

  /* ── 화면 만들기 ────────────────────────────────────────── */
  var 뿌리 = document.createElement('div');
  뿌리.setAttribute('data-밸류스도우미', '1');
  document.body.appendChild(뿌리);

  var 스타일 = document.createElement('style');
  스타일.textContent = [
    '[data-밸류스도우미] *{box-sizing:border-box;font-family:"Gowun Dodum","Gothic A1","Malgun Gothic",sans-serif}',
    '.vh-단추{position:fixed;right:20px;bottom:20px;z-index:99998;background:' + 색.세이지 + ';',
    ' color:#fff;border:none;border-radius:999px;padding:13px 20px;font-size:15px;font-weight:700;',
    ' box-shadow:0 6px 20px rgba(0,0,0,.18);cursor:pointer;line-height:1.2}',
    '.vh-단추:hover{filter:brightness(1.06)}',
    '.vh-창{position:fixed;right:20px;bottom:20px;z-index:99999;width:min(380px,calc(100vw - 32px));',
    ' max-height:min(620px,calc(100vh - 40px));background:' + 색.크림 + ';border:1.5px solid ' + 색.테두리 + ';',
    ' border-radius:18px;box-shadow:0 14px 44px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden}',
    '.vh-머리{background:' + 색.세이지 + ';color:#fff;padding:14px 16px;display:flex;align-items:center;gap:8px}',
    '.vh-머리 b{font-size:16px;flex:1}',
    '.vh-닫기{background:transparent;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:2px 6px}',
    '.vh-몸{padding:14px 16px;overflow:auto;color:' + 색.잉크 + ';font-size:14.5px;line-height:1.75}',
    '.vh-줄{display:block;width:100%;text-align:left;background:#fff;border:1.5px solid ' + 색.테두리 + ';',
    ' border-radius:12px;padding:11px 13px;margin:0 0 8px;cursor:pointer;font-size:14.5px;color:' + 색.잉크 + '}',
    '.vh-줄:hover{border-color:' + 색.세이지 + ';background:#fff}',
    '.vh-칸{background:#fff;border:1.5px solid ' + 색.테두리 + ';border-radius:12px;padding:12px 13px;margin:0 0 10px}',
    '.vh-칸 h4{margin:0 0 5px;font-size:14.5px;color:' + 색.세이지 + '}',
    '.vh-칸 p{margin:0;white-space:pre-line}',
    '.vh-뒤로{background:transparent;border:none;color:' + 색.흐린잉크 + ';cursor:pointer;padding:0;font-size:14px;margin-bottom:10px}',
    '.vh-끌기{border:2px dashed ' + 색.세이지 + ';border-radius:12px;padding:18px 12px;text-align:center;',
    ' color:' + 색.흐린잉크 + ';margin:0 0 10px;background:#fff}',
    '.vh-끌기.위{background:#F0F5EC;color:' + 색.잉크 + '}',
    '.vh-메일{display:block;text-align:center;background:' + 색.주황 + ';color:#fff;text-decoration:none;',
    ' border-radius:999px;padding:11px;font-weight:700;margin-top:4px}',
    '.vh-잔글{color:' + 색.흐린잉크 + ';font-size:12.5px;margin-top:10px;text-align:center}'
  ].join('\n');
  뿌리.appendChild(스타일);

  var 단추 = document.createElement('button');
  단추.className = 'vh-단추';
  단추.type = 'button';
  단추.textContent = '💬 도움이 필요하세요?';
  뿌리.appendChild(단추);

  var 창 = document.createElement('div');
  창.className = 'vh-창';
  창.style.display = 'none';
  창.innerHTML =
    '<div class="vh-머리"><b>밸류스 도우미</b>' +
    '<button class="vh-닫기" type="button" aria-label="닫기">×</button></div>' +
    '<div class="vh-몸"></div>';
  뿌리.appendChild(창);

  var 몸 = 창.querySelector('.vh-몸');

  function 열기() { 창.style.display = 'flex'; 단추.style.display = 'none'; }
  function 닫기() { 창.style.display = 'none'; 단추.style.display = ''; }
  단추.onclick = function () { 열기(); 첫화면(); };
  창.querySelector('.vh-닫기').onclick = 닫기;

  function 메일단추(제목) {
    var a = document.createElement('a');
    a.className = 'vh-메일';
    a.href = 'mailto:' + 메일 + '?subject=' +
      encodeURIComponent('[밸류스] ' + (제목 || '도와주세요')) +
      '&body=' + encodeURIComponent(
        '어떤 일이 있었는지 적어 주세요.\n\n' +
        '— — — (아래는 그대로 두세요) — — —\n' +
        '페이지 : ' + location.href + '\n');
    a.textContent = '✉ 메일로 물어보기';
    return a;
  }

  function 첫화면() {
    몸.innerHTML = '';
    var p = document.createElement('p');
    p.style.margin = '0 0 12px';
    p.textContent = '어떤 일이 있으셨나요? 가까운 것을 눌러 주세요.';
    몸.appendChild(p);
    답들.forEach(function (항) {
      var b = document.createElement('button');
      b.className = 'vh-줄';
      b.type = 'button';
      b.textContent = 항.물음;
      b.onclick = function () { 답화면(항); };
      몸.appendChild(b);
    });
    몸.appendChild(메일단추('문의'));
    var 잔 = document.createElement('div');
    잔.className = 'vh-잔글';
    잔.textContent = '하루 안에 답장을 드립니다.';
    몸.appendChild(잔);
    몸.scrollTop = 0;
  }

  function 답화면(항) {
    몸.innerHTML = '';
    var 뒤 = document.createElement('button');
    뒤.className = 'vh-뒤로';
    뒤.type = 'button';
    뒤.textContent = '‹ 처음으로';
    뒤.onclick = 첫화면;
    몸.appendChild(뒤);

    var h = document.createElement('h3');
    h.style.cssText = 'margin:0 0 10px;font-size:16px';
    h.textContent = 항.물음;
    몸.appendChild(h);

    항.답.forEach(function (쌍) { 몸.appendChild(칸만들기(쌍[0], 쌍[1])); });
    if (항.로그읽기) 몸.appendChild(로그칸());
    몸.appendChild(메일단추(항.물음));
    몸.scrollTop = 0;
  }

  function 칸만들기(제목, 글) {
    var d = document.createElement('div');
    d.className = 'vh-칸';
    var t = document.createElement('h4'); t.textContent = 제목;
    var p = document.createElement('p'); p.textContent = 글;
    d.appendChild(t); d.appendChild(p);
    return d;
  }

  function 로그칸() {
    var 통 = document.createElement('div');
    var 끌 = document.createElement('div');
    끌.className = 'vh-끌기';
    끌.textContent = '기록 파일(실행로그.txt)을 여기에 끌어다 놓으세요';
    통.appendChild(끌);

    var 잔 = document.createElement('div');
    잔.className = 'vh-잔글';
    잔.textContent = '파일은 이 화면 안에서만 읽습니다. 밖으로 보내지 않습니다.';
    통.appendChild(잔);

    var 고르기 = document.createElement('input');
    고르기.type = 'file';
    고르기.accept = '.txt,text/plain';
    고르기.style.cssText = 'display:block;margin:8px auto 0';
    통.appendChild(고르기);

    function 읽기(파일) {
      if (!파일) return;
      var r = new FileReader();
      r.onload = function () {
        var 결 = 로그풀이(String(r.result || ''));
        var 뒤것 = 통.nextSibling;
        var 자리 = document.createElement('div');
        결.forEach(function (쌍) { 자리.appendChild(칸만들기(쌍[0], 쌍[1])); });
        if (통.__결과) 통.__결과.remove();
        통.__결과 = 자리;
        통.parentNode.insertBefore(자리, 뒤것);
      };
      r.readAsText(파일, 'utf-8');
    }
    고르기.onchange = function () { 읽기(고르기.files && 고르기.files[0]); };
    ['dragenter', 'dragover'].forEach(function (e) {
      끌.addEventListener(e, function (ev) { ev.preventDefault(); 끌.classList.add('위'); });
    });
    ['dragleave', 'drop'].forEach(function (e) {
      끌.addEventListener(e, function (ev) { ev.preventDefault(); 끌.classList.remove('위'); });
    });
    끌.addEventListener('drop', function (ev) {
      var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      읽기(f);
    });
    return 통;
  }

  /* ── 받기 화면에서 «저절로» 뜨기 ───────────────────────────
   * updates.html 은 잘못되면 #err 칸을 보여 준다. 그 순간을 지켜보다가
   * 손님이 묻기 «전에» 맞는 답을 펼친다.
   */
  function 저절로띄우기() {
    var 칸 = document.getElementById('err');
    if (!칸) return;
    var 봤나 = false;
    var 지켜보기 = new MutationObserver(function () {
      if (봤나) return;
      if (칸.style.display && 칸.style.display !== 'none' && 칸.textContent.trim()) {
        봤나 = true;
        var 글 = 칸.textContent;
        var 고를것 = /키|VALUES/.test(글) ? '키'
                   : /끊겼|다시 받기|인터넷/.test(글) ? '끊김'
                   : null;
        var 항 = null;
        답들.forEach(function (a) { if (a.키 === 고를것) 항 = a; });
        열기();
        if (항) 답화면(항); else 첫화면();
      }
    });
    지켜보기.observe(칸, { attributes: true, childList: true, subtree: true,
                        attributeFilter: ['style'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', 저절로띄우기);
  } else {
    저절로띄우기();
  }
})();
