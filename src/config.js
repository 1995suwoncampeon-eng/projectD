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
  sampleCount: 1500,     // High-density spline discretization for 5-consecutive hairpins
};

// ============================================================================
// PLAYER ARCADE PHYSICS (2D X-Z plane)
// ============================================================================
export const PLAYER_PHYSICS = {
  maxSpeedKmh: 100,
  reverseMaxKmh: 24,
  accel: 7.8,              // m/s^2 grounded low/mid-end pull for 100 km/h cap
  brakeDecel: 19.5,        // m/s^2 braking power
  coastDecel: 3.6,         // m/s^2 engine braking / aero drag
  steerRate: 2.25,         // rad/s base grip turn rate
  driftSteerBoost: 1.45,   // extra yaw authority while drifting
  driftMinSpeedKmh: 32,    // minimum speed to engage drift
  driftDrag: 1.5,          // mild speed bleed during deep drift
  driftBoostMaxKmh: 8,     // brief exit boost after clean drift
  maxVisualSlipRad: 0.42,  // car body yaw slip angle during drift (~24 deg)
  wallSpeedKeep: 0.84,     // speed retention on guardrail scrape
  carCollisionRadius: 1.32,
};

// ============================================================================
// RIVAL ROSTER (4 Tiers: EASY / NORMAL / HARD / GOD)
// ============================================================================
export const RIVALS = [
  {
    id: 'takeshi',
    name: 'TAKESHI',
    team: 'NIGHT KIDS',
    difficulty: 'EASY',
    difficultyKr: '초급',
    badgeClass: 'easy',
    carLabel: 'BONGO FRONTIER',
    colorHex: '#2563eb',
    colorNum: 0x2563eb,
    accentHex: '#60a5fa',
    modelPath: 'assets/models/Bongo.glb',
    modelRotationY: Math.PI / 2,
    tagline: '안정적인 그립 주행을 선호하는 초급 라이벌. 코너 진입 전 일찍 감속합니다.',
    stats: {
      topSpeedKmh: 130,
      corneringStability: 0.78, // 0..1 (higher = carries more corner speed)
      accelFactor: 0.84,
      aggression: 0.65,
    },
    ai: {
      maxSpeedKmh: 130,
      accel: 9.2,
      cornerSpeedFactor: 0.78,
      lookAheadBase: 16,
      rubberBandCatchup: 0.09,  // Max boost when behind
      rubberBandEase: 0.13,     // Max ease when far ahead
      laneBias: 1.8,            // Right-side bias on straights
    },
  },
  {
    id: 'keisuke',
    name: 'KEISUKE',
    team: 'RED SUNS',
    difficulty: 'NORMAL',
    difficultyKr: '중급',
    badgeClass: 'normal',
    carLabel: 'TURBO YELLOW FD',
    colorHex: '#facc15',
    colorNum: 0xfacc15,
    accentHex: '#fde047',
    modelPath: RIVAL_MODEL_PATH,
    modelRotationY: MODEL_ROTATION_Y,
    tagline: '강력한 탈출 가속과 과감한 드리프트로 압박하는 중급 라이벌입니다.',
    stats: {
      topSpeedKmh: 125,
      corneringStability: 0.89,
      accelFactor: 0.94,
      aggression: 0.84,
    },
    ai: {
      maxSpeedKmh: 125,
      accel: 9.8,
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
  },
  {
    id: 'ryosuke',
    name: 'RYOSUKE',
    team: 'WHITE COMET',
    difficulty: 'HARD',
    difficultyKr: '고수',
    badgeClass: 'hard',
    carLabel: 'PEARL WHITE FC',
    colorHex: '#e2e8f0',
    colorNum: 0xe2e8f0,
    accentHex: '#38bdf8',
    modelPath: RIVAL_MODEL_PATH,
    modelRotationY: MODEL_ROTATION_Y,
    tagline: '정밀한 에이펙스 공략과 완벽한 코너링 안정성을 갖춘 최강 라이벌입니다.',
    stats: {
      topSpeedKmh: 120,
      corneringStability: 0.97,
      accelFactor: 1.0,
      aggression: 0.95,
    },
    ai: {
      maxSpeedKmh: 120,
      accel: 10.4,
      cornerSpeedFactor: 0.97,
      coastOnlyCorners: true,
      cornerDecelScale: 0.28,
      minCornerSpeedRatio: 0.82,
      coastDecel: 3.4,
      apexRatio: 0.82,
      maxLateralRatio: 0.88,
      twinTurboBoost: {
        boostKmh: 20,
        boostAccelMult: 1.75,
        boostDuration: 1.5,
      },
      lookAheadBase: 16,
      rubberBandCatchup: 0.12,
      rubberBandEase: 0.04,
      laneBias: 0.9,
    },
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
    tagline: '아키나 최속의 전설. 차원이 다른 코너링과 속도로 압도하는 최강 GOD 라이벌입니다.',
    stats: {
      topSpeedKmh: 150,
      corneringStability: 1.0,
      accelFactor: 1.0,
      aggression: 1.0,
    },
    ai: {
      maxSpeedKmh: 150,
      accel: 12.2,
      cornerSpeedFactor: 1.04,
      fullThrottleCorners: true,
      apexRatio: 0.97,
      maxLateralRatio: 0.98,
      driftCurvatureThreshold: 0.0022,
      driftSlipRad: 0.46,
      lookAheadBase: 9.5,
      rubberBandCatchup: 0.14,
      rubberBandEase: 0.0,
      laneBias: 0.4,
    },
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
