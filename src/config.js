/**
 * Global configuration for PROJECT D // TOUGE DOWNHILL STAGE.
 *
 * MODEL ORIENTATION:
 * Adjust MODEL_ROTATION_Y if your custom .glb car model does not face +Z:
 *   0           -> model front already faces +Z
 *   Math.PI     -> model front faces -Z (common in Blender exports)
 *   Math.PI / 2 -> model front faces -X
 *  -Math.PI / 2 -> model front faces +X
 */

import { RIVAL_CUTSCENES } from './dialogues.js?v=19';

// ============================================================================
// 3D CAR MODEL SETTINGS (Edit here when dropping in custom .glb models)
// ============================================================================
export const MODEL_ROTATION_Y = 0;
export const PLAYER_MODEL_PATH = 'assets/models/player_car.glb';
export const RIVAL_MODEL_PATH = 'assets/models/rival_car.glb';
export const TARGET_CAR_WIDTH = 2.15; // Normalized width in world meters (road width is 13.5m)

// ============================================================================
// TRACK & WORLD SETTINGS (Pure 2D X-Z plane at Y = 0)
// ============================================================================
export const TRACK_CONFIG = {
  roadWidth: 13.5,
  shoulderMargin: 0.7,
  guardrailOffset: 7.35, // Distance from centerline to guardrail beam
  carHalfWidth: 1.15,    // Collision half-width against guardrail
  startLineS: 28,        // Arc-length start position (meters)
  finishMarginS: 36,     // Run-off distance past the finish line
  sampleCount: 1800,     // High-density spline discretization for razor-tight U-turn hairpins
};

// ============================================================================
// PLAYER ARCADE PHYSICS (2D X-Z plane)
// ============================================================================
export const PLAYER_PHYSICS = {
  maxSpeedKmh: 100,
  reverseMaxKmh: 24,
  accel: 3.85,             // m/s^2 base pull (scaled by gear torque ratio & RPM powerband -> ~13s 0-100 km/h)
  brakeDecel: 18.5,        // m/s^2 braking power
  coastDecel: 2.8,         // m/s^2 engine braking / aero drag
  shiftCutDuration: 0.14,  // brief torque cut during upshift for manual-transmission feel
  gears: [
    { gear: '1', minKmh: 0,  maxKmh: 25,  upshiftKmh: 24,  downshiftKmh: 0,  torqueMult: 1.38, minRpm: 1200, maxRpm: 8450 },
    { gear: '2', minKmh: 14, maxKmh: 43,  upshiftKmh: 42,  downshiftKmh: 19, torqueMult: 0.96, minRpm: 4000, maxRpm: 8450 },
    { gear: '3', minKmh: 28, maxKmh: 67,  upshiftKmh: 66,  downshiftKmh: 36, torqueMult: 0.54, minRpm: 4300, maxRpm: 8450 },
    { gear: '4', minKmh: 48, maxKmh: 91,  upshiftKmh: 90,  downshiftKmh: 59, torqueMult: 0.38, minRpm: 4700, maxRpm: 8450 },
    { gear: '5', minKmh: 72, maxKmh: 108, upshiftKmh: 999, downshiftKmh: 82, torqueMult: 0.28, minRpm: 5200, maxRpm: 8550 },
  ],
  steerRate: 1.92,             // rad/s base grip turn rate (calmer, less twitchy than 2.25)
  steerBuildRate: 5.2,         // steering wheel turn-in ramp speed (1/s)
  steerCounterRate: 9.5,       // faster steering sweep when crossing center / counter-steering
  steerReturnRate: 7.5,        // self-centering speed when releasing steering input
  yawAccelGrip: 11.0,          // rotational inertia response in normal grip
  yawAccelDrift: 7.5,          // rotational inertia response while sliding
  gripAlignRate: 9.5,          // how fast velocity aligns with nose in grip
  driftAlignRate: 2.35,        // lower lateral grip during drift -> genuine sideways slide
  driftSettleAlignRate: 4.1,   // smooth alignment when steering is released to exit a tap-drift
  driftRecoveryAlignRate: 5.6, // smooth grip bite after exiting a drift
  maxSlipAngleRad: 0.50,       // max real physical drift slip (~28.6 deg, dramatic yet controllable)
  driftExitSlipRad: 0.10,      // auto-return to grip once |heading - travelHeading| < ~5.7 deg
  driftInitGraceSec: 0.28,     // brief grace period after tap so slip angle builds cleanly
  driftSteerBoost: 1.38,       // yaw authority while drifting
  driftMinSpeedKmh: 30,        // minimum speed to engage drift
  driftDrag: 1.15,             // mild speed bleed during deep drift
  driftBoostMaxKmh: 8,         // brief exit boost after clean drift
  kanseiSwingMinSpeedKmh: 46,  // min speed to swing-transition an active drift to the opposite direction
  kanseiOvershootRad: 0.115,   // must turn ~6.6 deg PAST 0 into the opposite side to trigger Kansei flip
  kanseiGripMinSpeedKmh: 64,   // min speed for high-speed corner-to-corner swing without DRIFT key
  kanseiGripMinLoad: 0.55,     // sustained cornering lateral load needed before opposite whip
  kanseiGripWhipHoldSec: 0.18, // opposite hold time to break rear loose from high-speed cornering
  kanseiDragMult: 0.65,        // preserves more momentum through the linked corner
  kanseiBoostMaxKmh: 10,       // exit surge after a clean Kansei transition
  kanseiBoostDuration: 1.0,    // exit boost duration
  maxVisualSlipRad: 0.46,      // max visual body slip readout cap
  wallSpeedKeep: 0.84,         // speed retention on guardrail scrape
  carCollisionRadius: 1.32,
};

