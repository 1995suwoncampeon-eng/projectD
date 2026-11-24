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

import { RIVAL_CUTSCENES } from './dialogues.js?v=16';

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
  steerRate: 2.25,         // rad/s base grip turn rate
  driftSteerBoost: 1.45,   // extra yaw authority while drifting
  driftMinSpeedKmh: 32,    // minimum speed to engage drift
  driftDrag: 1.35,         // mild speed bleed during deep drift
  driftBoostMaxKmh: 8,     // brief exit boost after clean drift
  maxVisualSlipRad: 0.42,  // car body yaw slip angle during drift (~24 deg)
  wallSpeedKeep: 0.84,     // speed retention on guardrail scrape
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
    tagline: '빨간 1세대 i30(FD)를 모는 FF 드라이버. 진입 턱인과 탈출 언더스티어가 뚜렷한 전륜구동 코너링을 구사합니다.',
    stats: {
      topSpeedKmh: 108,
      corneringStability: 0.72,
      accelFactor: 0.76,
      aggression: 0.74,
    },
    ai: {
      maxSpeedKmh: 108,
      accel: 3.85,
      cornerSpeedFactor: 0.72,
      ffCorneringStyle: true,
      noDrift: true, // FF hatchback: front-wheel tuck-in & power understeer instead of FR drift
      apexRatio: 0.72,
      maxLateralRatio: 0.84,
      lookAheadBase: 16.5,
      rubberBandCatchup: 0.08,
      rubberBandEase: 0.14,
      laneBias: 1.7,
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
    tagline: '코너 진입 시 급감속 후 인코스를 파고들어 풀가속과 터보 부스트로 탈출하는 그립 주행 중급 라이벌입니다.',
    stats: {
      topSpeedKmh: 130,
      corneringStability: 0.87, // 0..1 (higher = carries more corner speed)
      accelFactor: 0.92,
      aggression: 0.82,
    },
    ai: {
      maxSpeedKmh: 130,
      accel: 4.6,
      cornerSpeedFactor: 0.86,
      lateBrakeApexFullThrottle: true,
      hardBrakeDecel: 24.0,
      apexRatio: 0.78,
      maxLateralRatio: 0.86,
      noDrift: true, // Strictly pure grip driving — never drifts
      twinTurboBoost: {
        boostKmh: 24,
        boostAccelMult: 1.95,
        boostDuration: 1.55,
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
    tagline: '강력한 탈출 가속과 과감한 드리프트로 압박하는 중급 라이벌입니다.',
    stats: {
      topSpeedKmh: 125,
      corneringStability: 0.89,
      accelFactor: 0.94,
      aggression: 0.84,
    },
    ai: {
      maxSpeedKmh: 125,
      accel: 4.6,
      cornerSpeedFactor: 0.89,
      apexRatio: 0.68,
      maxLateralRatio: 0.84,
      twinTurboBoost: {
        boostKmh: 22,
        boostAccelMult: 1.85,
        boostDuration: 1.55,
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
    tagline: '과감한 풀브레이킹·풀악셀 그립 주행과 5연속 헤어핀 아웃-인 스핀턴을 구사하는 상급 라이벌입니다.',
    stats: {
      topSpeedKmh: 140,
      corneringStability: 0.93,
      accelFactor: 0.96,
      aggression: 0.92,
    },
    ai: {
      maxSpeedKmh: 140,
      accel: 6.2,
      highSpeedDropKmh: 115,     // 115 km/h 이후 가속 급감 (초반 폭발, 후반 극저가속)
      highSpeedAccelScale: 0.14,
      cornerSpeedFactor: 0.93,
      godFootStyle: true,        // 평소 과감한 그립 주행 + 5연속 헤어핀 아웃 급가속 -> 급감속 인 스핀턴
      hardBrakeDecel: 26.0,
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
    tagline: '정밀한 에이펙스 공략과 완벽한 코너링 안정성을 갖춘 고수 라이벌입니다.',
    stats: {
      topSpeedKmh: 110,
      corneringStability: 0.97,
      accelFactor: 1.0,
      aggression: 0.95,
    },
    ai: {
      maxSpeedKmh: 110,
      accel: 5.0,
      cornerSpeedFactor: 0.97,
      coastOnlyCorners: true,
      cornerDecelScale: 0.28,
      minCornerSpeedRatio: 0.82,
      coastDecel: 3.4,
      apexRatio: 0.82,
      maxLateralRatio: 0.88,
      twinTurboBoost: {
        boostKmh: 20,
        boostAccelMult: 2.1,
        boostDuration: 1.5,
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
      accel: 5.1,
      cornerSpeedFactor: 0.98,
      coastOnlyCorners: true,
      cornerDecelScale: 0.24,
      minCornerSpeedRatio: 0.84,
      coastDecel: 3.2,
      apexRatio: 0.86,
      maxLateralRatio: 0.90,
      twinTurboBoost: {
        boostKmh: 20,
        boostAccelMult: 2.1,
        boostDuration: 1.55,
      },
      lookAheadBase: 16,
      rubberBandCatchup: 0.12,
      rubberBandEase: 0.03,
      laneBias: 0.8,
    },
    cutscenes: RIVAL_CUTSCENES.master1,
  },
  {
    id: 'bunta',
    name: 'BUNTA',
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
    tagline: '아키나 최속의 전설. 도랑타기 라인으로 코너를 파고드는 최강 GOD 라이벌입니다.',
    stats: {
      topSpeedKmh: 110,
      corneringStability: 0.97,
      accelFactor: 1.0,
      aggression: 0.95,
    },
    ai: {
      maxSpeedKmh: 110,
      accel: 5.0,
      cornerSpeedFactor: 0.97,
      coastOnlyCorners: true,
      cornerDecelScale: 0.28,
      minCornerSpeedRatio: 0.82,
      coastDecel: 3.4,
      apexRatio: 0.82,
      maxLateralRatio: 0.88,
      twinTurboBoost: {
        boostKmh: 20,
        boostAccelMult: 2.1,
        boostDuration: 1.5,
      },
      lookAheadBase: 16,
      rubberBandCatchup: 0.12,
      rubberBandEase: 0.04,
      laneBias: 0.9,
      useGutterRun: true,
    },
    cutscenes: RIVAL_CUTSCENES.bunta,
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
