import { wrapAngle } from './track.js';
import { enforceTrackBounds, updateDrivetrain } from './physics.js';

const KMH_TO_MS = 1 / 3.6;
const MS_TO_KMH = 3.6;

/**
 * Waypoint-following Rival AI with cornering anticipation, racing-line apex
 * hugging, and smooth rubber-banding to sustain tense 1v1 touge battles.
 */
export function updateRivalAI(rival, player, rivalConfig, track, dt) {
  const ai = rivalConfig.ai;

  // 1. Inspect upcoming curvature to calculate smooth cornering speed target
  const { peakAbs, signedPeak } = track.getUpcomingCurvature(rival.s, 10, 92);

  let targetSpeedKmh;
  if (ai.fullThrottleCorners) {
    // Full throttle through every corner — never lifts off the accelerator
    targetSpeedKmh = ai.maxSpeedKmh;
  } else {
    // Higher cornerSpeedFactor (e.g. Ryosuke 0.97) carries far more speed through hairpins
    const cornerSensitivity = 48 - ai.cornerSpeedFactor * 27;
    targetSpeedKmh = ai.maxSpeedKmh / (1 + peakAbs * cornerSensitivity);

    // Clamp minimum hairpin crawl so rival always feels lively
    targetSpeedKmh = Math.max(44 + ai.cornerSpeedFactor * 18, targetSpeedKmh);
  }

  // 2. Smooth Rubber-Banding (tapers off in final 130m sprint for fair finishes)
  const distToFinish = Math.max(0, track.finishS - rival.s);
  const finishFairness = Math.min(1, distToFinish / 130);
  const gap = rival.s - player.s; // >0 means rival is ahead, <0 means rival is behind

  let rubberMultiplier = 1.0;
  if (gap < -16) {
    // Rival is behind -> smooth catch-up boost
    const factor = Math.min(1, (-gap - 16) / 95);
    rubberMultiplier = 1 + ai.rubberBandCatchup * factor * finishFairness;
  } else if (gap > 30 && ai.rubberBandEase > 0) {
    // Rival is far ahead -> mild mercy ease so battle stays exciting
    const factor = Math.min(1, (gap - 30) / 100);
    rubberMultiplier = 1 - ai.rubberBandEase * factor * finishFairness;
  }

  const desiredSpeedMs = targetSpeedKmh * rubberMultiplier * KMH_TO_MS;

  // 3. Longitudinal acceleration / braking toward desired speed
  rival.isBraking = false;
  if (rival.speed < desiredSpeedMs) {
    const ratio = Math.max(0, rival.speed / Math.max(1, desiredSpeedMs));
    const pull = ai.accel * (1.12 - 0.45 * ratio * ratio);
    rival.speed = Math.min(desiredSpeedMs, rival.speed + pull * dt);
  } else if (!ai.fullThrottleCorners) {
    const excess = rival.speed - desiredSpeedMs;
    if (excess > 3.0) rival.isBraking = true;
    rival.speed = Math.max(desiredSpeedMs, rival.speed - 16.0 * dt);
  }

  // 4. Target Waypoint & Racing Line Lateral Offset
  // Hug inside apex on sharp turns (turning left -> negative right offset)
  const apexRatio = ai.apexRatio ?? 0.56;
  const maxLatRatio = ai.maxLateralRatio ?? 0.78;
  const nearCurv = ai.fullThrottleCorners
    ? track.getUpcomingCurvature(rival.s, 4, 48)
    : { peakAbs, signedPeak };
  const curveThreshold = ai.fullThrottleCorners ? 0.003 : 0.0065;

  let targetLateral = ai.laneBias;
  if (Math.abs(nearCurv.signedPeak) > curveThreshold) {
    const insideDir = nearCurv.signedPeak > 0 ? -1 : 1;
    targetLateral = insideDir * (track.maxCarLateral * apexRatio);
  }

  // Polite lateral spacing when side-by-side with player (skipped if fullThrottleCorners apex-locked)
  const longDiff = Math.abs(rival.s - player.s);
  if (longDiff < 14 && !(ai.fullThrottleCorners && Math.abs(nearCurv.signedPeak) > curveThreshold)) {
    const sideOffset = player.lateral > 0 ? -2.4 : 2.4;
    targetLateral = targetLateral * 0.45 + sideOffset * 0.55;
  }

  targetLateral = Math.max(
    -track.maxCarLateral * maxLatRatio,
    Math.min(track.maxCarLateral * maxLatRatio, targetLateral)
  );

  let headingDiff = 0;
  let proj;
  if (ai.fullThrottleCorners) {
    // High-precision spline-locked inside-apex tracking so full-throttle cornering
    // hugs right up to the guardrail limit without scraping or decelerating.
    const curPt = track.getPointAtS(rival.s);
    const latFollow = 1 - Math.exp(-dt * 5.2);
    const nextLat = Math.max(
      -track.maxCarLateral * maxLatRatio,
      Math.min(track.maxCarLateral * maxLatRatio, rival.lateral + (targetLateral - rival.lateral) * latFollow)
    );
    // Inside of a turn has a shorter physical arc length: ds_world = ds_center * (1 + k * lat)
    const arcScale = Math.max(0.75, Math.min(1.25, 1 + curPt.curvature * nextLat));
    const nextS = Math.min(track.totalLength, rival.s + (rival.speed * dt) / arcScale);
    const nextPt = track.getWorldPosition(nextS, nextLat);
    const moveDx = nextPt.x - rival.x;
    const moveDz = nextPt.z - rival.z;
    if (moveDx * moveDx + moveDz * moveDz > 1e-6) {
      const targetHeading = Math.atan2(moveDx, moveDz);
      headingDiff = wrapAngle(targetHeading - rival.heading);
      rival.heading = wrapAngle(rival.heading + headingDiff * Math.min(1, dt * 16));
    } else {
      rival.heading = nextPt.heading;
    }
    rival.x = nextPt.x;
    rival.z = nextPt.z;
    rival.s = nextS;
    rival.lateral = nextLat;
    rival.trackIndex = nextPt.index;
    rival.scrapedWall = false;
    proj = track.getPointAtS(nextS);
  } else {
    const lookAheadDist = ai.lookAheadBase + rival.speed * 0.34;
    const targetPt = track.getWorldPosition(rival.s + lookAheadDist, targetLateral);

    const desiredHeading = Math.atan2(targetPt.x - rival.x, targetPt.z - rival.z);
    headingDiff = wrapAngle(desiredHeading - rival.heading);

    // Smooth steering authority proportional to cornering stability
    const maxTurnRate = (2.6 + ai.cornerSpeedFactor * 1.35) * dt;
    const turnDelta = Math.max(-maxTurnRate, Math.min(maxTurnRate, headingDiff * 4.8 * dt));
    rival.heading = wrapAngle(rival.heading + turnDelta);

    // Advance on 2D X-Z plane
    rival.x += Math.sin(rival.heading) * rival.speed * dt;
    rival.z += Math.cos(rival.heading) * rival.speed * dt;

    // Enforce 2D track boundaries
    proj = enforceTrackBounds(rival, track, dt, 1.2);
  }

  // Expressive AI drift visual on corners (configurable per rival)
  const speedKmh = rival.speed * MS_TO_KMH;
  const driftThreshold = ai.driftCurvatureThreshold ?? 0.0085;
  const driftSlip = ai.driftSlipRad ?? 0.34;
  const entryCurv = ai.fullThrottleCorners
    ? track.getUpcomingCurvature(rival.s, 0, 24).signedPeak
    : proj.curvature;
  const effectiveCurv = Math.abs(proj.curvature) >= Math.abs(entryCurv) ? proj.curvature : entryCurv;
  const aiDrifting = Math.abs(effectiveCurv) > driftThreshold && speedKmh > 52;
  rival.isDrifting = aiDrifting;
  rival.driftDir = aiDrifting ? Math.sign(effectiveCurv) : 0;

  const targetSlip = aiDrifting ? rival.driftDir * driftSlip : Math.max(-0.08, Math.min(0.08, headingDiff * 0.25));
  rival.visualSlip += (targetSlip - rival.visualSlip) * Math.min(1, dt * 8.5);
  rival.steerVisual += (Math.max(-1, Math.min(1, headingDiff * 2.2)) - rival.steerVisual) * Math.min(1, dt * 10);
  rival.bodyRoll += (rival.driftDir * (aiDrifting ? 0.085 : 0.06) - rival.bodyRoll) * Math.min(1, dt * 9);

  updateDrivetrain(rival);
}