// ============================================================================
// RIVAL ROSTER (8 Tiers: ROOKIE -> BEGINNER -> EASY -> NORMAL -> EXPERT -> HARD -> MASTER -> GOD)
// ============================================================================
export const RIVALS = [
  {
    id: 'rookie1',
    name: 'ROOKIE 1',
    team: 'SPEED STARS',
    difficulty: 'ROOKIE',
    difficultyKr: '입문',
    badgeClass: 'rookie',
    carLabel: 'CUSTOM MODEL SLOT #1',
    colorHex: '#38bdf8',
    colorNum: 0x38bdf8,
    accentHex: '#7dd3fc',
    modelPath: null, // 추후 .glb 추가 시 'assets/models/<파일명>.glb' 지정
    modelRotationY: Math.PI / 2,
    tagline: '고갯길에 처음 도전하는 입문 라이벌. 여유로운 페이스로 코스를 익히기 좋습니다.',
    stats: {
      topSpeedKmh: 92,
      corneringStability: 0.62,
      accelFactor: 0.66,
      aggression: 0.45,
    },
    ai: {
      maxSpeedKmh: 92,
      accel: 3.3,
      cornerSpeedFactor: 0.62,
      lookAheadBase: 17,
      rubberBandCatchup: 0.05,
      rubberBandEase: 0.18,
      laneBias: 2.1,
    },
    cutscenes: RIVAL_CUTSCENES.rookie1,
  },
  {
    id: 'shingo',
    name: 'SHINGO',
    team: 'NIGHT KIDS',
    difficulty: 'BEGINNER',
    difficultyKr: '초보',
    badgeClass: 'beginner',
    carLabel: 'HYUNDAI i30 (FD)',
    colorHex: '#dc2626',
    colorNum: 0xdc2626,
    accentHex: '#ef4444',
    modelPath: 'assets/models/i30_FD.glb',
    modelRotationY: Math.PI / 2,
    taillights: { x: 0.72, y: 1.04, zOffset: 0.06, width: 0.42, height: 0.56 },
    wheelStyle: { rimColor: '#9ca3af', spokeColor: '#788292', hubColor: '#cbd5e1', spokes: 5 },
    tagline: '빨간 1세대 i30(FD)를 모는 FF 드라이버. 진입 턱인과 탈출 언더스티어가 뚜렷한 전륜구동 코너링을 구사합니다.',
    stats: {
      topSpeedKmh: 108,
      corneringStability: 0.88,
      accelFactor: 0.90,
      aggression: 0.80,
    },
    ai: {
      maxSpeedKmh: 108,
      accel: 5.15,
      cornerSpeedFactor: 0.88,
      turnRateMult: 1.32, // 경량 FF 해치백 특유의 빠르고 민첩한 코너 선회
      ffCorneringStyle: true,
      noDrift: true, // FF hatchback: front-wheel tuck-in & power understeer instead of FR drift
      apexRatio: 0.76,
      maxLateralRatio: 0.86,
      lookAheadBase: 15.5,
      rubberBandCatchup: 0.09,
      rubberBandEase: 0.10,
      laneBias: 1.6,
    },
    cutscenes: RIVAL_CUTSCENES.shingo,
  },
  {
    id: 'takeshi',
    name: 'TAKESHI',
    team: 'NIGHT KIDS',
    difficulty: 'NORMAL',
    difficultyKr: '중급',
    badgeClass: 'normal',
    carLabel: 'BONGO FRONTIER',
    colorHex: '#2563eb',
    colorNum: 0x2563eb,
    accentHex: '#60a5fa',
    modelPath: 'assets/models/Bongo.glb',
    modelRotationY: Math.PI / 2,
    wheelStyle: { rimColor: '#64748b', spokeColor: '#3f4a5a', hubColor: '#94a3b8', spokes: 6, isSteel: true },
    tagline: '코너 진입 시 급감속 후 인코스를 파고들어 풀가속과 터보 부스트로 탈출하는 그립 주행 중급 라이벌입니다.',
    stats: {
      topSpeedKmh: 124,
      corneringStability: 0.87, // 0..1 (higher = carries more corner speed)
      accelFactor: 0.88,
      aggression: 0.82,
    },
    ai: {
      maxSpeedKmh: 124,
      accel: 5.05,
      cornerSpeedFactor: 0.86,
      lateBrakeApexFullThrottle: true,
      hardBrakeDecel: 22.5,
      apexRatio: 0.78,
      maxLateralRatio: 0.86,
      noDrift: true, // Strictly pure grip driving — never drifts
      twinTurboBoost: {
        boostKmh: 14,
        boostAccelMult: 1.55,
        boostDuration: 1.35,
      },
      lookAheadBase: 16,
      rubberBandCatchup: 0.10,  // Max boost when behind
      rubberBandEase: 0.08,     // Max ease when far ahead
      laneBias: 1.5,            // Right-side bias on straights
    },
    cutscenes: RIVAL_CUTSCENES.takeshi,
  },
  {
    id: 'keisuke',
    name: 'KEISUKE',
    team: 'RED SUNS',
    difficulty: 'NORMAL',
    difficultyKr: '중급',
    badgeClass: 'normal',
    carLabel: 'NEW GENESIS COUPE',
    colorHex: '#facc15',
    colorNum: 0xfacc15,
    accentHex: '#fde047',
    modelPath: 'assets/models/New_GenCup.glb',
    modelRotationY: Math.PI / 2,
    taillights: { x: 0.65, y: 1.01, zOffset: 0.04, width: 0.72, height: 0.36 },
    wheelStyle: { rimColor: '#cbd5e1', spokeColor: '#94a3b8', hubColor: '#e2e8f0', spokes: 10, caliperColor: '#dc2626' },
    tagline: '강력한 탈출 가속과 과감한 드리프트로 압박하는 중급 라이벌입니다.',
    stats: {
      topSpeedKmh: 122,
      corneringStability: 0.89,
      accelFactor: 0.92,
      aggression: 0.84,
    },
    ai: {
      maxSpeedKmh: 122,
      accel: 5.35,
      cornerSpeedFactor: 0.89,
      apexRatio: 0.68,
      maxLateralRatio: 0.84,
      twinTurboBoost: {
        boostKmh: 14,
        boostAccelMult: 1.5,
        boostDuration: 1.35,
      },
      lookAheadBase: 18,
      rubberBandCatchup: 0.11,
      rubberBandEase: 0.08,
      laneBias: 1.4,
    },
    cutscenes: RIVAL_CUTSCENES.keisuke,
  },
  {
    id: 'kozo',
    name: 'KOZO',
    team: 'PURPLE SHADOW',
    difficulty: 'EXPERT',
    difficultyKr: '상급',
    badgeClass: 'expert',
    carLabel: 'KIA BONGO III 4WD',
    colorHex: '#d97706',
    colorNum: 0xd97706,
    accentHex: '#fb923c',
    modelPath: 'assets/models/Bongo3.glb',
    modelRotationY: Math.PI / 2,
    taillights: { x: 0.62, y: 0.80, zOffset: 0.02, width: 0.46, height: 0.24 },
    wheelStyle: { rimColor: '#4b5563', spokeColor: '#272e3a', hubColor: '#6b7280', spokes: 6, isSteel: true },
    tagline: '과감한 풀브레이킹·풀악셀 그립 주행과 5연속 헤어핀 아웃-인 스핀턴을 구사하는 상급 라이벌입니다.',
    stats: {
      topSpeedKmh: 140,
      corneringStability: 0.93,
      accelFactor: 0.98,
      aggression: 0.92,
    },
    ai: {
      maxSpeedKmh: 140,
      accel: 6.45,
      highSpeedDropKmh: 115,     // 115 km/h 이후 가속 급감 (초반 폭발, 후반 극저가속)
      highSpeedAccelScale: 0.14,
      cornerSpeedFactor: 0.93,
      godFootStyle: true,        // 평소 과감한 그립 주행 + 5연속 헤어핀 아웃 급가속 -> 급감속 인 스핀턴
      hardBrakeDecel: 24.5,
      apexRatio: 0.78,
      maxLateralRatio: 0.86,
      lookAheadBase: 16.5,
      rubberBandCatchup: 0.10,
      rubberBandEase: 0.06,
      laneBias: 1.1,
    },
    cutscenes: RIVAL_CUTSCENES.kozo,
  },
  {
    id: 'ryosuke',
    name: 'RYOSUKE',
    team: 'WHITE COMET',
    difficulty: 'HARD',
    difficultyKr: '고수',
    badgeClass: 'hard',
    carLabel: 'OLD GENESIS COUPE',
    colorHex: '#e2e8f0',
    colorNum: 0xe2e8f0,
    accentHex: '#38bdf8',
    modelPath: 'assets/models/Old_GenCup.glb',
    modelRotationY: Math.PI / 2,
    taillights: { x: 0.61, y: 0.97, zOffset: 0.04, width: 0.68, height: 0.34 },
    wheelStyle: { rimColor: '#f1f5f9', spokeColor: '#cbd5e1', hubColor: '#ffffff', spokes: 10 },
    tagline: '정밀한 에이펙스 공략과 완벽한 코너링 안정성을 갖춘 고수 라이벌입니다.',
    stats: {
      topSpeedKmh: 112,
      corneringStability: 0.97,
      accelFactor: 0.94,
      aggression: 0.95,
    },
    ai: {
      maxSpeedKmh: 112,
      accel: 5.20,
      cornerSpeedFactor: 0.97,
      coastOnlyCorners: true,
      cornerDecelScale: 0.28,
      minCornerSpeedRatio: 0.82,
      coastDecel: 3.4,
      apexRatio: 0.82,
      maxLateralRatio: 0.88,
      twinTurboBoost: {
        boostKmh: 12,
        boostAccelMult: 1.55,
        boostDuration: 1.3,
      },
      lookAheadBase: 16,
      rubberBandCatchup: 0.12,
      rubberBandEase: 0.04,
      laneBias: 0.9,
    },
    cutscenes: RIVAL_CUTSCENES.ryosuke,
  },
  {
    id: 'master1',
    name: 'LEGEND',
    team: 'PURPLE SHADOW',
    difficulty: 'MASTER',
    difficultyKr: '달인',
    badgeClass: 'master',
    carLabel: 'CUSTOM MODEL SLOT #7',
    colorHex: '#ec4899',
    colorNum: 0xec4899,
    accentHex: '#f472b6',
    modelPath: null, // 추후 .glb 추가 시 'assets/models/<파일명>.glb' 지정
    modelRotationY: Math.PI / 2,
    tagline: '빈틈없는 코너링 라인과 높은 탈출 속도로 몰아붙이는 달인급 라이벌입니다.',
    stats: {
      topSpeedKmh: 114,
      corneringStability: 0.98,
      accelFactor: 1.0,
      aggression: 0.97,
    },
    ai: {
      maxSpeedKmh: 114,
      accel: 5.70,
      cornerSpeedFactor: 0.98,
      coastOnlyCorners: true,
      cornerDecelScale: 0.24,
      minCornerSpeedRatio: 0.84,
      coastDecel: 3.2,
      apexRatio: 0.86,
      maxLateralRatio: 0.90,
      twinTurboBoost: {
        boostKmh: 15,
        boostAccelMult: 1.65,
        boostDuration: 1.4,
      },
      lookAheadBase: 16,
      rubberBandCatchup: 0.12,
      rubberBandEase: 0.03,
      laneBias: 0.8,
    },
    cutscenes: RIVAL_CUTSCENES.master1,
  },
  {
    id: 'jhy',
    name: 'JHY',
    team: 'FUJIWARA TOFU',
    difficulty: 'GOD',
    difficultyKr: '신',
    badgeClass: 'god',
    carLabel: 'MOHAVI 4WD',
    colorHex: '#a855f7',
    colorNum: 0xa855f7,
    accentHex: '#e879f9',
    modelPath: 'assets/models/Mohavi.glb',
    modelRotationY: Math.PI / 2,
    taillights: { x: 0.72, y: 1.14, zOffset: 0.02, width: 0.48, height: 0.46 },
    wheelStyle: { rimColor: '#facc15', spokeColor: '#eab308', hubColor: '#fef08a', spokes: 5 },
    tagline: '아키나 최속의 전설. 중고속 코너는 초고속 인코스 드리프트, 중저속 급코너는 도랑타기로 돌파하는 최강 GOD 라이벌입니다.',
    stats: {
      topSpeedKmh: 112,
      corneringStability: 0.99,
      accelFactor: 0.99,
      aggression: 0.98,
    },
    ai: {
      maxSpeedKmh: 112,
      accel: 5.30,
      cornerSpeedFactor: 0.98,
      jhyGodStyle: true,            // 중고속 코너: 도랑타기보다 빠른 인코스 드리프트 / 중저속 급코너: 도랑타기
      gutterMinCurvature: 0.024,    // 급코너·헤어핀에서만 도랑타기 발동
      highSpeedDriftBonusKmh: 4,    // 중고속 코너 드리프트 통과 시 도랑타기보다 빠른 속도 유지
      driftSlipRad: 0.36,
      coastOnlyCorners: true,
      cornerDecelScale: 0.25,
      minCornerSpeedRatio: 0.78,    // 급헤어핀 도랑타기 ~87 km/h -> 플레이어가 인코스 블로킹/도랑타기로 추월 가능!
      coastDecel: 3.1,
      apexRatio: 0.90,
      maxLateralRatio: 0.92,
      twinTurboBoost: {
        boostKmh: 8,
        boostAccelMult: 1.35,
        boostDuration: 1.05,
      },
      lookAheadBase: 15,
      rubberBandCatchup: 0.08,
      rubberBandEase: 0.0,          // GOD 라이벌: 앞서나가도 봐주지 않음
      laneBias: 0.9,
      useGutterRun: true,
      // 2페이즈(5연속 헤어핀 진입 시 각성): 너프 이전 최강 GOD 드라이빙 발동!
      phase2: {
        triggerZ: -925,
        accel: 5.85,
        cornerSpeedFactor: 0.99,
        cornerDecelScale: 0.22,
        minCornerSpeedRatio: 0.86,
        coastDecel: 2.8,
        twinTurboBoost: {
          boostKmh: 16,
          boostAccelMult: 1.75,
          boostDuration: 1.55,
        },
        rubberBandCatchup: 0.16,
      },
    },
    cutscenes: RIVAL_CUTSCENES.jhy,
  },
];

