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
  sampleCount: 780,      // Spline discretization density
};

// ============================================================================
// PLAYER ARCADE PHYSICS (2D X-Z plane)
// ============================================================================
export const PLAYER_PHYSICS = {
  maxSpeedKmh: 218,
  reverseMaxKmh: 42,
  accel: 24.5,             // m/s^2 low-end pull
  brakeDecel: 38.0,        // m/s^2 braking power
  coastDecel: 7.2,         // m/s^2 engine braking / aero drag
  steerRate: 2.35,         // rad/s base grip turn rate
  driftSteerBoost: 1.48,   // extra yaw authority while drifting
  driftMinSpeedKmh: 58,    // minimum speed to engage drift
  driftDrag: 3.1,          // mild speed bleed during deep drift
  driftBoostMaxKmh: 16,    // brief exit boost after clean drift
  maxVisualSlipRad: 0.44,  // car body yaw slip angle during drift (~25 deg)
  wallSpeedKeep: 0.84,     // speed retention on guardrail scrape
  carCollisionRadius: 1.32,
};

// ============================================================================
// RIVAL ROSTER (3 Tiers: EASY / NORMAL / HARD)
// ============================================================================
export const RIVALS = [
  {
    id: 'takeshi',
    name: 'TAKESHI',
    team: 'NIGHT KIDS',
    difficulty: 'EASY',
    difficultyKr: '초급',
    badgeClass: 'easy',
    carLabel: 'MIDNIGHT R32',
    colorHex: '#2563eb',
    colorNum: 0x2563eb,
    accentHex: '#60a5fa',
    tagline: '안정적인 그립 주행을 선호하는 초급 라이벌. 코너 진입 전 일찍 감속합니다.',
    stats: {
      topSpeedKmh: 176,
      corneringStability: 0.78, // 0..1 (higher = carries more corner speed)
      accelFactor: 0.84,
      aggression: 0.65,
    },
    ai: {
      maxSpeedKmh: 176,
      accel: 21.0,
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
    tagline: '강력한 탈출 가속과 과감한 드리프트로 압박하는 중급 라이벌입니다.',
    stats: {
      topSpeedKmh: 196,
      corneringStability: 0.89,
      accelFactor: 0.94,
      aggression: 0.84,
    },
    ai: {
      maxSpeedKmh: 196,
      accel: 23.6,
      cornerSpeedFactor: 0.89,
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
    tagline: '정밀한 에이펙스 공략과 완벽한 코너링 안정성을 갖춘 최강 라이벌입니다.',
    stats: {
      topSpeedKmh: 212,
      corneringStability: 0.97,
      accelFactor: 1.0,
      aggression: 0.95,
    },
    ai: {
      maxSpeedKmh: 212,
      accel: 25.0,
      cornerSpeedFactor: 0.97,
      lookAheadBase: 20,
      rubberBandCatchup: 0.12,
      rubberBandEase: 0.04,
      laneBias: 0.9,
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
