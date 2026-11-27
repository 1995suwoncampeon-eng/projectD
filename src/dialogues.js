/**
 * 라이벌별 컷신 대사 & 캐릭터 이미지 설정 파일 (총 8명)
 *
 * 수정 방법:
 * - 각 라이벌(rookie1 / shingo / takeshi / keisuke / kozo / ryosuke / master1 / jhy)의
 *   `intro`(시작 전), `midrace`(코스 후반부 5연속 헤어핀 진입 시 2페이즈 돌입), `outro`(종료 후)를 편집하세요.
 * - `characterImage`: 해당 컷신 기본 캐릭터 이미지 경로 (예: 'assets/cutscenes/takeshi.png')
 * - `midrace`: 주행 중 우측 중상단 라이벌 현황 사진(1페이즈 → 2페이즈) 및 5연속 헤어핀 진입 중간 대사
 *     - phase1Image : 경기 시작~중반 우측 중상단에 표시할 1페이즈 이미지 (null이면 intro.characterImage 사용)
 *     - phase2Image : 5연속 헤어핀 진입 시 전환할 2페이즈 이미지 (예: 'assets/cutscenes/JHY_AURA.png')
 *     - text        : 5연속 헤어핀 직전 진입 시 우측 중상단에 출력될 중간 대사
 *     - durationSec : 중간 대사 말풍선 유지 시간(초, 기본 4.8초)
 * - `lines`: 대사 문단 배열
 *     - `intro.lines` : 시작 전 대사 (1번 → 2번 순서대로 출력 후 레이스 시작)
 *     - `outro.lines` : 종료 후 대사 (1번 = 플레이어 패배/NPC 승리 시 출력, 2번 = 플레이어 승리/NPC 패배 시 출력)
 *     - speaker : 화자 이름
 *     - color   : 화자 네임플레이트 강조 색상
 *     - image   : (선택) 특정 문단에서만 다른 표정/캐릭터 이미지로 바꾸고 싶을 때 경로 지정
 *     - text    : 화면 하단에 타이핑 재생될 대사 내용
 */

