/**
 * 라이벌별 컷신 대사 & 캐릭터 이미지 설정 파일 (총 8명)
 *
 * 수정 방법:
 * - 각 라이벌(rookie1 / rookie2 / takeshi / keisuke / expert1 / ryosuke / master1 / bunta)의
 *   `intro`(시작 전), `outro`(종료 후)를 편집하세요.
 * - `characterImage`: 해당 컷신 기본 캐릭터 이미지 경로 (예: 'assets/cutscenes/takeshi.png')
 * - `lines`: 대사 문단 배열 (대화창 클릭 시 순서대로 넘어감)
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
          text: '[SHINGO 시작 전 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'SHINGO',
          color: '#ef4444',
          image: null,
          text: '[SHINGO 시작 전 대사 2 — 대화창을 클릭하면 레이스가 시작됩니다]',
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
          text: '[SHINGO 종료 후 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'SHINGO',
          color: '#ef4444',
          image: null,
          text: '[SHINGO 종료 후 대사 2 — 대화창을 클릭하면 결과 화면으로 이동합니다]',
        },
      ],
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
          text: '[TAKESHI 시작 전 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'TAKESHI',
          color: '#60a5fa',
          image: null,
          text: '[TAKESHI 시작 전 대사 2 — 대화창을 클릭하면 레이스가 시작됩니다]',
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
          text: '[TAKESHI 종료 후 대사 1 — src/dialogues.js에서 수정하세요]',
        },
        {
          speaker: 'TAKESHI',
          color: '#60a5fa',
          image: null,
          text: '[TAKESHI 종료 후 대사 2 — 대화창을 클릭하면 결과 화면으로 이동합니다]',
        },
      ],
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
  },

  // ==========================================================================
  // 7. LEGEND (달인 // MASTER — 료스케와 분타 사이)
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
  },

  // ==========================================================================
  // 8. BUNTA (신 // GOD)
  // ==========================================================================
  bunta: {
    intro: {
      enabled: true,
      title: 'VS BUNTA // FUJIWARA TOFU',
      characterImage: null, // 예: 'assets/cutscenes/bunta.png'
      lines: [
        {
          speaker: 'BUNTA',
          color: '#e879f9',
          image: null,
          text: '[.....]',
        },
        {
          speaker: 'BUNTA',
          color: '#e879f9',
          image: null,
          text: '[.....!]',
        },
      ],
    },
    outro: {
      enabled: true,
      title: 'AFTER BATTLE // BUNTA',
      characterImage: null,
      lines: [
        {
          speaker: 'BUNTA',
          color: '#e879f9',
          image: null,
          text: '[.....]',
        },
        {
          speaker: 'BUNTA',
          color: '#e879f9',
          image: null,
          text: '[BUNTA 종료 후 대사 2 — 대화창을 클릭하면 결과 화면으로 이동합니다]',
        },
      ],
    },
  },
};