// ============================================================================
// PLAYER VISUAL IDENTITY (AE86 Panda-inspired fallback)
// ============================================================================
export const PLAYER_THEME = {
  bodyColor: 0xf8fafc,
  lowerTrimColor: 0x111827,
  accentColor: 0x38bdf8,
};

// ============================================================================
// SELECTABLE PLAYER VEHICLES (Default AE86 + all NPC .glb vehicles synced with NPC specs)
// ============================================================================
const PLAYER_CAR_SPECS = {
  ae86: {
    specTag: 'FR · 102km/h · 경량 드리프트 밸런스',
    physics: {
      maxSpeedKmh: 102,
      accel: 3.95,
      brakeDecel: 19.0,
      steerRate: 2.02,
      driftSteerBoost: 1.44,
      driftDrag: 1.0,
      gripAlignRate: 9.2,
      driftAlignRate: 2.25,
      driftBoostMaxKmh: 9,
    },
  },
  shingo: {
    specTag: 'FF · 108km/h · 민첩 코너링 / 높은 그립',
    physics: {
      maxSpeedKmh: 108,
      accel: 4.55,
      brakeDecel: 19.5,
      steerRate: 2.16,
      driftSteerBoost: 1.24,
      driftDrag: 1.35,
      gripAlignRate: 11.2,
      driftAlignRate: 3.1,
      driftBoostMaxKmh: 7,
    },
  },
  takeshi: {
    specTag: '그립 · 124km/h · 고속 / 강력 브레이크',
    physics: {
      maxSpeedKmh: 124,
      accel: 4.45,
      brakeDecel: 22.5,
      steerRate: 1.78,
      driftSteerBoost: 1.25,
      driftDrag: 1.38,
      gripAlignRate: 10.6,
      driftAlignRate: 2.85,
      driftBoostMaxKmh: 8,
    },
  },
  keisuke: {
    specTag: 'FR · 122km/h · 파워 드리프트 / 탈출 가속',
    physics: {
      maxSpeedKmh: 122,
      accel: 4.7,
      brakeDecel: 19.5,
      steerRate: 1.94,
      driftSteerBoost: 1.46,
      driftDrag: 1.05,
      gripAlignRate: 8.8,
      driftAlignRate: 2.15,
      driftBoostMaxKmh: 10,
    },
  },
  kozo: {
    specTag: '4WD · 140km/h · 폭발적 초반 / 115+ 둔화',
    physics: {
      maxSpeedKmh: 140,
      accel: 5.75,
      highSpeedDropKmh: 115,
      highSpeedAccelScale: 0.14,
      brakeDecel: 24.5,
      steerRate: 1.82,
      driftSteerBoost: 1.28,
      driftDrag: 1.28,
      gripAlignRate: 11.4,
      driftAlignRate: 2.9,
      driftBoostMaxKmh: 8,
    },
  },
  ryosuke: {
    specTag: 'FR · 112km/h · 정밀 밸런스 / 관성 특화',
    physics: {
      maxSpeedKmh: 112,
      accel: 4.5,
      brakeDecel: 20.5,
      steerRate: 2.04,
      driftSteerBoost: 1.4,
      driftDrag: 1.02,
      gripAlignRate: 10.0,
      driftAlignRate: 2.4,
      kanseiDragMult: 0.58,
      driftBoostMaxKmh: 9,
    },
  },
  jhy: {
    specTag: '4WD · 112km/h · 최강 트랙션 / 올라운더',
    physics: {
      maxSpeedKmh: 112,
      accel: 4.75,
      brakeDecel: 21.5,
      steerRate: 1.98,
      driftSteerBoost: 1.38,
      driftDrag: 1.08,
      gripAlignRate: 11.0,
      driftAlignRate: 2.45,
      kanseiBoostMaxKmh: 12,
      driftBoostMaxKmh: 10,
    },
  },
};

