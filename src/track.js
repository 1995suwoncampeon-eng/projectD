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
  [0, -75],
  [0, -150],

  // 1. Gentle Right Sweeper -> Sudden Opposite Sharp Left (완만한 커브 후 반대쪽 급커브 #1)
  [38, -235],
  [92, -310],
  [125, -380],
  [120, -432],
  [65, -458],
  [-22, -472],

  // 2. Medium-High Speed Flowing S-Bends (중·고속 S자 코너)
  [-105, -520],
  [-135, -605],
  [-88, -695],
  [12, -770],
  [112, -840],

  // 3. Low-Speed Technical Chicane & Mid-Course Hairpin (저속 코너 + 중반 헤어핀)
  [168, -895],
  [172, -948],
  [115, -978],
  [25, -996],
  [-62, -1028],
  [-105, -1075],
  [-88, -1128],
  [-20, -1165],

  // 4. Gentle Left Sweeper -> Sudden Opposite Sharp Right (완만한 커브 후 반대쪽 급커브 #2)
  [-75, -1245],
  [-142, -1325],
  [-175, -1395],
  [-165, -1445],
  [-105, -1468],
  [-5, -1488],
  [85, -1525],

  // 5. Iconic 5 Consecutive Hairpins (후반 5연속 헤어핀 — 48~54m vertical leg separation)
  // Hairpin #1 (Right-hand 180)
  [158, -1558],
  [182, -1596],
  [150, -1632],
  [55, -1646],
  [-55, -1660],

  // Hairpin #2 (Left-hand 180)
  [-132, -1690],
  [-155, -1728],
  [-122, -1764],
  [-25, -1778],
  [80, -1792],

  // Hairpin #3 (Right-hand 180)
  [155, -1822],
  [178, -1860],
  [145, -1896],
  [48, -1910],
  [-60, -1924],

  // Hairpin #4 (Left-hand 180)
  [-136, -1954],
  [-158, -1992],
  [-125, -2028],
  [-28, -2042],
  [78, -2056],

  // Hairpin #5 (Right-hand 180)
  [152, -2086],
  [174, -2124],
  [138, -2160],
  [45, -2182],

  // 6. Final Downhill Sprint to Finish Line
  [-10, -2235],
  [-18, -2330],
  [-18, -2440],
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
