import * as THREE from 'three';
import { TRACK_CONFIG } from './config.js';

/**
 * 2D Touge Downhill Course (pure X-Z plane at Y = 0).
 * Monotonic progression along -Z with wide sweeping S-bends and tight
 * switchback hairpins guarantees zero self-intersections and a classic
 * mountain pass minimap silhouette.
 */
const RAW_CONTROL_POINTS = [
  // 0. Start Downhill Straight
  [0, 0],
  [0, -70],
  [0, -135],

  // 1. Gentle Right Sweeper -> Sudden Sharp Opposite Left (완만한 커브 -> 급좌커브 #1)
  [36, -210],
  [88, -270],
  [124, -315],
  [112, -354],
  [52, -372],
  [-35, -384],

  // 2. Sharp Mid-High Speed S-Bends (기존 후반 헤어핀급 각도의 연속 S자 코너)
  [-118, -408],
  [-148, -448],
  [-110, -486],
  [-10, -504],
  [98, -522],
  [146, -560],
  [112, -598],

  // 3. Low-Speed Technical Chicane & Mid-Course Instant Hairpin (저속 코너 + 중반 급헤어핀)
  [18, -616],
  [-72, -630],
  [-110, -642],
  [-112, -666],
  [-74, -678],
  [35, -692],
  [78, -714],
  [48, -748],

  // 4. Gentle Left Sweeper -> Sudden Sharp Opposite Right (완만한 커브 -> 급우커브 #2)
  [-32, -792],
  [-105, -848],
  [-142, -884],
  [-128, -914],
  [-65, -926],
  [35, -938],

  // 5. Tight 5 Consecutive U-Turn Hairpins (타이트하지만 도랑이 매끄럽게 이어지는 5연속 급헤어핀: 레그 간격 ~28m, R≈12.5m)
  // Hairpin #1 (Right 180 U-turn)
  [116, -944],
  [140, -951],
  [140, -969],
  [116, -976],
  [0, -980],

  // Hairpin #2 (Left 180 U-turn)
  [-106, -984],
  [-130, -991],
  [-130, -1009],
  [-106, -1016],
  [0, -1020],

  // Hairpin #3 (Right 180 U-turn)
  [114, -1024],
  [138, -1031],
  [138, -1049],
  [114, -1056],
  [0, -1060],

  // Hairpin #4 (Left 180 U-turn)
  [-108, -1064],
  [-132, -1071],
  [-132, -1089],
  [-108, -1096],
  [0, -1100],

  // Hairpin #5 (Right 180 U-turn)
  [112, -1104],
  [136, -1111],
  [136, -1129],
  [112, -1136],
  [18, -1148],

  // 6. Final Downhill Sprint to Finish Line
  [-18, -1192],
  [-24, -1278],
  [-24, -1380],
];

