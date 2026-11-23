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

  // 3. Low-Speed Technical Chicane & Mid-Course Hairpin (저속 코너 + 중반 헤어핀)
  [18, -616],
  [-82, -634],
  [-132, -666],
  [-108, -702],
  [-25, -720],
  [65, -748],
  [92, -784],
  [45, -814],

  // 4. Gentle Left Sweeper -> Sudden Sharp Opposite Right (완만한 커브 -> 급우커브 #2)
  [-35, -860],
  [-110, -918],
  [-150, -962],
  [-136, -1000],
  [-70, -1016],
  [35, -1032],

  // 5. Razor-Tight 5 Consecutive U-Turn Hairpins (후반 진짜 5연속 급헤어핀 — 레그 간격 ~34m, R≈13m)
  // Hairpin #1 (Right 180 U-turn)
  [125, -1044],
  [152, -1060],
  [148, -1084],
  [116, -1096],
  [10, -1104],
  [-95, -1112],

  // Hairpin #2 (Left 180 U-turn)
  [-128, -1126],
  [-132, -1150],
  [-102, -1164],
  [10, -1172],
  [112, -1180],

  // Hairpin #3 (Right 180 U-turn)
  [145, -1194],
  [149, -1218],
  [119, -1232],
  [8, -1240],
  [-98, -1248],

  // Hairpin #4 (Left 180 U-turn)
  [-131, -1262],
  [-135, -1286],
  [-105, -1300],
  [6, -1308],
  [110, -1316],

  // Hairpin #5 (Right 180 U-turn)
  [142, -1330],
  [146, -1354],
  [114, -1370],
  [25, -1388],

  // 6. Final Downhill Sprint to Finish Line
  [-18, -1438],
  [-24, -1525],
  [-24, -1625],
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

      this.samples.push({
        index: i,
        x: p.x,
        z: p.z,
        tx,
        tz,
        rx,
        rz,
        heading,
        s: cumulativeS,
        curvature: 0,
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
  }

  /**
   * Interpolate a smooth point on the centerline at arc-length s (meters).
   */
  getPointAtS(s) {
    const clamped = Math.max(0, Math.min(this.totalLength, s));
    const exactIdx = (clamped / this.totalLength) * (this.samples.length - 1);
    const i0 = Math.floor(exactIdx);
    const i1 = Math.min(this.samples.length - 1, i0 + 1);
    const t = exactIdx - i0;

    const a = this.samples[i0];
    const b = this.samples[i1];

    const tx = a.tx + (b.tx - a.tx) * t;
    const tz = a.tz + (b.tz - a.tz) * t;
    const tLen = Math.hypot(tx, tz) || 1;
    const ntx = tx / tLen;
    const ntz = tz / tLen;

    return {
      index: i0,
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      tx: ntx,
      tz: ntz,
      rx: -ntz,
      rz: ntx,
      heading: Math.atan2(ntx, ntz),
      s: clamped,
      curvature: a.curvature + (b.curvature - a.curvature) * t,
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
   * Project an arbitrary 2D point (x, z) onto the nearest track sample.
   * Uses a fast local window around hintIndex and falls back to full scan if far.
   */
  projectPoint(x, z, hintIndex = -1) {
    const samples = this.samples;
    const n = samples.length;

    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (hintIndex >= 0 && hintIndex < n) {
      const start = Math.max(0, hintIndex - 32);
      const end = Math.min(n - 1, hintIndex + 32);
      for (let i = start; i <= end; i++) {
        const dx = x - samples[i].x;
        const dz = z - samples[i].z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
    }

    // Fallback global scan if hint was missing or vehicle jumped far
    if (bestDistSq > 45 * 45) {
      bestDistSq = Infinity;
      for (let i = 0; i < n; i++) {
        const dx = x - samples[i].x;
        const dz = z - samples[i].z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
    }

    const base = samples[bestIdx];
    const dx = x - base.x;
    const dz = z - base.z;

    // Project along tangent for continuous arc-length s
    const along = dx * base.tx + dz * base.tz;
    const s = Math.max(0, Math.min(this.totalLength, base.s + along));
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