export const RIVAL_CUTSCENES = {
  // ==========================================================================
  // 1. ROOKIE 1 (입문 // ROOKIE — 타케시 하위 #1)
  // ==========================================================================
  rookie1: {
    intro: {
      enabled: true,
      title: 'VS ROOKIE 1 // AKINA SPEED STARS',
      characterImage: null, // 예: 'assets/cutscenes/rookie1.png'
      lines: [
        {
          speaker: 'ROOKIE 1',
          color: '#38bdf8',
          image: null,
          text: '[야레야레 처음보는 녀석이구만. 다른 지역에서 온건가?]',
        },
        {
          speaker: 'ROOKIE 1',
          color: '#38bdf8',
          image: null,
          text: '[뭐, 시울시 최고속인 나를 이길 수 없겠지만 말이야. 으하하하하]',
        },
      ],
    },
    outro: {
      enabled: true,
      title: 'AFTER BATTLE // ROOKIE 1',
      characterImage: null,
      lines: [
        {
          speaker: 'ROOKIE 1',
          color: '#38bdf8',
          image: null,
          text: '[흐하하 나약하군!! 이유식이나 더 먹고 와라 애송이!!]',
        },
        {
          speaker: 'ROOKIE 1',
          color: '#38bdf8',
          image: null,
          text: '[예? 제가 졌어요? 아뇨아뇨아뇨 줴줴이야]',
        },
      ],
    },
    midrace: {
      enabled: true,
      phase1Image: null, // 예: 'assets/cutscenes/rookie1_phase1.png'
      phase2Image: null, // 예: 'assets/cutscenes/rookie1_phase2.png'
      speaker: 'ROOKIE 1',
      color: '#38bdf8',
      text: '[ROOKIE 1 중간 대사 — 5연속 헤어핀 진입! (src/dialogues.js에서 수정하세요)]',
      durationSec: 4.8,
    },
  },

  // ==========================================================================
  // 2. SHINGO (초보 // BEGINNER — 쇼지 신고 모티브, i30 FD)
  // ==========================================================================
  shingo: {
    intro: {
      enabled: true,
      title: 'VS SHINGO // NIGHT KIDS',
      characterImage: null, // 예: 'assets/cutscenes/shingo.png'
      lines: [
        {
          speaker: 'SHINGO',
          color: '#ef4444',
          image: null,
          text: '[내가 팔만 다치지 않았어도 너같은 애송이는 청테이프 데스매치로 상대했을텐데.]',
        },
        {
          speaker: 'SHINGO',
          color: '#ef4444',
          image: null,
          text: '[하지만 내가 이길거다. 동급 클래스 최고의 엔진 1.6L 베타엔진과 FF 시스템의 시너지를 보여주마!]',
        },
      ],
    },
    outro: {
      enabled: true,
      title: 'AFTER BATTLE // SHINGO',
      characterImage: null,
      lines: [
        {
          speaker: 'SHINGO',
          color: '#ef4444',
          image: null,
          text: '[다운힐 최고의 머신이 뭔지 알겠냐? 2.0L 베타엔진은 현대 최고의 걸작이라고!]',
        },
        {
          speaker: 'SHINGO',
          color: '#ef4444',
          image: null,
          text: '[젠장... 이럴리가 없다... 나이트키즈 다운힐 최강인 내가 지다니..]',
        },
      ],
    },
    midrace: {
      enabled: true,
      phase1Image: null, // 예: 'assets/cutscenes/shingo_phase1.png'
      phase2Image: null, // 예: 'assets/cutscenes/shingo_phase2.png'
      speaker: 'SHINGO',
      color: '#ef4444',
      text: '[나의 패배는 자존심이 허락하지 않는다... 무승부로 끝내면 돼! 이 승부의 결과는 더블크래시로 가자고!!]',
      durationSec: 4.8,
    },
  },

  // ==========================================================================
  // 3. TAKESHI (초급 // EASY)
  // ==========================================================================
  takeshi: {
    intro: {
      enabled: true,
      title: 'VS TAKESHI // NIGHT KIDS',
      characterImage: null, // 예: 'assets/cutscenes/takeshi.png'
      lines: [
        {
          speaker: 'TAKESHI',
          color: '#60a5fa',
          image: null,
          text: '[처음보는 녀석이군.. 하지만 상당한 실력자인건 알 수 있다.]',
        },
        {
          speaker: 'TAKESHI',
          color: '#60a5fa',
          image: null,
          text: '[뛰어난 드라이버에게선 오라가 느껴진다. 그리고 너에게선 그 오라가 보여.]',
        },
      ],
    },
    outro: {
      enabled: true,
      title: 'AFTER BATTLE // TAKESHI',
      characterImage: null,
      lines: [
        {
          speaker: 'TAKESHI',
          color: '#60a5fa',
          image: null,
          text: '[너무 상심하지 마라. 봉고르기니 프론티어의 F는 불패신화의 F다. 따라온것에 의의를 두도록.]',
        },
        {
          speaker: 'TAKESHI',
          color: '#60a5fa',
          image: null,
          text: '[나와 내 봉고르기니가 졌어..? 아니, 진건 나다. 봉고르기니가 진게 아니야. 그나저나 판금 몇십만원 코스지...]',
        },
      ],
    },
    midrace: {
      enabled: true,
      phase1Image: null, // 예: 'assets/cutscenes/takeshi_phase1.png'
      phase2Image: null, // 예: 'assets/cutscenes/takeshi_phase2.png'
      speaker: 'TAKESHI',
      color: '#60a5fa',
      text: '[전신에서 피가 끓어오르는 이 감각! 이게 진짜 배틀이지! 더이상 봐주지 않는다!]',
      durationSec: 4.8,
    },
  },

  // ==========================================================================
  // 4. KEISUKE (중급 // NORMAL)
  // ==========================================================================
  keisuke: {
    intro: {
      enabled: true,
      title: 'VS KEISUKE // RED SUNS',
      characterImage: null, // 예: 'assets/cutscenes/keisuke.png'
      lines: [
        {
          speaker: 'KEISUKE',
          color: '#fde047',
          image: null,
          text: '[KEISUKE 시작 전 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'KEISUKE',
          color: '#fde047',
          image: null,
          text: '[KEISUKE 시작 전 대사 2 — 대화창을 클릭하면 레이스가 시작됩니다]',
        },
      ],
    },
    outro: {
      enabled: true,
      title: 'AFTER BATTLE // KEISUKE',
      characterImage: null,
      lines: [
        {
          speaker: 'KEISUKE',
          color: '#fde047',
          image: null,
          text: '[KEISUKE 종료 후 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'KEISUKE',
          color: '#fde047',
          image: null,
          text: '[KEISUKE 종료 후 대사 2 — 대화창을 클릭하면 결과 화면으로 이동합니다]',
        },
      ],
    },
    midrace: {
      enabled: true,
      phase1Image: null, // 예: 'assets/cutscenes/keisuke_phase1.png'
      phase2Image: null, // 예: 'assets/cutscenes/keisuke_phase2.png'
      speaker: 'KEISUKE',
      color: '#fde047',
      text: '[KEISUKE 중간 대사 — 5연속 헤어핀 진입! (src/dialogues.js에서 수정하세요)]',
      durationSec: 4.8,
    },
  },

  // ==========================================================================
  // 5. KOZO (상급 // EXPERT — 호시노 코죠 모티브, 기아 봉고 3 4WD)
  // ==========================================================================
  kozo: {
    intro: {
      enabled: true,
      title: 'VS KOZO // PURPLE SHADOW',
      characterImage: null, // 예: 'assets/cutscenes/kozo.png'
      lines: [
        {
          speaker: 'KOZO',
          color: '#fb923c',
          image: null,
          text: '[KOZO 시작 전 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'KOZO',
          color: '#fb923c',
          image: null,
          text: '[KOZO 시작 전 대사 2 — 대화창을 클릭하면 레이스가 시작됩니다]',
        },
      ],
    },
    outro: {
      enabled: true,
      title: 'AFTER BATTLE // KOZO',
      characterImage: null,
      lines: [
        {
          speaker: 'KOZO',
          color: '#fb923c',
          image: null,
          text: '[KOZO 종료 후 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'KOZO',
          color: '#fb923c',
          image: null,
          text: '[KOZO 종료 후 대사 2 — 대화창을 클릭하면 결과 화면으로 이동합니다]',
        },
      ],
    },
    midrace: {
      enabled: true,
      phase1Image: null, // 예: 'assets/cutscenes/kozo_phase1.png'
      phase2Image: null, // 예: 'assets/cutscenes/kozo_phase2.png'
      speaker: 'KOZO',
      color: '#fb923c',
      text: '[KOZO 중간 대사 — 5연속 헤어핀 진입! (src/dialogues.js에서 수정하세요)]',
      durationSec: 4.8,
    },
  },

  // ==========================================================================
  // 6. RYOSUKE (고수 // HARD)
  // ==========================================================================
  ryosuke: {
    intro: {
      enabled: true,
      title: 'VS RYOSUKE // WHITE COMET',
      characterImage: null, // 예: 'assets/cutscenes/ryosuke.png'
      lines: [
        {
          speaker: 'RYOSUKE',
          color: '#38bdf8',
          image: null,
          text: '[RYOSUKE 시작 전 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'RYOSUKE',
          color: '#38bdf8',
          image: null,
          text: '[RYOSUKE 시작 전 대사 2 — 대화창을 클릭하면 레이스가 시작됩니다]',
        },
      ],
    },
    outro: {
      enabled: true,
      title: 'AFTER BATTLE // RYOSUKE',
      characterImage: null,
      lines: [
        {
          speaker: 'RYOSUKE',
          color: '#38bdf8',
          image: null,
          text: '[RYOSUKE 종료 후 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'RYOSUKE',
          color: '#38bdf8',
          image: null,
          text: '[RYOSUKE 종료 후 대사 2 — 대화창을 클릭하면 결과 화면으로 이동합니다]',
        },
      ],
    },
    midrace: {
      enabled: true,
      phase1Image: null, // 예: 'assets/cutscenes/ryosuke_phase1.png'
      phase2Image: null, // 예: 'assets/cutscenes/ryosuke_phase2.png'
      speaker: 'RYOSUKE',
      color: '#38bdf8',
      text: '[RYOSUKE 중간 대사 — 5연속 헤어핀 진입! (src/dialogues.js에서 수정하세요)]',
      durationSec: 4.8,
    },
  },

  // ==========================================================================
  // 7. LEGEND (달인 // MASTER — 료스케와 JHY 사이)
  // ==========================================================================
  master1: {
    intro: {
      enabled: true,
      title: 'VS LEGEND // PURPLE SHADOW',
      characterImage: null, // 예: 'assets/cutscenes/master1.png'
      lines: [
        {
          speaker: 'LEGEND',
          color: '#f472b6',
          image: null,
          text: '[LEGEND 시작 전 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'LEGEND',
          color: '#f472b6',
          image: null,
          text: '[LEGEND 시작 전 대사 2 — 대화창을 클릭하면 레이스가 시작됩니다]',
        },
      ],
    },
    outro: {
      enabled: true,
      title: 'AFTER BATTLE // LEGEND',
      characterImage: null,
      lines: [
        {
          speaker: 'LEGEND',
          color: '#f472b6',
          image: null,
          text: '[LEGEND 종료 후 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'LEGEND',
          color: '#f472b6',
          image: null,
          text: '[LEGEND 종료 후 대사 2 — 대화창을 클릭하면 결과 화면으로 이동합니다]',
        },
      ],
    },
    midrace: {
      enabled: true,
      phase1Image: null, // 예: 'assets/cutscenes/master1_phase1.png'
      phase2Image: null, // 예: 'assets/cutscenes/master1_phase2.png'
      speaker: 'LEGEND',
      color: '#f472b6',
      text: '[LEGEND 중간 대사 — 5연속 헤어핀 진입! (src/dialogues.js에서 수정하세요)]',
      durationSec: 4.8,
    },
  },

  // ==========================================================================
  // 8. JHY (신 // GOD)
  // ==========================================================================
  jhy: {
    intro: {
      enabled: true,
      title: 'VS JHY // FUJIWARA TOFU',
      characterImage: 'assets/cutscenes/JHY.jpg',
      lines: [
        {
          speaker: 'JHY',
          color: '#e879f9',
          image: 'assets/cutscenes/JHY.jpg',
          text: '[.....]',
        },
        {
          speaker: 'JHY',
          color: '#e879f9',
          image: 'assets/cutscenes/JHY.jpg',
          text: '[.....!]',
        },
      ],
    },
    outro: {
      enabled: true,
      title: 'AFTER BATTLE // JHY',
      characterImage: 'assets/cutscenes/JHY.jpg',
      lines: [
        {
          speaker: 'JHY',
          color: '#e879f9',
          image: null,
          text: '[.....]',
        },
        {
          speaker: 'JHY',
          color: '#e879f9',
          image: null,
          text: '[JHY 종료 후 대사 2 — 대화창을 클릭하면 결과 화면으로 이동합니다]',
        },
      ],
    },
    midrace: {
      enabled: true,
      phase1Image: 'assets/cutscenes/JHY_Side.jpg',
      phase2Image: 'assets/cutscenes/JHY_AURA.png',
      speaker: 'JHY',
      color: '#e879f9',
      text: '[JHY 중간 대사 — 5연속 헤어핀 진입! (src/dialogues.js에서 수정하세요)]',
      durationSec: 4.8,
    },
  },
};