export const PLAYER_CARS = [
  {
    id: 'ae86',
    name: 'AE86 TRUENO',
    owner: 'DEFAULT',
    colorHex: '#f8fafc',
    colorNum: PLAYER_THEME.bodyColor,
    accentNum: PLAYER_THEME.accentColor,
    modelPath: PLAYER_MODEL_PATH,
    modelRotationY: MODEL_ROTATION_Y,
    taillights: null,
    wheelStyle: null,
    specTag: PLAYER_CAR_SPECS.ae86.specTag,
    physics: PLAYER_CAR_SPECS.ae86.physics,
  },
  ...RIVALS.filter((r) => Boolean(r.modelPath)).map((r) => ({
    id: r.id,
    name: r.carLabel,
    owner: r.name,
    colorHex: r.colorHex,
    colorNum: r.colorNum,
    accentNum: r.colorNum,
    modelPath: r.modelPath,
    modelRotationY: r.modelRotationY ?? MODEL_ROTATION_Y,
    taillights: r.taillights ?? null,
    wheelStyle: r.wheelStyle ?? null,
    specTag: PLAYER_CAR_SPECS[r.id]?.specTag ?? `${r.stats.topSpeedKmh}km/h`,
    physics: PLAYER_CAR_SPECS[r.id]?.physics ?? null,
  })),
];
