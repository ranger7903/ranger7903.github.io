/* 밸류스 「상담 도우미」 — 손님이 사기 전에 묻는 것에 답한다.
 *
 * 2026-09-17 사장님:
 *   "홈페이지에 상담하는 봇도 만들어 붙여주시고요."
 *
 * 이미 있던 도우미.js 는 «산 뒤에 막혔을 때»를 돕는다(내려받기 끊김·정품키 등).
 * 이 파일은 그 앞쪽 — «사기 전에 묻는 것»을 맡는다.
 *   어떤 도구가 나한테 맞나 · 얼마인가 · 다달이 내나 · 인터넷 없이 되나 ·
 *   내 파일이 밖으로 나가나 · 환불되나 · 책은 어떤 꼴로 오나 · 영어로도 되나
 *
 * 지키는 것
 *   · 서버가 없다. 이 파일 하나가 손님 브라우저 안에서만 돈다.
 *   · 지어내지 않는다. 우리가 적어 둔 답만 내놓는다. 모르면 편지로 넘긴다.
 *   · 사람인 척하지 않는다. 첫 줄에 「사람이 아니다」라고 밝힌다.
 *   · 값은 prices.json·books.json 에서 «그때그때» 읽는다. 화면에 박아 두면
 *     값을 고쳤을 때 도우미만 옛날 값을 말하게 된다.
 *   · 손님이 친 글은 아무 데도 안 보낸다. 편지 단추를 손님이 직접 누를 때만
 *     손님의 메일 프로그램이 열린다.
 */