export function wrapAngle(rad) {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class TougeTrack {
  constructor() {
    this.roadWidth = TRACK_CONFIG.roadWidth;
    this.halfWidth = this.roadWidth * 0.5;
    this.guardrailOffset = TRACK_CONFIG.guardrailOffset;
    this.maxCarLateral = this.halfWidth - TRACK_CONFIG.carHalfWidth;

    const vecPoints = RAW_CONTROL_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.curve = new THREE.CatmullRomCurve3(vecPoints, false, 'centripetal', 0.5);

    this.samples = [];
    this.totalLength = 0;
    this.bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };

    this._buildSamples(TRACK_CONFIG.sampleCount);

    this.startS = TRACK_CONFIG.startLineS;
    this.finishS = Math.max(this.startS + 200, this.totalLength - TRACK_CONFIG.finishMarginS);
    this.raceDistance = this.finishS - this.startS;
  }

  _buildSamples(count) {
    const rawPts = this.curve.getSpacedPoints(count);
    let cumulativeS = 0;

    for (let i = 0; i < rawPts.length; i++) {
      const p = rawPts[i];
      if (i > 0) {
        const dx = p.x - rawPts[i - 1].x;
        const dz = p.z - rawPts[i - 1].z;
        cumulativeS += Math.hypot(dx, dz);
      }

      const prev = rawPts[Math.max(0, i - 1)];
      const next = rawPts[Math.min(rawPts.length - 1, i + 1)];
      let tx = next.x - prev.x;
      let tz = next.z - prev.z;
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;

      // Right-hand normal in Three.js (+Y up): forward x up = (-tz, 0, tx)
      const rx = -tz;
      const rz = tx;
      const heading = Math.atan2(tx, tz);

      const y = this.getElevationAtS(cumulativeS);
      const slope = this.getSlopeAtS(cumulativeS);

      this.samples.push({
        index: i,
        x: p.x,
        y,
        z: p.z,
        tx,
        tz,
        rx,
        rz,
        heading,
        slope,
        s: cumulativeS,
        curvature: 0,
        gutterSide: 0,
      });

      if (p.x < this.bounds.minX) this.bounds.minX = p.x;
      if (p.x > this.bounds.maxX) this.bounds.maxX = p.x;
      if (p.z < this.bounds.minZ) this.bounds.minZ = p.z;
      if (p.z > this.bounds.maxZ) this.bounds.maxZ = p.z;
    }

    this.totalLength = cumulativeS;
    this.stepS = this.totalLength / Math.max(1, this.samples.length - 1);

    // Compute smoothed signed curvature (rad / meter)
    const win = 5;
    for (let i = 0; i < this.samples.length; i++) {
      const i0 = Math.max(0, i - win);
      const i1 = Math.min(this.samples.length - 1, i + win);
      const ds = Math.max(0.01, this.samples[i1].s - this.samples[i0].s);
      const dHeading = wrapAngle(this.samples[i1].heading - this.samples[i0].heading);
      this.samples[i].curvature = dHeading / ds;
    }

    // Mark inside-corner drainage gutters (Initial D style gutter run)
    // Left turn (curvature > 0) -> inside is left (-1); Right turn (curvature < 0) -> inside is right (+1)
    const n = this.samples.length;
    const rawGutter = new Int8Array(n);
    for (let i = 0; i < n; i++) {
      const c = this.samples[i].curvature;
      if (Math.abs(c) > 0.011) {
        rawGutter[i] = c > 0 ? -1 : 1;
      }
    }
    // Extend each gutter (6 samples ~12m) so exit releases cleanly on the straightaway
    const pad = 6;
    for (let i = 0; i < n; i++) {
      if (rawGutter[i] !== 0) {
        this.samples[i].gutterSide = rawGutter[i];
        continue;
      }
      for (let d = 1; d <= pad; d++) {
        if (i - d >= 0 && rawGutter[i - d] !== 0) {
          this.samples[i].gutterSide = rawGutter[i - d];
          break;
        }
        if (i + d < n && rawGutter[i + d] !== 0) {
          this.samples[i].gutterSide = rawGutter[i + d];
          break;
        }
      }
    }

    // Guardrails enabled across entire course
    for (let i = 0; i < n; i++) {
      this.samples[i].noGuardrail = false;
    }
  }

  /**
   * Visual-only downhill elevation profile y(s) in meters.
   * 2D physics remain strictly flat on X-Z, while 3D rendering drops continuously
   * (~10.5% average grade with gentle mountain pass undulations, always downhill).
   */
  getElevationAtS(s) {
    const clamped = Math.max(0, s);
    return -0.105 * clamped + 1.8 * Math.sin(clamped * 0.014);
  }

  /**
   * Visual-only downhill pitch angle in radians (negative = descending).
   */
  getSlopeAtS(s) {
    const clamped = Math.max(0, s);
    const dyds = -0.105 + 1.8 * 0.014 * Math.cos(clamped * 0.014);
    return Math.atan(dyds);
  }

  /**
   * Interpolate a smooth point on the centerline at arc-length s (meters)
   * using exact binary search over cumulative sample arc-lengths.
   */
  getPointAtS(s) {
    const samples = this.samples;
    const lastIdx = samples.length - 1;
    const clamped = Math.max(0, Math.min(this.totalLength, s));

    // Exact binary search: find i0 such that samples[i0].s <= clamped <= samples[i0 + 1].s
    let lo = 0;
    let hi = lastIdx;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].s <= clamped) lo = mid;
      else hi = mid;
    }

    const i0 = lo;
    const i1 = Math.min(lastIdx, i0 + 1);
    const a = samples[i0];
    const b = samples[i1];
    const segLen = b.s - a.s;
    const t = segLen > 1e-6 ? Math.max(0, Math.min(1, (clamped - a.s) / segLen)) : 0;

    const tx = a.tx + (b.tx - a.tx) * t;
    const tz = a.tz + (b.tz - a.tz) * t;
    const tLen = Math.hypot(tx, tz) || 1;
    const ntx = tx / tLen;
    const ntz = tz / tLen;

    return {
      index: i0,
      x: a.x + (b.x - a.x) * t,
      y: this.getElevationAtS(clamped),
      z: a.z + (b.z - a.z) * t,
      tx: ntx,
      tz: ntz,
      rx: -ntz,
      rz: ntx,
      heading: Math.atan2(ntx, ntz),
      slope: this.getSlopeAtS(clamped),
      s: clamped,
      curvature: a.curvature + (b.curvature - a.curvature) * t,
      gutterSide: t < 0.5 ? a.gutterSide : b.gutterSide,
      noGuardrail: t < 0.5 ? a.noGuardrail : b.noGuardrail,
    };
  }

  /**
   * Convert (arc-length s, signed right lateral offset) into world (x, z, heading).
   */
  getWorldPosition(s, lateralOffset = 0) {
    const pt = this.getPointAtS(s);
    return {
      x: pt.x + pt.rx * lateralOffset,
      z: pt.z + pt.rz * lateralOffset,
      heading: pt.heading,
      tx: pt.tx,
      tz: pt.tz,
      rx: pt.rx,
      rz: pt.rz,
      s: pt.s,
      index: pt.index,
    };
  }

  /**
   * Project an arbitrary 2D point (x, z) onto the nearest track polyline segment.
   * Uses exact segment projection within a tight window around hintIndex so tight
   * 180-degree hairpins can never drag a vehicle backwards onto an earlier sample.
   */
  projectPoint(x, z, hintIndex = -1, forwardOnly = false) {
    const samples = this.samples;
    const n = samples.length;

    let bestS = 0;
    let bestDistSq = Infinity;

    const scanRange = (startIdx, endIdx) => {
      for (let i = startIdx; i < endIdx; i++) {
        const a = samples[i];
        const b = samples[i + 1];
        const abx = b.x - a.x;
        const abz = b.z - a.z;
        const abLenSq = abx * abx + abz * abz;
        let t = 0;
        if (abLenSq > 1e-8) {
          t = ((x - a.x) * abx + (z - a.z) * abz) / abLenSq;
          if (t < 0) t = 0;
          else if (t > 1) t = 1;
        }
        const px = a.x + abx * t;
        const pz = a.z + abz * t;
        const dSq = (x - px) * (x - px) + (z - pz) * (z - pz);
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestS = a.s + (b.s - a.s) * t;
        }
      }
    };

    if (hintIndex >= 0 && hintIndex < n - 1) {
      const start = forwardOnly ? Math.max(0, hintIndex) : Math.max(0, hintIndex - 3);
      const end = Math.min(n - 1, hintIndex + 8);
      scanRange(start, end);
    }

    // Fallback global scan if hint was missing or vehicle jumped far
    if (bestDistSq > 45 * 45) {
      bestDistSq = Infinity;
      scanRange(0, n - 1);
    }

    const s = Math.max(0, Math.min(this.totalLength, bestS));
    const pt = this.getPointAtS(s);

    const pdx = x - pt.x;
    const pdz = z - pt.z;
    const lateral = pdx * pt.rx + pdz * pt.rz;

    return {
      index: pt.index,
      s,
      lateral,
      centerX: pt.x,
      centerZ: pt.z,
      tx: pt.tx,
      tz: pt.tz,
      rx: pt.rx,
      rz: pt.rz,
      heading: pt.heading,
      curvature: pt.curvature,
      gutterSide: pt.gutterSide,
      noGuardrail: pt.noGuardrail,
    };
  }

  /**
   * Peak absolute curvature ahead in [s + minAhead, s + maxAhead].
   * Used by Rival AI to brake and set cornering speeds smoothly.
   */
  getUpcomingCurvature(s, minAhead = 12, maxAhead = 85) {
    let peakAbs = 0;
    let signedPeak = 0;
    const step = 7;
    for (let d = minAhead; d <= maxAhead; d += step) {
      const pt = this.getPointAtS(s + d);
      const absC = Math.abs(pt.curvature);
      if (absC > peakAbs) {
        peakAbs = absC;
        signedPeak = pt.curvature;
      }
    }
    return { peakAbs, signedPeak };
  }
}
