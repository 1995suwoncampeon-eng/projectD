import * as THREE from 'three';
import { TRACK_CONFIG } from './config.js';

/**
 * 2D Touge Downhill Course (pure X-Z plane at Y = 0).
 * Monotonic progression along -Z with wide sweeping S-bends and tight
 * switchback hairpins guarantees zero self-intersections and a classic
 * mountain pass minimap silhouette.
 */
const RAW_CONTROL_POINTS = [
  [0, 0],
  [0, -95],
  [0, -195],
  [-40, -295],
  [-18, -395],
  [62, -475],
  [145, -508],
  [208, -545],
  [214, -605],
  [152, -648],
  [48, -654],
  [-48, -692],
  [-136, -686],
  [-210, -718],
  [-256, -764],
  [-248, -826],
  [-178, -866],
  [-68, -885],
  [36, -930],
  [124, -1002],
  [172, -1086],
  [148, -1165],
  [74, -1208],
  [4, -1252],
  [-12, -1355],
  [-12, -1475],
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