(function () {
  'use strict';
  if (window.__밸류스상담) return;
  window.__밸류스상담 = true;

  var 메일 = 'ranger7903@nate.com';
  var 값표 = null, 책표 = null;

  /* ── 값 읽어 오기 (없으면 없는 대로 답한다) ─────────────── */
  function 가져오기(길, 담을곳) {
    try {
      fetch(길, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j) 담을곳(j); })
        .catch(function () { });
    } catch (e) { }
  }
  가져오기('prices.json', function (j) { 값표 = j; });
  가져오기('books.json', function (j) { 책표 = j; });

  function 돈(n) { return Number(n).toLocaleString('ko-KR') + '원'; }

  function 값찾기(키) {
    if (!값표 || !값표['상품'] || !값표['상품'][키]) return null;
    return 값표['상품'][키];
  }

  function 값줄(키) {
    var p = 값찾기(키);
    if (!p) return null;
    if (p['무료']) return p['이름'] + ' — 거저 드립니다';
    return p['이름'] + ' — ' + 돈(p['원']);
  }

  /* ── 답 꾸러미 ─────────────────────────────────────────
   * 각 항목: 키워드(손님이 칠 법한 말) · 물음(단추에 뜨는 말) · 답(함수나 배열)
   * 답 한 줄 = [소제목, 본문] 또는 ['', 본문]
   */
  var 답들 = [
    {
      키: '고르기',
      물음: '어떤 도구가 저한테 맞나요?',
      말: ['추천', '뭐가 좋', '어떤 거', '골라', '맞는', '고르', '어떤걸', '무슨 도구'],
      답: function () {
        return [
          ['먼저 여쭤볼게요', '어떤 일을 하시나요? 아래에서 골라 주세요.'],
          ['', '첫 쪽 가운데에 「어떤 일 하세요?」 칸이 있습니다. ' +
               '거기서 고르시면 그 일에 쓰는 도구만 남습니다.']
        ];
      },
      다음: ['학교', '가게', '사무소', '혼자']
    },
    {
      키: '학교',
      물음: '학교·학원에서 씁니다',
      말: ['학교', '학원', '대학', '교직원', '학생', '명단', '증명서', '출결'],
      답: function () {
        return [
          ['이 세 가지를 제일 많이 쓰십니다', ''],
          ['① 스마트 자료취합기', '여러 사람이 제각각 보낸 엑셀·한글·워드 표를 하나로 합쳐 줍니다. ' + (값줄('merger') || '')],
          ['② 스마트 서식채우기', '명단 한 줄씩 넣어 증명서·확인서를 한꺼번에 만듭니다. ' + (값줄('formfiller') || '')],
          ['③ 스마트 명단대조기', '명단 두 개를 맞춰 보고 누가 빠졌는지 알려 줍니다. ' + (값줄('listcompare') || '')],
          ['', '첫 쪽에서 「🏫 학교 · 학원」을 누르시면 이 도구들만 보입니다.']
        ];
      }
    },
    {
      키: '가게',
      물음: '가게·공방에서 씁니다',
      말: ['가게', '공방', '손님', '예약', '계산', '영수증', '매장'],
      답: function () {
        return [
          ['가게에는 이 두 가지', ''],
          ['① 밸류스 예약수첩', '예약을 적고, 시간이 겹치는지 알려 주고, 안 오신 분을 기억합니다. ' + (값줄('booking') || '')],
          ['② 밸류스 계산대', '판 것을 적고 영수증을 뽑습니다. ' + (값줄('counter') || '')],
          ['', '첫 쪽에서 「🏪 가게 · 공방」을 누르시면 이것만 보입니다.']
        ];
      }
    },
    {
      키: '사무소',
      물음: '사무소·회계 일을 합니다',
      말: ['사무', '회계', '세무', '기한', '보고서', '표'],
      답: function () {
        return [
          ['사무 일에는', ''],
          ['① 스마트 자료취합기', '흩어진 표를 하나로. ' + (값줄('merger') || '')],
          ['② PDF 반짇고리', 'PDF 합치고 나누고 돌리고. 거저 드립니다.'],
          ['③ AI 사무직원', '사람이 시키면 스스로 판단해 사무 일을 끝까지 하고 보고합니다. ' +
                            '다달이 내는 것이라 값이 큽니다. 첫 쪽에서 구경해 보세요.'],
          ['', '첫 쪽에서 「🏢 사무소 · 회계」를 누르시면 이것만 보입니다.']
        ];
      }
    },
    {
      키: '혼자',
      물음: '혼자 일합니다',
      말: ['혼자', '1인', '프리랜서', '집중', '정리'],
      답: function () {
        return [
          ['혼자 일하시는 분들이 많이 쓰시는 것', ''],
          ['① 빠른입력기', '자주 치는 문장을 짧은 말로 불러옵니다. ' + (값줄('quick') || '')],
          ['② 폴더지킴이', '어질러진 폴더를 규칙대로 정리합니다. 거저 드립니다.'],
          ['③ 책상 위 정원', '집중한 시간만큼 화면 속 정원이 자랍니다. ' + (값줄('garden') || '')],
          ['④ 마음 서랍', '하루 한 문장 따라 쓰기. ' + (값줄('handwrite') || '')]
        ];
      }
    },
    {
      키: '값',
      물음: '얼마인가요?',
      말: ['얼마', '값이', '값은', '값을', '값과', '가격', '비용', '돈이', '가격표', '몇원', '금액'],
      답: function () {
        if (!값표) return [['', '값표를 아직 못 읽었습니다. 첫 쪽 도구 선반에 값이 적혀 있습니다.']];
        var 줄 = [['한 번만 내면 평생 쓰십니다', '']];
        var ㅅ = 값표['상품'];
        var 판것 = [], 거저 = [], 다달 = [];
        for (var k in ㅅ) {
          if (!Object.prototype.hasOwnProperty.call(ㅅ, k)) continue;
          if (ㅅ[k]['무료']) { 거저.push(ㅅ[k]['이름']); continue; }
          // 🚨 다달이 내는 것은 «따로» 적는다. 한 줄에 섞으면 손님이
          //    「한 번만 내면 평생」인 줄 알고 산다. (2026-09-17 점검)
          if (ㅅ[k]['결제방식'] === '매달' || /사무직원/.test(ㅅ[k]['이름']))
            다달.push([ㅅ[k]['이름'], 돈(ㅅ[k]['원']) + ' / 달']);
          else 판것.push([ㅅ[k]['이름'], 돈(ㅅ[k]['원'])]);
        }
        판것.sort(function (a, b) {
          return parseInt(String(a[1]).replace(/\D/g, ''), 10) -
                 parseInt(String(b[1]).replace(/\D/g, ''), 10);
        });
        for (var i = 0; i < 판것.length; i++) 줄.push([판것[i][0], 판것[i][1]]);
        if (다달.length) {
          줄.push(['여기부터는 «다달이» 내는 것입니다', '']);
          for (var d = 0; d < 다달.length; d++) 줄.push([다달[d][0], 다달[d][1]]);
        }
        if (거저.length) 줄.push(['거저 드리는 것', 거저.join(' · ')]);
        줄.push(['책은 따로 있습니다', '전자책 열세 권은 책방에 있습니다. 「책은 어떤 꼴로 오나요?」를 눌러 보세요.']);
        return 줄;
      }
    },
    {
      키: '구독',
      물음: '다달이 내야 하나요?',
      말: ['구독', '다달', '매달', '월정액', '정기', '평생', '한번만'],
      답: [
        ['낱개 도구는 다달이 내는 것이 없습니다',
         '한 번 사시면 그 도구는 평생 사장님 것입니다. 회원가입도 없습니다.'],
        ['딱 하나 예외',
         '「AI 사무직원」만 다달이 내는 것입니다. 이것은 상품 칸에 그렇게 적어 두었습니다.'],
        ['업데이트도 거저',
         '고쳐서 새 판이 나오면 추가 비용 없이 받으실 수 있습니다.']
      ]
    },
    {
      키: '인터넷',
      물음: '인터넷 없이도 되나요? 제 파일이 밖으로 나가나요?',
      말: ['인터넷', '오프라인', '네트워크', '서버', '보안', '개인정보', '유출', '나가', '안전'],
      답: [
        ['파일은 컴퓨터 밖으로 안 나갑니다',
         '도구들은 사장님 컴퓨터 안에서만 일합니다. 파일을 보낼 곳을 아예 만들지 않았습니다.'],
        ['인터넷이 없어도 됩니다',
         '설치한 뒤에는 인터넷이 끊겨 있어도 그대로 돌아갑니다.'],
        ['한 가지만 다릅니다',
         '「AI 사무직원」은 AI에게 물어보는 것이라 인터넷이 필요합니다. ' +
         '통역책상도 처음 한 번은 번역 두뇌를 받아야 하고, 그 뒤로는 인터넷 없이 됩니다.']
      ]
    },
    {
      키: '사는법',
      물음: '어떻게 사나요?',
      말: ['사는법', '어떻게 사', '어떻게 삽', '구매', '결제', '카드로', '주문', '결제창'],
      답: [
        ['① 도구를 고릅니다', '첫 쪽 도구 선반에서 「결제하기」를 누르시면 결제창이 열립니다.'],
        ['② 카드로 냅니다', '해외 결제가 되는 카드면 됩니다. 해외 결제가 막혀 있는 카드는 안 될 수 있습니다.'],
        ['③ 정품 이름표가 편지로 옵니다',
         '결제가 끝나면 몇 초 안에 정품 이름표(열쇠)가 메일로 갑니다. 사람이 손으로 보내는 게 아닙니다.'],
        ['④ 그 열쇠로 받습니다',
         '「🔄 업데이트」 쪽에 열쇠를 붙여 넣으시면 그 자리에서 내려받아집니다.'],
        ['몇 분 지나도 메일이 안 오면', '저희에게 편지 주세요. 직접 보내 드립니다.']
      ]
    },
    {
      키: '환불',
      물음: '환불되나요?',
      말: ['환불', '취소', '반품', '물러'],
      답: [
        ['됩니다 — 다만 조건이 있습니다',
         '산 지 7일 안이고 정품 이름표를 아직 안 쓰셨으면 전액 돌려 드립니다. ' +
         '자세한 것은 「환불정책」 쪽에 적어 두었습니다.'],
        ['그 전에',
         '무료 도구를 먼저 써 보시면 저희 도구가 어떤 느낌인지 아실 수 있습니다. ' +
         '책은 맛보기를 거저 드리니 먼저 읽어 보시고 정하세요.']
      ],
      링크: [['환불정책 보기', 'refund.html']]
    },
    {
      키: '책',
      물음: '책은 어떤 꼴로 오나요?',
      말: ['책은', '책을', '책이', '책도', '책만', '책값', '전자책', 'epub', 'pdf', '책방', '읽을', '읽어', '소설', '도서'],
      답: function () {
        var 줄 = [
          ['한 권 값에 두 가지 꼴을 함께 드립니다', ''],
          ['PDF', '윈도우·맥·아이폰·안드로이드 어디서나 그냥 열립니다. 따로 깔 것이 없습니다. 인쇄해도 책처럼 나옵니다.'],
          ['EPUB', '휴대폰·태블릿의 책 읽는 앱에서 열립니다. 글자 크기를 키우거나 밤에 읽기 좋습니다. ' +
                   '윈도우에서는 읽는 프로그램을 따로 깔아야 합니다.'],
          ['맛보기는 거저', '회원가입도 편지 주소도 안 묻습니다. 단추를 누르면 바로 받아집니다.']
        ];
        if (책표 && 책표['묶음'] && 책표['책']) {
          var ㅁ = [];
          for (var i = 0; i < 책표['묶음'].length; i++)
            ㅁ.push(책표['묶음'][i]['이름'] + ' ' + 돈(책표['묶음'][i]['원']));
          줄.push(['값', '낱권 ' + 돈(책표['책'][0]['원']) + ' · ' + ㅁ.join(' · ')]);
        }
        return 줄;
      },
      링크: [['책방 가기', '책방.html']]
    },
    {
      키: '영어',
      물음: '영어로도 쓸 수 있나요?',
      말: ['영어', 'english', '외국', '해외', '번역', '언어'],
      답: [
        ['됩니다',
         '도구들은 컴퓨터 언어가 한국어면 한국어로, 그 밖이면 영어로 뜹니다.'],
        ['직접 바꾸실 수도 있습니다',
         '창 안에 「한국어 / English」 단추가 있습니다. 한 번 고르시면 껐다 켜도 그대로 있습니다.'],
        ['책은 한국어입니다', '책 열세 권은 아직 한국어로만 있습니다.']
      ],
      링크: [['English page', 'en.html']]
    },
    {
      키: '무료',
      물음: '거저 써 볼 수 있는 게 있나요?',
      말: ['무료', '공짜', '거저', '체험', '써보', '써 보', '시험', '맛보기'],
      답: function () {
        var 거저 = [];
        if (값표 && 값표['상품']) {
          for (var k in 값표['상품'])
            if (Object.prototype.hasOwnProperty.call(값표['상품'], k) && 값표['상품'][k]['무료'])
              거저.push(값표['상품'][k]['이름']);
        }
        return [
          ['거저 드리는 도구', 거저.length ? 거저.join(' · ') : '첫 쪽 「🎁 무료 나눔」 칸을 봐 주세요.'],
          ['폰 앱도 거저', '암기 수첩 · 오늘의 속담 · 마음 서랍 · 화장대 수첩 — 깔 것 없이 웹으로 바로 씁니다.'],
          ['책 맛보기', '열세 권 모두 앞부분을 거저 드립니다.'],
          ['파는 도구도', '거의 다 체험으로 먼저 써 보실 수 있습니다.']
        ];
      },
      링크: [['무료 나눔 보기', '#free'], ['책방 맛보기', '책방.html']]
    },
    {
      키: '설치',
      물음: '설치는 어렵지 않나요? 어디에 깔리나요?',
      말: ['설치', '깔', '어디에', '용량', '윈도우', '맥', '지우'],
      답: [
        ['윈도우 컴퓨터에서 씁니다', '받은 파일을 두 번 누르시면 깔립니다.'],
        ['윈도우가 막으면', '「추가 정보」 → 「실행」을 누르시면 됩니다. ' +
                          '저희가 작은 가게라 마이크로소프트에 돈을 내고 도장을 받지 않아서 그렇습니다. 고장이 아닙니다.'],
        ['지우기도 쉽습니다', '프로그램마다 안에 「🗑 지우기」 단추가 있습니다. 눌러서 지우시면 흔적 없이 깨끗하게 지워집니다.']
      ]
    },
    {
      키: '고장',
      물음: '샀는데 뭔가 안 돼요',
      말: ['안돼', '안 돼', '고장', '오류', '에러', '끊', '정품키', '열쇠', '안열', '실행'],
      답: [
        ['도와드릴 자리가 따로 있습니다',
         '「🔄 업데이트」 쪽으로 가시면, 화면 오른쪽 아래에 도우미가 있습니다. ' +
         '내려받기가 끊겼을 때 · 정품키가 안 맞을 때 · 결제했는데 메일이 안 왔을 때 ' +
         '같은 것을 하나씩 짚어 드립니다.'],
        ['그래도 안 되면', '아래 「편지 쓰기」를 눌러 주세요. 만든 사람이 직접 답합니다.']
      ],
      링크: [['업데이트 쪽으로', 'updates.html']]
    },
    {
      키: '계좌',
      물음: '카드 말고 계좌이체도 되나요?',
      말: ['계좌이체', '계좌', '무통장', '입금', '송금', '현금영수증', '세금계산서'],
      답: [
        ['됩니다', '카드가 어려우시면 편지를 주세요. 값 치르는 방법을 답장으로 알려 드립니다.'],
        ['책은 지금 이 방법만 있습니다',
         '책방의 「주문하기」를 누르시면 편지 창이 열립니다. 보내 주시면 답장으로 알려 드립니다.'],
        ['영수증',
         '카드로 사시면 영수증은 결제를 맡은 곳(Paddle)에서 자동으로 메일로 갑니다. ' +
         '따로 필요한 서류가 있으시면 편지로 말씀해 주세요.']
      ],
      링크: [['편지 쓰기', 'mailto:ranger7903@nate.com?subject=%EA%B3%84%EC%A2%8C%EC%9D%B4%EC%B2%B4%20%EB%AC%B8%EC%9D%98']]
    },
    {
      키: '사업자',
      물음: '사업자 정보를 알고 싶어요',
      말: ['사업자', '사업자등록', '상호', '대표자', '주소가', '어디 있', '통신판매', '전화번호'],
      답: [
        ['사업자정보 쪽에 다 적어 두었습니다',
         '상호·대표자·주소·사업자등록번호가 그 쪽에 있습니다.'],
        ['편지가 제일 빠릅니다', 'ranger7903@nate.com 으로 보내시면 만든 사람이 직접 답합니다.']
      ],
      링크: [['사업자정보 보기', '사업자정보.html']]
    },
    {
      키: '누구',
      물음: '누가 만드나요?',
      말: ['누가', '누구', '회사', '만든', '소개', '어디'],
      답: [
        ['경주에서 혼자 만듭니다',
         '사무실에서 손이 아팠던 순간을 모아 도구를 하나씩 만들어 파는 작은 가게입니다.'],
        ['광고가 없습니다', '광고도, 남에게 파는 자료도 없습니다.'],
        ['만든 사람이 답합니다', '편지를 보내시면 만든 사람이 직접 읽고 답합니다.']
      ],
      링크: [['만들면서 생각한 것들', '소식.html']]
    }
  ];

  var 첫단추 = ['고르기', '값', '구독', '인터넷', '사는법', '책', '무료', '환불', '계좌'];

  /* ── 손님이 친 글에서 알맞은 답 찾기 ───────────────────── */
  function 찾기(글) {
    var t = String(글 || '').toLowerCase().replace(/\s+/g, '');
    if (!t) return null;
    // 🚨 「책 얼마예요」 처럼 «책 이야기 + 값 이야기»가 섞이면 반드시 책이 이긴다.
    //    (2026-09-17 점검에서 이 물음에 프로그램 값표가 나왔다 — 책방에 온
    //     손님이 첫 답으로 「AI 사무직원 500,000원」을 보게 되어 있었다.)
    if (/책|전자책|도서|epub|pdf|권/.test(t)) {
      var ㅊ = 찾기키('책');
      if (ㅊ) return ㅊ;
    }
    var 제일 = null, 제일점 = 0;
    for (var i = 0; i < 답들.length; i++) {
      var a = 답들[i], 점 = 0;
      var 말들 = (a.말 || []).concat([a.물음]);
      for (var j = 0; j < 말들.length; j++) {
        var m = String(말들[j]).toLowerCase().replace(/\s+/g, '');
        if (m && t.indexOf(m) >= 0) 점 += m.length;
      }
      if (점 > 제일점) { 제일점 = 점; 제일 = a; }
    }
    return 제일점 >= 2 ? 제일 : null;
  }

  function 찾기키(키) {
    for (var i = 0; i < 답들.length; i++) if (답들[i].키 === 키) return 답들[i];
    return null;
  }

  /* ── 화면 ───────────────────────────────────────────── */
  var 꼴 = [
    '.vt상담단추{position:fixed;right:18px;bottom:18px;z-index:9998;',
    '  background:#D97757;color:#FFF8F2;border:0;border-radius:999px;',
    '  padding:13px 20px;font:700 15px/1 "Gowun Dodum","Malgun Gothic",sans-serif;',
    '  box-shadow:0 8px 26px -10px rgba(80,60,30,.7);cursor:pointer}',
    '.vt상담단추:hover{filter:brightness(1.06)}',
    '.vt상담창{position:fixed;right:18px;bottom:18px;z-index:9999;width:min(370px,calc(100vw - 28px));',
    '  max-height:min(560px,calc(100vh - 36px));display:none;flex-direction:column;',
    '  background:#FFF8F2;color:#2D251C;border:1px solid #E6DCCB;border-radius:20px;overflow:hidden;',
    '  box-shadow:0 18px 50px -18px rgba(80,60,30,.6);',
    '  font:15px/1.75 "Gowun Dodum","Malgun Gothic",sans-serif}',
    '.vt상담창.열림{display:flex}',
    '.vt머리{background:#D97757;color:#FFF8F2;padding:13px 16px;display:flex;',
    '  align-items:flex-start;justify-content:space-between;gap:10px}',
    '.vt머리 b{font-size:15.5px;display:block}',
    '.vt머리 span{font-size:12px;opacity:.92;display:block;margin-top:2px;line-height:1.5}',
    '.vt닫기{background:transparent;border:0;color:#FFF8F2;font-size:20px;line-height:1;',
    '  cursor:pointer;padding:0 2px;flex:0 0 auto}',
    '.vt몸{padding:14px 16px;overflow-y:auto;flex:1 1 auto}',
    '.vt말{margin:0 0 12px}',
    '.vt말.나{text-align:right}',
    '.vt말.나 i{display:inline-block;background:#F2E9DA;border-radius:14px 14px 4px 14px;',
    '  padding:7px 12px;font-style:normal;max-width:85%;text-align:left}',
    '.vt답{background:#fff;border:1px solid #EFE6D6;border-radius:14px 14px 14px 4px;padding:11px 13px}',
    '.vt답 h4{margin:0 0 3px;font-size:14px;color:#D97757;font-weight:700}',
    '.vt답 p{margin:0 0 9px;font-size:14px;color:#4B3F31}',
    '.vt답 p:last-child{margin-bottom:0}',
    '.vt칩들{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px}',
    '.vt칩{background:#fff;border:1px solid #E6DCCB;border-radius:999px;padding:7px 13px;',
    '  font:13px/1.4 inherit;color:#4B3F31;cursor:pointer;text-decoration:none;display:inline-block}',
    '.vt칩:hover{border-color:#D97757;color:#D97757}',
    '.vt발{border-top:1px solid #EFE6D6;padding:10px 12px;display:flex;gap:7px;background:#FFFDF8}',
    '.vt발 input{flex:1 1 auto;min-width:0;border:1px solid #E6DCCB;border-radius:999px;',
    '  padding:9px 14px;font:14px inherit;color:#2D251C;background:#fff}',
    '.vt발 button{flex:0 0 auto;background:#D97757;color:#FFF8F2;border:0;border-radius:999px;',
    '  padding:9px 15px;font:700 14px inherit;cursor:pointer}',
    '@media (prefers-color-scheme:dark){',
    ' .vt상담창{background:#241E17;color:#F2E9DA;border-color:#40342A}',
    ' .vt답{background:#1C1712;border-color:#3A3128}',
    ' .vt답 p{color:#D8CCB8}',
    ' .vt말.나 i{background:#33291F}',
    ' .vt칩{background:#1C1712;border-color:#3A3128;color:#D8CCB8}',
    ' .vt발{background:#1C1712;border-color:#3A3128}',
    ' .vt발 input{background:#241E17;border-color:#3A3128;color:#F2E9DA}}'
  ].join('\n');

  var 창, 몸, 칸;

  function 만들기() {
    var st = document.createElement('style');
    st.textContent = 꼴;
    document.head.appendChild(st);

    var 단추 = document.createElement('button');
    단추.type = 'button';
    단추.className = 'vt상담단추';
    단추.textContent = '💬 물어보기';
    단추.setAttribute('aria-label', '상담 도우미 열기');
    document.body.appendChild(단추);

    창 = document.createElement('div');
    창.className = 'vt상담창';
    창.setAttribute('role', 'dialog');
    창.setAttribute('aria-label', '밸류스 상담 도우미');
    창.innerHTML =
      '<div class="vt머리"><div><b>밸류스 상담 도우미</b>' +
      '<span>사람이 아니라, 미리 적어 둔 답에서 찾아 드립니다.<br>' +
      '못 찾으면 만든 사람에게 편지를 보내실 수 있어요.</span></div>' +
      '<button type="button" class="vt닫기" aria-label="닫기">×</button></div>' +
      '<div class="vt몸"></div>' +
      '<div class="vt발"><input type="text" placeholder="궁금한 것을 적어 주세요" ' +
      'aria-label="궁금한 것"><button type="button">묻기</button></div>';
    document.body.appendChild(창);

    몸 = 창.querySelector('.vt몸');
    칸 = 창.querySelector('input');

    단추.addEventListener('click', function () { 열기(단추); });
    창.querySelector('.vt닫기').addEventListener('click', function () { 닫기(단추); });
    창.querySelector('.vt발 button').addEventListener('click', 묻기);
    칸.addEventListener('keydown', function (e) { if (e.key === 'Enter') 묻기(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && 창.classList.contains('열림')) 닫기(단추);
    });
  }

  function 열기(단추) {
    창.classList.add('열림');
    단추.style.display = 'none';
    if (!몸.childNodes.length) 첫인사();
    try { 칸.focus(); } catch (e) { }
  }
  function 닫기(단추) {
    창.classList.remove('열림');
    단추.style.display = '';
    try { 단추.focus(); } catch (e) { }
  }

  function 붙이기(el) { 몸.appendChild(el); 몸.scrollTop = 몸.scrollHeight; }

  function 답그리기(줄들, 링크, 다음) {
    var d = document.createElement('div');
    d.className = 'vt말';
    var 속 = document.createElement('div');
    속.className = 'vt답';
    for (var i = 0; i < 줄들.length; i++) {
      var 머리 = 줄들[i][0], 본문 = 줄들[i][1];
      if (머리) { var h = document.createElement('h4'); h.textContent = 머리; 속.appendChild(h); }
      if (본문) { var p = document.createElement('p'); p.textContent = 본문; 속.appendChild(p); }
    }
    d.appendChild(속);

    var 칩들 = document.createElement('div');
    칩들.className = 'vt칩들';
    var 있음 = false;
    if (링크) {
      for (var j = 0; j < 링크.length; j++) {
        var a = document.createElement('a');
        a.className = 'vt칩'; a.href = 링크[j][1]; a.textContent = '→ ' + 링크[j][0];
        칩들.appendChild(a); 있음 = true;
      }
    }
    var 보일 = 다음 && 다음.length ? 다음 : 첫단추;
    for (var k = 0; k < 보일.length; k++) {
      var t = 찾기키(보일[k]);
      if (!t) continue;
      칩들.appendChild(칩만들기(t)); 있음 = true;
    }
    칩들.appendChild(편지칩());
    if (있음) d.appendChild(칩들);
    붙이기(d);
  }

  function 칩만들기(항목) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'vt칩'; b.textContent = 항목.물음;
    b.addEventListener('click', function () { 내말(항목.물음); 답하기(항목); });
    return b;
  }

  function 편지칩() {
    var a = document.createElement('a');
    a.className = 'vt칩';
    a.href = 'mailto:' + 메일 + '?subject=' + encodeURIComponent('밸류스에 물어봅니다');
    a.textContent = '✉ 편지 쓰기';
    return a;
  }

  function 내말(글) {
    var d = document.createElement('div');
    d.className = 'vt말 나';
    var i = document.createElement('i');
    i.textContent = 글;
    d.appendChild(i);
    붙이기(d);
  }

  function 답하기(항목) {
    var 줄 = typeof 항목.답 === 'function' ? 항목.답() : 항목.답;
    답그리기(줄, 항목.링크, 항목.다음);
  }

  function 첫인사() {
    답그리기([
      ['안녕하세요', '밸류스에 오신 것을 환영합니다. 무엇이 궁금하세요?'],
      ['', '아래에서 골라 누르시거나, 아래 칸에 직접 적어 주셔도 됩니다.']
    ], null, 첫단추);
  }

  function 묻기() {
    var 글 = 칸.value.trim();
    if (!글) return;
    칸.value = '';
    내말(글);
    var 항목 = 찾기(글);
    if (항목) { 답하기(항목); return; }
    var a = document.createElement('a');
    답그리기([
      ['그건 제가 적어 둔 답에 없습니다', '지어내서 말씀드리지 않겠습니다.'],
      ['', '아래 「편지 쓰기」를 누르시면 물으신 내용이 그대로 적힌 채로 편지 창이 열립니다. ' +
           '만든 사람이 직접 읽고 답합니다.']
    ], [['✉ 이대로 편지 보내기',
         'mailto:' + 메일 + '?subject=' + encodeURIComponent('밸류스에 물어봅니다') +
         '&body=' + encodeURIComponent(글 + '\n\n')]], 첫단추);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', 만들기);
  else 만들기();
})();
